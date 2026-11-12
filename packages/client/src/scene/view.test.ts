import { describe, it, expect } from 'vitest'
import { clampPitch, lookDirection, riceClumps, sunDirection } from './view'
import { PLOT_SIZE, plotCenter } from '../game/layout'

describe('lookDirection', () => {
  it('yaw 0, pitch 0 nhìn về −z', () => {
    const [x, y, z] = lookDirection(0, 0)
    expect(x).toBeCloseTo(0); expect(y).toBeCloseTo(0); expect(z).toBeCloseTo(-1)
  })
  it('pitch âm nhìn xuống', () => {
    expect(lookDirection(0, -0.5)[1]).toBeLessThan(0)
  })
  it('yaw π nhìn về +z', () => {
    expect(lookDirection(Math.PI, 0)[2]).toBeCloseTo(1)
  })
})

describe('clampPitch', () => {
  it('không cho ngửa / cúi quá thẳng đứng', () => {
    expect(clampPitch(3)).toBeLessThan(Math.PI / 2)
    expect(clampPitch(-3)).toBeGreaterThan(-Math.PI / 2)
    expect(clampPitch(0.3)).toBe(0.3)
  })
})

describe('sunDirection', () => {
  it('ánh nắng luôn chiếu xuống', () => {
    for (const h of [6, 9, 12, 15, 18, 21]) expect(sunDirection(h)[1]).toBeLessThan(0)
  })
  it('sáng nắng từ đông (x+) chiếu sang tây, chiều ngược lại', () => {
    expect(sunDirection(8)[0]).toBeLessThan(0)
    expect(sunDirection(16)[0]).toBeGreaterThan(0)
  })
  it('vector đơn vị', () => {
    const [x, y, z] = sunDirection(10)
    expect(Math.hypot(x, y, z)).toBeCloseTo(1)
  })
})

describe('riceClumps', () => {
  const center = plotCenter(6)
  it('ruộng khô / đã cày không có cây', () => {
    expect(riceClumps('dry', center, 12)).toHaveLength(0)
    expect(riceClumps('plowed', center, 12)).toHaveLength(0)
  })
  it('lúa xanh: đủ n×n cụm, nằm trong ô', () => {
    const clumps = riceClumps('green', center, 12)
    expect(clumps).toHaveLength(144)
    for (const c of clumps) {
      expect(Math.abs(c.x - center[0])).toBeLessThan(PLOT_SIZE / 2)
      expect(Math.abs(c.z - center[1])).toBeLessThan(PLOT_SIZE / 2)
    }
  })
  it('cố định theo vị trí (gọi lại ra cùng kết quả) và có lệch tự nhiên', () => {
    const a = riceClumps('ripe', center, 12)
    expect(riceClumps('ripe', center, 12)).toEqual(a)
    expect(new Set(a.map(c => c.scale.toFixed(3))).size).toBeGreaterThan(3)
  })
  it('lúa chín cao hơn mạ', () => {
    const avg = (s: Parameters<typeof riceClumps>[0]): number => {
      const c = riceClumps(s, center, 12)
      return c.reduce((t, v) => t + v.scale, 0) / c.length
    }
    expect(avg('ripe')).toBeGreaterThan(avg('seedling'))
  })
  it('đã bó: vài bó lúa nằm trên ô', () => {
    const b = riceClumps('bundled', center, 12)
    expect(b.length).toBeGreaterThan(0)
    expect(b.length).toBeLessThan(12)
  })
})
