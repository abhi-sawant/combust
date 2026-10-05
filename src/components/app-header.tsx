import { Plus, Settings, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface AppHeaderProps {
  onOpenImport: () => void
  onOpenSettings: () => void
  onAddEntry: () => void
}

export function AppHeader({ onOpenImport, onOpenSettings, onAddEntry }: AppHeaderProps) {
  return (
    <header className='flex items-center gap-2.5'>
      {/* Brand shows here on mobile only; the rail carries it from md up. */}
      <span aria-hidden className='font-display text-2xl leading-none font-black tracking-wider md:hidden'>
        COMBUST
      </span>
      <div className='ml-auto flex items-center gap-2 max-md:hidden'>
        <Button size='lg' onClick={onAddEntry}>
          <Plus strokeWidth={2.8} /> Add entry
        </Button>
      </div>
      <div className='ml-auto flex items-center gap-2 md:hidden'>
        <Button variant='outline' size='icon-sm' onClick={onOpenImport} aria-label='Import from CSV'>
          <Upload />
        </Button>
        <Button variant='outline' size='icon-sm' onClick={onOpenSettings} aria-label='Settings'>
          <Settings />
        </Button>
      </div>
    </header>
  )
}
