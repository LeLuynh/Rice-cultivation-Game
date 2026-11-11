import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Stage } from '@rice/core'
import { PLOT_SIZE } from '../game/layout'

/** Số cụm lúa mỗi cạnh ô (8×8 = 64 cụm). */
export const CLUMPS_PER_SIDE = 8
const COUNT = CLUMPS_PER_SIDE * CLUMPS_PER_SIDE

const LOOK: Partial<Record<Stage, { height: number; color: string }>> = {
  seedling: { height: 0.1, color: '#9ed36a' },
  seedlingReady: { height: 0.18, color: '#8fcb5c' },
  young: { height: 0.3, color: '#6dbb48' },
  green: { height: 0.7, color: '#3f9b3a' },
  flowering: { height: 0.9, color: '#8fae3c' },
  ripe: { height: 0.9, color: '#e2b53c' },
}

const clumpGeometry = new THREE.ConeGeometry(0.16, 1, 5)
clumpGeometry.translate(0, 0.5, 0)
const bundleGeometry = new THREE.CylinderGeometry(0.18, 0.22, 1, 8)
bundleGeometry.rotateZ(Math.PI / 2)

/** Cây lúa của một ô, vẽ bằng một InstancedMesh (spec 7). */
export function RiceField({ stage, center }: { stage: Stage; center: [number, number] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const look = LOOK[stage]
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: look?.color ?? '#d9b45a' }), [look?.color])

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const step = PLOT_SIZE / CLUMPS_PER_SIDE
    let i = 0
    if (stage === 'bundled') {
      for (; i < 6; i++) {
        const x = center[0] - 2.5 + (i % 3) * 2.5
        const z = center[1] - 1.5 + Math.floor(i / 3) * 3
        m.compose(new THREE.Vector3(x, 0.32, z), q, new THREE.Vector3(1, 1, 1))
        mesh.setMatrixAt(i, m)
      }
    } else if (look) {
      for (let r = 0; r < CLUMPS_PER_SIDE; r++) {
        for (let c = 0; c < CLUMPS_PER_SIDE; c++, i++) {
          const x = center[0] - PLOT_SIZE / 2 + step * (c + 0.5)
          const z = center[1] - PLOT_SIZE / 2 + step * (r + 0.5)
          // lệch nhẹ chiều cao cho tự nhiên, cố định theo vị trí
          const h = look.height * (0.85 + 0.3 * (((r * 7 + c * 13) % 10) / 10))
          m.compose(new THREE.Vector3(x, 0.1, z), q, new THREE.Vector3(1, h, 1))
          mesh.setMatrixAt(i, m)
        }
      }
    }
    mesh.count = i
    mesh.instanceMatrix.needsUpdate = true
  }, [stage, center, look])

  if (!look && stage !== 'bundled') return null
  return (
    <instancedMesh
      ref={ref}
      args={[stage === 'bundled' ? bundleGeometry : clumpGeometry, material, COUNT]}
      castShadow
    />
  )
}
