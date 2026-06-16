import { useEffect, useState, useCallback } from 'react'
import type { Mode, RankingEntry } from '../types'
import { fetchRanking } from '../lib/api'
import { toFlag } from '../lib/flag'

const MODES: Mode[] = ['3s', '30s', '300s', '3600s']
const MODE_DESC: Record<Mode, string> = {
  '3s': '3s',
  '30s': '30s',
  '300s': '5m',
  '3600s': '1h',
}
const PAGE_SIZE = 20
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface Props {
  onBack: () => void
  onHome: () => void
  currentMode?: Mode
}

export function RankingPage({ onBack, onHome, currentMode = '3s' }: Props) {
  const [mode, setMode] = useState<Mode>(currentMode)
  const [type, setType] = useState<'today' | 'all'>('all')
  const [scores, setScores] = useState<RankingEntry[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  // モード・タイプが変わったら最初のページをリセットして取得
  useEffect(() => {
    setLoading(true)
    setError('')
    setScores([])
    fetchRanking(mode, type, PAGE_SIZE, 0)
      .then(({ scores, total, hasMore }) => {
        setScores(scores)
        setTotal(total)
        setHasMore(hasMore)
      })
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [mode, type])

  const handleLoadMore = useCallback(() => {
    setLoadingMore(true)
    fetchRanking(mode, type, PAGE_SIZE, scores.length)
      .then(({ scores: more, hasMore }) => {
        setScores(prev => [...prev, ...more])
        setHasMore(hasMore)
      })
      .catch(() => setError('追加読み込みに失敗しました'))
      .finally(() => setLoadingMore(false))
  }, [mode, type, scores.length])

  return (
    <div className="page ranking-page">
      <div className="ranking-header">
        <button className="btn-text" onClick={onBack}>← 戻る</button>
        <button className="logo logo-btn dim" onClick={onHome}>TICK</button>
      </div>

      <div className="tab-row">
        {MODES.map((m) => (
          <button
            key={m}
            className={`tab-btn ${mode === m ? 'active' : ''}`}
            onClick={() => setMode(m)}
          >
            {MODE_DESC[m]}
          </button>
        ))}
      </div>

      <div className="tab-row small">
        <button className={`tab-btn ${type === 'all' ? 'active' : ''}`} onClick={() => setType('all')}>
          ALL TIME
        </button>
        <button className={`tab-btn ${type === 'today' ? 'active' : ''}`} onClick={() => setType('today')}>
          TODAY
        </button>
      </div>

      <p className="total-count">{total.toLocaleString()}人が挑戦中</p>

      {loading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <>
          <ol className="ranking-list">
            {scores.map((entry) => (
              <li key={entry.rank} className={`ranking-row ${entry.rank <= 3 ? 'top' : ''}`}>
                <span className="rank-num">
                  {MEDAL[entry.rank] ?? `${entry.rank}位`}
                </span>
                <span className="rank-name">
                  {toFlag(entry.country) && (
                    <span className="rank-flag">{toFlag(entry.country)}</span>
                  )}
                  {entry.displayName}
                </span>
                <span className="rank-error">±{(entry.errorMs / 1000).toFixed(3)}s</span>
                <span className="rank-title">{entry.title}</span>
              </li>
            ))}
            {scores.length === 0 && (
              <p className="empty-text">まだ記録がありません</p>
            )}
          </ol>

          {hasMore && (
            <button
              className="btn-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? '読み込み中...' : `もっと見る（${scores.length} / ${total.toLocaleString()}人）`}
            </button>
          )}

          {!hasMore && scores.length > 0 && (
            <p className="ranking-end">— 以上 {scores.length.toLocaleString()}件 —</p>
          )}
        </>
      )}
    </div>
  )
}
