import { BarChart3, Gauge, List, Settings, TrendingUp, Upload } from "lucide-react"

import { cn } from "@/lib/utils"

export const NAV_ITEMS = [
  { value: "overview", label: "Overview", icon: Gauge },
  { value: "entries", label: "Entries", icon: List },
  { value: "stats", label: "Stats", icon: BarChart3 },
  { value: "trends", label: "Trends", icon: TrendingUp },
] as const

interface AppRailProps {
  value: string
  onValueChange: (value: string) => void
  onOpenImport: () => void
  onOpenSettings: () => void
}

/** Desktop navigation: the pit-wall rail. Below `md` the bottom tab bar takes over. */
export function AppRail({ value, onValueChange, onOpenImport, onOpenSettings }: AppRailProps) {
  return (
    <aside className="sticky top-0 hidden h-svh w-52 shrink-0 flex-col gap-7 bg-rail px-3.5 py-6 text-rail-foreground md:flex">
      <div className="flex items-center gap-2.5 px-2">
        <span
          aria-hidden
          className="size-[18px] shrink-0 border-[1.5px] border-lime"
          style={{
            background:
              "conic-gradient(var(--lime) 25%, transparent 0 50%, var(--lime) 0 75%, transparent 0) 0 0 / 9px 9px",
          }}
        />
        <span className="font-display text-[26px] leading-none font-black tracking-wider">COMBUST</span>
      </div>

      <nav aria-label="Sections" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ value: v, label, icon: Icon }) => {
          const active = v === value
          return (
            <button
              key={v}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onValueChange(v)}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-lime",
                active ? "bg-lime text-lime-foreground" : "text-[#a7aa9f] hover:bg-[#1b1b1d] hover:text-white"
              )}
            >
              <Icon className="size-5" strokeWidth={1.9} />
              {label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1">
        {[
          { label: "Import CSV", icon: Upload, onClick: onOpenImport },
          { label: "Settings", icon: Settings, onClick: onOpenSettings },
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-bold text-[#a7aa9f] transition-colors outline-none hover:bg-[#1b1b1d] hover:text-white focus-visible:ring-2 focus-visible:ring-lime"
          >
            <Icon className="size-[18px]" />
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}
