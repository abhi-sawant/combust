import { useCallback, useEffect, useMemo, useState } from "react"

import { VehiclesContext, type VehiclesContextValue } from "@/hooks/vehicles-context"
import { vehiclesRepository } from "@/lib/db"
import type { Vehicle, VehicleInput } from "@/types/vehicle"

const ACTIVE_VEHICLE_KEY = "combust:active-vehicle-id"
const DEFAULT_VEHICLE_NAME = "My Vehicle"

export function VehiclesProvider({ children }: { children: React.ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setActiveVehicleId = useCallback((id: string) => {
    setActiveVehicleIdState(id)
    localStorage.setItem(ACTIVE_VEHICLE_KEY, id)
  }, [])

  const refresh = useCallback(async () => {
    const all = await vehiclesRepository.getAll()
    setVehicles(all)
    return all
  }, [])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        let all = await vehiclesRepository.getAll()
        if (all.length === 0) {
          const created = await vehiclesRepository.add({ name: DEFAULT_VEHICLE_NAME })
          all = [created]
        }
        if (cancelled) return

        setVehicles(all)
        const stored = localStorage.getItem(ACTIVE_VEHICLE_KEY)
        const activeId = stored && all.some((v) => v.id === stored) ? stored : all[0].id
        setActiveVehicleIdState(activeId)
        if (activeId !== stored) localStorage.setItem(ACTIVE_VEHICLE_KEY, activeId)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load vehicles.")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const addVehicle = useCallback(
    async (input: VehicleInput) => {
      const created = await vehiclesRepository.add(input)
      await refresh()
      setActiveVehicleId(created.id)
    },
    [refresh, setActiveVehicleId]
  )

  const updateVehicle = useCallback(
    async (id: string, input: VehicleInput) => {
      await vehiclesRepository.update(id, input)
      await refresh()
    },
    [refresh]
  )

  const deleteVehicle = useCallback(
    async (id: string) => {
      await vehiclesRepository.delete(id)
      const remaining = await refresh()
      if (activeVehicleId === id && remaining.length > 0) {
        setActiveVehicleId(remaining[0].id)
      }
    },
    [refresh, activeVehicleId, setActiveVehicleId]
  )

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) ?? null,
    [vehicles, activeVehicleId]
  )

  const value: VehiclesContextValue = {
    vehicles,
    activeVehicleId,
    activeVehicle,
    isLoading,
    error,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    setActiveVehicleId,
  }

  return <VehiclesContext.Provider value={value}>{children}</VehiclesContext.Provider>
}
