import { sectorOf } from '@/lib/sector'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DerivedEntry } from '@/types/stats'
import { format, parseISO } from 'date-fns'

interface MileageBarsProps {
  /** Entries with a mileage, oldest → newest. */
  entries: DerivedEntry[]
  average: number
  bestId: string | null
}

const PLOT = 132 // px of bar area; the tallest bar fills it

/**
 * One pill per fill-up on the hero field. Bars share a zero baseline and are scaled
 * linearly, so height is proportional to km/l. Every bar prints its exact value; a dashed
 * line marks the average. The best fill glows in the flame gradient.
 */
export function MileageBars({ entries, average, bestId }: MileageBarsProps) {
  const max = Math.max(...entries.map((e) => e.mileage!), average)
  const px = (m: number) => Math.max(8, Math.round((m / max) * PLOT))

  return (
    <div
      role='img'
      aria-label={`Mileage of the last ${entries.length} fill-ups, ${entries
        .map((e) => formatNumber(e.mileage!, 1))
        .join(', ')} km/l, against the ${formatNumber(average)} average`}>
      <div className='relative flex items-end gap-1 md:gap-2'>
        <div
          aria-hidden
          className='pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-foreground/35'
          style={{ bottom: 18 + px(average) }}
        />
        {entries.map((e, i) => {
          const sector = sectorOf(e, average, bestId)
          const best = sector === 'best'
          const prev = entries[i - 1]
          const d = parseISO(e.date)
          const newMonth = !prev || format(parseISO(prev.date), 'MMM yyyy') !== format(d, 'MMM yyyy')
          return (
            <div key={e.id} className='flex min-w-0 flex-1 flex-col items-center justify-end'>
              <span
                className={cn(
                  'mb-1.5 text-[10.5px] leading-none font-semibold tracking-tight tabular-nums md:text-xs',
                  best ? 'text-flame-text' : 'text-foreground'
                )}>
                {formatNumber(e.mileage!, 1)}
              </span>
              <div
                className={cn(
                  'w-full max-w-[26px] origin-bottom rounded-full shadow-card motion-safe:animate-[bar-grow_0.9s_cubic-bezier(0.22,1,0.36,1)_both]',
                  best ? 'bg-linear-to-b from-flame-2 to-flame' : sector === 'up' ? 'bg-flame-2' : 'bg-card'
                )}
                style={{ height: px(e.mileage!), animationDelay: `${i * 40}ms` }}
              />
              <span className='mt-1.5 flex h-[12px] flex-col items-center text-[10px] leading-none whitespace-nowrap text-muted-foreground tabular-nums'>
                {newMonth ? format(d, 'MMM') : format(d, 'd')}
              </span>
            </div>
          )
        })}
      </div>
      <p className='mt-3 flex items-center gap-2 text-[11px] text-muted-foreground'>
        <span aria-hidden className='w-4 border-t border-dashed border-foreground/50' />
        Average {formatNumber(average)} km/l
        <span className='ml-auto'>Bars start at 0</span>
      </p>
    </div>
  )
}
