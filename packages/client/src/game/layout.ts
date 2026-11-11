import { CONFIG } from '@rice/core'

// Đơn vị mét, trục Y hướng lên. Nhà Địa chủ ở phía bắc (z âm); ô 1 ở hàng gần nhà nhất.
export const PLOT_SIZE = 8
export const BUND_WIDTH = 1
export const EYE_HEIGHT = 1.6
const PITCH = PLOT_SIZE + BUND_WIDTH
const COLS = 4
const ROWS = CONFIG.plotCount / COLS

type Box = { min: [number, number]; max: [number, number] }

export const HOUSE_BOX: Box = { min: [-6, -38], max: [6, -28] }
export const HOUSE_DOOR: [number, number] = [0, -26]
export const HOUSE_INTERACT_RADIUS = 4
export const WORLD_BOUNDS: Box = { min: [-40, -50], max: [40, 36] }
/** Kênh nước chạy dọc cạnh đông cánh đồng. */
export const CANAL = { x: 21, width: 3, zMin: -24, zMax: 26 }

/** Tâm ô (x, z): lưới 4 cột × 5 hàng. */
export function plotCenter(plotId: number): [number, number] {
  const index = plotId - 1
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return [(col - (COLS - 1) / 2) * PITCH, (row - (ROWS - 1) / 2) * PITCH]
}

/** Ô chứa điểm (x, z), hoặc null nếu điểm nằm trên bờ ruộng / ngoài cánh đồng. */
export function plotIdAt(x: number, z: number): number | null {
  const col = Math.round(x / PITCH + (COLS - 1) / 2)
  const row = Math.round(z / PITCH + (ROWS - 1) / 2)
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null
  const id = row * COLS + col + 1
  const [cx, cz] = plotCenter(id)
  const half = PLOT_SIZE / 2
  return Math.abs(x - cx) < half && Math.abs(z - cz) < half ? id : null
}

/** Chỗ đứng khi dịch chuyển tới ô: giữa bờ ruộng phía nam ô, nhìn về tâm ô (yaw 0 = nhìn về −z). */
export function teleportPose(plotId: number): { position: [number, number, number]; yaw: number } {
  const [cx, cz] = plotCenter(plotId)
  return { position: [cx, EYE_HEIGHT, cz + PLOT_SIZE / 2 + BUND_WIDTH / 2], yaw: 0 }
}
