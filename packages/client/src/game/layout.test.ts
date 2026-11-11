import { describe, it, expect } from 'vitest'
import { CONFIG } from '@rice/core'
import { HOUSE_BOX, PLOT_SIZE, WORLD_BOUNDS, plotCenter, plotIdAt, teleportPose } from './layout'

const ids = Array.from({ length: CONFIG.plotCount }, (_, i) => i + 1)
const inBox = (x: number, z: number, b: { min: [number, number]; max: [number, number] }): boolean =>
  x >= b.min[0] && x <= b.max[0] && z >= b.min[1] && z <= b.max[1]

describe('layout', () => {
  it('20 tâm ô khác nhau, không chồng nhau', () => {
    for (const a of ids) {
      for (const b of ids) {
        if (a >= b) continue
        const [ax, az] = plotCenter(a)
        const [bx, bz] = plotCenter(b)
        expect(Math.max(Math.abs(ax - bx), Math.abs(az - bz))).toBeGreaterThanOrEqual(PLOT_SIZE)
      }
    }
  })

  it('plotIdAt(tâm ô n) === n với mọi n; ngoài ruộng → null', () => {
    for (const id of ids) {
      const [x, z] = plotCenter(id)
      expect(plotIdAt(x, z)).toBe(id)
      expect(plotIdAt(x + PLOT_SIZE / 2 - 0.1, z - PLOT_SIZE / 2 + 0.1)).toBe(id)
    }
    expect(plotIdAt(1000, 1000)).toBeNull()
    const [x1, z1] = plotCenter(1)
    expect(plotIdAt(x1 + PLOT_SIZE / 2 + 0.5, z1)).toBeNull() // trên bờ ruộng
  })

  it('ô 1 ở góc thuộc hàng gần nhà nhất', () => {
    const houseZ = (HOUSE_BOX.min[1] + HOUSE_BOX.max[1]) / 2
    const rowDist = (id: number): number => Math.abs(plotCenter(id)[1] - houseZ)
    for (const id of ids) expect(rowDist(1)).toBeLessThanOrEqual(rowDist(id))
    const xs = ids.map(id => plotCenter(id)[0])
    expect(plotCenter(1)[0]).toBe(Math.min(...xs))
  })

  it('teleportPose nằm ngoài ô, trong WORLD_BOUNDS, ngoài HOUSE_BOX, mắt cao 1.6 m', () => {
    for (const id of ids) {
      const { position: [x, y, z] } = teleportPose(id)
      expect(plotIdAt(x, z)).toBeNull()
      expect(inBox(x, z, WORLD_BOUNDS)).toBe(true)
      expect(inBox(x, z, HOUSE_BOX)).toBe(false)
      expect(y).toBe(1.6)
    }
  })

  it('teleportPose nhìn về tâm ô', () => {
    for (const id of ids) {
      const { position: [x, , z], yaw } = teleportPose(id)
      const [cx, cz] = plotCenter(id)
      // hướng nhìn của camera three.js với yaw: (-sin yaw, -cos yaw)
      const dx = -Math.sin(yaw)
      const dz = -Math.cos(yaw)
      const len = Math.hypot(cx - x, cz - z)
      expect(dx * (cx - x) / len + dz * (cz - z) / len).toBeCloseTo(1, 5)
    }
  })
})
