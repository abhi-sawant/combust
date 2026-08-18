import { format, parseISO } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { StationCombobox } from "@/components/entries/station-combobox"
import { useEntries } from "@/hooks/entries-context"
import { getOdometerWarning } from "@/lib/calculations"
import { cn } from "@/lib/utils"
import type { FuelEntry, FuelEntryInput } from "@/types/entry"

function positiveNumber(label: string) {
  return z.number({ invalid_type_error: `${label} is required` }).positive(`${label} must be greater than 0`)
}

const entrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  odometerReading: positiveNumber("Odometer reading"),
  fuelStation: z.string().trim().min(1, "Fuel station is required"),
  amountPaid: positiveNumber("Amount paid"),
  litresFilled: positiveNumber("Litres filled"),
})

type EntryFormValues = z.infer<typeof entrySchema>

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd")
}

function toDefaultValues(entry?: FuelEntry): EntryFormValues {
  if (entry) {
    return {
      date: entry.date,
      odometerReading: entry.odometerReading,
      fuelStation: entry.fuelStation,
      amountPaid: entry.amountPaid,
      litresFilled: entry.litresFilled,
    }
  }
  return {
    date: todayIso(),
    odometerReading: undefined as unknown as number,
    fuelStation: "",
    amountPaid: undefined as unknown as number,
    litresFilled: undefined as unknown as number,
  }
}

interface EntryFormProps {
  entry?: FuelEntry
  onSaved: () => void
  onCancel: () => void
}

export function EntryForm({ entry, onSaved, onCancel }: EntryFormProps) {
  const { entries, stationNames, addEntry, updateEntry } = useEntries()

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: toDefaultValues(entry),
  })

  const odometerReading = form.watch("odometerReading")
  const liveOdometerWarning =
    typeof odometerReading === "number" && !Number.isNaN(odometerReading)
      ? getOdometerWarning(entries, odometerReading, entry?.id)
      : null

  async function onSubmit(values: EntryFormValues) {
    const warning = getOdometerWarning(entries, values.odometerReading, entry?.id)
    if (warning) {
      form.setError("odometerReading", { type: "manual", message: warning })
      return
    }

    const input: FuelEntryInput = { ...values, fuelStation: values.fuelStation.trim() }
    if (entry) {
      await updateEntry(entry.id, input)
    } else {
      await addEntry(input)
    }
    onSaved()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.date}>
          <FieldLabel htmlFor="entry-date">Date</FieldLabel>
          <Controller
            control={form.control}
            name="date"
            render={({ field }) => (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      id="entry-date"
                      type="button"
                      variant="outline"
                      className="justify-start font-normal"
                    />
                  }
                >
                  <CalendarIcon />
                  {field.value ? format(parseISO(field.value), "PPP") : "Pick a date"}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value ? parseISO(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) field.onChange(format(date, "yyyy-MM-dd"))
                    }}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          <FieldError errors={[form.formState.errors.date]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.odometerReading}>
          <FieldLabel htmlFor="odometerReading">Odometer reading (km)</FieldLabel>
          <Input
            id="odometerReading"
            type="number"
            inputMode="decimal"
            step="1"
            aria-invalid={!!form.formState.errors.odometerReading}
            {...form.register("odometerReading", { valueAsNumber: true })}
          />
          <FieldError
            className={cn(!form.formState.errors.odometerReading && liveOdometerWarning && "text-destructive")}
            errors={[
              form.formState.errors.odometerReading ??
                (liveOdometerWarning ? { message: liveOdometerWarning } : undefined),
            ]}
          />
        </Field>

        <Field data-invalid={!!form.formState.errors.fuelStation}>
          <FieldLabel htmlFor="fuelStation">Fuel station</FieldLabel>
          <Controller
            control={form.control}
            name="fuelStation"
            render={({ field }) => (
              <StationCombobox
                id="fuelStation"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                stations={stationNames}
              />
            )}
          />
          <FieldError errors={[form.formState.errors.fuelStation]} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!form.formState.errors.litresFilled}>
            <FieldLabel htmlFor="litresFilled">Litres filled</FieldLabel>
            <Input
              id="litresFilled"
              type="number"
              inputMode="decimal"
              step="0.01"
              aria-invalid={!!form.formState.errors.litresFilled}
              {...form.register("litresFilled", { valueAsNumber: true })}
            />
            <FieldError errors={[form.formState.errors.litresFilled]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.amountPaid}>
            <FieldLabel htmlFor="amountPaid">Amount paid</FieldLabel>
            <Input
              id="amountPaid"
              type="number"
              inputMode="decimal"
              step="0.01"
              aria-invalid={!!form.formState.errors.amountPaid}
              {...form.register("amountPaid", { valueAsNumber: true })}
            />
            <FieldError errors={[form.formState.errors.amountPaid]} />
          </Field>
        </div>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {entry ? "Save changes" : "Add entry"}
        </Button>
      </div>
    </form>
  )
}
