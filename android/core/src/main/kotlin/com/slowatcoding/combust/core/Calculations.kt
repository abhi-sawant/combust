package com.slowatcoding.combust.core

import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Entries ordered by odometer reading, the true chronological axis mileage math depends on. */
fun <T> sortByOdometer(entries: List<T>, odometer: (T) -> Double): List<T> =
    entries.sortedBy(odometer)

/**
 * Attaches distance/mileage/cost-per-litre to each entry, measured per tank cycle: from one
 * full fill to the next full fill, dividing the distance by all litres added after the first.
 * Port of `deriveEntries` in `web/src/lib/calculations.ts`; keep the two in lockstep.
 */
fun deriveEntries(entries: List<FuelEntry>): List<DerivedEntry> {
    val derived = sortByOdometer(entries) { it.odometerReading }.map { entry ->
        DerivedEntry(
            entry = entry,
            isPartial = !entry.isFullTank,
            costPerLitre = if (entry.litresFilled > 0) entry.amountPaid / entry.litresFilled else null,
        )
    }.toMutableList()

    // The full fill that opened the tank cycle currently being measured, and the litres added since.
    var anchor: Int? = null
    var litresSinceAnchor = 0.0

    for (i in derived.indices) {
        val entry = derived[i]
        val previousIdx = if (i > 0) i - 1 else null

        val isRegression = previousIdx != null && entry.odometerReading <= derived[previousIdx].odometerReading
        if (isRegression) derived[previousIdx!!] = derived[previousIdx].copy(isOdometerRegression = true)

        if (anchor != null && (isRegression || entry.missedPrevious)) {
            if (!derived[anchor].isOdometerRegression) derived[anchor] = derived[anchor].copy(hasGap = true)
            anchor = null
        }

        if (anchor != null) {
            litresSinceAnchor += entry.litresFilled
            if (entry.isFullTank) {
                val distance = entry.odometerReading - derived[anchor].odometerReading
                derived[anchor] = derived[anchor].copy(
                    distanceCovered = distance,
                    mileage = if (litresSinceAnchor > 0) distance / litresSinceAnchor else null,
                )
                anchor = i
                litresSinceAnchor = 0.0
            }
        } else if (entry.isFullTank) {
            anchor = i
            litresSinceAnchor = 0.0
        }
    }

    if (anchor != null) derived[anchor] = derived[anchor].copy(isPending = true)
    return derived
}

private fun average(values: List<Double>): Double? =
    if (values.isEmpty()) null else values.fold(0.0) { sum, v -> sum + v } / values.size

fun computeOverallStats(derived: List<DerivedEntry>): OverallStats {
    val mileages = derived.filter { it.mileage != null }
    val costs = derived.filter { it.costPerLitre != null }

    var best: DerivedEntry? = null
    var worst: DerivedEntry? = null
    for (entry in mileages) {
        if (best == null || entry.mileage!! > best.mileage!!) best = entry
        if (worst == null || entry.mileage!! < worst.mileage!!) worst = entry
    }

    return OverallStats(
        averageMileage = average(mileages.map { it.mileage!! }),
        bestMileageEntry = best,
        worstMileageEntry = worst,
        totalLitresFilled = derived.fold(0.0) { s, e -> s + e.litresFilled },
        totalAmountSpent = derived.fold(0.0) { s, e -> s + e.amountPaid },
        averageCostPerLitre = average(costs.map { it.costPerLitre!! }),
        totalDistanceCovered = derived.fold(0.0) { s, e -> s + (e.distanceCovered ?: 0.0) },
        entryCount = derived.size,
    )
}

/** Groups derived entries by station, most-used first (stable for ties, like the web sort). */
fun computeStationStats(derived: List<DerivedEntry>): List<StationStats> {
    val groups = LinkedHashMap<String, MutableList<DerivedEntry>>()
    for (entry in derived) groups.getOrPut(entry.fuelStation) { mutableListOf() }.add(entry)

    return groups.map { (station, entries) ->
        StationStats(
            station = station,
            fillCount = entries.size,
            averageMileage = average(entries.mapNotNull { it.mileage }),
            averageCostPerLitre = average(entries.mapNotNull { it.costPerLitre }),
            totalAmountSpent = entries.fold(0.0) { s, e -> s + e.amountPaid },
        )
    }.sortedByDescending { it.fillCount }
}

/** A contiguous run of entries sharing the same calendar month. */
data class MonthGroup<T>(val label: String, val items: List<T>)

private val MONTH_LABEL = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH)

/** Groups entries (already sorted by date, newest first) into per-month buckets. */
fun <T> groupByMonth(entries: List<T>, date: (T) -> String): List<MonthGroup<T>> {
    val groups = mutableListOf<Pair<String, MutableList<T>>>()
    for (entry in entries) {
        val label = LocalDate.parse(date(entry)).format(MONTH_LABEL)
        val last = groups.lastOrNull()
        if (last != null && last.first == label) last.second.add(entry)
        else groups.add(label to mutableListOf(entry))
    }
    return groups.map { MonthGroup(it.first, it.second) }
}

enum class TrendDirection { UP, DOWN, FLAT }

data class MileageTrend(val ratio: Double, val direction: TrendDirection)

/** Compares the two most recent fill-ups that have a mileage. */
fun computeMileageTrend(derived: List<DerivedEntry>): MileageTrend? {
    val withMileage = derived.filter { it.mileage != null }
    if (withMileage.size < 2) return null
    val latest = withMileage[withMileage.size - 1]
    val previous = withMileage[withMileage.size - 2]
    val prev = previous.mileage
    if (prev == null || prev == 0.0) return null
    val ratio = latest.mileage!! / prev
    val direction = when {
        ratio > 1.001 -> TrendDirection.UP
        ratio < 0.999 -> TrendDirection.DOWN
        else -> TrendDirection.FLAT
    }
    return MileageTrend(ratio, direction)
}

enum class TrendRange(val label: String, val months: Int?) {
    ThreeMonths("3M", 3),
    SixMonths("6M", 6),
    OneYear("1Y", 12),
    All("All", null),
}

/** Filters date-stamped rows to the trailing N months for the Trends range chips. */
fun <T> filterByRange(
    entries: List<T>,
    range: TrendRange,
    today: LocalDate = LocalDate.now(),
    date: (T) -> String,
): List<T> {
    val months = range.months ?: return entries
    val cutoff = today.minusMonths(months.toLong())
    return entries.filter { !LocalDate.parse(date(it)).isBefore(cutoff) }
}

/** Formats a number like JS `toLocaleString()` (grouping, up to 3 fraction digits). */
fun localeNumber(value: Double, locale: Locale = Locale.getDefault()): String =
    NumberFormat.getNumberInstance(locale).apply {
        minimumFractionDigits = 0
        maximumFractionDigits = 3
    }.format(value)

/**
 * Checks a candidate odometer reading against the entries that would surround it once sorted,
 * so mileage math for both this entry and its neighbour stays valid. Pass [excludeId] when
 * editing an existing entry.
 */
fun getOdometerWarning(
    entries: List<FuelEntry>,
    odometerReading: Double,
    excludeId: String? = null,
    locale: Locale = Locale.getDefault(),
): String? {
    val others = sortByOdometer(entries.filter { it.id != excludeId }) { it.odometerReading }
    val next = others.firstOrNull { it.odometerReading >= odometerReading }

    if (next != null) {
        if (next.odometerReading == odometerReading) {
            return "Another entry on ${next.date} already has this exact odometer reading."
        }
        return "Must be less than the next entry's reading of ${localeNumber(next.odometerReading, locale)} km."
    }

    val previous = others.lastOrNull()
    if (previous != null && odometerReading <= previous.odometerReading) {
        return "Must be greater than the previous entry's reading of ${localeNumber(previous.odometerReading, locale)} km."
    }
    return null
}
