import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/auth-context"
import { ApiError } from "@/lib/api-client"

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type SignInValues = z.infer<typeof signInSchema>

interface SignInFormProps {
  onForgotPassword: () => void
}

export function SignInForm({ onForgotPassword }: SignInFormProps) {
  const { signIn } = useAuth()

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: SignInValues) {
    try {
      await signIn(values)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to sign in")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel
            htmlFor="signin-email"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Email
          </FieldLabel>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!form.formState.errors.email}
            className="h-11"
            {...form.register("email")}
          />
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.password}>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel
              htmlFor="signin-password"
              className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
            >
              Password
            </FieldLabel>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!form.formState.errors.password}
            className="h-11"
            {...form.register("password")}
          />
          <FieldError errors={[form.formState.errors.password]} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="h-11 w-full font-semibold" disabled={form.formState.isSubmitting}>
        Sign in
      </Button>
    </form>
  )
}
