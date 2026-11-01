import { formatDate, formatKm } from "@/lib/format"
import type { ServiceItem, ServiceStatus } from "@/types/service"

function plural(n: number, unit: string): string {
  return `${n.toLocaleString()} ${unit}${n === 1 ? '' : 's'}`
}

/** One line on what is left (or overdue), e.g. "Overdue by 1,000 km · due in 5 days". */
export function describeRemaining(status: ServiceStatus): string {
  const parts: string[] = []
  if (status.kmRemaining !== null) {
    parts.push(
      status.kmRemaining < 0
        ? `${formatKm(-status.kmRemaining)} overdue`
        : status.kmRemaining === 0
          ? 'due now by distance'
          : `${formatKm(status.kmRemaining)} left`
    )
  }
  if (status.daysRemaining !== null) {
    parts.push(
      status.daysRemaining < 0
        ? `${plural(-status.daysRemaining, 'day')} overdue`
        : status.daysRemaining === 0
          ? 'due today'
          : `${plural(status.daysRemaining, 'day')} left`
    )
  }
  return parts.join(' · ')
}

/** "Changed 3 Jan 2026 at 12,000 km" — whichever parts were recorded. */
export function describeLastChange(item: Pick<ServiceItem, 'lastChangedDate' | 'lastChangedOdometer'>): string {
  const parts: string[] = []
  if (item.lastChangedDate) parts.push(formatDate(item.lastChangedDate))
  if (item.lastChangedOdometer !== null) parts.push(formatKm(item.lastChangedOdometer))
  return parts.length === 0 ? 'Never logged' : `Changed ${parts.join(' · ')}`
}
