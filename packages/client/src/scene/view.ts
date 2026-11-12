import type { Stage } from '@rice/core'
import { PLOT_SIZE } from '../game/layout'

export type Vec3 = [number, number, number]

const MAX_PITCH = 1.45

/** Hướng nhìn từ góc quay ngang (yaw, 0 = nhìn về −z) và góc cúi (pitch, âm = nhìn xuống). */
export function lookDirection(yaw: number, pitch: number): Vec3 {
  const c = Math.cos(pitch)
  return [-Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c]
}

export function clampPitch(pitch: number): number {
  return Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch))
}

const MOON: Vec3 = (() => {
  const v: Vec3 = [0.25, -0.92, 0.3]
  const len = Math.hypot(...v)
  return [v[0] / len, v[1] / len, v[2] / len]
})()

/** Hướng tia nắng (từ mặt trời xuống đất): mọc ở đông (x+) lúc 6 giờ, lặn ở tây lúc 18 giờ; tối là trăng trên cao. */
export function sunDirection(hour: number): Vec3 {
  if (hour > 18.5) return MOON
  const angle = ((Math.min(Math.max(hour, 6), 18) - 6) / 12) * Math.PI
  const pos: Vec3 = [Math.cos(angle), Math.max(0.15, Math.sin(angle)), 0.35]
  const len = Math.hypot(...pos)
  return [-pos[0] / len, -pos[1] / len, -pos[2] / len]
}

export interface Clump { x: number; z: number; scale: number; rotation: number; y?: number }

/** Chiều cao (m) của cụm lúa theo giai đoạn; giai đoạn không có cây thì không có trong bảng. */
export const RICE_HEIGHT: Partial<Record<Stage, number>> = {
  seedling: 0.12,
  seedlingReady: 0.22,
  young: 0.4,
  green: 0.8,
  flowering: 1.0,
  ripe: 1.0,
}

// nhiễu cố định theo chỉ số, để cây không đổi chỗ mỗi lần dựng lại
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Vị trí cụm lúa trên ô theo giai đoạn: lưới n×n có lệch nhẹ; giai đoạn "đã bó" là 6 bó nằm. */
export function riceClumps(stage: Stage, center: [number, number], perSide: number): Clump[] {
  if (stage === 'bundled') {
    return Array.from({ length: 6 }, (_, i) => ({
      x: center[0] - 2.5 + (i % 3) * 2.5,
      z: center[1] - 1.5 + Math.floor(i / 3) * 3,
      scale: 1,
      rotation: hash(i) * Math.PI,
    }))
  }
  const height = RICE_HEIGHT[stage]
  if (height === undefined) return []
  const step = PLOT_SIZE / perSide
  const clumps: Clump[] = []
  for (let r = 0; r < perSide; r++) {
    for (let c = 0; c < perSide; c++) {
      const i = r * perSide + c
      clumps.push({
        x: center[0] - PLOT_SIZE / 2 + step * (c + 0.5 + (hash(i) - 0.5) * 0.4),
        z: center[1] - PLOT_SIZE / 2 + step * (r + 0.5 + (hash(i + 99) - 0.5) * 0.4),
        scale: height * (0.85 + 0.3 * hash(i + 7)),
        rotation: hash(i + 3) * Math.PI * 2,
      })
    }
  }
  return clumps
}
