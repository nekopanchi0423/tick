import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'
import { Filter } from 'bad-words'

type Bindings = {
  DB: D1Database
}

type Mode = '3s' | '30s' | '300s' | '3600s'

const MODES: Record<Mode, number> = {
  '3s': 3000,
  '30s': 30000,
  '300s': 300000,
  '3600s': 3600000,
}

const TITLES = [
  { label: '🌌 クロノスの子', maxError: 9 },
  { label: '⚛️ 原子時計', maxError: 29 },
  { label: '🎵 メトロノーム', maxError: 99 },
  { label: '⌚ 腕時計', maxError: 499 },
  { label: '👤 一般人', maxError: 1999 },
  { label: '⏳ 石器人', maxError: Infinity },
]

function getTitle(errorMs: number): string {
  for (const t of TITLES) {
    if (errorMs <= t.maxError) return t.label
  }
  return '⏳ 石器人'
}

function isValidToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9-]{36}$/.test(token)
}

// ── 名前バリデーション ──────────────────────────────────────────

const englishFilter = new Filter()

// bad-words が単語境界マッチのため合成語を捕捉できない → 部分一致で補完
const EN_PARTIAL: RegExp[] = [
  /fuck/i, /shit/i, /cunt/i, /porn/i, /rape/i, /nazi/i, /n[i1]gg[ae]/i,
]

// 日本語は表記揺れが多くライブラリで対応できないため自前で定義する
const JP_BLOCKED: RegExp[] = [
  /死ね|しね|氏ね|シネ死/,
  /ころせ|殺せ|殺す|殺し|コロセ/,
  /自殺|じさつ/,
  /クソ|くそ|糞/,
  /エロ|えろ/,
  /まんこ|マンコ/,
  /ちんこ|チンコ|ちんぽ|チンポ|ちんちん|チンチン/,
  /うんこ|ウンコ|うんち|ウンチ|うんぴ|ウンピ/,
  /セックス|せっくす|sex/i,
  /えっち|エッチ/,
  /おっぱい|オッパイ/,
  /ちくび|チクビ|乳首/,
  /ナチス|なちす/,
  /レイプ|れいぷ/,
  /差別/,
  /し[ねﾈ]|[死氏][ねﾈ]/,
]

const INJECTION_PATTERNS: RegExp[] = [
  /<[^>]*>/, /javascript\s*:/i, /data\s*:/i, /https?:\/\//i,
]

function stripDangerousChars(s: string): string {
  return s
    .replace(/[ --]/g, '')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '')
}

type NameResult = { ok: true; name: string } | { ok: false }

function validateName(raw: unknown): NameResult {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { ok: true, name: '名無し' }
  }
  const cleaned = stripDangerousChars(raw).trim().slice(0, 20)
  if (cleaned.length === 0) return { ok: true, name: '名無し' }

  for (const re of INJECTION_PATTERNS) {
    if (re.test(cleaned)) return { ok: false }
  }
  try {
    if (englishFilter.isProfane(cleaned)) return { ok: false }
  } catch { /* 解析不能な文字列は通す */ }
  for (const re of EN_PARTIAL) {
    if (re.test(cleaned)) return { ok: false }
  }
  for (const re of JP_BLOCKED) {
    if (re.test(cleaned)) return { ok: false }
  }
  return { ok: true, name: cleaned }
}

function getCountry(req: Request): string | null {
  const cf = (req as Request & { cf?: { country?: string } }).cf
  const code = cf?.country
  if (!code || !/^[A-Z]{2}$/.test(code)) return null
  return code
}

const app = new Hono<{ Bindings: Bindings }>()

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

app.use('*', cors({ origin: '*' }))

// ── POST /api/game/start ────────────────────────────────────────
app.post('/api/game/start', async (c) => {
  let body: { mode?: string; guestToken?: unknown; displayName?: unknown }
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  const mode = (body.mode ?? '3s') as Mode
  if (!(mode in MODES)) return c.json({ error: 'Invalid mode' }, 400)

  const guestToken = body.guestToken
  if (!isValidToken(guestToken)) return c.json({ error: 'Invalid token' }, 400)

  // 名前を START 時点で検証（ゲーム開始前に即フィードバック）
  const nameResult = validateName(body.displayName)
  if (!nameResult.ok) return c.json({ error: 'name_rejected' }, 422)

  // レートリミット
  const recentCount = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM game_sessions WHERE guest_token = ? AND started_at > ?')
    .bind(guestToken, Date.now() - 60_000)
    .first<{ count: number }>()
  if (recentCount && recentCount.count >= 20) {
    return c.json({ error: 'Rate limit exceeded' }, 429)
  }

  // 同一 token・同一モードの放棄セッションを期限切れにする
  // （ターゲット時間の 3 倍以上前に開始されたもの）
  const expireMs = MODES[mode] * 3
  await c.env.DB
    .prepare('UPDATE game_sessions SET used = 1 WHERE guest_token = ? AND mode = ? AND used = 0 AND started_at < ?')
    .bind(guestToken, mode, Date.now() - expireMs)
    .run()

  const sessionId = crypto.randomUUID()
  await c.env.DB
    .prepare('INSERT INTO game_sessions (id, started_at, mode, guest_token, display_name) VALUES (?, ?, ?, ?, ?)')
    .bind(sessionId, Date.now(), mode, guestToken, nameResult.name)
    .run()

  return c.json({ sessionId })
})

// ── POST /api/game/stop ─────────────────────────────────────────
app.post('/api/game/stop', async (c) => {
  const stoppedAt = Date.now()

  let body: { sessionId?: unknown; guestToken?: unknown }
  try { body = await c.req.json() } catch {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  if (typeof body.sessionId !== 'string') return c.json({ error: 'Missing sessionId' }, 400)
  if (!isValidToken(body.guestToken)) return c.json({ error: 'Invalid token' }, 400)

  // 24h 以上前のセッションは期限切れとして拒否
  const session = await c.env.DB
    .prepare('SELECT * FROM game_sessions WHERE id = ? AND used = 0 AND started_at > ?')
    .bind(body.sessionId, stoppedAt - 24 * 60 * 60 * 1000)
    .first<{ id: string; started_at: number; mode: Mode; guest_token: string; display_name: string }>()

  if (!session) return c.json({ error: 'Invalid or expired session' }, 400)
  if (session.guest_token !== body.guestToken) return c.json({ error: 'Unauthorized' }, 403)

  await c.env.DB
    .prepare('UPDATE game_sessions SET used = 1 WHERE id = ?')
    .bind(body.sessionId)
    .run()

  const targetMs = MODES[session.mode]
  const actualMs = stoppedAt - session.started_at
  const errorMs = Math.abs(actualMs - targetMs)

  // 物理的に不可能なスコアを弾く（反応時間の下限）
  if (errorMs < 10 && session.mode === '3s') {
    return c.json({ error: 'Score rejected' }, 400)
  }

  const country = getCountry(c.req.raw)
  const guestToken = session.guest_token

  // 全試行を記録（統計用）
  const insertResult = await c.env.DB
    .prepare('INSERT INTO scores (guest_token, mode, target_ms, actual_ms, error_ms) VALUES (?, ?, ?, ?, ?)')
    .bind(guestToken, session.mode, targetMs, actualMs, errorMs)
    .run()

  // 現在の自己ベストを取得
  const existingBest = await c.env.DB
    .prepare('SELECT best_error_ms FROM best_scores WHERE guest_token = ? AND mode = ?')
    .bind(guestToken, session.mode)
    .first<{ best_error_ms: number }>()

  const isPersonalBest = !existingBest || errorMs < existingBest.best_error_ms

  // ★ 自己ベスト更新時のみランキングを更新する
  if (isPersonalBest) {
    const scoreId = insertResult.meta.last_row_id
    await c.env.DB
      .prepare(`
        INSERT INTO best_scores (guest_token, mode, best_error_ms, score_id, display_name, country, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(guest_token, mode) DO UPDATE SET
          best_error_ms = excluded.best_error_ms,
          score_id      = excluded.score_id,
          display_name  = excluded.display_name,
          country       = excluded.country,
          updated_at    = excluded.updated_at
      `)
      .bind(guestToken, session.mode, errorMs, scoreId, session.display_name, country, Date.now())
      .run()
  }

  // ★ ランク計算：自分を除いた他プレイヤーと比較
  // 非PB でも「今回のスコアが何位相当か」の暫定順位を返す
  const rankRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM best_scores WHERE mode = ? AND best_error_ms < ? AND guest_token != ?')
    .bind(session.mode, errorMs, guestToken)
    .first<{ cnt: number }>()

  const totalRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM best_scores WHERE mode = ?')
    .bind(session.mode)
    .first<{ cnt: number }>()

  const rank = (rankRow?.cnt ?? 0) + 1
  const total = totalRow?.cnt ?? (isPersonalBest ? 1 : 0)

  return c.json({
    targetMs,
    actualMs,
    errorMs,
    rank,
    total,
    title: getTitle(errorMs),
    isPersonalBest,
    mode: session.mode,
  })
})

// ── GET /api/ranking ────────────────────────────────────────────
app.get('/api/ranking', async (c) => {
  const mode = (c.req.query('mode') ?? '3s') as Mode
  const type = c.req.query('type') ?? 'all'
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') ?? '20', 10) || 20, 1), 50)
  const offset = Math.max(parseInt(c.req.query('offset') ?? '0', 10) || 0, 0)

  if (!(mode in MODES)) return c.json({ error: 'Invalid mode' }, 400)

  type Row = { best_error_ms: number; display_name?: string; country?: string }
  let rows: D1Result<Row>

  if (type === 'today') {
    const todayMs = new Date().setHours(0, 0, 0, 0)
    rows = await c.env.DB
      .prepare(`
        SELECT s.guest_token, MIN(s.error_ms) as best_error_ms, b.display_name, b.country
        FROM scores s
        LEFT JOIN best_scores b ON b.guest_token = s.guest_token AND b.mode = s.mode
        WHERE s.mode = ? AND s.created_at >= ?
        GROUP BY s.guest_token
        ORDER BY best_error_ms ASC
        LIMIT ? OFFSET ?
      `)
      .bind(mode, todayMs, limit, offset)
      .all<Row>()
  } else {
    rows = await c.env.DB
      .prepare(`
        SELECT best_error_ms, display_name, country
        FROM best_scores
        WHERE mode = ?
        ORDER BY best_error_ms ASC
        LIMIT ? OFFSET ?
      `)
      .bind(mode, limit, offset)
      .all<Row>()
  }

  const totalRow = await c.env.DB
    .prepare('SELECT COUNT(*) as cnt FROM best_scores WHERE mode = ?')
    .bind(mode)
    .first<{ cnt: number }>()

  const total = totalRow?.cnt ?? 0

  return c.json({
    scores: rows.results.map((r, i) => ({
      rank: offset + i + 1,
      errorMs: r.best_error_ms,
      title: getTitle(r.best_error_ms),
      displayName: r.display_name ?? '名無し',
      country: r.country ?? null,
    })),
    total,
    hasMore: offset + rows.results.length < total,
  })
})

export const onRequest = handle(app)
