package com.slowatcoding.combust.ui.screens

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.unit.sp
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.slowatcoding.combust.AppController
import com.slowatcoding.combust.BuildConfig
import com.slowatcoding.combust.SyncStatus
import com.slowatcoding.combust.core.FuelEntry
import com.slowatcoding.combust.core.FuelEntryInput
import com.slowatcoding.combust.core.OPTIONAL_COLUMNS
import com.slowatcoding.combust.core.REQUIRED_COLUMNS
import com.slowatcoding.combust.core.CsvImportError
import com.slowatcoding.combust.core.formatAmount
import com.slowatcoding.combust.core.formatDate
import com.slowatcoding.combust.core.getOdometerWarning
import com.slowatcoding.combust.core.localeNumber
import com.slowatcoding.combust.core.parseFuelEntriesCsv
import com.slowatcoding.combust.data.ThemeChoice
import com.slowatcoding.combust.ui.components.Badge
import com.slowatcoding.combust.ui.components.BadgeStyle
import com.slowatcoding.combust.ui.components.ButtonSize
import com.slowatcoding.combust.ui.components.ButtonStyle
import com.slowatcoding.combust.ui.components.ConfirmDialog
import com.slowatcoding.combust.ui.components.Divider
import com.slowatcoding.combust.ui.components.EmberSheet
import com.slowatcoding.combust.ui.components.EmberTextField
import com.slowatcoding.combust.ui.components.FieldLabel
import com.slowatcoding.combust.ui.components.Icon
import com.slowatcoding.combust.ui.components.LocalToaster
import com.slowatcoding.combust.ui.components.Lucide
import com.slowatcoding.combust.ui.components.PillButton
import com.slowatcoding.combust.ui.components.SwitchRow
import com.slowatcoding.combust.ui.components.selectableTile
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import com.slowatcoding.combust.ui.theme.Radii
import java.text.DateFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.Date
import kotlinx.coroutines.launch

// --- Entry add/edit -----------------------------------------------------------------------------

private fun ordinal(day: Int): String = when {
    day in 11..13 -> "${day}th"
    day % 10 == 1 -> "${day}st"
    day % 10 == 2 -> "${day}nd"
    day % 10 == 3 -> "${day}rd"
    else -> "${day}th"
}

/** Matches date-fns `PPP`: "October 13th, 2026". */
private fun longDate(iso: String): String {
    val d = LocalDate.parse(iso)
    val month = d.month.getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH)
    return "$month ${ordinal(d.dayOfMonth)}, ${d.year}"
}

private fun plain(v: Double): String = if (v % 1.0 == 0.0) v.toLong().toString() else v.toString()

/** Add/edit sheet shared by the "new entry" action and each entry's edit action. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EntrySheet(
    entry: FuelEntry?,
    allEntries: List<FuelEntry>,
    stationNames: List<String>,
    onDismiss: () -> Unit,
    onSubmit: suspend (FuelEntryInput) -> Unit,
    onDelete: suspend () -> Unit,
) {
    val c = Ember.colors
    val toast = LocalToaster.current
    val scope = rememberCoroutineScope()

    var date by remember { mutableStateOf(entry?.date ?: LocalDate.now().toString()) }
    var odometer by remember { mutableStateOf(entry?.odometerReading?.let(::plain) ?: "") }
    var station by remember { mutableStateOf(entry?.fuelStation ?: "") }
    var litres by remember { mutableStateOf(entry?.litresFilled?.let(::plain) ?: "") }
    var amount by remember { mutableStateOf(entry?.amountPaid?.let(::plain) ?: "") }
    var fullTank by remember { mutableStateOf(entry?.isFullTank ?: true) }
    var missed by remember { mutableStateOf(entry?.missedPrevious ?: false) }
    var errors by remember { mutableStateOf(emptyMap<String, String>()) }
    var busy by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var stationFocused by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }

    val odometerValue = odometer.toDoubleOrNull()
    val liveWarning = odometerValue?.let { getOdometerWarning(allEntries, it, entry?.id) }
    val litresValue = litres.toDoubleOrNull()
    val amountValue = amount.toDoubleOrNull()
    val costPerLitre = if (litresValue != null && litresValue > 0 && amountValue != null && amountValue > 0) amountValue / litresValue else null
    val hasOtherEntries = allEntries.any { it.id != entry?.id }

    fun positive(raw: String, value: Double?, label: String): String? = when {
        raw.isBlank() || value == null -> "$label is required"
        value <= 0 -> "$label must be greater than 0"
        else -> null
    }

    fun submit() {
        val e = mutableMapOf<String, String>()
        if (date.isBlank()) e["date"] = "Date is required"
        positive(odometer, odometerValue, "Odometer reading")?.let { e["odometer"] = it }
        if (station.isBlank()) e["station"] = "Fuel station is required"
        positive(amount, amountValue, "Amount paid")?.let { e["amount"] = it }
        positive(litres, litresValue, "Litres filled")?.let { e["litres"] = it }
        if (e["odometer"] == null) getOdometerWarning(allEntries, odometerValue!!, entry?.id)?.let { e["odometer"] = it }
        errors = e
        if (e.isNotEmpty() || busy) return
        busy = true
        scope.launch {
            try {
                onSubmit(FuelEntryInput(date, odometerValue!!, station.trim(), amountValue!!, litresValue!!, fullTank, missed))
                toast(if (entry != null) "Entry updated" else "Entry added")
                onDismiss()
            } catch (ex: Exception) {
                toast(ex.message ?: "Couldn't save entry")
            } finally {
                busy = false
            }
        }
    }

    EmberSheet(
        onDismiss = onDismiss,
        title = if (entry != null) "Edit fill-up" else "Add fuel entry",
        subtitle = if (entry != null) "Update the details of this fill-up."
        else "Log a fill-up right after you pay so the odometer reading stays accurate.",
    ) {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                FieldLabel("Date")
                PillButton(
                    longDate(date), { showDatePicker = true }, Modifier.fillMaxWidth(),
                    style = ButtonStyle.Outline, icon = Lucide.Calendar,
                )
                errors["date"]?.let { Text(it, style = EmberType.meta13.copy(color = c.destructive)) }
            }

            EmberTextField(
                odometer, { odometer = it }, label = "Odometer reading (km)",
                error = errors["odometer"] ?: liveWarning,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
            )

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                EmberTextField(
                    station, { station = it }, label = "Fuel station", placeholder = "e.g. Shell, HP, Indian Oil",
                    error = errors["station"], onFocusChange = { stationFocused = it },
                )
                val query = station.trim().lowercase()
                val filtered = if (query.isEmpty()) stationNames else stationNames.filter { it.lowercase().contains(query) }
                val exact = stationNames.any { it.lowercase() == query }
                if (stationFocused && stationNames.isNotEmpty() && (filtered.isNotEmpty() || (query.isNotEmpty() && !exact))) {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(Radii.input)).background(c.popover).border(1.dp, c.border, RoundedCornerShape(Radii.input))) {
                        Text("Previous stations", style = EmberType.small12.copy(color = c.mutedForeground), modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                        filtered.take(6).forEach { s ->
                            Text(
                                s, style = EmberType.body14.copy(color = c.foreground),
                                modifier = Modifier.fillMaxWidth().clickable { station = s; stationFocused = false }.padding(horizontal = 12.dp, vertical = 10.dp),
                            )
                        }
                        if (query.isNotEmpty() && !exact) {
                            Text(
                                "Use “${station.trim()}”", style = EmberType.body14Medium.copy(color = c.flameText),
                                modifier = Modifier.fillMaxWidth().clickable { station = station.trim(); stationFocused = false }.padding(horizontal = 12.dp, vertical = 10.dp),
                            )
                        }
                    }
                }
                if (entry == null && stationNames.isNotEmpty()) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        stationNames.take(3).forEach { s ->
                            Text(
                                s, style = EmberType.small12.copy(color = c.mutedForeground),
                                modifier = Modifier.clip(CircleShape).border(1.dp, c.border, CircleShape).clickable { station = s }.padding(horizontal = 10.dp, vertical = 5.dp),
                            )
                        }
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                EmberTextField(
                    litres, { litres = it }, Modifier.weight(1f), label = "Litres filled", error = errors["litres"],
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
                EmberTextField(
                    amount, { amount = it }, Modifier.weight(1f), label = "Amount paid", error = errors["amount"],
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                )
            }

            Column(Modifier.fillMaxWidth().border(1.dp, c.border, RoundedCornerShape(Radii.input)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                SwitchRow(
                    "Filled to a full tank",
                    if (fullTank) "Fill until the pump clicks off — mileage is only accurate between full tanks."
                    else "Partial fills are saved, but mileage will be worked out at your next full tank.",
                    fullTank, { fullTank = it },
                )
                if (hasOtherEntries) {
                    Divider()
                    SwitchRow(
                        "Missed logging a fill-up before this",
                        "Skips the stretch since your last entry so it doesn't skew your mileage.",
                        missed, { missed = it },
                    )
                }
            }

            if (costPerLitre != null) {
                Row(Modifier.fillMaxWidth().background(c.field, RoundedCornerShape(16.dp)).padding(horizontal = 14.dp, vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                    Text("Works out to", style = EmberType.meta13.copy(color = c.mutedForeground))
                    Text("${formatAmount(costPerLitre)} / litre", style = EmberType.cardTitle.copy(fontSize = 16.sp, color = c.foreground, fontFamily = com.slowatcoding.combust.ui.theme.DisplayFont))
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                PillButton("Cancel", onDismiss, Modifier.weight(1f), style = ButtonStyle.Outline, size = ButtonSize.Lg)
                PillButton(if (entry != null) "Save changes" else "Add entry", ::submit, Modifier.weight(1f), size = ButtonSize.Lg, enabled = !busy)
            }

            if (entry != null) {
                PillButton("Delete this fill-up", { confirmDelete = true }, Modifier.fillMaxWidth(), style = ButtonStyle.Destructive, size = ButtonSize.Lg, icon = Lucide.Trash)
            }
        }
    }

    if (showDatePicker) {
        val state = rememberDatePickerState(initialSelectedDateMillis = LocalDate.parse(date).atStartOfDay().toInstant(ZoneOffset.UTC).toEpochMilli())
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            colors = DatePickerDefaults.colors(containerColor = c.card),
            confirmButton = {
                PillButton("OK", {
                    state.selectedDateMillis?.let { date = Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString() }
                    showDatePicker = false
                }, style = ButtonStyle.Ink)
            },
            dismissButton = { PillButton("Cancel", { showDatePicker = false }, style = ButtonStyle.Ghost) },
        ) {
            DatePicker(
                state,
                colors = DatePickerDefaults.colors(
                    containerColor = c.card,
                    selectedDayContainerColor = c.primary,
                    selectedDayContentColor = c.primaryForeground,
                    todayDateBorderColor = c.flame,
                    todayContentColor = c.flameText,
                ),
            )
        }
    }

    if (confirmDelete && entry != null) {
        ConfirmDialog(
            title = "Delete this entry?",
            message = "This removes the fill-up on ${formatDate(entry.date)} at ${localeNumber(entry.odometerReading)} km. The previous entry's mileage will be recalculated. This can't be undone.",
            confirmText = "Delete",
            onConfirm = {
                confirmDelete = false
                scope.launch { onDelete(); toast("Entry deleted"); onDismiss() }
            },
            onDismiss = { confirmDelete = false },
        )
    }
}

// --- CSV import ---------------------------------------------------------------------------------

private fun readText(context: Context, uri: Uri): String =
    context.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: ""

private fun displayName(context: Context, uri: Uri): String =
    context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
        if (it.moveToFirst()) it.getString(0) else null
    } ?: "file.csv"

private fun titleCase(column: String) = column.split(' ').joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } }

@Composable
fun ImportCsvSheet(onDismiss: () -> Unit, onImport: suspend (List<FuelEntryInput>) -> Unit) {
    val c = Ember.colors
    val context = LocalContext.current
    val toast = LocalToaster.current
    val scope = rememberCoroutineScope()
    var fileName by remember { mutableStateOf<String?>(null) }
    var rows by remember { mutableStateOf(emptyList<FuelEntryInput>()) }
    var errors by remember { mutableStateOf(emptyList<CsvImportError>()) }
    var busy by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            val result = parseFuelEntriesCsv(readText(context, uri))
            fileName = displayName(context, uri)
            rows = result.rows
            errors = result.errors
        }
    }

    EmberSheet(onDismiss, "Import from CSV", "Bring over a spreadsheet of past fill-ups in one go.") {
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(Radii.input)).background(c.background).border(1.5.dp, c.border, RoundedCornerShape(Radii.input)).padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Lucide.UploadCloud, c.primary, size = 24.dp)
            Text("Choose your .csv file", style = EmberType.body14Medium.copy(color = c.foreground))
            PillButton("Choose file", { picker.launch("*/*") }, style = ButtonStyle.Outline, size = ButtonSize.Sm)
            if (fileName != null) {
                Text(
                    "$fileName · ${rows.size} row${if (rows.size == 1) "" else "s"} ready to import" + if (errors.isNotEmpty()) ", ${errors.size} skipped." else ".",
                    style = EmberType.meta13.copy(color = c.mutedForeground),
                )
            }
        }

        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            FieldLabel("Columns expected")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                REQUIRED_COLUMNS.forEach { Badge(titleCase(it), BadgeStyle.Secondary) }
            }
            FieldLabel("Optional (yes / no)")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                OPTIONAL_COLUMNS.forEach { Badge(titleCase(it), BadgeStyle.Outline) }
            }
        }

        if (errors.isNotEmpty()) {
            Column(
                Modifier.fillMaxWidth().heightIn(max = 160.dp).border(1.dp, c.border, RoundedCornerShape(Radii.input)).verticalScroll(rememberScrollState()).padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("Skipped rows", style = EmberType.body14Medium.copy(color = c.destructive))
                errors.forEach { Text("Line ${it.line}: ${it.reason}", style = EmberType.body14.copy(color = c.mutedForeground)) }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            PillButton("Cancel", onDismiss, Modifier.weight(1f), style = ButtonStyle.Outline, size = ButtonSize.Lg)
            PillButton(
                if (rows.isNotEmpty()) "Import ${rows.size} entries" else "Import entries",
                {
                    busy = true
                    scope.launch {
                        try {
                            onImport(rows)
                            toast("Imported ${rows.size} ${if (rows.size == 1) "entry" else "entries"}")
                            onDismiss()
                        } catch (ex: Exception) {
                            toast(ex.message ?: "Import failed")
                        } finally {
                            busy = false
                        }
                    }
                },
                Modifier.weight(1f), size = ButtonSize.Lg, enabled = rows.isNotEmpty() && !busy,
            )
        }
    }
}

// --- Vehicle switcher ---------------------------------------------------------------------------

@Composable
fun VehicleSwitcherSheet(controller: AppController, onDismiss: () -> Unit) {
    val c = Ember.colors
    val vehicles by controller.vehicles.collectAsState()
    val activeId by controller.activeVehicleId.collectAsState()
    var counts by remember { mutableStateOf(emptyMap<String, Int>()) }
    var adding by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var plate by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) { counts = controller.countEntriesByVehicle() }

    EmberSheet(onDismiss, "Vehicle") {
        vehicles.forEach { v ->
            val active = v.id == activeId
            Row(
                Modifier.fillMaxWidth().selectableTile(active) { controller.setActiveVehicle(v.id); onDismiss() }.padding(14.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(v.name, style = EmberType.body14.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold, color = c.foreground))
                    Text(
                        (if (!v.plate.isNullOrBlank()) "${v.plate} · " else "") + "${counts[v.id] ?: 0} fill-ups",
                        style = EmberType.small12.copy(color = c.mutedForeground),
                    )
                }
                if (active) Icon(Lucide.Check, c.primary, size = 18.dp)
            }
        }
        if (adding) {
            Column(Modifier.fillMaxWidth().border(1.dp, c.border, RoundedCornerShape(Radii.input)).padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                EmberTextField(name, { name = it }, label = "Name", placeholder = "e.g. Honda Activa 6G")
                EmberTextField(plate, { plate = it }, label = "Plate (optional)", placeholder = "e.g. GJ 06 KL 4412")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    PillButton("Cancel", { adding = false }, Modifier.weight(1f), style = ButtonStyle.Outline)
                    PillButton("Add", {
                        scope.launch {
                            controller.addVehicle(name, plate.ifBlank { null })
                            onDismiss()
                        }
                    }, Modifier.weight(1f), enabled = name.isNotBlank())
                }
            }
        } else {
            Row(
                Modifier.fillMaxWidth().height48().clip(RoundedCornerShape(Radii.input)).border(1.dp, c.border, RoundedCornerShape(Radii.input)).clickable(role = Role.Button) { adding = true },
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Lucide.Plus, c.primary, size = 15.dp)
                Text("Add a vehicle", style = EmberType.body14Medium.copy(color = c.primary))
            }
        }
    }
}

private fun Modifier.height48() = this.then(Modifier.heightIn(min = 48.dp))

// --- Settings -----------------------------------------------------------------------------------

@Composable
fun SettingsSheet(controller: AppController, onDismiss: () -> Unit) {
    val c = Ember.colors
    val toast = LocalToaster.current
    val scope = rememberCoroutineScope()
    val auth by controller.auth.collectAsState()
    val sync by controller.syncUi.collectAsState()
    val theme by controller.theme.collectAsState()
    val savedName by controller.userName.collectAsState()
    var name by remember { mutableStateOf(savedName) }
    var clearing by remember { mutableStateOf(false) }
    var confirmClear by remember { mutableStateOf(false) }
    var signInOpen by remember { mutableStateOf(false) }

    EmberSheet(onDismiss, "Settings") {
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            EmberTextField(
                name, { name = it }, label = "Your name", placeholder = "e.g. Abhishek",
                onFocusChange = { focused ->
                    if (!focused && name.trim() != savedName) {
                        controller.setUserName(name)
                        if (name.isNotBlank()) toast("Name updated")
                    }
                },
            )

            Divider()

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Appearance", style = EmberType.body14Medium.copy(color = c.foreground))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    ThemeChoice.entries.forEach { choice ->
                        val icon = when (choice) { ThemeChoice.System -> Lucide.Laptop; ThemeChoice.Light -> Lucide.Sun; ThemeChoice.Dark -> Lucide.Moon }
                        Column(
                            Modifier.weight(1f).selectableTile(theme == choice) { controller.setTheme(choice) }.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            Icon(icon, if (theme == choice) c.foreground else c.mutedForeground, size = 16.dp)
                            Text(choice.label, style = EmberType.small12.copy(color = if (theme == choice) c.foreground else c.mutedForeground))
                        }
                    }
                }
            }

            Divider()

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Cloud account", style = EmberType.body14Medium.copy(color = c.foreground))
                if (auth.isAuthenticated) {
                    val email = auth.user?.email.orEmpty()
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Lucide.Cloud, c.mutedForeground, size = 16.dp)
                        Text(if (email.isNotEmpty()) "Syncing as $email" else "Signed in — syncing", style = EmberType.body14.copy(color = c.mutedForeground))
                    }
                    Text(
                        when {
                            sync.status == SyncStatus.Syncing -> "Syncing…"
                            sync.status == SyncStatus.Error -> "Couldn't sync (${sync.error ?: "offline"}). Your data is safe on this device and will sync when possible."
                            sync.lastSyncedAt != null -> "Last synced ${DateFormat.getDateTimeInstance().format(Date(sync.lastSyncedAt!!))}"
                            else -> "Not synced yet"
                        },
                        style = EmberType.small12.copy(color = c.mutedForeground),
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PillButton("Sync now", { controller.requestSync() }, Modifier.weight(1f), style = ButtonStyle.Outline, enabled = sync.status != SyncStatus.Syncing, icon = Lucide.Refresh)
                        PillButton("Sign out", {
                            controller.signOut()
                            toast("Signed out — your data stays on this device")
                            onDismiss()
                        }, Modifier.weight(1f), style = ButtonStyle.Outline)
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Lucide.CloudOff, c.mutedForeground, size = 16.dp)
                        Text("Your data is stored only on this device.", style = EmberType.body14.copy(color = c.mutedForeground))
                    }
                    PillButton("Sign in to sync", { signInOpen = true }, Modifier.fillMaxWidth(), style = ButtonStyle.Outline, icon = Lucide.Cloud)
                }
            }

            Divider()

            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Data", style = EmberType.body14Medium.copy(color = c.foreground))
                PillButton("Clear all data", { confirmClear = true }, Modifier.fillMaxWidth(), style = ButtonStyle.Destructive, icon = Lucide.Trash, enabled = !clearing)
            }

            Text(
                "Combust v${BuildConfig.VERSION_NAME}",
                style = EmberType.small12.copy(color = c.mutedForeground),
                modifier = Modifier.fillMaxWidth(),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }

    if (confirmClear) {
        ConfirmDialog(
            title = "Clear all data?",
            message = "This permanently deletes every vehicle and fill-up entry on this device" +
                (if (auth.isAuthenticated) " and in your cloud account" else "") + ". This can't be undone.",
            confirmText = "Clear data",
            onConfirm = {
                confirmClear = false
                clearing = true
                scope.launch {
                    try {
                        controller.clearAllData()
                        toast("All data cleared")
                        onDismiss()
                    } catch (e: Exception) {
                        toast("Failed to clear data")
                        clearing = false
                    }
                }
            },
            onDismiss = { confirmClear = false },
        )
    }

    if (signInOpen && !auth.isAuthenticated) {
        Dialog(onDismissRequest = { signInOpen = false }) {
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(Radii.card)).background(c.card).verticalScroll(rememberScrollState()).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    "Signing in uploads the data on this device to your account and brings in anything already stored there.",
                    style = EmberType.body14.copy(color = c.mutedForeground),
                )
                AuthPage(controller, embedded = true)
            }
        }
    }
}
