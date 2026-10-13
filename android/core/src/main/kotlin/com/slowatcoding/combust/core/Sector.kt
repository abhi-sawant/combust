package com.slowatcoding.combust.core

/** Verdict for a fill-up: best fill, beat the average, fell short, or no mileage yet. */
enum class Sector { Best, Up, Down, None }

fun sectorOf(entry: DerivedEntry, average: Double?, bestId: String?): Sector {
    val mileage = entry.mileage
    if (mileage == null || average == null) return Sector.None
    if (entry.id == bestId) return Sector.Best
    return if (mileage >= average) Sector.Up else Sector.Down
}

/** Three-letter code derived from a free-text station name ("Indian Oil" -> "INO"). */
fun stationCode(name: String): String {
    val head = name.split(Regex("[·\\-–,(]")).first().trim()
    val words = head.split(Regex("\\s+")).filter { it.isNotEmpty() }
    val letters = when {
        words.size >= 3 -> words.map { it[0] }.joinToString("")
        words.size == 2 -> words[0].take(2) + words[1][0]
        else -> (words.firstOrNull() ?: "").take(3)
    }
    return (letters.ifEmpty { "???" }).uppercase().take(3)
}

/** Heat pips (1-5): how far a fill-up sits above or below the average. The best fill is always full. */
fun pipsOf(mileage: Double, average: Double?, sector: Sector): Int {
    if (sector == Sector.Best) return 5
    if (average == null || average <= 0) return 3
    // Math.round semantics (halves round up), not Kotlin's roundToInt.
    val raw = kotlin.math.floor(3 + 40 * (mileage / average - 1) + 0.5).toInt()
    return raw.coerceIn(1, 5)
}
