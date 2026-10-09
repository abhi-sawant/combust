import { sectorOf } from '@/lib/sector'
import { formatDate, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { DerivedEntry } from '@/types/stats'

interface MileageBarsProps {
  /** Entries with a mileage, oldest → newest. */
  entries: DerivedEntry[]
  average: number
  bestId: string | null
}

/**
 * One pill per fill-up on the hero field. The best fill glows in the flame gradient;
 * a dot at the top of each pill says above average (amber) or below (grey).
 */
export function MileageBars({ entries, average, bestId }: MileageBarsProps) {
  const values = entries.map((e) => e.mileage!)
  const lo = Math.min(...values) * 0.88
  const hi = Math.max(...values)
  const MIN = 26
  const MAX = 160
  const px = (m: number) => Math.round(MIN + ((m - lo) / Math.max(hi - lo, 0.01)) * (MAX - MIN))

  return (
    <div
      className='flex h-[190px] items-end gap-1.5 md:gap-2'
      role='img'
      aria-label={`Mileage of the last ${entries.length} fill-ups against the ${formatNumber(average)} average`}>
      {entries.map((e, i) => {
        const sector = sectorOf(e, average, bestId)
        const best = sector === 'best'
        return (
          <div key={e.id} className='group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2'>
            <span
              className={cn(
                'pointer-events-none absolute text-[11px] font-semibold whitespace-nowrap text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100',
                best && 'opacity-100'
              )}
              style={{ bottom: px(e.mileage!) + 34 }}>
              {formatNumber(e.mileage!, 1)}
            </span>
            <div
              className={cn(
                'relative w-full max-w-[26px] origin-bottom rounded-full shadow-card transition-colors motion-safe:animate-[bar-grow_0.9s_cubic-bezier(0.22,1,0.36,1)_both]',
                best ? 'bg-linear-to-b from-flame-2 to-flame' : 'bg-card group-hover:bg-flame-2'
              )}
              style={{ height: px(e.mileage!), animationDelay: `${i * 40}ms` }}>
              <i
                className={cn(
                  'absolute top-[5px] left-1/2 size-2 -translate-x-1/2 rounded-full',
                  best ? 'bg-flame-foreground' : sector === 'up' ? 'bg-flame-2' : 'bg-muted-foreground/60'
                )}
              />
            </div>
            <span className={cn('text-[10.5px] whitespace-nowrap text-muted-foreground', i % 2 === 1 && 'max-md:hidden')}>
              {formatDate(e.date).replace(/ \d{4}$/, '').split(' ').slice(-1)[0]}
            </span>
          </div>
        )
      })}
    </div>
  )
}
