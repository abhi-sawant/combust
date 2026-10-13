package com.slowatcoding.combust.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import kotlinx.coroutines.launch
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slowatcoding.combust.core.DerivedEntry
import com.slowatcoding.combust.core.OverallStats
import com.slowatcoding.combust.core.TrendRange
import com.slowatcoding.combust.core.Vehicle
import com.slowatcoding.combust.core.computeOverallStats
import com.slowatcoding.combust.core.computeStationStats
import com.slowatcoding.combust.core.filterByRange
import com.slowatcoding.combust.core.formatAmount
import com.slowatcoding.combust.core.formatDate
import com.slowatcoding.combust.core.formatKm
import com.slowatcoding.combust.core.formatMileage
import com.slowatcoding.combust.core.formatNumber
import com.slowatcoding.combust.core.groupByMonth
import com.slowatcoding.combust.core.sectorOf
import com.slowatcoding.combust.ui.components.Badge
import com.slowatcoding.combust.ui.components.BadgeStyle
import com.slowatcoding.combust.ui.components.ButtonSize
import com.slowatcoding.combust.ui.components.ButtonStyle
import com.slowatcoding.combust.ui.components.ChartPoint
import com.slowatcoding.combust.ui.components.ConfirmDialog
import com.slowatcoding.combust.ui.components.FillupRow
import com.slowatcoding.combust.ui.components.Icon
import com.slowatcoding.combust.ui.components.LineChart
import com.slowatcoding.combust.ui.components.LocalToaster
import com.slowatcoding.combust.ui.components.Lucide
import com.slowatcoding.combust.ui.components.LucideIcon
import com.slowatcoding.combust.ui.components.MileageBars
import com.slowatcoding.combust.ui.components.PillButton
import com.slowatcoding.combust.ui.components.emberCard
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import com.slowatcoding.combust.ui.theme.Radii
import java.time.LocalDate
import kotlin.math.abs

/** Active-vehicle button that opens the vehicle switcher. */
@Composable
fun VehicleChip(vehicle: Vehicle?, onClick: () -> Unit, modifier: Modifier = Modifier) {
    if (vehicle == null) return
    val c = Ember.colors
    Row(
        modifier
            .emberCard(CircleShape)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = "Switch vehicle, current: ${vehicle.name}" }
            .padding(start = 5.dp, top = 5.dp, bottom = 5.dp, end = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(30.dp).background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(c.flame2, c.flame)), CircleShape),
            contentAlignment = Alignment.Center,
        ) { com.slowatcoding.combust.ui.components.BrandMark(size = 16.dp, solid = c.flameForeground) }
        Text(vehicle.name, style = EmberType.body15Semi.copy(color = c.foreground), maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
        if (!vehicle.plate.isNullOrBlank()) Text(vehicle.plate!!, style = EmberType.meta13.copy(color = c.mutedForeground), maxLines = 1)
        Icon(Lucide.ChevronDown, c.mutedForeground, size = 16.dp)
    }
}

@Composable
private fun EmptyCard(text: String) {
    Box(Modifier.fillMaxWidth().emberCard().padding(vertical = 40.dp, horizontal = 16.dp), contentAlignment = Alignment.Center) {
        Text(text, style = EmberType.body14.copy(color = Ember.colors.mutedForeground), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun SectionTitle(text: String) = Text(text, style = EmberType.sectionTitle.copy(color = Ember.colors.foreground))

// --- Overview -----------------------------------------------------------------------------------

@Composable
fun OverviewScreen(
    vehicle: Vehicle?,
    derived: List<DerivedEntry>,
    isLoading: Boolean,
    onAddEntry: () -> Unit,
    onImportCsv: () -> Unit,
    onViewAll: () -> Unit,
    onOpenVehicle: () -> Unit,
) {
    val c = Ember.colors
    val stats = remember(derived) { computeOverallStats(derived) }

    // Hold a field-coloured placeholder while entries load so the empty state never flashes.
    if (isLoading && stats.entryCount == 0) {
        Box(Modifier.fillMaxWidth().height(224.dp).background(c.field, RoundedCornerShape(Radii.hero)))
        return
    }

    if (stats.entryCount == 0) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            VehicleChip(vehicle, onOpenVehicle)
            Column(
                Modifier.fillMaxWidth().background(c.field, RoundedCornerShape(Radii.hero)).padding(28.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                Text("No fill-ups yet", style = EmberType.emptyTitle.copy(color = c.foreground))
                Text(
                    "Log a fill-up right after you pay and Combust starts working out mileage from the second one on.",
                    style = EmberType.body15.copy(color = c.mutedForeground),
                )
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    PillButton("Add first entry", onAddEntry, style = ButtonStyle.Flame, size = ButtonSize.Lg)
                    PillButton("Import from CSV", onImportCsv, style = ButtonStyle.Card, size = ButtonSize.Lg)
                }
            }
        }
        return
    }

    val withMileage = derived.filter { it.mileage != null }
    val latest = withMileage.lastOrNull()
    val previous = withMileage.getOrNull(withMileage.size - 2)
    val delta = if (latest != null && previous != null) latest.mileage!! - previous.mileage!! else null
    val average = stats.averageMileage
    val bestId = stats.bestMileageEntry?.id
    val recent = remember(derived) { derived.sortedByDescending { it.date }.take(4) }
    val showChart = average != null && withMileage.size >= 2
    val screenWidth = LocalConfiguration.current.screenWidthDp

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        VehicleChip(vehicle, onOpenVehicle, Modifier.padding(bottom = 4.dp))

        Column(
            Modifier.fillMaxWidth().background(c.field, RoundedCornerShape(Radii.hero)).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(32.dp),
        ) {
            Column {
                Text("Average mileage", style = EmberType.body15.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Medium, color = c.mutedForeground))
                Row(Modifier.padding(top = 10.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    val size = (screenWidth * 0.18f).toInt().coerceIn(52, 96)
                    Text(if (average != null) formatNumber(average) else "—", style = EmberType.heroNumeral(size).copy(color = c.foreground))
                    Text("km/l", style = EmberType.heroUnit.copy(color = c.mutedForeground), modifier = Modifier.padding(bottom = 4.dp))
                }
                if (delta != null && abs(delta) >= 0.05) {
                    val text = androidx.compose.ui.text.buildAnnotatedString {
                        append("Last fill-up was ")
                        pushStyle(androidx.compose.ui.text.SpanStyle(color = c.flameText))
                        append("${formatNumber(abs(delta))} ${if (delta > 0) "better" else "lower"}")
                        pop()
                        append(" than the one before.")
                    }
                    Text(text, style = EmberType.heroLine.copy(color = c.foreground), modifier = Modifier.padding(top = 20.dp))
                }
            }
            if (showChart) MileageBars(withMileage, average!!)
        }

        val facts = listOf(
            "Spent" to formatAmount(stats.totalAmountSpent),
            "Distance" to formatKm(stats.totalDistanceCovered),
            "Fuel" to "${formatNumber(stats.totalLitresFilled)} L",
            "Fill-ups" to stats.entryCount.toString(),
        )
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            facts.chunked(2).forEach { pair ->
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    pair.forEach { (label, value) ->
                        Column(Modifier.weight(1f).emberCard(RoundedCornerShape(Radii.fact)).padding(horizontal = 20.dp, vertical = 16.dp)) {
                            Text(label, style = EmberType.meta13.copy(color = c.mutedForeground))
                            Text(value, style = EmberType.factValue.copy(color = c.foreground), maxLines = 1, modifier = Modifier.padding(top = 2.dp))
                        }
                    }
                }
            }
        }

        Column(Modifier.padding(top = 20.dp)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 6.dp).padding(bottom = 12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                SectionTitle("Recent fill-ups")
                Text(
                    "See all",
                    style = EmberType.body14Medium.copy(color = c.mutedForeground),
                    modifier = Modifier.clip(RoundedCornerShape(6.dp)).clickable(role = Role.Button, onClick = onViewAll).padding(2.dp),
                )
            }
            Column(Modifier.fillMaxWidth().emberCard().padding(8.dp)) {
                recent.forEach { entry ->
                    FillupRow(entry, sectorOf(entry, average, bestId), average)
                }
            }
        }
    }
}

// --- Entries ------------------------------------------------------------------------------------

@Composable
fun EntriesScreen(
    vehicle: Vehicle?,
    derived: List<DerivedEntry>,
    isLoading: Boolean,
    onOpenVehicle: () -> Unit,
    onEdit: (DerivedEntry) -> Unit,
    onDelete: suspend (String) -> Unit,
) {
    val c = Ember.colors
    val toast = LocalToaster.current
    var deleting by remember { mutableStateOf<DerivedEntry?>(null) }
    val stats = remember(derived) { computeOverallStats(derived) }
    val groups = remember(derived) { groupByMonth(derived.sortedByDescending { it.date }) { it.date } }
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        VehicleChip(vehicle, onOpenVehicle)
        if (isLoading && derived.isEmpty()) return@Column
        if (derived.isEmpty()) {
            EmptyCard("No fuel entries yet. Add your first fill-up to get started.")
            return@Column
        }
        Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
            groups.forEach { group ->
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                        Text(group.label, style = EmberType.monthTitle.copy(color = c.foreground))
                        Text("${formatAmount(group.items.sumOf { it.amountPaid })} spent", style = EmberType.body14Medium.copy(color = c.mutedForeground))
                    }
                    Column(Modifier.fillMaxWidth().emberCard().padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        group.items.forEach { entry ->
                            Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(Radii.row)).background(c.card)) {
                                FillupRow(entry, sectorOf(entry, stats.averageMileage, stats.bestMileageEntry?.id), stats.averageMileage)
                                Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp).padding(bottom = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    PillButton("Edit", { onEdit(entry) }, Modifier.weight(1f), style = ButtonStyle.Ghost)
                                    PillButton("Delete", { deleting = entry }, Modifier.weight(1f), style = ButtonStyle.Ghost)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    deleting?.let { entry ->
        ConfirmDialog(
            title = "Delete this entry?",
            message = "This removes the fill-up on ${formatDate(entry.date)} at ${com.slowatcoding.combust.core.localeNumber(entry.odometerReading)} km. The previous entry's mileage will be recalculated. This can't be undone.",
            confirmText = "Delete",
            onConfirm = {
                deleting = null
                scope.launch { onDelete(entry.id); toast("Entry deleted") }
            },
            onDismiss = { deleting = null },
        )
    }
}

// --- Stats --------------------------------------------------------------------------------------

@Composable
private fun StatCard(icon: LucideIcon, label: String, value: String, detail: String? = null) {
    val c = Ember.colors
    Column(Modifier.fillMaxWidth().emberCard().padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(label, style = EmberType.meta13.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold, color = c.mutedForeground))
                Text(value, style = EmberType.statValue.copy(color = c.foreground))
            }
            Box(Modifier.size(36.dp).background(c.field, CircleShape), contentAlignment = Alignment.Center) {
                Icon(icon, c.flameText, size = 16.dp)
            }
        }
        if (detail != null) Text(detail, style = EmberType.body14.copy(color = c.mutedForeground))
    }
}

@Composable
fun StatsScreen(vehicle: Vehicle?, derived: List<DerivedEntry>, onOpenVehicle: () -> Unit) {
    val c = Ember.colors
    val stats: OverallStats = remember(derived) { computeOverallStats(derived) }
    val stations = remember(derived) { computeStationStats(derived) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        VehicleChip(vehicle, onOpenVehicle)
        if (stats.entryCount == 0) {
            EmptyCard("Add a couple of fill-ups to see your stats.")
        } else {
            val best = stats.bestMileageEntry
            val worst = stats.worstMileageEntry
            StatCard(Lucide.Gauge, "Average mileage", stats.averageMileage?.let(::formatMileage) ?: "—")
            StatCard(Lucide.TrendingUp, "Best mileage", best?.mileage?.let(::formatMileage) ?: "—", best?.let { "${it.fuelStation} · ${formatDate(it.date)}" })
            StatCard(Lucide.TrendingDown, "Worst mileage", worst?.mileage?.let(::formatMileage) ?: "—", worst?.let { "${it.fuelStation} · ${formatDate(it.date)}" })
            StatCard(Lucide.Route, "Total distance", formatKm(stats.totalDistanceCovered))
            StatCard(Lucide.Fuel, "Total litres filled", formatNumber(stats.totalLitresFilled))
            StatCard(Lucide.Wallet, "Total spent", formatAmount(stats.totalAmountSpent))
            StatCard(Lucide.Wallet, "Average cost / litre", stats.averageCostPerLitre?.let(::formatAmount) ?: "—")
        }

        if (stations.isEmpty()) {
            EmptyCard("Station breakdowns will show up once you have a few fill-ups logged.")
        } else {
            val bestMileage = stations.filter { it.averageMileage != null }.maxByOrNull { it.averageMileage!! }
            val bestValue = stations.filter { it.averageCostPerLitre != null }.minByOrNull { it.averageCostPerLitre!! }
            Text("By fuel station", style = EmberType.sectionTitle.copy(fontSize = 20.sp, color = c.foreground), modifier = Modifier.padding(horizontal = 2.dp))
            stations.forEach { station ->
                Column(Modifier.fillMaxWidth().emberCard().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp), itemVerticalAlignment = Alignment.CenterVertically) {
                        Text(station.station, style = EmberType.body15.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = c.foreground))
                        if (bestMileage?.station == station.station) Badge("Best mileage", BadgeStyle.Accent)
                        if (bestValue?.station == station.station) Badge("Best value", BadgeStyle.Accent)
                    }
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        StationLine("Fills", station.fillCount.toString())
                        StationLine("Avg mileage", station.averageMileage?.let(::formatMileage) ?: "—")
                        StationLine("Avg cost/L", station.averageCostPerLitre?.let(::formatAmount) ?: "—")
                        StationLine("Total spent", formatNumber(station.totalAmountSpent))
                    }
                }
            }
        }
    }
}

@Composable
private fun StationLine(label: String, value: String) {
    val c = Ember.colors
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = EmberType.body14.copy(color = c.mutedForeground))
        Text(value, style = EmberType.body14.copy(color = c.foreground))
    }
}

// --- Trends -------------------------------------------------------------------------------------

@Composable
fun TrendsScreen(vehicle: Vehicle?, derived: List<DerivedEntry>, onOpenVehicle: () -> Unit) {
    val c = Ember.colors
    var range by remember { mutableStateOf(TrendRange.All) }
    val ranged = remember(derived, range) { filterByRange(derived, range, LocalDate.now()) { it.date } }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        VehicleChip(vehicle, onOpenVehicle)
        if (derived.size < 2) {
            EmptyCard("Trends will appear once you have at least two fill-ups.")
            return@Column
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TrendRange.entries.forEach { r ->
                PillButton(
                    r.label, { range = r }, Modifier.weight(1f),
                    style = if (range == r) ButtonStyle.Ink else ButtonStyle.Outline, size = ButtonSize.Sm,
                )
            }
        }

        val mileagePoints = ranged.filter { it.mileage != null }.map {
            ChartPoint(it.mileage!!, "${formatNumberK(it.odometerReading)}k", formatDate(it.date))
        }
        val costPoints = ranged.filter { it.costPerLitre != null }.map {
            ChartPoint(it.costPerLitre!!, formatDate(it.date), formatDate(it.date))
        }

        ChartCard("Mileage over distance", "Km/l at each fill-up, by odometer reading") {
            LineChart(mileagePoints, c.chart1, "Mileage (km/l)")
        }
        ChartCard("Cost per litre over time", "What you paid per litre at each fill-up") {
            LineChart(costPoints, c.chart2, "Cost / litre")
        }
    }
}

private fun formatNumberK(odometer: Double) = String.format(java.util.Locale.US, "%.1f", odometer / 1000)

@Composable
private fun ChartCard(title: String, subtitle: String, content: @Composable () -> Unit) {
    val c = Ember.colors
    Column(Modifier.fillMaxWidth().emberCard().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, style = EmberType.cardTitle.copy(color = c.foreground))
            Text(subtitle, style = EmberType.body14.copy(color = c.mutedForeground))
        }
        content()
    }
}
