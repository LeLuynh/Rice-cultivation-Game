import { CONFIG } from './config'
import type { DayStats, GameState } from './state'

/** Giờ trong game từ số giây đã trôi trong ngày (spec 4.9); phút làm tròn xuống. */
export function clockTime(dayElapsedSec: number): { hour: number; minute: number } {
  const { lengthSec, startHour, endHour } = CONFIG.day
  const minutes = Math.floor((dayElapsedSec * (endHour - startHour) * 60) / lengthSec)
  return { hour: startHour + Math.floor(minutes / 60), minute: minutes % 60 }
}

export function emptyDayStats(startXu: number): DayStats {
  return {
    startXu, landlordTasksDone: 0, wagesEarned: 0, riceHarvestedKg: 0, riceSalesXu: 0,
    suppliesSpentXu: 0, landAndUpgradeSpentXu: 0, npcWagesPaidXu: 0,
  }
}

/** Chốt sổ cuối ngày; biến đổi trực tiếp `state` (đã là bản sao). */
export function endDay(state: GameState): void {
  state.daySummary = {
    ...state.dayStats, day: state.day, endXu: state.xu, netXu: state.xu - state.dayStats.startXu,
  }
}

/** Sang ngày mới lúc 6:00; biến đổi trực tiếp `state` (đã là bản sao). */
export function beginNextDay(state: GameState): void {
  state.day++
  state.dayElapsedSec = 0
  state.dayStats = emptyDayStats(state.xu)
  state.daySummary = null
}
