// Custom React hook for IndexedDB-backed state
import { useState, useEffect, useCallback } from 'react';
import * as db from './db';

export type Entry = {
  id?: number;
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

export function useIndexedDBEntries() {
  const [entries, setEntriesState] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries from IndexedDB on mount
  useEffect(() => {
    async function loadEntries() {
      try {
        const loadedEntries = await db.getAllEntries();
        setEntriesState(loadedEntries);
      } catch (error) {
        console.error('Error loading entries from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadEntries();
  }, []);

  // Add a new entry
  const addEntry = useCallback(async (entry: Omit<Entry, 'id'>) => {
    try {
      const id = await db.addEntry(entry);
      setEntriesState(prev => [{ ...entry, id }, ...prev]);
      return id;
    } catch (error) {
      console.error('Error adding entry:', error);
      throw error;
    }
  }, []);

  // Update an existing entry
  const updateEntry = useCallback(async (entry: Entry) => {
    try {
      await db.updateEntry(entry);
      setEntriesState(prev => 
        prev.map(e => e.id === entry.id ? entry : e)
      );
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }, []);

  // Delete an entry
  const deleteEntry = useCallback(async (id: number) => {
    try {
      await db.deleteEntry(id);
      setEntriesState(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }, []);

  // Replace all entries (useful for import)
  const replaceAllEntries = useCallback(async (newEntries: Omit<Entry, 'id'>[]) => {
    try {
      await db.replaceAllEntries(newEntries);
      // Reload from DB to get IDs
      const loadedEntries = await db.getAllEntries();
      setEntriesState(loadedEntries);
    } catch (error) {
      console.error('Error replacing entries:', error);
      throw error;
    }
  }, []);

  // Move entry (reorder)
  const moveEntry = useCallback((fromIndex: number, toIndex: number) => {
    setEntriesState(prev => {
      const newEntries = [...prev];
      const [removed] = newEntries.splice(fromIndex, 1);
      newEntries.splice(toIndex, 0, removed);
      
      // Note: We're not persisting the order change to IndexedDB
      // If you want persistent ordering, you'd need to add an 'order' field
      return newEntries;
    });
  }, []);

  // Clear all entries
  const clearAllEntries = useCallback(async () => {
    try {
      await db.clearAllEntries();
      setEntriesState([]);
    } catch (error) {
      console.error('Error clearing entries:', error);
      throw error;
    }
  }, []);

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
    replaceAllEntries,
    moveEntry,
    clearAllEntries,
  };
}
