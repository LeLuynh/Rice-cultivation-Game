import { describe, it, expect } from 'vitest'
import { CONFIG, createNewGame, freshPlot, type DaySummary } from '@rice/core'
import { tutorialSections } from './tutorialData'
import { listLandlordJobs } from './jobs'
import { summaryRows } from './summary'

describe('tutorialSections', () => {
  const sections = tutorialSections()
  const rowsOf = (id: string): string => sections.find(s => s.id === id)!.rows.flat().join(' | ')

  it('có đủ 5 thẻ theo thứ tự', () => {
    expect(sections.map(s => s.id)).toEqual(['controls', 'wages', 'prices', 'timing', 'roadmap'])
  })

  it('bảng giá có giá đất 2.000, giống 30, phân 40, lúa 8', () => {
    const prices = rowsOf('prices')
    for (const v of ['2.000 Xu', '30 Xu', '40 Xu', '8 Xu/kg']) expect(prices).toContain(v)
  })

  it('bảng tiền công có đủ 10 việc với số khớp CONFIG.wages', () => {
    const wages = sections.find(s => s.id === 'wages')!.rows
    expect(wages).toHaveLength(Object.keys(CONFIG.wages).length)
    expect(wages.map(r => r[1])).toEqual(Object.values(CONFIG.wages).map(w => `${w} Xu`))
  })

  it('bảng thời gian có 180/300/300/240 giây', () => {
    const timing = rowsOf('timing')
    for (const v of ['180 giây', '300 giây', '240 giây']) expect(timing).toContain(v)
  })
})

describe('listLandlordJobs', () => {
  it('chỉ lấy ô Địa chủ, secondsLeft đúng, sắp tăng dần', () => {
    const s = createNewGame('A', 1)
    for (let i = 0; i < 20; i++) s.plots[i] = freshPlot(i + 1, i < 12 ? 'landlord' : 'player')
    s.plots[0].jobAgeSec = { plow: 10 }
    s.plots[1].jobAgeSec = { plow: 50 }
    s.plots[13].jobAgeSec = { plow: 55 } // ô người chơi: bỏ qua
    const jobs = listLandlordJobs(s)
    expect(jobs[0]).toEqual({ plotId: 2, task: 'plow', wage: 15, secondsLeft: 10 })
    expect(jobs[1]).toEqual({ plotId: 1, task: 'plow', wage: 15, secondsLeft: 50 })
    expect(jobs.every(j => j.plotId <= 12)).toBe(true)
    const left = jobs.map(j => j.secondsLeft)
    expect([...left].sort((a, b) => a - b)).toEqual(left)
  })
})

describe('summaryRows', () => {
  it('trả đúng 9 dòng, lãi/lỗ = endXu − startXu, có dấu', () => {
    const s: DaySummary = {
      day: 6, startXu: 4261, endXu: 3981, netXu: -280, landlordTasksDone: 14, wagesEarned: 185,
      riceHarvestedKg: 260, riceSalesXu: 1840, suppliesSpentXu: 210, landAndUpgradeSpentXu: 2000, npcWagesPaidXu: 95,
    }
    const rows = summaryRows(s)
    expect(rows).toHaveLength(9)
    expect(rows.find(r => r.label.startsWith('Lãi'))).toEqual({ label: 'Lãi/lỗ trong ngày', value: '−280 Xu', tone: 'minus' })
    expect(rows.find(r => r.label === 'Tiền công nhận được')).toEqual({ label: 'Tiền công nhận được', value: '+185 Xu', tone: 'plus' })
    expect(rows.find(r => r.label === 'Xu hiện có')!.value).toBe('3.981 Xu')
  })
})
