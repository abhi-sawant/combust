// Fuel Entries Service - Wraps IndexedDB with Supabase sync
import { supabase, isOnline, type FuelEntryDB } from '../lib/supabaseClient';
import * as localDb from '../lib/db';
import { openDB, STORES } from '../lib/database';
import type { Entry } from '../types';

// Kept as an alias so existing call sites don't need to change their imports.
export type FuelEntry = Entry;

// Extended local entry type with sync metadata
type LocalEntry = FuelEntry & {
  supabaseId?: string;
  syncedAt?: string | null;
  pendingSync?: boolean;
  pendingDelete?: boolean;
};

const SYNC_QUEUE_KEY = 'combust_sync_queue';

type SyncQueueItem = {
  // Identifies this queue entry itself, distinct from localId/supabaseId which
  // identify the fuel entry it refers to. Without its own id, removing "the
  // create for entry 7" after it succeeds also matched — and deleted — a still
  // -pending "update for entry 7" queued right behind it.
  id: string;
  type: 'create' | 'update' | 'delete';
  localId?: number;
  supabaseId?: string;
  data?: Omit<FuelEntry, 'id' | 'userId'>;
  timestamp: string;
  attempts?: number;
};

const MAX_SYNC_ATTEMPTS = 5;

// Get sync queue from localStorage
function getSyncQueue(): SyncQueueItem[] {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

// Save sync queue to localStorage
function saveSyncQueue(queue: SyncQueueItem[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Add item to sync queue
function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): void {
  const queue = getSyncQueue();
  queue.push({ ...item, id: crypto.randomUUID() });
  saveSyncQueue(queue);
}

// Remove exactly the queue item with this id — never matched by localId or
// supabaseId alone, since more than one queued operation can share those.
function removeFromSyncQueue(queueItemId: string): void {
  const queue = getSyncQueue();
  saveSyncQueue(queue.filter(item => item.id !== queueItemId));
}

// Convert Supabase entry to local format
function supabaseToLocal(entry: FuelEntryDB, localUserId: number): LocalEntry {
  return {
    id: entry.local_id ?? undefined,
    supabaseId: entry.id,
    clientId: entry.client_id ?? undefined,
    userId: localUserId,
    supabaseUserId: entry.user_id,
    date: entry.date,
    amountPaid: entry.amount_paid,
    odometerReading: entry.odometer_reading,
    fuelFilled: entry.fuel_filled,
    fuelStation: entry.fuel_station,
    syncedAt: entry.synced_at,
    isDeleted: entry.is_deleted,
  };
}

// Convert local entry to Supabase format
function localToSupabase(entry: FuelEntry, supabaseUserId: string): Omit<FuelEntryDB, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: supabaseUserId,
    client_id: entry.clientId ?? null,
    date: entry.date,
    amount_paid: entry.amountPaid,
    odometer_reading: entry.odometerReading,
    fuel_filled: entry.fuelFilled,
    fuel_station: entry.fuelStation,
    local_id: entry.id ?? null,
    is_deleted: false,
    synced_at: new Date().toISOString(),
  };
}

// Get all entries - online first, fallback to local
export async function getAllEntries(
  localUserId: number,
  supabaseUserId?: string
): Promise<FuelEntry[]> {
  // Try Supabase first if online and authenticated
  if (isOnline() && supabaseUserId) {
    try {
      // Fetch active entries
      const { data, error } = await supabase
        .from('fuel_entries')
        .select('*')
        .eq('user_id', supabaseUserId)
        .eq('is_deleted', false)
        .order('date', { ascending: false });

      if (error) throw error;

      // Also fetch deleted entries to sync deletions across devices
      const { data: deletedData } = await supabase
        .from('fuel_entries')
        .select('*')
        .eq('user_id', supabaseUserId)
        .eq('is_deleted', true);

      if (data) {
        // Sync deletions first - remove locally any entries that are deleted in Supabase
        if (deletedData && deletedData.length > 0) {
          await syncDeletionsToLocal(deletedData, localUserId);
        }
        
        // Then sync active entries to local cache
        await syncToLocal(data, localUserId, supabaseUserId);
        return data.map((entry: FuelEntryDB) => supabaseToLocal(entry, localUserId));
      }
    } catch (error) {
      console.error('Error fetching from Supabase, falling back to local:', error);
    }
  }

  // Fallback to local IndexedDB
  const localEntries = await localDb.getAllEntries(localUserId);
  return localEntries.filter((e: Entry) => !(e as LocalEntry).isDeleted);
}

// Create a new entry - online first, queue if offline
export async function createEntry(
  entry: Omit<FuelEntry, 'id' | 'userId'>,
  localUserId: number,
  supabaseUserId?: string
): Promise<FuelEntry> {
  // Assigned once, here, and never regenerated — this is what lets sync tell
  // "already pushed" apart from "still needs pushing" without matching on
  // date/amount/odometer/litres (see Entry.clientId in src/types.ts).
  const clientId = crypto.randomUUID();

  // Always save to local first
  const localEntry = {
    userId: localUserId,
    clientId,
    date: entry.date,
    amountPaid: entry.amountPaid,
    odometerReading: entry.odometerReading,
    fuelFilled: entry.fuelFilled,
    fuelStation: entry.fuelStation,
  };

  const localId = await localDb.addEntry(localEntry);
  const savedEntry: FuelEntry = { ...localEntry, id: localId };

  // Try to sync to Supabase if online
  if (isOnline() && supabaseUserId) {
    try {
      const supabaseData = localToSupabase({ ...savedEntry, id: localId }, supabaseUserId);

      const { data, error } = await supabase
        .from('fuel_entries')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Update local entry with Supabase ID
        savedEntry.supabaseId = data.id;
        savedEntry.syncedAt = data.synced_at;
        await updateLocalWithSupabaseId(localId, data.id, data.synced_at);
      }
    } catch (error) {
      console.error('Error syncing to Supabase, queued for later:', error);
      // Queue for later sync
      addToSyncQueue({
        type: 'create',
        localId,
        data: { ...entry, clientId },
        timestamp: new Date().toISOString(),
      });
    }
  } else if (supabaseUserId) {
    // Queue for later sync when offline
    addToSyncQueue({
      type: 'create',
      localId,
      data: { ...entry, clientId },
      timestamp: new Date().toISOString(),
    });
  }

  return savedEntry;
}

// Bulk create — used by import, so replacing N entries costs one Supabase
// round trip instead of N. Local writes still happen per-row (IndexedDB
// requests are cheap and this is how we get an id back for each), but the
// network call that used to dominate the cost is now a single insert.
export async function bulkCreateEntries(
  entries: Omit<FuelEntry, 'id' | 'userId'>[],
  localUserId: number,
  supabaseUserId?: string
): Promise<FuelEntry[]> {
  if (entries.length === 0) return [];

  const localEntries = entries.map(entry => ({
    userId: localUserId,
    clientId: crypto.randomUUID(),
    date: entry.date,
    amountPaid: entry.amountPaid,
    odometerReading: entry.odometerReading,
    fuelFilled: entry.fuelFilled,
    fuelStation: entry.fuelStation,
  }));

  const localIds = await localDb.bulkAddEntriesReturningIds(localEntries);
  const savedEntries: FuelEntry[] = localEntries.map((entry, i) => ({ ...entry, id: localIds[i] }));

  if (isOnline() && supabaseUserId) {
    try {
      const supabaseRows = savedEntries.map(entry => localToSupabase(entry, supabaseUserId));

      const { data, error } = await supabase
        .from('fuel_entries')
        .insert(supabaseRows)
        .select();

      if (error) throw error;

      if (data) {
        // Supabase preserves insert order in the returned rows for a single
        // multi-row insert, so we can zip results back up positionally.
        await Promise.all(
          data.map((row, i) => updateLocalWithSupabaseId(savedEntries[i].id!, row.id, row.synced_at))
        );
        data.forEach((row, i) => {
          savedEntries[i].supabaseId = row.id;
          savedEntries[i].syncedAt = row.synced_at;
        });
      }
    } catch (error) {
      console.error('Error bulk-syncing to Supabase, queued for later:', error);
      savedEntries.forEach((entry, i) => {
        addToSyncQueue({
          type: 'create',
          localId: entry.id,
          data: { ...entries[i], clientId: entry.clientId },
          timestamp: new Date().toISOString(),
        });
      });
    }
  } else if (supabaseUserId) {
    savedEntries.forEach((entry, i) => {
      addToSyncQueue({
        type: 'create',
        localId: entry.id,
        data: { ...entries[i], clientId: entry.clientId },
        timestamp: new Date().toISOString(),
      });
    });
  }

  return savedEntries;
}

// Update an entry - online first, queue if offline
export async function updateEntry(
  entry: FuelEntry,
  supabaseUserId?: string
): Promise<void> {
  // Always update local first
  await localDb.updateEntry({
    id: entry.id!,
    userId: entry.userId,
    date: entry.date,
    amountPaid: entry.amountPaid,
    odometerReading: entry.odometerReading,
    fuelFilled: entry.fuelFilled,
    fuelStation: entry.fuelStation,
  });

  // Try to sync to Supabase if online and has supabaseId
  if (isOnline() && supabaseUserId && entry.supabaseId) {
    try {
      const { error } = await supabase
        .from('fuel_entries')
        .update({
          date: entry.date,
          amount_paid: entry.amountPaid,
          odometer_reading: entry.odometerReading,
          fuel_filled: entry.fuelFilled,
          fuel_station: entry.fuelStation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entry.supabaseId)
        .eq('user_id', supabaseUserId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating in Supabase, queued for later:', error);
      addToSyncQueue({
        type: 'update',
        localId: entry.id,
        supabaseId: entry.supabaseId,
        data: entry,
        timestamp: new Date().toISOString(),
      });
    }
  } else if (supabaseUserId && entry.supabaseId) {
    // Queue for later sync when offline
    addToSyncQueue({
      type: 'update',
      localId: entry.id,
      supabaseId: entry.supabaseId,
      data: entry,
      timestamp: new Date().toISOString(),
    });
  }
}

// Delete an entry - soft delete in Supabase, queue if offline
export async function deleteEntry(
  id: number,
  supabaseId?: string,
  supabaseUserId?: string
): Promise<void> {
  // Delete from local
  await localDb.deleteEntry(id);

  // Soft delete in Supabase if online
  if (isOnline() && supabaseUserId && supabaseId) {
    try {
      const { error } = await supabase
        .from('fuel_entries')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', supabaseId)
        .eq('user_id', supabaseUserId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting in Supabase, queued for later:', error);
      addToSyncQueue({
        type: 'delete',
        localId: id,
        supabaseId,
        timestamp: new Date().toISOString(),
      });
    }
  } else if (supabaseUserId && supabaseId) {
    // Queue for later sync when offline
    addToSyncQueue({
      type: 'delete',
      localId: id,
      supabaseId,
      timestamp: new Date().toISOString(),
    });
  }
}

// Bulk delete (soft) — used by "delete all", so clearing N entries costs one
// Supabase round trip instead of N.
export async function bulkDeleteEntries(
  entries: { id: number; supabaseId?: string }[],
  supabaseUserId?: string
): Promise<void> {
  if (entries.length === 0) return;

  // Delete from local first
  await Promise.all(entries.map(entry => localDb.deleteEntry(entry.id)));

  const supabaseIds = entries.map(entry => entry.supabaseId).filter((id): id is string => !!id);
  if (supabaseIds.length === 0) return;

  if (isOnline() && supabaseUserId) {
    try {
      const { error } = await supabase
        .from('fuel_entries')
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .in('id', supabaseIds)
        .eq('user_id', supabaseUserId);

      if (error) throw error;
    } catch (error) {
      console.error('Error bulk-deleting in Supabase, queued for later:', error);
      entries.forEach(entry => {
        if (entry.supabaseId) {
          addToSyncQueue({
            type: 'delete',
            localId: entry.id,
            supabaseId: entry.supabaseId,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  } else if (supabaseUserId) {
    entries.forEach(entry => {
      if (entry.supabaseId) {
        addToSyncQueue({
          type: 'delete',
          localId: entry.id,
          supabaseId: entry.supabaseId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
}

// Sync deletions from Supabase to local IndexedDB
async function syncDeletionsToLocal(deletedEntries: FuelEntryDB[], localUserId: number): Promise<void> {
  const db = await openDB();
  
  // Get all local entries for this user
  const localEntries: LocalEntry[] = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ENTRIES, 'readonly');
    const store = transaction.objectStore(STORES.ENTRIES);
    const index = store.index('userId');
    const request = index.getAll(localUserId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as LocalEntry[]);
  });

  for (const deletedEntry of deletedEntries) {
    // Find matching local entry by supabaseId
    let localToDelete = localEntries.find(e => e.supabaseId === deletedEntry.id);
    
    // If not found by supabaseId, try matching by data (for entries that were synced before supabaseId was stored)
    if (!localToDelete) {
      localToDelete = localEntries.find(e => 
        !e.supabaseId &&
        e.date === deletedEntry.date &&
        e.amountPaid === deletedEntry.amount_paid &&
        e.odometerReading === deletedEntry.odometer_reading &&
        e.fuelFilled === deletedEntry.fuel_filled
      );
    }
    
    if (localToDelete && localToDelete.id) {
      // Delete the local entry
      await localDb.deleteEntry(localToDelete.id);
    }
  }
}

// Sync remote data to local IndexedDB
async function syncToLocal(remoteEntries: FuelEntryDB[], localUserId: number, supabaseUserId: string): Promise<void> {
  // Get all deleted entries to avoid re-creating them. Prefer client_id where
  // available (see Entry.clientId in src/types.ts) — the date/amount/odometer
  // /litres tuple stays as a fallback only for rows created before that
  // column existed.
  const { data: deletedEntries } = await supabase
    .from('fuel_entries')
    .select('date, amount_paid, odometer_reading, fuel_filled, client_id')
    .eq('user_id', supabaseUserId)
    .eq('is_deleted', true);

  const deletedClientIds = new Set(
    (deletedEntries || []).map(e => e.client_id).filter((id): id is string => !!id)
  );
  const deletedTupleSet = new Set(
    (deletedEntries || [])
      .filter(e => !e.client_id)
      .map(e => `${e.date}|${e.amount_paid}|${e.odometer_reading}|${e.fuel_filled}`)
  );

  for (const remoteEntry of remoteEntries) {
    const localEntry = supabaseToLocal(remoteEntry, localUserId);

    // Check if we already have this entry locally by supabaseId
    const existingLocal = await findLocalBySupabaseId(remoteEntry.id);

    if (existingLocal) {
      // Update existing local entry, preserving supabaseId and syncedAt
      await updateLocalEntryFull({
        id: existingLocal.id!,
        userId: localUserId,
        clientId: localEntry.clientId,
        date: localEntry.date,
        amountPaid: localEntry.amountPaid,
        odometerReading: localEntry.odometerReading,
        fuelFilled: localEntry.fuelFilled,
        fuelStation: localEntry.fuelStation,
        supabaseId: remoteEntry.id,
        syncedAt: remoteEntry.synced_at,
      });
    } else {
      const isDeleted = remoteEntry.client_id
        ? deletedClientIds.has(remoteEntry.client_id)
        : deletedTupleSet.has(`${remoteEntry.date}|${remoteEntry.amount_paid}|${remoteEntry.odometer_reading}|${remoteEntry.fuel_filled}`);

      if (!isDeleted) {
        // Entry doesn't exist locally by supabaseId, create it
        await createLocalFromRemote(localEntry, remoteEntry.id, localUserId);
      }
    }
  }
}

// Update local entry preserving all fields including supabaseId
async function updateLocalEntryFull(entry: LocalEntry): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
    const store = transaction.objectStore(STORES.ENTRIES);
    const request = store.put(entry);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Find local entry by Supabase ID via the `supabaseId` index — a direct
// lookup instead of a full cursor scan per call (see database.ts v3).
async function findLocalBySupabaseId(supabaseId: string): Promise<LocalEntry | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ENTRIES, 'readonly');
    const store = transaction.objectStore(STORES.ENTRIES);
    const index = store.index('supabaseId');
    const request = index.get(supabaseId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as LocalEntry) ?? null);
  });
}

// Update local entry with Supabase ID
async function updateLocalWithSupabaseId(
  localId: number,
  supabaseId: string,
  syncedAt?: string | null
): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
    const store = transaction.objectStore(STORES.ENTRIES);
    const getRequest = store.get(localId);
    
    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const entry = getRequest.result;
      if (entry) {
        entry.supabaseId = supabaseId;
        entry.syncedAt = syncedAt;
        const putRequest = store.put(entry);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

// Create local entry from remote data
async function createLocalFromRemote(
  entry: LocalEntry,
  supabaseId: string,
  localUserId: number
): Promise<number> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.ENTRIES, 'readwrite');
    const store = transaction.objectStore(STORES.ENTRIES);
    
    const localEntry = {
      userId: localUserId,
      clientId: entry.clientId,
      date: entry.date,
      amountPaid: entry.amountPaid,
      odometerReading: entry.odometerReading,
      fuelFilled: entry.fuelFilled,
      fuelStation: entry.fuelStation,
      supabaseId,
      syncedAt: entry.syncedAt,
    };

    const request = store.add(localEntry);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as number);
  });
}

// Process sync queue - called on reconnect or app load
export async function processSyncQueue(
  localUserId: number,
  supabaseUserId: string
): Promise<void> {
  if (!isOnline()) return;

  const queue = getSyncQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} queued sync operations...`);

  for (const item of queue) {
    try {
      switch (item.type) {
        case 'create':
          if (item.data && item.localId) {
            const supabaseData = localToSupabase(
              { ...item.data, id: item.localId, userId: localUserId },
              supabaseUserId
            );
            
            const { data, error } = await supabase
              .from('fuel_entries')
              .insert(supabaseData)
              .select()
              .single();

            if (error) throw error;

            if (data) {
              await updateLocalWithSupabaseId(item.localId, data.id, data.synced_at);
            }
          }
          break;

        case 'update':
          if (item.data && item.supabaseId) {
            const { error } = await supabase
              .from('fuel_entries')
              .update({
                date: item.data.date,
                amount_paid: item.data.amountPaid,
                odometer_reading: item.data.odometerReading,
                fuel_filled: item.data.fuelFilled,
                fuel_station: item.data.fuelStation,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.supabaseId)
              .eq('user_id', supabaseUserId);

            if (error) throw error;
          }
          break;

        case 'delete':
          if (item.supabaseId) {
            const { error } = await supabase
              .from('fuel_entries')
              .update({
                is_deleted: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', item.supabaseId)
              .eq('user_id', supabaseUserId);

            if (error) throw error;
          }
          break;
      }

      // Remove successfully processed item from queue
      removeFromSyncQueue(item.id);
    } catch (error) {
      const attempts = (item.attempts ?? 0) + 1;
      if (attempts >= MAX_SYNC_ATTEMPTS) {
        console.error(
          `Sync queue item ${item.id} (${item.type}) failed ${attempts} times — giving up. It will not be retried again.`,
          error
        );
        removeFromSyncQueue(item.id);
      } else {
        console.error(`Error processing sync queue item (attempt ${attempts}/${MAX_SYNC_ATTEMPTS}):`, error);
        // Record the attempt and keep the item in queue for retry.
        const queue = getSyncQueue();
        saveSyncQueue(queue.map(q => (q.id === item.id ? { ...q, attempts } : q)));
      }
    }
  }
}

// Tracks which users currently have a sync in flight. AuthContext can call
// fullSync from more than one place in quick succession (StrictMode's double
// effect invocation on mount, a sign-in event following session restore) —
// without this guard those calls run concurrently against the same
// IndexedDB store and Supabase rows.
const syncInFlight = new Set<string>();

// Full sync - push local unsynced entries and pull remote changes
export async function fullSync(
  localUserId: number,
  supabaseUserId: string
): Promise<void> {
  if (!isOnline()) return;
  if (syncInFlight.has(supabaseUserId)) return;

  syncInFlight.add(supabaseUserId);
  try {
    // First process any queued operations
    await processSyncQueue(localUserId, supabaseUserId);

    // Then sync local unsynced entries to Supabase
    await pushUnsyncedEntries(localUserId, supabaseUserId);

    // Finally pull all remote entries to local
    await getAllEntries(localUserId, supabaseUserId);
  } finally {
    syncInFlight.delete(supabaseUserId);
  }
}

// Push local entries that haven't been synced to Supabase
async function pushUnsyncedEntries(
  localUserId: number,
  supabaseUserId: string
): Promise<void> {
  const database = await openDB();
  
  const unsyncedEntries: LocalEntry[] = await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.ENTRIES, 'readonly');
    const store = transaction.objectStore(STORES.ENTRIES);
    const index = store.index('userId');
    const request = index.getAll(localUserId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entries = request.result as LocalEntry[];
      // Filter entries without supabaseId (unsynced)
      resolve(entries.filter((e: LocalEntry) => !e.supabaseId && !e.isDeleted));
    };
  });

  for (const entry of unsyncedEntries) {
    try {
      if (entry.clientId) {
        // Client-generated identity is a stable, unambiguous join key — no
        // risk of two different fill-ups colliding the way equal
        // date/amount/odometer/litres could. One query tells us whether this
        // entry already made it to Supabase (possibly soft-deleted from
        // another device) or still needs inserting.
        const { data: existing } = await supabase
          .from('fuel_entries')
          .select('id, synced_at, is_deleted')
          .eq('user_id', supabaseUserId)
          .eq('client_id', entry.clientId)
          .maybeSingle();

        if (existing) {
          if (existing.is_deleted) {
            if (entry.id) await localDb.deleteEntry(entry.id);
          } else if (entry.id) {
            await updateLocalWithSupabaseId(entry.id, existing.id, existing.synced_at);
          }
          continue;
        }

        const supabaseData = localToSupabase(entry, supabaseUserId);
        const { data, error } = await supabase
          .from('fuel_entries')
          .insert(supabaseData)
          .select()
          .single();

        if (error) throw error;
        if (data && entry.id) {
          await updateLocalWithSupabaseId(entry.id, data.id, data.synced_at);
        }
        continue;
      }

      // Legacy entry created before clientId existed — fall back to matching
      // on the field tuple, same as before.
      // First check if this entry was DELETED in Supabase (from another device)
      // If so, delete it locally and skip pushing
      const { data: deletedData } = await supabase
        .from('fuel_entries')
        .select('id')
        .eq('user_id', supabaseUserId)
        .eq('date', entry.date)
        .eq('amount_paid', entry.amountPaid)
        .eq('odometer_reading', entry.odometerReading)
        .eq('fuel_filled', entry.fuelFilled)
        .eq('is_deleted', true)
        .maybeSingle();

      if (deletedData) {
        // Entry was deleted on another device, delete locally too
        if (entry.id) {
          await localDb.deleteEntry(entry.id);
        }
        continue;
      }

      // Check if this entry already exists (active) in Supabase
      const { data: existingData } = await supabase
        .from('fuel_entries')
        .select('id, synced_at')
        .eq('user_id', supabaseUserId)
        .eq('date', entry.date)
        .eq('amount_paid', entry.amountPaid)
        .eq('odometer_reading', entry.odometerReading)
        .eq('fuel_filled', entry.fuelFilled)
        .eq('is_deleted', false)
        .maybeSingle();

      if (existingData) {
        // Entry already exists in Supabase, just update local with the supabaseId
        if (entry.id) {
          await updateLocalWithSupabaseId(entry.id, existingData.id, existingData.synced_at);
        }
        continue;
      }

      // Entry doesn't exist, insert it
      const supabaseData = localToSupabase(entry, supabaseUserId);

      const { data, error } = await supabase
        .from('fuel_entries')
        .insert(supabaseData)
        .select()
        .single();

      if (error) throw error;

      if (data && entry.id) {
        await updateLocalWithSupabaseId(entry.id, data.id, data.synced_at);
      }
    } catch (error) {
      console.error('Error pushing unsynced entry:', error);
    }
  }
}

// Clear all local entries for a user (used on sign out)
export async function clearLocalEntries(localUserId: number): Promise<void> {
  await localDb.clearAllEntries(localUserId);
  saveSyncQueue([]); // Clear sync queue
}
