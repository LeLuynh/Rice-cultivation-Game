import { CONFIG, type Stage, type Task, type ToolId } from './config'
import type { Action, ActionResult, GameEvent } from './actions'
import type { GameState } from './state'
import { availableTasks, performTaskOnPlot } from './tasks'

const STAGE_BOUND: Partial<Record<Task, true>> = {
  plow: true, sow: true, transplant: true, harvest: true, thresh: true, drain: true,
}
// Giai đoạn cần có để làm việc gắn với stage; drain gắn với flowering.
const REQUIRED_STAGE: Partial<Record<Task, Stage>> = {
  plow: 'dry', sow: 'plowed', transplant: 'seedlingReady', harvest: 'ripe', thresh: 'bundled', drain: 'flowering',
}

function performTask(state: GameState, action: Extract<Action, { type: 'performTask' }>): ActionResult {
  const { plotId, task, tool } = action
  const index = state.plots.findIndex(p => p.id === plotId)
  if (index < 0) return { ok: false, error: 'NOT_OWNER' }
  const plot = state.plots[index]
  if (plot.owner === 'forSale') return { ok: false, error: 'NOT_OWNER' }
  const cfg = CONFIG.tasks[task]
  if (!cfg || tool !== cfg.tool) return { ok: false, error: 'WRONG_TOOL' }

  const mine = plot.owner === 'player'
  const alwaysWater = mine && task === 'water' && CONFIG.water.drainingStages.includes(plot.stage)
  if (!alwaysWater && !availableTasks(plot).includes(task)) {
    if (STAGE_BOUND[task] && plot.stage !== REQUIRED_STAGE[task]) return { ok: false, error: 'WRONG_STAGE' }
    return { ok: false, error: 'NO_JOB' }
  }
  if (mine && task === 'sow' && state.inventory.seeds < 1) return { ok: false, error: 'NO_SEED' }
  if (mine && task === 'fertilize' && state.inventory.fertilizer < 1) return { ok: false, error: 'NO_FERTILIZER' }

  const next = structuredClone(state)
  const events: GameEvent[] = []
  const { plot: newPlot, harvestedKg } = performTaskOnPlot(plot, task)
  next.plots[index] = newPlot
  if (mine && task === 'sow') next.inventory.seeds -= 1
  if (mine && task === 'fertilize') next.inventory.fertilizer -= 1
  if (!mine) {
    const amount = CONFIG.wages[task]
    next.xu += amount
    events.push({ type: 'wagePaid', plotId, task, amount })
  }
  if (harvestedKg !== undefined) {
    if (mine) next.inventory.riceKg += harvestedKg
    events.push({ type: 'riceHarvested', plotId, kg: harvestedKg, toPlayer: mine })
  }
  if (newPlot.stage !== plot.stage) events.push({ type: 'stageChanged', plotId, stage: newPlot.stage })
  return { ok: true, state: next, events }
}

export function ownedPlotCount(state: GameState): number {
  return state.plots.filter(p => p.owner === 'player').length
}

export function isNpcUnlocked(state: GameState): boolean {
  return ownedPlotCount(state) >= CONFIG.npcUnlockPlotCount
}

const isValidAmount = (n: number): boolean => Number.isInteger(n) && n >= 1

function mutate(state: GameState, change: (next: GameState) => void): ActionResult {
  const next = structuredClone(state)
  change(next)
  return { ok: true, state: next, events: [] }
}

function buySupplies(state: GameState, item: 'seeds' | 'fertilizer', qty: number): ActionResult {
  if (!isValidAmount(qty)) return { ok: false, error: 'INVALID_AMOUNT' }
  const cost = qty * (item === 'seeds' ? CONFIG.seedPrice : CONFIG.fertilizerPrice)
  if (state.xu < cost) return { ok: false, error: 'NOT_ENOUGH_XU' }
  return mutate(state, next => { next.xu -= cost; next.inventory[item] += qty })
}

function buyLand(state: GameState, plotId: number): ActionResult {
  const index = state.plots.findIndex(p => p.id === plotId)
  if (index < 0 || state.plots[index].owner !== 'forSale') return { ok: false, error: 'NOT_FOR_SALE' }
  if (state.xu < CONFIG.landPrice) return { ok: false, error: 'NOT_ENOUGH_XU' }
  return mutate(state, next => { next.xu -= CONFIG.landPrice; next.plots[index].owner = 'player' })
}

function sellRice(state: GameState, kg: number): ActionResult {
  if (!isValidAmount(kg)) return { ok: false, error: 'INVALID_AMOUNT' }
  if (kg > state.inventory.riceKg) return { ok: false, error: 'NOT_ENOUGH_RICE' }
  return mutate(state, next => { next.inventory.riceKg -= kg; next.xu += kg * CONFIG.ricePricePerKg })
}

function upgradeTool(state: GameState, tool: ToolId): ActionResult {
  const level = state.toolLevels[tool]
  if (level === undefined) return { ok: false, error: 'NO_JOB' }
  if (level >= 3) return { ok: false, error: 'MAX_LEVEL' }
  const target = (level + 1) as 2 | 3
  const cost = CONFIG.toolUpgradeCost[target]
  if (state.xu < cost) return { ok: false, error: 'NOT_ENOUGH_XU' }
  return mutate(state, next => { next.xu -= cost; next.toolLevels[tool] = target })
}

function setNpc(state: GameState, plotId: number, enabled: boolean): ActionResult {
  if (!isNpcUnlocked(state)) return { ok: false, error: 'NPC_LOCKED' }
  const index = state.plots.findIndex(p => p.id === plotId)
  if (index < 0 || state.plots[index].owner !== 'player') return { ok: false, error: 'NOT_OWNER' }
  return mutate(state, next => {
    next.plots[index].npcEnabled = enabled
    if (!enabled) next.plots[index].npcBlocked = null
  })
}

export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case 'performTask': return performTask(state, action)
    case 'buySeeds': return buySupplies(state, 'seeds', action.qty)
    case 'buyFertilizer': return buySupplies(state, 'fertilizer', action.qty)
    case 'buyLand': return buyLand(state, action.plotId)
    case 'sellRice': return sellRice(state, action.kg)
    case 'upgradeTool': return upgradeTool(state, action.tool)
    case 'setNpc': return setNpc(state, action.plotId, action.enabled)
    case 'markTutorialSeen': return mutate(state, next => { next.tutorialSeen = true })
    default: return { ok: false, error: 'NO_JOB' }
  }
}
