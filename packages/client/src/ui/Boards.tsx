import { CONFIG, type PlotState } from '@rice/core'
import { useGame } from '../game/store'
import { Modal } from './Modal'
import { STAGE_LABELS, TASK_LABELS, TOOL_LABELS, TOOL_ORDER, formatNumber, formatXu } from './messages'
import { listLandlordJobs } from './jobs'
import { toolLabel } from './Hud'

const OWNER_SHORT: Record<PlotState['owner'], string> = { landlord: 'Địa chủ', player: 'Bạn', forSale: 'Đang bán' }

function plotIcons(p: PlotState): string {
  let icons = ''
  if (CONFIG.water.drainingStages.includes(p.stage) && p.water < CONFIG.water.threshold) icons += '💧'
  if (p.hasWeeds) icons += '🌿'
  if (p.hasPests) icons += '🐛'
  if (p.stage === 'ripe') icons += '🌾'
  return icons
}

/** Bảng ô 1–20: bấm để dịch chuyển (spec 6.5). */
export function PlotBoard() {
  const game = useGame(s => s.game)!
  const { setPanel, teleportTo } = useGame.getState()
  const go = (id: number): void => { teleportTo(id); setPanel(null) }
  return (
    <Modal title="Bảng ô – bấm để tới ô" onClose={() => setPanel(null)} wide>
      <div className="plot-grid">
        {game.plots.map(p => (
          <button key={p.id} className={`plot-cell owner-${p.owner}`} onClick={() => go(p.id)}>
            <b>Ô {p.id}</b>
            <span>{OWNER_SHORT[p.owner]}</span>
            <span>{STAGE_LABELS[p.stage]}</span>
            <span className="icons">{plotIcons(p)}</span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

/** Bảng việc làm thuê trên ruộng Địa chủ (spec 6.5). */
export function JobBoard() {
  const game = useGame(s => s.game)!
  const { setPanel, teleportTo } = useGame.getState()
  const jobs = listLandlordJobs(game)
  return (
    <Modal title="Bảng việc làm thuê" onClose={() => setPanel(null)}>
      {jobs.length === 0 ? <p className="muted">Hiện chưa có việc. Chờ một lát nhé.</p> : (
        <table className="table table-click">
          <thead><tr><th>Ô</th><th>Việc</th><th>Công cụ</th><th>Công</th><th>Còn</th></tr></thead>
          <tbody>
            {jobs.map(j => (
              <tr key={`${j.plotId}-${j.task}`} onClick={() => { teleportTo(j.plotId); setPanel(null) }}>
                <td>{j.plotId}</td>
                <td>{TASK_LABELS[j.task]}</td>
                <td>{TOOL_LABELS[CONFIG.tasks[j.task].tool]} ({TOOL_ORDER.indexOf(CONFIG.tasks[j.task].tool) + 1})</td>
                <td>+{j.wage} Xu</td>
                <td>{j.secondsLeft} giây</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

/** Kho (spec 6.5). */
export function Inventory() {
  const game = useGame(s => s.game)!
  const setPanel = useGame(s => s.setPanel)
  const owned = game.plots.filter(p => p.owner === 'player')
  return (
    <Modal title="Kho" onClose={() => setPanel(null)}>
      <table className="table">
        <tbody>
          <tr><th>Xu</th><td>{formatXu(game.xu)}</td></tr>
          <tr><th>Giống</th><td>{game.inventory.seeds} bao</td></tr>
          <tr><th>Phân</th><td>{game.inventory.fertilizer} bao</td></tr>
          <tr><th>Lúa</th><td>{formatNumber(game.inventory.riceKg)} kg</td></tr>
          {TOOL_ORDER.map(t => (
            <tr key={t}><th>{toolLabel(t, game.toolLevels[t])}</th><td>cấp {game.toolLevels[t]}</td></tr>
          ))}
          <tr><th>Ô sở hữu</th><td>{owned.length ? owned.map(p => p.id).join(', ') : 'chưa có'}</td></tr>
        </tbody>
      </table>
    </Modal>
  )
}
