import { describe, it, expect } from 'vitest'
import { QUALITY_KEY, loadQuality, saveQuality, shouldDowngrade } from './quality'

const memory = (): Storage => {
  const data = new Map<string, string>()
  return {
    getItem: k => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v) },
    removeItem: k => { data.delete(k) },
    clear: () => data.clear(),
    key: () => null,
    get length() { return data.size },
  }
}

describe('quality', () => {
  it('mặc định Cao khi chưa lưu hoặc bị chặn bộ nhớ', () => {
    expect(loadQuality(memory())).toBe('high')
    expect(loadQuality(null)).toBe('high')
  })
  it('lưu rồi đọc lại', () => {
    const s = memory()
    saveQuality(s, 'low')
    expect(s.getItem(QUALITY_KEY)).toBe('low')
    expect(loadQuality(s)).toBe('low')
  })
  it('giá trị lạ → Cao', () => {
    const s = memory()
    s.setItem(QUALITY_KEY, 'ultra')
    expect(loadQuality(s)).toBe('high')
  })
  it('bộ nhớ ném lỗi không làm hỏng game', () => {
    const broken = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } } as unknown as Storage
    expect(loadQuality(broken)).toBe('high')
    expect(() => saveQuality(broken, 'low')).not.toThrow()
  })
})

describe('shouldDowngrade', () => {
  it('Cao mà fps trung vị dưới 30 → hạ xuống Thấp', () => {
    expect(shouldDowngrade('high', [22, 25, 24, 28, 26])).toBe(true)
  })
  it('đủ mượt thì giữ nguyên', () => {
    expect(shouldDowngrade('high', [55, 58, 60, 52, 57])).toBe(false)
  })
  it('một lần khựng (tải texture) không tính', () => {
    expect(shouldDowngrade('high', [8, 50, 55, 58, 60])).toBe(false)
  })
  it('chưa đủ 5 mẫu thì chưa quyết', () => {
    expect(shouldDowngrade('high', [10, 10])).toBe(false)
  })
  it('đã là Thấp thì không hạ nữa', () => {
    expect(shouldDowngrade('low', [10, 10, 10, 10, 10])).toBe(false)
  })
})
