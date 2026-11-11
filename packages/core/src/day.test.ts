import { describe, it, expect } from 'vitest'
import { clockTime, emptyDayStats } from './day'
import { createNewGame, freshPlot, type GameState, type PlotState } from './state'
import { applyAction } from './reducer'
import { tick } from './tick'
import type { Action } from './actions'

function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error)
  return r.state
}
function withPlot(s: GameState, id: number, patch: Partial<PlotState>): GameState {
  s.plots[id - 1] = { ...freshPlot(id, s.plots[id - 1].owner), ...patch }
  return s
}

describe('clockTime', () => {
  it('0 → 6:00; 180 → 14:00; 360 → 22:00; 90 → 10:00', () => {
    expect(clockTime(0)).toEqual({ hour: 6, minute: 0 })
    expect(clockTime(180)).toEqual({ hour: 14, minute: 0 })
    expect(clockTime(360)).toEqual({ hour: 22, minute: 0 })
    expect(clockTime(90)).toEqual({ hour: 10, minute: 0 })
  })

  it('phút làm tròn xuống: 1 giây → 6:02', () => {
    expect(clockTime(1)).toEqual({ hour: 6, minute: 2 })
  })
})

describe('ngày kết thúc', () => {
  it('sau 360 giây có daySummary và sự kiện dayEnded đúng một lần', () => {
    const s = createNewGame('A', 1)
    let r = tick(s, 359)
    expect(r.state.daySummary).toBeNull()
    expect(r.state.dayElapsedSec).toBe(359)
    r = tick(r.state, 1)
    expect(r.state.daySummary).not.toBeNull()
    expect(r.events.filter(e => e.type === 'dayEnded')).toHaveLength(1)
    const r2 = tick(r.state, 30)
    expect(r2.events).toEqual([])
  })

  it('tick(s, 400) dừng ở 360 giây, lúa chỉ lớn 360 giây', () => {
    const s = withPlot(createNewGame('A', 1), 13, { owner: 'player', stage: 'young', water: 100 })
    const r = tick(s, 400)
    expect(r.state.dayElapsedSec).toBe(360)
    expect(r.state.timeSec).toBe(360)
    expect(r.state.plots[12].stage).toBe('green')
    expect(r.state.plots[12].stageElapsedSec).toBe(60)
  })

  it('khi hết ngày, tick không đổi state; performTask/buySeeds → DAY_ENDED', () => {
    const ended = tick(createNewGame('A', 1), 360).state
    expect(tick(ended, 50).state).toEqual(ended)
    expect(applyAction(ended, { type: 'buySeeds', qty: 1 })).toEqual({ ok: false, error: 'DAY_ENDED' })
    expect(applyAction(ended, { type: 'performTask', plotId: 1, task: 'plow', tool: 'hoe' }))
      .toEqual({ ok: false, error: 'DAY_ENDED' })
    expect(applyAction(ended, { type: 'markTutorialSeen' }).ok).toBe(true)
  })

  it('startNextDay: day 2, dayElapsedSec 0, stats reset với startXu = xu hiện tại', () => {
    const ended = tick(createNewGame('A', 1), 360).state
    ended.xu = 777
    const next = ok(ended, { type: 'startNextDay' })
    expect(next.day).toBe(2)
    expect(next.dayElapsedSec).toBe(0)
    expect(next.daySummary).toBeNull()
    expect(next.dayStats).toEqual(emptyDayStats(777))
  })

  it('startNextDay giữa ngày → NO_JOB', () => {
    expect(applyAction(createNewGame('A', 1), { type: 'startNextDay' })).toEqual({ ok: false, error: 'NO_JOB' })
  })
})

describe('tổng kết ngày', () => {
  it('làm 2 việc Địa chủ (cày 15 + gặt 20) → landlordTasksDone 2, wagesEarned 35', () => {
    let s = createNewGame('A', 1)
    s = withPlot(s, 1, { stage: 'dry' })
    s = withPlot(s, 2, { stage: 'ripe', fertilized: true, drained: true })
    s = ok(s, { type: 'performTask', plotId: 1, task: 'plow', tool: 'hoe' })
    s = ok(s, { type: 'performTask', plotId: 2, task: 'harvest', tool: 'sickle' })
    const sum = tick(s, 360).state.daySummary!
    expect(sum.landlordTasksDone).toBe(2)
    expect(sum.wagesEarned).toBe(35)
    expect(sum.day).toBe(1)
  })

  it('mua 2 giống + 1 đất, bán 100 kg → suppliesSpentXu 60, landAndUpgradeSpentXu 2000, riceSalesXu 800, netXu đúng', () => {
    let s = createNewGame('A', 1)
    s.xu = 5000
    s.dayStats.startXu = 5000
    s.inventory.riceKg = 100
    s = ok(s, { type: 'buySeeds', qty: 2 })
    s = ok(s, { type: 'buyLand', plotId: 13 })
    s = ok(s, { type: 'sellRice', kg: 100 })
    const sum = tick(s, 360).state.daySummary!
    expect(sum.suppliesSpentXu).toBe(60)
    expect(sum.landAndUpgradeSpentXu).toBe(2000)
    expect(sum.riceSalesXu).toBe(800)
    expect(sum.endXu).toBe(5000 - 60 - 2000 + 800)
    expect(sum.netXu).toBe(sum.endXu - 5000)
  })

  it('nâng cấp công cụ tính vào landAndUpgradeSpentXu', () => {
    let s = createNewGame('A', 1)
    s.xu = 300
    s = ok(s, { type: 'upgradeTool', tool: 'hoe' })
    expect(s.dayStats.landAndUpgradeSpentXu).toBe(300)
  })

  it('tuốt ô mình (người chơi) cộng riceHarvestedKg', () => {
    let s = withPlot(createNewGame('A', 1), 13, { owner: 'player', stage: 'bundled', health: 100 })
    s = ok(s, { type: 'performTask', plotId: 13, task: 'thresh', tool: 'hands' })
    expect(s.dayStats.riceHarvestedKg).toBe(100)
    expect(s.dayStats.landlordTasksDone).toBe(0)
  })

  it('NPC làm: npcWagesPaidXu và riceHarvestedKg khi NPC tuốt', () => {
    const s = withPlot(createNewGame('A', 1), 13, { owner: 'player', stage: 'bundled', health: 100, npcEnabled: true })
    s.xu = 100
    const r = tick(s, 20)
    expect(r.state.dayStats.npcWagesPaidXu).toBe(15)
    expect(r.state.dayStats.riceHarvestedKg).toBe(100)
  })
})
