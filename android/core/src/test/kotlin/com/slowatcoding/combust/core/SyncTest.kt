package com.slowatcoding.combust.core

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InMemoryStore : RecordStore {
    val vehicles = LinkedHashMap<String, StoredVehicle>()
    val entries = LinkedHashMap<String, StoredEntry>()
    val meta = HashMap<String, String>()
    override suspend fun <R> transaction(block: suspend () -> R): R = block()
    override suspend fun allVehicles() = vehicles.values.toList()
    override suspend fun vehicle(id: String) = vehicles[id]
    override suspend fun putVehicles(vehicles: List<StoredVehicle>) { vehicles.forEach { this.vehicles[it.id] = it } }
    override suspend fun allEntries() = entries.values.toList()
    override suspend fun entriesForVehicle(vehicleId: String) = entries.values.filter { it.vehicleId == vehicleId }
    override suspend fun entry(id: String) = entries[id]
    override suspend fun putEntries(entries: List<StoredEntry>) { entries.forEach { this.entries[it.id] = it } }
    override suspend fun clearRecords() { vehicles.clear(); entries.clear() }
    override suspend fun getMeta(key: String) = meta[key]
    override suspend fun setMeta(key: String, value: String) { meta[key] = value }
    override suspend fun deleteMeta(key: String) { meta.remove(key) }
}

/** Mimics SyncController: last-write-wins by updatedAt, cursor on server time, inclusive pull. */
class FakeServer(var now: Long = 1_000_000) : SyncApi {
    val vehicles = LinkedHashMap<String, Pair<WireVehicle, Long>>()
    val entries = LinkedHashMap<String, Pair<WireEntry, Long>>()
    var failNext = false
    var calls = 0

    override suspend fun sync(request: SyncRequest): SyncResponse {
        calls++
        if (failNext) { failNext = false; error("offline") }
        now += 10
        for (v in request.vehicles) {
            val cur = vehicles[v.id]
            if (cur == null || v.updatedAt > cur.first.updatedAt) vehicles[v.id] = v to now
        }
        for (e in request.entries) {
            val cur = entries[e.id]
            if (cur == null || e.updatedAt > cur.first.updatedAt) entries[e.id] = e to now
        }
        return SyncResponse(
            cursor = now,
            vehicles = vehicles.values.filter { it.second >= request.cursor }.map { it.first },
            entries = entries.values.filter { it.second >= request.cursor }.map { it.first },
        )
    }
}

class SyncTest {
    private class Device(val server: FakeServer, val clock: MutableClock, prefix: String) {
        val store = InMemoryStore()
        var counter = 0
        val local = LocalData(store, clock, { "$prefix-${++counter}".padEnd(36, '0') })
        val sync = SyncEngine(store, local, server, clock)
    }

    private class MutableClock(var t: Long) : Clock { override fun nowMs() = t }

    private fun input(odo: Double) = FuelEntryInput("2026-01-01", odo, "HP", 500.0, 5.0)

    @Test
    fun localCrudAndTombstones() = runBlocking {
        val d = Device(FakeServer(), MutableClock(1000), "a")
        val v = d.local.addVehicle("Bike", " ")
        assertNull(v.plate)
        val e = d.local.addEntry(input(1000.0), v.id)
        d.local.addEntry(input(500.0), v.id)
        assertEquals(listOf(500.0, 1000.0), d.local.entries(v.id).map { it.odometerReading })

        d.clock.t = 5000
        d.local.updateEntry(e.id, input(1200.0), v.id)
        assertEquals(5000, d.store.entries[e.id]!!.updatedAt)
        // A same-millisecond edit must still be strictly newer.
        d.local.updateEntry(e.id, input(1300.0), v.id)
        assertEquals(5001, d.store.entries[e.id]!!.updatedAt)

        d.local.deleteVehicle(v.id)
        assertTrue(d.local.vehicles().isEmpty())
        assertTrue(d.local.entries(v.id).isEmpty())
        assertEquals(2, d.store.entries.values.count { it.deletedAt != null })
    }

    @Test
    fun firstSyncUploadsEverythingAndSecondDeviceReceivesIt() = runBlocking {
        val server = FakeServer()
        val a = Device(server, MutableClock(1000), "a")
        val b = Device(server, MutableClock(2000), "b")
        val v = a.local.addVehicle("Bike", "MH01")
        a.local.addEntry(input(1000.0), v.id)
        a.sync.syncNow()
        assertFalse(a.store.allEntries().any { it.dirty })
        assertTrue(a.sync.hasSynced())

        b.sync.syncNow()
        assertEquals(1, b.local.vehicles().size)
        assertEquals(1, b.local.entries(v.id).size)
    }

    @Test
    fun lastWriteWinsAndDeletesPropagate() = runBlocking {
        val server = FakeServer()
        val a = Device(server, MutableClock(1000), "a")
        val b = Device(server, MutableClock(1000), "b")
        val v = a.local.addVehicle("Bike", null)
        val e = a.local.addEntry(input(1000.0), v.id)
        a.sync.syncNow(); b.sync.syncNow()

        a.clock.t = 5000; a.local.updateEntry(e.id, input(1111.0), v.id)
        b.clock.t = 6000; b.local.updateEntry(e.id, input(2222.0), v.id)
        a.sync.syncNow()
        b.sync.syncNow()
        a.sync.syncNow()
        assertEquals(2222.0, a.local.entries(v.id).single().odometerReading, 0.0)
        assertEquals(2222.0, b.local.entries(v.id).single().odometerReading, 0.0)

        b.clock.t = 7000; b.local.deleteEntry(e.id)
        b.sync.syncNow(); a.sync.syncNow()
        assertTrue(a.local.entries(v.id).isEmpty())
    }

    @Test
    fun editDuringRequestStaysDirty() = runBlocking {
        val server = FakeServer()
        val d = Device(server, MutableClock(1000), "a")
        val v = d.local.addVehicle("Bike", null)
        val e = d.local.addEntry(input(1000.0), v.id)
        val racing = SyncEngine(d.store, d.local, { req ->
            d.clock.t = 9000
            d.local.updateEntry(e.id, input(1500.0), v.id) // edit lands while the request is in flight
            server.sync(req)
        }, d.clock)
        racing.syncNow()
        assertTrue(d.store.entry(e.id)!!.dirty)
        assertEquals(1500.0, d.store.entry(e.id)!!.odometerReading, 0.0)
    }

    @Test
    fun failedSyncKeepsLocalStateAndSharesInFlightRun() = runBlocking {
        val server = FakeServer()
        val d = Device(server, MutableClock(1000), "a")
        val v = d.local.addVehicle("Bike", null)
        server.failNext = true
        val failed = runCatching { d.sync.syncNow() }
        assertTrue(failed.isFailure)
        assertFalse(d.sync.hasSynced())
        assertTrue(d.store.vehicle(v.id)!!.dirty)
        d.sync.syncNow()
        assertTrue(d.sync.hasSynced())
        assertNotNull(d.sync.lastSyncedAt())
    }

    @Test
    fun switchingAccountsErasesOnlyLinkedData() = runBlocking {
        val d = Device(FakeServer(), MutableClock(1000), "a")
        d.local.addVehicle("Local only", null)
        assertFalse(d.sync.prepareForAccount("A@x.com")) // never linked: keep data
        assertEquals(1, d.local.vehicles().size)
        assertFalse(d.sync.prepareForAccount(" a@x.com ")) // same account
        assertEquals(1, d.local.vehicles().size)
        assertTrue(d.sync.prepareForAccount("b@x.com")) // different account: wipe
        assertTrue(d.local.vehicles().isEmpty())
    }

    @Test
    fun clearAllKeepsTombstonesWhenSignedIn() = runBlocking {
        val server = FakeServer()
        val a = Device(server, MutableClock(1000), "a")
        val b = Device(server, MutableClock(1000), "b")
        val v = a.local.addVehicle("Bike", null)
        a.local.addEntry(input(1000.0), v.id)
        a.sync.syncNow(); b.sync.syncNow()
        a.clock.t = 3000
        a.local.clearAll(keepTombstones = true)
        a.sync.syncNow(); b.sync.syncNow()
        assertTrue(b.local.vehicles().isEmpty())
    }
}
