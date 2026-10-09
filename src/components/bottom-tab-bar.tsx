import { Plus } from "lucide-react"

import { NAV_ITEMS } from "@/components/app-header"
import { cn } from "@/lib/utils"

interface BottomTabBarProps {
  value: string
  onValueChange: (value: string) => void
  onAddEntry: () => void
}

/** Mobile-only floating pill navigation; the header's pill nav replaces it from `md` up. */
export function BottomTabBar({ value, onValueChange, onAddEntry }: BottomTabBarProps) {
  const tab = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon
    const active = item.value === value
    return (
      <button
        key={item.value}
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => onValueChange(item.value)}
        className={cn(
          "flex flex-col items-center gap-0.5 py-1.5 text-[10.5px] font-medium outline-none transition-colors focus-visible:text-flame-text",
          active ? "text-flame-text" : "text-muted-foreground"
        )}
      >
        <Icon className="size-[21px]" strokeWidth={1.9} />
        {item.label}
      </button>
    )
  }

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-3.5 bottom-[max(env(safe-area-inset-bottom),14px)] z-40 grid h-[66px] grid-cols-[1fr_1fr_64px_1fr_1fr] items-center rounded-full bg-card/95 px-1.5 shadow-float backdrop-blur-lg md:hidden"
    >
      {NAV_ITEMS.slice(0, 2).map(tab)}
      <button
        type="button"
        onClick={onAddEntry}
        aria-label="Add fuel entry"
        className="grid size-[50px] place-items-center justify-self-center rounded-full bg-flame text-flame-foreground outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <Plus className="size-6" strokeWidth={2.6} />
      </button>
      {NAV_ITEMS.slice(2).map(tab)}
    </nav>
  )
}
