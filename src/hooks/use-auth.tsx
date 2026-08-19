import { useCallback, useEffect, useState } from "react"

import { AuthContext, type AuthContextValue, type AuthUser } from "@/hooks/auth-context"
import { apiRequest } from "@/lib/api-client"
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/auth-token"

interface AuthResponse {
  token: string
  user: AuthUser
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getStoredToken()) {
        setIsLoading(false)
        return
      }

      try {
        const { user } = await apiRequest<{ user: AuthUser }>("/me")
        if (!cancelled) setUser(user)
      } catch {
        clearStoredToken()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  const signUpSendOtp = useCallback(async (email: string) => {
    await apiRequest("/auth/signup/send-otp", { method: "POST", body: { email }, auth: false })
  }, [])

  const signUpVerify = useCallback(
    async (input: { name: string; email: string; password: string; otp: string }) => {
      const response = await apiRequest<AuthResponse>("/auth/signup/verify", {
        method: "POST",
        body: input,
        auth: false,
      })
      setStoredToken(response.token)
      setUser(response.user)
    },
    []
  )

  const signIn = useCallback(async (input: { email: string; password: string }) => {
    const response = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: input,
      auth: false,
    })
    setStoredToken(response.token)
    setUser(response.user)
  }, [])

  const forgotPasswordSendOtp = useCallback(async (email: string) => {
    await apiRequest("/auth/forgot-password/send-otp", { method: "POST", body: { email }, auth: false })
  }, [])

  const forgotPasswordReset = useCallback(
    async (input: { email: string; otp: string; newPassword: string }) => {
      await apiRequest("/auth/forgot-password/reset", { method: "POST", body: input, auth: false })
    },
    []
  )

  const signOut = useCallback(() => {
    clearStoredToken()
    setUser(null)
  }, [])

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    signUpSendOtp,
    signUpVerify,
    signIn,
    forgotPasswordSendOtp,
    forgotPasswordReset,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
