import type { Mode } from '../types'
import { MODE_LABELS } from '../types'
import { Hourglass } from '../components/Hourglass'

interface Props {
  mode: Mode
  onStop: () => void
  onHome: () => void
}

export function GamePage({ mode, onStop, onHome }: Props) {
  return (
    <div className="page game-page">
      <button className="logo logo-btn dim" onClick={onHome}>TICK</button>

      <div className="target-display small">
        <span className="target-number">{MODE_LABELS[mode]}</span>
        <span className="target-unit">.000</span>
        <span className="target-label">seconds</span>
      </div>

      <div className="hourglass-wrap">
        <Hourglass mode={mode} />
      </div>

      <button className="btn-main btn-stop" onClick={onStop}>
        STOP
      </button>
    </div>
  )
}
