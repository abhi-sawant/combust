import type { FuelEntry } from "@/types/entry"

/**
 * A fuel entry with mileage/cost figures derived per tank cycle: from one
 * full fill to the next full fill, with any partial fills in between
 * counted towards the litres burned. Mileage and distance are attached to
 * the entry that *starts* the cycle. `null` fields mean "not computable"
 * (open cycle, partial fill, missed fill, regressed reading) rather than an error.
 */
export interface DerivedEntry extends FuelEntry {
  /** True for the latest full fill whose tank cycle hasn't been closed by a later full fill yet. */
  isPending: boolean
  /** True for a partial fill — its litres feed the surrounding cycle but it has no mileage of its own. */
  isPartial: boolean
  /** True when this entry starts a cycle that can't be measured because a fill-up in it was never logged. */
  hasGap: boolean
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
