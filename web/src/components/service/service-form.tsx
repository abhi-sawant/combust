import { format, parseISO } from 'date-fns'
import { CalendarIcon, X } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { useServices } from '@/hooks/services-context'
import type { ServiceItem, ServiceItemInput } from '@/types/service'

/** Empty number inputs become null; anything else is parsed as a number. */
const optionalNumber = (message: string, { integer = false } = {}) => {
  const base = integer ? z.number().int(message) : z.number()
  return z.number().nullable().pipe(base.positive(message).nullable())
}

const serviceSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  lastChangedDate: z.string().nullable(),
  lastChangedOdometer: z.number().min(0, 'Odometer cannot be negative').nullable(),
  intervalKm: optionalNumber('Interval must be a whole number above 0', { integer: true }),
  intervalMonths: optionalNumber('Interval must be a whole number above 0', { integer: true }),
  notes: z.string(),
})

type ServiceFormValues = z.infer<typeof serviceSchema>

function toDefaultValues(item?: Partial<ServiceItemInput>): ServiceFormValues {
  return {
    name: item?.name ?? '',
    lastChangedDate: item?.lastChangedDate ?? null,
    lastChangedOdometer: item?.lastChangedOdometer ?? null,
    intervalKm: item?.intervalKm ?? null,
    intervalMonths: item?.intervalMonths ?? null,
    notes: item?.notes ?? '',
  }
}

const numberOrNull = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

interface ServiceFormProps {
  /** The item being edited; omit to add a new one (optionally seeded by `initial`). */
  item?: ServiceItem
  initial?: Partial<ServiceItemInput>
  onSaved: () => void
  onCancel: () => void
}

export function ServiceForm({ item, initial, onSaved, onCancel }: ServiceFormProps) {
  const { addService, updateService } = useServices()

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: toDefaultValues(item ?? initial),
  })

  async function onSubmit(values: ServiceFormValues) {
    const input: ServiceItemInput = {
      ...values,
      name: values.name.trim(),
      notes: values.notes.trim() === '' ? null : values.notes.trim(),
    }
    if (item) await updateService(item.id, input)
    else await addService(input)
    onSaved()
  }

  const errors = form.formState.errors

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className='flex flex-col gap-4'>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor='service-name'>Part or service</FieldLabel>
          <Input
            id='service-name'
            placeholder='e.g. Engine oil'
            aria-invalid={!!errors.name}
            {...form.register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className='grid grid-cols-2 gap-4'>
          <Field data-invalid={!!errors.lastChangedDate}>
            <FieldLabel htmlFor='service-date'>Last changed on</FieldLabel>
            <Controller
              control={form.control}
              name='lastChangedDate'
              render={({ field }) => (
                <div className='flex gap-1.5'>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          id='service-date'
                          type='button'
                          variant='outline'
                          className='min-w-0 flex-1 justify-start font-normal'
                        />
                      }>
                      <CalendarIcon />
                      <span className='truncate'>
                        {field.value ? format(parseISO(field.value), 'd MMM yyyy') : 'Not set'}
                      </span>
                    </PopoverTrigger>
                    <PopoverContent align='start' className='w-auto p-0'>
                      <Calendar
                        mode='single'
                        selected={field.value ? parseISO(field.value) : undefined}
                        onSelect={(date) => {
                          if (date) field.onChange(format(date, 'yyyy-MM-dd'))
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {field.value && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      aria-label='Clear date'
                      onClick={() => field.onChange(null)}>
                      <X />
                    </Button>
                  )}
                </div>
              )}
            />
          </Field>

          <Field data-invalid={!!errors.lastChangedOdometer}>
            <FieldLabel htmlFor='service-odometer'>Odometer then (km)</FieldLabel>
            <Input
              id='service-odometer'
              type='number'
              inputMode='decimal'
              step='1'
              aria-invalid={!!errors.lastChangedOdometer}
              {...form.register('lastChangedOdometer', { setValueAs: numberOrNull })}
            />
            <FieldError errors={[errors.lastChangedOdometer]} />
          </Field>
        </div>

        <div className='grid grid-cols-2 gap-4'>
          <Field data-invalid={!!errors.intervalKm}>
            <FieldLabel htmlFor='service-interval-km'>Repeat every (km)</FieldLabel>
            <Input
              id='service-interval-km'
              type='number'
              inputMode='numeric'
              step='1'
              aria-invalid={!!errors.intervalKm}
              {...form.register('intervalKm', { setValueAs: numberOrNull })}
            />
            <FieldError errors={[errors.intervalKm]} />
          </Field>

          <Field data-invalid={!!errors.intervalMonths}>
            <FieldLabel htmlFor='service-interval-months'>Repeat every (months)</FieldLabel>
            <Input
              id='service-interval-months'
              type='number'
              inputMode='numeric'
              step='1'
              aria-invalid={!!errors.intervalMonths}
              {...form.register('intervalMonths', { setValueAs: numberOrNull })}
            />
            <FieldError errors={[errors.intervalMonths]} />
          </Field>
        </div>
        <FieldDescription>
          Due when either interval is reached. Leave both empty to just keep a record.
        </FieldDescription>

        <Field>
          <FieldLabel htmlFor='service-notes'>Notes</FieldLabel>
          <Textarea id='service-notes' rows={2} placeholder='Brand, grade, workshop…' {...form.register('notes')} />
        </Field>
      </FieldGroup>

      <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
        <Button type='button' variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button type='submit' disabled={form.formState.isSubmitting}>
          {item ? 'Save changes' : 'Add item'}
        </Button>
      </div>
    </form>
  )
}
