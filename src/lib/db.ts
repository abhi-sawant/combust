import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import type { FuelEntry, FuelEntryInput } from "@/types/entry"

interface FuelDB extends DBSchema {
  entries: {
    key: string
    value: FuelEntry
    indexes: { "by-odometer": number }
  }
}

const DB_NAME = "combust"
const DB_VERSION = 1
const STORE_NAME = "entries"

let dbPromise: Promise<IDBPDatabase<FuelDB>> | null = null

function getDb() {
  dbPromise ??= openDB<FuelDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" })
      store.createIndex("by-odometer", "odometerReading")
    },
  })
  return dbPromise
}

/** Storage contract for fuel entries, kept narrow so the backing store can be swapped later. */
export interface EntriesRepository {
  getAll(): Promise<FuelEntry[]>
  add(entry: FuelEntryInput): Promise<FuelEntry>
  update(id: string, entry: FuelEntryInput): Promise<FuelEntry>
  delete(id: string): Promise<void>
}

class IndexedDbEntriesRepository implements EntriesRepository {
  async getAll(): Promise<FuelEntry[]> {
    const db = await getDb()
    return db.getAllFromIndex(STORE_NAME, "by-odometer")
  }

  async add(entry: FuelEntryInput): Promise<FuelEntry> {
    const db = await getDb()
    const record: FuelEntry = { ...entry, id: crypto.randomUUID() }
    await db.add(STORE_NAME, record)
    return record
  }

  async update(id: string, entry: FuelEntryInput): Promise<FuelEntry> {
    const db = await getDb()
    const record: FuelEntry = { ...entry, id }
    await db.put(STORE_NAME, record)
    return record
  }

  async delete(id: string): Promise<void> {
    const db = await getDb()
    await db.delete(STORE_NAME, id)
  }
}

export const entriesRepository: EntriesRepository = new IndexedDbEntriesRepository()

/**
 * Bulk-inserts entries (e.g. from CSV import) in a single transaction.
 * Not part of `EntriesRepository` since it's an import-time convenience,
 * not a swap point for the storage backend.
 */
export async function bulkAddEntries(entries: FuelEntryInput[]): Promise<FuelEntry[]> {
  const db = await getDb()
  const tx = db.transaction(STORE_NAME, "readwrite")
  const records = entries.map((entry) => ({ ...entry, id: crypto.randomUUID() }))
  await Promise.all([...records.map((record) => tx.store.add(record)), tx.done])
  return records
}
