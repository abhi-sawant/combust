import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { useEntries } from "@/hooks/entries-context"
import { filterByRange, type TrendRange } from "@/lib/calculations"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

const mileageConfig = {
  mileage: { label: "Mileage (km/l)", color: "var(--chart-1)" },
} satisfies ChartConfig

const costConfig = {
  costPerLitre: { label: "Cost / litre", color: "var(--chart-2)" },
} satisfies ChartConfig

const RANGES: TrendRange[] = ["3M", "6M", "1Y", "All"]

export function TrendsCharts() {
  const { derivedEntries } = useEntries()
  const [range, setRange] = useState<TrendRange>("All")

  const ranged = useMemo(() => filterByRange(derivedEntries, range), [derivedEntries, range])

  const mileageData = ranged
    .filter((entry) => entry.mileage !== null)
    .map((entry) => ({
      odometerReading: entry.odometerReading,
      mileage: entry.mileage,
      date: entry.date,
    }))

  const costData = ranged
    .filter((entry) => entry.costPerLitre !== null)
    .map((entry) => ({ date: entry.date, costPerLitre: entry.costPerLitre }))

  if (derivedEntries.length < 2) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Trends will appear once you have at least two fill-ups.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r}
            type="button"
            variant={range === r ? "default" : "outline"}
            size="sm"
            className={cn("flex-1 rounded-full", range === r && "shadow-none")}
            onClick={() => setRange(r)}
          >
            {r}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mileage over distance</CardTitle>
            <CardDescription>Km/l at each fill-up, by odometer reading</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={mileageConfig}>
              <LineChart data={mileageData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="odometerReading"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload ? formatDate(payload[0].payload.date as string) : ""
                      }
                    />
                  }
                />
                <Line
                  dataKey="mileage"
                  type="monotone"
                  stroke="var(--color-mileage)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost per litre over time</CardTitle>
            <CardDescription>What you paid per litre at each fill-up</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={costConfig}>
              <LineChart data={costData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => formatDate(value)}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />}
                />
                <Line
                  dataKey="costPerLitre"
                  type="monotone"
                  stroke="var(--color-costPerLitre)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
