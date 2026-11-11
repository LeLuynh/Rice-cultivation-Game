import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGame, WORKER_VISIT_MS, type WorkerVisit } from '../game/store'
import { HOUSE_DOOR, teleportPose } from '../game/layout'
import { Person } from './Person'

const WALK_MS = 3000
const WORK_MS = WORKER_VISIT_MS - 2 * WALK_MS

/** Một NPC: đi từ cửa nhà ra ô (3 giây), cúi làm (2 giây), đi về (3 giây). */
function Worker({ visit }: { visit: WorkerVisit }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const home = new THREE.Vector3(HOUSE_DOOR[0], 0, HOUSE_DOOR[1])
  const [x, , z] = teleportPose(visit.plotId).position
  const field = new THREE.Vector3(x, 0, z)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const t = performance.now() - visit.startedAt
    g.visible = t < WORKER_VISIT_MS
    let pos: THREE.Vector3
    let lean = 0
    if (t < WALK_MS) pos = home.clone().lerp(field, t / WALK_MS)
    else if (t < WALK_MS + WORK_MS) { pos = field; lean = 0.6 }
    else pos = field.clone().lerp(home, Math.min(1, (t - WALK_MS - WORK_MS) / WALK_MS))
    g.position.copy(pos)
    const target = t < WALK_MS + WORK_MS ? field : home
    if (target.distanceTo(pos) > 0.01) g.rotation.y = Math.atan2(target.x - pos.x, target.z - pos.z)
    if (body.current) body.current.rotation.x = lean
  })

  return (
    <group ref={group}>
      <group ref={body}>
        <Person position={[0, 0, 0]} shirt="#7a5a3a" />
      </group>
    </group>
  )
}

/** Người làm thuê đi lại theo các lượt làm việc gần đây (spec 7). */
export function Workers() {
  const visits = useGame(s => s.workerVisits)
  return <>{visits.map(v => <Worker key={v.id} visit={v} />)}</>
}
