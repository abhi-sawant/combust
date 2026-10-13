import { useCallback, useEffect, useState } from "react"

import { AuthContext, type AuthContextValue, type AuthUser } from "@/hooks/auth-context"
import { ApiError, apiRequest } from "@/lib/api-client"
import {
  clearLocalModeChosen,
  clearStoredToken,
  getStoredToken,
  getStoredUser,
  isLocalModeChosen,
  setLocalModeChosen,
  setStoredToken,
  setStoredUser,
} from "@/lib/auth-token"
import { ACTIVE_VEHICLE_KEY } from "@/hooks/use-vehicles"
import { prepareForAccount, resetSyncState } from "@/lib/sync"

interface AuthResponse {
  token: string
  user: AuthUser
}

/** Runs before an account's session starts; wipes device data left over from a different account. */
async function linkAccount(email: string) {
  if (await prepareForAccount(email)) localStorage.removeItem(ACTIVE_VEHICLE_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Trust the cached user so the app opens instantly (and offline); /me re-checks it in the background.
  const [user, setUser] = useState<AuthUser | null>(() => (getStoredToken() ? getStoredUser<AuthUser>() : null))
  const [isLocalMode, setIsLocalMode] = useState(isLocalModeChosen)
  const [isLoading, setIsLoading] = useState(() => getStoredToken() !== null && user === null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      if (!getStoredToken()) {
        setIsLoading(false)
        return
      }

      try {
        const { user } = await apiRequest<{ user: AuthUser }>("/me")
        await linkAccount(user.email)
        setStoredUser(user)
        if (!cancelled) setUser(user)
      } catch (err) {
        // Only an explicit rejection ends the session — being offline must not log anyone out.
        if (err instanceof ApiError && err.status === 401) {
          clearStoredToken()
          if (!cancelled) setUser(null)
        } else if (!cancelled) {
          setUser((current) => current ?? { id: 0, name: "", email: "" })
        }
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
      await linkAccount(response.user.email)
      setStoredToken(response.token)
      setStoredUser(response.user)
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
    await linkAccount(response.user.email)
    setStoredToken(response.token)
    setStoredUser(response.user)
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

  /** Signs out of the cloud account, keeping the on-device data, and returns to the login page. */
  const signOut = useCallback(() => {
    clearStoredToken()
    void resetSyncState()
    clearLocalModeChosen()
    setIsLocalMode(false)
    setUser(null)
  }, [])

  const continueWithoutAccount = useCallback(() => {
    setLocalModeChosen()
    setIsLocalMode(true)
  }, [])

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isLocalMode,
    continueWithoutAccount,
    signUpSendOtp,
    signUpVerify,
    signIn,
    forgotPasswordSendOtp,
    forgotPasswordReset,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
