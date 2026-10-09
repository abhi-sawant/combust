import { Badge } from '@/components/ui/badge'
import { formatAmount, formatDate, formatKm, formatMileage, formatNumber } from '@/lib/format'
import { pipsOf, SECTOR_PIP, stationCode, type Sector } from '@/lib/sector'
import { cn } from '@/lib/utils'
import type { DerivedEntry } from '@/types/stats'

export function MileageCell({ entry, sector = 'none', average = null }: { entry: DerivedEntry; sector?: Sector; average?: number | null }) {
  if (entry.isPending) {
    return <Badge variant='outline' className='border-dashed border-muted-foreground'>Pending</Badge>
  }
  if (entry.isOdometerRegression) {
    return <Badge variant='destructive'>Odometer regressed</Badge>
  }
  if (entry.hasGap) {
    return <Badge variant='warning'>Missed fill</Badge>
  }
  if (entry.isPartial) {
    return <Badge variant='secondary'>Partial fill</Badge>
  }
  if (entry.mileage === null) {
    return <span className='text-muted-foreground'>—</span>
  }
  return (
    <span className='inline-flex flex-col items-end gap-1.5'>
      <span className='font-display font-bold'>{formatMileage(entry.mileage)}</span>
      <HeatPips mileage={entry.mileage} sector={sector} average={average} />
    </span>
  )
}

/** Five short bars that fill with how well this fill-up did against the average. */
export function HeatPips({ mileage, sector, average }: { mileage: number; sector: Sector; average: number | null }) {
  const on = pipsOf(mileage, average, sector)
  return (
    <span aria-hidden className='flex gap-[3px]'>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={cn('h-1 w-3 rounded-full', i <= on ? SECTOR_PIP[sector] : 'bg-pip-off')} />
      ))}
    </span>
  )
}

/**
 * Fill-up row shared by the Overview's "Recent fill-ups" and the mobile entries list:
 * station chip + name on the left, mileage with its heat pips on the right.
 * Callers own any surrounding card chrome, click behaviour, and row actions.
 */
export function FillupRow({ entry, sector = 'none', average = null }: { entry: DerivedEntry; sector?: Sector; average?: number | null }) {
  const hasMileage = entry.mileage !== null && !entry.isPending && !entry.isOdometerRegression && !entry.hasGap && !entry.isPartial
  return (
    <div className='flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3'>
      <span
        aria-hidden
        className='grid size-11 shrink-0 place-items-center rounded-full bg-field font-display text-xs font-bold tracking-wider text-muted-foreground'>
        {stationCode(entry.fuelStation)}
      </span>
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-[15px] font-semibold'>{entry.fuelStation}</span>
        <span className='truncate text-[13px] text-muted-foreground'>
          {formatDate(entry.date)} · {formatNumber(entry.litresFilled)} L{entry.isPartial ? ' (partial)' : ''} · {formatAmount(entry.amountPaid)}
          {entry.costPerLitre !== null ? ` · ${formatAmount(entry.costPerLitre)}/L` : ''}
        </span>
      </div>
      <div className='flex shrink-0 flex-col items-end gap-1'>
        {hasMileage ? (
          <>
            <span className='font-display text-[22px] leading-none font-bold tracking-tight'>{formatNumber(entry.mileage!)}</span>
            <HeatPips mileage={entry.mileage!} sector={sector} average={average} />
          </>
        ) : (
          <>
            <MileageCell entry={entry} />
            <span className='text-xs text-muted-foreground'>{formatKm(entry.odometerReading)}</span>
          </>
        )}
      </div>
    </div>
  )
}
