import { createContext, useContext } from "react"

import type { Vehicle, VehicleInput } from "@/types/vehicle"

export interface VehiclesContextValue {
  vehicles: Vehicle[]
  activeVehicleId: string | null
  activeVehicle: Vehicle | null
  isLoading: boolean
  error: string | null
  addVehicle: (input: VehicleInput) => Promise<void>
  updateVehicle: (id: string, input: VehicleInput) => Promise<void>
  deleteVehicle: (id: string) => Promise<void>
  setActiveVehicleId: (id: string) => void
}

export const VehiclesContext = createContext<VehiclesContextValue | null>(null)

export function useVehicles(): VehiclesContextValue {
  const context = useContext(VehiclesContext)
  if (!context) {
    throw new Error("useVehicles must be used within a VehiclesProvider")
  }
  return context
}
