package com.slowatcoding.combust.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slowatcoding.combust.AppController
import com.slowatcoding.combust.core.FuelEntry
import com.slowatcoding.combust.core.deriveEntries
import com.slowatcoding.combust.ui.components.BrandMark
import com.slowatcoding.combust.ui.components.ButtonSize
import com.slowatcoding.combust.ui.components.CircleIconButton
import com.slowatcoding.combust.ui.components.Icon
import com.slowatcoding.combust.ui.components.Lucide
import com.slowatcoding.combust.ui.components.LucideIcon
import com.slowatcoding.combust.ui.components.PillButton
import com.slowatcoding.combust.ui.components.floating
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType

private enum class Tab(val label: String, val icon: LucideIcon) {
    Overview("Overview", Lucide.Gauge),
    Entries("Entries", Lucide.List),
    Stats("Stats", Lucide.BarChart),
    Trends("Trends", Lucide.TrendingUp),
}

/** Decides what the signed-in/local user sees: sync gates, onboarding, or the app proper. */
@Composable
fun AppRoot(controller: AppController) {
    val c = Ember.colors
    val auth by controller.auth.collectAsState()
    val sync by controller.syncUi.collectAsState()
    val vehicles by controller.vehicles.collectAsState()
    val vehiclesLoading by controller.vehiclesLoading.collectAsState()

    Box(Modifier.fillMaxSize().background(c.background)) {
        when {
            auth.isLoading -> Unit
            !auth.isAuthenticated && !auth.isLocalMode ->
                AuthPage(controller, onContinueLocal = controller::continueWithoutAccount)

            auth.isAuthenticated && sync.needsFirstSync -> Column(
                Modifier.fillMaxSize().padding(24.dp).statusBarsPadding(),
                verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("Couldn't load your account data", style = EmberType.sheetTitle.copy(color = c.foreground), textAlign = TextAlign.Center)
                Text(
                    "${sync.error ?: "Sync failed"}. Your data is safe in your account — check your connection and try again.",
                    style = EmberType.body14.copy(color = c.mutedForeground), textAlign = TextAlign.Center,
                )
                PillButton(
                    if (sync.status == com.slowatcoding.combust.SyncStatus.Syncing) "Retrying…" else "Retry",
                    controller::retryFirstSync,
                    enabled = sync.status != com.slowatcoding.combust.SyncStatus.Syncing,
                )
            }

            auth.isAuthenticated && sync.initializing -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Setting up offline storage…", style = EmberType.body14.copy(color = c.mutedForeground))
            }

            vehiclesLoading -> Unit
            vehicles.isEmpty() -> AddVehicleOnboarding(controller)
            else -> AppShell(controller)
        }
    }
}

@Composable
private fun AppShell(controller: AppController) {
    val c = Ember.colors
    val vehicles by controller.vehicles.collectAsState()
    val activeId by controller.activeVehicleId.collectAsState()
    val entries by controller.entries.collectAsState()
    val entriesLoading by controller.entriesLoading.collectAsState()
    val vehicle = vehicles.firstOrNull { it.id == activeId }
    val derived = remember(entries) { deriveEntries(entries) }
    val stationNames = remember(entries) { entries.map { it.fuelStation }.distinct().sortedWith(String.CASE_INSENSITIVE_ORDER) }

    var tab by rememberSaveable { mutableStateOf(Tab.Overview) }
    var addOpen by rememberSaveable { mutableStateOf(false) }
    var importOpen by rememberSaveable { mutableStateOf(false) }
    var vehicleOpen by rememberSaveable { mutableStateOf(false) }
    var settingsOpen by rememberSaveable { mutableStateOf(false) }
    var editing by remember { mutableStateOf<FuelEntry?>(null) }

    BackHandler(enabled = tab != Tab.Overview) { tab = Tab.Overview }

    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Header(onImport = { importOpen = true }, onSettings = { settingsOpen = true })
            Column(
                Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp)
                    .padding(top = 12.dp, bottom = 128.dp),
            ) {
                when (tab) {
                    Tab.Overview -> OverviewScreen(
                        vehicle, derived, entriesLoading,
                        onAddEntry = { addOpen = true }, onImportCsv = { importOpen = true },
                        onViewAll = { tab = Tab.Entries }, onOpenVehicle = { vehicleOpen = true },
                    )
                    Tab.Entries -> EntriesScreen(
                        vehicle, derived, entriesLoading, onOpenVehicle = { vehicleOpen = true },
                        onEdit = { d -> editing = d.entry }, onDelete = controller::deleteEntry,
                    )
                    Tab.Stats -> StatsScreen(vehicle, derived) { vehicleOpen = true }
                    Tab.Trends -> TrendsScreen(vehicle, derived) { vehicleOpen = true }
                }
            }
        }

        BottomTabBar(tab, { tab = it }, onAdd = { addOpen = true }, modifier = Modifier.align(Alignment.BottomCenter))
    }

    if (addOpen) {
        EntrySheet(
            entry = null, allEntries = entries, stationNames = stationNames,
            onDismiss = { addOpen = false },
            onSubmit = { controller.addEntry(it) }, onDelete = {},
        )
    }
    editing?.let { e ->
        EntrySheet(
            entry = e, allEntries = entries, stationNames = stationNames,
            onDismiss = { editing = null },
            onSubmit = { controller.updateEntry(e.id, it) },
            onDelete = { controller.deleteEntry(e.id) },
        )
    }
    if (importOpen) ImportCsvSheet(onDismiss = { importOpen = false }, onImport = controller::importEntries)
    if (vehicleOpen) VehicleSwitcherSheet(controller) { vehicleOpen = false }
    if (settingsOpen) SettingsSheet(controller) { settingsOpen = false }
}

@Composable
private fun Header(onImport: () -> Unit, onSettings: () -> Unit) {
    val c = Ember.colors
    Row(
        Modifier.fillMaxWidth().background(c.background).statusBarsPadding().height(64.dp).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
            BrandMark()
            Text("Combust", style = EmberType.brand.copy(color = c.foreground))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CircleIconButton(Lucide.Upload, "Import from CSV", onImport)
            CircleIconButton(Lucide.Settings, "Settings", onSettings)
        }
    }
}

/** Floating pill navigation: 2 tabs, a round flame add button, 2 tabs. */
@Composable
private fun BottomTabBar(selected: Tab, onSelect: (Tab) -> Unit, onAdd: () -> Unit, modifier: Modifier = Modifier) {
    val c = Ember.colors
    Row(
        modifier
            .navigationBarsPadding()
            .padding(horizontal = 14.dp)
            .padding(bottom = 14.dp)
            .widthIn(max = 520.dp)
            .fillMaxWidth()
            .height(66.dp)
            .floating(CircleShape)
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        @Composable
        fun item(t: Tab) {
            val active = t == selected
            val tint = if (active) c.flameText else c.mutedForeground
            Column(
                Modifier
                    .weight(1f)
                    .clip(CircleShape)
                    .clickable(role = Role.Tab) { onSelect(t) }
                    .padding(vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Icon(t.icon, tint, size = 21.dp, strokeWidth = 1.9f)
                Text(t.label, style = EmberType.tab10.copy(fontSize = 10.5.sp, color = tint))
            }
        }
        item(Tab.Overview)
        item(Tab.Entries)
        Box(Modifier.size(64.dp), contentAlignment = Alignment.Center) {
            Box(
                Modifier
                    .size(50.dp)
                    .clip(CircleShape)
                    .background(c.flame, CircleShape)
                    .clickable(role = Role.Button, onClick = onAdd)
                    .semantics { contentDescription = "Add fuel entry" },
                contentAlignment = Alignment.Center,
            ) { Icon(Lucide.Plus, c.flameForeground, size = 24.dp, strokeWidth = 2.6f) }
        }
        item(Tab.Stats)
        item(Tab.Trends)
    }
}
