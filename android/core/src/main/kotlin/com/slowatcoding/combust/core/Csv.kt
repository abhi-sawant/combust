package com.slowatcoding.combust.core

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.ResolverStyle
import java.util.Locale

data class CsvImportError(val line: Int, val reason: String)

data class CsvImportResult(val rows: List<FuelEntryInput>, val errors: List<CsvImportError>)

/** Zero-width space/non-joiner/joiner, BOM and no-break space: stray prefixes seen in source data. */
private val INVISIBLE_CHARS = Regex("[​‌‍﻿ ]")

private fun sanitizeCell(value: String): String = value.replace(INVISIBLE_CHARS, "").trim()

/** Minimal RFC4180-ish line splitter: handles quoted fields with embedded commas/quotes. */
internal fun parseCsvLine(line: String): List<String> {
    val cells = mutableListOf<String>()
    val current = StringBuilder()
    var inQuotes = false
    var i = 0
    while (i < line.length) {
        val c = line[i]
        if (inQuotes) {
            if (c == '"') {
                if (i + 1 < line.length && line[i + 1] == '"') {
                    current.append('"')
                    i++
                } else {
                    inQuotes = false
                }
            } else {
                current.append(c)
            }
        } else if (c == '"') {
            inQuotes = true
        } else if (c == ',') {
            cells.add(current.toString())
            current.setLength(0)
        } else {
            current.append(c)
        }
        i++
    }
    cells.add(current.toString())
    return cells
}

private fun strict(pattern: String) =
    DateTimeFormatter.ofPattern(pattern, Locale.ENGLISH).withResolverStyle(ResolverStyle.STRICT)

private val DATE_FORMATS = listOf("uuuu/M/d", "uuuu-M-d", "d/M/uuuu", "M/d/uuuu").map(::strict)
private val FALLBACK_FORMATS = listOf("d MMM uuuu", "MMM d, uuuu", "MMMM d, uuuu", "d MMMM uuuu").map(::strict)

private fun parseFlexibleDate(raw: String): String? {
    val s = sanitizeCell(raw)
    if (s.isEmpty()) return null

    for (f in DATE_FORMATS) {
        runCatching { return LocalDate.parse(s, f).toString() }
    }
    // Rough equivalent of the web's native `new Date(text)` fallback.
    runCatching { return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE).toString() }
    runCatching { return LocalDateTime.parse(s, DateTimeFormatter.ISO_LOCAL_DATE_TIME).toLocalDate().toString() }
    runCatching {
        return OffsetDateTime.parse(s, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
            .atZoneSameInstant(ZoneId.systemDefault()).toLocalDate().toString()
    }
    for (f in FALLBACK_FORMATS) {
        runCatching { return LocalDate.parse(s, f).toString() }
    }
    return null
}

private val NUMBER = Regex("^[+-]?(\\d+\\.?\\d*|\\.\\d+)([eE][+-]?\\d+)?$")

private fun parseFlexibleNumber(raw: String): Double? {
    val s = sanitizeCell(raw).replace(Regex("[,₹$\\s]"), "")
    if (s.isEmpty() || !NUMBER.matches(s)) return null
    return s.toDoubleOrNull()?.takeIf { it.isFinite() }
}

val REQUIRED_COLUMNS = listOf("date", "amount paid", "odometer reading", "fuel filled", "fuel station")

/** Optional columns; blank or absent means the default (full tank, no missed fill). */
val OPTIONAL_COLUMNS = listOf("full tank", "missed fill")

private val TRUTHY = listOf("yes", "y", "true", "1")
private val FALSY = listOf("no", "n", "false", "0")

/** Parses a yes/no cell; blank falls back to [fallback], unrecognised text yields null. */
private fun parseFlexibleBoolean(raw: String, fallback: Boolean): Boolean? {
    val s = sanitizeCell(raw).lowercase()
    return when {
        s.isEmpty() -> fallback
        s in TRUTHY -> true
        s in FALSY -> false
        else -> null
    }
}

/**
 * Parses the CSV export format: Date, Amount Paid, Odometer Reading, Fuel Filled, Fuel Station
 * (+ optional Full Tank, Missed Fill). Rows that don't parse are skipped and reported.
 */
fun parseFuelEntriesCsv(text: String): CsvImportResult {
    val lines = text.split(Regex("\r\n|\n|\r")).filter { it.isNotBlank() }
    val rows = mutableListOf<FuelEntryInput>()
    val errors = mutableListOf<CsvImportError>()

    if (lines.isEmpty()) return CsvImportResult(rows, listOf(CsvImportError(0, "File is empty.")))

    val header = parseCsvLine(lines[0]).map { sanitizeCell(it).lowercase() }
    fun idx(name: String) = header.indexOf(name)

    val missing = REQUIRED_COLUMNS.filter { idx(it) == -1 }
    if (missing.isNotEmpty()) {
        return CsvImportResult(rows, listOf(CsvImportError(1, "Missing column(s): ${missing.joinToString(", ")}")))
    }

    val dateIdx = idx("date")
    val amountIdx = idx("amount paid")
    val odometerIdx = idx("odometer reading")
    val litresIdx = idx("fuel filled")
    val stationIdx = idx("fuel station")
    val fullTankIdx = idx("full tank")
    val missedIdx = idx("missed fill")

    for (i in 1 until lines.size) {
        val lineNumber = i + 1
        val cells = parseCsvLine(lines[i])
        fun cell(index: Int) = cells.getOrNull(index) ?: ""

        val date = parseFlexibleDate(cell(dateIdx))
        val amountPaid = parseFlexibleNumber(cell(amountIdx))
        val odometer = parseFlexibleNumber(cell(odometerIdx))
        val litres = parseFlexibleNumber(cell(litresIdx))
        val station = sanitizeCell(cell(stationIdx))
        val isFullTank = parseFlexibleBoolean(if (fullTankIdx == -1) "" else cell(fullTankIdx), true)
        val missedPrevious = parseFlexibleBoolean(if (missedIdx == -1) "" else cell(missedIdx), false)

        val rowErrors = mutableListOf<String>()
        if (date == null) rowErrors.add("unparseable date")
        if (amountPaid == null || amountPaid <= 0) rowErrors.add("invalid amount paid")
        if (odometer == null || odometer <= 0) rowErrors.add("invalid odometer reading")
        if (litres == null || litres <= 0) rowErrors.add("invalid fuel filled")
        if (station.isEmpty()) rowErrors.add("missing fuel station")
        if (isFullTank == null) rowErrors.add("full tank must be yes or no")
        if (missedPrevious == null) rowErrors.add("missed fill must be yes or no")

        if (rowErrors.isNotEmpty()) {
            errors.add(CsvImportError(lineNumber, rowErrors.joinToString(", ")))
            continue
        }

        rows.add(
            FuelEntryInput(
                date = date!!,
                amountPaid = amountPaid!!,
                odometerReading = odometer!!,
                litresFilled = litres!!,
                fuelStation = station,
                isFullTank = isFullTank!!,
                missedPrevious = missedPrevious!!,
            ),
        )
    }
    return CsvImportResult(rows, errors)
}
