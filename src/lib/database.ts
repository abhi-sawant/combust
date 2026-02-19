// Shared IndexedDB initialization for the entire application

const DB_NAME = 'CombustDB';
const DB_VERSION = 2;

export const STORES = {
  ENTRIES: 'entries',
  USERS: 'users',
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
      } else if (oldVersion < 2) {
        // Add userId index if upgrading from version 1
        const transaction = (event.target as IDBOpenDBRequest).transaction;
        const entriesStore = transaction?.objectStore(STORES.ENTRIES);
        if (entriesStore && !entriesStore.indexNames.contains('userId')) {
          entriesStore.createIndex('userId', 'userId', { unique: false });
        }
      }
      
      // Create users object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const usersStore = db.createObjectStore(STORES.USERS, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        // Create index for email (unique)
        usersStore.createIndex('email', 'email', { unique: true });
      }
    };
  });
}
