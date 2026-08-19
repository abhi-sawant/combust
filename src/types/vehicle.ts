/** A vehicle whose fuel entries are tracked as one odometer timeline. */
export interface Vehicle {
  id: string
  name: string
  /** License plate — optional since a freshly-bootstrapped default vehicle won't have one yet. */
  plate?: string
  /** ISO timestamp used to order vehicles chronologically (ids aren't sortable). */
  createdAt: string
}

/** Fields needed to create or edit a vehicle; `id`/`createdAt` are assigned by the repository. */
export type VehicleInput = Omit<Vehicle, "id" | "createdAt">
