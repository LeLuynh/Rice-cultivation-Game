import { CONFIG, availableTasks, clockTime, type PlotState, type ToolId, type ToolLevel } from '@rice/core'
import { useGame } from '../game/store'
import { STAGE_LABELS, TASK_LABELS, TOOL_LABELS, TOOL_ORDER, formatXu } from './messages'

const OWNER_LABEL: Record<PlotState['owner'], string> = { landlord: 'Địa chủ', player: 'Của bạn', forSale: 'Đang bán' }
const pad = (n: number): string => String(n).padStart(2, '0')

export function toolLabel(tool: ToolId, level: ToolLevel): string {
  if (tool === 'hoe' && level === 2) return 'Trâu cày'
  if (tool === 'hoe' && level === 3) return 'Máy cày'
  return TOOL_LABELS[tool]
}

function PlotInfo({ plot }: { plot: PlotState }) {
  const tasks = availableTasks(plot)
  const needsWater = CONFIG.water.drainingStages.includes(plot.stage)
  return (
    <div className="plot-info">
      <strong>Ô {plot.id}</strong> · {OWNER_LABEL[plot.owner]} · {STAGE_LABELS[plot.stage]}
      {needsWater && <> · Nước {plot.water}%</>}
      {plot.owner !== 'forSale' && <> · Sức khỏe {plot.health}</>}
      {tasks.length > 0 && (
        <div className="plot-tasks">
          Cần: {tasks.map(t => `${TASK_LABELS[t]}${plot.owner === 'landlord' ? ` (+${CONFIG.wages[t]} Xu)` : ''}`).join(', ')}
        </div>
      )}
      {plot.owner === 'forSale' && <div className="plot-tasks">Mua ở nhà Địa chủ: {formatXu(CONFIG.landPrice)}</div>}
    </div>
  )
}

/** HUD khi đang chơi (spec 6.4). */
export function Hud({ nearHouse }: { nearHouse: boolean }) {
  const game = useGame(s => s.game)!
  const target = useGame(s => s.targetPlotId)
  const progress = useGame(s => s.actionProgress)
  const tool = useGame(s => s.selectedTool)
  const setPanel = useGame(s => s.setPanel)
  const { hour, minute } = clockTime(game.dayElapsedSec)
  const plot = target !== null ? game.plots[target - 1] : null

  return (
    <div className="hud">
      <div className="hud-tl">{game.playerName} · <b>{formatXu(game.xu)}</b></div>
      <div className="hud-tr">
        Ngày {game.day} · {pad(hour)}:{pad(minute)}
        <button className="btn btn-help" onClick={() => setPanel('tutorial')} aria-label="Hướng dẫn">?</button>
      </div>
      <div className="crosshair" />
      {plot && <PlotInfo plot={plot} />}
      {progress !== null && (
        <div className="progress"><div className="progress-bar" style={{ width: `${progress * 100}%` }} /></div>
      )}
      {nearHouse && <div className="hint">Nhấn <kbd>E</kbd> để vào nhà Địa chủ</div>}
      <div className="hotbar">
        {TOOL_ORDER.map((t, i) => (
          <div key={t} className={`slot${t === tool ? ' slot-active' : ''}`}>
            <span className="slot-key">{i + 1}</span>
            <span>{toolLabel(t, game.toolLevels[t])}</span>
            {game.toolLevels[t] > 1 && <span className="slot-level">cấp {game.toolLevels[t]}</span>}
          </div>
        ))}
      </div>
      <div className="hud-bl">Tab: bảng ô · J: việc · I: kho · H: hướng dẫn · Esc: menu</div>
    </div>
  )
}
