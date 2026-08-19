import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import type { FuelEntry, FuelEntryInput } from "@/types/entry"
import type { Vehicle, VehicleInput } from "@/types/vehicle"

interface FuelDB extends DBSchema {
  entries: {
    key: string
    value: FuelEntry
    indexes: { "by-odometer": number; "by-vehicle": string }
  }
  vehicles: {
    key: string
    value: Vehicle
  }
}

const DB_NAME = "combust"
const DB_VERSION = 2
const ENTRIES_STORE = "entries"
const VEHICLES_STORE = "vehicles"
const DEFAULT_VEHICLE_NAME = "My Vehicle"

let dbPromise: Promise<IDBPDatabase<FuelDB>> | null = null

function getDb() {
  dbPromise ??= openDB<FuelDB>(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, transaction) {
      const entriesStore =
        oldVersion < 1
          ? (() => {
              const store = db.createObjectStore(ENTRIES_STORE, { keyPath: "id" })
              store.createIndex("by-odometer", "odometerReading")
              return store
            })()
          : transaction.objectStore(ENTRIES_STORE)

      if (oldVersion < 2) {
        const vehiclesStore = db.createObjectStore(VEHICLES_STORE, { keyPath: "id" })
        entriesStore.createIndex("by-vehicle", "vehicleId")

        // Backfill only applies to a real upgrade (existing rows with no vehicleId yet).
        // A brand-new install has nothing to back-fill, so no vehicle is created here —
        // the user is prompted to add one on first use instead.
        const existing = await entriesStore.getAll()
        if (existing.length > 0) {
          const defaultVehicle: Vehicle = {
            id: crypto.randomUUID(),
            name: DEFAULT_VEHICLE_NAME,
            createdAt: new Date().toISOString(),
          }
          await vehiclesStore.add(defaultVehicle)
          for (const entry of existing) {
            if (!entry.vehicleId) {
              await entriesStore.put({ ...entry, vehicleId: defaultVehicle.id })
            }
          }
        }
      }
    },
  })
  return dbPromise
}

/** Storage contract for fuel entries, kept narrow so the backing store can be swapped later. */
export interface EntriesRepository {
  getAll(vehicleId: string): Promise<FuelEntry[]>
  add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry>
  update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry>
  delete(id: string): Promise<void>
}

class IndexedDbEntriesRepository implements EntriesRepository {
  async getAll(vehicleId: string): Promise<FuelEntry[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex(ENTRIES_STORE, "by-vehicle", vehicleId)
    return all.sort((a, b) => a.odometerReading - b.odometerReading)
  }

  async add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    const db = await getDb()
    const record: FuelEntry = { ...entry, id: crypto.randomUUID(), vehicleId }
    await db.add(ENTRIES_STORE, record)
    return record
  }

  async update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    const db = await getDb()
    const record: FuelEntry = { ...entry, id, vehicleId }
    await db.put(ENTRIES_STORE, record)
    return record
  }

  async delete(id: string): Promise<void> {
    const db = await getDb()
    await db.delete(ENTRIES_STORE, id)
  }
}

export const entriesRepository: EntriesRepository = new IndexedDbEntriesRepository()

/**
 * Bulk-inserts entries (e.g. from CSV import) in a single transaction.
 * Not part of `EntriesRepository` since it's an import-time convenience,
 * not a swap point for the storage backend.
 */
export async function bulkAddEntries(entries: FuelEntryInput[], vehicleId: string): Promise<FuelEntry[]> {
  const db = await getDb()
  const tx = db.transaction(ENTRIES_STORE, "readwrite")
  const records = entries.map((entry) => ({ ...entry, id: crypto.randomUUID(), vehicleId }))
  await Promise.all([...records.map((record) => tx.store.add(record)), tx.done])
  return records
}

/** Storage contract for vehicles. */
export interface VehiclesRepository {
  getAll(): Promise<Vehicle[]>
  add(input: VehicleInput): Promise<Vehicle>
  update(id: string, input: VehicleInput): Promise<Vehicle>
  delete(id: string): Promise<void>
}

class IndexedDbVehiclesRepository implements VehiclesRepository {
  async getAll(): Promise<Vehicle[]> {
    const db = await getDb()
    const all = await db.getAll(VEHICLES_STORE)
    return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async add(input: VehicleInput): Promise<Vehicle> {
    const db = await getDb()
    const record: Vehicle = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    await db.add(VEHICLES_STORE, record)
    return record
  }

  async update(id: string, input: VehicleInput): Promise<Vehicle> {
    const db = await getDb()
    const existing = await db.get(VEHICLES_STORE, id)
    const record: Vehicle = {
      ...input,
      id,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }
    await db.put(VEHICLES_STORE, record)
    return record
  }

  async delete(id: string): Promise<void> {
    const db = await getDb()
    await db.delete(VEHICLES_STORE, id)
  }
}

export const vehiclesRepository: VehiclesRepository = new IndexedDbVehiclesRepository()

/** Wipes all vehicles and fuel entries. Preferences (theme, name) are untouched. */
export async function clearAllData(): Promise<void> {
  const db = await getDb()
  await Promise.all([db.clear(ENTRIES_STORE), db.clear(VEHICLES_STORE)])
}

/** Fill-up counts per vehicle, for the vehicle-switcher sheet — fetched on demand rather than kept live. */
export async function countEntriesByVehicle(): Promise<Record<string, number>> {
  const db = await getDb()
  const all = await db.getAllFromIndex(ENTRIES_STORE, "by-vehicle")
  const counts: Record<string, number> = {}
  for (const entry of all) {
    counts[entry.vehicleId] = (counts[entry.vehicleId] ?? 0) + 1
  }
  return counts
}
