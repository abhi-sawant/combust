package com.slowatcoding.combust.core

import kotlinx.serialization.Serializable

/**
 * Sync bookkeeping stored next to every record (see spec/sync-format.md).
 * `dirty` is local-only and never sent.
 */
data class StoredVehicle(
    val id: String,
    val name: String,
    val plate: String?,
    val createdAt: String,
    val updatedAt: Long,
    val deletedAt: Long?,
    val dirty: Boolean,
) {
    fun toVehicle() = Vehicle(id = id, name = name, plate = plate, createdAt = createdAt)
    fun toWire() = WireVehicle(id, name, plate, createdAt, updatedAt, deletedAt)
}

data class StoredEntry(
    val id: String,
    val vehicleId: String,
    val date: String,
    val odometerReading: Double,
    val fuelStation: String,
    val amountPaid: Double,
    val litresFilled: Double,
    val isFullTank: Boolean,
    val missedPrevious: Boolean,
    val updatedAt: Long,
    val deletedAt: Long?,
    val dirty: Boolean,
) {
    fun toEntry() = FuelEntry(
        id, vehicleId, date, odometerReading, fuelStation, amountPaid, litresFilled, isFullTank, missedPrevious,
    )

    fun toWire() = WireEntry(
        id, vehicleId, date, odometerReading, fuelStation, amountPaid, litresFilled,
        isFullTank, missedPrevious, updatedAt, deletedAt,
    )
}

/** `POST /sync` vehicle shape. */
@Serializable
data class WireVehicle(
    val id: String,
    val name: String,
    val plate: String? = null,
    val createdAt: String,
    val updatedAt: Long,
    val deletedAt: Long? = null,
) {
    fun toStored(dirty: Boolean) = StoredVehicle(id, name, plate, createdAt, updatedAt, deletedAt, dirty)
}

/** `POST /sync` entry shape. */
@Serializable
data class WireEntry(
    val id: String,
    val vehicleId: String,
    val date: String,
    val odometerReading: Double,
    val fuelStation: String,
    val amountPaid: Double,
    val litresFilled: Double,
    val isFullTank: Boolean = true,
    val missedPrevious: Boolean = false,
    val updatedAt: Long,
    val deletedAt: Long? = null,
) {
    fun toStored(dirty: Boolean) = StoredEntry(
        id, vehicleId, date, odometerReading, fuelStation, amountPaid, litresFilled,
        isFullTank, missedPrevious, updatedAt, deletedAt, dirty,
    )
}

@Serializable
data class SyncRequest(
    val cursor: Long,
    val vehicles: List<WireVehicle>,
    val entries: List<WireEntry>,
    val services: List<WireServiceItem>,
)

@Serializable
data class SyncResponse(
    val cursor: Long,
    val vehicles: List<WireVehicle> = emptyList(),
    val entries: List<WireEntry> = emptyList(),
    /** Absent when talking to a backend that predates service items. */
    val services: List<WireServiceItem> = emptyList(),
)

data class StoredServiceItem(
    val id: String,
    val vehicleId: String,
    val name: String,
    val lastChangedDate: String?,
    val lastChangedOdometer: Double?,
    val intervalKm: Double?,
    val intervalMonths: Int?,
    val notes: String?,
    val updatedAt: Long,
    val deletedAt: Long?,
    val dirty: Boolean,
) {
    fun toItem() = ServiceItem(
        id, vehicleId, name, lastChangedDate, lastChangedOdometer, intervalKm, intervalMonths, notes,
    )

    fun toWire() = WireServiceItem(
        id, vehicleId, name, lastChangedDate, lastChangedOdometer, intervalKm, intervalMonths, notes,
        updatedAt, deletedAt,
    )
}

/** `POST /sync` service item shape. */
@Serializable
data class WireServiceItem(
    val id: String,
    val vehicleId: String,
    val name: String,
    val lastChangedDate: String? = null,
    val lastChangedOdometer: Double? = null,
    val intervalKm: Double? = null,
    val intervalMonths: Int? = null,
    val notes: String? = null,
    val updatedAt: Long,
    val deletedAt: Long? = null,
) {
    fun toStored(dirty: Boolean) = StoredServiceItem(
        id, vehicleId, name, lastChangedDate, lastChangedOdometer, intervalKm, intervalMonths, notes,
        updatedAt, deletedAt, dirty,
    )
}
