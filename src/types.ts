export type Mode = '3s' | '30s' | '300s' | '3600s'

export const MODE_TARGETS: Record<Mode, number> = {
  '3s': 3000,
  '30s': 30000,
  '300s': 300000,
  '3600s': 3600000,
}

export const MODE_LABELS: Record<Mode, string> = {
  '3s': '3',
  '30s': '30',
  '300s': '300',
  '3600s': '3600',
}

export interface GameResult {
  targetMs: number
  actualMs: number
  errorMs: number
  rank: number
  total: number
  title: string
  isPersonalBest: boolean
  mode: Mode
}

export interface RankingEntry {
  rank: number
  errorMs: number
  title: string
  displayName: string
  country: string | null
}

export interface RankingPage {
  scores: RankingEntry[]
  total: number
  hasMore: boolean
}
