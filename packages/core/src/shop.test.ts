import { describe, it, expect } from 'vitest'
import { createNewGame, type GameState } from './state'
import { applyAction, ownedPlotCount, isNpcUnlocked } from './reducer'
import type { Action } from './actions'

function game(patch: Partial<GameState> = {}): GameState {
  return { ...createNewGame('A', 1), ...patch }
}
function ok(s: GameState, a: Action): GameState {
  const r = applyAction(s, a)
  if (!r.ok) throw new Error(r.error)
  expect(r.events).toEqual([])
  return r.state
}
function own(s: GameState, n: number): GameState {
  for (let i = 0; i < n; i++) s.plots[12 + i].owner = 'player'
  return s
}

describe('shop', () => {
  it('mua 2 giống tốn 60 Xu', () => {
    const s = ok(game({ xu: 100 }), { type: 'buySeeds', qty: 2 })
    expect(s.xu).toBe(40)
    expect(s.inventory.seeds).toBe(2)
  })
  it('mua phân bón tốn 40 Xu mỗi bao; thiếu Xu → NOT_ENOUGH_XU', () => {
    const s = ok(game({ xu: 100 }), { type: 'buyFertilizer', qty: 2 })
    expect(s.xu).toBe(20)
    expect(s.inventory.fertilizer).toBe(2)
    expect(applyAction(game({ xu: 50 }), { type: 'buySeeds', qty: 2 })).toEqual({ ok: false, error: 'NOT_ENOUGH_XU' })
  })
  it.each([0, -1, 1.5, NaN])('qty %s → INVALID_AMOUNT, state không đổi', qty => {
    const s = game({ xu: 1000 })
    const snap = structuredClone(s)
    expect(applyAction(s, { type: 'buySeeds', qty })).toEqual({ ok: false, error: 'INVALID_AMOUNT' })
    expect(applyAction(s, { type: 'buyFertilizer', qty })).toEqual({ ok: false, error: 'INVALID_AMOUNT' })
    expect(applyAction(s, { type: 'sellRice', kg: qty })).toEqual({ ok: false, error: 'INVALID_AMOUNT' })
    expect(s).toEqual(snap)
  })
  it('mua đất 2000 Xu: thiếu tiền → NOT_ENOUGH_XU; đủ → owner player, xu giảm 2000', () => {
    expect(applyAction(game({ xu: 1999 }), { type: 'buyLand', plotId: 13 })).toEqual({ ok: false, error: 'NOT_ENOUGH_XU' })
    const s = ok(game({ xu: 2500 }), { type: 'buyLand', plotId: 13 })
    expect(s.plots[12].owner).toBe('player')
    expect(s.xu).toBe(500)
  })
  it('mua ô Địa chủ → NOT_FOR_SALE; mua ô đã sở hữu → NOT_FOR_SALE; ô không tồn tại → NOT_FOR_SALE', () => {
    const s = own(game({ xu: 9999 }), 1)
    expect(applyAction(s, { type: 'buyLand', plotId: 1 })).toEqual({ ok: false, error: 'NOT_FOR_SALE' })
    expect(applyAction(s, { type: 'buyLand', plotId: 13 })).toEqual({ ok: false, error: 'NOT_FOR_SALE' })
    expect(applyAction(s, { type: 'buyLand', plotId: 99 })).toEqual({ ok: false, error: 'NOT_FOR_SALE' })
  })
  it('bán 100 kg được 800 Xu, không thuế', () => {
    const s = ok(game({ xu: 10, inventory: { seeds: 0, fertilizer: 0, riceKg: 150 } }), { type: 'sellRice', kg: 100 })
    expect(s.xu).toBe(810)
    expect(s.inventory.riceKg).toBe(50)
  })
  it('bán nhiều hơn kho → NOT_ENOUGH_RICE', () => {
    const s = game({ inventory: { seeds: 0, fertilizer: 0, riceKg: 5 } })
    expect(applyAction(s, { type: 'sellRice', kg: 6 })).toEqual({ ok: false, error: 'NOT_ENOUGH_RICE' })
  })
  it('nâng cuốc 1→2 tốn 300, 2→3 tốn 1000, cấp 3 → MAX_LEVEL', () => {
    expect(applyAction(game({ xu: 299 }), { type: 'upgradeTool', tool: 'hoe' })).toEqual({ ok: false, error: 'NOT_ENOUGH_XU' })
    const s2 = ok(game({ xu: 1300 }), { type: 'upgradeTool', tool: 'hoe' })
    expect(s2.toolLevels.hoe).toBe(2)
    expect(s2.xu).toBe(1000)
    const s3 = ok(s2, { type: 'upgradeTool', tool: 'hoe' })
    expect(s3.toolLevels.hoe).toBe(3)
    expect(s3.xu).toBe(0)
    expect(applyAction({ ...s3, xu: 5000 }, { type: 'upgradeTool', tool: 'hoe' })).toEqual({ ok: false, error: 'MAX_LEVEL' })
  })
  it('setNpc khi có 4 ô → NPC_LOCKED; 5 ô → ok; ô Địa chủ → NOT_OWNER', () => {
    const four = own(game(), 1)
    four.plots[0].owner = 'player'
    four.plots[1].owner = 'player'
    four.plots[2].owner = 'player'
    expect(ownedPlotCount(four)).toBe(4)
    expect(isNpcUnlocked(four)).toBe(false)
    expect(applyAction(four, { type: 'setNpc', plotId: 1, enabled: true })).toEqual({ ok: false, error: 'NPC_LOCKED' })

    const five = own(game(), 5)
    expect(isNpcUnlocked(five)).toBe(true)
    const on = ok(five, { type: 'setNpc', plotId: 13, enabled: true })
    expect(on.plots[12].npcEnabled).toBe(true)
    expect(applyAction(five, { type: 'setNpc', plotId: 1, enabled: true })).toEqual({ ok: false, error: 'NOT_OWNER' })
    expect(applyAction(five, { type: 'setNpc', plotId: 99, enabled: true })).toEqual({ ok: false, error: 'NOT_OWNER' })
  })
  it('tắt NPC xóa npcBlocked', () => {
    const s = own(game(), 5)
    s.plots[12].npcEnabled = true
    s.plots[12].npcBlocked = 'NO_SEED'
    const off = ok(s, { type: 'setNpc', plotId: 13, enabled: false })
    expect(off.plots[12].npcEnabled).toBe(false)
    expect(off.plots[12].npcBlocked).toBeNull()
  })
  it('markTutorialSeen đặt tutorialSeen = true, không mutate', () => {
    const s = game()
    const n = ok(s, { type: 'markTutorialSeen' })
    expect(n.tutorialSeen).toBe(true)
    expect(s.tutorialSeen).toBe(false)
  })
})
