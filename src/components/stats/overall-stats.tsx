import { Fuel, Gauge, Route, TrendingDown, TrendingUp, Wallet } from "lucide-react"

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { computeOverallStats } from "@/lib/calculations"
import { formatAmount, formatDate, formatKm, formatMileage, formatNumber } from "@/lib/format"
import { useEntries } from "@/hooks/entries-context"

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail?: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="text-[10.5px] font-medium tracking-[0.12em] uppercase">
          {label}
        </CardDescription>
        <CardTitle className="font-mono text-xl font-medium">{value}</CardTitle>
        <CardAction>
          <span className="grid size-8 place-items-center rounded-full bg-grad-primary-soft text-accent-foreground">
            <Icon className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
      {detail && (
        <CardContent>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </CardContent>
      )}
    </Card>
  )
}

export function OverallStats() {
  const { derivedEntries } = useEntries()
  const stats = computeOverallStats(derivedEntries)

  if (stats.entryCount === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Add a couple of fill-ups to see your stats.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        icon={Gauge}
        label="Average mileage"
        value={stats.averageMileage !== null ? formatMileage(stats.averageMileage) : "—"}
      />
      <StatCard
        icon={TrendingUp}
        label="Best mileage"
        value={stats.bestMileageEntry?.mileage !== null && stats.bestMileageEntry ? formatMileage(stats.bestMileageEntry.mileage!) : "—"}
        detail={
          stats.bestMileageEntry
            ? `${stats.bestMileageEntry.fuelStation} · ${formatDate(stats.bestMileageEntry.date)}`
            : undefined
        }
      />
      <StatCard
        icon={TrendingDown}
        label="Worst mileage"
        value={stats.worstMileageEntry?.mileage !== null && stats.worstMileageEntry ? formatMileage(stats.worstMileageEntry.mileage!) : "—"}
        detail={
          stats.worstMileageEntry
            ? `${stats.worstMileageEntry.fuelStation} · ${formatDate(stats.worstMileageEntry.date)}`
            : undefined
        }
      />
      <StatCard icon={Route} label="Total distance" value={formatKm(stats.totalDistanceCovered)} />
      <StatCard icon={Fuel} label="Total litres filled" value={formatNumber(stats.totalLitresFilled)} />
      <StatCard icon={Wallet} label="Total spent" value={formatAmount(stats.totalAmountSpent)} />
      <StatCard
        icon={Wallet}
        label="Average cost / litre"
        value={stats.averageCostPerLitre !== null ? formatAmount(stats.averageCostPerLitre) : "—"}
      />
    </div>
  )
}
