import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Must be false for React Native
  },
});

// Type matching Supabase fuel_entries table schema
export type FuelEntryDB = {
  id: string;           // uuid primary key
  user_id: string;      // Supabase auth user uuid
  date: string;
  amount_paid: number;
  odometer_reading: number;
  fuel_filled: number;
  fuel_station: string;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
};

// App-level fuel entry type
export type FuelEntry = {
  id?: string;          // Supabase uuid (undefined until saved)
  userId: string;       // Supabase user uuid
  date: string;
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
};

export function dbToEntry(row: FuelEntryDB): FuelEntry {
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
