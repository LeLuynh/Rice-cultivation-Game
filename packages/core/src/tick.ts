import { CONFIG, type Stage, type Task } from './config'
import type { ErrorCode, GameEvent } from './actions'
import { nextRandom } from './rng'
import type { GameState, PlotState } from './state'
import { availableTasks, performTaskOnPlot } from './tasks'
import { endDay } from './day'

const NEXT_STAGE: Partial<Record<Stage, Stage>> = {
  seedling: 'seedlingReady',
  young: 'green',
  green: 'flowering',
  flowering: 'ripe',
}

const TEN_SEC = 10

function clampHealth(plot: PlotState): void {
  plot.health = Math.min(100, Math.max(0, plot.health))
}

/** Mỗi 10 giây: nước cạn dần, phạt sức khỏe, lúa chín quá hạn hao kg (spec 4.2–4.3). */
function stepTenSecond(plot: PlotState): void {
  plot.tenSecAccum++
  if (plot.tenSecAccum < TEN_SEC) return
  plot.tenSecAccum = 0
  if (CONFIG.water.drainingStages.includes(plot.stage)) {
    plot.water = Math.max(0, plot.water - CONFIG.water.drainPer10s)
    if (plot.water < CONFIG.water.threshold) plot.health -= CONFIG.penalty.dryPer10s
  }
  if (plot.hasWeeds) plot.health -= CONFIG.penalty.weedPer10s
  if (plot.hasPests) plot.health -= CONFIG.penalty.pestPer10s
  if (plot.stage === 'ripe' && plot.stageElapsedSec > CONFIG.penalty.overripeAfterSec) {
    plot.lostKg += CONFIG.penalty.overripeKgPer10s
  }
  clampHealth(plot)
}

/** Mỗi 60 giây: rút ngẫu nhiên xem có cỏ / sâu xuất hiện không. */
function stepPestCheck(state: GameState, plot: PlotState, events: GameEvent[]): void {
  plot.pestCheckAccum++
  if (plot.pestCheckAccum < CONFIG.pests.checkIntervalSec) return
  plot.pestCheckAccum = 0
  if (CONFIG.pests.weedStages.includes(plot.stage) && !plot.hasWeeds) {
    const [v, next] = nextRandom(state.rngState)
    state.rngState = next
    if (v < CONFIG.pests.weedChance) {
      plot.hasWeeds = true
      events.push({ type: 'weedsAppeared', plotId: plot.id })
    }
  }
  if (CONFIG.pests.pestStages.includes(plot.stage) && !plot.hasPests) {
    const [v, next] = nextRandom(state.rngState)
    state.rngState = next
    if (v < CONFIG.pests.pestChance) {
      plot.hasPests = true
      events.push({ type: 'pestsAppeared', plotId: plot.id })
    }
  }
}

/** Tự chuyển giai đoạn khi đủ thời lượng, kèm phạt nếu thiếu bón phân / tháo nước. */
function stepStageGrowth(plot: PlotState, events: GameEvent[]): void {
  const next = NEXT_STAGE[plot.stage]
  const duration = (CONFIG.stageDurationSec as Partial<Record<Stage, number>>)[plot.stage]
  if (!next || duration === undefined || plot.stageElapsedSec < duration) return
  if (plot.stage === 'green' && !plot.fertilized) plot.health -= CONFIG.penalty.noFertilizer
  if (plot.stage === 'flowering' && !plot.drained) plot.health -= CONFIG.penalty.noDrain
  plot.stage = next
  plot.stageElapsedSec = 0
  clampHealth(plot)
  events.push({ type: 'stageChanged', plotId: plot.id, stage: next })
}

/** Tăng tuổi các việc đang khả dụng, xóa tuổi việc đã hết. Trả về việc chờ lâu nhất. */
function ageJobs(plot: PlotState): Task | null {
  const ages: Partial<Record<Task, number>> = {}
  let oldest: Task | null = null
  for (const task of availableTasks(plot)) {
    ages[task] = (plot.jobAgeSec[task] ?? 0) + 1
    if (oldest === null || ages[task]! > ages[oldest]!) oldest = task
  }
  plot.jobAgeSec = ages
  return oldest
}

/** Người làm của Địa chủ làm thay việc để quá hạn (spec 4.5). */
function landlordWorkerStep(state: GameState, index: number, task: Task, events: GameEvent[]): void {
  if (state.plots[index].jobAgeSec[task]! < CONFIG.landlordJobTimeoutSec) return
  state.plots[index] = performTaskOnPlot(state.plots[index], task).plot
  events.push({ type: 'landlordWorkerDid', plotId: state.plots[index].id, task })
}

function npcShortfall(state: GameState, task: Task): ErrorCode | null {
  if (state.xu < CONFIG.wages[task]) return 'NOT_ENOUGH_XU'
  if (task === 'sow' && state.inventory.seeds < 1) return 'NO_SEED'
  if (task === 'fertilize' && state.inventory.fertilizer < 1) return 'NO_FERTILIZER'
  return null
}

/** NPC người chơi thuê làm việc trên ô đã giao (spec 4.7). */
function npcStep(state: GameState, index: number, task: Task, events: GameEvent[]): void {
  const plot = state.plots[index]
  if (plot.jobAgeSec[task]! < CONFIG.playerNpcDelaySec) return
  const reason = npcShortfall(state, task)
  if (reason) {
    if (plot.npcBlocked !== reason) {
      plot.npcBlocked = reason
      events.push({ type: 'npcBlocked', plotId: plot.id, reason })
    }
    return
  }
  const wage = CONFIG.wages[task]
  state.xu -= wage
  state.dayStats.npcWagesPaidXu += wage
  if (task === 'sow') state.inventory.seeds--
  if (task === 'fertilize') state.inventory.fertilizer--
  const result = performTaskOnPlot(plot, task)
  if (result.harvestedKg !== undefined) {
    state.inventory.riceKg += result.harvestedKg
    state.dayStats.riceHarvestedKg += result.harvestedKg
  }
  state.plots[index] = { ...result.plot, npcBlocked: null }
  events.push({ type: 'npcDid', plotId: plot.id, task, wage })
}

function stepWorkers(state: GameState, index: number, events: GameEvent[]): void {
  const plot = state.plots[index]
  const task = ageJobs(plot)
  if (task === null) return
  if (plot.owner === 'landlord') landlordWorkerStep(state, index, task, events)
  else if (plot.owner === 'player' && plot.npcEnabled) npcStep(state, index, task, events)
}

function stepPlot(state: GameState, index: number, events: GameEvent[]): void {
  const plot = state.plots[index]
  plot.stageElapsedSec++
  stepTenSecond(plot)
  stepPestCheck(state, plot, events)
  stepStageGrowth(plot, events)
  stepWorkers(state, index, events)
}

/** Một giây trôi qua; biến đổi trực tiếp `state` (đã là bản sao). */
function stepOneSecond(state: GameState, events: GameEvent[]): void {
  state.timeSec++
  state.plots.forEach((plot, index) => {
    if (plot.owner !== 'forSale') stepPlot(state, index, events)
  })
}

/** Cho thời gian trôi `dtSeconds` giây (làm tròn xuống). Thuần: không sửa state đầu vào. */
export function tick(state: GameState, dtSeconds: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const seconds = Math.floor(dtSeconds)
  const next = structuredClone(state)
  if (!Number.isFinite(seconds) || seconds <= 0) return { state: next, events }
  for (let i = 0; i < seconds && next.daySummary === null; i++) {
    stepOneSecond(next, events)
    next.dayElapsedSec++
    if (next.dayElapsedSec >= CONFIG.day.lengthSec) {
      endDay(next)
      events.push({ type: 'dayEnded', summary: next.daySummary! })
    }
  }
  return { state: next, events }
}
