import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useEntries } from "@/hooks/entries-context"
import { computeStationStats } from "@/lib/calculations"
import { formatAmount, formatMileage, formatNumber } from "@/lib/format"

export function StationStats() {
  const { derivedEntries } = useEntries()
  const stations = computeStationStats(derivedEntries)

  if (stations.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Station breakdowns will show up once you have a few fill-ups logged.
        </CardContent>
      </Card>
    )
  }

  const bestMileageStation = stations.reduce<(typeof stations)[number] | null>((best, station) => {
    if (station.averageMileage === null) return best
    if (!best || station.averageMileage > best.averageMileage!) return station
    return best
  }, null)

  const bestValueStation = stations.reduce<(typeof stations)[number] | null>((best, station) => {
    if (station.averageCostPerLitre === null) return best
    if (!best || station.averageCostPerLitre < best.averageCostPerLitre!) return station
    return best
  }, null)

  return (
    <>
      {/* Desktop / tablet: full table */}
      <Card className="hidden sm:block">
        <CardHeader>
          <CardTitle>By fuel station</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:px-(--card-spacing)">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Fills</TableHead>
                <TableHead className="text-right">Avg mileage</TableHead>
                <TableHead className="text-right">Avg cost/L</TableHead>
                <TableHead className="text-right">Total spent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stations.map((station) => (
                <TableRow key={station.station}>
                  <TableCell className="max-w-40 truncate font-medium">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {station.station}
                      {bestMileageStation?.station === station.station && (
                        <Badge variant="accent">Best mileage</Badge>
                      )}
                      {bestValueStation?.station === station.station && (
                        <Badge variant="accent">Best value</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">{station.fillCount}</TableCell>
                  <TableCell className="text-right font-mono">
                    {station.averageMileage !== null ? formatMileage(station.averageMileage) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {station.averageCostPerLitre !== null ? formatAmount(station.averageCostPerLitre) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(station.totalAmountSpent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile: stacked cards, mirroring entries-table's dual-layout pattern */}
      <div className="flex flex-col gap-3 sm:hidden">
        <p className="px-0.5 text-[10.5px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          By fuel station
        </p>
        {stations.map((station) => (
          <Card key={station.station} size="sm">
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium">{station.station}</span>
                {bestMileageStation?.station === station.station && (
                  <Badge variant="accent">Best mileage</Badge>
                )}
                {bestValueStation?.station === station.station && <Badge variant="accent">Best value</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-y-1.5 font-mono text-sm">
                <span className="font-sans text-muted-foreground">Fills</span>
                <span className="text-right">{station.fillCount}</span>
                <span className="font-sans text-muted-foreground">Avg mileage</span>
                <span className="text-right">
                  {station.averageMileage !== null ? formatMileage(station.averageMileage) : "—"}
                </span>
                <span className="font-sans text-muted-foreground">Avg cost/L</span>
                <span className="text-right">
                  {station.averageCostPerLitre !== null ? formatAmount(station.averageCostPerLitre) : "—"}
                </span>
                <span className="font-sans text-muted-foreground">Total spent</span>
                <span className="text-right">{formatNumber(station.totalAmountSpent)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
