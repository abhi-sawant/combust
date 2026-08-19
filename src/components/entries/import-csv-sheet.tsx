import { useRef, useState } from 'react'
import { UploadCloud } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FieldDescription } from '@/components/ui/field'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useEntries } from '@/hooks/entries-context'
import { useVehicles } from '@/hooks/vehicles-context'
import { parseFuelEntriesCsv, REQUIRED_COLUMNS, type CsvImportError } from '@/lib/csv'
import { bulkAddEntries } from '@/lib/db'
import { cn } from '@/lib/utils'
import type { FuelEntryInput } from '@/types/entry'

interface ImportCsvSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function titleCase(column: string): string {
  return column.replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ImportCsvSheet({ open, onOpenChange }: ImportCsvSheetProps) {
  const { refresh } = useEntries()
  const { activeVehicleId } = useVehicles()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<FuelEntryInput[]>([])
  const [errors, setErrors] = useState<CsvImportError[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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
    if (rows.length === 0 || !activeVehicleId) return
    setIsImporting(true)
    try {
      await bulkAddEntries(rows, activeVehicleId)
      await refresh()
      toast.success(`Imported ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`)
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}>
      <SheetContent side='bottom'>
        <SheetHeader>
          <SheetTitle className='font-serif text-xl font-bold'>Import from CSV</SheetTitle>
          <SheetDescription>Bring over a spreadsheet of past fill-ups in one go.</SheetDescription>
        </SheetHeader>

        <div className='flex flex-col gap-4 px-4 pb-6'>
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              const file = event.dataTransfer.files?.[0]
              if (file) void handleFile(file)
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border-1.5 border-dashed border-border bg-background px-4 py-6 text-center transition-colors',
              isDragging && 'border-primary bg-accent',
            )}>
            <UploadCloud className='size-6 text-primary' />
            <p className='text-sm font-medium'>Drop your .csv here</p>
            <Button type='button' variant='outline' size='sm' onClick={() => fileInputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={fileInputRef}
              id='csv-file'
              type='file'
              accept='.csv,text/csv'
              className='hidden'
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
            {fileName && (
              <FieldDescription>
                {fileName} · {rows.length} row{rows.length === 1 ? '' : 's'} ready to import
                {errors.length > 0 ? `, ${errors.length} skipped` : ''}.
              </FieldDescription>
            )}
          </div>

          <div className='flex flex-col gap-1.5'>
            <span className='text-[10.5px] font-medium tracking-[0.14em] text-muted-foreground uppercase'>
              Columns expected
            </span>
            <div className='flex flex-wrap gap-1.5'>
              {REQUIRED_COLUMNS.map((column) => (
                <Badge key={column} variant='secondary' className='font-mono font-normal'>
                  {titleCase(column)}
                </Badge>
              ))}
            </div>
          </div>

          {errors.length > 0 && (
            <div className='max-h-40 overflow-y-auto rounded-md border border-border p-2 text-sm'>
              <p className='mb-1 font-medium text-destructive'>Skipped rows</p>
              <ul className='flex flex-col gap-1 text-muted-foreground'>
                {errors.map((error) => (
                  <li key={error.line}>
                    Line {error.line}: {error.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={rows.length === 0 || isImporting}>
              <UploadCloud />
              Import {rows.length > 0 ? rows.length : ''} entries
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
