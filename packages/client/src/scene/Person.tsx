import type { ReactNode } from 'react'

interface Props {
  position: [number, number, number]
  shirt?: string
  rotationY?: number
  lean?: number
  children?: ReactNode
}

/** Người khối đơn giản đội nón lá – dùng cho Địa chủ và người làm thuê. */
export function Person({ position, shirt = '#3b6fb6', rotationY = 0, lean = 0, children }: Props) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group rotation={[lean, 0, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.9, 8]} />
          <meshStandardMaterial color="#2e2a26" />
        </mesh>
        <mesh position={[0, 1.15, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.6, 10]} />
          <meshStandardMaterial color={shirt} />
        </mesh>
        <mesh position={[0, 1.6, 0]} castShadow>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshStandardMaterial color="#e2b48c" />
        </mesh>
        {/* nón lá */}
        <mesh position={[0, 1.78, 0]} castShadow>
          <coneGeometry args={[0.38, 0.28, 16]} />
          <meshStandardMaterial color="#e8d9a8" />
        </mesh>
        {children}
      </group>
    </group>
  )
}
