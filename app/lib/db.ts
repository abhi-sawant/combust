import { openDB } from './database';

export type Entry = {
  id?: number;
  userId: number;
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

type EntryRow = {
  id: number;
  user_id: number;
  date: string;
  amount_paid: number;
  odometer_reading: number;
  fuel_filled: number;
  fuel_station: string;
};

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    amountPaid: row.amount_paid,
    odometerReading: row.odometer_reading,
    fuelFilled: row.fuel_filled,
    fuelStation: row.fuel_station,
  };
}

export async function getAllEntries(userId: number): Promise<Entry[]> {
  const db = await openDB();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT id, user_id, date, amount_paid, odometer_reading, fuel_filled, fuel_station FROM entries WHERE user_id = ? ORDER BY date DESC, id DESC',
    [userId]
  );
  return rows.map(rowToEntry);
}

export async function addEntry(entry: Omit<Entry, 'id'>): Promise<number> {
  const db = await openDB();
  const result = await db.runAsync(
    'INSERT INTO entries (user_id, date, amount_paid, odometer_reading, fuel_filled, fuel_station) VALUES (?, ?, ?, ?, ?, ?)',
    [
      entry.userId,
      entry.date,
      entry.amountPaid,
      entry.odometerReading,
      entry.fuelFilled,
      entry.fuelStation,
    ]
  );
  return result.lastInsertRowId;
}

export async function updateEntry(entry: Entry): Promise<void> {
  const db = await openDB();
  await db.runAsync(
    'UPDATE entries SET date = ?, amount_paid = ?, odometer_reading = ?, fuel_filled = ?, fuel_station = ? WHERE id = ?',
    [
      entry.date,
      entry.amountPaid,
      entry.odometerReading,
      entry.fuelFilled,
      entry.fuelStation,
      entry.id!,
    ]
  );
}

export async function deleteEntry(id: number): Promise<void> {
  const db = await openDB();
  await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
}

export async function clearAllEntries(userId: number): Promise<void> {
  const db = await openDB();
  await db.runAsync('DELETE FROM entries WHERE user_id = ?', [userId]);
}

export async function bulkAddEntries(entries: Omit<Entry, 'id'>[]): Promise<void> {
  const db = await openDB();
  await db.withTransactionAsync(async () => {
    for (const entry of entries) {
      await db.runAsync(
        'INSERT INTO entries (user_id, date, amount_paid, odometer_reading, fuel_filled, fuel_station) VALUES (?, ?, ?, ?, ?, ?)',
        [
          entry.userId,
          entry.date,
          entry.amountPaid,
          entry.odometerReading,
          entry.fuelFilled,
          entry.fuelStation,
        ]
      );
    }
  });
}

export async function replaceAllEntries(
  userId: number,
  entries: Omit<Entry, 'id'>[]
): Promise<void> {
  await clearAllEntries(userId);
  if (entries.length > 0) {
    const entriesWithUserId = entries.map((e) => ({ ...e, userId }));
    await bulkAddEntries(entriesWithUserId);
  }
}
