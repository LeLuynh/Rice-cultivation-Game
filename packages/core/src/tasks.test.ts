import { describe, it, expect } from 'vitest'
import { freshPlot, type PlotState } from './state'
import { availableTasks } from './tasks'
import type { Stage } from './config'

function plot(stage: Stage, patch: Partial<PlotState> = {}): PlotState {
  return { ...freshPlot(1, 'landlord'), stage, water: 100, fertilized: true, drained: true, ...patch }
}

describe('availableTasks', () => {
  it('theo stage', () => {
    expect(availableTasks(plot('dry'))).toEqual(['plow'])
    expect(availableTasks(plot('plowed'))).toEqual(['sow'])
    expect(availableTasks(plot('seedlingReady'))).toEqual(['transplant'])
    expect(availableTasks(plot('ripe'))).toEqual(['harvest'])
    expect(availableTasks(plot('bundled'))).toEqual(['thresh'])
    expect(availableTasks(plot('seedling'))).toEqual([])
  })
  it('tưới khi nước < 30', () => {
    expect(availableTasks(plot('young', { water: 29 }))).toContain('water')
    expect(availableTasks(plot('young', { water: 30 }))).not.toContain('water')
    expect(availableTasks(plot('flowering', { water: 0 }))).not.toContain('water')
  })
  it('bón phân một lần', () => {
    expect(availableTasks(plot('green', { fertilized: false }))).toContain('fertilize')
    expect(availableTasks(plot('green', { fertilized: true }))).not.toContain('fertilize')
    expect(availableTasks(plot('flowering', { fertilized: false }))).not.toContain('fertilize')
  })
  it('tháo nước ở trổ bông', () => {
    expect(availableTasks(plot('flowering', { drained: false }))).toContain('drain')
    expect(availableTasks(plot('flowering', { drained: true }))).not.toContain('drain')
  })
  it('cỏ và sâu', () => {
    expect(availableTasks(plot('young', { hasWeeds: true }))).toContain('weed')
    expect(availableTasks(plot('green', { hasPests: true }))).toContain('pestControl')
  })
  it('ô đang bán không có việc', () => {
    expect(availableTasks({ ...freshPlot(13, 'forSale') })).toEqual([])
  })
})
