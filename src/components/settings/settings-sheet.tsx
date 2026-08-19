import { useEffect, useState } from "react"
import { Laptop, Moon, Sun, Trash2 } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ACTIVE_VEHICLE_KEY } from "@/hooks/use-vehicles"
import { useUserName } from "@/hooks/use-user-name"
import { clearAllData } from "@/lib/db"
import { cn } from "@/lib/utils"

interface SettingsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const THEME_OPTIONS = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
] as const

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { name, setName } = useUserName()
  const { theme, setTheme } = useTheme()
  const [localName, setLocalName] = useState(name)
  const [isClearing, setIsClearing] = useState(false)

  useEffect(() => {
    if (open) setLocalName(name)
  }, [open, name])

  function handleNameBlur() {
    const trimmed = localName.trim()
    if (trimmed === name) return
    setName(trimmed)
    if (trimmed) toast.success("Name updated")
  }

  async function handleClearData() {
    setIsClearing(true)
    try {
      await clearAllData()
      localStorage.removeItem(ACTIVE_VEHICLE_KEY)
      toast.success("All data cleared")
      window.location.reload()
    } catch {
      toast.error("Failed to clear data")
      setIsClearing(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="font-sans text-xl font-bold">Settings</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <Field>
            <FieldLabel htmlFor="settings-name">Your name</FieldLabel>
            <Input
              id="settings-name"
              value={localName}
              onChange={(event) => setLocalName(event.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g. Abhishek"
            />
          </Field>

          <Separator />

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">Appearance</span>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-md border p-3 text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-accent text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">Data</span>
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:bg-warning-band hover:text-warning-band-foreground"
                  />
                }
              >
                <Trash2 />
                Clear all data
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes every vehicle and fill-up entry on this device. This can&apos;t be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" disabled={isClearing} onClick={handleClearData}>
                    Clear data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
