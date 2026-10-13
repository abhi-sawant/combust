import { BarChart3, Gauge, List, Plus, Settings, TrendingUp, Upload } from 'lucide-react'

import { BrandMark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const NAV_ITEMS = [
  { value: 'overview', label: 'Overview', icon: Gauge },
  { value: 'entries', label: 'Entries', icon: List },
  { value: 'stats', label: 'Stats', icon: BarChart3 },
  { value: 'trends', label: 'Trends', icon: TrendingUp },
] as const

interface AppHeaderProps {
  value: string
  onValueChange: (value: string) => void
  onOpenImport: () => void
  onOpenSettings: () => void
  onAddEntry: () => void
}

/** Sticky top bar: brand, pill navigation (md and up), and the global actions. Below md the bottom tab bar navigates. */
export function AppHeader({ value, onValueChange, onOpenImport, onOpenSettings, onAddEntry }: AppHeaderProps) {
  return (
    <header className='sticky top-0 z-30 bg-background/85 backdrop-blur-md'>
      <div className='mx-auto grid h-16 w-full max-w-[1080px] grid-cols-[1fr_auto] items-center gap-3 px-4 md:h-[76px] md:grid-cols-[1fr_auto_1fr] md:px-8'>
        <div className='flex items-center gap-2 font-display text-[21px] leading-none font-extrabold tracking-tight'>
          <BrandMark />
          Combust
        </div>

        <nav
          aria-label='Sections'
          className='hidden gap-0.5 rounded-full bg-card p-1 shadow-card md:flex'>
          {NAV_ITEMS.map(({ value: v, label }) => (
            <button
              key={v}
              type='button'
              aria-current={v === value ? 'page' : undefined}
              onClick={() => onValueChange(v)}
              className={cn(
                'rounded-full px-[18px] py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                v === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              )}>
              {label}
            </button>
          ))}
        </nav>

        <div className='flex items-center justify-end gap-2'>
          <Button variant='card' size='icon' onClick={onOpenImport} aria-label='Import from CSV' className='size-[42px]'>
            <Upload />
          </Button>
          <Button variant='card' size='icon' onClick={onOpenSettings} aria-label='Settings' className='size-[42px]'>
            <Settings />
          </Button>
          <Button variant='flame' onClick={onAddEntry} aria-label='Add entry' className='h-[42px] max-md:hidden'>
            <Plus strokeWidth={2.4} /> Add entry
          </Button>
        </div>
      </div>
    </header>
  )
}
