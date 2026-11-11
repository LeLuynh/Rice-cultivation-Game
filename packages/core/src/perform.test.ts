import { describe, it, expect } from 'vitest'
import { createNewGame, freshPlot, type GameState, type PlotState } from './state'
import { computeYieldKg } from './tasks'
import { applyAction } from './reducer'
import type { Stage } from './config'

function setup(patch: Partial<PlotState> = {}, id = 1): GameState {
  const s = createNewGame('A', 1)
  s.plots[id - 1] = { ...freshPlot(id, s.plots[id - 1].owner), ...patch }
  return s
}
function own(s: GameState, id = 1): GameState {
  s.plots[id - 1].owner = 'player'
  return s
}

describe('performTask', () => {
  it('cày ruộng Địa chủ được 15 Xu', () => {
    const s = setup({ stage: 'dry' })
    const r = applyAction(s, { type: 'performTask', plotId: 1, task: 'plow', tool: 'hoe' })
    if (!r.ok) throw new Error(r.error)
    expect(r.state.xu).toBe(65)
    expect(r.state.plots[0].stage).toBe('plowed')
    expect(r.events).toContainEqual({ type: 'wagePaid', plotId: 1, task: 'plow', amount: 15 })
  })
  it('sai công cụ → WRONG_TOOL', () => {
    const r = applyAction(setup({ stage: 'dry' }), { type: 'performTask', plotId: 1, task: 'plow', tool: 'sickle' })
    expect(r).toEqual({ ok: false, error: 'WRONG_TOOL' })
  })
  it('cấy khi chưa cày → WRONG_STAGE', () => {
    const r = applyAction(setup({ stage: 'dry' }), { type: 'performTask', plotId: 1, task: 'transplant', tool: 'seedBasket' })
    expect(r).toEqual({ ok: false, error: 'WRONG_STAGE' })
  })
  it('làm cỏ khi không có cỏ → NO_JOB', () => {
    const r = applyAction(setup({ stage: 'young' }), { type: 'performTask', plotId: 1, task: 'weed', tool: 'sickle' })
    expect(r).toEqual({ ok: false, error: 'NO_JOB' })
  })
  it('ô đang bán / không tồn tại → NOT_OWNER', () => {
    const s = createNewGame('A', 1)
    expect(applyAction(s, { type: 'performTask', plotId: 13, task: 'plow', tool: 'hoe' })).toEqual({ ok: false, error: 'NOT_OWNER' })
    expect(applyAction(s, { type: 'performTask', plotId: 99, task: 'plow', tool: 'hoe' })).toEqual({ ok: false, error: 'NOT_OWNER' })
  })
  it('gieo mạ ô mình không có giống → NO_SEED; có giống thì trừ 1 và không trả công', () => {
    const s = own(setup({ stage: 'plowed' }))
    const a = { type: 'performTask', plotId: 1, task: 'sow', tool: 'seedBasket' } as const
    expect(applyAction(s, a)).toEqual({ ok: false, error: 'NO_SEED' })
    s.inventory.seeds = 2
    const r = applyAction(s, a)
    if (!r.ok) throw new Error(r.error)
    expect(r.state.inventory.seeds).toBe(1)
    expect(r.state.xu).toBe(50)
    expect(r.state.plots[0].stage).toBe('seedling')
    expect(r.state.plots[0].water).toBe(100)
    expect(r.events.some(e => e.type === 'wagePaid')).toBe(false)
  })
  it('bón phân ô mình trừ 1 phân', () => {
    const s = own(setup({ stage: 'young', water: 100 }))
    const a = { type: 'performTask', plotId: 1, task: 'fertilize', tool: 'fertilizerBag' } as const
    expect(applyAction(s, a)).toEqual({ ok: false, error: 'NO_FERTILIZER' })
    s.inventory.fertilizer = 3
    const r = applyAction(s, a)
    if (!r.ok) throw new Error(r.error)
    expect(r.state.inventory.fertilizer).toBe(2)
    expect(r.state.plots[0].fertilized).toBe(true)
  })
  it('tưới ô mình khi nước 80 → ok, nước 100; ô Địa chủ nước 80 → NO_JOB', () => {
    const a = { type: 'performTask', plotId: 1, task: 'water', tool: 'waterScoop' } as const
    const r = applyAction(own(setup({ stage: 'young', water: 80 })), a)
    if (!r.ok) throw new Error(r.error)
    expect(r.state.plots[0].water).toBe(100)
    expect(applyAction(setup({ stage: 'young', water: 80 }), a)).toEqual({ ok: false, error: 'NO_JOB' })
  })
  it('tháo nước, bón/làm cỏ/trừ sâu, thu hoạch đổi trạng thái', () => {
    const run = (stage: Stage, patch: Partial<PlotState>, task: any, tool: any) => {
      const r = applyAction(setup({ stage, ...patch }), { type: 'performTask', plotId: 1, task, tool })
      if (!r.ok) throw new Error(r.error)
      return r.state.plots[0]
    }
    expect(run('flowering', { water: 100 }, 'drain', 'waterScoop')).toMatchObject({ water: 0, drained: true })
    expect(run('young', { hasWeeds: true }, 'weed', 'sickle').hasWeeds).toBe(false)
    expect(run('green', { hasPests: true }, 'pestControl', 'hands').hasPests).toBe(false)
    expect(run('ripe', {}, 'harvest', 'sickle')).toMatchObject({ stage: 'bundled', stageElapsedSec: 0 })
    expect(run('seedlingReady', {}, 'transplant', 'seedBasket').stage).toBe('young')
  })
  it('xóa jobAgeSec của task đã làm', () => {
    const p = setup({ stage: 'dry', jobAgeSec: { plow: 10 } })
    const r = applyAction(p, { type: 'performTask', plotId: 1, task: 'plow', tool: 'hoe' })
    if (!r.ok) throw new Error(r.error)
    expect(r.state.plots[0].jobAgeSec.plow).toBeUndefined()
  })
  it('năng suất', () => {
    const p = (health: number, lostKg = 0) => ({ ...freshPlot(1, 'player'), health, lostKg })
    expect(computeYieldKg(p(100))).toBe(100)
    expect(computeYieldKg(p(0))).toBe(40)
    expect(computeYieldKg(p(50))).toBe(70)
    expect(computeYieldKg(p(100, 70))).toBe(40)
  })
  it('tuốt ô mình cộng lúa vào kho và ô về dry, health 100', () => {
    const s = own(setup({ stage: 'bundled', health: 50, npcEnabled: true }))
    const r = applyAction(s, { type: 'performTask', plotId: 1, task: 'thresh', tool: 'hands' })
    if (!r.ok) throw new Error(r.error)
    expect(r.state.inventory.riceKg).toBe(70)
    expect(r.state.plots[0]).toMatchObject({ stage: 'dry', health: 100, owner: 'player', npcEnabled: true })
    expect(r.state.xu).toBe(50)
    expect(r.events).toContainEqual({ type: 'riceHarvested', plotId: 1, kg: 70, toPlayer: true })
  })
  it('tuốt ô Địa chủ trả 15 Xu, kho lúa không đổi', () => {
    const r = applyAction(setup({ stage: 'bundled' }), { type: 'performTask', plotId: 1, task: 'thresh', tool: 'hands' })
    if (!r.ok) throw new Error(r.error)
    expect(r.state.xu).toBe(65)
    expect(r.state.inventory.riceKg).toBe(0)
    expect(r.events).toContainEqual({ type: 'riceHarvested', plotId: 1, kg: 100, toPlayer: false })
  })
  it('không sửa state đầu vào; action khác → NO_JOB', () => {
    const s = setup({ stage: 'dry' })
    const snap = structuredClone(s)
    applyAction(s, { type: 'performTask', plotId: 1, task: 'plow', tool: 'hoe' })
    expect(s).toEqual(snap)
    expect(applyAction(s, { type: 'startNextDay' })).toEqual({ ok: false, error: 'NO_JOB' })
  })
})
