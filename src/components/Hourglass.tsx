import type { Mode } from '../types'

const MODE_SIZE: Record<Mode, number> = {
  '3s': 100,
  '30s': 140,
  '300s': 200,
  '3600s': 260,
}

interface Props {
  mode: Mode
}

// Animation period deliberately does NOT match any mode duration (avoids being a time hint)
const ANIM_DURATION = '4.7s'

export function Hourglass({ mode }: Props) {
  const size = MODE_SIZE[mode]
  const w = size
  const h = size * 1.4

  // Key geometry (relative to 100×140 viewBox)
  const cx = 50
  const topY = 6
  const botY = 134
  const neckY = 70
  const spread = 40 // half-width at top/bottom

  const topLeft = `${cx - spread},${topY}`
  const topRight = `${cx + spread},${topY}`
  const botLeft = `${cx - spread},${botY}`
  const botRight = `${cx + spread},${botY}`
  const neckL = `${cx - 2},${neckY}`
  const neckR = `${cx + 2},${neckY}`

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 100 140"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Top triangle clip */}
        <clipPath id="hg-top">
          <polygon points={`${topLeft} ${topRight} ${neckR} ${neckL}`} />
        </clipPath>
        {/* Bottom triangle clip */}
        <clipPath id="hg-bot">
          <polygon points={`${neckL} ${neckR} ${botRight} ${botLeft}`} />
        </clipPath>
      </defs>

      {/* Glass frame */}
      <polygon
        points={`${topLeft} ${topRight} ${neckR} ${botRight} ${botLeft} ${neckL}`}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Top cap */}
      <line x1={cx - spread - 1} y1={topY} x2={cx + spread + 1} y2={topY}
        stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />
      {/* Bottom cap */}
      <line x1={cx - spread - 1} y1={botY} x2={cx + spread + 1} y2={botY}
        stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />

      {/* Top sand (draining) */}
      <g clipPath="url(#hg-top)">
        <rect x="0" y="0" width="100" height="140" fill="#c8953a">
          <animate
            attributeName="y"
            values={`${topY};${neckY};${topY}`}
            dur={ANIM_DURATION}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0 0 1 1"
          />
          <animate
            attributeName="height"
            values={`${neckY - topY};0;${neckY - topY}`}
            dur={ANIM_DURATION}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0 0 1 1"
          />
        </rect>
        {/* Shimmer */}
        <rect x="0" y="0" width="100" height="140" fill="rgba(255,220,120,0.15)" clipPath="url(#hg-top)" />
      </g>

      {/* Bottom sand (filling) */}
      <g clipPath="url(#hg-bot)">
        <rect x="0" y="0" width="100" height="140" fill="#c8953a">
          <animate
            attributeName="y"
            values={`${botY};${neckY};${botY}`}
            dur={ANIM_DURATION}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0 0 1 1"
          />
          <animate
            attributeName="height"
            values={`0;${botY - neckY};0`}
            dur={ANIM_DURATION}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.6 1; 0 0 1 1"
          />
        </rect>
      </g>

      {/* Falling sand stream */}
      <line x1={cx} y1={neckY - 1} x2={cx} y2={neckY + 8}
        stroke="#e8aa50" strokeWidth="1.5" strokeLinecap="round">
        <animate
          attributeName="opacity"
          values="0.9;0.9;0;0;0.9"
          dur={ANIM_DURATION}
          repeatCount="indefinite"
          keyTimes="0;0.75;0.82;0.88;1"
        />
      </line>
    </svg>
  )
}
