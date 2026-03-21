/**
 * Offline Attendance Queue
 * Uses IndexedDB to store clock-in/out requests when offline,
 * then syncs them when connectivity is restored.
 */

const DB_NAME = 'hrms-offline';
const DB_VERSION = 1;
const STORE_NAME = 'attendance-queue';

export interface QueuedAttendanceRecord {
  id: string;
  type: 'clock_in' | 'clock_out';
  data: {
    method: string;
    latitude?: number;
    longitude?: number;
    photo?: string;
    timestamp: string;
    offlineQueued: true;
  };
  createdAt: number;
  synced: boolean;
}

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = e => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    request.onsuccess = e => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function queueAttendanceRecord(
  type: 'clock_in' | 'clock_out',
  data: Omit<QueuedAttendanceRecord['data'], 'offlineQueued' | 'timestamp'>,
): Promise<string> {
  const database = await openDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: QueuedAttendanceRecord = {
    id,
    type,
    data: { ...data, timestamp: new Date().toISOString(), offlineQueued: true },
    createdAt: Date.now(),
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingQueuedRecords(): Promise<QueuedAttendanceRecord[]> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('synced');
    const req = index.getAll(IDBKeyRange.only(false));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function markRecordSynced(id: string): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function syncQueuedRecords(
  syncFn: (record: QueuedAttendanceRecord) => Promise<void>,
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingQueuedRecords();
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await syncFn(record);
      await markRecordSynced(record.id);
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function getQueuedCount(): Promise<number> {
  const pending = await getPendingQueuedRecords();
  return pending.length;
}

// Auto-sync when coming back online
export function initOfflineSync(
  syncFn: (record: QueuedAttendanceRecord) => Promise<void>,
  onSync?: (result: { synced: number; failed: number }) => void,
) {
  const handleOnline = async () => {
    const count = await getQueuedCount();
    if (count > 0) {
      const result = await syncQueuedRecords(syncFn);
      onSync?.(result);
    }
  };

  window.addEventListener('online', handleOnline);
  // Run immediately if already online and have pending records
  if (navigator.onLine) handleOnline();

  return () => window.removeEventListener('online', handleOnline);
}
