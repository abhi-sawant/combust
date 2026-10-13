const TOKEN_KEY = "combust:auth-token"
const USER_KEY = "combust:auth-user"
const LOCAL_MODE_KEY = "combust:local-mode"

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** The last-known signed-in user, so the app can open offline without waiting on /me. */
export function getStoredUser<T>(): T | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function setStoredUser(user: unknown): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

/** Whether the user chose to use the app without a cloud account. */
export function isLocalModeChosen(): boolean {
  return localStorage.getItem(LOCAL_MODE_KEY) === "1"
}

export function setLocalModeChosen(): void {
  localStorage.setItem(LOCAL_MODE_KEY, "1")
}

export function clearLocalModeChosen(): void {
  localStorage.removeItem(LOCAL_MODE_KEY)
}
