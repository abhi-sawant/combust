import { toast } from "sonner"

import { EntryForm } from "@/components/entries/entry-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { FuelEntry } from "@/types/entry"

interface EntryDialogProps {
  entry?: FuelEntry
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Add/edit dialog shared by the "new entry" button and each table row's edit action. */
export function EntryDialog({ entry, open, onOpenChange }: EntryDialogProps) {
  function handleSaved() {
    toast.success(entry ? "Entry updated" : "Entry added")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "Add fuel entry"}</DialogTitle>
          <DialogDescription>
            {entry
              ? "Update the details of this fill-up."
              : "Log a fill-up right after you pay so the odometer reading stays accurate."}
          </DialogDescription>
        </DialogHeader>
        <EntryForm
          key={entry?.id ?? "new"}
          entry={entry}
          onSaved={handleSaved}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
