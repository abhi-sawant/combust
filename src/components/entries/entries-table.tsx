import { useMemo, useState } from "react"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EntryDialog } from "@/components/entries/entry-dialog"
import { useEntries } from "@/hooks/entries-context"
import { formatAmount, formatDate, formatKm, formatMileage, formatNumber } from "@/lib/format"
import type { DerivedEntry } from "@/types/stats"

type SortKey = "date" | "odometer"
type SortDir = "asc" | "desc"

function MileageCell({ entry }: { entry: DerivedEntry }) {
  if (entry.isBaseline) {
    return <Badge variant="secondary">Baseline</Badge>
  }
  if (entry.isOdometerRegression) {
    return <Badge variant="destructive">Odometer regressed</Badge>
  }
  if (entry.mileage === null) {
    return <span className="text-muted-foreground">—</span>
  }
  return <span>{formatMileage(entry.mileage)}</span>
}

export function EntriesTable() {
  const { derivedEntries, deleteEntry } = useEntries()
  const [sortKey, setSortKey] = useState<SortKey>("odometer")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [editingEntry, setEditingEntry] = useState<DerivedEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedEntries = useMemo(() => {
    const copy = [...derivedEntries]
    copy.sort((a, b) => {
      const cmp =
        sortKey === "date" ? a.date.localeCompare(b.date) : a.odometerReading - b.odometerReading
      return sortDir === "asc" ? cmp : -cmp
    })
    return copy
  }, [derivedEntries, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  async function handleDelete(id: string) {
    await deleteEntry(id)
    toast.success("Entry deleted")
    setDeletingId(null)
  }

  if (sortedEntries.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No fuel entries yet. Add your first fill-up to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop / tablet: full table */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("date")} className="-ml-2.5">
                    Date <ArrowUpDown />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => toggleSort("odometer")} className="-ml-2.5">
                    Odometer <ArrowUpDown />
                  </Button>
                </TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Litres</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Cost/L</TableHead>
                <TableHead className="text-right">Mileage</TableHead>
                <TableHead className="w-0">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{formatKm(entry.odometerReading)}</TableCell>
                  <TableCell className="max-w-40 truncate">{entry.fuelStation}</TableCell>
                  <TableCell className="text-right">{formatNumber(entry.litresFilled)}</TableCell>
                  <TableCell className="text-right">{formatAmount(entry.amountPaid)}</TableCell>
                  <TableCell className="text-right">
                    {entry.costPerLitre !== null ? formatAmount(entry.costPerLitre) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <MileageCell entry={entry} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit entry"
                        onClick={() => setEditingEntry(entry)}
                      >
                        <Pencil />
                      </Button>
                      <AlertDialog
                        open={deletingId === entry.id}
                        onOpenChange={(open) => setDeletingId(open ? entry.id : null)}
                      >
                        <AlertDialogTrigger
                          render={<Button variant="ghost" size="icon-sm" aria-label="Delete entry" />}
                        >
                          <Trash2 />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the fill-up on {formatDate(entry.date)} at {entry.odometerReading.toLocaleString()} km. Later entries&apos; mileage will be recalculated. This can&apos;t be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => handleDelete(entry.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => toggleSort("date")}>
            Date <ArrowUpDown />
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleSort("odometer")}>
            Odometer <ArrowUpDown />
          </Button>
        </div>
        {sortedEntries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{entry.fuelStation}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(entry.date)} · {formatKm(entry.odometerReading)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit entry"
                    onClick={() => setEditingEntry(entry)}
                  >
                    <Pencil />
                  </Button>
                  <AlertDialog
                    open={deletingId === entry.id}
                    onOpenChange={(open) => setDeletingId(open ? entry.id : null)}
                  >
                    <AlertDialogTrigger
                      render={<Button variant="ghost" size="icon-sm" aria-label="Delete entry" />}
                    >
                      <Trash2 />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the fill-up on {formatDate(entry.date)} at{" "}
                          {entry.odometerReading.toLocaleString()} km. Later entries&apos; mileage will be
                          recalculated. This can&apos;t be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => handleDelete(entry.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-sm">
                <span className="text-muted-foreground">Litres</span>
                <span className="text-right">{formatNumber(entry.litresFilled)}</span>
                <span className="text-muted-foreground">Amount</span>
                <span className="text-right">{formatAmount(entry.amountPaid)}</span>
                <span className="text-muted-foreground">Cost/L</span>
                <span className="text-right">
                  {entry.costPerLitre !== null ? formatAmount(entry.costPerLitre) : "—"}
                </span>
                <span className="text-muted-foreground">Mileage</span>
                <span className="flex justify-end">
                  <MileageCell entry={entry} />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EntryDialog
        entry={editingEntry ?? undefined}
        open={editingEntry !== null}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      />
    </>
  )
}
