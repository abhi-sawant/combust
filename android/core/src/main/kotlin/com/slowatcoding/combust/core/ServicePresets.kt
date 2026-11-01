package com.slowatcoding.combust.core

/** A common part offered in the "Add from presets" picker. Intervals are editable defaults. */
data class ServicePreset(val name: String, val intervalKm: Double?, val intervalMonths: Int?) {
    fun toInput() = ServiceItemInput(name = name, intervalKm = intervalKm, intervalMonths = intervalMonths)
}

/** Port of `SERVICE_PRESETS` in `web/src/lib/service-presets.ts`. */
val SERVICE_PRESETS = listOf(
    ServicePreset("Engine oil", 5000.0, 6),
    ServicePreset("Oil filter", 5000.0, 6),
    ServicePreset("Air filter", 10000.0, 12),
    ServicePreset("Fuel filter", 20000.0, 24),
    ServicePreset("Spark plugs", 20000.0, null),
    ServicePreset("Front brake pads", 25000.0, null),
    ServicePreset("Rear brake pads", 40000.0, null),
    ServicePreset("Brake fluid", 30000.0, 24),
    ServicePreset("Coolant", 40000.0, 24),
    ServicePreset("Front tyre", 30000.0, 60),
    ServicePreset("Rear tyre", 30000.0, 60),
    ServicePreset("Battery", null, 36),
    ServicePreset("Chain / drive belt", 20000.0, null),
    ServicePreset("Clutch plate", 50000.0, null),
)
