import { useState, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Field, FieldLabel } from './ui/field'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

type Entry = {
  id?: number
  date: string
  amountPaid: number
  odometerReading: number
  fuelFilled: number
  fuelStation: string
}

type StatisticsProps = {
  entries: Entry[]
}

function Statistics({ entries }: StatisticsProps) {
  const [selectedStation, setSelectedStation] = useState<string>('All')

  // Sort entries by date (oldest to newest)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    // return [...entries]
  }, [entries])

  console.log({ sortedEntries, entries })

  // Get unique stations
  const allStations = useMemo(() => {
    return Array.from(new Set(sortedEntries.map((entry) => entry.fuelStation)))
  }, [sortedEntries])

  console.log({ allStations })

  // Calculate efficiency, distance, and cost per km for each entry
  // Formulas:
  // - distanceTravelled = next_odometer - current_odometer
  // - costPerKm = next_amountPaid / distanceTravelled
  // - efficiency = distanceTravelled / next_fuelFilled
  // Latest entry has no values (no next entry)
  const entriesWithCalculations = useMemo(() => {
    return sortedEntries.map((entry, index) => {
      if (index === sortedEntries.length - 1) {
        // Latest entry - no calculations possible
        return {
          ...entry,
          distanceTravelled: null,
          costPerKm: null,
          efficiency: null,
        }
      }

      const nextEntry = sortedEntries[index + 1]
      const prevEntry = index > 0 ? sortedEntries[index - 1] : null
      const distanceTravelled = prevEntry ? prevEntry.odometerReading - entry.odometerReading : null
      // const costPerKm = nextEntry.amountPaid / distanceTravelled;
      const costPerKm = prevEntry && distanceTravelled ? prevEntry.amountPaid / distanceTravelled : null
      // const efficiency = distanceTravelled / nextEntry.fuelFilled;
      const efficiency = prevEntry && distanceTravelled ? distanceTravelled / prevEntry.fuelFilled : null

      return {
        ...entry,
        distanceTravelled,
        costPerKm,
        efficiency,
      }
    })
  }, [sortedEntries])

  console.log({ entriesWithCalculations })

  // Filter entries based on selected station
  const filteredEntriesWithCalculations = useMemo(() => {
    return selectedStation === 'All'
      ? entriesWithCalculations
      : entriesWithCalculations.filter((entry) => entry.fuelStation === selectedStation)
  }, [entriesWithCalculations, selectedStation])

  console.log(filteredEntriesWithCalculations)
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

  // Chart data: Spending over time
  const spendingChartData = useMemo(() => {
    return filteredEntriesWithCalculations.map((entry, index) => {
      const cumulative = filteredEntriesWithCalculations.slice(0, index + 1).reduce((sum, e) => sum + e.amountPaid, 0)

      return {
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: entry.amountPaid,
        cumulative,
      }
    })
  }, [filteredEntriesWithCalculations])

  // Chart data: Efficiency trend (excluding entries with null efficiency)
  const efficiencyChartData = useMemo(() => {
    return filteredEntriesWithCalculations
      .filter((entry) => entry.efficiency !== null)
      .map((entry) => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        efficiency: entry.efficiency as number,
      }))
  }, [filteredEntriesWithCalculations])

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

  const chartConfig = {
    amount: {
      label: 'Amount Paid',
      color: '#3b82f6', // Blue
    },
    cumulative: {
      label: 'Cumulative Spending',
      color: '#8b5cf6', // Purple
    },
    efficiency: {
      label: 'Fuel Efficiency',
      color: '#10b981', // Green
    },
    spent: {
      label: 'Total Spent',
      color: '#f59e0b', // Amber
    },
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Statistics</h2>
          <p className='text-sm text-muted-foreground mt-1'>Overview of your fuel consumption and spending</p>
        </div>
        <Field className='w-full sm:w-72'>
          <FieldLabel htmlFor='station-filter' className='sr-only'>
            Filter by Station
          </FieldLabel>
          <Select value={selectedStation} onValueChange={(value) => setSelectedStation(value || 'All')}>
            <SelectTrigger id='station-filter'>
              <SelectValue placeholder='Filter by station' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='All'>All Stations</SelectItem>
              {allStations.map((station) => (
                <SelectItem key={station} value={station}>
                  {station}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {/* Statistics Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
        <Card className='overflow-hidden gap-0 py-4'>
          <CardHeader className='pb-3'>
            <CardDescription className='text-xs font-medium'>Total Money Spent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              ₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Across all stations</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden gap-0 py-4'>
          <CardHeader className='pb-3'>
            <CardDescription className='text-xs font-medium'>Total Distance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              {stats.totalKm.toLocaleString('en-IN')} <span className='text-xl text-muted-foreground'>km</span>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Total kilometers traveled</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden gap-0 py-4 border-primary/20 bg-primary/5'>
          <CardHeader className='pb-3'>
            <CardDescription className='text-xs font-medium'>Avg Fuel Efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight text-primary'>
              {stats.avgFuelEfficiency.toFixed(2)} <span className='text-xl text-primary/70'>km/L</span>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Average mileage</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden gap-0 py-4'>
          <CardHeader className='pb-3'>
            <CardDescription className='text-xs font-medium'>Avg Cost per Kilometer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>₹{stats.avgCostPerKm.toFixed(2)}</div>
            <p className='text-xs text-muted-foreground mt-1'>Per kilometer cost</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden gap-0 py-4'>
          <CardHeader className='pb-3'>
            <CardDescription className='text-xs font-medium'>Total Fuel Filled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>
              {stats.totalFuel.toFixed(2)} <span className='text-xl text-muted-foreground'>L</span>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>Liters consumed</p>
          </CardContent>
        </Card>

        <Card className='overflow-hidden gap-0 py-4'>
          <CardHeader className='pb-3'>
            <CardDescription className='text-xs font-medium'>Avg Price per Liter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold tracking-tight'>₹{stats.avgPricePerLiter.toFixed(2)}</div>
            <p className='text-xs text-muted-foreground mt-1'>Average fuel price</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className='grid grid-cols-1 gap-6'>
        {/* Spending Over Time */}
        <Card className='overflow-hidden py-0'>
          <CardHeader className='border-b bg-muted/50 py-4'>
            <CardTitle className='text-base'>Spending Over Time</CardTitle>
            <CardDescription className='text-xs'>Amount paid per refuel and cumulative spending</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className='h-75 w-full'>
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

        {/* Fuel Efficiency Over Time */}
        <Card className='overflow-hidden py-0'>
          <CardHeader className='border-b bg-muted/50 py-4'>
            <CardTitle className='text-base'>Fuel Efficiency Trend</CardTitle>
            <CardDescription className='text-xs'>Kilometers per liter between refuels</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className='h-75 w-full'>
              <LineChart data={efficiencyChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis dataKey='date' tick={{ fontSize: 11 }} tickLine={false} interval='preserveStartEnd' />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} width={60} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type='monotone'
                  dataKey='efficiency'
                  stroke='var(--color-efficiency)'
                  strokeWidth={2.5}
                  dot={{ fill: 'var(--color-efficiency)', r: 3 }}
                  name='km/L'
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
                <ChartContainer config={chartConfig} className='h-75 w-full'>
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
                <ChartContainer config={chartConfig} className='h-75 w-full'>
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
