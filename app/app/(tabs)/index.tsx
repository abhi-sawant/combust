import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/contexts/AuthContext';
import { type FuelEntry } from '@/lib/supabaseClient';
import {
  getAllEntries,
  addEntry,
  updateEntry,
  deleteEntry,
  deleteAllEntries,
  replaceAllEntries,
} from '@/services/fuelService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return format(date, 'yyyy/MM/dd');
}

function parseEntryDate(dateStr: string): Date {
  const normalized = dateStr.replace(/\//g, '-');
  const [y, m, d] = normalized.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Add Entry Form ──────────────────────────────────────────────────────────

interface AddEntryFormProps {
  stations: string[];
  onAdd: (entry: Omit<FuelEntry, 'id' | 'userId'>) => Promise<void>;
}

function AddEntryForm({ stations, onAdd }: AddEntryFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fuelStation, setFuelStation] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fuelFilled, setFuelFilled] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredStations = useMemo(
    () =>
      fuelStation.trim()
        ? stations.filter((s) =>
            s.toLowerCase().includes(fuelStation.toLowerCase())
          )
        : stations,
    [stations, fuelStation]
  );

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDate(selected);
  };

  const handleSubmit = async () => {
    if (!fuelStation.trim() || !fuelFilled || !amountPaid || !odometerReading) {
      Alert.alert('Missing Fields', 'Please fill in all fields before adding an entry.');
      return;
    }
    const parsedFuel = parseFloat(fuelFilled);
    const parsedAmount = parseFloat(amountPaid);
    const parsedOdometer = parseFloat(odometerReading);
    if (isNaN(parsedFuel) || isNaN(parsedAmount) || isNaN(parsedOdometer)) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for fuel, amount, and odometer.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAdd({
        date: formatDate(date),
        fuelStation: fuelStation.trim(),
        fuelFilled: parsedFuel,
        amountPaid: parsedAmount,
        odometerReading: parsedOdometer,
      });
      setDate(new Date());
      setFuelStation('');
      setFuelFilled('');
      setAmountPaid('');
      setOdometerReading('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Add New Entry</Text>
        <Text style={styles.cardSubtitle}>Record your latest fuel fill-up</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.dateButtonText}>{format(date, 'dd MMM yyyy')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Fuel Station</Text>
            <TextInput
              style={styles.input}
              placeholder="Station name..."
              placeholderTextColor="#9ca3af"
              value={fuelStation}
              onChangeText={(t) => { setFuelStation(t); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredStations.length > 0 && (
              <View style={styles.suggestions}>
                {filteredStations.slice(0, 5).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionItem}
                    onPress={() => { setFuelStation(s); setShowSuggestions(false); }}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Fuel Filled (L)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7.02"
              placeholderTextColor="#9ca3af"
              value={fuelFilled}
              onChangeText={setFuelFilled}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.field, styles.fieldHalf]}>
            <Text style={styles.label}>Amount Paid (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 690.67"
              placeholderTextColor="#9ca3af"
              value={amountPaid}
              onChangeText={setAmountPaid}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Odometer Reading (km)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 12345"
            placeholderTextColor="#9ca3af"
            value={odometerReading}
            onChangeText={setOdometerReading}
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Add Entry</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Entry Card ──────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: FuelEntry;
  index: number;
  totalEntries: number;
  prevEntry: FuelEntry | null;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function EntryCard({ entry, index, totalEntries, prevEntry, onEdit, onDelete, onMoveUp, onMoveDown }: EntryCardProps) {
  const avgEfficiency =
    prevEntry
      ? ((prevEntry.odometerReading - entry.odometerReading) / entry.fuelFilled).toFixed(2)
      : null;

  return (
    <View style={styles.entryCard}>
      <View style={styles.entryCardHeader}>
        <Text style={styles.entryDate}>{entry.date}</Text>
        <View style={styles.stationBadge}>
          <Text style={styles.stationBadgeText} numberOfLines={1}>{entry.fuelStation}</Text>
        </View>
      </View>
      <View style={styles.entryGrid}>
        <View style={styles.entryGridItem}>
          <Text style={styles.entryGridLabel}>Fuel Filled</Text>
          <Text style={styles.entryGridValue}>{entry.fuelFilled.toFixed(2)} L</Text>
        </View>
        <View style={styles.entryGridItem}>
          <Text style={styles.entryGridLabel}>Amount Paid</Text>
          <Text style={styles.entryGridValue}>₹{entry.amountPaid.toFixed(2)}</Text>
        </View>
        <View style={styles.entryGridItem}>
          <Text style={styles.entryGridLabel}>Odometer</Text>
          <Text style={styles.entryGridValue}>{entry.odometerReading.toLocaleString()} km</Text>
        </View>
        <View style={styles.entryGridItem}>
          <Text style={styles.entryGridLabel}>Efficiency</Text>
          <Text style={[styles.entryGridValue, avgEfficiency ? styles.efficiencyValue : null]}>
            {avgEfficiency ? `${avgEfficiency} km/L` : '—'}
          </Text>
        </View>
      </View>
      <View style={styles.entryActions}>
        <TouchableOpacity
          style={[styles.actionBtn, index === 0 && styles.actionBtnDisabled]}
          onPress={onMoveUp}
          disabled={index === 0}
        >
          <Ionicons name="chevron-up" size={16} color={index === 0 ? '#d1d5db' : '#6b7280'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, index === totalEntries - 1 && styles.actionBtnDisabled]}
          onPress={onMoveDown}
          disabled={index === totalEntries - 1}
        >
          <Ionicons name="chevron-down" size={16} color={index === totalEntries - 1 ? '#d1d5db' : '#6b7280'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={16} color="#7f22fe" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDestructive]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  visible: boolean;
  entry: FuelEntry | null;
  stations: string[];
  onSave: (entry: FuelEntry) => Promise<void>;
  onClose: () => void;
}

function EditModal({ visible, entry, stations, onSave, onClose }: EditModalProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [fuelStation, setFuelStation] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [fuelFilled, setFuelFilled] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setDate(parseEntryDate(entry.date));
      setFuelStation(entry.fuelStation);
      setFuelFilled(String(entry.fuelFilled));
      setAmountPaid(String(entry.amountPaid));
      setOdometerReading(String(entry.odometerReading));
    }
  }, [entry]);

  const filteredStations = useMemo(
    () =>
      fuelStation.trim()
        ? stations.filter((s) => s.toLowerCase().includes(fuelStation.toLowerCase()))
        : stations,
    [stations, fuelStation]
  );

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDate(selected);
  };

  const handleSave = async () => {
    if (!entry || !fuelStation.trim() || !fuelFilled || !amountPaid || !odometerReading) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        ...entry,
        date: formatDate(date),
        fuelStation: fuelStation.trim(),
        fuelFilled: parseFloat(fuelFilled),
        amountPaid: parseFloat(amountPaid),
        odometerReading: parseFloat(odometerReading),
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Entry</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#7f22fe" />
            ) : (
              <Text style={styles.modalSaveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.dateButtonText}>{format(date, 'dd MMM yyyy')}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Fuel Station</Text>
            <TextInput
              style={styles.input}
              placeholder="Station name..."
              placeholderTextColor="#9ca3af"
              value={fuelStation}
              onChangeText={(t) => { setFuelStation(t); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
            />
            {showSuggestions && filteredStations.length > 0 && (
              <View style={styles.suggestions}>
                {filteredStations.slice(0, 5).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionItem}
                    onPress={() => { setFuelStation(s); setShowSuggestions(false); }}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Fuel Filled (L)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 7.02"
              placeholderTextColor="#9ca3af"
              value={fuelFilled}
              onChangeText={setFuelFilled}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Amount Paid (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 690.67"
              placeholderTextColor="#9ca3af"
              value={amountPaid}
              onChangeText={setAmountPaid}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Odometer Reading (km)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 12345"
              placeholderTextColor="#9ca3af"
              value={odometerReading}
              onChangeText={setOdometerReading}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function EntriesScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const stations = useMemo(
    () => Array.from(new Set(entries.map((e) => e.fuelStation))),
    [entries]
  );

  const loadEntries = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const loaded = await getAllEntries(user.id);
      setEntries(loaded);
    } catch (err) {
      console.error('Error loading entries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleAdd = useCallback(async (entryData: Omit<FuelEntry, 'id' | 'userId'>) => {
    if (!user?.id) return;
    const newEntry = await addEntry(entryData, user.id);
    setEntries((prev) => [newEntry, ...prev]);
  }, [user?.id]);

  const handleUpdate = useCallback(async (updated: FuelEntry) => {
    await updateEntry(updated);
    setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }, []);

  const handleDelete = useCallback((entry: FuelEntry) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEntry(entry);
            setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          },
        },
      ]
    );
  }, []);

  const handleMove = useCallback((fromIndex: number, toIndex: number) => {
    setEntries((prev) => {
      const next = [...prev];
      const [removed] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, removed);
      return next;
    });
  }, []);

  const handleDeleteAll = useCallback(() => {
    if (entries.length === 0) return;
    Alert.alert(
      'Delete All Entries',
      `Delete all ${entries.length} entries? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            await deleteAllEntries(user.id);
            setEntries([]);
          },
        },
      ]
    );
  }, [entries.length, user?.id]);

  const handleExport = useCallback(async () => {
    if (entries.length === 0) {
      Alert.alert('No Data', 'There are no entries to export.');
      return;
    }
    const headers = ['Date', 'Amount Paid', 'Odometer Reading', 'Fuel Filled', 'Fuel Station'];
    const rows = entries.map((e) =>
      [e.date, e.amountPaid, e.odometerReading, e.fuelFilled, `"${e.fuelStation}"`].join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const filename = `combust-entries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    const fileUri = (FileSystem.cacheDirectory ?? '') + filename;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } else {
      Alert.alert('Sharing not available', 'Your device does not support file sharing.');
    }
  }, [entries]);

  const handleImport = useCallback(async () => {
    if (!user?.id) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);

      let importedEntries: Omit<FuelEntry, 'id' | 'userId'>[] = [];
      if (file.name?.endsWith('.json') || file.mimeType === 'application/json') {
        const json = JSON.parse(content);
        const arr = Array.isArray(json) ? json : json.entries ?? [];
        importedEntries = arr.map((row: Record<string, unknown>) => ({
          date: String(row.date ?? row.Date ?? ''),
          amountPaid: parseFloat(String(row.amountPaid ?? row['Amount Paid'] ?? 0)),
          odometerReading: parseFloat(String(row.odometerReading ?? row['Odometer Reading'] ?? 0)),
          fuelFilled: parseFloat(String(row.fuelFilled ?? row['Fuel Filled'] ?? 0)),
          fuelStation: String(row.fuelStation ?? row['Fuel Station'] ?? ''),
        }));
      } else {
        const lines = content.trim().split('\n').filter(Boolean);
        importedEntries = lines.slice(1).map((line) => {
          const cols = line.split(',');
          return {
            date: (cols[0] ?? '').replace(/"/g, '').trim(),
            amountPaid: parseFloat(cols[1] ?? '0'),
            odometerReading: parseFloat(cols[2] ?? '0'),
            fuelFilled: parseFloat(cols[3] ?? '0'),
            fuelStation: (cols[4] ?? '').replace(/"/g, '').trim(),
          };
        });
      }

      const valid = importedEntries.filter(
        (e) => e.date && !isNaN(e.amountPaid) && !isNaN(e.odometerReading) && !isNaN(e.fuelFilled)
      );
      if (valid.length === 0) {
        Alert.alert('Import Failed', 'No valid entries found in the file.');
        return;
      }
      Alert.alert(
        'Confirm Import',
        `Replace all ${entries.length} existing entries with ${valid.length} imported entries?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              await replaceAllEntries(user.id, valid);
              await loadEntries();
              Alert.alert('Success', `${valid.length} entries imported.`);
            },
          },
        ]
      );
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Import Failed', 'Could not read the file. Please check the format.');
    }
  }, [user?.id, entries.length, loadEntries]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7f22fe" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.screen}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <AddEntryForm stations={stations} onAdd={handleAdd} />
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Your Entries</Text>
                <Text style={styles.sectionSubtitle}>{entries.length} total entries</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconButton} onPress={handleExport}>
                  <Ionicons name="download-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} onPress={handleImport}>
                  <Ionicons name="cloud-upload-outline" size={18} color="#6b7280" />
                </TouchableOpacity>
                {entries.length > 0 && (
                  <TouchableOpacity
                    style={[styles.iconButton, styles.destructiveIconButton]}
                    onPress={handleDeleteAll}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {entries.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyStateText}>No entries yet.</Text>
                <Text style={styles.emptyStateSubtext}>Add your first fuel fill-up above.</Text>
              </View>
            )}
          </>
        }
        data={entries}
        keyExtractor={(item, index) => String(item.id ?? index)}
        renderItem={({ item, index }) => (
          <EntryCard
            entry={item}
            index={index}
            totalEntries={entries.length}
            prevEntry={index > 0 ? entries[index - 1] : null}
            onEdit={() => { setEditingEntry(item); setEditModalVisible(true); }}
            onDelete={() => handleDelete(item)}
            onMoveUp={() => handleMove(index, index - 1)}
            onMoveDown={() => handleMove(index, index + 1)}
          />
        )}
        ListFooterComponent={<View style={{ height: 24 }} />}
      />
      <EditModal
        visible={editModalVisible}
        entry={editingEntry}
        stations={stations}
        onSave={handleUpdate}
        onClose={() => { setEditModalVisible(false); setEditingEntry(null); }}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardBody: { padding: 16 },
  fieldRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  field: { marginBottom: 12 },
  fieldHalf: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  dateButton: {
    height: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  dateButtonText: { fontSize: 14, color: '#111827' },
  suggestions: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 999,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionText: { fontSize: 14, color: '#374151' },
  primaryButton: {
    height: 46,
    backgroundColor: '#7f22fe',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  disabledButton: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  destructiveIconButton: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  emptyStateText: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptyStateSubtext: { fontSize: 14, color: '#9ca3af', marginTop: 4 },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  entryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  entryDate: { fontSize: 13, fontWeight: '600', color: '#374151' },
  stationBadge: { backgroundColor: '#eff6ff', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, maxWidth: 160 },
  stationBadgeText: { fontSize: 11, fontWeight: '600', color: '#7f22fe' },
  entryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  entryGridItem: { width: '48%' },
  entryGridLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  entryGridValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  efficiencyValue: { color: '#7f22fe' },
  entryActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    padding: 8,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnDestructive: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  modalCancelText: { fontSize: 15, color: '#6b7280' },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#7f22fe' },
  modalBody: { flex: 1, padding: 20 },
});
