package com.slowatcoding.combust.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ServiceRemindersTest {
    private fun row(id: String, kind: ServiceStatusKind) = ServiceListRow(
        ServiceItem(id, "v", id),
        ServiceStatus(kind, null, null, null, null),
    )

    @Test
    fun notifiesOncePerTransitionAndForgetsRecovered() {
        val (first, state1) = planServiceReminders(
            listOf(row("a", ServiceStatusKind.DueSoon), row("b", ServiceStatusKind.Ok)), emptyMap(),
        )
        assertEquals(listOf("a"), first.map { it.item.id })

        val (again, _) = planServiceReminders(listOf(row("a", ServiceStatusKind.DueSoon)), state1)
        assertTrue(again.isEmpty())

        val (escalated, state2) = planServiceReminders(listOf(row("a", ServiceStatusKind.Overdue)), state1)
        assertEquals(listOf("a"), escalated.map { it.item.id })

        val (_, state3) = planServiceReminders(listOf(row("a", ServiceStatusKind.Ok)), state2)
        assertTrue(state3.isEmpty())
        val (renotify, _) = planServiceReminders(listOf(row("a", ServiceStatusKind.DueSoon)), state3)
        assertEquals(1, renotify.size)
    }
}
