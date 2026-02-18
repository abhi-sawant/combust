// IndexedDB utility for storing fuel entries

export type Entry = {
  id?: number;
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

const DB_NAME = 'CombustDB';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

// Open or create the database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        
        // Create indexes for efficient querying
        objectStore.createIndex('date', 'date', { unique: false });
        objectStore.createIndex('fuelStation', 'fuelStation', { unique: false });
      }
    };
  });
}

// Get all entries
export async function getAllEntries(): Promise<Entry[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Add a new entry
export async function addEntry(entry: Omit<Entry, 'id'>): Promise<number> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as number);
  });
}

// Update an existing entry
export async function updateEntry(entry: Entry): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Delete an entry
export async function deleteEntry(id: number): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Clear all entries
export async function clearAllEntries(): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Bulk add entries (useful for import)
export async function bulkAddEntries(entries: Omit<Entry, 'id'>[]): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    let pending = entries.length;
    
    entries.forEach((entry) => {
      const request = store.add(entry);
      request.onsuccess = () => {
        pending--;
        if (pending === 0) resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });
}

// Replace all entries (clear and add new ones)
export async function replaceAllEntries(entries: Omit<Entry, 'id'>[]): Promise<void> {
  await clearAllEntries();
  if (entries.length > 0) {
    await bulkAddEntries(entries);
  }
}
