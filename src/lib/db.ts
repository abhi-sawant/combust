// IndexedDB utility for storing fuel entries
import { openDB, STORES } from './database';

export type Entry = {
  id?: number;
  userId: number;
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

const STORE_NAME = STORES.ENTRIES;

// Get all entries for a specific user
export async function getAllEntries(userId: number): Promise<Entry[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(userId);

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

// Clear all entries for a specific user
export async function clearAllEntries(userId: number): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.openCursor(IDBKeyRange.only(userId));
    
    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
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

// Replace all entries for a user (clear and add new ones)
export async function replaceAllEntries(userId: number, entries: Omit<Entry, 'id'>[]): Promise<void> {
  await clearAllEntries(userId);
  if (entries.length > 0) {
    // Ensure all entries have the correct userId
    const entriesWithUserId = entries.map(entry => ({ ...entry, userId }));
    await bulkAddEntries(entriesWithUserId);
  }
}
