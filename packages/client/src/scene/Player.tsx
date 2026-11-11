import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'
import { useGame } from '../game/store'
import { EYE_HEIGHT, HOUSE_DOOR, HOUSE_INTERACT_RADIUS, teleportPose } from '../game/layout'
import { INTERACT_DISTANCE, actionDurationSec, moveWithCollision, taskForTool } from '../game/interaction'
import { TOOL_ORDER } from '../ui/messages'

const WALK_SPEED = 4
const RUN_SPEED = 7
const CENTER = new THREE.Vector2(0, 0)

/** Điều khiển góc nhìn thứ nhất: đi lại, nhắm ô, giữ chuột để làm việc, dịch chuyển (spec 6.3). */
export function Player() {
  const { camera, scene, gl } = useThree()
  const keys = useRef(new Set<string>())
  const holding = useRef(false)
  const progress = useRef(0)
  const progressKey = useRef('')
  const raycaster = useRef(new THREE.Raycaster())

  // vị trí xuất phát: trước cửa nhà Địa chủ, nhìn ra cánh đồng
  useEffect(() => {
    camera.position.set(HOUSE_DOOR[0], EYE_HEIGHT, HOUSE_DOOR[1] + 3)
    camera.rotation.set(-0.2, Math.PI, 0, 'YXZ')
  }, [camera])

  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      if (useGame.getState().panel !== null) return
      keys.current.add(e.code)
      const digit = Number(e.key)
      if (digit >= 1 && digit <= TOOL_ORDER.length) useGame.getState().selectTool(TOOL_ORDER[digit - 1])
    }
    const up = (e: KeyboardEvent): void => { keys.current.delete(e.code) }
    const mouseDown = (e: MouseEvent): void => {
      if (e.button === 0 && document.pointerLockElement === gl.domElement) holding.current = true
    }
    const mouseUp = (e: MouseEvent): void => { if (e.button === 0) holding.current = false }
    const blur = (): void => { keys.current.clear(); holding.current = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousedown', mouseDown)
    window.addEventListener('mouseup', mouseUp)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousedown', mouseDown)
      window.removeEventListener('mouseup', mouseUp)
      window.removeEventListener('blur', blur)
    }
  }, [gl])

  useFrame((_, delta) => {
    const store = useGame.getState()
    const { game, panel } = store
    if (!game) return

    if (store.teleportTarget !== null) {
      const pose = teleportPose(store.teleportTarget)
      camera.position.set(...pose.position)
      camera.rotation.set(pose.pitch, pose.yaw, 0, 'YXZ')
      store.clearTeleport()
    }

    const free = panel === null
    if (!free) {
      keys.current.clear()
      holding.current = false
    }

    // đi lại theo hướng nhìn (chỉ trên mặt phẳng XZ)
    const k = keys.current
    const forward = Number(k.has('KeyW')) - Number(k.has('KeyS'))
    const strafe = Number(k.has('KeyD')) - Number(k.has('KeyA'))
    if (forward !== 0 || strafe !== 0) {
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      dir.y = 0
      dir.normalize()
      const right = new THREE.Vector3(-dir.z, 0, dir.x)
      const move = dir.multiplyScalar(forward).add(right.multiplyScalar(strafe)).normalize()
      const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED) * Math.min(delta, 0.1)
      const [x, z] = moveWithCollision(
        [camera.position.x, camera.position.z],
        [camera.position.x + move.x * speed, camera.position.z + move.z * speed],
      )
      camera.position.set(x, EYE_HEIGHT, z)
    }

    store.setNearHouse(Math.hypot(camera.position.x - HOUSE_DOOR[0], camera.position.z - HOUSE_DOOR[1]) <= HOUSE_INTERACT_RADIUS)

    // nhắm ô ở tâm màn hình
    const grounds: THREE.Object3D[] = []
    scene.traverse(o => { if (o.userData.plotId) grounds.push(o) })
    raycaster.current.setFromCamera(CENTER, camera)
    raycaster.current.far = INTERACT_DISTANCE
    const hit = raycaster.current.intersectObjects(grounds, false)[0]
    const targetId: number | null = hit ? hit.object.userData.plotId : null
    store.setTarget(targetId)

    // giữ chuột trái để làm việc
    const plot = targetId !== null ? game.plots[targetId - 1] : null
    const task = plot && free ? taskForTool(plot, store.selectedTool) : null
    const key = task ? `${targetId}:${task}` : ''
    if (!holding.current || !task || key !== progressKey.current) {
      progress.current = 0
      progressKey.current = key
      if (!holding.current || !task) {
        store.setActionProgress(null)
        return
      }
    }
    const duration = actionDurationSec(task, game.toolLevels[store.selectedTool])
    progress.current += delta / duration
    if (progress.current >= 1) {
      holding.current = false
      progress.current = 0
      store.setActionProgress(null)
      store.dispatch({ type: 'performTask', plotId: targetId!, task, tool: store.selectedTool })
      return
    }
    store.setActionProgress(Math.round(progress.current * 100) / 100)
  })

  return <PointerLockControls />
}
