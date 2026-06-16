import type { GameResult, Mode, RankingPage } from '../types'

const BASE = import.meta.env.DEV ? 'http://localhost:8788' : ''

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function startGame(mode: Mode, guestToken: string, displayName: string): Promise<string> {
  const { sessionId } = await post<{ sessionId: string }>('/api/game/start', { mode, guestToken, displayName })
  return sessionId
}

export async function stopGame(sessionId: string, guestToken: string): Promise<GameResult> {
  return post<GameResult>('/api/game/stop', { sessionId, guestToken })
}

export async function fetchRanking(
  mode: Mode,
  type: 'today' | 'all',
  limit = 20,
  offset = 0,
): Promise<RankingPage> {
  return get(`/api/ranking?mode=${mode}&type=${type}&limit=${limit}&offset=${offset}`)
}
