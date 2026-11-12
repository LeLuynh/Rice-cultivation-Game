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
