import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { type FuelEntry } from '@/lib/supabaseClient';
import { getAllEntries } from '@/services/fuelService';

const SCREEN_WIDTH = Dimensions.get('window').width;


// ─── Chart config ────────────────────────────────────────────────────────────

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  strokeWidth: 2,
  propsForDots: { r: '3', strokeWidth: '2', stroke: '#7f22fe' },
  propsForBackgroundLines: { stroke: '#f3f4f6', strokeDasharray: '' },
};

const greenChartConfig = {
  ...chartConfig,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  propsForDots: { r: '3', strokeWidth: '2', stroke: '#10b981' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseEntryDate(dateStr: string): Date {
  const normalized = dateStr.replace(/\//g, '-');
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shortDate(dateStr: string): string {
  const d = parseEntryDate(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.statCard, highlight && styles.statCardHighlight]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Station Picker ───────────────────────────────────────────────────────────

function StationPicker({
  stations,
  selected,
  onSelect,
}: {
  stations: string[];
  selected: string;
  onSelect: (s: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setVisible(true)}>
        <Text style={styles.pickerButtonText} numberOfLines={1}>
          {selected === 'All' ? 'All Stations' : selected}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6b7280" />
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.pickerMenu}>
            <TouchableOpacity
              style={[styles.pickerItem, selected === 'All' && styles.pickerItemActive]}
              onPress={() => { onSelect('All'); setVisible(false); }}
            >
              <Text style={[styles.pickerItemText, selected === 'All' && styles.pickerItemTextActive]}>
                All Stations
              </Text>
              {selected === 'All' && <Ionicons name="checkmark" size={16} color="#7f22fe" />}
            </TouchableOpacity>
            {stations.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.pickerItem, selected === s && styles.pickerItemActive]}
                onPress={() => { onSelect(s); setVisible(false); }}
              >
                <Text
                  style={[styles.pickerItemText, selected === s && styles.pickerItemTextActive]}
                  numberOfLines={1}
                >
                  {s}
                </Text>
                {selected === s && <Ionicons name="checkmark" size={16} color="#7f22fe" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StatisticsScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStation, setSelectedStation] = useState('All');

  useEffect(() => {
    if (!user?.id) return;
    getAllEntries(user.id)
      .then(setEntries)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [user?.id]);

  // Sort newest → oldest for calculations (descending)
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime()),
    [entries]
  );

  const allStations = useMemo(
    () => Array.from(new Set(sortedEntries.map((e) => e.fuelStation))),
    [sortedEntries]
  );

  // Calculate efficiency, distance, and cost per km for each entry
  // Formulas (for a list ordered newest → oldest, where nextEntry is older):
  // - distanceTravelled = current_odometer - next_odometer
  // - costPerKm = current_amountPaid / distanceTravelled
  // - efficiency = distanceTravelled / current_fuelFilled
  // Entry without a next (older) entry has no values
  const entriesWithCalc = useMemo(() => {
    return sortedEntries.map((entry, index) => {
      if (index === sortedEntries.length - 1) {
        // No older entry to compare against - no calculations possible
        return { ...entry, distanceTravelled: null, costPerKm: null, efficiency: null };
      }
      const nextEntry = sortedEntries[index + 1];
      const distanceTravelled = nextEntry ? entry.odometerReading - nextEntry.odometerReading : null;
      const costPerKm =
        nextEntry && distanceTravelled ? entry.amountPaid / distanceTravelled : null;
      const efficiency =
        nextEntry && distanceTravelled ? distanceTravelled / entry.fuelFilled : null;
      return { ...entry, distanceTravelled, costPerKm, efficiency };
    });
  }, [sortedEntries]);

  // Filter entries based on selected station
  const filteredEntries = useMemo(
    () =>
      selectedStation === 'All'
        ? entriesWithCalc
        : entriesWithCalc.filter((e) => e.fuelStation === selectedStation),
    [entriesWithCalc, selectedStation]
  );

  const stats = useMemo(() => {
    if (filteredEntries.length === 0)
      return { totalSpent: 0, totalKm: 0, avgFuelEfficiency: 0, avgCostPerKm: 0, totalFuel: 0, avgPricePerLiter: 0 };

    const totalSpent = filteredEntries.reduce((sum, entry) => sum + entry.amountPaid, 0);
    const totalFuel = filteredEntries.reduce((sum, entry) => sum + entry.fuelFilled, 0);

    let totalKm = 0;
    if (selectedStation === 'All') {
      totalKm =
        filteredEntries.length > 1
          ? filteredEntries[0].odometerReading - filteredEntries[filteredEntries.length - 1].odometerReading
          : filteredEntries.length === 1
            ? filteredEntries[0].odometerReading
            : 0;
    } else {
      totalKm = filteredEntries
        .filter((e) => e.distanceTravelled !== null)
        .reduce((sum, e) => sum + (e.distanceTravelled as number), 0);
    }

    // Average efficiency = average of all individual efficiencies (excluding null)
    const validEfficiencies = filteredEntries
      .filter((e) => e.efficiency !== null)
      .map((e) => e.efficiency as number);

    const avgFuelEfficiency =
      validEfficiencies.length > 0 ? validEfficiencies.reduce((sum, eff) => sum + eff, 0) / validEfficiencies.length : 0;

    // Average cost per km = average of all individual cost per km (excluding null)
    const validCostPerKm = filteredEntries
      .filter((e) => e.costPerKm !== null)
      .map((e) => e.costPerKm as number);

    const avgCostPerKm =
      validCostPerKm.length > 0 ? validCostPerKm.reduce((sum, cost) => sum + cost, 0) / validCostPerKm.length : 0;

    const avgPricePerLiter = totalFuel > 0 ? totalSpent / totalFuel : 0;

    return { totalSpent, totalKm, avgFuelEfficiency, avgCostPerKm, totalFuel, avgPricePerLiter };
  }, [filteredEntries, selectedStation]);

  // Chart: Spending over time
  const spendingData = useMemo(() => {
    const items = filteredEntries.slice(-10); // max 10 points for readability
    if (items.length < 2) return null;
    return {
      labels: items.map((e) => shortDate(e.date)),
      datasets: [{ data: items.map((e) => e.amountPaid) }],
    };
  }, [filteredEntries]);

  // Chart: Efficiency trend
  const efficiencyData = useMemo(() => {
    const items = filteredEntries.filter((e) => e.efficiency !== null).slice(-10);
    if (items.length < 2) return null;
    return {
      labels: items.map((e) => shortDate(e.date)),
      datasets: [{ data: items.map((e) => e.efficiency as number) }],
    };
  }, [filteredEntries]);

  // Chart: Spending by station (bar)
  const stationSpendingData = useMemo(() => {
    if (selectedStation !== 'All' || allStations.length < 2) return null;
    const labels = allStations.map((s) => (s.length > 8 ? s.substring(0, 8) + '…' : s));
    const data = allStations.map((s) =>
      entriesWithCalc.filter((e) => e.fuelStation === s).reduce((sum, e) => sum + e.amountPaid, 0)
    );
    return { labels, datasets: [{ data }] };
  }, [allStations, entriesWithCalc, selectedStation]);

  // Chart: Efficiency by station (bar)
  const stationEfficiencyData = useMemo(() => {
    if (selectedStation !== 'All' || allStations.length < 2) return null;
    const labels = allStations.map((s) => (s.length > 8 ? s.substring(0, 8) + '…' : s));
    const data = allStations.map((s) => {
      const vals = entriesWithCalc
        .filter((e) => e.fuelStation === s && e.efficiency !== null)
        .map((e) => e.efficiency as number);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });
    return { labels, datasets: [{ data }] };
  }, [allStations, entriesWithCalc, selectedStation]);

  const chartWidth = SCREEN_WIDTH - 32;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f22fe" />
      </View>
    );
  }

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="bar-chart-outline" size={48} color="#d1d5db" />
        <Text style={styles.emptyText}>No data yet.</Text>
        <Text style={styles.emptySubText}>Add fuel entries to see statistics.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header + Filter */}
      <View style={styles.pageHeader}>
        <View>
          <Text style={styles.pageTitle}>Statistics</Text>
          <Text style={styles.pageSubtitle}>Overview of your fuel consumption</Text>
        </View>
        <StationPicker
          stations={allStations}
          selected={selectedStation}
          onSelect={setSelectedStation}
        />
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Total Money Spent"
          value={`₹${stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="Across all stations"
        />
        <StatCard
          label="Total Distance"
          value={`${stats.totalKm.toLocaleString('en-IN')} km`}
          sub="Total kilometers"
        />
        <StatCard
          label="Avg Fuel Efficiency"
          value={`${stats.avgFuelEfficiency.toFixed(2)} km/L`}
          sub="Average mileage"
          highlight
        />
        <StatCard
          label="Avg Cost per km"
          value={`₹${stats.avgCostPerKm.toFixed(2)}`}
          sub="Per kilometer cost"
        />
        <StatCard
          label="Total Fuel"
          value={`${stats.totalFuel.toFixed(2)} L`}
          sub="Total fuel filled"
        />
        <StatCard
          label="Avg Price/Liter"
          value={`₹${stats.avgPricePerLiter.toFixed(2)}`}
          sub="Average fuel price"
        />
      </View>

      {/* Charts */}
      {spendingData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending Over Time</Text>
          <Text style={styles.chartSubtitle}>Amount paid per fill-up (₹)</Text>
          <LineChart
            data={spendingData}
            width={chartWidth}
            height={200}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            fromZero
          />
        </View>
      )}

      {efficiencyData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Fuel Efficiency Trend</Text>
          <Text style={styles.chartSubtitle}>km/L per fill-up</Text>
          <LineChart
            data={efficiencyData}
            width={chartWidth}
            height={200}
            chartConfig={greenChartConfig}
            bezier
            style={styles.chart}
            withInnerLines={true}
            withOuterLines={false}
            fromZero
          />
        </View>
      )}

      {stationSpendingData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Spending by Station</Text>
          <Text style={styles.chartSubtitle}>Total amount spent (₹)</Text>
          <BarChart
            data={stationSpendingData}
            width={chartWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel="₹"
            yAxisSuffix=""
          />
        </View>
      )}

      {stationEfficiencyData && (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Avg Efficiency by Station</Text>
          <Text style={styles.chartSubtitle}>Average km/L per station</Text>
          <BarChart
            data={stationEfficiencyData}
            width={chartWidth}
            height={220}
            chartConfig={greenChartConfig}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
            yAxisLabel=""
            yAxisSuffix=" km/L"
          />
        </View>
      )}

      {!spendingData && !efficiencyData && (
        <View style={styles.noChartBox}>
          <Text style={styles.noChartText}>Add more entries to see charts.</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '700', color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  // Picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    minWidth: 130,
    maxWidth: 160,
  },
  pickerButtonText: { fontSize: 13, color: '#374151', flex: 1 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  pickerMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemActive: { backgroundColor: '#eff6ff' },
  pickerItemText: { fontSize: 15, color: '#374151', flex: 1 },
  pickerItemTextActive: { color: '#7f22fe', fontWeight: '600' },
  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statCardHighlight: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  statLabel: { fontSize: 11, fontWeight: '500', color: '#6b7280', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statValueHighlight: { color: '#7f22fe' },
  statSub: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
  // Charts
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  chartTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  chartSubtitle: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  chart: { borderRadius: 8, marginLeft: -16 },
  noChartBox: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  noChartText: { fontSize: 14, color: '#9ca3af' },
});
