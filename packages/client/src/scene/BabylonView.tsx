import { useEffect, useRef } from 'react'
import { useGame } from '../game/store'
import { GameScene } from './GameScene'

/** Khung canvas Babylon.js; dựng lại cảnh khi đổi chất lượng đồ họa. */
export function BabylonView() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const quality = useGame(s => s.quality)
  useEffect(() => {
    if (!canvas.current) return
    const scene = new GameScene(canvas.current, quality)
    return () => scene.dispose()
  }, [quality])
  return <canvas ref={canvas} className="game-canvas" />
}
