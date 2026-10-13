package com.slowatcoding.combust.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.slowatcoding.combust.core.DerivedEntry
import com.slowatcoding.combust.core.Sector
import com.slowatcoding.combust.core.formatAmount
import com.slowatcoding.combust.core.formatDate
import com.slowatcoding.combust.core.formatKm
import com.slowatcoding.combust.core.formatMileage
import com.slowatcoding.combust.core.formatNumber
import com.slowatcoding.combust.core.pipsOf
import com.slowatcoding.combust.core.stationCode
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberColors
import com.slowatcoding.combust.ui.theme.EmberType

fun sectorPipColor(sector: Sector, c: EmberColors) = when (sector) {
    Sector.Best -> c.flame
    Sector.Up -> c.flame2
    Sector.Down -> c.mutedForeground.copy(alpha = 0.5f)
    Sector.None -> c.pipOff
}

@Composable
fun HeatPipsFor(mileage: Double, sector: Sector, average: Double?, modifier: Modifier = Modifier) {
    HeatPips(pipsOf(mileage, average, sector), sectorPipColor(sector, Ember.colors), modifier)
}

/** Status of a row's mileage: a badge for the non-measurable states, otherwise the numeral. */
@Composable
fun MileageStatus(entry: DerivedEntry) {
    when {
        entry.isPending -> Badge("Pending", BadgeStyle.OutlineDashed)
        entry.isOdometerRegression -> Badge("Odometer regressed", BadgeStyle.Destructive)
        entry.hasGap -> Badge("Missed fill", BadgeStyle.Warning)
        entry.isPartial -> Badge("Partial fill", BadgeStyle.Secondary)
        entry.mileage == null -> Text("—", style = EmberType.body14.copy(color = Ember.colors.mutedForeground))
    }
}

/**
 * Fill-up row shared by the Overview's "Recent fill-ups" and the Entries list: station chip + name
 * on the left, mileage with its heat pips on the right. Mirrors `FillupRow` on the web.
 */
@Composable
fun FillupRow(entry: DerivedEntry, sector: Sector, average: Double?, modifier: Modifier = Modifier) {
    val c = Ember.colors
    val hasMileage = entry.mileage != null && !entry.isPending && !entry.isOdometerRegression && !entry.hasGap && !entry.isPartial
    Row(
        modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(44.dp).background(c.field, CircleShape), contentAlignment = Alignment.Center) {
            Text(stationCode(entry.fuelStation), style = EmberType.stationCode.copy(color = c.mutedForeground))
        }
        Column(Modifier.weight(1f)) {
            Text(entry.fuelStation, style = EmberType.body15Semi.copy(color = c.foreground), maxLines = 1, overflow = TextOverflow.Ellipsis)
            val meta = buildString {
                append(formatDate(entry.date)).append(" · ").append(formatNumber(entry.litresFilled)).append(" L")
                if (entry.isPartial) append(" (partial)")
                append(" · ").append(formatAmount(entry.amountPaid))
                entry.costPerLitre?.let { append(" · ").append(formatAmount(it)).append("/L") }
            }
            Text(meta, style = EmberType.meta13.copy(color = c.mutedForeground), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (hasMileage) {
                Text(formatNumber(entry.mileage!!), style = EmberType.rowMileage.copy(color = c.foreground))
                HeatPipsFor(entry.mileage!!, sector, average)
            } else {
                MileageStatus(entry)
                Text(formatKm(entry.odometerReading), style = EmberType.small12.copy(color = c.mutedForeground))
            }
        }
    }
}

/** Mileage text for the wide (table-like) layouts: "42.10 km/l" with pips. */
@Composable
fun MileageCell(entry: DerivedEntry, sector: Sector, average: Double?) {
    if (entry.isPending || entry.isOdometerRegression || entry.hasGap || entry.isPartial || entry.mileage == null) {
        MileageStatus(entry)
    } else {
        Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(formatMileage(entry.mileage!!), style = EmberType.body15Semi.copy(color = Ember.colors.foreground))
            HeatPipsFor(entry.mileage!!, sector, average)
        }
    }
}
