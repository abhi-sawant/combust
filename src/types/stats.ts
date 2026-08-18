import type { FuelEntry } from "@/types/entry"

/**
 * A fuel entry with mileage/cost figures derived relative to the previous
 * entry by odometer order. `null` fields mean "not computable" (baseline
 * entry, or a zero-litre / regressed reading) rather than an error.
 */
export interface DerivedEntry extends FuelEntry {
  /** True for the entry with the lowest odometer reading — no prior entry to diff against. */
  isBaseline: boolean
  /** True when this entry's odometer reading is <= the previous entry's. */
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
