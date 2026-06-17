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
  const sign = result.actualMs >= result.targetMs ? '+' : '-'
  const err = `${sign}${(result.errorMs / 1000).toFixed(4)}`
  const percentile = result.total > 1
    ? `上位${((result.rank / result.total) * 100).toFixed(1)}%`
    : '世界1位🏆'
  return `⏳ ${target}秒チャレンジ\n誤差 ${err}秒\n世界${result.rank.toLocaleString()}位 / ${result.total.toLocaleString()}人中（${percentile}）\n称号: ${result.title}\nあなたは何ms？ → ${window.location.origin}\n#TICK #体内時計`
}

function drawDivider(ctx: CanvasRenderingContext2D, y: number, W: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(80, y)
  ctx.lineTo(W - 80, y)
  ctx.stroke()
}

async function generateScoreCard(result: GameResult): Promise<Blob> {
  await document.fonts.ready

  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const SURFACE = '#0f0f1a'
  const ACCENT = '#c8953a'
  const TEXT = '#ffffff'
  const DIM = 'rgba(255,255,255,0.45)'
  const BORDER = 'rgba(255,255,255,0.08)'
  const MONO = "'JetBrains Mono', monospace"

  // 背景
  ctx.fillStyle = '#080810'
  ctx.fillRect(0, 0, W, H)

  // 外枠
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.strokeRect(48, 48, W - 96, H - 96)

  ctx.textAlign = 'center'
  // y は常にテキスト上端を指す。CJK文字はラテン文字より上下に大きく
  // 広がるため、ベースライン基準だと間隔がズレやすい → top基準に統一する
  ctx.textBaseline = 'top'

  let y = 96

  // TICK ロゴ
  ctx.fillStyle = TEXT
  ctx.font = `700 72px ${MONO}`
  ctx.fillText('TICK', W / 2, y)
  y += 90

  // モードラベル
  ctx.fillStyle = DIM
  ctx.font = `300 26px ${MONO}`
  ctx.fillText(`${(result.targetMs / 1000).toFixed(3)} second challenge`, W / 2, y)
  y += 56

  drawDivider(ctx, y, W)
  y += 50

  // スコアグリッド
  const color = errorColor(result.errorMs)
  const sign = result.actualMs >= result.targetMs ? '+' : '-'
  const rows = [
    { label: 'TARGET', value: formatMs(result.targetMs), color: TEXT },
    { label: 'YOURS',  value: formatMs(result.actualMs), color },
    { label: 'ERROR',  value: `${sign}${(result.errorMs / 1000).toFixed(4)}`, color },
  ]
  const valueFontSize = 56

  rows.forEach((row) => {
    const labelOffset = (valueFontSize - 22) / 2

    ctx.textAlign = 'left'
    ctx.fillStyle = DIM
    ctx.font = `400 22px ${MONO}`
    ctx.fillText(row.label, 100, y + labelOffset)

    ctx.textAlign = 'right'
    ctx.fillStyle = row.color
    ctx.font = `700 ${valueFontSize}px ${MONO}`
    ctx.fillText(row.value, W - 160, y)

    ctx.textAlign = 'left'
    ctx.fillStyle = DIM
    ctx.font = `300 22px ${MONO}`
    ctx.fillText('sec', W - 140, y + labelOffset)

    y += 78
  })
  ctx.textAlign = 'center'

  drawDivider(ctx, y, W)
  y += 55

  // PB バッジ
  if (result.isPersonalBest) {
    const badgeH = 50
    ctx.strokeStyle = ACCENT
    ctx.fillStyle = 'rgba(200,149,58,0.1)'
    ctx.lineWidth = 1
    roundRect(ctx, W / 2 - 150, y, 300, badgeH, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = ACCENT
    ctx.font = `400 22px ${MONO}`
    ctx.fillText('★ PERSONAL BEST', W / 2, y + (badgeH - 22) / 2)
    y += badgeH + 40
  }

  // 順位（CJK文字のため十分な余白を確保）
  ctx.fillStyle = TEXT
  ctx.font = `700 110px ${MONO}`
  ctx.fillText(`${result.rank.toLocaleString()}位`, W / 2, y)
  y += 140

  // 何人中
  ctx.fillStyle = DIM
  ctx.font = `300 28px ${MONO}`
  ctx.fillText(`${result.total.toLocaleString()}人中`, W / 2, y)
  y += 70

  // 称号バッジ
  const titleBadgeH = 64
  ctx.fillStyle = SURFACE
  ctx.strokeStyle = BORDER
  ctx.lineWidth = 1
  roundRect(ctx, W / 2 - 220, y, 440, titleBadgeH, 32)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = TEXT
  ctx.font = `400 28px ${MONO}`
  ctx.fillText(result.title, W / 2, y + (titleBadgeH - 28) / 2 - 2)

  // URL（下端に固定）
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = `300 22px ${MONO}`
  ctx.fillText(window.location.hostname, W / 2, H - 90)

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'))
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

export function ResultPage({ result, onRetry, onRanking, onHome }: Props) {
  const color = errorColor(result.errorMs)
  const errorSign = result.actualMs >= result.targetMs ? '+' : '-'

  function handleShare() {
    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText(result))}`
    window.open(url, '_blank', 'noopener')
  }

  async function handleScoreCard() {
    const blob = await generateScoreCard(result)
    const file = new File([blob], 'tick-score.png', { type: 'image/png' })

    // モバイルは Web Share API で画像+テキストを一緒にシェア
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: shareText(result) })
      return
    }

    // デスクトップは画像をダウンロード → X を開く
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tick-score.png'
    a.click()
    URL.revokeObjectURL(url)
    setTimeout(() => {
      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText(result))}`, '_blank', 'noopener')
    }, 300)
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
        <button className="btn-share btn-scorecard" onClick={handleScoreCard}>
          📷 スコアカードを保存 / シェア
        </button>
        <button className="btn-share" onClick={handleShare}>
          𝕏 で共有（テキストのみ）
        </button>
        <button className="btn-text" onClick={onRanking}>
          ランキングを見る →
        </button>
      </div>
    </div>
  )
}
