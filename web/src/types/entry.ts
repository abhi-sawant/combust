/** A single fuel fill-up record as stored in IndexedDB. */
export interface FuelEntry {
  id: string
  /** The vehicle this fill-up belongs to — entries are scoped per vehicle. */
  vehicleId: string
  /** ISO date string (yyyy-MM-dd) the tank was filled — user-facing metadata only. */
  date: string
  /** Odometer reading in km at the time of the fill. Entries are ordered by this value. */
  odometerReading: number
  /** Free-text station name, reused via autocomplete. */
  fuelStation: string
  /** Total amount paid for the fill, in the user's currency. */
  amountPaid: number
  /** Litres of fuel filled. */
  litresFilled: number
  /**
   * True when the tank was filled until the pump clicked off. Mileage is only
   * measured between two full fills, so partial fills simply add their litres
   * to the tank in progress.
   */
  isFullTank: boolean
  /** True when a fill-up before this one was never logged, so the distance since the previous entry can't be trusted. */
  missedPrevious: boolean
}

/** Fields needed to create or edit an entry; `id`/`vehicleId` are assigned by the repository. */
export type FuelEntryInput = Omit<FuelEntry, "id" | "vehicleId">
