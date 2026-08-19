import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  otp: z
    .string()
    .trim()
    .min(1, "Enter the code sent to your email")
    .length(6, "Code must be 6 digits"),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

interface ForgotPasswordFormProps {
  onVerified: () => void
}

export function ForgotPasswordForm({ onVerified }: ForgotPasswordFormProps) {
  const [otpSent, setOtpSent] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", otp: "" },
  })

  async function handleSendOtp() {
    const emailValid = await form.trigger("email")
    if (!emailValid) return

    setOtpSent(true)
    toast.success(`OTP sent to ${form.getValues("email")}`)
  }

  function onSubmit() {
    onVerified()
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
      </FieldGroup>

      <Button type="submit" className="h-11 w-full font-semibold" disabled={form.formState.isSubmitting}>
        Verify code
      </Button>
    </form>
  )
}
