import { format } from "date-fns"
import { useMemo } from "react"

import { useEntries } from "@/hooks/entries-context"
import { useServices } from "@/hooks/services-context"
import { computeServiceStatus, latestOdometer, sortByDue } from "@/lib/calculations"

/** Items paired with their derived status, most urgent first. Shared with the Overview card. */
export function useServiceRows() {
  const { services } = useServices()
  const { entries } = useEntries()
  const currentOdometer = useMemo(() => latestOdometer(entries), [entries])
  const today = format(new Date(), 'yyyy-MM-dd')
  const rows = useMemo(
    () =>
      sortByDue(
        services.map((item) => ({ item, name: item.name, status: computeServiceStatus(item, currentOdometer, today) }))
      ),
    [services, currentOdometer, today]
  )
  return { rows, currentOdometer, today }
}
