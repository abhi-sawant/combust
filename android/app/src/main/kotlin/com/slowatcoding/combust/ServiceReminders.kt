package com.slowatcoding.combust

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import com.slowatcoding.combust.data.Prefs
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.slowatcoding.combust.core.ReminderDue
import com.slowatcoding.combust.core.ServiceStatusKind
import com.slowatcoding.combust.core.describeRemaining

/** Intent extra that makes MainActivity open the Service tab. */
const val EXTRA_OPEN_SERVICE = "openServiceTab"

private const val CHANNEL_ID = "service-reminders"

object ServiceNotifications {
    fun ensureChannel(context: Context) {
        val channel = NotificationChannel(CHANNEL_ID, "Service reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Tells you when a part or service is due soon or overdue."
        }
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }

    fun canPost(context: Context): Boolean =
        android.os.Build.VERSION.SDK_INT < 33 ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    /** One notification per item (keyed by item id), replacing any earlier one for the same item. */
    fun post(context: Context, due: ReminderDue) {
        if (!canPost(context)) return
        ensureChannel(context)
        val open = Intent(context, MainActivity::class.java)
            .putExtra(EXTRA_OPEN_SERVICE, true)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val tap = PendingIntent.getActivity(
            context, due.item.id.hashCode(), open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val title = if (due.status.status == ServiceStatusKind.Overdue) "${due.item.name} is overdue" else "${due.item.name} is due soon"
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle(title)
            .setContentText(describeRemaining(due.status))
            .setContentIntent(tap)
            .setAutoCancel(true)
            .build()
        @Suppress("MissingPermission") // checked by canPost
        NotificationManagerCompat.from(context).notify(due.item.id.hashCode(), notification)
    }
}

/** Daily check: notifies once per item whenever it newly becomes due soon or overdue. */
class ServiceReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val controller = (applicationContext as CombustApp).controller
        controller.collectServiceReminders(ServiceNotifications.canPost(applicationContext)).forEach { ServiceNotifications.post(applicationContext, it) }
        return Result.success()
    }

    companion object {
        const val NAME = "combust-service-reminders"
    }
}

/**
 * Returns a function that asks for the notification permission (API 33+) the first time it is
 * needed, i.e. when an item with an interval is first saved. Later calls are no-ops.
 */
@Composable
fun rememberNotificationPermissionRequest(prefs: Prefs): () -> Unit {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    return remember(launcher) {
        {
            ServiceNotifications.ensureChannel(context)
            if (android.os.Build.VERSION.SDK_INT >= 33 && !prefs.notificationPermissionAsked && !ServiceNotifications.canPost(context)) {
                prefs.notificationPermissionAsked = true
                launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}
