import { useState, useEffect, useRef } from 'react'
import type { GameResult, Mode } from './types'
import { getGuestToken, getDisplayName, lockName } from './lib/token'
import { startGame, stopGame, fetchRanking } from './lib/api'
import { HomePage } from './pages/HomePage'
import { GamePage } from './pages/GamePage'
import { ResultPage } from './pages/ResultPage'
import { RankingPage } from './pages/RankingPage'
import './index.css'

type Screen = 'home' | 'game' | 'result' | 'ranking'

export function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<Mode>('3s')
  const [result, setResult] = useState<GameResult | null>(null)
  const [totalPlays, setTotalPlays] = useState(0)
  const [error, setError] = useState('')
  const sessionIdRef = useRef<string>('')

  useEffect(() => {
    fetchRanking('3s', 'today')
      .then(({ total }) => setTotalPlays(total))
      .catch(() => {})
  }, [])

  function goHome() {
    setResult(null)
    setError('')
    setScreen('home')
  }

  async function handleStart(selectedMode: Mode) {
    setError('')
    setMode(selectedMode)
    try {
      const token = getGuestToken()
      const name = getDisplayName()
      const sessionId = await startGame(selectedMode, token, name)
      sessionIdRef.current = sessionId
      lockName()
      setScreen('game')
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'name_rejected') {
        setError('その名前は使用できません。別の名前を入力してください。')
      } else {
        setError(msg || 'エラーが発生しました')
      }
    }
  }

  async function handleStop() {
    try {
      const token = getGuestToken()
      const gameResult = await stopGame(sessionIdRef.current, token)
      setResult(gameResult)
      setScreen('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
      setScreen('home')
    }
  }

  return (
    <div className="app">
      {error && (
        <div className="error-banner" onClick={() => setError('')}>
          {error} (tap to dismiss)
        </div>
      )}
      {screen === 'home' && (
        <HomePage onStart={handleStart} totalPlays={totalPlays} onHome={goHome} onRanking={() => setScreen('ranking')} />
      )}
      {screen === 'game' && (
        <GamePage mode={mode} onStop={handleStop} onHome={goHome} />
      )}
      {screen === 'result' && result && (
        <ResultPage
          result={result}
          onRetry={goHome}
          onRanking={() => setScreen('ranking')}
          onHome={goHome}
        />
      )}
      {screen === 'ranking' && (
        <RankingPage onBack={() => setScreen(result ? 'result' : 'home')} currentMode={mode} onHome={goHome} />
      )}
    </div>
  )
}

export default App
