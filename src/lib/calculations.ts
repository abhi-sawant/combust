import type { FuelEntry } from "@/types/entry"
import type { DerivedEntry, OverallStats, StationStats } from "@/types/stats"

/** Entries ordered by odometer reading — the true chronological axis mileage math depends on. */
export function sortByOdometer<T extends { odometerReading: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.odometerReading - b.odometerReading)
}

/**
 * Attaches distance/mileage/cost-per-litre to each entry relative to the
 * previous one by odometer order. The lowest-odometer entry is the
 * "baseline" and never has mileage. An entry whose odometer reading
 * regresses relative to its predecessor gets no distance/mileage figures
 * (they'd be meaningless), but its cost-per-litre is still computed.
 */
export function deriveEntries(entries: FuelEntry[]): DerivedEntry[] {
  const sorted = sortByOdometer(entries)

  return sorted.map((entry, index) => {
    const previous = index > 0 ? sorted[index - 1] : null
    const isBaseline = previous === null
    const isOdometerRegression =
      previous !== null && entry.odometerReading <= previous.odometerReading

    const distanceCovered =
      previous && !isOdometerRegression ? entry.odometerReading - previous.odometerReading : null

    const mileage =
      distanceCovered !== null && entry.litresFilled > 0
        ? distanceCovered / entry.litresFilled
        : null

    const costPerLitre = entry.litresFilled > 0 ? entry.amountPaid / entry.litresFilled : null

    return {
      ...entry,
      isBaseline,
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
