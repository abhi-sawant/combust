import { createContext, useContext } from "react"

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signUpSendOtp: (email: string) => Promise<void>
  signUpVerify: (input: { name: string; email: string; password: string; otp: string }) => Promise<void>
  signIn: (input: { email: string; password: string }) => Promise<void>
  forgotPasswordSendOtp: (email: string) => Promise<void>
  forgotPasswordReset: (input: { email: string; otp: string; newPassword: string }) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
