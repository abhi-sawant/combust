import { Button } from '@/components/ui/button'
import { VehicleChip } from '@/components/vehicles/vehicle-chip'
import { FillupRow } from '@/components/entries/fillup-row'
import { MileageBars } from '@/components/overview/mileage-bars'
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

const sectionTitle = 'font-display text-[22px] leading-none font-bold tracking-tight'

export function OverviewDashboard({ onAddEntry, onImportCsv, onViewAllEntries, onOpenVehicle }: OverviewDashboardProps) {
  const { derivedEntries, isLoading } = useEntries()
  const stats = computeOverallStats(derivedEntries)

  // Hold a field-coloured placeholder while entries load so the empty state never flashes for existing users.
  if (isLoading && stats.entryCount === 0) {
    return <div aria-busy='true' className='h-56 animate-pulse rounded-[32px] bg-field sm:h-48' />
  }

  if (stats.entryCount === 0) {
    return (
      <div className='flex flex-col gap-4'>
        <VehicleChip onClick={onOpenVehicle} />
        <div className='flex flex-col items-start gap-5 rounded-[32px] bg-field p-7 md:p-10'>
          <h2 className='font-display text-4xl leading-[0.95] font-extrabold tracking-tight md:text-5xl'>No fill-ups yet</h2>
          <p className='max-w-sm text-[15px] text-muted-foreground'>
            Log a fill-up right after you pay and Combust starts working out mileage from the second one on.
          </p>
          <div className='flex flex-wrap gap-2.5'>
            <Button variant='flame' size='lg' onClick={onAddEntry}>
              Add first entry
            </Button>
            <Button size='lg' variant='card' onClick={onImportCsv}>
              Import from CSV
            </Button>
          </div>
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
  const showChart = average !== null && chartEntries.length >= 2

  return (
    <div className='flex flex-col gap-3 md:gap-4'>
      <VehicleChip onClick={onOpenVehicle} className='mb-1' />

      <section
        aria-label='Summary'
        className={
          'grid gap-8 rounded-[32px] bg-field p-6 md:p-10 ' + (showChart ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-10' : '')
        }>
        <div>
          <h2 className='text-[15px] font-medium text-muted-foreground'>Average mileage</h2>
          <p className='mt-2.5 flex items-baseline gap-2.5 font-display'>
            <span className='text-[clamp(76px,22vw,96px)] leading-[0.86] font-extrabold tracking-[-0.05em]'>
              {average !== null ? formatNumber(average) : '—'}
            </span>
            <span className='text-2xl font-semibold text-muted-foreground'>km/l</span>
          </p>
          {delta !== null && Math.abs(delta) >= 0.05 && (
            <p className='mt-5 max-w-[26ch] font-display text-[17px] leading-snug font-medium'>
              Last fill-up was <span className='text-flame-text'>{formatNumber(Math.abs(delta))} {delta > 0 ? 'better' : 'lower'}</span>{' '}
              than the one before.
            </p>
          )}
        </div>
        {showChart && (
          <div>
            <div className='mb-4 flex justify-between text-[13px] font-medium text-muted-foreground'>
              <span>Last {chartEntries.length} fill-ups</span>
              {stats.bestMileageEntry && <span>Best {formatNumber(stats.bestMileageEntry.mileage!)}</span>}
            </div>
            <MileageBars entries={chartEntries} average={average} bestId={bestId} />
          </div>
        )}
      </section>

      <dl className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        {[
          ['Spent', formatAmount(stats.totalAmountSpent)],
          ['Distance', formatKm(stats.totalDistanceCovered)],
          ['Fuel', `${formatNumber(stats.totalLitresFilled)} L`],
          ['Fill-ups', String(stats.entryCount)],
        ].map(([label, value]) => (
          <div key={label} className='rounded-[22px] bg-card px-5 py-4 shadow-card'>
            <dt className='text-[13px] text-muted-foreground'>{label}</dt>
            <dd className='mt-0.5 font-display text-[26px] leading-[1.15] font-bold tracking-tight'>{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label='Recent fill-ups' className='mt-5'>
        <div className='mb-3 flex items-baseline justify-between gap-2 px-1.5'>
          <h2 className={sectionTitle}>Recent fill-ups</h2>
          <button
            type='button'
            onClick={onViewAllEntries}
            className='rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50'>
            See all
          </button>
        </div>
        <ol className='flex flex-col rounded-[28px] bg-card p-2 shadow-card'>
          {recent.map((entry) => (
            <li key={entry.id} className='flex rounded-[20px] transition-colors hover:bg-field/55'>
              <FillupRow entry={entry} sector={sectorOf(entry, average, bestId)} average={average} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
