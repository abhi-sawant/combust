import { useState } from "react"
import { UploadCloud } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useEntries } from "@/hooks/entries-context"
import { parseFuelEntriesCsv, type CsvImportError } from "@/lib/csv"
import { bulkAddEntries } from "@/lib/db"
import type { FuelEntryInput } from "@/types/entry"

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportCsvDialog({ open, onOpenChange }: ImportCsvDialogProps) {
  const { refresh } = useEntries()
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<FuelEntryInput[]>([])
  const [errors, setErrors] = useState<CsvImportError[]>([])
  const [isImporting, setIsImporting] = useState(false)

  function reset() {
    setFileName(null)
    setRows([])
    setErrors([])
  }

  async function handleFile(file: File) {
    const text = await file.text()
    const result = parseFuelEntriesCsv(text)
    setFileName(file.name)
    setRows(result.rows)
    setErrors(result.errors)
  }

  async function handleImport() {
    if (rows.length === 0) return
    setIsImporting(true)
    try {
      await bulkAddEntries(rows)
      await refresh()
      toast.success(`Imported ${rows.length} ${rows.length === 1 ? "entry" : "entries"}`)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
          <DialogDescription>
            Columns expected: Date, Amount Paid, Odometer Reading, Fuel Filled, Fuel Station.
          </DialogDescription>
        </DialogHeader>

        <Field>
          <FieldLabel htmlFor="csv-file">CSV file</FieldLabel>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
          {fileName && (
            <FieldDescription>
              {rows.length} row{rows.length === 1 ? "" : "s"} ready to import
              {errors.length > 0 ? `, ${errors.length} skipped` : ""}.
            </FieldDescription>
          )}
        </Field>

        {errors.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-2 text-sm">
            <p className="mb-1 font-medium text-destructive">Skipped rows</p>
            <ul className="flex flex-col gap-1 text-muted-foreground">
              {errors.map((error) => (
                <li key={error.line}>
                  Line {error.line}: {error.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || isImporting}>
            <UploadCloud />
            Import {rows.length > 0 ? rows.length : ""} entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
