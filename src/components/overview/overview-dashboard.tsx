import { TrendingDown, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { VehicleChip } from '@/components/vehicles/vehicle-chip'
import { FillupRow } from '@/components/entries/fillup-row'
import { MileageBars, SectorLegend } from '@/components/overview/mileage-bars'
import { useEntries } from '@/hooks/entries-context'
import { computeOverallStats } from '@/lib/calculations'
import { formatAmount, formatKm, formatNumber } from '@/lib/format'
import { sectorOf } from '@/lib/sector'

interface OverviewDashboardProps {
  onAddEntry: () => void
  onImportCsv: () => void
  onViewAllEntries: () => void
  onOpenVehicle: () => void
}

const panel = 'rounded-[20px] border border-border bg-card p-4 md:p-5'
const panelTitle = 'font-display text-[25px] leading-none font-extrabold tracking-wide uppercase'

export function OverviewDashboard({ onAddEntry, onImportCsv, onViewAllEntries, onOpenVehicle }: OverviewDashboardProps) {
  const { derivedEntries, isLoading } = useEntries()
  const stats = computeOverallStats(derivedEntries)

  // Hold a lime placeholder while entries load so the empty state never flashes for existing users.
  if (isLoading && stats.entryCount === 0) {
    return <div aria-busy='true' className='h-56 animate-pulse rounded-[22px] bg-lime/60 sm:h-48' />
  }

  if (stats.entryCount === 0) {
    return (
      <div className='flex flex-col items-start gap-5 rounded-[22px] bg-lime p-6 text-lime-foreground md:p-8'>
        <h2 className='font-display text-5xl leading-[0.9] font-black uppercase md:text-6xl'>No fill-ups yet</h2>
        <p className='max-w-sm text-[15px] font-medium'>
          Log a fill-up right after you pay and Combust starts working out mileage from the second one on.
        </p>
        <div className='flex flex-wrap gap-2.5'>
          <Button size='lg' onClick={onAddEntry} className='bg-rail text-lime hover:bg-rail/85 hover:text-lime'>
            Add first entry
          </Button>
          <Button size='lg' variant='outline' onClick={onImportCsv} className='border-lime-foreground/40 hover:bg-lime-foreground/10'>
            Import from CSV
          </Button>
        </div>
      </div>
    )
  }

  const withMileage = derivedEntries.filter((e) => e.mileage !== null)
  const latest = withMileage[withMileage.length - 1]
  const previous = withMileage[withMileage.length - 2]
  const delta = latest && previous ? latest.mileage! - previous.mileage! : null
  const average = stats.averageMileage
  const bestId = stats.bestMileageEntry?.id ?? null
  const recent = [...derivedEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
  const chartEntries = withMileage.slice(-12)

  return (
    <div className='flex flex-col gap-4 md:gap-5'>
      <section
        aria-label='Summary'
        className='grid gap-5 rounded-[22px] bg-lime p-5 text-lime-foreground sm:grid-cols-[auto_1fr] sm:items-end sm:gap-x-10 sm:p-7'>
        <VehicleChip tone='lime' onClick={onOpenVehicle} className='sm:col-span-2' />
        <div>
          <h2 className='text-[15px] font-bold'>Average mileage</h2>
          <div className='mt-1.5 flex items-baseline gap-2.5 font-display'>
            <span className='text-[clamp(76px,22vw,96px)] leading-[0.82] font-black tracking-tight'>
              {average !== null ? formatNumber(average) : '—'}
            </span>
            <span className='text-[26px] font-extrabold'>km/l</span>
          </div>
          {delta !== null && Math.abs(delta) >= 0.005 && (
            <p className='mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-rail px-3 py-1.5 text-sm font-bold whitespace-nowrap text-lime'>
              {delta > 0 ? (
                <TrendingUp className='size-4' strokeWidth={2.4} />
              ) : (
                <TrendingDown className='size-4' strokeWidth={2.4} />
              )}
              {formatNumber(Math.abs(delta))} vs last fill
            </p>
          )}
        </div>
        <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-lime-foreground/20 sm:grid-cols-4 sm:gap-0 sm:overflow-visible sm:rounded-none sm:bg-transparent'>
          {[
            ['Spent', formatAmount(stats.totalAmountSpent)],
            ['Distance', formatKm(stats.totalDistanceCovered)],
            ['Litres', `${formatNumber(stats.totalLitresFilled)} L`],
            ['Fill-ups', String(stats.entryCount)],
          ].map(([label, value]) => (
            <div key={label} className='bg-lime px-3.5 py-2.5 sm:border-l-2 sm:border-lime-foreground/25 sm:py-1'>
              <dt className='text-[13px] font-semibold opacity-75'>{label}</dt>
              <dd className='font-display text-[32px] leading-[1.05] font-extrabold'>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className='grid grid-cols-[minmax(0,1fr)] gap-4 md:gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start'>
        {average !== null && chartEntries.length >= 2 && (
          <section aria-label='Mileage by fill-up' className={panel}>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-2.5'>
              <h2 className={panelTitle}>Mileage by fill-up</h2>
              <SectorLegend average={average} />
            </div>
            <MileageBars entries={chartEntries} average={average} bestId={bestId} />
          </section>
        )}

        <section aria-label='Recent fill-ups' className={panel}>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <h2 className={panelTitle}>Recent fill-ups</h2>
            <button
              type='button'
              onClick={onViewAllEntries}
              className='text-sm font-bold underline decoration-2 underline-offset-4 decoration-lime outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [html:not(.dark)_&]:decoration-foreground'>
              All entries
            </button>
          </div>
          <ol className='flex flex-col divide-y divide-border'>
            {recent.map((entry) => (
              <li key={entry.id} className='-mx-1.5'>
                <FillupRow entry={entry} sector={sectorOf(entry, average, bestId)} />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
