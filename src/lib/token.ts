const TOKEN_KEY = 'tick_guest_token'
const NAME_KEY  = 'tick_display_name'
const LOCK_KEY  = 'tick_name_locked'

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
  localStorage.setItem(NAME_KEY, name.trim().slice(0, 20))
}

// 一度でもSTARTしたことがあるか（localStorage永続）
export function isNameLocked(): boolean {
  return localStorage.getItem(LOCK_KEY) === '1'
}

// ブラウザデータを消すまで永続
export function lockName(): void {
  localStorage.setItem(LOCK_KEY, '1')
}

// 名前が実際に設定されているか
export function hasSetName(): boolean {
  const n = localStorage.getItem(NAME_KEY)
  return !!n && n.trim().length > 0
}

// 入力欄をロックするか：「プレイ済み」かつ「名前あり」の場合のみ
// 無記名でプレイした場合は後から入力可能
export function isInputLocked(): boolean {
  return isNameLocked() && hasSetName()
}
