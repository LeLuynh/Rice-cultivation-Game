import { describe, it, expect } from 'vitest'
import { freshPlot, type PlotState } from '@rice/core'
import { INTERACT_DISTANCE, actionDurationSec, actionHint, moveWithCollision, taskForTool } from './interaction'
import { HOUSE_BOX, WORLD_BOUNDS } from './layout'

const plot = (patch: Partial<PlotState>, owner: PlotState['owner'] = 'landlord'): PlotState =>
  ({ ...freshPlot(1, owner), ...patch })

describe('taskForTool', () => {
  it('dry + hoe → plow; dry + sickle → null', () => {
    expect(taskForTool(plot({ stage: 'dry' }), 'hoe')).toBe('plow')
    expect(taskForTool(plot({ stage: 'dry' }), 'sickle')).toBeNull()
  })

  it('ô Địa chủ young water 50 + waterScoop → null; ô mình → water', () => {
    expect(taskForTool(plot({ stage: 'young', water: 50 }), 'waterScoop')).toBeNull()
    expect(taskForTool(plot({ stage: 'young', water: 50 }, 'player'), 'waterScoop')).toBe('water')
  })

  it('green có cỏ + sickle → weed', () => {
    expect(taskForTool(plot({ stage: 'green', water: 100, fertilized: true, hasWeeds: true }), 'sickle')).toBe('weed')
  })

  it('trổ bông chưa tháo + waterScoop → drain', () => {
    expect(taskForTool(plot({ stage: 'flowering', fertilized: true }), 'waterScoop')).toBe('drain')
  })

  it('ô đang bán → null', () => {
    expect(taskForTool(plot({ stage: 'dry' }, 'forSale'), 'hoe')).toBeNull()
  })
})

describe('actionDurationSec', () => {
  it('plow cấp 1/2/3 = 6 / 4.2 / 2.4', () => {
    expect(actionDurationSec('plow', 1)).toBeCloseTo(6)
    expect(actionDurationSec('plow', 2)).toBeCloseTo(4.2)
    expect(actionDurationSec('plow', 3)).toBeCloseTo(2.4)
  })
})

describe('moveWithCollision', () => {
  it('không đi vào nhà, trượt dọc tường', () => {
    const fromZ = HOUSE_BOX.max[1] + 0.5
    const [x, z] = moveWithCollision([0, fromZ], [1, fromZ - 2])
    expect(z).toBeGreaterThanOrEqual(HOUSE_BOX.max[1])
    expect(x).toBeCloseTo(1)
  })

  it('không ra khỏi bản đồ', () => {
    const [x, z] = moveWithCollision([0, 0], [WORLD_BOUNDS.max[0] + 10, WORLD_BOUNDS.min[1] - 10])
    expect(x).toBeLessThanOrEqual(WORLD_BOUNDS.max[0])
    expect(z).toBeGreaterThanOrEqual(WORLD_BOUNDS.min[1])
  })

  it('đi lại bình thường ngoài vật cản', () => {
    expect(moveWithCollision([0, 0], [1, 2])).toEqual([1, 2])
  })
})

describe('actionHint', () => {
  it('đúng dụng cụ → null', () => {
    expect(actionHint(plot({ stage: 'dry' }), 'hoe')).toBeNull()
  })
  it('không nhắm ô → bảo lại gần và nhìn xuống', () => {
    expect(actionHint(null, 'hoe')).toMatch(/nhìn xuống/)
  })
  it('sai dụng cụ → chỉ đúng phím và tên dụng cụ', () => {
    expect(actionHint(plot({ stage: 'dry' }), 'sickle')).toBe('Ô 1 cần: Cày bừa → phím 1 (Cuốc)')
  })
  it('ô không cần việc gì → nói rõ', () => {
    expect(actionHint(plot({ stage: 'young', water: 80, fertilized: true }), 'waterScoop')).toMatch(/chưa cần làm gì/)
  })
  it('ô đang bán → mua ở nhà Địa chủ', () => {
    expect(actionHint(plot({}, 'forSale'), 'hoe')).toMatch(/nhà Địa chủ/)
  })
})

describe('INTERACT_DISTANCE', () => {
  it('đủ xa để nhắm ô khi chỉ hơi cúi nhìn (~12°)', () => {
    expect(INTERACT_DISTANCE).toBeGreaterThanOrEqual(1.6 / Math.tan(0.21))
  })
})
