package com.slowatcoding.combust.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.slowatcoding.combust.data.ThemeChoice

/**
 * Ember design tokens, mirroring `web/src/index.css` (:root = daylight, .dark = aubergine night).
 * Always read colours from here, never raw hex or stock Material colours.
 */
@Immutable
class EmberColors(
    val isDark: Boolean,
    val flame: Color,
    val flame2: Color,
    val flameText: Color,
    val flameForeground: Color,
    val field: Color,
    val pipOff: Color,
    val background: Color,
    val foreground: Color,
    val card: Color,
    val popover: Color,
    val primary: Color,
    val primaryForeground: Color,
    val mutedForeground: Color,
    val destructive: Color,
    val border: Color,
    val input: Color,
    val chart1: Color,
    val chart2: Color,
    val best: Color,
    val up: Color,
    val down: Color,
    val barBest: Color,
    val barUp: Color,
    val barDown: Color,
    val warningBand: Color,
    val warningBandForeground: Color,
    val success: Color,
    val successSoft: Color,
    val dangerSoft: Color,
    val shadow: Color,
)

val DaylightColors = EmberColors(
    isDark = false,
    flame = Color(0xFFFF6B3D),
    flame2 = Color(0xFFFFB347),
    flameText = Color(0xFFC4410F),
    flameForeground = Color(0xFFFFFFFF),
    field = Color(0xFFE9E4F4),
    pipOff = Color(0xFFE2DEEB),
    background = Color(0xFFF3F1F7),
    foreground = Color(0xFF1D1630),
    card = Color(0xFFFFFFFF),
    popover = Color(0xFFFFFFFF),
    primary = Color(0xFF1D1630),
    primaryForeground = Color(0xFFF3F1F7),
    mutedForeground = Color(0xFF675F7C),
    destructive = Color(0xFFB3261E),
    border = Color(0xFFE5E1EE),
    input = Color(0xFFD3CDE2),
    chart1 = Color(0xFFFF6B3D),
    chart2 = Color(0xFF6F5BD0),
    best = Color(0xFFC4410F),
    up = Color(0xFF8A5A00),
    down = Color(0xFF675F7C),
    barBest = Color(0xFFFF6B3D),
    barUp = Color(0xFFFFB347),
    barDown = Color(0xFFA29BB5),
    warningBand = Color(0xFFFFEFC9),
    warningBandForeground = Color(0xFF7A5200),
    success = Color(0xFF0F9E45),
    successSoft = Color(0xFFD4F3DE),
    dangerSoft = Color(0xFFFDE4E1),
    shadow = Color(0xFF1D1630),
)

val NightColors = EmberColors(
    isDark = true,
    flame = Color(0xFFFF7A4D),
    flame2 = Color(0xFFFFBE5C),
    flameText = Color(0xFFFF9A73),
    flameForeground = Color(0xFF1A0B05),
    field = Color(0xFF2A2038),
    pipOff = Color(0xFF322941),
    background = Color(0xFF130F1A),
    foreground = Color(0xFFF1EDF8),
    card = Color(0xFF1C1626),
    popover = Color(0xFF231B2F),
    primary = Color(0xFFF1EDF8),
    primaryForeground = Color(0xFF130F1A),
    mutedForeground = Color(0xFFA79FBC),
    destructive = Color(0xFFFF958B),
    border = Color(0xFF2B2338),
    input = Color(0xFF3D3350),
    chart1 = Color(0xFFFF7A4D),
    chart2 = Color(0xFFA995FF),
    best = Color(0xFFFF9A73),
    up = Color(0xFFFFBE5C),
    down = Color(0xFFA79FBC),
    barBest = Color(0xFFFF7A4D),
    barUp = Color(0xFFFFBE5C),
    barDown = Color(0xFF6A6180),
    warningBand = Color(0xFF2E2409),
    warningBandForeground = Color(0xFFF5CD72),
    success = Color(0xFF4CD487),
    successSoft = Color(0xFF12301F),
    dangerSoft = Color(0xFF3A1A18),
    shadow = Color(0xFF000000),
)

val LocalEmber = staticCompositionLocalOf { DaylightColors }

/** Shorthand: `Ember.colors.flame`. */
object Ember {
    val colors: EmberColors
        @Composable @ReadOnlyComposable get() = LocalEmber.current
}

object Radii {
    val card = 28.dp
    val hero = 32.dp
    val fact = 22.dp
    val row = 20.dp
    val input = 16.dp
    val sheet = 28.dp
}

@Composable
fun CombustTheme(choice: ThemeChoice, content: @Composable () -> Unit) {
    val dark = when (choice) {
        ThemeChoice.System -> isSystemInDarkTheme()
        ThemeChoice.Light -> false
        ThemeChoice.Dark -> true
    }
    val c = if (dark) NightColors else DaylightColors
    // Material components we still use (switch, sheet, dialog, text selection) are mapped onto Ember.
    val scheme = (if (dark) darkColorScheme() else lightColorScheme()).copy(
        primary = c.primary,
        onPrimary = c.primaryForeground,
        secondary = c.field,
        onSecondary = c.foreground,
        background = c.background,
        onBackground = c.foreground,
        surface = c.card,
        onSurface = c.foreground,
        surfaceVariant = c.field,
        onSurfaceVariant = c.mutedForeground,
        surfaceContainerLow = c.card,
        surfaceContainer = c.card,
        surfaceContainerHigh = c.popover,
        surfaceContainerHighest = c.popover,
        outline = c.input,
        outlineVariant = c.border,
        error = c.destructive,
    )
    CompositionLocalProvider(LocalEmber provides c) {
        MaterialTheme(colorScheme = scheme, typography = EmberMaterialTypography, content = content)
    }
}
