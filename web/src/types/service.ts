/** A part or service that is replaced periodically (engine oil, front brake pads, ...). */
export interface ServiceItem {
  id: string
  /** The vehicle this item belongs to — items are scoped per vehicle. */
  vehicleId: string
  name: string
  /** ISO date string (yyyy-MM-dd) of the last change, or null if it has never been logged. */
  lastChangedDate: string | null
  /** Odometer reading in km at the last change, or null if unknown. */
  lastChangedOdometer: number | null
  /** Replace again after this many km, or null for no distance interval. */
  intervalKm: number | null
  /** Replace again after this many months, or null for no time interval. */
  intervalMonths: number | null
  notes: string | null
}

/** Fields needed to create or edit an item; `id`/`vehicleId` are assigned by the repository. */
export type ServiceItemInput = Omit<ServiceItem, "id" | "vehicleId">

export type ServiceStatusKind = "overdue" | "dueSoon" | "ok" | "unknown"

/** Derived due-ness of a service item — never stored or synced. */
export interface ServiceStatus {
  status: ServiceStatusKind
  /** Odometer (km) at which the item is due, or null without a km interval and last odometer. */
  nextDueOdometer: number | null
  /** Date (yyyy-MM-dd) the item is due, or null without a month interval and last date. */
  nextDueDate: string | null
  /** Km left until due (negative when passed), or null when not computable. */
  kmRemaining: number | null
  /** Days left until due (negative when passed), or null when not computable. */
  daysRemaining: number | null
}
