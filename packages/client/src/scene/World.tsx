import { Canvas } from '@react-three/fiber'
import { clockTime } from '@rice/core'
import { useGame } from '../game/store'
import { lightingAt } from './lighting'
import { Plot } from './Plot'
import { Village } from './Village'
import { Player } from './Player'
import { HeldTool } from './HeldTool'

function Scene() {
  const game = useGame(s => s.game)!
  const { hour, minute } = clockTime(game.dayElapsedSec)
  const light = lightingAt(hour + minute / 60)
  // mặt trời đi từ đông (6 giờ) sang tây (18 giờ)
  const angle = ((hour + minute / 60 - 6) / 12) * Math.PI
  const sunPos: [number, number, number] = [Math.cos(angle) * 60, Math.max(8, Math.sin(angle) * 60), -20]
  return (
    <>
      <color attach="background" args={[light.sky]} />
      <fog attach="fog" args={[light.sky, 60, 140]} />
      <ambientLight intensity={light.ambient} />
      <hemisphereLight args={['#ffffff', '#4a6b2a', light.ambient * 0.5]} />
      <directionalLight
        position={sunPos}
        intensity={light.sunIntensity * 2}
        color={light.sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
      />
      <Village windowGlow={light.windowGlow} />
      {game.plots.map(p => <Plot key={p.id} plot={p} />)}
    </>
  )
}

export function World() {
  return (
    <Canvas shadows camera={{ fov: 70, near: 0.05, far: 300 }}>
      <Scene />
      <Player />
      <HeldTool />
    </Canvas>
  )
}
