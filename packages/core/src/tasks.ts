import { CONFIG, type Stage, type Task } from './config'
import { freshPlot, type PlotState } from './state'

const STAGE_TASK: Partial<Record<Stage, Task>> = {
  dry: 'plow',
  plowed: 'sow',
  seedlingReady: 'transplant',
  ripe: 'harvest',
  bundled: 'thresh',
}

/** Các việc đang khả dụng trên ô (spec 4.5). Ô đang bán không có việc. */
export function availableTasks(plot: PlotState): Task[] {
  if (plot.owner === 'forSale') return []
  const tasks: Task[] = []
  const main = STAGE_TASK[plot.stage]
  if (main) tasks.push(main)
  if (CONFIG.water.drainingStages.includes(plot.stage) && plot.water < CONFIG.water.threshold) tasks.push('water')
  if ((plot.stage === 'young' || plot.stage === 'green') && !plot.fertilized) tasks.push('fertilize')
  if (plot.hasWeeds) tasks.push('weed')
  if (plot.hasPests) tasks.push('pestControl')
  if (plot.stage === 'flowering' && !plot.drained) tasks.push('drain')
  return tasks
}

/** Sản lượng (kg) của ô khi tuốt lúa (spec 4.3). */
export function computeYieldKg(plot: PlotState): number {
  const base = Math.round(40 + (60 * plot.health) / 100)
  return Math.max(CONFIG.yieldKg.min, base - plot.lostKg)
}

/** Chỉ biến đổi ô (trả ô mới); giả định task đã được kiểm tra hợp lệ. */
export function performTaskOnPlot(plot: PlotState, task: Task): { plot: PlotState; harvestedKg?: number } {
  const next: PlotState = { ...plot, jobAgeSec: { ...plot.jobAgeSec } }
  delete next.jobAgeSec[task]
  const setStage = (stage: Stage): void => {
    next.stage = stage
    next.stageElapsedSec = 0
  }
  switch (task) {
    case 'plow': setStage('plowed'); break
    case 'sow': setStage('seedling'); next.water = CONFIG.water.start; break
    case 'transplant': setStage('young'); break
    case 'water': next.water = CONFIG.water.start; break
    case 'drain': next.water = 0; next.drained = true; break
    case 'fertilize': next.fertilized = true; break
    case 'weed': next.hasWeeds = false; break
    case 'pestControl': next.hasPests = false; break
    case 'harvest': setStage('bundled'); break
    case 'thresh': {
      const fresh = freshPlot(plot.id, plot.owner)
      fresh.npcEnabled = plot.npcEnabled
      return { plot: fresh, harvestedKg: computeYieldKg(plot) }
    }
  }
  return { plot: next }
}
