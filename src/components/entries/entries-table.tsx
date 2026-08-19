import { useMemo, useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

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
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EntrySheet } from '@/components/entries/entry-sheet'
import { FillupRow, MileageCell } from '@/components/entries/fillup-row'
import { useEntries } from '@/hooks/entries-context'
import { groupByMonth } from '@/lib/calculations'
import { formatAmount, formatDate, formatKm, formatNumber } from '@/lib/format'
import type { DerivedEntry } from '@/types/stats'

type SortKey = 'date' | 'odometer'
type SortDir = 'asc' | 'desc'

export function EntriesTable() {
  const { derivedEntries, deleteEntry } = useEntries()
  const [sortKey, setSortKey] = useState<SortKey>('odometer')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [editingEntry, setEditingEntry] = useState<DerivedEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const sortedEntries = useMemo(() => {
    const copy = [...derivedEntries]
    copy.sort((a, b) => {
      const cmp = sortKey === 'date' ? a.date.localeCompare(b.date) : a.odometerReading - b.odometerReading
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [derivedEntries, sortKey, sortDir])

  const monthGroups = useMemo(() => {
    const byDateDesc = [...derivedEntries].sort((a, b) => b.date.localeCompare(a.date))
    return groupByMonth(byDateDesc)
  }, [derivedEntries])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  async function handleDelete(id: string) {
    await deleteEntry(id)
    toast.success('Entry deleted')
    setDeletingId(null)
  }

  function renderRowActions(entry: DerivedEntry) {
    return (
      <div className='grid grid-cols-2 w-full border-t'>
        <Button variant='ghost' aria-label='Edit entry' onClick={() => setEditingEntry(entry)}>
          Edit
        </Button>
        <AlertDialog open={deletingId === entry.id} onOpenChange={(open) => setDeletingId(open ? entry.id : null)}>
          <AlertDialogTrigger render={<Button variant='ghost' aria-label='Delete entry' />}>Delete</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the fill-up on {formatDate(entry.date)} at {entry.odometerReading.toLocaleString()} km. The
                previous entry&apos;s mileage will be recalculated. This can&apos;t be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant='destructive' onClick={() => handleDelete(entry.id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  if (sortedEntries.length === 0) {
    return (
      <Card>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          No fuel entries yet. Add your first fill-up to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Desktop / tablet: full table */}
      <Card className='hidden sm:block'>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant='ghost' size='sm' onClick={() => toggleSort('date')}>
                    Date <ArrowUpDown />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant='ghost' size='sm' onClick={() => toggleSort('odometer')}>
                    Odometer <ArrowUpDown />
                  </Button>
                </TableHead>
                <TableHead>Station</TableHead>
                <TableHead className='text-right'>Litres</TableHead>
                <TableHead className='text-right'>Amount</TableHead>
                <TableHead className='text-right'>Cost/L</TableHead>
                <TableHead className='text-right'>Mileage</TableHead>
                <TableHead className='w-0'>
                  <span className='sr-only'>Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className='font-mono'>{formatDate(entry.date)}</TableCell>
                  <TableCell className='font-mono'>{formatKm(entry.odometerReading)}</TableCell>
                  <TableCell className='max-w-40 truncate font-medium'>{entry.fuelStation}</TableCell>
                  <TableCell className='text-right font-mono'>{formatNumber(entry.litresFilled)}</TableCell>
                  <TableCell className='text-right font-mono'>{formatAmount(entry.amountPaid)}</TableCell>
                  <TableCell className='text-right font-mono'>
                    {entry.costPerLitre !== null ? formatAmount(entry.costPerLitre) : '—'}
                  </TableCell>
                  <TableCell className='text-right'>
                    <MileageCell entry={entry} />
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-1'>{renderRowActions(entry)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile: grouped by month, matching the Overview screen's row style */}
      <div className='flex flex-col gap-5 sm:hidden'>
        {monthGroups.map((group) => (
          <div key={group.label} className='flex flex-col gap-2.5'>
            <div className='flex items-baseline justify-between px-0.5'>
              <span className='text-[10.5px] font-medium tracking-[0.16em] text-muted-foreground uppercase'>
                {group.label}
              </span>
              <span className='font-mono text-xs text-muted-foreground'>
                {formatAmount(group.items.reduce((sum, e) => sum + e.amountPaid, 0))}
              </span>
            </div>
            {group.items.map((entry) => (
              <div key={entry.id} className='rounded-md border border-border bg-card shadow-card'>
                <FillupRow entry={entry} />
                <div className='flex shrink-0 gap-0.5'>{renderRowActions(entry)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <EntrySheet
        entry={editingEntry ?? undefined}
        open={editingEntry !== null}
        onOpenChange={(open) => !open && setEditingEntry(null)}
      />
    </>
  )
}
