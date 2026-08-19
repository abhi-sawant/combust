import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { AuthShell } from "@/components/auth/auth-shell"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useVehicles } from "@/hooks/vehicles-context"

const addVehicleSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  plate: z.string().trim(),
})

type AddVehicleValues = z.infer<typeof addVehicleSchema>

export function AddVehicleOnboarding() {
  const { addVehicle } = useVehicles()

  const form = useForm<AddVehicleValues>({
    resolver: zodResolver(addVehicleSchema),
    defaultValues: { name: "", plate: "" },
  })

  async function onSubmit(values: AddVehicleValues) {
    await addVehicle({ name: values.name.trim(), plate: values.plate.trim() || undefined })
  }

  return (
    <AuthShell title="Add your vehicle" description="Track fuel and mileage for a vehicle to get started.">
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FieldGroup>
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel
              htmlFor="onboarding-vehicle-name"
              className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
            >
              Name
            </FieldLabel>
            <Input
              id="onboarding-vehicle-name"
              placeholder="e.g. Honda Activa 6G"
              aria-invalid={!!form.formState.errors.name}
              className="h-11"
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field>
            <FieldLabel
              htmlFor="onboarding-vehicle-plate"
              className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
            >
              Plate (optional)
            </FieldLabel>
            <Input
              id="onboarding-vehicle-plate"
              placeholder="e.g. GJ 06 KL 4412"
              className="h-11"
              {...form.register("plate")}
            />
          </Field>
        </FieldGroup>

        <Button type="submit" className="h-11 w-full font-semibold" disabled={form.formState.isSubmitting}>
          Add vehicle
        </Button>
      </form>
    </AuthShell>
  )
}
