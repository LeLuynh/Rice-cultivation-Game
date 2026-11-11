import { CONFIG, type GameState, type Task } from '@rice/core'

export interface LandlordJob { plotId: number; task: Task; wage: number; secondsLeft: number }

/** Việc đang chờ trên ruộng Địa chủ, sắp xếp theo thời gian còn lại tăng dần. */
export function listLandlordJobs(state: GameState): LandlordJob[] {
  const jobs: LandlordJob[] = []
  for (const plot of state.plots) {
    if (plot.owner !== 'landlord') continue
    for (const [task, age] of Object.entries(plot.jobAgeSec) as [Task, number][]) {
      jobs.push({ plotId: plot.id, task, wage: CONFIG.wages[task], secondsLeft: Math.max(0, CONFIG.landlordJobTimeoutSec - age) })
    }
  }
  return jobs.sort((a, b) => a.secondsLeft - b.secondsLeft || a.plotId - b.plotId)
}
