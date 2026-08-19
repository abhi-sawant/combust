import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { useAuth } from "@/hooks/auth-context"
import { ApiError } from "@/lib/api-client"

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  otp: z
    .string()
    .trim()
    .min(1, "Enter the code sent to your email")
    .length(6, "Code must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormProps {
  onReset: () => void
}

export function ForgotPasswordForm({ onReset }: ForgotPasswordFormProps) {
  const { forgotPasswordSendOtp, forgotPasswordReset } = useAuth()
  const [otpSent, setOtpSent] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", otp: "", newPassword: "" },
  })

  async function handleSendOtp() {
    const emailValid = await form.trigger("email")
    if (!emailValid) return

    try {
      await forgotPasswordSendOtp(form.getValues("email"))
      setOtpSent(true)
      toast.success(`OTP sent to ${form.getValues("email")}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send OTP")
    }
  }

  async function onSubmit(values: ForgotPasswordValues) {
    try {
      await forgotPasswordReset(values)
      onReset()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reset password")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel
            htmlFor="forgot-email"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Email
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupInput
              id="forgot-email"
              type="email"
              autoComplete="email"
              aria-invalid={!!form.formState.errors.email}
              {...form.register("email")}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton onClick={handleSendOtp}>{otpSent ? "Resend" : "Send OTP"}</InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldError errors={[form.formState.errors.email]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.otp}>
          <FieldLabel
            htmlFor="forgot-otp"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            OTP
          </FieldLabel>
          <Input
            id="forgot-otp"
            inputMode="numeric"
            maxLength={6}
            disabled={!otpSent}
            aria-invalid={!!form.formState.errors.otp}
            className="h-12 text-center font-mono text-lg tracking-[0.5em]"
            {...form.register("otp")}
          />
          <FieldDescription>
            {otpSent ? "Enter the 6-digit code we emailed you." : "Send a code to your email first."}
          </FieldDescription>
          <FieldError errors={[form.formState.errors.otp]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.newPassword}>
          <FieldLabel
            htmlFor="forgot-new-password"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            New password
          </FieldLabel>
          <Input
            id="forgot-new-password"
            type="password"
            autoComplete="new-password"
            disabled={!otpSent}
            aria-invalid={!!form.formState.errors.newPassword}
            className="h-11"
            {...form.register("newPassword")}
          />
          <FieldError errors={[form.formState.errors.newPassword]} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="h-11 w-full font-semibold" disabled={form.formState.isSubmitting}>
        Reset password
      </Button>
    </form>
  )
}
