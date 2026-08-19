import { Badge } from '@/components/ui/badge'
import { formatAmount, formatDate, formatKm, formatMileage, formatNumber } from '@/lib/format'
import type { DerivedEntry } from '@/types/stats'

export function MileageCell({ entry }: { entry: DerivedEntry }) {
  if (entry.isPending) {
    return <Badge variant='warning'>Pending</Badge>
  }
  if (entry.isOdometerRegression) {
    return <Badge variant='destructive'>Odometer regressed</Badge>
  }
  if (entry.mileage === null) {
    return <span className='text-muted-foreground'>—</span>
  }
  return <span className='font-mono font-medium'>{formatMileage(entry.mileage)}</span>
}

/**
 * Presentational fill-up row shared by the mobile entries list and the
 * Overview screen's "Recent fill-ups" — station/date/cost-strip on the
 * left, mileage (or Pending) + odometer on the right. Callers own any
 * surrounding card chrome, click behavior, and row actions.
 */
export function FillupRow({ entry }: { entry: DerivedEntry }) {
  return (
    <div className='flex flex-1 items-center gap-3 min-w-0 p-3'>
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='flex min-w-0 items-baseline gap-2'>
          <span className='truncate text-sm font-semibold'>{entry.fuelStation}</span>
          <span className='shrink-0 text-xs text-muted-foreground'>{formatDate(entry.date)}</span>
        </div>
        <div className='truncate font-mono text-xs text-muted-foreground'>
          {formatNumber(entry.litresFilled)} L · {formatAmount(entry.amountPaid)}
          {entry.costPerLitre !== null ? ` · ${formatAmount(entry.costPerLitre)}/L` : ''}
        </div>
      </div>
      <div className='flex shrink-0 flex-col items-end gap-1'>
        <MileageCell entry={entry} />
        <span className='font-mono text-[10px] text-muted-foreground'>{formatKm(entry.odometerReading)}</span>
      </div>
    </div>
  )
}
