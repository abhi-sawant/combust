import { sectorOf, SECTOR_BAR } from '@/lib/sector'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DerivedEntry } from '@/types/stats'

interface MileageBarsProps {
  /** Entries with a mileage, oldest → newest. */
  entries: DerivedEntry[]
  average: number
  bestId: string | null
}

/** One bar per fill-up, coloured by timing-board sector, with the average as a dashed line. */
export function MileageBars({ entries, average, bestId }: MileageBarsProps) {
  const values = entries.map((e) => e.mileage!)
  const lo = Math.floor(Math.min(...values, average) * 0.8)
  const hi = Math.ceil(Math.max(...values, average) * 1.08)
  const pct = (m: number) => ((m - lo) / (hi - lo)) * 100

  return (
    <div
      className='relative h-[270px] md:h-[310px]'
      role='img'
      aria-label={`Mileage of the last ${entries.length} fill-ups against the ${formatNumber(average)} average`}>
      <div className='absolute inset-0 bottom-6 flex items-end gap-1.5'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 z-[2] border-t-2 border-dashed border-foreground'
          style={{ bottom: `${pct(average)}%` }}
        />
        {entries.map((e, i) => {
          const sector = sectorOf(e, average, bestId)
          return (
            <div key={e.id} className='relative flex h-full min-w-0 flex-1 flex-col items-stretch justify-end'>
              <span className='relative z-[3] mb-1 self-center rounded-[3px] bg-card px-[3px] text-[11px] font-bold'>
                {formatNumber(e.mileage!, 1)}
              </span>
              <div
                className={cn(
                  'origin-bottom rounded-t-md rounded-b-[2px] motion-safe:animate-[bar-grow_0.7s_cubic-bezier(0.16,1,0.3,1)_both]',
                  SECTOR_BAR[sector]
                )}
                style={{ height: `${pct(e.mileage!)}%`, animationDelay: `${i * 40}ms` }}
              />
              <span
                className={cn(
                  'absolute bottom-[-24px] left-1/2 -translate-x-1/2 text-[10px] font-semibold whitespace-nowrap text-muted-foreground',
                  i % 2 === 1 && 'max-md:hidden'
                )}>
                {formatDate(e.date).replace(/ \d{4}$/, '')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SectorLegend({ average }: { average: number }) {
  const item = 'inline-flex items-center gap-1.5'
  return (
    <ul className='flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] font-semibold text-muted-foreground'>
      <li className={item}>
        <i className='size-[9px] rounded-[3px] bg-bar-best' />
        Best
      </li>
      <li className={item}>
        <i className='size-[9px] rounded-[3px] bg-bar-up' />
        Above avg
      </li>
      <li className={item}>
        <i className='size-[9px] rounded-[3px] bg-bar-down' />
        Below avg
      </li>
      <li className={item}>
        <i className='w-4 border-t-2 border-dashed border-foreground' />
        Avg {formatNumber(average)}
      </li>
    </ul>
  )
}
