import { format, parseISO } from "date-fns"

export function formatNumber(value: number, fractionDigits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

export function formatDate(dateIso: string): string {
  return format(parseISO(dateIso), "d MMM yyyy")
}

export function formatKm(value: number): string {
  return `${formatNumber(value, 0)} km`
}

export function formatMileage(value: number): string {
  return `${formatNumber(value, 2)} km/l`
}

/** No currency symbol is assumed — the app doesn't collect a currency preference. */
export function formatAmount(value: number): string {
  return formatNumber(value, 2)
}
