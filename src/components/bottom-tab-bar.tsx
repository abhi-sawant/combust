import { Plus } from "lucide-react"

import { NAV_ITEMS } from "@/components/app-rail"
import { cn } from "@/lib/utils"

interface BottomTabBarProps {
  value: string
  onValueChange: (value: string) => void
  onAddEntry: () => void
}

/** Mobile-only bottom navigation; the rail replaces it from `md` up. */
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
          "flex flex-col items-center gap-1 py-1.5 text-[11.5px] font-bold outline-none focus-visible:text-lime",
          active ? "text-lime" : "text-[#9a9d92]"
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
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_1fr_72px_1fr_1fr] items-end bg-rail px-2 pt-2 pb-[max(env(safe-area-inset-bottom),10px)] text-rail-foreground md:hidden"
    >
      {NAV_ITEMS.slice(0, 2).map(tab)}
      <button
        type="button"
        onClick={onAddEntry}
        aria-label="Add fuel entry"
        className="-mt-7 grid size-[58px] place-items-center justify-self-center rounded-full border-4 border-background bg-lime text-lime-foreground outline-none transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <Plus className="size-6" strokeWidth={3} />
      </button>
      {NAV_ITEMS.slice(2).map(tab)}
    </nav>
  )
}
