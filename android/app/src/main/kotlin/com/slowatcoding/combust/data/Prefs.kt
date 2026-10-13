package com.slowatcoding.combust.data

import android.content.Context
import androidx.core.content.edit

enum class ThemeChoice(val label: String) { System("System"), Light("Light"), Dark("Dark") }

data class AuthUser(val id: Int, val name: String, val email: String)

/**
 * Small key-value settings, mirroring the web app's localStorage keys:
 * auth token/user, local-mode flag, active vehicle, user name and theme.
 * The app opts out of Android backups, so the token never leaves the device.
 */
class Prefs(context: Context) {
    private val sp = context.getSharedPreferences("combust", Context.MODE_PRIVATE)

    var token: String?
        get() = sp.getString("auth-token", null)
        set(value) = sp.edit { if (value == null) remove("auth-token") else putString("auth-token", value) }

    var user: AuthUser?
        get() = sp.getString("auth-user", null)?.let {
            val parts = it.split('\u0000')
            if (parts.size == 3) AuthUser(parts[0].toIntOrNull() ?: 0, parts[1], parts[2]) else null
        }
        set(value) = sp.edit {
            if (value == null) remove("auth-user") else putString("auth-user", "${value.id}\u0000${value.name}\u0000${value.email}")
        }

    var localModeChosen: Boolean
        get() = sp.getBoolean("local-mode", false)
        set(value) = sp.edit { putBoolean("local-mode", value) }

    var activeVehicleId: String?
        get() = sp.getString("active-vehicle-id", null)
        set(value) = sp.edit { if (value == null) remove("active-vehicle-id") else putString("active-vehicle-id", value) }

    var userName: String
        get() = sp.getString("user-name", "") ?: ""
        set(value) = sp.edit { if (value.isBlank()) remove("user-name") else putString("user-name", value.trim()) }

    var theme: ThemeChoice
        get() = runCatching { ThemeChoice.valueOf(sp.getString("theme", null) ?: "System") }.getOrDefault(ThemeChoice.System)
        set(value) = sp.edit { putString("theme", value.name) }
}
