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
}

/** Fields needed to create or edit an entry; `id`/`vehicleId` are assigned by the repository. */
export type FuelEntryInput = Omit<FuelEntry, "id" | "vehicleId">
