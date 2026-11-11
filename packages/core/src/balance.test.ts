import { describe, it, expect } from 'vitest'
import { CONFIG } from './config'
import { createNewGame } from './state'
import { applyAction } from './reducer'
import { availableTasks } from './tasks'
import { tick } from './tick'

describe('cân bằng (đối chiếu spec 5.3)', () => {
  it('làm thuê mọi việc ngay khi xuất hiện trong 17 phút kiếm được hơn 500 Xu', () => {
    let s = createNewGame('A', 1)
    for (let sec = 0; sec < 17 * 60; sec++) {
      for (const plot of s.plots) {
        if (plot.owner !== 'landlord') continue
        for (const task of availableTasks(plot)) {
          const r = applyAction(s, { type: 'performTask', plotId: plot.id, task, tool: CONFIG.tasks[task].tool })
          if (r.ok) s = r.state
        }
      }
      s = tick(s, 1).state
      if (s.daySummary) {
        const r = applyAction(s, { type: 'startNextDay' })
        if (r.ok) s = r.state
      }
    }
    console.log(`[cân bằng] Xu sau 17 phút làm thuê: ${s.xu}`)
    expect(s.xu).toBeGreaterThan(500)
  })
})
