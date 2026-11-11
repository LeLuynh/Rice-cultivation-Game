import { describe, it, expect } from 'vitest'
import { createNewGame, freshPlot, type GameState, type PlotState } from './state'
import { applyAction } from './reducer'
import { tick } from './tick'

function setup(patch: Partial<PlotState> = {}, id = 1, owner?: PlotState['owner']): GameState {
  const s = createNewGame('A', 1)
  s.plots[id - 1] = { ...freshPlot(id, owner ?? s.plots[id - 1].owner), ...patch }
  return s
}
/** Ô 13 của người chơi, bật NPC. */
function npcSetup(patch: Partial<PlotState> = {}, xu = 1000): GameState {
  const s = setup({ npcEnabled: true, ...patch }, 13, 'player')
  s.xu = xu
  return s
}
const plot = (s: GameState, id: number): PlotState => s.plots[id - 1]

describe('người làm của Địa chủ', () => {
  it('việc Địa chủ để 60 giây thì người làm làm thay, người chơi không được công', () => {
    const s = setup()
    let r = tick(s, 59)
    expect(plot(r.state, 1).stage).toBe('dry')
    expect(plot(r.state, 1).jobAgeSec.plow).toBe(59)
    r = tick(r.state, 1)
    expect(plot(r.state, 1).stage).toBe('plowed')
    expect(r.events).toContainEqual({ type: 'landlordWorkerDid', plotId: 1, task: 'plow' })
    expect(r.state.xu).toBe(s.xu)
  })

  it('người chơi làm sau khi người làm đã làm → WRONG_STAGE, không trả công', () => {
    const r = tick(setup(), 60)
    const res = applyAction(r.state, { type: 'performTask', plotId: 1, task: 'plow', tool: 'hoe' })
    expect(res).toEqual({ ok: false, error: 'WRONG_STAGE' })
  })

  it('tuổi việc bị xóa khi việc không còn khả dụng', () => {
    const r = tick(setup({ stage: 'green', water: 100, fertilized: true, hasWeeds: true }), 5)
    const res = applyAction(r.state, { type: 'performTask', plotId: 1, task: 'weed', tool: 'sickle' })
    if (!res.ok) throw new Error(res.error)
    const r2 = tick(res.state, 1)
    expect(plot(r2.state, 1).jobAgeSec.weed).toBeUndefined()
  })

  it('tuốt lúa ô Địa chủ không vào kho người chơi', () => {
    const r = tick(setup({ stage: 'bundled' }), 60)
    expect(plot(r.state, 1).stage).toBe('dry')
    expect(r.state.inventory.riceKg).toBe(0)
  })
})

describe('NPC của người chơi', () => {
  it('NPC làm việc ô mình sau 20 giây và trừ công', () => {
    let r = tick(npcSetup(), 19)
    expect(plot(r.state, 13).stage).toBe('dry')
    r = tick(r.state, 1)
    expect(plot(r.state, 13).stage).toBe('plowed')
    expect(r.state.xu).toBe(1000 - 15)
    expect(r.events).toContainEqual({ type: 'npcDid', plotId: 13, task: 'plow', wage: 15 })
  })

  it('NPC dùng giống trong kho khi gieo mạ', () => {
    const s = npcSetup({ stage: 'plowed' })
    s.inventory.seeds = 2
    const r = tick(s, 20)
    expect(plot(r.state, 13).stage).toBe('seedling')
    expect(r.state.inventory.seeds).toBe(1)
    expect(r.state.xu).toBe(1000 - 10)
  })

  it('NPC thiếu giống → npcBlocked NO_SEED', () => {
    const r = tick(npcSetup({ stage: 'plowed' }), 20)
    expect(plot(r.state, 13).stage).toBe('plowed')
    expect(plot(r.state, 13).npcBlocked).toBe('NO_SEED')
  })

  it('NPC thiếu Xu → npcBlocked phát đúng một lần trong 30 giây', () => {
    const r = tick(npcSetup({}, 10), 50)
    const blocked = r.events.filter(e => e.type === 'npcBlocked')
    expect(blocked).toEqual([{ type: 'npcBlocked', plotId: 13, reason: 'NOT_ENOUGH_XU' }])
    expect(plot(r.state, 13).npcBlocked).toBe('NOT_ENOUGH_XU')
    expect(plot(r.state, 13).stage).toBe('dry')
    expect(r.state.xu).toBe(10)
  })

  it('NPC tiếp tục khi có đủ Xu, npcBlocked về null', () => {
    const r = tick(npcSetup({}, 10), 25)
    const s = structuredClone(r.state)
    s.xu = 100
    const r2 = tick(s, 1)
    expect(plot(r2.state, 13).stage).toBe('plowed')
    expect(plot(r2.state, 13).npcBlocked).toBeNull()
    expect(r2.state.xu).toBe(85)
  })

  it('NPC tuốt lúa cộng vào kho người chơi', () => {
    const r = tick(npcSetup({ stage: 'bundled', health: 100 }), 20)
    expect(r.state.inventory.riceKg).toBe(100)
    expect(plot(r.state, 13).stage).toBe('dry')
    expect(plot(r.state, 13).npcEnabled).toBe(true)
    expect(r.state.xu).toBe(1000 - 15)
  })

  it('ô chưa bật NPC thì không ai làm', () => {
    const r = tick(npcSetup({ npcEnabled: false }), 120)
    expect(plot(r.state, 13).stage).toBe('dry')
    expect(r.state.xu).toBe(1000)
  })

  it('mỗi giây mỗi ô làm tối đa một việc, việc chờ lâu nhất trước', () => {
    // nước 10 → 'water' khả dụng ngay; cỏ cũng có. Cả hai cùng tuổi → chỉ một việc mỗi giây.
    const s = npcSetup({ stage: 'young', water: 10, hasWeeds: true, fertilized: true })
    const r = tick(s, 20)
    const did = r.events.filter(e => e.type === 'npcDid')
    expect(did).toHaveLength(1)
    const r2 = tick(r.state, 1)
    expect(r2.events.filter(e => e.type === 'npcDid')).toHaveLength(1)
  })
})

describe('tick: dt bất thường', () => {
  it('dt = Infinity không treo, state không đổi', () => {
    const s = setup()
    const r = tick(s, Infinity)
    expect(r.state).toEqual(s)
    expect(r.events).toEqual([])
  })

  it('tick(s,300) bằng 300 lần tick(s,1), kể cả người làm và NPC', () => {
    const s = npcSetup({}, 1000)
    s.inventory.seeds = 3
    const big = tick(s, 300)
    let cur = s
    const events = []
    for (let i = 0; i < 300; i++) {
      const r = tick(cur, 1)
      cur = r.state
      events.push(...r.events)
    }
    expect(cur).toEqual(big.state)
    expect(events).toEqual(big.events)
  })
})
