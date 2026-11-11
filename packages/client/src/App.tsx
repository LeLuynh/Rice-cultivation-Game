import { useEffect, useState } from 'react'
import { useGame } from './game/store'
import { useGameLoop } from './game/loop'
import { StartScreen } from './ui/StartScreen'
import { Toasts } from './ui/Toasts'
import { World } from './scene/World'
import { Hud } from './ui/Hud'
import { Tutorial } from './ui/Tutorial'
import { Inventory, JobBoard, PlotBoard } from './ui/Boards'
import { LandlordHouse } from './ui/LandlordHouse'
import { DaySummary, PauseMenu } from './ui/Menus'
import { useHotkeys } from './ui/hotkeys'

function Panels() {
  const panel = useGame(s => s.panel)
  const tutorialSeen = useGame(s => s.game?.tutorialSeen)
  const { setPanel, dispatch } = useGame.getState()
  const closeTutorial = (): void => {
    if (!tutorialSeen) dispatch({ type: 'markTutorialSeen' })
    setPanel(null)
  }
  switch (panel) {
    case 'tutorial': return <Tutorial onClose={closeTutorial} />
    case 'plots': return <PlotBoard />
    case 'jobs': return <JobBoard />
    case 'inventory': return <Inventory />
    case 'landlord': return <LandlordHouse />
    case 'pause': return <PauseMenu />
    case 'daySummary': return <DaySummary />
    default: return null
  }
}

function Playing() {
  useGameLoop()
  useHotkeys()
  const nearHouse = useGame(s => s.nearHouse)
  const panel = useGame(s => s.panel)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const onChange = (): void => setLocked(document.pointerLockElement !== null)
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  // lần đầu chơi: tự mở hướng dẫn
  useEffect(() => {
    const { game, panel: current, setPanel } = useGame.getState()
    if (game && !game.tutorialSeen && current === null) setPanel('tutorial')
  }, [])

  return (
    <>
      <World />
      <Hud nearHouse={nearHouse && panel === null} />
      {panel === null && !locked && <div className="click-hint">Bấm vào khung game để điều khiển</div>}
      <Panels />
    </>
  )
}

export function App() {
  const screen = useGame(s => s.screen)
  const [guide, setGuide] = useState(false)
  return (
    <>
      {screen === 'start' ? <StartScreen onOpenGuide={() => setGuide(true)} /> : <Playing />}
      {screen === 'start' && guide && <Tutorial onClose={() => setGuide(false)} />}
      <Toasts />
    </>
  )
}
