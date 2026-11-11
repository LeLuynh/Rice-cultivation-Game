import { CONFIG, type Stage, type Task, type ToolId, type ToolLevel } from './config'
import { nextRandom } from './rng'
import type { ErrorCode } from './actions'

export type PlotOwner = 'landlord' | 'player' | 'forSale'

export interface PlotState {
  id: number
  owner: PlotOwner
  stage: Stage
  stageElapsedSec: number
  water: number
  health: number
  fertilized: boolean
  drained: boolean
  hasWeeds: boolean
  hasPests: boolean
  lostKg: number
  tenSecAccum: number
  pestCheckAccum: number
  /** Tuổi (giây) của từng việc đang khả dụng. */
  jobAgeSec: Partial<Record<Task, number>>
  npcEnabled: boolean
  npcBlocked: ErrorCode | null
}

export interface DayStats {
  startXu: number
  landlordTasksDone: number
  wagesEarned: number
  riceHarvestedKg: number
  riceSalesXu: number
  suppliesSpentXu: number
  landAndUpgradeSpentXu: number
  npcWagesPaidXu: number
}

export interface DaySummary extends DayStats {
  day: number
  endXu: number
  netXu: number
}

export interface GameState {
  version: 1
  playerName: string
  xu: number
  inventory: { seeds: number; fertilizer: number; riceKg: number }
  toolLevels: Record<ToolId, ToolLevel>
  /** plots[i].id === i + 1 */
  plots: PlotState[]
  rngState: number
  timeSec: number
  tutorialSeen: boolean
  day: number
  dayElapsedSec: number
  dayStats: DayStats
  daySummary: DaySummary | null
}

export function freshPlot(id: number, owner: PlotOwner): PlotState {
  return {
    id, owner, stage: 'dry', stageElapsedSec: 0,
    water: 0, health: 100, fertilized: false, drained: false,
    hasWeeds: false, hasPests: false, lostKg: 0,
    tenSecAccum: 0, pestCheckAccum: 0, jobAgeSec: {},
    npcEnabled: false, npcBlocked: null,
  }
}

const INITIAL_STAGES: Stage[] = ['dry', 'plowed', 'seedling', 'young', 'green', 'flowering', 'ripe']
const AFTER_SEEDLING = ['seedling', 'young', 'green', 'flowering', 'ripe']

export function createNewGame(playerName: string, seed: number): GameState {
  let rng = seed
  const draw = (): number => {
    const [v, next] = nextRandom(rng)
    rng = next
    return v
  }

  const plots: PlotState[] = []
  for (let id = 1; id <= CONFIG.plotCount; id++) {
    if (!CONFIG.landlordPlotIds.includes(id)) {
      plots.push(freshPlot(id, 'forSale'))
      continue
    }
    const plot = freshPlot(id, 'landlord')
    plot.stage = INITIAL_STAGES[Math.floor(draw() * INITIAL_STAGES.length)]
    const duration = (CONFIG.stageDurationSec as Partial<Record<Stage, number>>)[plot.stage]
    plot.stageElapsedSec = duration === undefined ? 0 : Math.floor(draw() * duration)
    if (AFTER_SEEDLING.includes(plot.stage)) plot.water = CONFIG.water.start
    if (plot.stage === 'flowering' || plot.stage === 'ripe') plot.fertilized = true
    if (plot.stage === 'ripe') plot.drained = true
    plots.push(plot)
  }

  return {
    version: 1,
    playerName,
    xu: CONFIG.startingXu,
    inventory: { seeds: 0, fertilizer: 0, riceKg: 0 },
    toolLevels: { hoe: 1, seedBasket: 1, waterScoop: 1, fertilizerBag: 1, sickle: 1, hands: 1 },
    plots,
    rngState: rng,
    timeSec: 0,
    tutorialSeen: false,
    day: 1,
    dayElapsedSec: 0,
    dayStats: {
      startXu: CONFIG.startingXu, landlordTasksDone: 0, wagesEarned: 0, riceHarvestedKg: 0,
      riceSalesXu: 0, suppliesSpentXu: 0, landAndUpgradeSpentXu: 0, npcWagesPaidXu: 0,
    },
    daySummary: null,
  }
}
