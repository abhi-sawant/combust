package com.slowatcoding.combust.core

import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

fun formatNumber(value: Double, fractionDigits: Int = 2, locale: Locale = Locale.getDefault()): String =
    NumberFormat.getNumberInstance(locale).apply {
        minimumFractionDigits = fractionDigits
        maximumFractionDigits = fractionDigits
    }.format(value)

private val DATE_FMT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH)

fun formatDate(dateIso: String): String = LocalDate.parse(dateIso).format(DATE_FMT)

fun formatKm(value: Double): String = "${formatNumber(value, 0)} km"

fun formatMileage(value: Double): String = "${formatNumber(value, 2)} km/l"

/** No currency symbol is assumed; the app doesn't collect a currency preference. */
fun formatAmount(value: Double): String = formatNumber(value, 2)

private fun plural(n: Int, unit: String): String = "${formatNumber(n.toDouble(), 0)} $unit${if (n == 1) "" else "s"}"

/** One line on what is left (or overdue), e.g. "1,000 km overdue · 5 days left". */
fun describeRemaining(status: ServiceStatus): String {
    val parts = mutableListOf<String>()
    status.kmRemaining?.let {
        parts += when {
            it < 0 -> "${formatKm(-it)} overdue"
            it == 0.0 -> "due now by distance"
            else -> "${formatKm(it)} left"
        }
    }
    status.daysRemaining?.let {
        parts += when {
            it < 0 -> "${plural(-it, "day")} overdue"
            it == 0 -> "due today"
            else -> "${plural(it, "day")} left"
        }
    }
    return parts.joinToString(" · ")
}

/** "Changed 3 Jan 2026 · 12,000 km", whichever parts were recorded. */
fun describeLastChange(item: ServiceItem): String {
    val parts = listOfNotNull(
        item.lastChangedDate?.let(::formatDate),
        item.lastChangedOdometer?.let(::formatKm),
    )
    return if (parts.isEmpty()) "Never logged" else "Changed ${parts.joinToString(" · ")}"
}
