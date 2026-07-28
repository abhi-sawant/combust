import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"

const root = createRoot(document.getElementById("root")!)

const missingEnvVars = [
  !import.meta.env.VITE_SUPABASE_URL && "VITE_SUPABASE_URL",
  !import.meta.env.VITE_SUPABASE_ANON_KEY && "VITE_SUPABASE_ANON_KEY",
].filter((name): name is string => !!name)

if (missingEnvVars.length > 0) {
  // Import App (and, transitively, lib/supabaseClient.ts) lazily so a missing
  // env var never reaches that module's throw — it fires at module-evaluation
  // time, before React renders anything, so an error boundary can't catch it.
  const { ConfigurationError } = await import("./components/ConfigurationError.tsx")
  root.render(
    <StrictMode>
      <ConfigurationError missingVars={missingEnvVars} />
    </StrictMode>
  )
} else {
  const [{ default: App }, { AuthProvider }, { ToastProvider }] = await Promise.all([
    import("./App.tsx"),
    import("./contexts/AuthContext.tsx"),
    import("./components/ui/toast.tsx"),
  ])

  root.render(
    <StrictMode>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </StrictMode>
  )
}
