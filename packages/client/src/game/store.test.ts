import { describe, it, expect, beforeEach } from 'vitest'
import { useGame } from './store'

// Chạy trong Node: không có window.localStorage → mọi lần lưu đều thất bại.
describe('store', () => {
  beforeEach(() => {
    useGame.setState({ screen: 'start', game: null, panel: null, toasts: [], saveFailed: false, workerVisits: [] })
  })

  it('lưu thất bại → cảnh báo đúng một lần và bật cờ saveFailed', () => {
    useGame.getState().startNew('Tí')
    useGame.getState().dispatch({ type: 'markTutorialSeen' })
    useGame.getState().saveNow()
    const s = useGame.getState()
    expect(s.saveFailed).toBe(true)
    expect(s.toasts.filter(t => t.text.includes('Không lưu được'))).toHaveLength(1)
  })

  it('đóng hướng dẫn bằng phím tắt (setPanel) cũng đánh dấu đã xem', () => {
    useGame.getState().startNew('Tí')
    useGame.getState().setPanel('tutorial')
    useGame.getState().setPanel(null)
    expect(useGame.getState().game!.tutorialSeen).toBe(true)
  })

  it('chơi mới xóa trạng thái tạm của ván trước', () => {
    useGame.setState({ workerVisits: [{ id: 1, plotId: 2, startedAt: 0 }], targetPlotId: 3, actionProgress: 0.5 })
    useGame.getState().startNew('Tí')
    const s = useGame.getState()
    expect(s.workerVisits).toEqual([])
    expect(s.targetPlotId).toBeNull()
    expect(s.actionProgress).toBeNull()
  })
})
