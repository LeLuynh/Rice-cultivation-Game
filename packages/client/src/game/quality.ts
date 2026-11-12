import type { StorageLike } from './save'

export type Quality = 'high' | 'low'
export const QUALITY_KEY = 'rice-quality'

/** Chất lượng đồ họa đã chọn (spec 11); mặc định Cao, không bao giờ ném lỗi. */
export function loadQuality(storage: StorageLike | null): Quality {
  try {
    return storage?.getItem(QUALITY_KEY) === 'low' ? 'low' : 'high'
  } catch {
    return 'high'
  }
}

export function saveQuality(storage: StorageLike | null, q: Quality): void {
  try {
    storage?.setItem(QUALITY_KEY, q)
  } catch {
    // bộ nhớ bị chặn: chỉ mất lựa chọn, game vẫn chạy
  }
}

/** Số mẫu fps (mỗi giây một mẫu) cần có trước khi quyết định hạ chất lượng. */
export const FPS_SAMPLES = 5
const MIN_SMOOTH_FPS = 30

/** Máy không theo kịp mức Cao: fps trung vị của các mẫu gần nhất dưới 30 (một lần khựng không tính). */
export function shouldDowngrade(quality: Quality, fpsSamples: number[]): boolean {
  if (quality !== 'high' || fpsSamples.length < FPS_SAMPLES) return false
  const sorted = [...fpsSamples.slice(-FPS_SAMPLES)].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)] < MIN_SMOOTH_FPS
}
