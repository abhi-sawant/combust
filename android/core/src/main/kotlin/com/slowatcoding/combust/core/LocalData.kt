package com.slowatcoding.combust.core

import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.UUID
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

enum class ChangeSource { Local, Remote }

fun interface Clock {
    fun nowMs(): Long

    companion object {
        val System = Clock { java.lang.System.currentTimeMillis() }
    }
}

private val ISO_MILLIS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC)

/** Millisecond ISO-8601 UTC, same shape as JS `Date.toISOString()`. */
fun isoTimestamp(epochMs: Long): String = ISO_MILLIS.format(Instant.ofEpochMilli(epochMs))

/**
 * The app's source of truth. Everything is read from and written to the [RecordStore], whether or
 * not a cloud account is linked; [SyncEngine] replicates changes in the background.
 * Port of `web/src/lib/local-db.ts`.
 */
class LocalData(
    private val store: RecordStore,
    private val clock: Clock = Clock.System,
    private val newId: () -> String = { UUID.randomUUID().toString() },
) {
    private val _changes = MutableSharedFlow<ChangeSource>(extraBufferCapacity = 64)

    /** "Local" for user edits, "Remote" for changes pulled by sync. */
    val changes: SharedFlow<ChangeSource> = _changes.asSharedFlow()

    fun notifyChange(source: ChangeSource) {
        _changes.tryEmit(source)
    }

    /** Always strictly after the previous stamp, so quick successive edits on one device still win. */
    private fun nextStamp(previous: Long) = maxOf(clock.nowMs(), previous + 1)

    // --- Entries -------------------------------------------------------------

    suspend fun entries(vehicleId: String): List<FuelEntry> =
        store.entriesForVehicle(vehicleId)
            .filter { it.deletedAt == null }
            .map { it.toEntry() }
            .sortedBy { it.odometerReading }

    suspend fun addEntry(input: FuelEntryInput, vehicleId: String): FuelEntry {
        val record = input.toStored(newId(), vehicleId, clock.nowMs())
        store.putEntries(listOf(record))
        notifyChange(ChangeSource.Local)
        return record.toEntry()
    }

    suspend fun updateEntry(id: String, input: FuelEntryInput, vehicleId: String): FuelEntry {
        val existing = store.entry(id)
        if (existing == null || existing.deletedAt != null) error("Entry not found")
        val record = existing.copy(
            vehicleId = vehicleId,
            date = input.date,
            odometerReading = input.odometerReading,
            fuelStation = input.fuelStation,
            amountPaid = input.amountPaid,
            litresFilled = input.litresFilled,
            isFullTank = input.isFullTank,
            missedPrevious = input.missedPrevious,
            updatedAt = nextStamp(existing.updatedAt),
            dirty = true,
        )
        store.putEntries(listOf(record))
        notifyChange(ChangeSource.Local)
        return record.toEntry()
    }

    suspend fun deleteEntry(id: String) {
        val existing = store.entry(id) ?: return
        if (existing.deletedAt != null) return
        val now = nextStamp(existing.updatedAt)
        store.putEntries(listOf(existing.copy(deletedAt = now, updatedAt = now, dirty = true)))
        notifyChange(ChangeSource.Local)
    }

    /** Bulk-inserts entries (e.g. from CSV import) in a single transaction. */
    suspend fun bulkAddEntries(inputs: List<FuelEntryInput>, vehicleId: String): List<FuelEntry> {
        val now = clock.nowMs()
        val records = inputs.map { it.toStored(newId(), vehicleId, now) }
        store.transaction { store.putEntries(records) }
        notifyChange(ChangeSource.Local)
        return records.map { it.toEntry() }
    }

    private fun FuelEntryInput.toStored(id: String, vehicleId: String, now: Long) = StoredEntry(
        id = id,
        vehicleId = vehicleId,
        date = date,
        odometerReading = odometerReading,
        fuelStation = fuelStation,
        amountPaid = amountPaid,
        litresFilled = litresFilled,
        isFullTank = isFullTank,
        missedPrevious = missedPrevious,
        updatedAt = now,
        deletedAt = null,
        dirty = true,
    )

    // --- Vehicles ------------------------------------------------------------

    suspend fun vehicles(): List<Vehicle> =
        store.allVehicles()
            .filter { it.deletedAt == null }
            .sortedBy { it.createdAt }
            .map { it.toVehicle() }

    suspend fun addVehicle(name: String, plate: String?): Vehicle {
        val now = clock.nowMs()
        val record = StoredVehicle(
            id = newId(),
            name = name,
            plate = plate?.takeIf { it.isNotBlank() },
            createdAt = isoTimestamp(now),
            updatedAt = now,
            deletedAt = null,
            dirty = true,
        )
        store.putVehicles(listOf(record))
        notifyChange(ChangeSource.Local)
        return record.toVehicle()
    }

    suspend fun updateVehicle(id: String, name: String, plate: String?): Vehicle {
        val existing = store.vehicle(id)
        if (existing == null || existing.deletedAt != null) error("Vehicle not found")
        val record = existing.copy(
            name = name,
            plate = plate?.takeIf { it.isNotBlank() },
            updatedAt = nextStamp(existing.updatedAt),
            dirty = true,
        )
        store.putVehicles(listOf(record))
        notifyChange(ChangeSource.Local)
        return record.toVehicle()
    }

    /** Tombstones the vehicle and all of its entries with one stamp. */
    suspend fun deleteVehicle(id: String) {
        val existing = store.vehicle(id) ?: return
        if (existing.deletedAt != null) return
        store.transaction {
            val now = nextStamp(existing.updatedAt)
            store.putVehicles(listOf(existing.copy(deletedAt = now, updatedAt = now, dirty = true)))
            store.putEntries(
                store.entriesForVehicle(id).filter { it.deletedAt == null }
                    .map { it.copy(deletedAt = now, updatedAt = now, dirty = true) },
            )
        }
        notifyChange(ChangeSource.Local)
    }

    // --- Whole-store helpers -------------------------------------------------

    /** Fill-up counts per live vehicle. */
    suspend fun countEntriesByVehicle(): Map<String, Int> =
        store.allEntries().filter { it.deletedAt == null }.groupingBy { it.vehicleId }.eachCount()

    /**
     * Wipes every vehicle and entry. With [keepTombstones] the records are tombstoned instead so the
     * deletion syncs to the cloud account; otherwise the tables are emptied outright.
     */
    suspend fun clearAll(keepTombstones: Boolean) {
        store.transaction {
            if (keepTombstones) {
                val now = clock.nowMs()
                store.putVehicles(
                    store.allVehicles().filter { it.deletedAt == null }
                        .map { it.copy(deletedAt = now, updatedAt = now, dirty = true) },
                )
                store.putEntries(
                    store.allEntries().filter { it.deletedAt == null }
                        .map { it.copy(deletedAt = now, updatedAt = now, dirty = true) },
                )
            } else {
                store.clearRecords()
            }
        }
        notifyChange(ChangeSource.Local)
    }
}
