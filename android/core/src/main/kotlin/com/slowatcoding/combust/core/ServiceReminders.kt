package com.slowatcoding.combust.core

/** A service item that just moved into a state worth a notification. */
data class ReminderDue(val item: ServiceItem, val status: ServiceStatus)

/**
 * Decides which items to notify about, given what was last notified per item id (a status name).
 * One notification per item per transition into due soon / overdue: an item already notified at its
 * current status stays quiet, and one that recovered (e.g. marked changed) is forgotten so it can
 * notify again later. Returns the items to notify and the updated last-notified map.
 */
fun planServiceReminders(
    rows: List<ServiceListRow>,
    lastNotified: Map<String, String>,
): Pair<List<ReminderDue>, Map<String, String>> {
    val next = HashMap<String, String>()
    val due = mutableListOf<ReminderDue>()
    for (row in sortByDue(rows)) {
        val kind = row.status.status
        if (kind != ServiceStatusKind.Overdue && kind != ServiceStatusKind.DueSoon) continue
        next[row.id] = kind.name
        if (lastNotified[row.id] != kind.name) due += ReminderDue(row.item, row.status)
    }
    return due to next
}
