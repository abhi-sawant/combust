import type { DerivedEntry } from "@/types/stats"

/**
 * Timing-board sector for a fill-up: purple for the best fill, green when it beat
 * the average, amber when it fell short. `none` means no mileage yet (pending / regressed).
 */
export type Sector = "best" | "up" | "down" | "none"

export function sectorOf(entry: DerivedEntry, average: number | null, bestId: string | null): Sector {
  if (entry.mileage === null || average === null) return "none"
  if (entry.id === bestId) return "best"
  return entry.mileage >= average ? "up" : "down"
}

export const SECTOR_TEXT: Record<Sector, string> = {
  best: "text-best",
  up: "text-up",
  down: "text-down",
  none: "text-muted-foreground",
}

export const SECTOR_BAR: Record<Sector, string> = {
  best: "bg-bar-best",
  up: "bg-bar-up",
  down: "bg-bar-down",
  none: "bg-border",
}

/** Three-letter timing-tower code derived from a free-text station name ("Indian Oil" → "IO"+…). */
export function stationCode(name: string): string {
  const head = name.split(/[·\-–,(]/)[0].trim()
  const words = head.split(/\s+/).filter(Boolean)
  const letters =
    words.length >= 3
      ? words.map((w) => w[0]).join("")
      : words.length === 2
        ? words[0].slice(0, 2) + words[1][0]
        : (words[0] ?? "").slice(0, 3)
  return (letters || "???").toUpperCase().slice(0, 3)
}

export const SECTOR_PIP: Record<Sector, string> = {
  best: "bg-flame",
  up: "bg-flame-2",
  down: "bg-muted-foreground/50",
  none: "bg-pip-off",
}

/** Heat pips (1–5): how far a fill-up sits above or below the average. The best fill is always full. */
export function pipsOf(mileage: number, average: number | null, sector: Sector): number {
  if (sector === "best") return 5
  if (average === null || average <= 0) return 3
  return Math.max(1, Math.min(5, Math.round(3 + 40 * (mileage / average - 1))))
}
