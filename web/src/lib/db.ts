import {
  localBulkAddEntries,
  localClearAll,
  localCountEntriesByVehicle,
  localEntries,
  localVehicles,
} from "@/lib/local-db"
import { getStoredToken } from "@/lib/auth-token"
import type { FuelEntry, FuelEntryInput } from "@/types/entry"
import type { Vehicle, VehicleInput } from "@/types/vehicle"

/**
 * The app is local-first: everything is read from and written to IndexedDB, whether or not a cloud
 * account is linked. `src/lib/sync.ts` replicates changes to the account in the background.
 */

/** Storage contract for fuel entries. */
export interface EntriesRepository {
  getAll(vehicleId: string): Promise<FuelEntry[]>
  add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry>
  update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry>
  delete(id: string): Promise<void>
}

export const entriesRepository: EntriesRepository = localEntries

/** Bulk-inserts entries (e.g. from CSV import) in a single transaction. */
export async function bulkAddEntries(entries: FuelEntryInput[], vehicleId: string): Promise<FuelEntry[]> {
  return localBulkAddEntries(entries, vehicleId)
}

/** Storage contract for vehicles. */
export interface VehiclesRepository {
  getAll(): Promise<Vehicle[]>
  add(input: VehicleInput): Promise<Vehicle>
  update(id: string, input: VehicleInput): Promise<Vehicle>
  delete(id: string): Promise<void>
}

export const vehiclesRepository: VehiclesRepository = localVehicles

/** Wipes all vehicles and fuel entries. Preferences (theme, name) are untouched. */
export async function clearAllData(): Promise<void> {
  // Signed in: keep tombstones so the deletion reaches the cloud account and other devices.
  await localClearAll(getStoredToken() !== null)
}

/** Fill-up counts per vehicle, for the vehicle-switcher sheet — fetched on demand rather than kept live. */
export async function countEntriesByVehicle(): Promise<Record<string, number>> {
  return localCountEntriesByVehicle()
}
