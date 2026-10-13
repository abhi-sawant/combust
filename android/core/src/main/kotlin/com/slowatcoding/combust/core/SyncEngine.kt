package com.slowatcoding.combust.core

import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.CompletableDeferred

/** Network side of sync, implemented with OkHttp on Android and faked in tests. */
fun interface SyncApi {
    suspend fun sync(request: SyncRequest): SyncResponse
}

private const val CURSOR_KEY = "syncCursor"
private const val LAST_SYNCED_KEY = "lastSyncedAt"
private const val LINKED_EMAIL_KEY = "linkedEmail"

/**
 * Pushes local changes to the cloud account and pulls remote ones. Local data is the primary copy;
 * conflicts resolve per record by last-write-wins on `updatedAt`. Concurrent calls share one run.
 * Port of `web/src/lib/sync.ts`.
 */
class SyncEngine(
    private val store: RecordStore,
    private val local: LocalData,
    private val api: SyncApi,
    private val clock: Clock = Clock.System,
) {
    private val inFlight = AtomicReference<CompletableDeferred<Unit>?>(null)

    /** True once this device has completed a sync with the current cloud account. */
    suspend fun hasSynced(): Boolean = store.getMeta(CURSOR_KEY) != null

    suspend fun lastSyncedAt(): Long? = store.getMeta(LAST_SYNCED_KEY)?.toLongOrNull()

    /** Forget the sync position (on sign-out) so the next sign-in re-uploads everything and pulls fresh. */
    suspend fun resetSyncState() {
        store.deleteMeta(CURSOR_KEY)
        store.deleteMeta(LAST_SYNCED_KEY)
    }

    /**
     * Call when an account signs in, before any sync. If the data on this device was last linked to a
     * different account it is erased first, so one account's data never uploads into another's.
     * Data never linked to any account (pure local use) is kept and merges into this account.
     * Returns true if local data was erased.
     */
    suspend fun prepareForAccount(email: String): Boolean {
        val normalized = email.trim().lowercase()
        val linked = store.getMeta(LINKED_EMAIL_KEY)
        var erased = false
        if (linked != null && linked != normalized) {
            local.clearAll(keepTombstones = false)
            resetSyncState()
            erased = true
        }
        store.setMeta(LINKED_EMAIL_KEY, normalized)
        return erased
    }

    /** Runs one sync; callers arriving during a run await that same run. Throws on failure. */
    suspend fun syncNow() {
        val mine = CompletableDeferred<Unit>()
        val running = inFlight.compareAndExchange(null, mine) ?: run {
            try {
                runSync()
                mine.complete(Unit)
            } catch (t: Throwable) {
                mine.completeExceptionally(t)
            } finally {
                inFlight.set(null)
            }
            return mine.await()
        }
        running.await()
    }

    private suspend fun runSync() {
        var cursor = store.getMeta(CURSOR_KEY)?.toLongOrNull()
        if (cursor == null) {
            // First sync with this account: upload everything on the device.
            markAllDirty()
            cursor = 0
        }

        val dirtyVehicles = store.allVehicles().filter { it.dirty }
        val dirtyEntries = store.allEntries().filter { it.dirty }

        val response = api.sync(
            SyncRequest(
                cursor = cursor,
                vehicles = dirtyVehicles.map { it.toWire() },
                entries = dirtyEntries.map { it.toWire() },
            ),
        )

        val changed = applySyncResult(
            response,
            pushedVehicles = dirtyVehicles.associate { it.id to it.updatedAt },
            pushedEntries = dirtyEntries.associate { it.id to it.updatedAt },
        )

        store.setMeta(CURSOR_KEY, response.cursor.toString())
        store.setMeta(LAST_SYNCED_KEY, clock.nowMs().toString())
        if (changed) local.notifyChange(ChangeSource.Remote)
    }

    private suspend fun markAllDirty() = store.transaction {
        store.putVehicles(store.allVehicles().map { it.copy(dirty = true) })
        store.putEntries(store.allEntries().map { it.copy(dirty = true) })
    }

    /**
     * Applies a sync result in one transaction: remote records newer than the local copy replace it,
     * and records that were pushed unchanged stop being dirty. Returns whether local data changed.
     */
    private suspend fun applySyncResult(
        response: SyncResponse,
        pushedVehicles: Map<String, Long>,
        pushedEntries: Map<String, Long>,
    ): Boolean = store.transaction {
        var changed = false

        for (remote in response.vehicles) {
            val current = store.vehicle(remote.id)
            if (current == null || remote.updatedAt > current.updatedAt) {
                store.putVehicles(listOf(remote.toStored(dirty = false)))
                changed = true
            }
        }
        for (remote in response.entries) {
            val current = store.entry(remote.id)
            if (current == null || remote.updatedAt > current.updatedAt) {
                store.putEntries(listOf(remote.toStored(dirty = false)))
                changed = true
            }
        }

        for ((id, sentAt) in pushedVehicles) {
            val current = store.vehicle(id)
            if (current != null && current.dirty && current.updatedAt == sentAt) {
                store.putVehicles(listOf(current.copy(dirty = false)))
            }
        }
        for ((id, sentAt) in pushedEntries) {
            val current = store.entry(id)
            if (current != null && current.dirty && current.updatedAt == sentAt) {
                store.putEntries(listOf(current.copy(dirty = false)))
            }
        }
        changed
    }
}
