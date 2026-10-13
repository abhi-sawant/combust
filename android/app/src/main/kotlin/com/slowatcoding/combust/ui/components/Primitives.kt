package com.slowatcoding.combust.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import com.slowatcoding.combust.ui.theme.Radii

// --- Icons ----------------------------------------------------------------------------------

/** A Lucide stroke icon: one or more SVG path strings on a 24x24 grid. */
class LucideIcon(vararg val paths: String) {
    internal val parsed: List<Path> by lazy { paths.map { PathParser().parsePathString(it).toPath() } }
}

@Composable
fun Icon(
    icon: LucideIcon,
    tint: Color,
    modifier: Modifier = Modifier,
    size: Dp = 20.dp,
    strokeWidth: Float = 2f,
    contentDescription: String? = null,
) {
    val semantic = if (contentDescription != null) Modifier.semantics { this.contentDescription = contentDescription } else Modifier
    Canvas(modifier.size(size).then(semantic)) {
        val scale = this.size.width / 24f
        withTransform({ scale(scale, scale, pivot = Offset.Zero) }) {
            for (p in icon.parsed) {
                drawPath(p, tint, style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round))
            }
        }
    }
}

private const val DROP = "M12 2c.6 3.2 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-1.9 1-3.3 2-4.3.2 1.2.9 2 1.7 2.3C10 8 10.8 4.6 12 2Z"

private val dropPath: Path by lazy { PathParser().parsePathString(DROP).toPath() }

/** The flame drop, a flame-gradient fill (same path as the web BrandMark). */
@Composable
fun BrandMark(modifier: Modifier = Modifier, size: Dp = 24.dp, solid: Color? = null) {
    val c = Ember.colors
    Canvas(modifier.size(size)) {
        val s = this.size.width / 24f
        withTransform({ scale(s, s, pivot = Offset.Zero) }) {
            val brush: Brush = if (solid != null) SolidColor(solid) else Brush.verticalGradient(
                listOf(c.flame2, c.flame), startY = 2f, endY = 18.5f,
            )
            drawPath(dropPath, brush)
        }
    }
}

// --- Surfaces -------------------------------------------------------------------------------

/** Card elevation: soft shadow by day, a hairline by night (as on the web). */
@Composable
fun Modifier.emberCard(shape: Shape = RoundedCornerShape(Radii.card)): Modifier {
    val c = Ember.colors
    return if (c.isDark) {
        this.clip(shape).background(c.card, shape).border(1.dp, c.border, shape)
    } else {
        this
            .shadow(8.dp, shape, ambientColor = c.shadow.copy(alpha = 0.10f), spotColor = c.shadow.copy(alpha = 0.16f))
            .background(c.card, shape)
    }
}

@Composable
fun Modifier.floating(shape: Shape): Modifier {
    val c = Ember.colors
    return if (c.isDark) {
        this.shadow(20.dp, shape, ambientColor = Color.Black, spotColor = Color.Black).background(c.card, shape).border(1.dp, c.border, shape)
    } else {
        this.shadow(20.dp, shape, ambientColor = c.shadow.copy(alpha = 0.25f), spotColor = c.shadow.copy(alpha = 0.35f)).background(c.card, shape)
    }
}

// --- Buttons --------------------------------------------------------------------------------

enum class ButtonStyle { Ink, Flame, Card, Outline, Secondary, Ghost, Destructive }

enum class ButtonSize(val height: Dp, val padding: Dp) { Sm(32.dp, 14.dp), Md(40.dp, 18.dp), Lg(48.dp, 24.dp) }

@Composable
fun PillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: ButtonStyle = ButtonStyle.Ink,
    size: ButtonSize = ButtonSize.Md,
    enabled: Boolean = true,
    icon: LucideIcon? = null,
) {
    val c = Ember.colors
    val shape = CircleShape
    val (bg, fg) = when (style) {
        ButtonStyle.Ink -> c.primary to c.primaryForeground
        ButtonStyle.Flame -> c.flame to c.flameForeground
        ButtonStyle.Card -> c.card to c.foreground
        ButtonStyle.Outline -> Color.Transparent to c.foreground
        ButtonStyle.Secondary -> c.field to c.foreground
        ButtonStyle.Ghost -> Color.Transparent to c.foreground
        ButtonStyle.Destructive -> c.destructive.copy(alpha = 0.10f) to c.destructive
    }
    var m = modifier.defaultMinSize(minHeight = size.height).alpha(if (enabled) 1f else 0.5f)
    if (style == ButtonStyle.Card) m = m.emberCard(shape)
    m = m.clip(shape).background(bg, shape)
    if (style == ButtonStyle.Outline) m = m.border(BorderStroke(1.dp, c.input), shape)
    Row(
        m.clickable(enabled = enabled, role = Role.Button, onClick = onClick).padding(horizontal = size.padding),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (icon != null) Icon(icon, fg, size = 18.dp)
        Text(text, style = EmberType.button.copy(color = fg), maxLines = 1, softWrap = false)
    }
}

/** Round icon-only button (header actions). */
@Composable
fun CircleIconButton(
    icon: LucideIcon,
    description: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 42.dp,
    iconTint: Color = Ember.colors.foreground,
    iconSize: Dp = 20.dp,
) {
    Box(
        modifier
            .size(size)
            .emberCard(CircleShape)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, iconTint, size = iconSize) }
}

@Composable
fun GhostIconButton(icon: LucideIcon, description: String, onClick: () -> Unit, tint: Color = Ember.colors.mutedForeground) {
    Box(
        Modifier
            .size(36.dp)
            .clip(CircleShape)
            .clickable(role = Role.Button, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) { Icon(icon, tint, size = 18.dp) }
}

@Composable
fun TextLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, color: Color = Ember.colors.primary) {
    Text(
        text,
        style = EmberType.body14Medium.copy(color = color),
        modifier = modifier.clip(RoundedCornerShape(6.dp)).clickable(role = Role.Button, onClick = onClick).padding(2.dp),
    )
}

// --- Badges & pips --------------------------------------------------------------------------

enum class BadgeStyle { Default, Secondary, Destructive, Outline, OutlineDashed, Warning, Accent }

@Composable
fun Badge(text: String, style: BadgeStyle = BadgeStyle.Default, modifier: Modifier = Modifier) {
    val c = Ember.colors
    val (bg, fg) = when (style) {
        BadgeStyle.Default -> c.primary to c.primaryForeground
        BadgeStyle.Secondary -> c.field to c.foreground
        BadgeStyle.Destructive -> c.destructive.copy(alpha = if (c.isDark) 0.2f else 0.1f) to c.destructive
        BadgeStyle.Outline, BadgeStyle.OutlineDashed -> Color.Transparent to c.foreground
        BadgeStyle.Warning -> c.warningBand to c.warningBandForeground
        BadgeStyle.Accent -> c.field to c.foreground
    }
    var m = modifier.height(24.dp).clip(CircleShape).background(bg, CircleShape)
    if (style == BadgeStyle.Outline) m = m.border(1.dp, c.border, CircleShape)
    if (style == BadgeStyle.OutlineDashed) m = m.border(1.dp, c.mutedForeground, CircleShape)
    Box(m.padding(horizontal = 10.dp), contentAlignment = Alignment.Center) {
        Text(text, style = EmberType.small12.copy(color = fg), maxLines = 1)
    }
}

@Composable
fun HeatPips(on: Int, onColor: Color, modifier: Modifier = Modifier) {
    val c = Ember.colors
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        for (i in 1..5) {
            Box(Modifier.width(12.dp).height(4.dp).background(if (i <= on) onColor else c.pipOff, CircleShape))
        }
    }
}

// --- Inputs ---------------------------------------------------------------------------------

@Composable
fun FieldLabel(text: String, modifier: Modifier = Modifier) {
    Text(text, style = EmberType.label13Bold.copy(color = Ember.colors.mutedForeground), modifier = modifier)
}

@Composable
fun EmberTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    error: String? = null,
    helper: String? = null,
    enabled: Boolean = true,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    singleLine: Boolean = true,
    textStyle: TextStyle = EmberType.body15,
    height: Dp = 44.dp,
    trailing: (@Composable RowScope.() -> Unit)? = null,
    onFocusChange: (Boolean) -> Unit = {},
) {
    val c = Ember.colors
    var focused by remember { mutableStateOf(false) }
    val borderColor = when {
        error != null -> c.destructive
        focused -> c.flame
        else -> c.input
    }
    val shape = RoundedCornerShape(Radii.input)
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        if (label != null) FieldLabel(label)
        Row(
            Modifier
                .fillMaxWidth()
                .height(height)
                .alpha(if (enabled) 1f else 0.5f)
                .clip(shape)
                .background(c.card, shape)
                .border(1.dp, borderColor, shape)
                .padding(start = 14.dp, end = if (trailing != null) 6.dp else 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.weight(1f), contentAlignment = Alignment.CenterStart) {
                if (value.isEmpty() && placeholder != null) {
                    Text(placeholder, style = textStyle.copy(color = c.mutedForeground.copy(alpha = 0.7f)), maxLines = 1)
                }
                BasicTextField(
                    value = value,
                    onValueChange = onValueChange,
                    enabled = enabled,
                    singleLine = singleLine,
                    textStyle = textStyle.copy(color = c.foreground),
                    cursorBrush = SolidColor(c.flame),
                    keyboardOptions = keyboardOptions,
                    keyboardActions = keyboardActions,
                    visualTransformation = visualTransformation,
                    modifier = Modifier.fillMaxWidth().onFocusChanged { focused = it.isFocused; onFocusChange(it.isFocused) },
                )
            }
            trailing?.invoke(this)
        }
        if (error != null) Text(error, style = EmberType.meta13.copy(color = c.destructive))
        else if (helper != null) Text(helper, style = EmberType.meta13.copy(color = c.mutedForeground))
    }
}

@Composable
fun SwitchRow(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    val c = Ember.colors
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp), verticalAlignment = Alignment.Top) {
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = EmberType.body14Medium.copy(color = c.foreground))
            Text(description, style = EmberType.meta13.copy(color = c.mutedForeground))
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = c.primaryForeground,
                checkedTrackColor = c.primary,
                uncheckedThumbColor = c.mutedForeground,
                uncheckedTrackColor = c.field,
                uncheckedBorderColor = c.input,
            ),
        )
    }
}

/** Selectable outlined tile (theme choice, vehicle row). */
@Composable
fun Modifier.selectableTile(selected: Boolean, shape: Shape = RoundedCornerShape(Radii.input), onClick: () -> Unit): Modifier {
    val c = Ember.colors
    return this
        .clip(shape)
        .background(if (selected) c.field else c.card, shape)
        .border(1.dp, if (selected) c.primary else c.border, shape)
        .clickable(role = Role.Button, onClick = onClick)
}

@Composable
fun Divider(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().height(1.dp).background(Ember.colors.border))
}
