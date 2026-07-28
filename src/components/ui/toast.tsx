import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type ToastVariant = "default" | "destructive" | "success"

type ToastInput = {
  title: string
  description?: string
  variant?: ToastVariant
}

type Toast = ToastInput & { id: string }

type ToastContextType = {
  toast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const AUTO_DISMISS_MS = 6000

function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(({ title, description, variant = "default" }: ToastInput) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, title, description, variant }])
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-in fade-in slide-in-from-bottom-2 relative rounded-lg border bg-card p-4 pr-8",
              t.variant === "destructive" && "border-destructive/40 bg-destructive/10",
              t.variant === "success" && "border-primary/30 bg-primary/5"
            )}
          >
            <div className="text-sm font-medium">{t.title}</div>
            {t.description && (
              <div className="mt-1 text-xs text-muted-foreground">{t.description}</div>
            )}
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

export { ToastProvider, useToast }
