import { useState } from 'react'
import { CONFIG, isNpcUnlocked } from '@rice/core'
import { useGame } from '../game/store'
import { Modal, Tabs } from './Modal'
import { ERROR_MESSAGES, STAGE_LABELS, TOOL_ORDER, formatNumber, formatXu } from './messages'
import { toolLabel } from './Hud'

type Tab = 'sell' | 'supplies' | 'land' | 'tools' | 'npc'

function QtyRow({ label, unitPrice, onBuy }: { label: string; unitPrice: number; onBuy: (qty: number) => void }) {
  const [qty, setQty] = useState(1)
  return (
    <div className="shop-row">
      <span>{label} – {formatXu(unitPrice)}/bao</span>
      <input type="number" min={1} step={1} value={qty} onChange={e => setQty(Number(e.target.value))} />
      <button className="btn btn-primary" onClick={() => onBuy(qty)}>Mua ({formatXu(unitPrice * (qty || 0))})</button>
    </div>
  )
}

/** Nhà Địa chủ: bán lúa, mua vật tư, mua đất, nâng cấp, thuê NPC (spec 6.5). */
export function LandlordHouse() {
  const game = useGame(s => s.game)!
  const { dispatch, setPanel } = useGame.getState()
  const [tab, setTab] = useState<Tab>('sell')
  const [kg, setKg] = useState(0)
  const unlocked = isNpcUnlocked(game)
  const owned = game.plots.filter(p => p.owner === 'player')

  return (
    <Modal title="Nhà Địa chủ" onClose={() => setPanel(null)} wide>
      <Tabs<Tab>
        tabs={[
          { id: 'sell', label: 'Bán lúa' },
          { id: 'supplies', label: 'Mua giống/phân' },
          { id: 'land', label: 'Mua đất' },
          { id: 'tools', label: 'Nâng cấp công cụ' },
          { id: 'npc', label: 'Thuê NPC' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'sell' && (
        <div className="shop">
          <p>Trong kho: <b>{formatNumber(game.inventory.riceKg)} kg</b> · Giá {CONFIG.ricePricePerKg} Xu/kg, không thuế</p>
          <div className="shop-row">
            <input type="number" min={1} step={1} value={kg || ''} placeholder="Số kg" onChange={e => setKg(Number(e.target.value))} />
            <button className="btn btn-primary" onClick={() => { if (dispatch({ type: 'sellRice', kg })) setKg(0) }}>
              Bán ({formatXu(Math.max(0, kg) * CONFIG.ricePricePerKg)})
            </button>
            <button className="btn" disabled={game.inventory.riceKg < 1}
              onClick={() => dispatch({ type: 'sellRice', kg: game.inventory.riceKg })}>Bán hết</button>
          </div>
        </div>
      )}
      {tab === 'supplies' && (
        <div className="shop">
          <p>Có: {game.inventory.seeds} bao giống · {game.inventory.fertilizer} bao phân · {formatXu(game.xu)}</p>
          <QtyRow label="Giống" unitPrice={CONFIG.seedPrice} onBuy={qty => dispatch({ type: 'buySeeds', qty })} />
          <QtyRow label="Phân" unitPrice={CONFIG.fertilizerPrice} onBuy={qty => dispatch({ type: 'buyFertilizer', qty })} />
        </div>
      )}
      {tab === 'land' && (
        <div className="shop">
          <p>Giá mỗi ô: <b>{formatXu(CONFIG.landPrice)}</b> · Bạn có {formatXu(game.xu)}</p>
          {game.plots.filter(p => p.owner === 'forSale').map(p => (
            <div key={p.id} className="shop-row">
              <span>Ô {p.id}</span>
              <button className="btn btn-primary" disabled={game.xu < CONFIG.landPrice}
                onClick={() => dispatch({ type: 'buyLand', plotId: p.id })}>Mua</button>
            </div>
          ))}
          {game.plots.every(p => p.owner !== 'forSale') && <p className="muted">Đã bán hết đất.</p>}
        </div>
      )}
      {tab === 'tools' && (
        <div className="shop">
          {TOOL_ORDER.map(t => {
            const level = game.toolLevels[t]
            const next = level < 3 ? CONFIG.toolUpgradeCost[(level + 1) as 2 | 3] : null
            return (
              <div key={t} className="shop-row">
                <span>{toolLabel(t, level)} – cấp {level}</span>
                {next === null ? <span className="muted">Tối đa</span> : (
                  <button className="btn btn-primary" onClick={() => dispatch({ type: 'upgradeTool', tool: t })}>
                    Lên cấp {level + 1} ({formatXu(next)})
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {tab === 'npc' && (
        <div className="shop">
          {!unlocked ? (
            <p className="muted">Cần sở hữu {CONFIG.npcUnlockPlotCount} ô (bạn có {owned.length}).</p>
          ) : owned.map(p => (
            <div key={p.id} className="shop-row">
              <span>Ô {p.id} · {STAGE_LABELS[p.stage]}</span>
              <label className="switch">
                <input type="checkbox" checked={p.npcEnabled}
                  onChange={e => dispatch({ type: 'setNpc', plotId: p.id, enabled: e.target.checked })} />
                Giao cho NPC
              </label>
              {p.npcBlocked && <span className="field-error">Dừng: {ERROR_MESSAGES[p.npcBlocked]}</span>}
            </div>
          ))}
          {unlocked && <p className="muted">NPC làm mỗi việc sau 20 giây, bạn trả công theo bảng tiền công.</p>}
        </div>
      )}
    </Modal>
  )
}
