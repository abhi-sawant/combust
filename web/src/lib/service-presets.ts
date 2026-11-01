import type { ServiceItemInput } from "@/types/service"

/** A common part or service offered in the "Add from presets" picker. Intervals are editable defaults. */
export interface ServicePreset {
  name: string
  intervalKm: number | null
  intervalMonths: number | null
}

export const SERVICE_PRESETS: ServicePreset[] = [
  { name: "Engine oil", intervalKm: 5000, intervalMonths: 6 },
  { name: "Oil filter", intervalKm: 5000, intervalMonths: 6 },
  { name: "Air filter", intervalKm: 10000, intervalMonths: 12 },
  { name: "Fuel filter", intervalKm: 20000, intervalMonths: 24 },
  { name: "Spark plugs", intervalKm: 20000, intervalMonths: null },
  { name: "Front brake pads", intervalKm: 25000, intervalMonths: null },
  { name: "Rear brake pads", intervalKm: 40000, intervalMonths: null },
  { name: "Brake fluid", intervalKm: 30000, intervalMonths: 24 },
  { name: "Coolant", intervalKm: 40000, intervalMonths: 24 },
  { name: "Front tyre", intervalKm: 30000, intervalMonths: 60 },
  { name: "Rear tyre", intervalKm: 30000, intervalMonths: 60 },
  { name: "Battery", intervalKm: null, intervalMonths: 36 },
  { name: "Chain / drive belt", intervalKm: 20000, intervalMonths: null },
  { name: "Clutch plate", intervalKm: 50000, intervalMonths: null },
]

export function presetToInput(preset: ServicePreset): ServiceItemInput {
  return {
    name: preset.name,
    lastChangedDate: null,
    lastChangedOdometer: null,
    intervalKm: preset.intervalKm,
    intervalMonths: preset.intervalMonths,
    notes: null,
  }
}
