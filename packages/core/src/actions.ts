export type ErrorCode =
  | 'WRONG_STAGE' | 'WRONG_TOOL' | 'NOT_ENOUGH_XU' | 'NO_SEED' | 'NO_FERTILIZER'
  | 'NOT_OWNER' | 'NOT_FOR_SALE' | 'NO_JOB' | 'NPC_LOCKED' | 'MAX_LEVEL'
  | 'NOT_ENOUGH_RICE' | 'INVALID_AMOUNT' | 'DAY_ENDED'

import type { Stage, Task, ToolId } from './config'
import type { DaySummary, GameState } from './state'

export type Action =
  | { type: 'performTask'; plotId: number; task: Task; tool: ToolId }
  | { type: 'buySeeds'; qty: number } | { type: 'buyFertilizer'; qty: number }
  | { type: 'buyLand'; plotId: number } | { type: 'sellRice'; kg: number }
  | { type: 'upgradeTool'; tool: ToolId } | { type: 'setNpc'; plotId: number; enabled: boolean }
  | { type: 'markTutorialSeen' } | { type: 'startNextDay' }

export type GameEvent =
  | { type: 'wagePaid'; plotId: number; task: Task; amount: number }
  | { type: 'riceHarvested'; plotId: number; kg: number; toPlayer: boolean }
  | { type: 'landlordWorkerDid'; plotId: number; task: Task }
  | { type: 'npcDid'; plotId: number; task: Task; wage: number }
  | { type: 'npcBlocked'; plotId: number; reason: ErrorCode }
  | { type: 'stageChanged'; plotId: number; stage: Stage }
  | { type: 'weedsAppeared'; plotId: number } | { type: 'pestsAppeared'; plotId: number }
  | { type: 'dayEnded'; summary: DaySummary }

export type ActionResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: ErrorCode }
