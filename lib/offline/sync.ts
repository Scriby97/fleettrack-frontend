import { addQueue, getQueue, removeQueue, upsertCachedUsage, removeCachedUsage, updateQueue, upsertCachedVehicle, getCachedVehicles } from './db';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';
import { getUsagesWithVehicles } from '@/lib/api/usages';

async function processQueueOnce() {
  if (!navigator.onLine) return;
  const queue = await getQueue();
  const sorted = queue.sort((a,b)=>a.createdAt-b.createdAt);
  for (const entry of sorted) {
    try {
      // backoff: if lastAttempt exists and retries > 0, wait exponential backoff
      const retries = entry.retries ?? 0;
      const lastAttempt = entry.lastAttempt ?? 0;
      const now = Date.now();
      const base = 2000; // 2s
      const delay = base * Math.pow(2, Math.min(retries, 6));
      if (lastAttempt && now - lastAttempt < delay) {
        // skip until backoff passes
        continue;
      }

      if (entry.type === 'usage') {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) throw new Error('API not configured');

        if (entry.op === 'create') {
          const res = await authenticatedFetch(`${apiUrl}/usages`, {
            method: 'POST',
            body: JSON.stringify(entry.payload),
          });
          if (!res.ok) {
            if (res.status === 409) {
              // conflict: store server state for resolution
              let serverData = null;
              try { serverData = await res.json(); } catch(e) { /* ignore */ }
              await upsertCachedUsage({
                ...entry.payload,
                conflict: serverData,
                status: 'conflict',
                id: entry.payload.id ?? entry.id,
                creatorFirstName: serverData?.creator?.firstName ?? entry.payload?.creatorFirstName ?? entry.payload?.creator?.firstName,
                creatorLastName: serverData?.creator?.lastName ?? entry.payload?.creatorLastName ?? entry.payload?.creator?.lastName,
              });
              entry.failed = true;
              await updateQueue(entry as any);
              continue;
            }
            throw new Error(`Server returned ${res.status}`);
          }
          const created = await res.json();
          // remove temp cached usage (entry.id) and replace with server one
          try {
            await removeCachedUsage(entry.id);
          } catch (remErr) {
            console.warn('[offline sync] failed to remove temp cache', remErr);
          }
          await upsertCachedUsage({
            ...created,
            status: 'synced',
            id: created.id,
            creatorFirstName: created?.creator?.firstName,
            creatorLastName: created?.creator?.lastName,
          });
        }

        if (entry.op === 'update') {
          const res = await authenticatedFetch(`${apiUrl}/usages/${entry.payload.id}`, {
            method: 'PUT',
            body: JSON.stringify(entry.payload),
          });
          if (!res.ok) {
            if (res.status === 409) {
              let serverData = null;
              try { serverData = await res.json(); } catch(e) { /* ignore */ }
              await upsertCachedUsage({
                ...entry.payload,
                conflict: serverData,
                status: 'conflict',
                id: entry.payload.id,
                creatorFirstName: serverData?.creator?.firstName ?? entry.payload?.creatorFirstName ?? entry.payload?.creator?.firstName,
                creatorLastName: serverData?.creator?.lastName ?? entry.payload?.creatorLastName ?? entry.payload?.creator?.lastName,
              });
              entry.failed = true;
              await updateQueue(entry as any);
              continue;
            }
            throw new Error(`Server returned ${res.status}`);
          }
          const updated = await res.json();
          await upsertCachedUsage({
            ...updated,
            status: 'synced',
            id: updated.id,
            creatorFirstName: updated?.creator?.firstName,
            creatorLastName: updated?.creator?.lastName,
          });
        }

        if (entry.op === 'delete') {
          await authenticatedFetch(`${apiUrl}/usages/${entry.payload.id}`, { method: 'DELETE' });
          // mark deleted in cache (preserve creator fields if available)
          await upsertCachedUsage({
            ...entry.payload,
            deleted: true,
            creatorFirstName: entry.payload?.creatorFirstName ?? entry.payload?.creator?.firstName,
            creatorLastName: entry.payload?.creatorLastName ?? entry.payload?.creator?.lastName,
          });
        }
      }

      // remove from queue after success
      await removeQueue(entry.id);
    } catch (err) {
      console.error('[offline sync] failed for entry', entry, err);
      // increment retries and update lastAttempt; if exceeds max, mark failed
      try {
        const now = Date.now();
        entry.retries = (entry.retries ?? 0) + 1;
        entry.lastAttempt = now;
        if ((entry.retries ?? 0) >= 5) {
          entry.failed = true;
        }
        await updateQueue(entry as any);
      } catch (updErr) {
        console.warn('[offline sync] failed to update queue entry retries', updErr);
      }
    }
  }
}

async function refreshCaches(organizationId?: string) {
  try {
    if (!navigator.onLine) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) return;
    // Try to fetch latest usages with vehicles and update cache
    try {
      // Organization filtering: callers may provide an org id to refresh org-scoped caches
      const usages = await getUsagesWithVehicles(organizationId);
      for (const u of usages) {
        try {
          await upsertCachedUsage({
            ...u,
            creatorFirstName: u?.creator?.firstName,
            creatorLastName: u?.creator?.lastName,
          } as any);
        } catch (e) {
          console.warn('[offline sync] failed to upsert cached usage', e);
        }
        try {
          if (u.vehicle && u.vehicleId) {
            // preserve existing cached stats if present to avoid overwriting with zeros
            try {
              const existing = (await getCachedVehicles()).find((v: any) => String(v.id) === String(u.vehicle.id) || String(v.id) === String(u.vehicleId));
              const toCache = {
                ...u.vehicle,
                totalWorkHours: existing?.totalWorkHours ?? (u.vehicle.totalWorkHours ?? 0),
                totalFuelLiters: existing?.totalFuelLiters ?? (u.vehicle.totalFuelLiters ?? 0),
              };
              await upsertCachedVehicle(toCache);
            } catch (innerErr) {
              // fallback: write vehicle without clobbering if fetch of existing fails
              await upsertCachedVehicle({ ...u.vehicle });
            }
          }
        } catch (e) {
          console.warn('[offline sync] failed to upsert cached vehicle', e);
        }
      }
    } catch (err) {
      // ignore fetch errors
      console.warn('[offline sync] refreshCaches: could not refresh usages/vehicles', err);
    }
  } catch (err) {
    console.warn('[offline sync] refreshCaches error', err);
  }
}

export function setupOnlineSync(options?: { getOrganizationId?: () => string | undefined }) {
  if (typeof window === 'undefined') return;
  const getOrg = options?.getOrganizationId;

  window.addEventListener('online', () => {
    console.log('[offline sync] online event — processing queue');
    processQueueOnce().then(() => refreshCaches(getOrg ? getOrg() : undefined)).catch(() => refreshCaches(getOrg ? getOrg() : undefined));
  });

  // Try immediately if online
  if (navigator.onLine) {
    processQueueOnce().then(() => refreshCaches(getOrg ? getOrg() : undefined)).catch(() => refreshCaches(getOrg ? getOrg() : undefined));
  }
}

// Listen for messages from service worker (background sync triggers)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener?.('message', (ev) => {
    try {
      const data = ev.data;
      if (data && data.type === 'SYNC_QUEUE') {
        console.log('[offline sync] received SW SYNC_QUEUE message, flushing queue');
        // service worker messages cannot reliably provide the current selected org; run a best-effort global refresh
        processQueueOnce().then(() => refreshCaches()).catch(() => refreshCaches());
      }
    } catch (err) {
      console.warn('[offline sync] error handling SW message', err);
    }
  });
}

export { processQueueOnce };
