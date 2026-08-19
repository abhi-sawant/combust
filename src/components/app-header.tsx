import { Car, ChevronDown, Fuel, Plus, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useVehicles } from "@/hooks/vehicles-context"

interface AppHeaderProps {
  onOpenImport: () => void
  onOpenVehicle: () => void
  onAddEntry: () => void
}

export function AppHeader({ onOpenImport, onOpenVehicle, onAddEntry }: AppHeaderProps) {
  const { activeVehicle } = useVehicles()

  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fuel className="size-5 text-primary" />
          <h1 className="font-heading text-lg font-semibold">Combust</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onOpenImport} aria-label="Import from CSV">
            <Upload /> <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="sm" onClick={onAddEntry} className="hidden sm:inline-flex">
            <Plus /> Add entry
          </Button>
        </div>
      </div>
      {activeVehicle && (
        <button
          type="button"
          onClick={onOpenVehicle}
          className="flex items-center gap-2 self-start rounded-full border border-border bg-card px-3 py-1.5 text-left transition-colors hover:bg-muted"
        >
          <Car className="size-4 text-primary" />
          <span className="text-[13px] font-medium">{activeVehicle.name}</span>
          {activeVehicle.plate && (
            <span className="font-mono text-xs text-muted-foreground">{activeVehicle.plate}</span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      )}
    </header>
  )
}
