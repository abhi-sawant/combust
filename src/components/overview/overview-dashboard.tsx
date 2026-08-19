import { Fuel, TrendingDown, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FillupRow } from '@/components/entries/fillup-row'
import { Sparkline } from '@/components/overview/sparkline'
import { useEntries } from '@/hooks/entries-context'
import { computeMileageTrend, computeOverallStats } from '@/lib/calculations'
import { formatAmount, formatKm, formatNumber } from '@/lib/format'

interface OverviewDashboardProps {
  onAddEntry: () => void
  onImportCsv: () => void
  onViewAllEntries: () => void
}

export function OverviewDashboard({ onAddEntry, onImportCsv, onViewAllEntries }: OverviewDashboardProps) {
  const { derivedEntries } = useEntries()
  const stats = computeOverallStats(derivedEntries)

  if (stats.entryCount === 0) {
    return (
      <div className='flex flex-col items-center gap-3.5 pt-16 text-center'>
        <div className='grid size-16 place-items-center rounded-md bg-accent'>
          <Fuel className='size-7 text-primary' />
        </div>
        <h2 className='font-serif text-xl font-bold'>No fill-ups yet</h2>
        <p className='max-w-64 text-[13.5px] text-muted-foreground'>
          Log a fill-up right after you pay and Combust starts working out mileage from the second one on.
        </p>
        <div className='mt-1.5 flex w-full max-w-64 flex-col gap-2.5'>
          <Button onClick={onAddEntry}>Add first entry</Button>
          <Button variant='outline' onClick={onImportCsv}>
            Import from CSV
          </Button>
        </div>
      </div>
    )
  }

  const trend = computeMileageTrend(derivedEntries)
  const sparkValues = derivedEntries
    .filter((e) => e.mileage !== null)
    .slice(-14)
    .map((e) => e.mileage!)
  const recent = [...derivedEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <p className='text-[10.5px] font-medium tracking-[0.16em] text-muted-foreground uppercase'>Average mileage</p>
        <div className='mt-3 flex items-baseline gap-2'>
          <span className='font-serif text-6xl leading-[0.85] font-bold tracking-tight'>
            {stats.averageMileage !== null ? stats.averageMileage.toFixed(2) : '—'}
          </span>
          <span className='text-sm font-medium text-muted-foreground'>km/l</span>
        </div>
        <div className='mt-3 flex items-center gap-2.5'>
          {trend && trend.direction !== 'flat' && (
            <span className='inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-medium text-accent-foreground'>
              {trend.direction === 'up' ? <TrendingUp className='size-3' /> : <TrendingDown className='size-3' />}
              {trend.ratio.toFixed(2)} vs last fill
            </span>
          )}
          <span className='text-xs text-muted-foreground'>{stats.entryCount} fill-ups logged</span>
        </div>
        {sparkValues.length >= 2 && <Sparkline values={sparkValues} />}
      </div>

      <div className='grid grid-cols-3 gap-2.5'>
        <Card size='sm'>
          <CardContent className='flex flex-col gap-2'>
            <span className='text-[9.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase'>Spent</span>
            <span className='font-mono text-[15px] font-medium'>{formatAmount(stats.totalAmountSpent)}</span>
          </CardContent>
        </Card>
        <Card size='sm'>
          <CardContent className='flex flex-col gap-2'>
            <span className='text-[9.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase'>Distance</span>
            <span className='font-mono text-[15px] font-medium'>{formatKm(stats.totalDistanceCovered)}</span>
          </CardContent>
        </Card>
        <Card size='sm'>
          <CardContent className='flex flex-col gap-2'>
            <span className='text-[9.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase'>Litres</span>
            <span className='font-mono text-[15px] font-medium'>{formatNumber(stats.totalLitresFilled)}</span>
          </CardContent>
        </Card>
      </div>

      <div className='flex flex-col gap-3'>
        <div className='flex items-baseline justify-between'>
          <h2 className='font-serif text-lg font-semibold'>Recent fill-ups</h2>
          <button
            type='button'
            onClick={onViewAllEntries}
            className='text-[12.5px] font-medium text-primary hover:underline'>
            All entries
          </button>
        </div>
        <div className='flex flex-col gap-2.5'>
          {recent.map((entry) => (
            <div
              key={entry.id}
              className='flex items-center gap-3 rounded-md border border-border bg-card p-3.5 shadow-card'>
              <FillupRow entry={entry} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
