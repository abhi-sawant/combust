import { useState } from "react"
import { toast } from "sonner"

import { AuthShell } from "@/components/auth/auth-shell"
import { SignInForm } from "@/components/auth/sign-in-form"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { Button } from "@/components/ui/button"

type AuthView = "sign-in" | "sign-up" | "forgot-password"

interface AuthPageProps {
  /** Shows a "continue without an account" link (login page only). */
  onContinueLocal?: () => void
  /** Renders inside a dialog rather than as the full-page login. */
  embedded?: boolean
}

export function AuthPage({ onContinueLocal, embedded }: AuthPageProps = {}) {
  const [view, setView] = useState<AuthView>("sign-in")

  if (view === "sign-up") {
    return (
      <AuthShell
        embedded={embedded}
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
        <SignUpForm onSignedUp={() => toast.success("Account created!")} />
      </AuthShell>
    )
  }

  if (view === "forgot-password") {
    return (
      <AuthShell
        embedded={embedded}
        title="Reset your password"
        description="Enter your email and we'll send you a one-time code."
        footer={
          <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={() => setView("sign-in")}>
            Back to sign in
          </Button>
        }
      >
        <ForgotPasswordForm
          onReset={() => {
            toast.success("Password updated. Please sign in.")
            setView("sign-in")
          }}
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
        embedded={embedded}
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
      <SignInForm onForgotPassword={() => setView("forgot-password")} />
      {onContinueLocal && (
        <div className="mt-4 flex flex-col items-center gap-1 border-t pt-4 text-center">
          <Button type="button" variant="outline" className="w-full" onClick={onContinueLocal}>
            Continue without an account
          </Button>
          <p className="text-xs text-muted-foreground">
            Your data stays on this device and works offline. You can add a cloud account later in Settings.
          </p>
        </div>
      )}
    </AuthShell>
  )
}
