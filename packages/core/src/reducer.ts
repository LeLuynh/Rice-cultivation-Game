import { CONFIG, type Stage, type Task } from './config'
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

export function applyAction(state: GameState, action: Action): ActionResult {
  switch (action.type) {
    case 'performTask': return performTask(state, action)
    default: return { ok: false, error: 'NO_JOB' }
  }
}
