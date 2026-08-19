import { Trash2 } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { EntryForm } from "@/components/entries/entry-form"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useEntries } from "@/hooks/entries-context"
import { formatDate } from "@/lib/format"
import type { FuelEntry } from "@/types/entry"

interface EntrySheetProps {
  entry?: FuelEntry
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Add/edit sheet shared by the "new entry" action and each entry's edit action. */
export function EntrySheet({ entry, open, onOpenChange }: EntrySheetProps) {
  const { deleteEntry } = useEntries()

  function handleSaved() {
    toast.success(entry ? "Entry updated" : "Entry added")
    onOpenChange(false)
  }

  async function handleDelete() {
    if (!entry) return
    await deleteEntry(entry.id)
    toast.success("Entry deleted")
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle className="font-serif text-xl font-bold">
            {entry ? "Edit fill-up" : "Add fuel entry"}
          </SheetTitle>
          <SheetDescription>
            {entry
              ? "Update the details of this fill-up."
              : "Log a fill-up right after you pay so the odometer reading stays accurate."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-6">
          <EntryForm
            key={entry?.id ?? "new"}
            entry={entry}
            onSaved={handleSaved}
            onCancel={() => onOpenChange(false)}
          />
          {entry && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:bg-warning-band hover:text-warning-band-foreground"
                  />
                }
              >
                <Trash2 />
                Delete this fill-up
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the fill-up on {formatDate(entry.date)} at{" "}
                    {entry.odometerReading.toLocaleString()} km. The previous entry&apos;s mileage will be
                    recalculated. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
