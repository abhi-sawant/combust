package com.slowatcoding.combust.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import com.slowatcoding.combust.core.StoredEntry
import com.slowatcoding.combust.core.StoredVehicle

@Entity(tableName = "vehicles")
data class VehicleRow(
    @PrimaryKey val id: String,
    val name: String,
    val plate: String?,
    val createdAt: String,
    val updatedAt: Long,
    val deletedAt: Long?,
    val dirty: Boolean,
) {
    fun toStored() = StoredVehicle(id, name, plate, createdAt, updatedAt, deletedAt, dirty)
}

@Entity(tableName = "entries", indices = [Index("vehicleId")])
data class EntryRow(
    @PrimaryKey val id: String,
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
    fun toStored() = StoredEntry(
        id, vehicleId, date, odometerReading, fuelStation, amountPaid, litresFilled,
        isFullTank, missedPrevious, updatedAt, deletedAt, dirty,
    )
}

@Entity(tableName = "meta")
data class MetaRow(@PrimaryKey val key: String, val value: String)

fun StoredVehicle.toRow() = VehicleRow(id, name, plate, createdAt, updatedAt, deletedAt, dirty)

fun StoredEntry.toRow() = EntryRow(
    id, vehicleId, date, odometerReading, fuelStation, amountPaid, litresFilled,
    isFullTank, missedPrevious, updatedAt, deletedAt, dirty,
)
