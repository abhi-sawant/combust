import { createContext, useContext } from "react"

import type { FuelEntry, FuelEntryInput } from "@/types/entry"
import type { DerivedEntry } from "@/types/stats"

export interface EntriesContextValue {
  entries: FuelEntry[]
  derivedEntries: DerivedEntry[]
  stationNames: string[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  addEntry: (input: FuelEntryInput) => Promise<void>
  updateEntry: (id: string, input: FuelEntryInput) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

export const EntriesContext = createContext<EntriesContextValue | null>(null)

export function useEntries(): EntriesContextValue {
  const context = useContext(EntriesContext)
  if (!context) {
    throw new Error("useEntries must be used within an EntriesProvider")
  }
  return context
}
