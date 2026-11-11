import { CONFIG, type Stage } from './config'
import type { GameEvent } from './actions'
import { nextRandom } from './rng'
import type { GameState, PlotState } from './state'

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

function stepPlot(state: GameState, plot: PlotState, events: GameEvent[]): void {
  plot.stageElapsedSec++
  stepTenSecond(plot)
  stepPestCheck(state, plot, events)
  stepStageGrowth(plot, events)
}

/** Một giây trôi qua; biến đổi trực tiếp `state` (đã là bản sao). */
function stepOneSecond(state: GameState, events: GameEvent[]): void {
  state.timeSec++
  for (const plot of state.plots) {
    if (plot.owner === 'forSale') continue
    stepPlot(state, plot, events)
  }
}

/** Cho thời gian trôi `dtSeconds` giây (làm tròn xuống). Thuần: không sửa state đầu vào. */
export function tick(state: GameState, dtSeconds: number): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = []
  const seconds = Math.floor(dtSeconds)
  const next = structuredClone(state)
  if (!(seconds > 0)) return { state: next, events }
  for (let i = 0; i < seconds; i++) stepOneSecond(next, events)
  return { state: next, events }
}
