import type { FuelEntry } from "@/types/entry"

/**
 * A fuel entry with mileage/cost figures derived relative to the next
 * entry by odometer order. `null` fields mean "not computable" (pending
 * entry, or a zero-litre / regressed reading) rather than an error.
 */
export interface DerivedEntry extends FuelEntry {
  /** True for the entry with the highest odometer reading — no later entry yet to diff against. */
  isPending: boolean
  /** True when the next entry's odometer reading is <= this entry's. */
  isOdometerRegression: boolean
  distanceCovered: number | null
  mileage: number | null
  costPerLitre: number | null
}

export interface OverallStats {
  averageMileage: number | null
  bestMileageEntry: DerivedEntry | null
  worstMileageEntry: DerivedEntry | null
  totalLitresFilled: number
  totalAmountSpent: number
  averageCostPerLitre: number | null
  totalDistanceCovered: number
  entryCount: number
}

export interface StationStats {
  station: string
  fillCount: number
  averageMileage: number | null
  averageCostPerLitre: number | null
  totalAmountSpent: number
}
