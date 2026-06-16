// ISO 3166-1 alpha-2 → 国旗絵文字
// "JP" → 🇯🇵  の変換。各文字を地域表示記号 (U+1F1E6 〜) にマッピングする。
export function toFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return ''
  return [...code].map(c => String.fromCodePoint(c.charCodeAt(0) + 0x1F1A5)).join('')
}
