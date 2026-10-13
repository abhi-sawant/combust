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
