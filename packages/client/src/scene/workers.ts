import { Vector3, type Scene, type ShadowGenerator } from '@babylonjs/core'
import { WORKER_VISIT_MS, type WorkerVisit } from '../game/store'
import { HOUSE_DOOR, teleportPose } from '../game/layout'
import type { Materials } from './materials'
import { createPerson, personMeshes, type Person } from './person'

const WALK_MS = 3000
const WORK_MS = WORKER_VISIT_MS - 2 * WALK_MS
const SHIRTS = ['#7a5a3a', '#4f6b3a', '#8a3f2f', '#3f5a7a']

/** Người làm thuê: đi từ cửa nhà ra ô (3 giây), cúi làm (2 giây), đi về (3 giây) (spec 7). */
export class Workers {
  private people = new Map<number, Person>()

  constructor(private scene: Scene, private m: Materials, private shadows: ShadowGenerator | null) {}

  update(visits: WorkerVisit[], now: number): void {
    const live = new Set(visits.map(v => v.id))
    for (const [id, p] of this.people) {
      if (!live.has(id)) { p.dispose(); this.people.delete(id) }
    }
    const home = new Vector3(HOUSE_DOOR[0], 0, HOUSE_DOOR[1])
    for (const v of visits) {
      let p = this.people.get(v.id)
      if (!p) {
        p = createPerson(this.scene, this.m, { shirt: SHIRTS[v.id % SHIRTS.length], name: `worker${v.id}` })
        for (const mesh of personMeshes(p)) this.shadows?.addShadowCaster(mesh)
        this.people.set(v.id, p)
      }
      const [x, , z] = teleportPose(v.plotId).position
      const field = new Vector3(x, 0, z - 1.2)
      const t = now - v.startedAt
      p.root.setEnabled(t < WORKER_VISIT_MS)
      let pos: Vector3
      let bend = 0
      const walking = t < WALK_MS || t >= WALK_MS + WORK_MS
      if (t < WALK_MS) pos = Vector3.Lerp(home, field, t / WALK_MS)
      else if (t < WALK_MS + WORK_MS) { pos = field; bend = Math.min(1, (t - WALK_MS) / 400) }
      else pos = Vector3.Lerp(field, home, Math.min(1, (t - WALK_MS - WORK_MS) / WALK_MS))
      p.root.position.copyFrom(pos)
      const target = t < WALK_MS + WORK_MS ? field : home
      // mặt người là −z cục bộ: quay để −z hướng về đích
      if (Vector3.Distance(target, pos) > 0.01) p.root.rotation.y = Math.atan2(-(target.x - pos.x), -(target.z - pos.z))
      p.pose({ walk: t / 160, moving: walking, bend, work: t / 200 })
    }
  }
}
