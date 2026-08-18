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
    <Card>
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
                      <Badge variant="secondary">Best mileage</Badge>
                    )}
                    {bestValueStation?.station === station.station && (
                      <Badge variant="secondary">Best value</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{station.fillCount}</TableCell>
                <TableCell className="text-right">
                  {station.averageMileage !== null ? formatMileage(station.averageMileage) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {station.averageCostPerLitre !== null ? formatAmount(station.averageCostPerLitre) : "—"}
                </TableCell>
                <TableCell className="text-right">{formatNumber(station.totalAmountSpent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
