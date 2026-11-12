import { Ray, Vector3, type FreeCamera, type Scene } from '@babylonjs/core'
import { useGame } from '../game/store'
import { EYE_HEIGHT, HOUSE_DOOR, HOUSE_INTERACT_RADIUS, teleportPose } from '../game/layout'
import { INTERACT_DISTANCE, actionDurationSec, actionHint, moveWithCollision, taskForTool } from '../game/interaction'
import { TOOL_ORDER } from '../ui/messages'
import { clampPitch, lookDirection } from './view'

const WALK_SPEED = 4
const RUN_SPEED = 7
const MOUSE_SENSITIVITY = 0.0022

/** Điều khiển góc nhìn thứ nhất: khóa chuột, xoay nhìn, WASD, nhắm ô, giữ chuột để làm việc, dịch chuyển (spec 6.3). */
export class PlayerController {
  private keys = new Set<string>()
  private holding = false
  private progress = 0
  private progressKey = ''
  private yaw = Math.PI
  private pitch = -0.2
  private cleanup: (() => void)[] = []
  moving = false

  constructor(private scene: Scene, private camera: FreeCamera, private canvas: HTMLCanvasElement) {
    // vị trí xuất phát: trước cửa nhà Địa chủ, nhìn ra cánh đồng
    camera.position.set(HOUSE_DOOR[0], EYE_HEIGHT, HOUSE_DOOR[1] + 3)
    this.applyLook()

    const locked = (): boolean => document.pointerLockElement === canvas
    this.on(canvas, 'click', () => {
      if (useGame.getState().panel === null && !locked()) void canvas.requestPointerLock()
    })
    this.on(document, 'mousemove', (e: MouseEvent) => {
      if (!locked()) return
      this.yaw -= e.movementX * MOUSE_SENSITIVITY
      this.pitch = clampPitch(this.pitch - e.movementY * MOUSE_SENSITIVITY)
      this.applyLook()
    })
    this.on(window, 'keydown', (e: KeyboardEvent) => {
      if (useGame.getState().panel !== null) return
      this.keys.add(e.code)
      const digit = Number(e.key)
      if (digit >= 1 && digit <= TOOL_ORDER.length) useGame.getState().selectTool(TOOL_ORDER[digit - 1])
    })
    this.on(window, 'keyup', (e: KeyboardEvent) => { this.keys.delete(e.code) })
    this.on(window, 'mousedown', (e: MouseEvent) => {
      if (e.button !== 0 || !locked()) return
      this.holding = true
      // bấm mà không làm được gì thì nói rõ vì sao (sai dụng cụ, ô chưa cần làm, đứng xa)
      const { game, panel, targetPlotId, selectedTool, pushToast } = useGame.getState()
      if (!game || panel !== null) return
      const hint = actionHint(targetPlotId !== null ? game.plots[targetPlotId - 1] : null, selectedTool)
      if (hint) pushToast(hint, 'error')
    })
    this.on(window, 'mouseup', (e: MouseEvent) => { if (e.button === 0) this.holding = false })
    this.on(window, 'blur', () => { this.keys.clear(); this.holding = false })
  }

  private on<E extends Event>(target: EventTarget, type: string, fn: (e: E) => void): void {
    const handler = fn as EventListener
    target.addEventListener(type, handler)
    this.cleanup.push(() => target.removeEventListener(type, handler))
  }

  private applyLook(): void {
    const [x, y, z] = lookDirection(this.yaw, this.pitch)
    this.camera.setTarget(this.camera.position.add(new Vector3(x, y, z)))
  }

  /** Mỗi khung hình. Trả true nếu đang làm việc (để vung dụng cụ). */
  update(dt: number): boolean {
    const store = useGame.getState()
    const { game, panel } = store
    if (!game) return false
    const cam = this.camera

    if (store.teleportTarget !== null) {
      const pose = teleportPose(store.teleportTarget)
      cam.position.set(...pose.position)
      this.yaw = pose.yaw
      this.pitch = pose.pitch
      store.clearTeleport()
    }

    const free = panel === null
    if (!free) {
      this.keys.clear()
      this.holding = false
    }

    // đi lại theo hướng nhìn (chỉ trên mặt phẳng XZ)
    const k = this.keys
    const forward = Number(k.has('KeyW')) - Number(k.has('KeyS'))
    const strafe = Number(k.has('KeyD')) - Number(k.has('KeyA'))
    this.moving = forward !== 0 || strafe !== 0
    if (this.moving) {
      const fx = -Math.sin(this.yaw)
      const fz = -Math.cos(this.yaw)
      let mx = fx * forward + Math.cos(this.yaw) * strafe
      let mz = fz * forward - Math.sin(this.yaw) * strafe
      const len = Math.hypot(mx, mz)
      mx /= len
      mz /= len
      const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED) * Math.min(dt, 0.1)
      const [x, z] = moveWithCollision([cam.position.x, cam.position.z], [cam.position.x + mx * speed, cam.position.z + mz * speed])
      cam.position.set(x, EYE_HEIGHT, z)
    }
    this.applyLook()

    store.setNearHouse(Math.hypot(cam.position.x - HOUSE_DOOR[0], cam.position.z - HOUSE_DOOR[1]) <= HOUSE_INTERACT_RADIUS)

    // nhắm ô ở tâm màn hình
    const [dx, dy, dz] = lookDirection(this.yaw, this.pitch)
    const ray = new Ray(cam.position.clone(), new Vector3(dx, dy, dz), INTERACT_DISTANCE)
    const hit = this.scene.pickWithRay(ray, mesh => mesh.metadata?.plotId !== undefined)
    const targetId: number | null = hit?.hit ? hit.pickedMesh!.metadata.plotId : null
    store.setTarget(targetId)

    // giữ chuột trái để làm việc
    const plot = targetId !== null ? game.plots[targetId - 1] : null
    const task = plot && free ? taskForTool(plot, store.selectedTool) : null
    const key = task ? `${targetId}:${task}` : ''
    if (!this.holding || !task || key !== this.progressKey) {
      this.progress = 0
      this.progressKey = key
      if (!this.holding || !task) {
        store.setActionProgress(null)
        return false
      }
    }
    this.progress += dt / actionDurationSec(task, game.toolLevels[store.selectedTool])
    if (this.progress >= 1) {
      this.holding = false
      this.progress = 0
      store.setActionProgress(null)
      store.dispatch({ type: 'performTask', plotId: targetId!, task, tool: store.selectedTool })
      return false
    }
    store.setActionProgress(Math.round(this.progress * 100) / 100)
    return true
  }

  dispose(): void { for (const c of this.cleanup) c() }
}
