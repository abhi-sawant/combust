package com.slowatcoding.combust.core

/**
 * Low-level persistence for vehicles, entries and sync metadata. Implemented with Room on Android
 * and in memory for tests. [transaction] must make the block atomic with respect to other callers.
 */
interface RecordStore {
    suspend fun <R> transaction(block: suspend () -> R): R

    suspend fun allVehicles(): List<StoredVehicle>
    suspend fun vehicle(id: String): StoredVehicle?
    suspend fun putVehicles(vehicles: List<StoredVehicle>)

    suspend fun allEntries(): List<StoredEntry>
    suspend fun entriesForVehicle(vehicleId: String): List<StoredEntry>
    suspend fun entry(id: String): StoredEntry?
    suspend fun putEntries(entries: List<StoredEntry>)

    suspend fun clearRecords()

    suspend fun getMeta(key: String): String?
    suspend fun setMeta(key: String, value: String)
    suspend fun deleteMeta(key: String)
}
