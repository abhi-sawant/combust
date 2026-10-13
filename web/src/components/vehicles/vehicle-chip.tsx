import { ChevronDown } from 'lucide-react'

import { useVehicles } from '@/hooks/vehicles-context'
import { cn } from '@/lib/utils'

interface VehicleChipProps {
  onClick: () => void
  className?: string
}

/** Active-vehicle button that opens the vehicle switcher. */
export function VehicleChip({ onClick, className }: VehicleChipProps) {
  const { activeVehicle } = useVehicles()
  if (!activeVehicle) return null

  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={`Switch vehicle, current: ${activeVehicle.name}`}
      className={cn(
        'flex max-w-full min-w-0 items-center gap-2.5 self-start rounded-full bg-card py-[5px] pr-3.5 pl-[5px] text-left shadow-card outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50',
        className
      )}>
      <span className='grid size-[30px] shrink-0 place-items-center rounded-full bg-linear-to-br from-flame-2 to-flame text-flame-foreground'>
        <svg aria-hidden viewBox='0 0 24 24' fill='currentColor' className='size-4'>
          <path d='M12 2c.6 3.2 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-1.9 1-3.3 2-4.3.2 1.2.9 2 1.7 2.3C10 8 10.8 4.6 12 2Z' />
        </svg>
      </span>
      <span className='truncate text-[15px] font-semibold'>{activeVehicle.name}</span>
      {activeVehicle.plate && <span className='shrink-0 text-[13px] text-muted-foreground'>{activeVehicle.plate}</span>}
      <ChevronDown className='size-4 shrink-0 text-muted-foreground' />
    </button>
  )
}
