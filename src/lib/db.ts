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

class ApiEntriesRepository implements EntriesRepository {
  async getAll(vehicleId: string): Promise<FuelEntry[]> {
    return apiRequest<FuelEntry[]>("/entries", { query: { vehicleId } })
  }

  async add(entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    return apiRequest<FuelEntry>("/entries", { method: "POST", query: { vehicleId }, body: entry })
  }

  async update(id: string, entry: FuelEntryInput, vehicleId: string): Promise<FuelEntry> {
    return apiRequest<FuelEntry>(`/entries/${id}`, { method: "PUT", query: { vehicleId }, body: entry })
  }

  async delete(id: string): Promise<void> {
    await apiRequest<unknown>(`/entries/${id}`, { method: "DELETE" })
  }
}

export const entriesRepository: EntriesRepository = new ApiEntriesRepository()

/** Bulk-inserts entries (e.g. from CSV import) in a single request. */
export async function bulkAddEntries(entries: FuelEntryInput[], vehicleId: string): Promise<FuelEntry[]> {
  return apiRequest<FuelEntry[]>("/entries/bulk", { method: "POST", query: { vehicleId }, body: { entries } })
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
