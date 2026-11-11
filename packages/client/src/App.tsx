import { useGame } from './game/store'
import { useGameLoop } from './game/loop'
import { StartScreen } from './ui/StartScreen'
import { Toasts } from './ui/Toasts'
import { World } from './scene/World'

function Playing() {
  useGameLoop()
  return <World />
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
