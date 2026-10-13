import { openDB, type DBSchema, type IDBPDatabase } from "idb"

import type { FuelEntry, FuelEntryInput } from "@/types/entry"
import type { Vehicle, VehicleInput } from "@/types/vehicle"

/** Sync bookkeeping stored next to every record. */
export interface SyncFields {
  /** Epoch ms of the last local or remote edit — drives last-write-wins. */
  updatedAt: number
  /** Epoch ms the record was deleted; the tombstone lets the delete sync to other devices. */
  deletedAt: number | null
  /** True while the record has local changes the cloud hasn't seen. */
  dirty: boolean
}

export type StoredVehicle = Vehicle & SyncFields
export type StoredEntry = FuelEntry & SyncFields

interface CombustDB extends DBSchema {
  vehicles: { key: string; value: StoredVehicle }
  entries: { key: string; value: StoredEntry; indexes: { vehicleId: string } }
  meta: { key: string; value: unknown }
}

let dbPromise: Promise<IDBPDatabase<CombustDB>> | null = null

function getDb() {
  dbPromise ??= openDB<CombustDB>("combust", 1, {
    upgrade(db) {
      db.createObjectStore("vehicles", { keyPath: "id" })
      db.createObjectStore("entries", { keyPath: "id" }).createIndex("vehicleId", "vehicleId")
      db.createObjectStore("meta")
    },
  })
  return dbPromise
}

type ChangeSource = "local" | "remote"
type Listener = (source: ChangeSource) => void
const listeners = new Set<Listener>()

/** Subscribe to data changes: "local" for user edits, "remote" for changes pulled by sync. */
export function subscribeToChanges(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function notifyChange(source: ChangeSource) {
  listeners.forEach((listener) => listener(source))
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await (await getDb()).get("meta", key)) as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await (await getDb()).put("meta", value, key)
}

export async function deleteMeta(key: string): Promise<void> {
  await (await getDb()).delete("meta", key)
}

const live = <T extends SyncFields>(record: T) => record.deletedAt === null

function stripVehicle(stored: StoredVehicle): Vehicle {
  const vehicle: Partial<StoredVehicle> = { ...stored }
  delete vehicle.updatedAt
  delete vehicle.deletedAt
  delete vehicle.dirty
  return vehicle as Vehicle
}

function stripEntry(stored: StoredEntry): FuelEntry {
  const entry: Partial<StoredEntry> = { ...stored }
  delete entry.updatedAt
  delete entry.deletedAt
  delete entry.dirty
  return entry as FuelEntry
}

// --- Entries -----------------------------------------------------------------

class LocalEntriesRepository {
  async getAll(vehicleId: string): Promise<FuelEntry[]> {
    const db = await getDb()
    const all = await db.getAllFromIndex("entries", "vehicleId", vehicleId)
    return all
      .filter(live)
      .map(stripEntry)
      .sort((a, b) => a.odometerReading - b.odometerReading)
  }

  async add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    const record: StoredEntry = {
      ...entry,
      id: crypto.randomUUID(),
      vehicleId,
      updatedAt: Date.now(),
      deletedAt: null,
      dirty: true,
    }
    await (await getDb()).put("entries", record)
    notifyChange("local")
    return stripEntry(record)
  }

  async update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    const db = await getDb()
    const existing = await db.get("entries", id)
    if (!existing || existing.deletedAt !== null) throw new Error("Entry not found")
    const record: StoredEntry = { ...existing, ...entry, vehicleId, updatedAt: nextStamp(existing.updatedAt), dirty: true }
    await db.put("entries", record)
    notifyChange("local")
    return stripEntry(record)
  }

  async delete(id: string): Promise<void> {
    const db = await getDb()
    const existing = await db.get("entries", id)
    if (!existing || existing.deletedAt !== null) return
    const now = nextStamp(existing.updatedAt)
    await db.put("entries", { ...existing, deletedAt: now, updatedAt: now, dirty: true })
    notifyChange("local")
  }
}

/** Always strictly after the previous stamp, so quick successive edits on one device still win LWW. */
function nextStamp(previous: number): number {
  return Math.max(Date.now(), previous + 1)
}

export const localEntries = new LocalEntriesRepository()

/** Bulk-inserts entries (e.g. from CSV import) in a single transaction. */
export async function localBulkAddEntries(entries: FuelEntryInput[], vehicleId: string): Promise<FuelEntry[]> {
  const db = await getDb()
  const tx = db.transaction("entries", "readwrite")
  const now = Date.now()
  const records: StoredEntry[] = entries.map((entry) => ({
    ...entry,
    id: crypto.randomUUID(),
    vehicleId,
    updatedAt: now,
    deletedAt: null,
    dirty: true,
  }))
  await Promise.all([...records.map((record) => tx.store.put(record)), tx.done])
  notifyChange("local")
  return records.map(stripEntry)
}

// --- Vehicles ----------------------------------------------------------------

class LocalVehiclesRepository {
  async getAll(): Promise<Vehicle[]> {
    const all = await (await getDb()).getAll("vehicles")
    return all
      .filter(live)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map(stripVehicle)
  }

  async add(input: VehicleInput): Promise<Vehicle> {
    const now = Date.now()
    const record: StoredVehicle = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date(now).toISOString(),
      updatedAt: now,
      deletedAt: null,
      dirty: true,
    }
    await (await getDb()).put("vehicles", record)
    notifyChange("local")
    return stripVehicle(record)
  }

  async update(id: string, input: VehicleInput): Promise<Vehicle> {
    const db = await getDb()
    const existing = await db.get("vehicles", id)
    if (!existing || existing.deletedAt !== null) throw new Error("Vehicle not found")
    const record: StoredVehicle = { ...existing, ...input, updatedAt: nextStamp(existing.updatedAt), dirty: true }
    await db.put("vehicles", record)
    notifyChange("local")
    return stripVehicle(record)
  }

  /** Tombstones the vehicle and all of its entries. */
  async delete(id: string): Promise<void> {
    const db = await getDb()
    const existing = await db.get("vehicles", id)
    if (!existing || existing.deletedAt !== null) return
    const tx = db.transaction(["vehicles", "entries"], "readwrite")
    const now = nextStamp(existing.updatedAt)
    const writes: Promise<unknown>[] = [
      tx.objectStore("vehicles").put({ ...existing, deletedAt: now, updatedAt: now, dirty: true }),
    ]
    for (const entry of await tx.objectStore("entries").index("vehicleId").getAll(id)) {
      if (entry.deletedAt === null) {
        writes.push(tx.objectStore("entries").put({ ...entry, deletedAt: now, updatedAt: now, dirty: true }))
      }
    }
    await Promise.all([...writes, tx.done])
    notifyChange("local")
  }
}

export const localVehicles = new LocalVehiclesRepository()

// --- Whole-store helpers -----------------------------------------------------

/** Fill-up counts per live vehicle. */
export async function localCountEntriesByVehicle(): Promise<Record<string, number>> {
  const all = await (await getDb()).getAll("entries")
  const counts: Record<string, number> = {}
  for (const entry of all) {
    if (live(entry)) counts[entry.vehicleId] = (counts[entry.vehicleId] ?? 0) + 1
  }
  return counts
}

/**
 * Wipes every vehicle and entry. With `keepTombstones` the records are tombstoned instead so the
 * deletion syncs to the cloud account; otherwise the stores are emptied outright.
 */
export async function localClearAll(keepTombstones: boolean): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["vehicles", "entries"], "readwrite")
  if (keepTombstones) {
    const now = Date.now()
    const writes: Promise<unknown>[] = []
    for (const v of await tx.objectStore("vehicles").getAll()) {
      if (v.deletedAt === null) writes.push(tx.objectStore("vehicles").put({ ...v, deletedAt: now, updatedAt: now, dirty: true }))
    }
    for (const e of await tx.objectStore("entries").getAll()) {
      if (e.deletedAt === null) writes.push(tx.objectStore("entries").put({ ...e, deletedAt: now, updatedAt: now, dirty: true }))
    }
    await Promise.all([...writes, tx.done])
  } else {
    await Promise.all([tx.objectStore("vehicles").clear(), tx.objectStore("entries").clear(), tx.done])
  }
  notifyChange("local")
}

// --- Sync access -------------------------------------------------------------

export async function getAllRecords(): Promise<{ vehicles: StoredVehicle[]; entries: StoredEntry[] }> {
  const db = await getDb()
  return { vehicles: await db.getAll("vehicles"), entries: await db.getAll("entries") }
}

/** Marks every record dirty — used when linking to a cloud account for the first time. */
export async function markAllDirty(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(["vehicles", "entries"], "readwrite")
  const writes: Promise<unknown>[] = []
  for (const v of await tx.objectStore("vehicles").getAll()) writes.push(tx.objectStore("vehicles").put({ ...v, dirty: true }))
  for (const e of await tx.objectStore("entries").getAll()) writes.push(tx.objectStore("entries").put({ ...e, dirty: true }))
  await Promise.all([...writes, tx.done])
}

/**
 * Applies a sync result in one transaction: remote records newer than the local copy replace it,
 * and records that were pushed unchanged stop being dirty. Returns whether local data changed.
 */
export async function applySyncResult(input: {
  remoteVehicles: (Vehicle & { updatedAt: number; deletedAt: number | null })[]
  remoteEntries: (FuelEntry & { updatedAt: number; deletedAt: number | null })[]
  pushedVehicles: Map<string, number>
  pushedEntries: Map<string, number>
}): Promise<boolean> {
  const db = await getDb()
  const tx = db.transaction(["vehicles", "entries"], "readwrite")
  const vehicles = tx.objectStore("vehicles")
  const entries = tx.objectStore("entries")
  let changed = false

  for (const remote of input.remoteVehicles) {
    const local = await vehicles.get(remote.id)
    if (!local || remote.updatedAt > local.updatedAt) {
      await vehicles.put({ ...remote, dirty: false })
      changed = true
    }
  }
  for (const remote of input.remoteEntries) {
    const local = await entries.get(remote.id)
    if (!local || remote.updatedAt > local.updatedAt) {
      await entries.put({ ...remote, dirty: false })
      changed = true
    }
  }

  for (const [id, sentAt] of input.pushedVehicles) {
    const local = await vehicles.get(id)
    if (local?.dirty && local.updatedAt === sentAt) await vehicles.put({ ...local, dirty: false })
  }
  for (const [id, sentAt] of input.pushedEntries) {
    const local = await entries.get(id)
    if (local?.dirty && local.updatedAt === sentAt) await entries.put({ ...local, dirty: false })
  }

  await tx.done
  return changed
}
