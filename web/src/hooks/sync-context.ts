import { createContext, useContext } from "react"

export interface SyncContextValue {
  status: "idle" | "syncing" | "error"
  lastSyncedAt: number | null
  error: string | null
  syncNow: () => Promise<void>
}

export const SyncContext = createContext<SyncContextValue | null>(null)

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) throw new Error("useSync must be used within a SyncProvider")
  return context
}
