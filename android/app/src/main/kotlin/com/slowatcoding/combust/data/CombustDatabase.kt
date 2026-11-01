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
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.slowatcoding.combust.core.StoredEntry
import com.slowatcoding.combust.core.StoredServiceItem
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

    @Query("SELECT * FROM services") suspend fun services(): List<ServiceRow>
    @Query("SELECT * FROM services WHERE vehicleId = :vehicleId") suspend fun servicesForVehicle(vehicleId: String): List<ServiceRow>
    @Query("SELECT * FROM services WHERE id = :id") suspend fun service(id: String): ServiceRow?
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putServices(rows: List<ServiceRow>)

    @Query("DELETE FROM vehicles") suspend fun clearVehicles()
    @Query("DELETE FROM entries") suspend fun clearEntries()
    @Query("DELETE FROM services") suspend fun clearServices()

    @Query("SELECT value FROM meta WHERE `key` = :key") suspend fun meta(key: String): String?
    @Query("SELECT * FROM meta WHERE `key` LIKE :prefix || '%'") suspend fun metaWithPrefix(prefix: String): List<MetaRow>
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun putMeta(row: MetaRow)
    @Query("DELETE FROM meta WHERE `key` = :key") suspend fun deleteMeta(key: String)
}

@Database(entities = [VehicleRow::class, EntryRow::class, ServiceRow::class, MetaRow::class], version = 2, exportSchema = true)
abstract class CombustDatabase : RoomDatabase() {
    abstract fun records(): RecordsDao

    companion object {
        fun create(context: Context): CombustDatabase =
            Room.databaseBuilder(context, CombustDatabase::class.java, "combust.db")
                .addMigrations(MIGRATION_1_2)
                .build()

        /** v2 adds the `services` table (service / part-replacement tracker). */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    "CREATE TABLE IF NOT EXISTS `services` (`id` TEXT NOT NULL, `vehicleId` TEXT NOT NULL, " +
                        "`name` TEXT NOT NULL, `lastChangedDate` TEXT, `lastChangedOdometer` REAL, `intervalKm` REAL, " +
                        "`intervalMonths` INTEGER, `notes` TEXT, `updatedAt` INTEGER NOT NULL, `deletedAt` INTEGER, " +
                        "`dirty` INTEGER NOT NULL, PRIMARY KEY(`id`))",
                )
                db.execSQL("CREATE INDEX IF NOT EXISTS `index_services_vehicleId` ON `services` (`vehicleId`)")
            }
        }
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

    override suspend fun allServices(): List<StoredServiceItem> = dao.services().map { it.toStored() }
    override suspend fun servicesForVehicle(vehicleId: String): List<StoredServiceItem> =
        dao.servicesForVehicle(vehicleId).map { it.toStored() }
    override suspend fun service(id: String): StoredServiceItem? = dao.service(id)?.toStored()
    override suspend fun putServices(services: List<StoredServiceItem>) {
        if (services.isNotEmpty()) dao.putServices(services.map { it.toRow() })
    }

    override suspend fun clearRecords() {
        dao.clearVehicles()
        dao.clearEntries()
        dao.clearServices()
    }

    suspend fun allMetaWithPrefix(prefix: String): Map<String, String> =
        dao.metaWithPrefix(prefix).associate { it.key to it.value }

    override suspend fun getMeta(key: String): String? = dao.meta(key)
    override suspend fun setMeta(key: String, value: String) = dao.putMeta(MetaRow(key, value))
    override suspend fun deleteMeta(key: String) = dao.deleteMeta(key)
}
