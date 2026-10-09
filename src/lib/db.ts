import { apiRequest } from "@/lib/api-client"
import type { FuelEntry, FuelEntryInput } from "@/types/entry"
import type { Vehicle, VehicleInput } from "@/types/vehicle"

/** Storage contract for fuel entries, kept narrow so the backing store can be swapped later. */
export interface EntriesRepository {
  getAll(vehicleId: string): Promise<FuelEntry[]>
  add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry>
  update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry>
  delete(id: string): Promise<void>
}

/**
 * Fills in the fill-flag defaults when the server doesn't send them (an API
 * not yet upgraded), so existing entries are read as full-tank fills rather
 * than silently becoming "partial".
 */
function withFlagDefaults(entry: FuelEntry): FuelEntry {
  return {
    ...entry,
    isFullTank: entry.isFullTank ?? true,
    missedPrevious: entry.missedPrevious ?? false,
  }
}

class ApiEntriesRepository implements EntriesRepository {
  async getAll(vehicleId: string): Promise<FuelEntry[]> {
    const entries = await apiRequest<FuelEntry[]>("/entries", { query: { vehicleId } })
    return entries.map(withFlagDefaults)
  }

  async add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    const created = await apiRequest<FuelEntry>("/entries", { method: "POST", query: { vehicleId }, body: entry })
    return withFlagDefaults(created)
  }

  async update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    const updated = await apiRequest<FuelEntry>(`/entries/${id}`, { method: "PUT", query: { vehicleId }, body: entry })
    return withFlagDefaults(updated)
  }

  async delete(id: string): Promise<void> {
    await apiRequest<unknown>(`/entries/${id}`, { method: "DELETE" })
  }
}

export const entriesRepository: EntriesRepository = new ApiEntriesRepository()

/** Bulk-inserts entries (e.g. from CSV import) in a single request. */
export async function bulkAddEntries(entries: FuelEntryInput[], vehicleId: string): Promise<FuelEntry[]> {
  const created = await apiRequest<FuelEntry[]>("/entries/bulk", { method: "POST", query: { vehicleId }, body: { entries } })
  return created.map(withFlagDefaults)
}

/** Storage contract for vehicles. */
export interface VehiclesRepository {
  getAll(): Promise<Vehicle[]>
  add(input: VehicleInput): Promise<Vehicle>
  update(id: string, input: VehicleInput): Promise<Vehicle>
  delete(id: string): Promise<void>
}

class ApiVehiclesRepository implements VehiclesRepository {
  async getAll(): Promise<Vehicle[]> {
    return apiRequest<Vehicle[]>("/vehicles")
  }

  async add(input: VehicleInput): Promise<Vehicle> {
    return apiRequest<Vehicle>("/vehicles", { method: "POST", body: input })
  }

  async update(id: string, input: VehicleInput): Promise<Vehicle> {
    return apiRequest<Vehicle>(`/vehicles/${id}`, { method: "PUT", body: input })
  }

  async delete(id: string): Promise<void> {
    await apiRequest<unknown>(`/vehicles/${id}`, { method: "DELETE" })
  }
}

export const vehiclesRepository: VehiclesRepository = new ApiVehiclesRepository()

/** Wipes all vehicles and fuel entries. Preferences (theme, name) are untouched. */
export async function clearAllData(): Promise<void> {
  await apiRequest<unknown>("/account/reset-data", { method: "POST" })
}

/** Fill-up counts per vehicle, for the vehicle-switcher sheet — fetched on demand rather than kept live. */
export async function countEntriesByVehicle(): Promise<Record<string, number>> {
  return apiRequest<Record<string, number>>("/entries/counts")
}
