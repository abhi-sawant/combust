package com.slowatcoding.combust.core

import kotlinx.serialization.Serializable

/** A vehicle whose fuel entries are tracked as one odometer timeline. */
@Serializable
data class Vehicle(
    val id: String,
    val name: String,
    val plate: String? = null,
    /** ISO-8601 UTC timestamp used to order vehicles chronologically. */
    val createdAt: String,
)

/** A single fuel fill-up. Mirrors `web/src/types/entry.ts`. */
@Serializable
data class FuelEntry(
    val id: String,
    val vehicleId: String,
    /** `yyyy-MM-dd`. */
    val date: String,
    val odometerReading: Double,
    val fuelStation: String,
    val amountPaid: Double,
    val litresFilled: Double,
    val isFullTank: Boolean = true,
    val missedPrevious: Boolean = false,
)

/** Fields needed to create or edit an entry; id/vehicleId are assigned by the repository. */
data class FuelEntryInput(
    val date: String,
    val odometerReading: Double,
    val fuelStation: String,
    val amountPaid: Double,
    val litresFilled: Double,
    val isFullTank: Boolean = true,
    val missedPrevious: Boolean = false,
)

/**
 * A fuel entry with mileage/cost figures derived per tank cycle. `null` figures mean
 * "not computable" (open cycle, partial fill, missed fill, regressed reading), not an error.
 */
data class DerivedEntry(
    val entry: FuelEntry,
    /** The latest full fill whose cycle hasn't been closed by a later full fill yet. */
    val isPending: Boolean = false,
    val isPartial: Boolean = false,
    /** Starts a cycle that can't be measured because a fill-up in it was never logged. */
    val hasGap: Boolean = false,
    /** The next entry's odometer reading is <= this entry's. */
    val isOdometerRegression: Boolean = false,
    val distanceCovered: Double? = null,
    val mileage: Double? = null,
    val costPerLitre: Double? = null,
) {
    val id: String get() = entry.id
    val date: String get() = entry.date
    val odometerReading: Double get() = entry.odometerReading
    val fuelStation: String get() = entry.fuelStation
    val amountPaid: Double get() = entry.amountPaid
    val litresFilled: Double get() = entry.litresFilled
    val isFullTank: Boolean get() = entry.isFullTank
    val missedPrevious: Boolean get() = entry.missedPrevious
}

data class OverallStats(
    val averageMileage: Double?,
    val bestMileageEntry: DerivedEntry?,
    val worstMileageEntry: DerivedEntry?,
    val totalLitresFilled: Double,
    val totalAmountSpent: Double,
    val averageCostPerLitre: Double?,
    val totalDistanceCovered: Double,
    val entryCount: Int,
)

data class StationStats(
    val station: String,
    val fillCount: Int,
    val averageMileage: Double?,
    val averageCostPerLitre: Double?,
    val totalAmountSpent: Double,
)
