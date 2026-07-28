// Canonical fuel-entry type and the single selector that derives per-tank
// metrics from a list of entries. Both `Entries` and `Statistics` read from
// `deriveLegs` so the two views can never disagree about the same fill-up.

export type Entry = {
  id?: number; // local IndexedDB id
  supabaseId?: string; // Supabase uuid
  // Generated once with crypto.randomUUID() when the entry is first created,
  // and never reassigned afterward. This is the join key sync uses to tell
  // "already pushed to Supabase" apart from "still needs pushing" — unlike
  // matching on date/amount/odometer/litres, it can't collide with another
  // entry and doesn't break when one of those fields is later edited.
  // Entries created before this field existed have it undefined; sync falls
  // back to the old field-tuple match for those.
  clientId?: string;
  userId: number; // local user id (for IndexedDB)
  supabaseUserId?: string; // Supabase user uuid
  date: string; // ISO 'yyyy-MM-dd'
  amountPaid: number;
  odometerReading: number;
  fuelFilled: number;
  fuelStation: string;
  syncedAt?: string | null;
  isDeleted?: boolean;
};

export type Leg = Entry & {
  /** km covered since the previous (older) fill-up. null for the oldest entry in the set. */
  distanceTravelled: number | null;
  /** km/L for the leg that ended at this fill-up. null when distance can't be computed. */
  efficiency: number | null;
  /** ₹ spent per km for the leg that ended at this fill-up. */
  costPerKm: number | null;
  /** ₹ paid per litre at this fill-up. Always computable from this row alone. */
  pricePerLitre: number | null;
};

/**
 * Parses a date string in local time, so a 'yyyy-MM-dd' value never shifts by a
 * day due to UTC midnight conversion. Tolerant of the legacy 'yyyy/MM/dd' format
 * still present in older IndexedDB rows, and of invisible Unicode "format"
 * characters (zero-width space, zero-width joiners, a stray BOM — Unicode
 * category Cf) that turned up in some real rows, likely carried in from a
 * clipboard paste through the CSV importer. `.trim()` alone doesn't strip
 * these, so left in place they turn "2026/01/25" into an unparseable string,
 * which any caller that calls date-fns `format()` on the result (rather than
 * just comparing timestamps) will throw on.
 */
export function parseEntryDate(dateStr: string): Date {
  const cleaned = dateStr.replace(/\p{Cf}/gu, '').trim();
  const parts = cleaned.replace(/\//g, '-').split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/**
 * Sorts entries newest-first (independent of the order they were fetched in —
 * this is what makes the derived numbers stable whether entries came from
 * Supabase or the IndexedDB offline fallback) and computes, for each entry,
 * the distance/efficiency/cost of the leg that ended at that fill-up: the
 * distance since the previous (older) fill, divided by the litres added at
 * THIS fill. That's the fill that actually paid for the fuel burned on that
 * leg, so metrics live on the row the reader expects them on.
 */
export function deriveLegs(entries: Entry[]): Leg[] {
  const sorted = [...entries].sort(
    (a, b) => parseEntryDate(b.date).getTime() - parseEntryDate(a.date).getTime()
  );

  return sorted.map((entry, index) => {
    const olderEntry = index < sorted.length - 1 ? sorted[index + 1] : null;

    const distanceTravelled = olderEntry
      ? entry.odometerReading - olderEntry.odometerReading
      : null;

    const efficiency =
      distanceTravelled !== null && entry.fuelFilled > 0
        ? distanceTravelled / entry.fuelFilled
        : null;

    const costPerKm =
      distanceTravelled !== null && distanceTravelled > 0
        ? entry.amountPaid / distanceTravelled
        : null;

    const pricePerLitre = entry.fuelFilled > 0 ? entry.amountPaid / entry.fuelFilled : null;

    return { ...entry, distanceTravelled, efficiency, costPerKm, pricePerLitre };
  });
}
