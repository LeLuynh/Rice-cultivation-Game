import { useGame } from '../game/store'
import { Modal } from './Modal'
import { summaryRows } from './summary'

/** Tổng kết ngày lúc 22:00 – không đóng được, chỉ có nút đi ngủ (spec 4.9). */
export function DaySummary() {
  const summary = useGame(s => s.game?.daySummary)
  const { dispatch, setPanel } = useGame.getState()
  if (!summary) return null
  const sleep = (): void => { if (dispatch({ type: 'startNextDay' })) setPanel(null) }
  return (
    <Modal title={`TỔNG KẾT NGÀY ${summary.day}`}>
      <table className="table summary">
        <tbody>
          {summaryRows(summary).map(r => (
            <tr key={r.label} className={r.label.startsWith('Lãi') ? 'summary-total' : ''}>
              <th>{r.label}</th>
              <td className={`tone-${r.tone}`}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn btn-primary btn-big" onClick={sleep}>Ngủ – sang ngày mới</button>
    </Modal>
  )
}

/** Menu tạm dừng (Esc). */
export function PauseMenu() {
  const { setPanel, saveNow, pushToast, exitToStart } = useGame.getState()
  return (
    <Modal title="Tạm dừng" onClose={() => setPanel(null)}>
      <div className="menu">
        <button className="btn btn-primary" onClick={() => setPanel(null)}>Tiếp tục</button>
        <button className="btn" onClick={() => setPanel('tutorial')}>Hướng dẫn</button>
        <button className="btn" onClick={() => {
          const ok = saveNow()
          pushToast(ok ? 'Đã lưu' : 'Không lưu được – trình duyệt chặn bộ nhớ', ok ? 'info' : 'error')
        }}>Lưu</button>
        <button className="btn" onClick={exitToStart}>Về màn hình đầu</button>
      </div>
    </Modal>
  )
}
