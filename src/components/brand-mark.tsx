import { useId } from "react"

import { cn } from "@/lib/utils"

/** The Combust flame: a single drop in the ember gradient. */
export function BrandMark({ className }: { className?: string }) {
  const id = useId()
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("size-6", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--flame-2)" />
          <stop offset="1" stopColor="var(--flame)" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${id})`}
        d="M12 2c.6 3.2 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-1.9 1-3.3 2-4.3.2 1.2.9 2 1.7 2.3C10 8 10.8 4.6 12 2Z"
      />
    </svg>
  )
}
