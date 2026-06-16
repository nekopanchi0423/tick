const TOKEN_KEY = 'tick_guest_token'
const NAME_KEY = 'tick_display_name'
const LOCK_KEY = 'tick_name_locked'

export function getGuestToken(): string {
  let token = localStorage.getItem(TOKEN_KEY)
  if (!token) {
    token = crypto.randomUUID()
    localStorage.setItem(TOKEN_KEY, token)
  }
  return token
}

export function getDisplayName(): string {
  return localStorage.getItem(NAME_KEY) ?? ''
}

export function setDisplayName(name: string): void {
  const sanitized = name.trim().slice(0, 20)
  localStorage.setItem(NAME_KEY, sanitized)
}

export function isNameLocked(): boolean {
  return sessionStorage.getItem(LOCK_KEY) === '1'
}

export function lockName(): void {
  sessionStorage.setItem(LOCK_KEY, '1')
}
