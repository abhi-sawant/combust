import { format, isValid, parse as parseDate } from "date-fns"

import type { FuelEntryInput } from "@/types/entry"

export interface CsvImportError {
  line: number
  reason: string
}

export interface CsvImportResult {
  rows: FuelEntryInput[]
  errors: CsvImportError[]
}

/** Zero-width space, zero-width non-joiner/joiner, BOM, and no-break space — seen as stray prefixes in the source data. */
const INVISIBLE_CHARS = /(\u200B|\u200C|\u200D|\uFEFF|\u00A0)/g

function sanitizeCell(value: string): string {
  return value.replace(INVISIBLE_CHARS, "").trim()
}

/** Minimal RFC4180-ish line splitter: handles quoted fields with embedded commas/quotes. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      cells.push(current)
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

const DATE_FORMATS = ["yyyy/MM/dd", "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy"]

function parseFlexibleDate(raw: string): string | null {
  const sanitized = sanitizeCell(raw)
  if (!sanitized) return null

  for (const dateFormat of DATE_FORMATS) {
    const parsed = parseDate(sanitized, dateFormat, new Date())
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd")
    }
  }

  const native = new Date(sanitized)
  return Number.isNaN(native.getTime()) ? null : format(native, "yyyy-MM-dd")
}

function parseFlexibleNumber(raw: string): number | null {
  const sanitized = sanitizeCell(raw).replace(/[,₹$\s]/g, "")
  if (!sanitized) return null
  const value = Number(sanitized)
  return Number.isFinite(value) ? value : null
}

const REQUIRED_COLUMNS = ["date", "amount paid", "odometer reading", "fuel filled", "fuel station"]

/**
 * Parses the CSV export format: Date, Amount Paid, Odometer Reading, Fuel
 * Filled, Fuel Station. Dates and numbers are sanitized defensively (mixed
 * date formats, stray invisible characters); rows that still don't parse
 * are skipped and reported rather than aborting the whole import.
 */
export function parseFuelEntriesCsv(text: string): CsvImportResult {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0)
  const rows: FuelEntryInput[] = []
  const errors: CsvImportError[] = []

  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, reason: "File is empty." }] }
  }

  const header = parseCsvLine(lines[0]).map((cell) => sanitizeCell(cell).toLowerCase())
  const columnIndex = (name: string) => header.indexOf(name)

  const missing = REQUIRED_COLUMNS.filter((col) => columnIndex(col) === -1)
  if (missing.length > 0) {
    return {
      rows,
      errors: [{ line: 1, reason: `Missing column(s): ${missing.join(", ")}` }],
    }
  }

  const dateIdx = columnIndex("date")
  const amountIdx = columnIndex("amount paid")
  const odometerIdx = columnIndex("odometer reading")
  const litresIdx = columnIndex("fuel filled")
  const stationIdx = columnIndex("fuel station")

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1
    const cells = parseCsvLine(lines[i])

    const date = parseFlexibleDate(cells[dateIdx] ?? "")
    const amountPaid = parseFlexibleNumber(cells[amountIdx] ?? "")
    const odometerReading = parseFlexibleNumber(cells[odometerIdx] ?? "")
    const litresFilled = parseFlexibleNumber(cells[litresIdx] ?? "")
    const fuelStation = sanitizeCell(cells[stationIdx] ?? "")

    const rowErrors: string[] = []
    if (!date) rowErrors.push("unparseable date")
    if (amountPaid === null || amountPaid <= 0) rowErrors.push("invalid amount paid")
    if (odometerReading === null || odometerReading <= 0) rowErrors.push("invalid odometer reading")
    if (litresFilled === null || litresFilled <= 0) rowErrors.push("invalid fuel filled")
    if (!fuelStation) rowErrors.push("missing fuel station")

    if (rowErrors.length > 0) {
      errors.push({ line: lineNumber, reason: rowErrors.join(", ") })
      continue
    }

    rows.push({
      date: date!,
      amountPaid: amountPaid!,
      odometerReading: odometerReading!,
      litresFilled: litresFilled!,
      fuelStation,
    })
  }

  return { rows, errors }
}
