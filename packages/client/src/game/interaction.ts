import { CONFIG, availableTasks, type PlotState, type Task, type ToolId, type ToolLevel } from '@rice/core'
import { HOUSE_BOX, WORLD_BOUNDS } from './layout'

/** Khoảng cách tối đa (m) từ người chơi tới điểm nhắm trên ô. */
export const INTERACT_DISTANCE = 6
/** Bán kính thân người chơi khi va chạm với nhà. */
const BODY_RADIUS = 0.3

/** Việc mà công cụ đang cầm làm được trên ô; ô của mình được tưới bất cứ lúc nào ở giai đoạn cần nước. */
export function taskForTool(plot: PlotState, tool: ToolId): Task | null {
  const tasks = availableTasks(plot)
  if (plot.owner === 'player' && CONFIG.water.drainingStages.includes(plot.stage) && !tasks.includes('water')) {
    tasks.push('water')
  }
  return tasks.find(t => CONFIG.tasks[t].tool === tool) ?? null
}

export function actionDurationSec(task: Task, level: ToolLevel): number {
  return CONFIG.tasks[task].baseSec * CONFIG.toolSpeedMultiplier[level]
}

function insideHouse(x: number, z: number): boolean {
  return x > HOUSE_BOX.min[0] - BODY_RADIUS && x < HOUSE_BOX.max[0] + BODY_RADIUS
    && z > HOUSE_BOX.min[1] - BODY_RADIUS && z < HOUSE_BOX.max[1] + BODY_RADIUS
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))

/** Bước di chuyển: kẹp trong bản đồ, không vào nhà (trượt dọc cạnh tường). */
export function moveWithCollision(from: [number, number], to: [number, number]): [number, number] {
  const x = clamp(to[0], WORLD_BOUNDS.min[0], WORLD_BOUNDS.max[0])
  const z = clamp(to[1], WORLD_BOUNDS.min[1], WORLD_BOUNDS.max[1])
  if (!insideHouse(x, z)) return [x, z]
  if (!insideHouse(x, from[1])) return [x, from[1]]
  if (!insideHouse(from[0], z)) return [from[0], z]
  return from
}
