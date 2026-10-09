import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/auth-context"
import { SyncContext, type SyncContextValue } from "@/hooks/sync-context"
import { getStoredToken } from "@/lib/auth-token"
import { getLastSyncedAt, hasSynced, syncNow as runSync } from "@/lib/sync"
import { subscribeToChanges } from "@/lib/local-db"

const PERIODIC_SYNC_MS = 5 * 60 * 1000
const DEBOUNCE_MS = 2000

/**
 * Keeps local data replicated to the cloud account while one is signed in. Inert in local-only mode.
 * On the very first load of an already-signed-in device it blocks children until the first pull
 * finishes, so existing cloud data is on the device before the UI decides whether the user has any.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [initializing, setInitializing] = useState(isAuthenticated)
  // True when the first pull for this account failed, so the (empty) device data can't be trusted yet.
  const [needsFirstSync, setNeedsFirstSync] = useState(false)
  const [status, setStatus] = useState<SyncContextValue["status"]>("idle")
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const syncNow = useCallback(async () => {
    if (!getStoredToken()) return
    setStatus("syncing")
    try {
      await runSync()
      setLastSyncedAt((await getLastSyncedAt()) ?? null)
      setError(null)
      setStatus("idle")
    } catch (err) {
      // Offline or server trouble: local data is untouched, so just report it and retry later.
      setError(err instanceof Error ? err.message : "Sync failed")
      setStatus("error")
    }
  }, [])

  // Sign-in (or app start while signed in): sync immediately.
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    void (async () => {
      await syncNow()
      if (cancelled) return
      setNeedsFirstSync(!(await hasSynced()))
      setInitializing(false)
    })()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, syncNow])

  useEffect(() => {
    if (!isAuthenticated) return

    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = subscribeToChanges((source) => {
      if (source !== "local") return
      clearTimeout(timer)
      timer = setTimeout(() => void syncNow(), DEBOUNCE_MS)
    })
    const onOnline = () => void syncNow()
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncNow()
    }
    const interval = setInterval(() => void syncNow(), PERIODIC_SYNC_MS)
    window.addEventListener("online", onOnline)
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      unsubscribe()
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener("online", onOnline)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isAuthenticated, syncNow])

  const value = useMemo(() => ({ status, lastSyncedAt, error, syncNow }), [status, lastSyncedAt, error, syncNow])

  if (isAuthenticated && needsFirstSync) {
    return (
      <div className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold">Couldn&apos;t load your account data</h1>
        <p className="text-sm text-muted-foreground">
          {error ?? "Sync failed"}. Your data is safe in your account — check your connection and try again.
        </p>
        <Button
          onClick={async () => {
            await syncNow()
            setNeedsFirstSync(!(await hasSynced()))
          }}
          disabled={status === "syncing"}
        >
          {status === "syncing" ? "Retrying…" : "Retry"}
        </Button>
      </div>
    )
  }

  if (initializing && isAuthenticated) {
    return <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">Setting up offline storage…</div>
  }

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
