// Shared IndexedDB initialization for the entire application

const DB_NAME = 'CombustDB';
const DB_VERSION = 4;

export const STORES = {
  ENTRIES: 'entries',
};

// Open or create the database with all required object stores
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;
      
      // Create entries object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORES.ENTRIES)) {
        const entriesStore = db.createObjectStore(STORES.ENTRIES, {
          keyPath: 'id',
          autoIncrement: true
        });

        // Create indexes for efficient querying
        entriesStore.createIndex('date', 'date', { unique: false });
        entriesStore.createIndex('fuelStation', 'fuelStation', { unique: false });
        entriesStore.createIndex('userId', 'userId', { unique: false });
        entriesStore.createIndex('supabaseId', 'supabaseId', { unique: false });
        entriesStore.createIndex('clientId', 'clientId', { unique: false });
      } else {
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const entriesStore = transaction?.objectStore(STORES.ENTRIES);

        // Add userId index if upgrading from version 1
        if (oldVersion < 2 && entriesStore && !entriesStore.indexNames.contains('userId')) {
          entriesStore.createIndex('userId', 'userId', { unique: false });
        }

        // Add supabaseId index if upgrading from version < 3. Sync used to find
        // a local row's Supabase counterpart by scanning every record with a
        // cursor — O(n) per remote row, O(n^2) per sync. This makes it a
        // direct lookup instead.
        if (oldVersion < 3 && entriesStore && !entriesStore.indexNames.contains('supabaseId')) {
          entriesStore.createIndex('supabaseId', 'supabaseId', { unique: false });
        }

        // Add clientId index if upgrading from version < 4 — the join key
        // sync now prefers over matching on date/amount/odometer/litres.
        if (oldVersion < 4 && entriesStore && !entriesStore.indexNames.contains('clientId')) {
          entriesStore.createIndex('clientId', 'clientId', { unique: false });
        }
      }
    };
  });
}
