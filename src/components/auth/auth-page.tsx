import { useState } from "react"
import { toast } from "sonner"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Button } from "@/components/ui/button"

type AuthView = "sign-in" | "sign-up" | "forgot-password"

interface AuthPageProps {
  onSignedIn: () => void
}

export function AuthPage({ onSignedIn }: AuthPageProps) {
  const [view, setView] = useState<AuthView>("sign-in")

  if (view === "sign-up") {
    return (
      <AuthShell
        title="Create an account"
        description="Sign up to start tracking your fuel entries."
        footer={
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button type="button" variant="link" className="h-auto p-0" onClick={() => setView("sign-in")}>
              Sign in
            </Button>
          </p>
        }
      >
        <SignUpForm
          onSignedUp={() => {
            toast.success("Account created. Please sign in.")
            setView("sign-in")
          }}
        />
      </AuthShell>
    )
  }

  if (view === "forgot-password") {
    return (
      <AuthShell
        title="Reset your password"
        description="Enter your email and we'll send you a one-time code."
        footer={
          <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setView("sign-in")}>
            Back to sign in
          </Button>
        }
      >
        <ForgotPasswordForm
          onVerified={() => {
            toast.success("Code verified. Please sign in.")
            setView("sign-in")
          }}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back. Enter your details to continue."
      footer={
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Button type="button" variant="link" className="h-auto p-0" onClick={() => setView("sign-up")}>
            Sign up
          </Button>
        </p>
      }
    >
      <SignInForm onSignedIn={onSignedIn} onForgotPassword={() => setView("forgot-password")} />
    </AuthShell>
  )
}
