import { format, parseISO, subMonths } from "date-fns"

import type { FuelEntry } from "@/types/entry"
import type { DerivedEntry, OverallStats, StationStats } from "@/types/stats"

/** Entries ordered by odometer reading — the true chronological axis mileage math depends on. */
export function sortByOdometer<T extends { odometerReading: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.odometerReading - b.odometerReading)
}

/**
 * Attaches distance/mileage/cost-per-litre to each entry relative to the
 * next one by odometer order — the litres added at that later fill-up is
 * what quantifies the distance covered on the tank filled here. The
 * highest-odometer entry is "pending" (no later fill-up yet to measure
 * against) and never has mileage. An entry whose odometer reading is
 * overtaken by (or ties) its successor gets no distance/mileage figures
 * (they'd be meaningless), but its cost-per-litre is still computed.
 */
export function deriveEntries(entries: FuelEntry[]): DerivedEntry[] {
  const sorted = sortByOdometer(entries)

  return sorted.map((entry, index) => {
    const next = index < sorted.length - 1 ? sorted[index + 1] : null
    const isPending = next === null
    const isOdometerRegression = next !== null && next.odometerReading <= entry.odometerReading

    const distanceCovered =
      next && !isOdometerRegression ? next.odometerReading - entry.odometerReading : null

    const mileage =
      distanceCovered !== null && next!.litresFilled > 0
        ? distanceCovered / next!.litresFilled
        : null

    const costPerLitre = entry.litresFilled > 0 ? entry.amountPaid / entry.litresFilled : null

    return {
      ...entry,
      isPending,
      isOdometerRegression,
      distanceCovered,
      mileage,
      costPerLitre,
    }
  })
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

export function computeOverallStats(derived: DerivedEntry[]): OverallStats {
  const mileages = derived.filter((e) => e.mileage !== null)
  const costs = derived.filter((e) => e.costPerLitre !== null)

  let bestMileageEntry: DerivedEntry | null = null
  let worstMileageEntry: DerivedEntry | null = null
  for (const entry of mileages) {
    if (bestMileageEntry === null || entry.mileage! > bestMileageEntry.mileage!) {
      bestMileageEntry = entry
    }
    if (worstMileageEntry === null || entry.mileage! < worstMileageEntry.mileage!) {
      worstMileageEntry = entry
    }
  }

  return {
    averageMileage: average(mileages.map((e) => e.mileage!)),
    bestMileageEntry,
    worstMileageEntry,
    totalLitresFilled: derived.reduce((sum, e) => sum + e.litresFilled, 0),
    totalAmountSpent: derived.reduce((sum, e) => sum + e.amountPaid, 0),
    averageCostPerLitre: average(costs.map((e) => e.costPerLitre!)),
    totalDistanceCovered: derived.reduce((sum, e) => sum + (e.distanceCovered ?? 0), 0),
    entryCount: derived.length,
  }
}

/** Groups derived entries by the station they were filled at, sorted by most-used first. */
export function computeStationStats(derived: DerivedEntry[]): StationStats[] {
  const groups = new Map<string, DerivedEntry[]>()
  for (const entry of derived) {
    const list = groups.get(entry.fuelStation)
    if (list) {
      list.push(entry)
    } else {
      groups.set(entry.fuelStation, [entry])
    }
  }

  return Array.from(groups.entries())
    .map(([station, entries]) => ({
      station,
      fillCount: entries.length,
      averageMileage: average(entries.filter((e) => e.mileage !== null).map((e) => e.mileage!)),
      averageCostPerLitre: average(
        entries.filter((e) => e.costPerLitre !== null).map((e) => e.costPerLitre!)
      ),
      totalAmountSpent: entries.reduce((sum, e) => sum + e.amountPaid, 0),
    }))
    .sort((a, b) => b.fillCount - a.fillCount)
}

/** A contiguous run of entries sharing the same calendar month, most-recent month first. */
export interface MonthGroup<T> {
  label: string
  items: T[]
}

/** Groups entries (already sorted by date, newest first) into per-month buckets for the mobile entries list. */
export function groupByMonth<T extends { date: string }>(entries: T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = []
  for (const entry of entries) {
    const label = format(parseISO(entry.date), "MMMM yyyy")
    const last = groups[groups.length - 1]
    if (last && last.label === label) {
      last.items.push(entry)
    } else {
      groups.push({ label, items: [entry] })
    }
  }
  return groups
}

export interface MileageTrend {
  /** Latest mileage as a multiple of the previous fill-up's mileage (e.g. 1.18 = 18% better). */
  ratio: number
  direction: "up" | "down" | "flat"
}

/**
 * Compares the two most recent fill-ups with a computed mileage (`derived`
 * is already odometer-ascending, so these are the last two entries with
 * `mileage !== null`) — the "vs last fill" trend shown on the overview.
 */
export function computeMileageTrend(derived: DerivedEntry[]): MileageTrend | null {
  const withMileage = derived.filter((e) => e.mileage !== null)
  if (withMileage.length < 2) return null

  const latest = withMileage[withMileage.length - 1]
  const previous = withMileage[withMileage.length - 2]
  if (!previous.mileage) return null

  const ratio = latest.mileage! / previous.mileage!
  const direction = ratio > 1.001 ? "up" : ratio < 0.999 ? "down" : "flat"
  return { ratio, direction }
}

export type TrendRange = "3M" | "6M" | "1Y" | "All"

/** Filters date-stamped rows to the trailing N months for the Trends range chips. */
export function filterByRange<T extends { date: string }>(entries: T[], range: TrendRange): T[] {
  if (range === "All") return entries
  const months = range === "3M" ? 3 : range === "6M" ? 6 : 12
  const cutoff = subMonths(new Date(), months)
  return entries.filter((e) => parseISO(e.date) >= cutoff)
}

/**
 * Checks a candidate odometer reading against the entries that would
 * surround it once sorted, so mileage math for both this entry and its
 * neighbor stays valid. Pass `excludeId` when editing an existing entry so
 * it doesn't collide with itself.
 */
export function getOdometerWarning(
  entries: FuelEntry[],
  odometerReading: number,
  excludeId?: string
): string | null {
  const others = sortByOdometer(entries.filter((e) => e.id !== excludeId))
  const next = others.find((e) => e.odometerReading >= odometerReading)

  if (next) {
    if (next.odometerReading === odometerReading) {
      return `Another entry on ${next.date} already has this exact odometer reading.`
    }
    return `Must be less than the next entry's reading of ${next.odometerReading.toLocaleString()} km.`
  }

  const previous = others.at(-1)
  if (previous && odometerReading <= previous.odometerReading) {
    return `Must be greater than the previous entry's reading of ${previous.odometerReading.toLocaleString()} km.`
  }

  return null
}
