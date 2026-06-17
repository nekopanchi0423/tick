import { useState, useEffect } from 'react'
import type { Mode, RankingEntry } from '../types'
import { MODE_LABELS } from '../types'
import { getDisplayName, setDisplayName, isInputLocked, isNameLocked, hasSetName } from '../lib/token'
import { fetchRanking } from '../lib/api'
import { toFlag } from '../lib/flag'

const MODES: Mode[] = ['3s', '30s', '300s', '3600s']

// 言語に依存しない短縮表記
const MODE_DESC: Record<Mode, string> = {
  '3s': '3s',
  '30s': '30s',
  '300s': '5m',
  '3600s': '1h',
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

interface Props {
  onStart: (mode: Mode) => void
  onHome: () => void
  onRanking: () => void
  totalPlays: number
}

export function HomePage({ onStart, onHome, onRanking, totalPlays }: Props) {
  const [selected, setSelected] = useState<Mode>('3s')
  const [name, setName] = useState(getDisplayName)
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [rankTotal, setRankTotal] = useState(0)
  const locked = isInputLocked()          // 名前ありでロック済み → 入力不可
  const playedAnonymous = isNameLocked() && !hasSetName() // 無記名プレイ済み → 入力可

  useEffect(() => {
    fetchRanking(selected, 'all', 10, 0)
      .then(({ scores, total }) => {
        setRanking(scores)
        setRankTotal(total)
      })
      .catch(() => {})
  }, [selected])

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (locked) return
    setName(e.target.value)
    // localStorage への書き込みは START 時まで遅らせる
    // （途中で hasSetName() が true になりロックされるのを防ぐ）
  }

  function handleStart() {
    if (!locked) setDisplayName(name) // START直前に確定保存
    onStart(selected)
  }

  return (
    <div className="page home-page">
      <button className="logo logo-btn" onClick={onHome}>TICK</button>

      <div className="mode-selector">
        {MODES.map((m) => (
          <button
            key={m}
            className={`mode-btn ${selected === m ? 'active' : ''}`}
            onClick={() => setSelected(m)}
          >
            {MODE_DESC[m]}
          </button>
        ))}
      </div>

      <div className="target-display">
        <span className="target-number">{MODE_LABELS[selected]}</span>
        <span className="target-unit">.000</span>
        <span className="target-label">seconds</span>
      </div>

      <div className="name-input-wrap">
        <input
          className={`name-input ${locked ? 'name-input-locked' : ''}`}
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="display name (optional)"
          maxLength={20}
          disabled={locked}
        />
        {locked && (
          <p className="name-locked-hint">🔒 name is locked</p>
        )}
        {playedAnonymous && (
          <p className="name-locked-hint name-anonymous-hint">名前を入力できます（一度設定すると変更不可）</p>
        )}
      </div>

      <button className="btn-main" onClick={handleStart}>
        START
      </button>

      {totalPlays > 0 && (
        <p className="social-proof">{totalPlays.toLocaleString()} plays today</p>
      )}

      <div className="home-ranking">
        <div className="home-ranking-header">
          <span className="home-ranking-title">RANKING</span>
          <span className="home-ranking-total">{rankTotal.toLocaleString()} players</span>
        </div>
        <ol className="home-ranking-list">
          {ranking.map((entry) => (
            <li key={entry.rank} className={`home-ranking-row ${entry.rank <= 3 ? 'top' : ''}`}>
              <span className="home-rank-num">
                {MEDAL[entry.rank] ?? `${entry.rank}`}
              </span>
              <span className="home-rank-name">
                {toFlag(entry.country) && (
                  <span className="rank-flag">{toFlag(entry.country)}</span>
                )}
                {entry.displayName}
              </span>
              <span className="home-rank-error">±{(entry.errorMs / 1000).toFixed(3)}s</span>
            </li>
          ))}
        </ol>
        <button className="btn-text home-ranking-more" onClick={onRanking}>
          more →
        </button>
      </div>
    </div>
  )
}
