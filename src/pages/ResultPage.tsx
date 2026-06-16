import type { GameResult } from '../types'

interface Props {
  result: GameResult
  onRetry: () => void
  onRanking: () => void
  onHome: () => void
}

function formatMs(ms: number): string {
  return (ms / 1000).toFixed(4)
}

function errorColor(errorMs: number): string {
  if (errorMs <= 29) return '#4ade80'
  if (errorMs <= 99) return '#86efac'
  if (errorMs <= 499) return '#fbbf24'
  return '#f87171'
}

function shareText(result: GameResult): string {
  const target = (result.targetMs / 1000).toFixed(3)
  const actual = formatMs(result.actualMs)
  const sign = result.actualMs >= result.targetMs ? '+' : '-'
  const err = `${sign}${(result.errorMs / 1000).toFixed(4)}`
  return `${target}秒に挑戦 → 実測 ${actual}秒（誤差 ${err}秒）\n世界 ${result.rank.toLocaleString()}位 / ${result.total.toLocaleString()}人\n称号: ${result.title}\n#TICK\nhttps://tick.pages.dev`
}

export function ResultPage({ result, onRetry, onRanking, onHome }: Props) {
  const color = errorColor(result.errorMs)
  const errorSign = result.actualMs >= result.targetMs ? '+' : '-'

  function handleShare() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText(result))}`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <div className="page result-page">
      <button className="logo logo-btn dim" onClick={onHome}>TICK</button>

      {result.isPersonalBest && (
        <div className="personal-best">★ PERSONAL BEST</div>
      )}

      <div className="result-grid">
        <div className="result-row">
          <span className="result-label">TARGET</span>
          <span className="result-value">{formatMs(result.targetMs)}</span>
          <span className="result-unit">sec</span>
        </div>
        <div className="result-row">
          <span className="result-label">YOURS</span>
          <span className="result-value" style={{ color }}>{formatMs(result.actualMs)}</span>
          <span className="result-unit">sec</span>
        </div>
        <div className="result-row">
          <span className="result-label">ERROR</span>
          <span className="result-value" style={{ color }}>
            {errorSign}{(result.errorMs / 1000).toFixed(4)}
          </span>
          <span className="result-unit">sec</span>
        </div>
      </div>

      <div className="rank-display">
        <div className="rank-number">
          {result.rank.toLocaleString()}位
          {!result.isPersonalBest && (
            <span className="rank-provisional">暫定</span>
          )}
        </div>
        <div className="rank-total">{result.total.toLocaleString()}人中</div>
        <div className="rank-percentile">
          {result.rank === 1
            ? '世界1位 🏆'
            : `上位 ${((result.rank / result.total) * 100).toFixed(1)}%`}
        </div>
      </div>

      <div className="title-badge">{result.title}</div>

      <div className="result-actions">
        <button className="btn-main btn-retry" onClick={onRetry}>
          もう一度
        </button>
        <button className="btn-share" onClick={handleShare}>
          𝕏 で共有
        </button>
        <button className="btn-text" onClick={onRanking}>
          ランキングを見る →
        </button>
      </div>
    </div>
  )
}
