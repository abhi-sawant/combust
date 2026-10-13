package com.slowatcoding.combust.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.withTransaction
import com.slowatcoding.combust.core.RecordStore
import com.slowatcoding.combust.core.StoredEntry
import com.slowatcoding.combust.core.StoredVehicle

@Dao
interface RecordsDao {
    @Query("SELECT * FROM vehicles") suspend fun vehicles(): List<VehicleRow>
    @Query("SELECT * FROM vehicles WHERE id = :id") suspend fun vehicle(id: String): VehicleRow?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putVehicles(rows: List<VehicleRow>)

    @Query("SELECT * FROM entries") suspend fun entries(): List<EntryRow>
    @Query("SELECT * FROM entries WHERE vehicleId = :vehicleId") suspend fun entriesForVehicle(vehicleId: String): List<EntryRow>
    @Query("SELECT * FROM entries WHERE id = :id") suspend fun entry(id: String): EntryRow?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putEntries(rows: List<EntryRow>)

    @Query("DELETE FROM vehicles") suspend fun clearVehicles()
    @Query("DELETE FROM entries") suspend fun clearEntries()

    @Query("SELECT value FROM meta WHERE `key` = :key") suspend fun meta(key: String): String?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putMeta(row: MetaRow)
    @Query("DELETE FROM meta WHERE `key` = :key") suspend fun deleteMeta(key: String)
}

@Database(entities = [VehicleRow::class, EntryRow::class, MetaRow::class], version = 1, exportSchema = true)
abstract class CombustDatabase : RoomDatabase() {
    abstract fun records(): RecordsDao

    companion object {
        fun create(context: Context): CombustDatabase =
            Room.databaseBuilder(context, CombustDatabase::class.java, "combust.db").build()
    }
}

/** Room-backed [RecordStore]. */
class RoomRecordStore(private val db: CombustDatabase) : RecordStore {
    private val dao = db.records()

    override suspend fun <R> transaction(block: suspend () -> R): R = db.withTransaction { block() }

    override suspend fun allVehicles(): List<StoredVehicle> = dao.vehicles().map { it.toStored() }
    override suspend fun vehicle(id: String): StoredVehicle? = dao.vehicle(id)?.toStored()
    override suspend fun putVehicles(vehicles: List<StoredVehicle>) {
        if (vehicles.isNotEmpty()) dao.putVehicles(vehicles.map { it.toRow() })
    }

    override suspend fun allEntries(): List<StoredEntry> = dao.entries().map { it.toStored() }
    override suspend fun entriesForVehicle(vehicleId: String): List<StoredEntry> =
        dao.entriesForVehicle(vehicleId).map { it.toStored() }
    override suspend fun entry(id: String): StoredEntry? = dao.entry(id)?.toStored()
    override suspend fun putEntries(entries: List<StoredEntry>) {
        if (entries.isNotEmpty()) dao.putEntries(entries.map { it.toRow() })
    }

    override suspend fun clearRecords() {
        dao.clearVehicles()
        dao.clearEntries()
    }

    override suspend fun getMeta(key: String): String? = dao.meta(key)
    override suspend fun setMeta(key: String, value: String) = dao.putMeta(MetaRow(key, value))
    override suspend fun deleteMeta(key: String) = dao.deleteMeta(key)
}
