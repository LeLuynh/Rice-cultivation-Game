import { describe, it, expect } from 'vitest'
import { lightingAt } from './lighting'

describe('lightingAt', () => {
  it('đêm vẫn đủ sáng để làm việc (trăng + trời)', () => {
    expect(lightingAt(21).ambient).toBeGreaterThanOrEqual(0.3)
    expect(lightingAt(21).sunIntensity).toBeGreaterThanOrEqual(0.3)
  })

  it('trưa sáng hơn tối', () => {
    expect(lightingAt(12).sunIntensity).toBeGreaterThan(lightingAt(21).sunIntensity)
    expect(lightingAt(12).ambient).toBeGreaterThan(lightingAt(21).ambient)
  })

  it('cửa sổ chỉ sáng đèn buổi tối', () => {
    expect(lightingAt(21).windowGlow).toBeGreaterThan(0)
    expect(lightingAt(10).windowGlow).toBe(0)
  })

  it('hoàng hôn 18 giờ có màu nắng cam khác giữa trưa', () => {
    expect(lightingAt(18).sunColor).not.toBe(lightingAt(12).sunColor)
  })

  it('màu là chuỗi hex hợp lệ ở mọi giờ, kể cả ngoài khoảng 6–22', () => {
    for (const h of [5, 6, 7.3, 12, 17.5, 19, 22, 23]) {
      expect(lightingAt(h).sky).toMatch(/^#[0-9a-f]{6}$/)
      expect(lightingAt(h).sunColor).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})
