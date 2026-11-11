import { memo, useMemo } from 'react'
import { Text } from '@react-three/drei'
import type { PlotState } from '@rice/core'
import { PLOT_SIZE, plotCenter } from '../game/layout'
import { RiceField } from './RiceField'

const SOIL: Record<string, string> = { dry: '#a8875a', plowed: '#5b4632' }
const MUD = '#4a3b2a'
const GROUND_TOP = 0.1

// Vị trí cố định (tương đối tâm ô) của chấm cỏ và sâu.
const WEED_SPOTS: [number, number][] = [[-2.6, -1.8], [1.9, -2.7], [-0.8, 2.4], [2.8, 1.2], [-3.1, 0.6], [0.4, -0.5]]
const PEST_SPOTS: [number, number][] = [[-1.7, -0.9], [2.3, -1.1], [0.9, 1.9], [-2.4, 2.8], [1.2, -3.0]]

function Dots({ spots, center, color, y, size }: {
  spots: [number, number][]; center: [number, number]; color: string; y: number; size: number
}) {
  return (
    <>
      {spots.map(([dx, dz], i) => (
        <mesh key={i} position={[center[0] + dx, y, center[1] + dz]}>
          <sphereGeometry args={[size, 8, 6]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
    </>
  )
}

function SaleSign({ center }: { center: [number, number] }) {
  const [x, z] = center
  return (
    <group position={[x, 0, z + PLOT_SIZE / 2 - 0.6]}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.5, 6]} />
        <meshStandardMaterial color="#6b4a2b" />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[1.2, 0.6, 0.06]} />
        <meshStandardMaterial color="#f4ead2" />
      </mesh>
      <Text position={[0, 1.45, 0.04]} fontSize={0.36} color="#b3261e" anchorX="center" anchorY="middle">
        BÁN
      </Text>
    </group>
  )
}

/** Một ô ruộng: mặt đất theo giai đoạn, nước, cỏ, sâu, cây lúa, biển bán (spec 7). */
export const Plot = memo(function Plot({ plot }: { plot: PlotState }) {
  const center = useMemo(() => plotCenter(plot.id), [plot.id])
  const waterHeight = 0.02 + (0.15 * plot.water) / 100
  return (
    <group>
      <mesh position={[center[0], GROUND_TOP / 2, center[1]]} receiveShadow userData={{ plotId: plot.id }}>
        <boxGeometry args={[PLOT_SIZE, GROUND_TOP, PLOT_SIZE]} />
        <meshStandardMaterial color={SOIL[plot.stage] ?? MUD} />
      </mesh>
      {plot.water > 0 && (
        <mesh position={[center[0], GROUND_TOP + waterHeight / 2, center[1]]} raycast={() => null}>
          <boxGeometry args={[PLOT_SIZE - 0.05, waterHeight, PLOT_SIZE - 0.05]} />
          <meshStandardMaterial color="#4f9fd1" transparent opacity={0.45} />
        </mesh>
      )}
      <RiceField stage={plot.stage} center={center} />
      {plot.hasWeeds && <Dots spots={WEED_SPOTS} center={center} color="#1f5e1f" y={0.35} size={0.22} />}
      {plot.hasPests && <Dots spots={PEST_SPOTS} center={center} color="#e0552b" y={0.6} size={0.12} />}
      {plot.owner === 'forSale' && <SaleSign center={center} />}
    </group>
  )
})
