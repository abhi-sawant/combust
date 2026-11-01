import { useState } from 'react'
import { Check, ListPlus, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PresetSheet } from '@/components/service/preset-sheet'
import { StatusBadge } from '@/components/service/service-row'
import { ServiceSheet } from '@/components/service/service-sheet'
import { useServices } from '@/hooks/services-context'
import { useServiceRows } from '@/hooks/use-service-rows'
import { formatKm } from '@/lib/format'
import { describeLastChange, describeRemaining } from '@/lib/service-format'
import type { ServiceItem } from '@/types/service'

export function ServiceList() {
  const { isLoading, updateService } = useServices()
  const { rows, currentOdometer, today } = useServiceRows()
  const [adding, setAdding] = useState(false)
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState<ServiceItem | null>(null)

  async function markChanged(item: ServiceItem) {
    await updateService(item.id, {
      name: item.name,
      intervalKm: item.intervalKm,
      intervalMonths: item.intervalMonths,
      notes: item.notes,
      lastChangedDate: today,
      lastChangedOdometer: currentOdometer ?? item.lastChangedOdometer,
    })
    toast.success(`${item.name} marked as changed`)
  }

  if (isLoading && rows.length === 0) return null

  return (
    <>
      <div className='flex flex-wrap items-center justify-between gap-2 px-1'>
        <div>
          <h2 className='font-display text-[22px] leading-none font-bold tracking-tight'>Service</h2>
          <p className='mt-1.5 text-[13px] text-muted-foreground'>
            {currentOdometer !== null ? `Odometer ${formatKm(currentOdometer)} (from your latest fill-up)` : 'Add a fill-up to track by distance'}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='card' onClick={() => setPicking(true)}>
            <ListPlus /> Presets
          </Button>
          <Button variant='flame' onClick={() => setAdding(true)}>
            <Plus strokeWidth={2.4} /> Add item
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-4 py-10 text-center'>
            <p className='max-w-sm text-sm text-muted-foreground'>
              Track oil changes, filters, brake pads, tyres and more. Log when each was last changed and Combust tells
              you when it&apos;s due.
            </p>
            <Button variant='flame' onClick={() => setPicking(true)}>
              Add common parts
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className='flex flex-col gap-2 rounded-[28px] bg-card p-2 shadow-card'>
          {rows.map(({ item, status }) => (
            <li key={item.id} className='flex flex-col gap-2 rounded-[20px] px-4 py-3'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex min-w-0 flex-col'>
                  <span className='truncate text-[15px] font-semibold'>{item.name}</span>
                  <span className='text-[13px] text-muted-foreground'>{describeLastChange(item)}</span>
                </div>
                <StatusBadge status={status} />
              </div>
              {status.status !== 'unknown' && (
                <p className='text-[13px] font-medium'>
                  {describeRemaining(status)}
                  {status.nextDueOdometer !== null && (
                    <span className='font-normal text-muted-foreground'> · next at {formatKm(status.nextDueOdometer)}</span>
                  )}
                </p>
              )}
              {item.notes && <p className='text-[13px] text-muted-foreground'>{item.notes}</p>}
              <div className='flex gap-1.5'>
                <Button variant='outline' size='sm' onClick={() => markChanged(item)}>
                  <Check /> Changed today
                </Button>
                <Button variant='ghost' size='sm' aria-label={`Edit ${item.name}`} onClick={() => setEditing(item)}>
                  <Pencil /> Edit
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ServiceSheet open={adding} onOpenChange={setAdding} />
      <ServiceSheet
        item={editing ?? undefined}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <PresetSheet open={picking} onOpenChange={setPicking} />
    </>
  )
}
