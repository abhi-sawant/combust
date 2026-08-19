import { getStoredToken } from "@/lib/auth-token"

const API_URL = import.meta.env.VITE_API_URL as string | undefined

/** Thrown for any non-2xx API response; carries the server's error message and field-level details. */
export class ApiError extends Error {
  status: number
  details?: Record<string, string>

  constructor(message: string, status: number, details?: Record<string, string>) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  query?: Record<string, string | undefined>
  /** Set to false for the public auth endpoints that don't take a bearer token. Defaults to true. */
  auth?: boolean
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("VITE_API_URL is not configured", 0)
  }

  const { method = "GET", body, query, auth = true } = options

  const url = new URL(path.replace(/^\//, ""), API_URL.endsWith("/") ? API_URL : `${API_URL}/`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value)
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (auth) {
    const token = getStoredToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiError(
      (data?.error as string | undefined) ?? "Request failed",
      response.status,
      data?.details as Record<string, string> | undefined
    )
  }

  return data as T
}
