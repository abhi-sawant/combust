import { useCallback, useEffect, useState } from "react"

import { ServicesContext, type ServicesContextValue } from "@/hooks/services-context"
import { useVehicles } from "@/hooks/vehicles-context"
import { servicesRepository } from "@/lib/db"
import { subscribeToChanges } from "@/lib/local-db"
import type { ServiceItem, ServiceItemInput } from "@/types/service"

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const { activeVehicleId } = useVehicles()
  const [services, setServices] = useState<ServiceItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!activeVehicleId) return
    try {
      setServices(await servicesRepository.getAll(activeVehicleId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load service items.")
    } finally {
      setIsLoading(false)
    }
  }, [activeVehicleId])

  useEffect(() => {
    if (!activeVehicleId) return

    let cancelled = false

    servicesRepository
      .getAll(activeVehicleId)
      .then((all) => {
        if (cancelled) return
        setServices(all)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load service items.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeVehicleId])

  useEffect(() => {
    return subscribeToChanges((source) => {
      if (source === "remote") void refresh()
    })
  }, [refresh])

  const addService = useCallback(
    async (input: ServiceItemInput) => {
      if (!activeVehicleId) return
      await servicesRepository.add(input, activeVehicleId)
      await refresh()
    },
    [refresh, activeVehicleId]
  )

  const addServices = useCallback(
    async (inputs: ServiceItemInput[]) => {
      if (!activeVehicleId || inputs.length === 0) return
      await servicesRepository.addMany(inputs, activeVehicleId)
      await refresh()
    },
    [refresh, activeVehicleId]
  )

  const updateService = useCallback(
    async (id: string, input: ServiceItemInput) => {
      await servicesRepository.update(id, input)
      await refresh()
    },
    [refresh]
  )

  const deleteService = useCallback(
    async (id: string) => {
      await servicesRepository.delete(id)
      await refresh()
    },
    [refresh]
  )

  const value: ServicesContextValue = {
    services,
    isLoading,
    error,
    addService,
    addServices,
    updateService,
    deleteService,
  }

  return <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
}
