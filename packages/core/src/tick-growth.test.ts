import { describe, it, expect } from 'vitest'
import { createNewGame, freshPlot, type GameState, type PlotState } from './state'
import { tick } from './tick'

function setup(patch: Partial<PlotState> = {}, id = 1): GameState {
  const s = createNewGame('A', 1)
  s.plots[id - 1] = { ...freshPlot(id, s.plots[id - 1].owner), ...patch }
  return s
}
const p1 = (s: GameState): PlotState => s.plots[0]

describe('tick', () => {
  it('mạ non sau 180 giây thành mạ đủ lớn', () => {
    const r = tick(setup({ stage: 'seedling', water: 100 }), 180)
    expect(p1(r.state).stage).toBe('seedlingReady')
    expect(p1(r.state).stageElapsedSec).toBe(0)
    expect(r.events).toContainEqual({ type: 'stageChanged', plotId: 1, stage: 'seedlingReady' })
  })

  it('cả vụ tự lớn: young 300 → green 300 → flowering 240 → ripe', () => {
    const s = setup({ stage: 'young', water: 100, fertilized: true, drained: true })
    let r = tick(s, 299)
    expect(p1(r.state).stage).toBe('young')
    r = tick(r.state, 1)
    expect(p1(r.state).stage).toBe('green')
    r = tick(r.state, 300)
    expect(p1(r.state).stage).toBe('flowering')
    r = tick(r.state, 240)
    expect(p1(r.state).stage).toBe('ripe')
  })

  it('nước giảm 5 mỗi 10 giây ở lúa non', () => {
    const r = tick(setup({ stage: 'young', water: 100 }), 10)
    expect(p1(r.state).water).toBe(95)
  })

  it('thiếu nước trừ 2 sức khỏe mỗi 10 giây', () => {
    const r = tick(setup({ stage: 'young', water: 25 }), 10)
    expect(p1(r.state).health).toBe(98)
    expect(p1(r.state).water).toBe(20)
  })

  it('không bón phân bị trừ 15 khi rời lúa xanh', () => {
    const r = tick(setup({ stage: 'green', stageElapsedSec: 299, water: 100, fertilized: false }), 1)
    expect(p1(r.state).stage).toBe('flowering')
    expect(p1(r.state).health).toBe(85)
    const ok = tick(setup({ stage: 'green', stageElapsedSec: 299, water: 100, fertilized: true }), 1)
    expect(p1(ok.state).health).toBe(100)
  })

  it('không tháo nước bị trừ 10 khi vào chín', () => {
    const r = tick(setup({ stage: 'flowering', stageElapsedSec: 239, drained: false }), 1)
    expect(p1(r.state).stage).toBe('ripe')
    expect(p1(r.state).health).toBe(90)
  })

  it('chín quá 180 giây mất 2 kg mỗi 10 giây', () => {
    const r = tick(setup({ stage: 'ripe', drained: true, fertilized: true }), 200)
    expect(p1(r.state).lostKg).toBe(4)
  })

  it('cỏ và sâu xuất hiện tái lập theo seed', () => {
    const a = tick(setup({ stage: 'green', water: 100, fertilized: true }), 240)
    const b = tick(setup({ stage: 'green', water: 100, fertilized: true }), 240)
    expect(a).toEqual(b)
    expect(a.events.some(e => e.type === 'weedsAppeared')).toBe(true)
    expect(a.events.some(e => e.type === 'pestsAppeared')).toBe(true)
    expect(a.state.rngState).not.toBe(setup().rngState)
  })

  it('cỏ trừ 1 và sâu trừ 2 sức khỏe mỗi 10 giây', () => {
    const r = tick(setup({ stage: 'ripe', hasWeeds: true, hasPests: true }), 10)
    expect(p1(r.state).health).toBe(97)
  })

  it('tick(s,10) bằng 10 lần tick(s,1)', () => {
    const s = setup({ stage: 'green', water: 100, fertilized: true, pestCheckAccum: 55 })
    const once = tick(s, 10)
    let cur = s
    const events: unknown[] = []
    for (let i = 0; i < 10; i++) {
      const r = tick(cur, 1)
      cur = r.state
      events.push(...r.events)
    }
    expect(once.state).toEqual(cur)
    expect(once.events).toEqual(events)
  })

  it('timeSec tăng một lần mỗi giây và dt lẻ bị làm tròn xuống', () => {
    const s = createNewGame('A', 1)
    expect(tick(s, 7.9).state.timeSec).toBe(7)
  })

  it('không đổi state đầu vào', () => {
    const s = setup({ stage: 'young', water: 100 })
    const copy = JSON.parse(JSON.stringify(s))
    tick(s, 30)
    expect(s).toEqual(copy)
  })

  it('dt ≤ 0 hoặc NaN không đổi state', () => {
    const s = setup({ stage: 'young', water: 100 })
    for (const dt of [0, -5, NaN, 0.5]) {
      const r = tick(s, dt)
      expect(r.state).toEqual(s)
      expect(r.events).toEqual([])
    }
  })

  it('ô đang bán không đổi gì', () => {
    const s = createNewGame('A', 1)
    const before = JSON.parse(JSON.stringify(s.plots[12]))
    const r = tick(s, 100)
    expect(r.state.plots[12]).toEqual(before)
  })
})
