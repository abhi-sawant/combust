import { createContext, useContext } from "react"

import type { ServiceItem, ServiceItemInput } from "@/types/service"

export interface ServicesContextValue {
  services: ServiceItem[]
  isLoading: boolean
  error: string | null
  addService: (input: ServiceItemInput) => Promise<void>
  addServices: (inputs: ServiceItemInput[]) => Promise<void>
  updateService: (id: string, input: ServiceItemInput) => Promise<void>
  deleteService: (id: string) => Promise<void>
}

export const ServicesContext = createContext<ServicesContextValue | null>(null)

export function useServices(): ServicesContextValue {
  const context = useContext(ServicesContext)
  if (!context) {
    throw new Error("useServices must be used within a ServicesProvider")
  }
  return context
}
