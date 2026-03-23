import { addQueue, getQueue, removeQueue, upsertCachedUsage, removeCachedUsage, updateQueue } from './db';
import { authenticatedFetch } from '@/lib/api/authenticatedFetch';

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
              await upsertCachedUsage({ ...entry.payload, conflict: serverData, status: 'conflict', id: entry.payload.id ?? entry.id });
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
          await upsertCachedUsage({ ...created, status: 'synced', id: created.id });
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
              await upsertCachedUsage({ ...entry.payload, conflict: serverData, status: 'conflict', id: entry.payload.id });
              entry.failed = true;
              await updateQueue(entry as any);
              continue;
            }
            throw new Error(`Server returned ${res.status}`);
          }
          const updated = await res.json();
          await upsertCachedUsage({ ...updated, status: 'synced', id: updated.id });
        }

        if (entry.op === 'delete') {
          await authenticatedFetch(`${apiUrl}/usages/${entry.payload.id}`, { method: 'DELETE' });
          // mark deleted in cache
          await upsertCachedUsage({ ...entry.payload, deleted: true });
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

export function setupOnlineSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('online', () => {
    console.log('[offline sync] online event — processing queue');
    processQueueOnce();
  });

  // Try immediately if online
  if (navigator.onLine) {
    processQueueOnce();
  }
}

// Listen for messages from service worker (background sync triggers)
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener?.('message', (ev) => {
    try {
      const data = ev.data;
      if (data && data.type === 'SYNC_QUEUE') {
        console.log('[offline sync] received SW SYNC_QUEUE message, flushing queue');
        processQueueOnce();
      }
    } catch (err) {
      console.warn('[offline sync] error handling SW message', err);
    }
  });
}

export { processQueueOnce };
