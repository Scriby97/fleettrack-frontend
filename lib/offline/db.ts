// Minimal IndexedDB helper for offline queue and cache
type QueueEntry = {
  id: string; // client UUID
  type: 'usage' | 'vehicle' | 'profile';
  op: 'create' | 'update' | 'delete';
  payload: any;
  createdAt: number;
  retries?: number;
  lastAttempt?: number;
  failed?: boolean;
};

const DB_NAME = 'fleettrack-offline';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('usages')) {
        db.createObjectStore('usages', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('vehicles')) {
        db.createObjectStore('vehicles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addQueue(entry: QueueEntry) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateQueue(entry: QueueEntry) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    store.put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function removeQueueByPayloadId(payloadId: string | number) {
  const db = await openDB();
  return new Promise<string[]>(async (resolve, reject) => {
    try {
      const tx = db.transaction('queue', 'readwrite');
      const store = tx.objectStore('queue');
      const req = store.getAll();
      req.onsuccess = async () => {
        const items: QueueEntry[] = req.result as QueueEntry[];
        const removed: string[] = [];
        for (const it of items) {
          // payload may contain id or the entry id may equal payloadId
          const pid = it.payload?.id ?? it.id;
          if (String(pid) === String(payloadId)) {
            store.delete(it.id);
            removed.push(it.id);
          }
        }
        resolve(removed);
      };
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function getQueue(): Promise<QueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('queue', 'readonly');
    const store = tx.objectStore('queue');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueueEntry[]);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueue(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function upsertCachedUsage(item: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('usages', 'readwrite');
    const store = tx.objectStore('usages');
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCachedUsages(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('usages', 'readonly');
    const store = tx.objectStore('usages');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as any[]);
    req.onerror = () => reject(req.error);
  });
}

async function removeCachedUsage(id: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('usages', 'readwrite');
    const store = tx.objectStore('usages');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function upsertCachedVehicle(item: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('vehicles', 'readwrite');
    const store = tx.objectStore('vehicles');
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCachedVehicles(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('vehicles', 'readonly');
    const store = tx.objectStore('vehicles');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as any[]);
    req.onerror = () => reject(req.error);
  });
}

async function clearCacheStore(storeName: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function saveProfile(profile: any) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('profile', 'readwrite');
    const store = tx.objectStore('profile');
    store.put({ ...profile, id: 'current' });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getProfile(): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('profile', 'readonly');
    const store = tx.objectStore('profile');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export {
  addQueue,
  getQueue,
  removeQueue,
  updateQueue,
  upsertCachedUsage,
  getCachedUsages,
  clearCacheStore,
  saveProfile,
  getProfile,
  upsertCachedVehicle,
  getCachedVehicles,
  removeCachedUsage,
  removeQueueByPayloadId,
};

export type { QueueEntry };
