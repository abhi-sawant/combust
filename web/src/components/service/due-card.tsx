import { ChevronRight, Wrench } from 'lucide-react'

import { StatusBadge } from '@/components/service/service-row'
import { useServiceRows } from '@/hooks/use-service-rows'
import { describeRemaining } from '@/lib/service-format'

/** Overview card listing items that are overdue or due soon; hidden when nothing needs attention. */
export function DueCard({ onOpenService }: { onOpenService: () => void }) {
  const { rows } = useServiceRows()
  const attention = rows.filter((r) => r.status.status === 'overdue' || r.status.status === 'dueSoon')
  if (attention.length === 0) return null

  return (
    <section aria-label='Service reminders' className='flex flex-col gap-2.5'>
      <div className='flex items-baseline justify-between px-2'>
        <h2 className='font-display text-[22px] leading-none font-bold tracking-tight'>Needs attention</h2>
        <button
          type='button'
          onClick={onOpenService}
          className='inline-flex items-center gap-0.5 text-sm font-medium text-flame-text outline-none focus-visible:underline'>
          Service <ChevronRight className='size-4' />
        </button>
      </div>
      <ul className='flex flex-col gap-1 rounded-[28px] bg-card p-2 shadow-card'>
        {attention.slice(0, 4).map(({ item, status }) => (
          <li key={item.id}>
            <button
              type='button'
              onClick={onOpenService}
              className='flex w-full items-center gap-3.5 rounded-[20px] px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'>
              <span aria-hidden className='grid size-11 shrink-0 place-items-center rounded-full bg-field text-muted-foreground'>
                <Wrench className='size-5' />
              </span>
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-[15px] font-semibold'>{item.name}</span>
                <span className='truncate text-[13px] text-muted-foreground'>{describeRemaining(status)}</span>
              </span>
              <StatusBadge status={status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
