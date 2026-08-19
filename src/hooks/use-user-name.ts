import { useCallback, useState } from "react"

export const USER_NAME_KEY = "combust:user-name"

export function getStoredUserName(): string {
  return localStorage.getItem(USER_NAME_KEY) ?? ""
}

export function setStoredUserName(name: string): void {
  const trimmed = name.trim()
  if (trimmed) {
    localStorage.setItem(USER_NAME_KEY, trimmed)
  } else {
    localStorage.removeItem(USER_NAME_KEY)
  }
}

export function useUserName() {
  const [name, setName] = useState(getStoredUserName)

  const updateName = useCallback((next: string) => {
    setStoredUserName(next)
    setName(getStoredUserName())
  }, [])

  return { name, setName: updateName }
}
