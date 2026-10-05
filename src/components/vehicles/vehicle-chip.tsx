import { ChevronDown } from 'lucide-react'

import { useVehicles } from '@/hooks/vehicles-context'
import { cn } from '@/lib/utils'

interface VehicleChipProps {
  onClick: () => void
  /** `lime` sits on the lime hero band; `card` sits on the page ground. */
  tone?: 'card' | 'lime'
  className?: string
}

/** Active-vehicle button that opens the vehicle switcher. */
export function VehicleChip({ onClick, tone = 'card', className }: VehicleChipProps) {
  const { activeVehicle } = useVehicles()
  if (!activeVehicle) return null

  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={`Switch vehicle, current: ${activeVehicle.name}`}
      className={cn(
        'flex max-w-full min-w-0 items-center gap-2.5 self-start rounded-full py-[5px] pr-3 pl-[5px] text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
        tone === 'card'
          ? 'border border-border bg-card hover:border-foreground'
          : 'border border-lime-foreground/25 text-lime-foreground hover:border-lime-foreground/60',
        className
      )}>
      {activeVehicle.plate && (
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-[5px] text-[13px] leading-none font-extrabold tracking-wide',
            tone === 'card' ? 'bg-lime text-lime-foreground' : 'bg-rail text-lime'
          )}>
          {activeVehicle.plate}
        </span>
      )}
      <span className='truncate text-[15px] font-bold'>{activeVehicle.name}</span>
      <ChevronDown className={cn('size-4 shrink-0', tone === 'card' && 'text-muted-foreground')} />
    </button>
  )
}
