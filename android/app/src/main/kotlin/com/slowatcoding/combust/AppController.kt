package com.slowatcoding.combust

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.slowatcoding.combust.core.ChangeSource
import com.slowatcoding.combust.core.FuelEntry
import com.slowatcoding.combust.core.FuelEntryInput
import com.slowatcoding.combust.core.LocalData
import com.slowatcoding.combust.core.SyncEngine
import com.slowatcoding.combust.core.Vehicle
import com.slowatcoding.combust.data.AuthUser
import com.slowatcoding.combust.data.CombustDatabase
import com.slowatcoding.combust.data.Prefs
import com.slowatcoding.combust.data.RoomRecordStore
import com.slowatcoding.combust.data.ThemeChoice
import com.slowatcoding.combust.net.ApiException
import com.slowatcoding.combust.net.AuthResult
import com.slowatcoding.combust.net.CombustApi
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class AuthState(
    val user: AuthUser?,
    val isLocalMode: Boolean,
    /** True while a cached token has no cached user yet, so we can't tell if the session is valid. */
    val isLoading: Boolean,
) {
    val isAuthenticated: Boolean get() = user != null
}

enum class SyncStatus { Idle, Syncing, Error }

data class SyncUi(
    val status: SyncStatus = SyncStatus.Idle,
    val lastSyncedAt: Long? = null,
    val error: String? = null,
    /** First load of an already-signed-in device: block until the first pull finishes. */
    val initializing: Boolean = false,
    /** The first pull failed, so the (empty) device data can't be trusted yet. */
    val needsFirstSync: Boolean = false,
)

private const val PERIODIC_SYNC_MS = 5 * 60 * 1000L
private const val DEBOUNCE_MS = 2000L

/**
 * Owns the app's data, auth session and sync, and exposes them as flows for Compose. Plays the role
 * of the web app's AuthProvider + SyncProvider + VehiclesProvider + EntriesProvider.
 */
class AppController(private val context: Context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    val prefs = Prefs(context)
    private val db = CombustDatabase.create(context)
    private val store = RoomRecordStore(db)
    val local = LocalData(store)
    private val api = CombustApi(BuildConfig.API_URL, tokenProvider = { prefs.token })
    private val sync = SyncEngine(store, local, api)

    private val _auth = MutableStateFlow(
        AuthState(
            user = if (prefs.token != null) prefs.user else null,
            isLocalMode = prefs.localModeChosen,
            isLoading = prefs.token != null && prefs.user == null,
        ),
    )
    val auth: StateFlow<AuthState> = _auth.asStateFlow()

    private val _syncUi = MutableStateFlow(SyncUi())
    val syncUi: StateFlow<SyncUi> = _syncUi.asStateFlow()

    private val _vehicles = MutableStateFlow<List<Vehicle>>(emptyList())
    val vehicles: StateFlow<List<Vehicle>> = _vehicles.asStateFlow()
    private val _vehiclesLoading = MutableStateFlow(true)
    val vehiclesLoading: StateFlow<Boolean> = _vehiclesLoading.asStateFlow()
    private val _activeVehicleId = MutableStateFlow<String?>(null)
    val activeVehicleId: StateFlow<String?> = _activeVehicleId.asStateFlow()

    private val _entries = MutableStateFlow<List<FuelEntry>>(emptyList())
    val entries: StateFlow<List<FuelEntry>> = _entries.asStateFlow()
    private val _entriesLoading = MutableStateFlow(true)
    val entriesLoading: StateFlow<Boolean> = _entriesLoading.asStateFlow()

    private val _theme = MutableStateFlow(prefs.theme)
    val theme: StateFlow<ThemeChoice> = _theme.asStateFlow()
    private val _userName = MutableStateFlow(prefs.userName)
    val userName: StateFlow<String> = _userName.asStateFlow()

    private var sessionJob: Job? = null
    private var debounceJob: Job? = null
    private var periodicJob: Job? = null

    init {
        scope.launch { refreshVehicles(initial = true) }
        scope.launch { local.changes.collect { onDataChanged(it) } }
        scope.launch { bootstrapAuth() }
        registerSyncTriggers()
        if (_auth.value.isAuthenticated) startAccountSession()
    }

    // --- Auth -------------------------------------------------------------------

    private suspend fun bootstrapAuth() {
        if (prefs.token == null) {
            _auth.update { it.copy(isLoading = false) }
            return
        }
        try {
            val user = api.me()
            linkAccount(user.email)
            prefs.user = user
            setUser(user)
        } catch (e: ApiException) {
            // Only an explicit rejection ends the session; being offline must not log anyone out.
            if (e.status == 401) {
                prefs.token = null
                prefs.user = null
                setUser(null)
            } else if (_auth.value.user == null) {
                setUser(AuthUser(0, "", ""))
            }
        } finally {
            _auth.update { it.copy(isLoading = false) }
        }
    }

    private fun setUser(user: AuthUser?) {
        val was = _auth.value.isAuthenticated
        _auth.update { it.copy(user = user) }
        if (user != null && !was) startAccountSession()
        if (user == null && was) stopAccountSession()
    }

    /** Wipes device data left over from a different account before a session starts. */
    private suspend fun linkAccount(email: String) {
        if (sync.prepareForAccount(email)) {
            prefs.activeVehicleId = null
            refreshVehicles()
        }
    }

    private suspend fun completeAuth(result: AuthResult) {
        linkAccount(result.user.email)
        prefs.token = result.token
        prefs.user = result.user
        setUser(result.user)
    }

    suspend fun signIn(email: String, password: String) = completeAuth(api.signIn(email.trim(), password))

    suspend fun signUpSendOtp(email: String) = api.signUpSendOtp(email.trim())

    suspend fun signUpVerify(name: String, email: String, password: String, otp: String) {
        completeAuth(api.signUpVerify(name.trim(), email.trim(), password, otp.trim()))
        setUserName(name)
    }

    suspend fun forgotPasswordSendOtp(email: String) = api.forgotPasswordSendOtp(email.trim())

    suspend fun forgotPasswordReset(email: String, otp: String, newPassword: String) =
        api.forgotPasswordReset(email.trim(), otp.trim(), newPassword)

    /** Signs out of the cloud account, keeping the on-device data, and returns to the login page. */
    fun signOut() {
        prefs.token = null
        prefs.user = null
        prefs.localModeChosen = false
        scope.launch { sync.resetSyncState() }
        _auth.update { it.copy(user = null, isLocalMode = false) }
        stopAccountSession()
    }

    fun continueWithoutAccount() {
        prefs.localModeChosen = true
        _auth.update { it.copy(isLocalMode = true) }
    }

    // --- Sync -------------------------------------------------------------------

    /** Sign-in (or app start while signed in): sync immediately, gating the UI until the first pull. */
    private fun startAccountSession() {
        sessionJob?.cancel()
        _syncUi.update { it.copy(initializing = true) }
        sessionJob = scope.launch {
            syncNow()
            _syncUi.update { it.copy(needsFirstSync = !sync.hasSynced(), initializing = false) }
        }
        scheduleBackgroundSync()
    }

    private fun stopAccountSession() {
        sessionJob?.cancel()
        debounceJob?.cancel()
        _syncUi.value = SyncUi()
        WorkManager.getInstance(context).cancelUniqueWork(SyncWorker.NAME)
    }

    suspend fun syncNow() {
        if (prefs.token == null) return
        _syncUi.update { it.copy(status = SyncStatus.Syncing) }
        try {
            sync.syncNow()
            _syncUi.update { it.copy(status = SyncStatus.Idle, error = null) }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            // Offline or server trouble: local data is untouched, so report it and retry later.
            _syncUi.update { it.copy(status = SyncStatus.Error, error = e.message ?: "Sync failed") }
        }
        _syncUi.update { it.copy(lastSyncedAt = sync.lastSyncedAt()) }
    }

    fun requestSync() {
        scope.launch { syncNow() }
    }

    /** Retry from the "Couldn't load your account data" screen. */
    fun retryFirstSync() {
        scope.launch {
            syncNow()
            _syncUi.update { it.copy(needsFirstSync = !sync.hasSynced()) }
        }
    }

    /** Entry point for WorkManager; runs a sync and reports failure so it can be retried. */
    suspend fun backgroundSync(): Boolean {
        syncNow()
        return _syncUi.value.status != SyncStatus.Error
    }

    private fun registerSyncTriggers() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) {
                if (!_auth.value.isAuthenticated) return
                requestSync()
                periodicJob?.cancel()
                periodicJob = scope.launch {
                    while (true) {
                        delay(PERIODIC_SYNC_MS)
                        syncNow()
                    }
                }
            }

            override fun onStop(owner: LifecycleOwner) {
                periodicJob?.cancel()
            }
        })

        val cm = context.getSystemService(ConnectivityManager::class.java)
        cm?.registerDefaultNetworkCallback(object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                if (_auth.value.isAuthenticated) scope.launch { syncNow() }
            }
        })
    }

    private fun scheduleBackgroundSync() {
        val request = PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .build()
        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(SyncWorker.NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }

    // --- Vehicles & entries -----------------------------------------------------

    private suspend fun onDataChanged(source: ChangeSource) {
        refreshVehicles()
        if (source == ChangeSource.Local && _auth.value.isAuthenticated) {
            debounceJob?.cancel()
            debounceJob = scope.launch {
                delay(DEBOUNCE_MS)
                syncNow()
            }
        }
    }

    private suspend fun refreshVehicles(initial: Boolean = false) {
        val all = local.vehicles()
        _vehicles.value = all
        if (all.isEmpty()) {
            _activeVehicleId.value = null
        } else {
            val stored = _activeVehicleId.value ?: prefs.activeVehicleId
            val active = if (stored != null && all.any { it.id == stored }) stored else all.first().id
            _activeVehicleId.value = active
            if (active != prefs.activeVehicleId) prefs.activeVehicleId = active
        }
        if (initial) _vehiclesLoading.value = false
        refreshEntries()
    }

    private suspend fun refreshEntries() {
        val id = _activeVehicleId.value
        _entries.value = if (id == null) emptyList() else local.entries(id)
        _entriesLoading.value = false
    }

    fun setActiveVehicle(id: String) {
        _activeVehicleId.value = id
        prefs.activeVehicleId = id
        scope.launch { refreshEntries() }
    }

    suspend fun addVehicle(name: String, plate: String?) {
        val created = local.addVehicle(name.trim(), plate?.trim())
        refreshVehicles()
        setActiveVehicle(created.id)
    }

    suspend fun addEntry(input: FuelEntryInput) {
        val vehicleId = _activeVehicleId.value ?: return
        local.addEntry(input, vehicleId)
        refreshEntries()
    }

    suspend fun updateEntry(id: String, input: FuelEntryInput) {
        val vehicleId = _activeVehicleId.value ?: return
        local.updateEntry(id, input, vehicleId)
        refreshEntries()
    }

    suspend fun deleteEntry(id: String) {
        local.deleteEntry(id)
        refreshEntries()
    }

    suspend fun importEntries(rows: List<FuelEntryInput>) {
        val vehicleId = _activeVehicleId.value ?: return
        local.bulkAddEntries(rows, vehicleId)
        refreshEntries()
    }

    suspend fun countEntriesByVehicle(): Map<String, Int> = local.countEntriesByVehicle()

    /** Wipes all vehicles and fuel entries. Preferences (theme, name) are untouched. */
    suspend fun clearAllData() {
        // Signed in: keep tombstones so the deletion reaches the cloud account and other devices.
        local.clearAll(keepTombstones = prefs.token != null)
        if (_auth.value.isAuthenticated) syncNow()
        prefs.activeVehicleId = null
        _activeVehicleId.value = null
        refreshVehicles()
    }

    // --- Preferences -------------------------------------------------------------

    fun setTheme(choice: ThemeChoice) {
        prefs.theme = choice
        _theme.value = choice
    }

    fun setUserName(name: String) {
        prefs.userName = name
        _userName.value = prefs.userName
    }
}

/** Periodic background sync while signed in; complements the foreground triggers. */
class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val controller = (applicationContext as CombustApp).controller
        return if (controller.backgroundSync()) Result.success() else Result.retry()
    }

    companion object {
        const val NAME = "combust-sync"
    }
}
