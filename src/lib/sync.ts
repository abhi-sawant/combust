import { getStoredToken } from "@/lib/auth-token"
import { apiRequest } from "@/lib/api-client"
import {
  applySyncResult,
  deleteMeta,
  getAllRecords,
  getMeta,
  localClearAll,
  markAllDirty,
  notifyChange,
  setMeta,
} from "@/lib/local-db"
import type { FuelEntry } from "@/types/entry"
import type { Vehicle } from "@/types/vehicle"

type Stamped<T> = T & { updatedAt: number; deletedAt: number | null }

interface SyncResponse {
  cursor: number
  vehicles: Stamped<Vehicle>[]
  entries: Stamped<FuelEntry>[]
}

const CURSOR_KEY = "syncCursor"
const LAST_SYNCED_KEY = "lastSyncedAt"

const LINKED_EMAIL_KEY = "linkedEmail"

/**
 * Call when an account signs in, before any sync. If the data on this device was last linked to a
 * different account it is erased first, so one account's data never uploads into another's.
 * Data never linked to any account (pure local use) is kept and merges into this account.
 * Returns true if local data was erased.
 */
export async function prepareForAccount(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  const linked = await getMeta<string>(LINKED_EMAIL_KEY)
  let erased = false
  if (linked !== undefined && linked !== normalized) {
    await localClearAll(false)
    await resetSyncState()
    erased = true
  }
  await setMeta(LINKED_EMAIL_KEY, normalized)
  return erased
}

let inFlight: Promise<void> | null = null

/** True once this device has completed a sync with the current cloud account. */
export async function hasSynced(): Promise<boolean> {
  return (await getMeta<number>(CURSOR_KEY)) !== undefined
}

export function getLastSyncedAt(): Promise<number | undefined> {
  return getMeta<number>(LAST_SYNCED_KEY)
}

/** Forget the sync position (on sign-out) so the next sign-in re-uploads everything and pulls fresh. */
export async function resetSyncState(): Promise<void> {
  await Promise.all([deleteMeta(CURSOR_KEY), deleteMeta(LAST_SYNCED_KEY)])
}

/**
 * Pushes local changes to the cloud account and pulls remote ones. Local data is the primary copy;
 * conflicts resolve per record by last-write-wins on `updatedAt`. Concurrent calls share one run.
 */
export function syncNow(): Promise<void> {
  if (!getStoredToken()) return Promise.resolve()
  inFlight ??= runSync().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function runSync(): Promise<void> {
  let cursor = await getMeta<number>(CURSOR_KEY)
  if (cursor === undefined) {
    // First sync with this account: upload everything on the device.
    await markAllDirty()
    cursor = 0
  }

  const { vehicles, entries } = await getAllRecords()
  const dirtyVehicles = vehicles.filter((v) => v.dirty)
  const dirtyEntries = entries.filter((e) => e.dirty)

  const strip = <T extends { dirty: boolean }>(record: T): Omit<T, "dirty"> => {
    const copy: Partial<T> = { ...record }
    delete copy.dirty
    return copy as Omit<T, "dirty">
  }

  const response = await apiRequest<SyncResponse>("/sync", {
    method: "POST",
    body: { cursor, vehicles: dirtyVehicles.map(strip), entries: dirtyEntries.map(strip) },
  })

  const changed = await applySyncResult({
    remoteVehicles: response.vehicles,
    remoteEntries: response.entries,
    pushedVehicles: new Map(dirtyVehicles.map((v) => [v.id, v.updatedAt])),
    pushedEntries: new Map(dirtyEntries.map((e) => [e.id, e.updatedAt])),
  })

  await setMeta(CURSOR_KEY, response.cursor)
  await setMeta(LAST_SYNCED_KEY, Date.now())
  if (changed) notifyChange("remote")
}
