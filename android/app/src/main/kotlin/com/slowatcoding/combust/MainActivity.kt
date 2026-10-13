package com.slowatcoding.combust

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import com.slowatcoding.combust.ui.components.ToastHost
import com.slowatcoding.combust.ui.components.ToastState
import com.slowatcoding.combust.ui.screens.AppRoot
import com.slowatcoding.combust.ui.theme.CombustTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val controller = (application as CombustApp).controller
        setContent {
            val theme by controller.theme.collectAsState()
            CombustTheme(theme) {
                val toasts = remember { ToastState() }
                ToastHost(toasts) { AppRoot(controller) }
            }
        }
    }
}
