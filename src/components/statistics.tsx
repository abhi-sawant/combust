import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { EfficiencySparkline } from './EfficiencySparkline'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { deriveLegs, parseEntryDate, type Entry } from '../types'
import { cn } from '@/lib/utils'

type StatisticsProps = {
  entries: Entry[]
}

function Statistics({ entries }: StatisticsProps) {
  const [selectedStation, setSelectedStation] = useState<string>('All')

  // Single shared selector — see src/types.ts. Entries tab reads from the
  // same function, so the two views can't disagree about the same fill-up.
  const entriesWithCalculations = useMemo(() => deriveLegs(entries), [entries])

  // Get unique stations
  const allStations = useMemo(() => {
    return Array.from(new Set(entriesWithCalculations.map((entry) => entry.fuelStation)))
  }, [entriesWithCalculations])

  // Filter entries based on selected station
  const filteredEntriesWithCalculations = useMemo(() => {
    return selectedStation === 'All'
      ? entriesWithCalculations
      : entriesWithCalculations.filter((entry) => entry.fuelStation === selectedStation)
  }, [entriesWithCalculations, selectedStation])

  // Calculate overall statistics
  const stats = useMemo(() => {
    if (filteredEntriesWithCalculations.length === 0) {
      return {
        totalSpent: 0,
        totalKm: 0,
        avgFuelEfficiency: 0,
        avgCostPerKm: 0,
        totalFuel: 0,
        avgPricePerLiter: 0,
      }
    }

    const totalSpent = filteredEntriesWithCalculations.reduce((sum, entry) => sum + entry.amountPaid, 0)
    const totalFuel = filteredEntriesWithCalculations.reduce((sum, entry) => sum + entry.fuelFilled, 0)

    // Conditional totalKm calculation
    let totalKm = 0
    if (selectedStation === 'All') {
      totalKm =
        filteredEntriesWithCalculations.length > 1
          ? filteredEntriesWithCalculations[0].odometerReading -
            filteredEntriesWithCalculations[filteredEntriesWithCalculations.length - 1].odometerReading
          : filteredEntriesWithCalculations.length === 1
            ? filteredEntriesWithCalculations[0].odometerReading
            : 0
    } else {
      totalKm = filteredEntriesWithCalculations
        .filter((e) => e.distanceTravelled !== null)
        .reduce((sum, e) => sum + (e.distanceTravelled as number), 0)
    }

    // Average efficiency = average of all individual efficiencies (excluding null)
    const validEfficiencies = filteredEntriesWithCalculations
      .filter((e) => e.efficiency !== null)
      .map((e) => e.efficiency as number)


    const avgFuelEfficiency =
      validEfficiencies.length > 0 ? validEfficiencies.reduce((sum, eff) => sum + eff, 0) / validEfficiencies.length : 0

    // Average cost per km = average of all individual cost per km (excluding null)
    const validCostPerKm = filteredEntriesWithCalculations
      .filter((e) => e.costPerKm !== null)
      .map((e) => e.costPerKm as number)

    const avgCostPerKm =
      validCostPerKm.length > 0 ? validCostPerKm.reduce((sum, cost) => sum + cost, 0) / validCostPerKm.length : 0

    const avgPricePerLiter = totalFuel > 0 ? totalSpent / totalFuel : 0

    return {
      totalSpent,
      totalKm,
      avgFuelEfficiency,
      avgCostPerKm,
      totalFuel,
      avgPricePerLiter,
    }
  }, [filteredEntriesWithCalculations, selectedStation])

  // The range (not a delta against a trailing average, the way Entries'
  // hero works) — Statistics' whole purpose is the complete picture, so its
  // hero leads with the full spread rather than a recent trend.
  const efficiencyRange = useMemo(() => {
    const values = filteredEntriesWithCalculations
      .filter((e) => e.efficiency !== null)
      .map((e) => e.efficiency as number)
    if (values.length === 0) return null
    return { min: Math.min(...values), max: Math.max(...values), count: values.length }
  }, [filteredEntriesWithCalculations])

  // filteredEntriesWithCalculations is newest-first (see deriveLegs); the
  // trend chart and the sparkline both read left-to-right as "time passing",
  // so they need the oldest fill-up first.
  const chronological = useMemo(
    () => [...filteredEntriesWithCalculations].reverse(),
    [filteredEntriesWithCalculations]
  )

  const sparklinePoints = useMemo(() => {
    return chronological
      .filter((entry) => entry.efficiency !== null)
      .map((entry) => ({ date: format(parseEntryDate(entry.date), 'MMM yy'), value: entry.efficiency as number }))
  }, [chronological])

  // Chart data: Spending over time. A running total computed once (O(n))
  // instead of re-summing the whole array at every point (O(n^2)) — the old
  // version also happened to sum in the wrong direction, since summing
  // newest-to-current on a newest-first array makes "cumulative" peak at the
  // oldest fill-up instead of the most recent one.
  const spendingChartData = useMemo(() => {
    return chronological.reduce<{ date: string; amount: number; cumulative: number }[]>((acc, entry) => {
      const previousTotal = acc.length > 0 ? acc[acc.length - 1].cumulative : 0
      acc.push({
        date: entry.date,
        amount: entry.amountPaid,
        cumulative: previousTotal + entry.amountPaid,
      })
      return acc
    }, [])
  }, [chronological])

  // Chart data: Station comparison (only when viewing all stations)
  const stationComparisonData = useMemo(() => {
    if (selectedStation !== 'All') return []

    return allStations.map((station) => {
      const stationEntries = entriesWithCalculations.filter((e) => e.fuelStation === station)

      const totalSpent = stationEntries.reduce((sum, e) => sum + e.amountPaid, 0)

      // Total distance for this station
      const totalDistance = stationEntries
        .filter((e) => e.distanceTravelled !== null)
        .reduce((sum, e) => sum + (e.distanceTravelled as number), 0)

      // Average efficiency for this station
      const validEfficiencies = stationEntries.filter((e) => e.efficiency !== null).map((e) => e.efficiency as number)

      const avgEfficiency =
        validEfficiencies.length > 0
          ? validEfficiencies.reduce((sum, eff) => sum + eff, 0) / validEfficiencies.length
          : 0

      // Average cost per km for this station
      const validCostPerKm = stationEntries.filter((e) => e.costPerKm !== null).map((e) => e.costPerKm as number)

      const avgCostPerKm =
        validCostPerKm.length > 0 ? validCostPerKm.reduce((sum, cost) => sum + cost, 0) / validCostPerKm.length : 0

      return {
        station: station.length > 12 ? station.substring(0, 12) + '...' : station,
        fullStation: station,
        spent: totalSpent,
        distance: totalDistance,
        efficiency: avgEfficiency,
        costPerKm: avgCostPerKm,
      }
    })
  }, [selectedStation, allStations, entriesWithCalculations])

  // Recharts renders an SVG with no text alternative, so a screen reader
  // announces nothing useful for any of these charts. Each one gets a
  // computed one-sentence summary, exposed as the chart's aria-label.
  const spendingChartSummary = useMemo(() => {
    if (spendingChartData.length === 0) return 'No spending data available yet.'
    const amounts = spendingChartData.map((d) => d.amount)
    const total = spendingChartData[spendingChartData.length - 1].cumulative
    return `${spendingChartData.length} fill-ups shown, ranging from ₹${Math.min(...amounts).toFixed(0)} to ₹${Math.max(...amounts).toFixed(0)} per fill-up. Cumulative spending reaches ₹${total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`
  }, [spendingChartData])

  const stationSpendingSummary = useMemo(() => {
    if (stationComparisonData.length === 0) return 'No station data available yet.'
    const top = [...stationComparisonData].sort((a, b) => b.spent - a.spent)[0]
    return `${stationComparisonData.length} stations compared. ${top.fullStation} accounts for the most spending, at ₹${top.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}.`
  }, [stationComparisonData])

  const stationEfficiencySummary = useMemo(() => {
    if (stationComparisonData.length === 0) return 'No station data available yet.'
    const best = [...stationComparisonData].sort((a, b) => b.efficiency - a.efficiency)[0]
    return `${stationComparisonData.length} stations compared. ${best.fullStation} has the best average efficiency, at ${best.efficiency.toFixed(1)} km/L.`
  }, [stationComparisonData])

  // Reads from the theme tokens in index.css (see :root / .dark) instead of
  // hardcoded hex, so charts actually follow dark mode instead of staying
  // light-mode purple regardless of theme.
  const chartConfig = {
    amount: {
      label: 'Amount Paid',
      color: 'var(--chart-2)', // rust — the app's negative/spend-tracking color
    },
    cumulative: {
      label: 'Cumulative Spending',
      color: 'var(--chart-4)', // olive — distinct from "amount" at a glance
    },
    efficiency: {
      label: 'Fuel Efficiency',
      color: 'var(--chart-1)', // instrument green — the app's one accent color
    },
    spent: {
      label: 'Total Spent',
      color: 'var(--chart-2)',
    },
  }

  return (
    <div className='space-y-6'>
      {/* Hero: average efficiency across the filtered history */}
      <Card className='overflow-hidden py-0'>
        <div className='grid md:grid-cols-[1fr_1.3fr]'>
          <div className='flex flex-col gap-3 p-5 md:border-r md:p-6'>
            <div className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              Average efficiency
              {efficiencyRange && (
                <span className='rounded-full bg-primary/10 px-2 py-0.5 font-mono text-xs normal-case tracking-normal text-primary'>
                  {efficiencyRange.count} {efficiencyRange.count === 1 ? 'tank' : 'tanks'}
                </span>
              )}
            </div>
            {efficiencyRange ? (
              <>
                <div className='flex flex-wrap items-baseline gap-2.5'>
                  <span className='font-mono text-5xl font-medium leading-none tracking-tight tabular-nums sm:text-6xl'>
                    {stats.avgFuelEfficiency.toFixed(1)}
                  </span>
                  <span className='text-lg text-muted-foreground'>km/L</span>
                </div>
                <p className='text-sm text-muted-foreground'>
                  Ranging from <span className='font-medium text-foreground'>{efficiencyRange.min.toFixed(1)}</span>{' '}
                  to <span className='font-medium text-foreground'>{efficiencyRange.max.toFixed(1)} km/L</span>
                  {selectedStation !== 'All' && <> at {selectedStation}</>}
                </p>
              </>
            ) : (
              <p className='text-sm text-muted-foreground'>
                Log a second fill-up to see an average efficiency here.
              </p>
            )}
          </div>
          <div className='flex flex-col gap-3 p-5 md:p-6'>
            <span className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              Efficiency over time
            </span>
            <EfficiencySparkline points={sparklinePoints} className='h-24' />
          </div>
        </div>
        <div className='grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-3 lg:grid-cols-5'>
          <div className='flex flex-col gap-0.5 bg-card p-3.5'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Total spent</span>
            <span className='font-mono text-xl font-medium tabular-nums'>
              ₹{stats.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className='flex flex-col gap-0.5 bg-card p-3.5'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Distance</span>
            <span className='font-mono text-xl font-medium tabular-nums'>
              {stats.totalKm.toLocaleString('en-IN')} <span className='text-sm text-muted-foreground'>km</span>
            </span>
          </div>
          <div className='flex flex-col gap-0.5 bg-card p-3.5'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Fuel filled</span>
            <span className='font-mono text-xl font-medium tabular-nums'>
              {stats.totalFuel.toFixed(1)} <span className='text-sm text-muted-foreground'>L</span>
            </span>
          </div>
          <div className='flex flex-col gap-0.5 bg-card p-3.5'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Cost per km</span>
            <span className='font-mono text-xl font-medium tabular-nums'>₹{stats.avgCostPerKm.toFixed(2)}</span>
          </div>
          <div className='col-span-2 flex flex-col gap-0.5 bg-card p-3.5 sm:col-span-1'>
            <span className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>Price per litre</span>
            <span className='font-mono text-xl font-medium tabular-nums'>₹{stats.avgPricePerLiter.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Station filter chips */}
      {allStations.length > 0 && (
        <div className='flex flex-wrap gap-1.5' role='group' aria-label='Filter by station'>
          <button
            type='button'
            onClick={() => setSelectedStation('All')}
            aria-pressed={selectedStation === 'All'}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selectedStation === 'All'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            All stations
          </button>
          {allStations.map((station) => (
            <button
              key={station}
              type='button'
              onClick={() => setSelectedStation(station)}
              aria-pressed={selectedStation === station}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selectedStation === station
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              {station}
            </button>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className='grid grid-cols-1 gap-6'>
        {/* Spending Over Time */}
        <Card className='overflow-hidden py-0'>
          <CardHeader className='border-b bg-muted/50 py-4'>
            <CardTitle className='text-base'>Spending Over Time</CardTitle>
            <CardDescription className='text-xs'>Amount paid per refuel and cumulative spending</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className='h-75 w-full' role='img' aria-label={spendingChartSummary}>
              <LineChart data={spendingChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis dataKey='date' tick={{ fontSize: 11 }} tickLine={false} interval='preserveStartEnd' />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} width={60} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type='monotone'
                  dataKey='amount'
                  stroke='var(--color-amount)'
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--color-amount)', r: 3 }}
                  name='Amount Paid'
                />
                <Line
                  type='monotone'
                  dataKey='cumulative'
                  stroke='var(--color-cumulative)'
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--color-cumulative)', r: 3 }}
                  name='Cumulative'
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Station Comparison (only shown when "All" is selected) */}
        {selectedStation === 'All' && stationComparisonData.length > 0 && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <Card className='overflow-hidden py-0'>
              <CardHeader className='border-b bg-muted/50 py-4'>
                <CardTitle className='text-base'>Spending by Station</CardTitle>
                <CardDescription className='text-xs'>Total money spent at each fuel station</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className='h-75 w-full' role='img' aria-label={stationSpendingSummary}>
                  <BarChart data={stationComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                    <XAxis
                      dataKey='station'
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      angle={-45}
                      textAnchor='end'
                      height={60}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} width={60} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey='spent' fill='var(--color-spent)' radius={[4, 4, 0, 0]} name='Total Spent (₹)' />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className='overflow-hidden py-0'>
              <CardHeader className='border-b bg-muted/50 py-4'>
                <CardTitle className='text-base'>Efficiency by Station</CardTitle>
                <CardDescription className='text-xs'>Average fuel efficiency at each station</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className='h-75 w-full' role='img' aria-label={stationEfficiencySummary}>
                  <BarChart data={stationComparisonData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                    <XAxis
                      dataKey='station'
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      angle={-45}
                      textAnchor='end'
                      height={60}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} width={60} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey='efficiency'
                      fill='var(--color-efficiency)'
                      radius={[4, 4, 0, 0]}
                      name='Efficiency (km/L)'
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export { Statistics }
