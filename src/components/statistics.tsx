import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Field, FieldLabel } from './ui/field';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from './ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

type Entry = {
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

type StatisticsProps = {
  entries: Entry[];
};

function Statistics({ entries }: StatisticsProps) {
  const [selectedStation, setSelectedStation] = useState<string>('all');
  
  // Sort entries by date (oldest to newest)
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries]);

  // Get unique stations
  const allStations = useMemo(() => {
    return Array.from(new Set(sortedEntries.map((entry) => entry.fuelStation)));
  }, [sortedEntries]);

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
          efficiency: null 
        };
      }
      
      const nextEntry = sortedEntries[index + 1];
      const distanceTravelled = nextEntry.odometerReading - entry.odometerReading;
      const costPerKm = nextEntry.amountPaid / distanceTravelled;
      const efficiency = distanceTravelled / nextEntry.fuelFilled;
      
      return { 
        ...entry, 
        distanceTravelled,
        costPerKm,
        efficiency 
      };
    });
  }, [sortedEntries]);

  // Filter entries based on selected station
  const filteredEntriesWithCalculations = useMemo(() => {
    return selectedStation === 'all' 
      ? entriesWithCalculations 
      : entriesWithCalculations.filter((entry) => entry.fuelStation === selectedStation);
  }, [entriesWithCalculations, selectedStation]);

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
      };
    }

    const totalSpent = filteredEntriesWithCalculations.reduce((sum, entry) => sum + entry.amountPaid, 0);
    const totalFuel = filteredEntriesWithCalculations.reduce((sum, entry) => sum + entry.fuelFilled, 0);
    
    // Total kilometers = sum of individual distance travelled (excluding null)
    const totalKm = filteredEntriesWithCalculations
      .filter(e => e.distanceTravelled !== null)
      .reduce((sum, e) => sum + (e.distanceTravelled as number), 0);
    
    // Average efficiency = average of all individual efficiencies (excluding null)
    const validEfficiencies = filteredEntriesWithCalculations
      .filter(e => e.efficiency !== null)
      .map(e => e.efficiency as number);
    
    const avgFuelEfficiency = validEfficiencies.length > 0
      ? validEfficiencies.reduce((sum, eff) => sum + eff, 0) / validEfficiencies.length
      : 0;
    
    // Average cost per km = average of all individual cost per km (excluding null)
    const validCostPerKm = filteredEntriesWithCalculations
      .filter(e => e.costPerKm !== null)
      .map(e => e.costPerKm as number);
    
    const avgCostPerKm = validCostPerKm.length > 0
      ? validCostPerKm.reduce((sum, cost) => sum + cost, 0) / validCostPerKm.length
      : 0;
    
    const avgPricePerLiter = totalFuel > 0 ? totalSpent / totalFuel : 0;

    return {
      totalSpent,
      totalKm,
      avgFuelEfficiency,
      avgCostPerKm,
      totalFuel,
      avgPricePerLiter,
    };
  }, [filteredEntriesWithCalculations]);

  // Chart data: Spending over time
  const spendingChartData = useMemo(() => {
    return filteredEntriesWithCalculations.map((entry, index) => {
      const cumulative = filteredEntriesWithCalculations
        .slice(0, index + 1)
        .reduce((sum, e) => sum + e.amountPaid, 0);
      
      return {
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: entry.amountPaid,
        cumulative,
      };
    });
  }, [filteredEntriesWithCalculations]);

  // Chart data: Efficiency trend (excluding entries with null efficiency)
  const efficiencyChartData = useMemo(() => {
    return filteredEntriesWithCalculations
      .filter(entry => entry.efficiency !== null)
      .map((entry) => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        efficiency: entry.efficiency as number,
      }));
  }, [filteredEntriesWithCalculations]);

  // Chart data: Station comparison (only when viewing all stations)
  const stationComparisonData = useMemo(() => {
    if (selectedStation !== 'all') return [];
    
    return allStations.map((station) => {
      const stationEntries = entriesWithCalculations.filter(e => e.fuelStation === station);
      
      const totalSpent = stationEntries.reduce((sum, e) => sum + e.amountPaid, 0);
      
      // Total distance for this station
      const totalDistance = stationEntries
        .filter(e => e.distanceTravelled !== null)
        .reduce((sum, e) => sum + (e.distanceTravelled as number), 0);
      
      // Average efficiency for this station
      const validEfficiencies = stationEntries
        .filter(e => e.efficiency !== null)
        .map(e => e.efficiency as number);
      
      const avgEfficiency = validEfficiencies.length > 0
        ? validEfficiencies.reduce((sum, eff) => sum + eff, 0) / validEfficiencies.length
        : 0;
      
      // Average cost per km for this station
      const validCostPerKm = stationEntries
        .filter(e => e.costPerKm !== null)
        .map(e => e.costPerKm as number);
      
      const avgCostPerKm = validCostPerKm.length > 0
        ? validCostPerKm.reduce((sum, cost) => sum + cost, 0) / validCostPerKm.length
        : 0;
      
      return {
        station: station.length > 15 ? station.substring(0, 15) + '...' : station,
        spent: totalSpent,
        distance: totalDistance,
        efficiency: avgEfficiency,
        costPerKm: avgCostPerKm,
      };
    });
  }, [selectedStation, allStations, entriesWithCalculations]);

  const chartConfig = {
    amount: {
      label: "Amount Paid",
      color: "hsl(var(--chart-1))",
    },
    cumulative: {
      label: "Cumulative Spending",
      color: "hsl(var(--chart-2))",
    },
    efficiency: {
      label: "Fuel Efficiency",
      color: "hsl(var(--chart-3))",
    },
    spent: {
      label: "Total Spent",
      color: "hsl(var(--chart-4))",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Statistics</h2>
          <p className="text-sm text-muted-foreground mt-1">Overview of your fuel consumption and spending</p>
        </div>
        <Field className="w-full sm:w-72">
          <FieldLabel htmlFor="station-filter" className="sr-only">Filter by Station</FieldLabel>
          <Select value={selectedStation} onValueChange={(value) => setSelectedStation(value || 'all')}>
            <SelectTrigger id="station-filter">
              <SelectValue placeholder="Filter by station" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">Total Money Spent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all stations</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">Total Distance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalKm.toLocaleString('en-IN')} <span className="text-xl text-muted-foreground">km</span></div>
            <p className="text-xs text-muted-foreground mt-1">Total kilometers traveled</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">Avg Fuel Efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-primary">
              {stats.avgFuelEfficiency.toFixed(2)} <span className="text-xl text-primary/70">km/L</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average mileage</p>
          </CardContent>
        </Card>
        
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">Avg Cost per Kilometer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">₹{stats.avgCostPerKm.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per kilometer cost</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">Total Fuel Filled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{stats.totalFuel.toFixed(2)} <span className="text-xl text-muted-foreground">L</span></div>
            <p className="text-xs text-muted-foreground mt-1">Liters consumed</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium">Avg Price per Liter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">₹{stats.avgPricePerLiter.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average fuel price</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Over Time */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="text-base">Spending Over Time</CardTitle>
            <CardDescription className="text-xs">Amount paid per refuel and cumulative spending</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="h-80">
              <LineChart data={spendingChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--color-amount)" 
                  strokeWidth={2.5}
                  dot={{ fill: "var(--color-amount)", r: 4 }}
                  name="Amount Paid"
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="var(--color-cumulative)" 
                  strokeWidth={2.5}
                  dot={{ fill: "var(--color-cumulative)", r: 4 }}
                  name="Cumulative"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Fuel Efficiency Over Time */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/50">
            <CardTitle className="text-base">Fuel Efficiency Trend</CardTitle>
            <CardDescription className="text-xs">Kilometers per liter between refuels</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="h-80">
              <LineChart data={efficiencyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="efficiency" 
                  stroke="var(--color-efficiency)" 
                  strokeWidth={2.5}
                  dot={{ fill: "var(--color-efficiency)", r: 4 }}
                  name="km/L"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Station Comparison (only shown when "all" is selected) */}
        {selectedStation === 'all' && stationComparisonData.length > 0 && (
          <>
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/50">
                <CardTitle className="text-base">Spending by Station</CardTitle>
                <CardDescription className="text-xs">Total money spent at each fuel station</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ChartContainer config={chartConfig} className="h-80">
                  <BarChart data={stationComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="station" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="spent" 
                      fill="var(--color-spent)" 
                      radius={[6, 6, 0, 0]}
                      name="Total Spent (₹)"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/50">
                <CardTitle className="text-base">Efficiency by Station</CardTitle>
                <CardDescription className="text-xs">Average fuel efficiency at each station</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ChartContainer config={chartConfig} className="h-80">
                  <BarChart data={stationComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="station" 
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="efficiency" 
                      fill="var(--color-efficiency)" 
                      radius={[6, 6, 0, 0]}
                      name="Efficiency (km/L)"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export { Statistics };
