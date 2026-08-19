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
import { setStoredUserName } from "@/hooks/use-user-name"
import { ApiError } from "@/lib/api-client"

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  otp: z
    .string()
    .trim()
    .min(1, "Enter the code sent to your email")
    .length(6, "Code must be 6 digits"),
})

type SignUpValues = z.infer<typeof signUpSchema>

interface SignUpFormProps {
  onSignedUp: () => void
}

export function SignUpForm({ onSignedUp }: SignUpFormProps) {
  const { signUpSendOtp, signUpVerify } = useAuth()
  const [otpSent, setOtpSent] = useState(false)

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", otp: "" },
  })

  async function handleSendOtp() {
    const emailValid = await form.trigger("email")
    if (!emailValid) return

    try {
      await signUpSendOtp(form.getValues("email"))
      setOtpSent(true)
      toast.success(`OTP sent to ${form.getValues("email")}`)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send OTP")
    }
  }

  async function onSubmit(values: SignUpValues) {
    try {
      await signUpVerify(values)
      setStoredUserName(values.name)
      onSignedUp()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create account")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <FieldGroup>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel
            htmlFor="signup-name"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Name
          </FieldLabel>
          <Input
            id="signup-name"
            autoComplete="name"
            aria-invalid={!!form.formState.errors.name}
            className="h-11"
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>

        <Field data-invalid={!!form.formState.errors.email}>
          <FieldLabel
            htmlFor="signup-email"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Email
          </FieldLabel>
          <InputGroup className="h-11">
            <InputGroupInput
              id="signup-email"
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
            htmlFor="signup-otp"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            OTP
          </FieldLabel>
          <Input
            id="signup-otp"
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

        <Field data-invalid={!!form.formState.errors.password}>
          <FieldLabel
            htmlFor="signup-password"
            className="text-xs font-medium tracking-wider text-muted-foreground uppercase"
          >
            Password
          </FieldLabel>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!form.formState.errors.password}
            className="h-11"
            {...form.register("password")}
          />
          <FieldError errors={[form.formState.errors.password]} />
        </Field>
      </FieldGroup>

      <Button type="submit" className="h-11 w-full font-semibold" disabled={form.formState.isSubmitting}>
        Create account
      </Button>
    </form>
  )
}
