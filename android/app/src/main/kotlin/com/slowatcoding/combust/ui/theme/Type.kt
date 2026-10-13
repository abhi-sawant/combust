package com.slowatcoding.combust.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.slowatcoding.combust.R

@OptIn(ExperimentalTextApi::class)
private fun variable(res: Int, vararg weights: Int) = FontFamily(
    weights.map { w ->
        Font(res, FontWeight(w), variationSettings = FontVariation.Settings(FontVariation.weight(w)))
    },
)

/** Bricolage Grotesque: numerals, titles and figures. */
val DisplayFont = variable(R.font.bricolage_grotesque, 500, 600, 700, 800)

/** Onest: everything else. */
val BodyFont = variable(R.font.onest, 400, 500, 600, 700)

private const val TABULAR = "tnum"

private fun body(size: Int, weight: Int = 400, lineHeight: TextUnit = TextUnit.Unspecified) = TextStyle(
    fontFamily = BodyFont,
    fontWeight = FontWeight(weight),
    fontSize = size.sp,
    lineHeight = lineHeight,
    fontFeatureSettings = TABULAR,
)

private fun display(size: Int, weight: Int = 700, tracking: Float = -0.025f, lineHeight: TextUnit = TextUnit.Unspecified) =
    TextStyle(
        fontFamily = DisplayFont,
        fontWeight = FontWeight(weight),
        fontSize = size.sp,
        lineHeight = lineHeight,
        letterSpacing = tracking.em,
        fontFeatureSettings = TABULAR,
    )

/** Named text styles matching the sizes used by the web components. */
object EmberType {
    val body15 = body(15, 400)
    val body15Semi = body(15, 600)
    val body14 = body(14, 400)
    val body14Medium = body(14, 500)
    val meta13 = body(13, 400)
    val meta13Medium = body(13, 500)
    val label13Bold = body(13, 700)
    val small12 = body(12, 500)
    val tiny11 = body(11, 400)
    val tab10 = body(10, 500)
    val button = body(15, 600)

    val sectionTitle = display(22, 700, -0.025f, 24.sp)
    val factValue = display(26, 700, -0.025f, 30.sp)
    val rowMileage = display(22, 700, -0.025f, 22.sp)
    val brand = display(21, 800, -0.025f, 21.sp)
    val authBrand = display(48, 800, -0.025f, 44.sp)
    val statValue = display(34, 800, -0.025f, 38.sp)
    val monthTitle = display(18, 700, -0.025f, 18.sp)
    val heroUnit = display(24, 600, -0.01f)
    val heroLine = display(17, 500, -0.01f, 22.sp)
    val emptyTitle = display(36, 800, -0.025f, 34.sp)
    val sheetTitle = body(20, 700)
    val cardTitle = body(18, 700)
    val stationCode = display(12, 700, 0.05f)

    fun heroNumeral(size: Int) = display(size, 800, -0.05f, (size * 0.86f).sp)
}

val EmberMaterialTypography = Typography().let {
    it.copy(
        bodyLarge = EmberType.body15,
        bodyMedium = EmberType.body14,
        bodySmall = EmberType.meta13,
        titleLarge = EmberType.sheetTitle,
        labelLarge = EmberType.button,
    )
}
