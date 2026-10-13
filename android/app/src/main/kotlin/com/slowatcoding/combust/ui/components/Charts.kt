package com.slowatcoding.combust.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextMeasurer
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slowatcoding.combust.core.DerivedEntry
import com.slowatcoding.combust.core.Sector
import com.slowatcoding.combust.core.formatNumber
import com.slowatcoding.combust.core.sectorOf
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

private val PLOT = 132.dp // bar area; the tallest bar fills it
private const val SLOT_DP = 28f // min width per bar (incl. gap) so value labels never collide
private const val MIN_BARS = 5
private val MONTH = DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH)
private val MONTH_YEAR = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH)

/**
 * One pill per fill-up on the hero field. Bars share a zero baseline and are scaled linearly, so
 * height is proportional to km/l. Every bar prints its exact value; a dashed line marks the
 * average; the best fill glows in the flame gradient. Port of `MileageBars` on the web.
 */
@Composable
fun MileageBars(entries: List<DerivedEntry>, average: Double, modifier: Modifier = Modifier) {
    val c = Ember.colors
    BoxWithConstraints(modifier.fillMaxWidth()) {
        val fit = max(MIN_BARS, floor(maxWidth.value / SLOT_DP).toInt())
        val shown = entries.takeLast(min(fit, entries.size))
        val best = shown.reduce { a, e -> if (e.mileage!! > a.mileage!!) e else a }
        val max = max(shown.maxOf { it.mileage!! }, average)
        fun px(m: Double): Dp = max(8, ((m / max) * PLOT.value).roundToInt()).dp
        val slot = maxWidth.value / shown.size
        val gap = (slot * 0.08f).coerceIn(2f, 8f).dp
        val labelSize = (slot * 0.4f).coerceIn(9f, 12f).sp
        val dateSize = (slot * 0.36f).coerceIn(9f, 10f).sp

        Column {
            Row(Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("Last ${shown.size} fill-ups", style = EmberType.meta13Medium.copy(color = c.mutedForeground))
                Text("Best ${formatNumber(best.mileage!!)}", style = EmberType.meta13Medium.copy(color = c.mutedForeground))
            }
            Box(
                Modifier.semantics {
                    contentDescription = "Mileage of the last ${shown.size} fill-ups, " +
                        shown.joinToString(", ") { formatNumber(it.mileage!!, 1) } +
                        " km/l, against the ${formatNumber(average)} average"
                },
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(gap), verticalAlignment = Alignment.Bottom) {
                    shown.forEachIndexed { i, e ->
                        val sector = sectorOf(e, average, best.id)
                        val prev = shown.getOrNull(i - 1)
                        val d = LocalDate.parse(e.date)
                        val newMonth = prev == null || LocalDate.parse(prev.date).format(MONTH_YEAR) != d.format(MONTH_YEAR)
                        val grow = remember(e.id) { Animatable(0.02f) }
                        LaunchedEffect(e.id) {
                            grow.animateTo(1f, tween(900, delayMillis = i * 40, easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)))
                        }
                        Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                formatNumber(e.mileage!!, 1),
                                style = EmberType.small12.copy(
                                    fontSize = labelSize,
                                    color = if (sector == Sector.Best) c.flameText else c.foreground,
                                ),
                                maxLines = 1,
                                modifier = Modifier.padding(bottom = 6.dp),
                            )
                            val barShape = CircleShape
                            val base = Modifier
                                .width(26.dp.coerceAtMost((slot - 2).dp))
                                .height(px(e.mileage!!))
                                .graphicsLayer { scaleY = grow.value; transformOrigin = TransformOrigin(0.5f, 1f) }
                            when (sector) {
                                Sector.Best -> Box(base.shadow(4.dp, barShape, ambientColor = c.shadow.copy(0.1f), spotColor = c.shadow.copy(0.16f)).background(Brush.verticalGradient(listOf(c.flame2, c.flame)), barShape))
                                Sector.Up -> Box(base.shadow(4.dp, barShape, ambientColor = c.shadow.copy(0.1f), spotColor = c.shadow.copy(0.16f)).background(c.flame2, barShape))
                                else -> Box(base.emberCard(barShape))
                            }
                            Text(
                                if (newMonth) d.format(MONTH) else d.dayOfMonth.toString(),
                                style = EmberType.tiny11.copy(fontSize = dateSize, color = c.mutedForeground),
                                maxLines = 1,
                                modifier = Modifier.padding(top = 6.dp).height(12.dp),
                            )
                        }
                    }
                }
                // Dashed average line: 18dp date label area + the bar height for the average.
                Canvas(
                    Modifier
                        .fillMaxWidth()
                        .height(PLOT + 36.dp)
                        .align(Alignment.BottomStart),
                ) {
                    val y = size.height - (18.dp + px(average)).toPx()
                    drawLine(
                        c.foreground.copy(alpha = 0.35f), Offset(0f, y), Offset(size.width, y), strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx())),
                    )
                }
            }
            Row(Modifier.fillMaxWidth().padding(top = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                Canvas(Modifier.width(16.dp).height(1.dp)) {
                    drawLine(
                        c.foreground.copy(alpha = 0.5f), Offset.Zero, Offset(size.width, 0f), strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 2.dp.toPx())),
                    )
                }
                Text(
                    "  Average ${formatNumber(average)} km/l",
                    style = EmberType.tiny11.copy(color = c.mutedForeground),
                )
                Box(Modifier.weight(1f))
                Text("Bars start at 0", style = EmberType.tiny11.copy(color = c.mutedForeground))
            }
        }
    }
}

// --- Line chart (Trends) ------------------------------------------------------------------------

data class ChartPoint(val value: Double, val label: String, val tooltipTitle: String)

/** d3 `curveMonotoneX`-style smoothing: passes through every point without overshooting. */
internal fun monotonePath(xs: List<Float>, ys: List<Float>): Path {
    val path = Path()
    val n = xs.size
    if (n == 0) return path
    path.moveTo(xs[0], ys[0])
    if (n == 1) return path
    if (n == 2) { path.lineTo(xs[1], ys[1]); return path }

    val dx = FloatArray(n - 1) { xs[it + 1] - xs[it] }
    val slope = FloatArray(n - 1) { (ys[it + 1] - ys[it]) / dx[it] }
    val t = FloatArray(n)
    t[0] = slope[0]
    t[n - 1] = slope[n - 2]
    for (i in 1 until n - 1) {
        t[i] = if (slope[i - 1] * slope[i] <= 0) 0f else {
            val w1 = 2 * dx[i] + dx[i - 1]
            val w2 = dx[i] + 2 * dx[i - 1]
            (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i])
        }
    }
    for (i in 0 until n - 1) {
        val h = dx[i]
        path.cubicTo(xs[i] + h / 3, ys[i] + t[i] * h / 3, xs[i + 1] - h / 3, ys[i + 1] - t[i + 1] * h / 3, xs[i + 1], ys[i + 1])
    }
    return path
}

/**
 * A single-series line chart: horizontal grid only, no axis lines, smooth stroke of width 3, no dots.
 * Points are evenly spaced (category axis) like the Recharts charts on the web. Touch/drag shows a tooltip.
 */
@Composable
fun LineChart(points: List<ChartPoint>, color: Color, valueLabel: String, modifier: Modifier = Modifier) {
    val c = Ember.colors
    if (points.isEmpty()) {
        Box(modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
            Text("Not enough data in this range.", style = EmberType.body14.copy(color = c.mutedForeground))
        }
        return
    }
    val measurer = rememberTextMeasurer()
    val density = LocalDensity.current
    val minV = points.minOf { it.value }
    val maxV = points.maxOf { it.value }
    val lo = floor(minV - 1).toInt()
    val hi = ceil(maxV + 1).toInt()
    val tickCount = 4
    val step = max(1, ceil((hi - lo).toDouble() / tickCount).toInt())
    val ticks = generateSequence(lo) { it + step }.takeWhile { it <= hi }.toList()
    val top = ticks.last().coerceAtLeast(hi)

    var selected by remember(points) { mutableStateOf<Int?>(null) }
    val chartHeight = 200.dp
    val leftPad = 36.dp
    val bottomPad = 26.dp
    val labelStyle = EmberType.tiny11.copy(color = c.mutedForeground)

    BoxWithConstraints(modifier.fillMaxWidth().height(chartHeight)) {
        val widthPx = with(density) { maxWidth.toPx() }
        val heightPx = with(density) { chartHeight.toPx() }
        val left = with(density) { leftPad.toPx() }
        val bottom = with(density) { bottomPad.toPx() }
        val right = with(density) { 12.dp.toPx() }
        val plotW = widthPx - left - right
        val plotH = heightPx - bottom - with(density) { 8.dp.toPx() }
        val topY = with(density) { 8.dp.toPx() }
        fun xAt(i: Int) = left + if (points.size == 1) plotW / 2 else plotW * i / (points.size - 1)
        fun yAt(v: Double) = topY + plotH * (1 - ((v - lo) / (top - lo)).toFloat())

        Canvas(
            Modifier
                .fillMaxWidth()
                .height(chartHeight)
                .pointerInput(points) {
                    detectTapGestures { o -> selected = nearest(o.x, points.size, left, plotW) }
                }
                .pointerInput(points) {
                    detectDragGestures(
                        onDragStart = { o -> selected = nearest(o.x, points.size, left, plotW) },
                        onDrag = { change, _ -> selected = nearest(change.position.x, points.size, left, plotW) },
                    )
                },
        ) {
            ticks.forEach { t ->
                val y = yAt(t.toDouble())
                drawLine(c.border, Offset(left, y), Offset(widthPx - right, y), strokeWidth = 1.dp.toPx())
                drawText(measurer, t.toString(), Offset(0f, y - 7.dp.toPx()), labelStyle.copy(fontSize = 11.sp))
            }
            val xs = points.indices.map { xAt(it) }
            val ys = points.map { yAt(it.value) }
            drawPath(monotonePath(xs, ys), color, style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))

            // X labels: up to 4 evenly spread points.
            val labelIdx = if (points.size <= 4) points.indices.toList() else (0..3).map { (it * (points.size - 1) / 3.0).roundToInt() }.distinct()
            labelIdx.forEach { i ->
                val layout = measurer.measure(points[i].label, labelStyle.copy(fontSize = 11.sp))
                val x = (xAt(i) - layout.size.width / 2f).coerceIn(left - 4.dp.toPx(), widthPx - layout.size.width)
                drawText(layout, topLeft = Offset(x, heightPx - bottom + 8.dp.toPx()))
            }
            selected?.let { i ->
                drawLine(c.mutedForeground.copy(alpha = 0.4f), Offset(xs[i], topY), Offset(xs[i], topY + plotH), strokeWidth = 1.dp.toPx())
                drawCircle(c.card, 6.dp.toPx(), Offset(xs[i], ys[i]))
                drawCircle(color, 4.dp.toPx(), Offset(xs[i], ys[i]))
            }
        }

        selected?.let { i ->
            val p = points[i]
            val tipWidth = 150.dp
            val x = (xAt(i) - with(density) { tipWidth.toPx() } / 2).coerceIn(0f, widthPx - with(density) { tipWidth.toPx() })
            Column(
                Modifier
                    .offset { IntOffset(x.roundToInt(), 0) }
                    .width(tipWidth)
                    .emberCard(RoundedCornerShape(12.dp))
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(p.tooltipTitle, style = EmberType.small12.copy(color = c.foreground))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.width(8.dp).height(8.dp).background(color, CircleShape))
                    Text("$valueLabel  ${formatNumber(p.value)}", style = EmberType.meta13.copy(color = c.mutedForeground))
                }
            }
        }
    }
}

private fun nearest(x: Float, count: Int, left: Float, plotW: Float): Int {
    if (count <= 1) return 0
    val f = ((x - left) / plotW).coerceIn(0f, 1f)
    return (f * (count - 1)).roundToInt()
}
