import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Type definitions matching Supabase schema
export type FuelEntryDB = {
  id: string; // uuid
  user_id: string;
  date: string;
  amount_paid: number;
  odometer_reading: number;
  fuel_filled: number;
  fuel_station: string;
  created_at?: string;
  updated_at?: string;
  local_id?: number | null; // maps to IndexedDB local record id
  is_deleted: boolean;
  synced_at?: string | null;
};

// Utility to check if online
export function isOnline(): boolean {
  return navigator.onLine;
}
