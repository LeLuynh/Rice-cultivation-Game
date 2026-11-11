import { describe, it, expect } from 'vitest'
import { CONFIG } from './config'

describe('CONFIG', () => {
  it('khớp số liệu spec', () => {
    expect(CONFIG.landPrice).toBe(2000)
    expect(CONFIG.startingXu).toBe(50)
    expect(CONFIG.landlordPlotIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(CONFIG.forSalePlotIds).toEqual([13, 14, 15, 16, 17, 18, 19, 20])
    expect(CONFIG.wages).toEqual({ plow: 15, sow: 10, transplant: 20, water: 5, drain: 5, fertilize: 10, weed: 10, pestControl: 10, harvest: 20, thresh: 15 })
    expect(CONFIG.tasks.plow).toEqual({ tool: 'hoe', baseSec: 6 })
    expect(CONFIG.tasks.thresh).toEqual({ tool: 'hands', baseSec: 5 })
    expect(CONFIG.day).toEqual({ lengthSec: 360, startHour: 6, endHour: 22 })
  })
  it('bảng tasks đủ theo spec 4.4', () => {
    expect(CONFIG.tasks).toEqual({
      plow: { tool: 'hoe', baseSec: 6 },
      sow: { tool: 'seedBasket', baseSec: 4 },
      transplant: { tool: 'seedBasket', baseSec: 6 },
      water: { tool: 'waterScoop', baseSec: 2 },
      drain: { tool: 'waterScoop', baseSec: 2 },
      fertilize: { tool: 'fertilizerBag', baseSec: 3 },
      harvest: { tool: 'sickle', baseSec: 6 },
      weed: { tool: 'sickle', baseSec: 3 },
      pestControl: { tool: 'hands', baseSec: 3 },
      thresh: { tool: 'hands', baseSec: 5 },
    })
  })
})
