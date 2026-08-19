import { useEffect, useState } from 'react'
import { Check, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useVehicles } from '@/hooks/vehicles-context'
import { countEntriesByVehicle } from '@/lib/db'
import { cn } from '@/lib/utils'

interface VehicleSwitcherSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VehicleSwitcherSheet({ open, onOpenChange }: VehicleSwitcherSheetProps) {
  const { vehicles, activeVehicleId, setActiveVehicleId, addVehicle } = useVehicles()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')

  useEffect(() => {
    if (!open) return
    void countEntriesByVehicle().then(setCounts)
  }, [open])

  function resetAddForm() {
    setIsAdding(false)
    setName('')
    setPlate('')
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetAddForm()
    onOpenChange(next)
  }

  async function handleAdd() {
    const trimmedName = name.trim()
    if (!trimmedName) return
    await addVehicle({ name: trimmedName, plate: plate.trim() || undefined })
    resetAddForm()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side='bottom'>
        <SheetHeader>
          <SheetTitle className='font-sans text-xl font-bold'>Vehicle</SheetTitle>
        </SheetHeader>
        <div className='flex flex-col gap-2.5 px-4 pb-6'>
          {vehicles.map((vehicle) => {
            const active = vehicle.id === activeVehicleId
            return (
              <button
                key={vehicle.id}
                type='button'
                onClick={() => {
                  setActiveVehicleId(vehicle.id)
                  onOpenChange(false)
                }}
                className={cn(
                  'flex items-center gap-3 rounded-md border p-3.5 text-left transition-colors',
                  active ? 'border-primary bg-accent' : 'border-border bg-background hover:bg-muted',
                )}>
                <div className='flex flex-1 flex-col gap-1'>
                  <span className='text-sm font-semibold'>{vehicle.name}</span>
                  <span className='font-mono text-xs text-muted-foreground'>
                    {vehicle.plate ? `${vehicle.plate} · ` : ''}
                    {counts[vehicle.id] ?? 0} fill-ups
                  </span>
                </div>
                {active && <Check className='size-[18px] shrink-0 text-primary' />}
              </button>
            )
          })}

          {isAdding ? (
            <div className='flex flex-col gap-3 rounded-md border border-border p-3.5'>
              <Field>
                <FieldLabel htmlFor='vehicle-name'>Name</FieldLabel>
                <Input
                  id='vehicle-name'
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder='e.g. Honda Activa 6G'
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='vehicle-plate'>Plate (optional)</FieldLabel>
                <Input
                  id='vehicle-plate'
                  value={plate}
                  onChange={(event) => setPlate(event.target.value)}
                  placeholder='e.g. GJ 06 KL 4412'
                />
              </Field>
              <div className='flex gap-2'>
                <Button type='button' variant='outline' className='flex-1' onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button type='button' className='flex-1' onClick={handleAdd} disabled={!name.trim()}>
                  Add
                </Button>
              </div>
            </div>
          ) : (
            <button
              type='button'
              onClick={() => setIsAdding(true)}
              className='flex h-12 items-center justify-center gap-2 rounded-md border border-dashed border-border text-[13.5px] font-medium text-primary transition-colors hover:bg-accent'>
              <Plus className='size-[15px]' />
              Add a vehicle
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
