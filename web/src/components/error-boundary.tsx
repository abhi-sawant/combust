import { Component, type ErrorInfo, type ReactNode } from "react"

import { Button } from "@/components/ui/button"

/** Set right before a forced reload so we don't reload-loop if the chunk is still missing afterwards. */
export const CHUNK_RELOAD_FLAG = "combust:chunk-reload"

const CHUNK_ERROR_PATTERN =
  /dynamically imported module|Importing a module script failed|Loading chunk/i

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Stale service-worker/CDN caches mean a lazy-loaded chunk (e.g. Trends,
 * which pulls in recharts) can 404 after a new deploy until the tab
 * reloads. Without this boundary that throw was uncaught and blanked the
 * whole app instead of just the tab that failed to load.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Caught render error:", error, info.componentStack)

    if (CHUNK_ERROR_PATTERN.test(error.message) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1")
      window.location.reload()
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
          <p>Something went wrong loading this tab.</p>
          <Button size="sm" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
