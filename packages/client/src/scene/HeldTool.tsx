import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { ToolId } from '@rice/core'
import { useGame } from '../game/store'

const OFFSET = new THREE.Vector3(0.38, -0.32, -0.65)

function ToolModel({ tool }: { tool: ToolId }) {
  switch (tool) {
    case 'hoe':
      return (
        <group rotation={[0.3, 0, -0.2]}>
          <mesh><cylinderGeometry args={[0.025, 0.025, 0.7, 6]} /><meshStandardMaterial color="#8a6a45" /></mesh>
          <mesh position={[0, 0.35, 0.08]}><boxGeometry args={[0.16, 0.05, 0.2]} /><meshStandardMaterial color="#8d9399" /></mesh>
        </group>
      )
    case 'seedBasket':
      return (
        <group>
          <mesh><cylinderGeometry args={[0.16, 0.12, 0.1, 12]} /><meshStandardMaterial color="#c8a46a" /></mesh>
          <mesh position={[0, 0.09, 0]}><coneGeometry args={[0.13, 0.12, 8]} /><meshStandardMaterial color="#7cc35a" /></mesh>
        </group>
      )
    case 'waterScoop':
      return (
        <group rotation={[0.2, 0, 0]}>
          <mesh rotation={[Math.PI, 0, 0]}><sphereGeometry args={[0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#6b4a2b" side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, 0.02, 0.25]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 0.4, 6]} /><meshStandardMaterial color="#8a6a45" /></mesh>
        </group>
      )
    case 'fertilizerBag':
      return <mesh><boxGeometry args={[0.24, 0.3, 0.14]} /><meshStandardMaterial color="#f2f2ee" /></mesh>
    case 'sickle':
      return (
        <group rotation={[0, 0, -0.4]}>
          <mesh position={[0, -0.12, 0]}><cylinderGeometry args={[0.025, 0.025, 0.22, 6]} /><meshStandardMaterial color="#8a6a45" /></mesh>
          <mesh position={[0.08, 0.06, 0]}><torusGeometry args={[0.12, 0.015, 6, 16, Math.PI]} /><meshStandardMaterial color="#b9bec4" /></mesh>
        </group>
      )
    case 'hands':
      return <mesh><boxGeometry args={[0.1, 0.1, 0.22]} /><meshStandardMaterial color="#e2b48c" /></mesh>
  }
}

/** Tay cầm công cụ ở góc phải dưới tầm nhìn; lắc nhẹ khi đang làm việc. */
export function HeldTool() {
  const group = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const tool = useGame(s => s.selectedTool)
  const offset = useRef(new THREE.Vector3())

  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    const acting = useGame.getState().actionProgress !== null
    offset.current.copy(OFFSET)
    if (acting) offset.current.y += Math.sin(clock.elapsedTime * 14) * 0.04
    g.position.copy(camera.position).add(offset.current.applyQuaternion(camera.quaternion))
    g.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={group}>
      {/* cánh tay */}
      <mesh position={[0.05, -0.12, 0.2]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.09, 0.09, 0.4]} />
        <meshStandardMaterial color="#e2b48c" />
      </mesh>
      <ToolModel tool={tool} />
    </group>
  )
}
