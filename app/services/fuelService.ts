import { supabase, dbToEntry, type FuelEntry } from '@/lib/supabaseClient';

export async function getAllEntries(userId: string): Promise<FuelEntry[]> {
  const { data, error } = await supabase
    .from('fuel_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(dbToEntry);
}

export async function addEntry(
  entry: Omit<FuelEntry, 'id' | 'userId'>,
  userId: string
): Promise<FuelEntry> {
  const { data, error } = await supabase
    .from('fuel_entries')
    .insert({
      user_id: userId,
      date: entry.date,
      amount_paid: entry.amountPaid,
      odometer_reading: entry.odometerReading,
      fuel_filled: entry.fuelFilled,
      fuel_station: entry.fuelStation,
      is_deleted: false,
    })
    .select()
    .single();

  if (error) throw error;
  return dbToEntry(data);
}

export async function updateEntry(entry: FuelEntry): Promise<void> {
  if (!entry.id) throw new Error('Entry id is required for update');
  const { error } = await supabase
    .from('fuel_entries')
    .update({
      date: entry.date,
      amount_paid: entry.amountPaid,
      odometer_reading: entry.odometerReading,
      fuel_filled: entry.fuelFilled,
      fuel_station: entry.fuelStation,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entry.id)
    .eq('user_id', entry.userId);

  if (error) throw error;
}

export async function deleteEntry(entry: FuelEntry): Promise<void> {
  if (!entry.id) return;
  const { error } = await supabase
    .from('fuel_entries')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', entry.id)
    .eq('user_id', entry.userId);

  if (error) throw error;
}

export async function deleteAllEntries(userId: string): Promise<void> {
  const { error } = await supabase
    .from('fuel_entries')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (error) throw error;
}

export async function replaceAllEntries(
  userId: string,
  entries: Omit<FuelEntry, 'id' | 'userId'>[]
): Promise<void> {
  await deleteAllEntries(userId);

  if (entries.length === 0) return;

  const rows = entries.map((e) => ({
    user_id: userId,
    date: e.date,
    amount_paid: e.amountPaid,
    odometer_reading: e.odometerReading,
    fuel_filled: e.fuelFilled,
    fuel_station: e.fuelStation,
    is_deleted: false,
  }));

  const { error } = await supabase.from('fuel_entries').insert(rows);
  if (error) throw error;
}
