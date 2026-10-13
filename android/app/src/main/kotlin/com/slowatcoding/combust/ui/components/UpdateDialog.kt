package com.slowatcoding.combust.ui.components

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.core.net.toUri
import com.slowatcoding.combust.BuildConfig
import com.slowatcoding.combust.core.ReleaseInfo
import com.slowatcoding.combust.core.changelogLines
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import com.slowatcoding.combust.ui.theme.Radii
import com.slowatcoding.combust.update.UpdateChecker

/**
 * "New version available": shown once per app open when GitHub has a newer release than the
 * running build. Update opens the release page (the signed APK is attached there; Combust is
 * sideloaded, so the app does not install itself). Not now hides it until the next open;
 * Skip this version hides it until a newer release exists.
 */
@Composable
fun UpdateDialog(release: ReleaseInfo, onNotNow: () -> Unit, onSkip: () -> Unit) {
    val context = LocalContext.current
    val c = Ember.colors
    val lines = remember(release.notes) { changelogLines(release.notes) }
    Dialog(onDismissRequest = onNotNow) {
        Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(Radii.card)).background(c.card).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("Update available", style = EmberType.cardTitle.copy(color = c.foreground))
                Text(
                    "Combust ${release.version} is out. You have ${BuildConfig.VERSION_NAME}.",
                    style = EmberType.body14.copy(color = c.mutedForeground),
                )
            }
            if (lines.isNotEmpty()) {
                Column(
                    Modifier.heightIn(max = 240.dp).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("What's new", style = EmberType.body14Medium.copy(color = c.foreground))
                    lines.forEach { line ->
                        if (line.isBlank()) Text("", style = EmberType.tiny11)
                        else Text(line, style = EmberType.body14.copy(color = c.mutedForeground))
                    }
                }
            }
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                PillButton(
                    "Update",
                    {
                        val url = release.url.ifBlank { UpdateChecker.RELEASES_PAGE_URL }
                        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, url.toUri())) }
                        onNotNow()
                    },
                    Modifier.fillMaxWidth(), size = ButtonSize.Lg,
                )
                PillButton("Not now", onNotNow, Modifier.fillMaxWidth(), style = ButtonStyle.Outline, size = ButtonSize.Lg)
                PillButton("Skip this version", onSkip, Modifier.fillMaxWidth(), style = ButtonStyle.Ghost)
            }
        }
    }
}
