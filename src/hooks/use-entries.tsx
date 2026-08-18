import { useCallback, useEffect, useMemo, useState } from "react"

import { EntriesContext, type EntriesContextValue } from "@/hooks/entries-context"
import { deriveEntries } from "@/lib/calculations"
import { entriesRepository } from "@/lib/db"
import type { FuelEntry, FuelEntryInput } from "@/types/entry"

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<FuelEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const all = await entriesRepository.getAll()
      setEntries(all)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load entries.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    entriesRepository
      .getAll()
      .then((all) => {
        if (cancelled) return
        setEntries(all)
        setError(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Failed to load entries.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const addEntry = useCallback(
    async (input: FuelEntryInput) => {
      await entriesRepository.add(input)
      await refresh()
    },
    [refresh]
  )

  const updateEntry = useCallback(
    async (id: string, input: FuelEntryInput) => {
      await entriesRepository.update(id, input)
      await refresh()
    },
    [refresh]
  )

  const deleteEntry = useCallback(
    async (id: string) => {
      await entriesRepository.delete(id)
      await refresh()
    },
    [refresh]
  )

  const derivedEntries = useMemo(() => deriveEntries(entries), [entries])

  const stationNames = useMemo(
    () => Array.from(new Set(entries.map((e) => e.fuelStation))).sort((a, b) => a.localeCompare(b)),
    [entries]
  )

  const value: EntriesContextValue = {
    entries,
    derivedEntries,
    stationNames,
    isLoading,
    error,
    refresh,
    addEntry,
    updateEntry,
    deleteEntry,
  }

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>
}
