import { addMonths, differenceInCalendarDays, format, parseISO, subMonths } from "date-fns"

import type { FuelEntry } from "@/types/entry"
import type { ServiceItem, ServiceStatus } from "@/types/service"
import type { DerivedEntry, OverallStats, StationStats } from "@/types/stats"

/** Entries ordered by odometer reading — the true chronological axis mileage math depends on. */
export function sortByOdometer<T extends { odometerReading: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.odometerReading - b.odometerReading)
}

/**
 * Attaches distance/mileage/cost-per-litre to each entry, measured per tank
 * cycle: from one full fill to the next full fill, dividing the distance by
 * *all* litres added after the first (the later full fill plus any partial
 * fills in between). Only full-to-full cycles give an exact figure, because
 * only then is the tank level known at both ends. The cycle's mileage lands
 * on the entry that started it; partial fills have none of their own.
 *
 * A cycle is left unmeasured (and flagged) when it can't be trusted: a
 * fill-up in it was never logged (`missedPrevious`) or odometer readings
 * regress/tie. The latest full fill with no closing full fill yet is
 * "pending". Cost-per-litre is always computed per entry.
 */
export function deriveEntries(entries: FuelEntry[]): DerivedEntry[] {
  const derived: DerivedEntry[] = sortByOdometer(entries).map((entry) => ({
    ...entry,
    isPending: false,
    isPartial: !entry.isFullTank,
    hasGap: false,
    isOdometerRegression: false,
    distanceCovered: null,
    mileage: null,
    costPerLitre: entry.litresFilled > 0 ? entry.amountPaid / entry.litresFilled : null,
  }))

  // The full fill that opened the tank cycle currently being measured, and the litres added since.
  let anchor: DerivedEntry | null = null
  let litresSinceAnchor = 0

  for (let i = 0; i < derived.length; i++) {
    const entry = derived[i]
    const previous = i > 0 ? derived[i - 1] : null

    const isRegression = previous !== null && entry.odometerReading <= previous.odometerReading
    if (isRegression) previous!.isOdometerRegression = true

    if (anchor && (isRegression || entry.missedPrevious)) {
      if (!anchor.isOdometerRegression) anchor.hasGap = true
      anchor = null
    }

    if (anchor) {
      litresSinceAnchor += entry.litresFilled
      if (entry.isFullTank) {
        const distance = entry.odometerReading - anchor.odometerReading
        anchor.distanceCovered = distance
        anchor.mileage = litresSinceAnchor > 0 ? distance / litresSinceAnchor : null
        anchor = entry
        litresSinceAnchor = 0
      }
    } else if (entry.isFullTank) {
      anchor = entry
      litresSinceAnchor = 0
    }
  }

  if (anchor) anchor.isPending = true

  return derived
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

/** An item becomes "due soon" once this many km or days remain. */
export const SERVICE_DUE_SOON_KM = 500
export const SERVICE_DUE_SOON_DAYS = 30

/** The vehicle's current odometer: the highest reading among its fuel entries, or null with none. */
export function latestOdometer(entries: { odometerReading: number }[]): number | null {
  return entries.length === 0 ? null : Math.max(...entries.map((e) => e.odometerReading))
}

/**
 * How due a service item is. Due when either interval is reached: `intervalKm` after the last change
 * odometer, `intervalMonths` after the last change date. `today` is "yyyy-MM-dd". A dimension that
 * can't be computed (no interval, no last change, no current odometer) is ignored; with neither the
 * status is "unknown". Passed (< 0 remaining) is overdue; ≤ 500 km or ≤ 30 days is due soon.
 */
export function computeServiceStatus(
  item: Pick<ServiceItem, "lastChangedDate" | "lastChangedOdometer" | "intervalKm" | "intervalMonths">,
  currentOdometer: number | null,
  today: string
): ServiceStatus {
  const nextDueOdometer =
    item.intervalKm !== null && item.lastChangedOdometer !== null ? item.lastChangedOdometer + item.intervalKm : null
  const nextDueDate =
    item.intervalMonths !== null && item.lastChangedDate !== null
      ? format(addMonths(parseISO(item.lastChangedDate), item.intervalMonths), "yyyy-MM-dd")
      : null

  const kmRemaining = nextDueOdometer !== null && currentOdometer !== null ? nextDueOdometer - currentOdometer : null
  const daysRemaining = nextDueDate !== null ? differenceInCalendarDays(parseISO(nextDueDate), parseISO(today)) : null

  let status: ServiceStatus["status"]
  if (kmRemaining === null && daysRemaining === null) status = "unknown"
  else if ((kmRemaining ?? 0) < 0 || (daysRemaining ?? 0) < 0) status = "overdue"
  else if (
    (kmRemaining !== null && kmRemaining <= SERVICE_DUE_SOON_KM) ||
    (daysRemaining !== null && daysRemaining <= SERVICE_DUE_SOON_DAYS)
  )
    status = "dueSoon"
  else status = "ok"

  return { status, nextDueOdometer, nextDueDate, kmRemaining, daysRemaining }
}

const STATUS_RANK = { overdue: 0, dueSoon: 1, ok: 2, unknown: 3 } as const

/** Most urgent first: overdue, due soon, ok, unknown; then fewest days left, fewest km left, then name. */
export function sortByDue<T extends { name: string; status: ServiceStatus }>(rows: T[]): T[] {
  const nullsLast = (n: number | null) => n ?? Number.POSITIVE_INFINITY
  return [...rows].sort(
    (a, b) =>
      STATUS_RANK[a.status.status] - STATUS_RANK[b.status.status] ||
      nullsLast(a.status.daysRemaining) - nullsLast(b.status.daysRemaining) ||
      nullsLast(a.status.kmRemaining) - nullsLast(b.status.kmRemaining) ||
      a.name.localeCompare(b.name)
  )
}
