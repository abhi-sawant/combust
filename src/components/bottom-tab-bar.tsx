import { BarChart3, Gauge, List, Plus, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"

const TABS = [
  { value: "overview", label: "Overview", icon: Gauge },
  { value: "entries", label: "Entries", icon: List },
  { value: "stats", label: "Stats", icon: BarChart3 },
  { value: "trends", label: "Trends", icon: TrendingUp },
] as const

interface BottomTabBarProps {
  value: string
  onValueChange: (value: string) => void
  onAddEntry: () => void
}

/** Mobile-only bottom navigation replacing the top TabsList below the `sm` breakpoint. */
export function BottomTabBar({ value, onValueChange, onAddEntry }: BottomTabBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card px-3.5 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)] sm:hidden">
      <div className="relative mx-auto flex max-w-3xl items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = tab.value === value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onValueChange(tab.value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] font-medium",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-[22px]" strokeWidth={1.7} />
              {tab.label}
            </button>
          )
        })}
        <span className="w-14 shrink-0" aria-hidden />
        <button
          type="button"
          onClick={onAddEntry}
          aria-label="Add fuel entry"
          className="absolute top-[-26px] right-1 grid size-14 place-items-center rounded-[20px] bg-primary text-primary-foreground shadow-float"
        >
          <Plus className="size-[22px]" strokeWidth={2.1} />
        </button>
      </div>
    </div>
  )
}
