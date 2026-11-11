import { CONFIG, type Stage, type Task } from './config'
import type { PlotState } from './state'

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
