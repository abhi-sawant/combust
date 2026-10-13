package com.slowatcoding.combust.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.slowatcoding.combust.ui.theme.Ember
import com.slowatcoding.combust.ui.theme.EmberType
import com.slowatcoding.combust.ui.theme.Radii
import kotlinx.coroutines.delay

/** Bottom sheet with the Ember look (28dp top radius, card surface). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmberSheet(
    onDismiss: () -> Unit,
    title: String,
    subtitle: String? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val c = Ember.colors
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = c.card,
        contentColor = c.foreground,
        shape = RoundedCornerShape(topStart = Radii.sheet, topEnd = Radii.sheet),
        dragHandle = {
            Box(Modifier.padding(top = 10.dp, bottom = 4.dp).clip(CircleShape).background(c.input).padding(horizontal = 18.dp, vertical = 2.dp))
        },
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .imePadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
                .padding(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.padding(top = 4.dp)) {
                Text(title, style = EmberType.sheetTitle.copy(color = c.foreground))
                if (subtitle != null) Text(subtitle, style = EmberType.body14.copy(color = c.mutedForeground))
            }
            content()
        }
    }
}

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    destructive: Boolean = true,
) {
    val c = Ember.colors
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = c.card,
        shape = RoundedCornerShape(Radii.card),
        title = { Text(title, style = EmberType.cardTitle.copy(color = c.foreground)) },
        text = { Text(message, style = EmberType.body14.copy(color = c.mutedForeground)) },
        confirmButton = {
            PillButton(
                confirmText, onConfirm,
                style = if (destructive) ButtonStyle.Destructive else ButtonStyle.Ink,
            )
        },
        dismissButton = { PillButton("Cancel", onDismiss, style = ButtonStyle.Outline) },
    )
}

// --- Toasts (sonner equivalent) ---------------------------------------------------------------

@Stable
class ToastState {
    var message by mutableStateOf<String?>(null)
        private set
    private var token by mutableStateOf(0)

    fun show(text: String) {
        message = text
        token++
    }

    internal fun clear(forToken: Int) {
        if (forToken == token) message = null
    }

    internal val currentToken get() = token
}

val LocalToaster = staticCompositionLocalOf<(String) -> Unit> { {} }

@Composable
fun ToastHost(state: ToastState, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val c = Ember.colors
    CompositionLocalProvider(LocalToaster provides state::show) {
        Box(modifier.fillMaxSize()) {
            content()
            val message = state.message
            LaunchedEffect(message, state.currentToken) {
                if (message != null) {
                    val t = state.currentToken
                    delay(2800)
                    state.clear(t)
                }
            }
            AnimatedVisibility(
                visible = message != null,
                modifier = Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 96.dp, start = 24.dp, end = 24.dp),
                enter = fadeIn() + slideInVertically { it / 2 },
                exit = fadeOut() + slideOutVertically { it / 2 },
            ) {
                Row(
                    Modifier.floating(CircleShape).background(c.primary, CircleShape).padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(message ?: "", style = EmberType.body14Medium.copy(color = c.primaryForeground))
                }
            }
        }
    }
}
