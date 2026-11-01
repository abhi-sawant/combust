import { Check } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useServices } from '@/hooks/services-context'
import { presetToInput, SERVICE_PRESETS } from '@/lib/service-presets'
import { cn } from '@/lib/utils'

interface PresetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function intervalText(km: number | null, months: number | null): string {
  const parts = [km !== null ? `${km.toLocaleString()} km` : null, months !== null ? `${months} mo` : null]
  return parts.filter(Boolean).join(' or ') || 'No interval'
}

/** Pick common parts to start tracking; each becomes a normal, editable item. */
export function PresetSheet({ open, onOpenChange }: PresetSheetProps) {
  const { services, addServices } = useServices()
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const available = useMemo(() => {
    const existing = new Set(services.map((s) => s.name.trim().toLowerCase()))
    return SERVICE_PRESETS.filter((p) => !existing.has(p.name.toLowerCase()))
  }, [services])

  function toggle(name: string) {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  async function handleAdd() {
    const chosen = available.filter((p) => picked.has(p.name)).map(presetToInput)
    await addServices(chosen)
    toast.success(chosen.length === 1 ? 'Item added' : `${chosen.length} items added`)
    setPicked(new Set())
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setPicked(new Set())
        onOpenChange(next)
      }}>
      <SheetContent side='bottom' className='max-h-[92svh] overflow-y-auto'>
        <SheetHeader>
          <SheetTitle className='font-sans text-xl font-bold'>Add common parts</SheetTitle>
          <SheetDescription>
            Pick what applies to this vehicle. You can edit the intervals and log last-changed details afterwards.
          </SheetDescription>
        </SheetHeader>
        <div className='flex flex-col gap-4 px-4 pb-6'>
          {available.length === 0 ? (
            <p className='py-6 text-center text-sm text-muted-foreground'>You&apos;re already tracking every preset.</p>
          ) : (
            <ul className='grid gap-1.5 sm:grid-cols-2'>
              {available.map((preset) => {
                const on = picked.has(preset.name)
                return (
                  <li key={preset.name}>
                    <button
                      type='button'
                      aria-pressed={on}
                      onClick={() => toggle(preset.name)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        on ? 'border-flame bg-field' : 'border-border hover:bg-accent'
                      )}>
                      <span
                        aria-hidden
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-full border',
                          on ? 'border-flame bg-flame text-flame-foreground' : 'border-border'
                        )}>
                        {on && <Check className='size-3.5' strokeWidth={3} />}
                      </span>
                      <span className='flex min-w-0 flex-col'>
                        <span className='truncate text-[15px] font-semibold'>{preset.name}</span>
                        <span className='text-[13px] text-muted-foreground'>
                          Every {intervalText(preset.intervalKm, preset.intervalMonths)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='button' disabled={picked.size === 0} onClick={handleAdd}>
              {picked.size === 0 ? 'Add selected' : `Add ${picked.size} selected`}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
