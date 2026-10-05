import { Badge } from '@/components/ui/badge'
import { formatAmount, formatDate, formatKm, formatMileage, formatNumber } from '@/lib/format'
import { SECTOR_BAR, SECTOR_TEXT, stationCode, type Sector } from '@/lib/sector'
import { cn } from '@/lib/utils'
import type { DerivedEntry } from '@/types/stats'

export function MileageCell({ entry, sector = 'none' }: { entry: DerivedEntry; sector?: Sector }) {
  if (entry.isPending) {
    return <Badge variant='outline' className='border-dashed border-muted-foreground'>Pending</Badge>
  }
  if (entry.isOdometerRegression) {
    return <Badge variant='destructive'>Odometer regressed</Badge>
  }
  if (entry.mileage === null) {
    return <span className='text-muted-foreground'>—</span>
  }
  return <span className={cn('font-bold', SECTOR_TEXT[sector])}>{formatMileage(entry.mileage)}</span>
}

/**
 * Timing-tower row shared by the Overview's "Recent fill-ups" and the mobile entries list:
 * sector chip + station code on the left, mileage in its sector colour on the right.
 * Callers own any surrounding card chrome, click behaviour, and row actions.
 */
export function FillupRow({ entry, sector = 'none' }: { entry: DerivedEntry; sector?: Sector }) {
  return (
    <div className='flex min-w-0 flex-1 items-center gap-3 p-3.5'>
      <span aria-hidden className={cn('w-1.5 self-stretch rounded-[3px]', SECTOR_BAR[sector])} />
      <span className='w-[3ch] shrink-0 font-display text-[26px] leading-none font-black tracking-wider'>
        {stationCode(entry.fuelStation)}
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <span className='truncate text-[15px] font-bold'>{entry.fuelStation}</span>
        <span className='truncate text-[13px] text-muted-foreground'>
          {formatDate(entry.date)} · {formatNumber(entry.litresFilled)} L · {formatAmount(entry.amountPaid)}
          {entry.costPerLitre !== null ? ` · ${formatAmount(entry.costPerLitre)}/L` : ''}
        </span>
      </div>
      <div className='flex shrink-0 flex-col items-end gap-0.5'>
        {entry.mileage !== null && !entry.isPending && !entry.isOdometerRegression ? (
          <span className={cn('font-display text-[30px] leading-none font-extrabold', SECTOR_TEXT[sector])}>
            {formatNumber(entry.mileage)}
          </span>
        ) : (
          <MileageCell entry={entry} />
        )}
        <span className='text-xs text-muted-foreground'>{formatKm(entry.odometerReading)}</span>
      </div>
    </div>
  )
}
