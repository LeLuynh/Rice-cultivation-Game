import { describe, it, expect } from 'vitest'
import { createNewGame, freshPlot } from './state'
import { availableTasks } from './tasks'
import { CONFIG } from './config'

describe('createNewGame', () => {
  it('game mới', () => {
    const s = createNewGame('Tí', 1)
    expect(s.xu).toBe(50)
    expect(s.inventory).toEqual({ seeds: 0, fertilizer: 0, riceKg: 0 })
    expect(s.plots).toHaveLength(20)
    expect(s.plots.every((p, i) => p.id === i + 1)).toBe(true)
    expect(s.plots.filter(p => p.owner === 'landlord').map(p => p.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(s.plots.slice(12).every(p => p.owner === 'forSale' && p.stage === 'dry')).toBe(true)
    expect(Object.values(s.toolLevels).every(l => l === 1)).toBe(true)
  })

  it('khởi tạo các trường ngày', () => {
    const s = createNewGame('Tí', 1)
    expect(s.version).toBe(1)
    expect(s.playerName).toBe('Tí')
    expect(s.day).toBe(1)
    expect(s.dayElapsedSec).toBe(0)
    expect(s.daySummary).toBeNull()
    expect(s.dayStats).toEqual({
      startXu: 50, landlordTasksDone: 0, wagesEarned: 0, riceHarvestedKg: 0,
      riceSalesXu: 0, suppliesSpentXu: 0, landAndUpgradeSpentXu: 0, npcWagesPaidXu: 0,
    })
  })

  it('cùng seed cùng ruộng', () => expect(createNewGame('A', 7)).toEqual(createNewGame('A', 7)))

  it('có ít nhất 1 việc lúc đầu với seed 1..20', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createNewGame('A', seed)
      const total = s.plots.filter(p => p.owner === 'landlord').reduce((n, p) => n + availableTasks(p).length, 0)
      expect(total, `seed ${seed}`).toBeGreaterThan(0)
    }
  })

  it('cờ nhất quán theo stage', () => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const p of createNewGame('A', seed).plots.filter(q => q.owner === 'landlord')) {
        expect(['dry', 'plowed', 'seedling', 'young', 'green', 'flowering', 'ripe']).toContain(p.stage)
        const dur = (CONFIG.stageDurationSec as Record<string, number>)[p.stage]
        if (dur === undefined) expect(p.stageElapsedSec).toBe(0)
        else {
          expect(p.stageElapsedSec).toBeGreaterThanOrEqual(0)
          expect(p.stageElapsedSec).toBeLessThan(dur)
        }
        if (p.stage !== 'dry' && p.stage !== 'plowed') expect(p.water).toBe(100)
        if (p.stage === 'flowering' || p.stage === 'ripe') expect(p.fertilized).toBe(true)
        if (p.stage === 'ripe') expect(p.drained).toBe(true)
      }
    }
  })
})

describe('freshPlot', () => {
  it('ô khô, mọi cờ false', () => {
    const p = freshPlot(3, 'player')
    expect(p).toMatchObject({
      id: 3, owner: 'player', stage: 'dry', stageElapsedSec: 0, water: 0, health: 100,
      fertilized: false, drained: false, hasWeeds: false, hasPests: false, lostKg: 0,
      tenSecAccum: 0, pestCheckAccum: 0, jobAgeSec: {}, npcEnabled: false, npcBlocked: null,
    })
  })
})
