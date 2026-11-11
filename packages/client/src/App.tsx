import { useGame } from './game/store'
import { useGameLoop } from './game/loop'
import { StartScreen } from './ui/StartScreen'
import { Toasts } from './ui/Toasts'
import { STAGE_LABELS, formatXu } from './ui/messages'

function Playing() {
  useGameLoop()
  const game = useGame(s => s.game)!
  return (
    <pre className="debug">
      {`${game.playerName} · ${formatXu(game.xu)} · Ngày ${game.day} · ${game.dayElapsedSec}s\n`}
      {game.plots.map(p => `Ô ${p.id} (${p.owner}): ${STAGE_LABELS[p.stage]}`).join('\n')}
    </pre>
  )
}

export function App() {
  const screen = useGame(s => s.screen)
  return (
    <>
      {screen === 'start' ? <StartScreen /> : <Playing />}
      <Toasts />
    </>
  )
}
