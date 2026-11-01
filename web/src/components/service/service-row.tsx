import { Badge } from '@/components/ui/badge'
import type { ServiceStatus } from '@/types/service'

const BADGE_VARIANT = {
  overdue: 'destructive',
  dueSoon: 'warning',
  ok: 'secondary',
  unknown: 'outline',
} as const

const BADGE_LABEL = { overdue: 'Overdue', dueSoon: 'Due soon', ok: 'On track', unknown: 'No schedule' } as const

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <Badge variant={BADGE_VARIANT[status.status]}>{BADGE_LABEL[status.status]}</Badge>
}
