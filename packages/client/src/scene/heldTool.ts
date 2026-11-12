import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3, type Camera, type Scene } from '@babylonjs/core'
import type { ToolId } from '@rice/core'
import type { Materials } from './materials'

// Hệ tọa độ của camera (tay phải): +x phải, +y lên, −z phía trước.
const REST = new Vector3(0.34, -0.36, -0.62)
const EQUIP_SEC = 0.3

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3)

function tube(scene: Scene, name: string, from: Vector3, to: Vector3, radius: number, mat: StandardMaterial, parent: TransformNode): Mesh {
  const m = MeshBuilder.CreateTube(name, { path: [from, to], radius, tessellation: 8, cap: Mesh.CAP_ALL }, scene)
  m.material = mat
  m.parent = parent
  return m
}

function buildTool(scene: Scene, m: Materials, tool: ToolId, parent: TransformNode): TransformNode {
  const root = new TransformNode(`held-${tool}`, scene)
  root.parent = parent
  switch (tool) {
    case 'sickle': {
      tube(scene, 'sickle-handle', new Vector3(0, -0.14, 0), new Vector3(0, 0.08, 0), 0.02, m.wood, root)
      const outer: Vector3[] = []
      const inner: Vector3[] = []
      const c = new Vector3(-0.1, 0.1, 0)
      for (let i = 0; i <= 14; i++) {
        const t = i / 14
        const a = (-0.15 + t * 2.9)
        const r = 0.17
        const w = 0.04 * (1 - t) + 0.004
        outer.push(c.add(new Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)))
        inner.push(c.add(new Vector3(Math.cos(a) * (r - w), Math.sin(a) * (r - w), 0)))
      }
      const blade = MeshBuilder.CreateRibbon('sickle-blade', { pathArray: [outer, inner] }, scene)
      const steel = m.metal.clone('steel') as StandardMaterial
      steel.backFaceCulling = false
      steel.twoSidedLighting = true
      blade.material = steel
      blade.parent = root
      root.rotation.set(0.25, 0.5, -0.15)
      break
    }
    case 'hoe': {
      const top = new Vector3(-0.22, 0.42, -0.3)
      tube(scene, 'hoe-handle', new Vector3(0.04, -0.16, 0.06), top, 0.022, m.wood, root)
      const blade = MeshBuilder.CreateBox('hoe-blade', { width: 0.14, height: 0.015, depth: 0.2 }, scene)
      blade.position = top.add(new Vector3(0, -0.03, -0.1))
      blade.rotation.x = -0.35
      blade.material = m.metal
      blade.parent = root
      break
    }
    case 'waterScoop': {
      const shell = MeshBuilder.CreateSphere('scoop-shell', { diameter: 0.22, segments: 10, slice: 0.5, sideOrientation: Mesh.DOUBLESIDE }, scene)
      shell.rotation.x = Math.PI
      shell.position.set(-0.05, 0.08, -0.42)
      shell.material = m.darkWood
      shell.parent = root
      tube(scene, 'scoop-handle', new Vector3(0, -0.05, 0.1), new Vector3(-0.05, 0.08, -0.32), 0.016, m.bamboo, root)
      break
    }
    case 'seedBasket': {
      const basket = MeshBuilder.CreateCylinder('basket', { height: 0.12, diameterTop: 0.36, diameterBottom: 0.26, tessellation: 16 }, scene)
      basket.position.set(-0.05, 0.02, -0.12)
      basket.material = m.straw
      basket.parent = root
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9
        const seed = MeshBuilder.CreateCylinder(`seedling${i}`, { height: 0.16, diameterTop: 0, diameterBottom: 0.04, tessellation: 4 }, scene)
        seed.position.set(-0.05 + Math.cos(a) * 0.09, 0.14, -0.12 + Math.sin(a) * 0.09)
        seed.material = m.bamboo
        seed.parent = root
      }
      break
    }
    case 'fertilizerBag': {
      const bag = MeshBuilder.CreateBox('bag', { width: 0.26, height: 0.34, depth: 0.14 }, scene)
      bag.position.set(-0.04, 0.08, -0.1)
      bag.material = m.sack
      bag.parent = root
      break
    }
    case 'hands':
      break
  }
  return root
}

/** Tay phải cầm dụng cụ ở góc dưới bên phải; đổi dụng cụ thì hạ xuống rồi nâng lên, làm việc thì vung. */
export class HeldTool {
  private holder: TransformNode
  private tools = new Map<ToolId, TransformNode>()
  private current: ToolId | null = null
  private equip = 1
  private phase = 0
  private walkPhase = 0

  constructor(private scene: Scene, private m: Materials, camera: Camera) {
    this.holder = new TransformNode('heldTool', scene)
    this.holder.parent = camera
    const sleeveMat = new StandardMaterial('sleeve', scene)
    sleeveMat.diffuseColor = Color3.FromHexString('#3d5f8a')
    sleeveMat.specularColor = Color3.Black()
    // cẳng tay từ mép dưới màn hình vào tới bàn tay (gốc tọa độ là chỗ cầm)
    tube(scene, 'sleeve', new Vector3(0.22, -0.3, 0.42), new Vector3(0.1, -0.16, 0.22), 0.07, sleeveMat, this.holder)
    tube(scene, 'forearm', new Vector3(0.1, -0.16, 0.22), new Vector3(0.0, -0.03, 0.04), 0.045, m.skin, this.holder)
    const hand = MeshBuilder.CreateCapsule('hand', { height: 0.13, radius: 0.045, tessellation: 8 }, scene)
    hand.material = m.skin
    hand.parent = this.holder
    this.setup()
  }

  private setup(): void {
    for (const mesh of this.holder.getChildMeshes()) {
      mesh.renderingGroupId = 1
      mesh.isPickable = false
    }
  }

  select(tool: ToolId): void {
    if (tool === this.current) return
    this.current = tool
    this.equip = 0
    for (const [id, node] of this.tools) node.setEnabled(id === tool)
    if (!this.tools.has(tool)) {
      this.tools.set(tool, buildTool(this.scene, this.m, tool, this.holder))
      this.setup()
    }
  }

  update(dt: number, acting: boolean, moving: boolean): void {
    this.equip = Math.min(1, this.equip + dt / EQUIP_SEC)
    this.phase = acting ? this.phase + dt * 9 : 0
    this.walkPhase = moving ? this.walkPhase + dt * 9 : this.walkPhase * 0.9
    const s = Math.sin(this.phase)
    const pos = REST.clone()
    pos.y -= (1 - easeOut(this.equip)) * 0.45
    if (moving) {
      pos.y += Math.abs(Math.sin(this.walkPhase)) * 0.02
      pos.x += Math.sin(this.walkPhase) * 0.012
    }
    const rot = new Vector3(0, 0, 0)
    if (acting) {
      switch (this.current) {
        case 'sickle': rot.y = s * 0.7; rot.z = s * 0.3; pos.x -= s * 0.12; break
        case 'hoe': rot.x = -Math.abs(s) * 0.9; pos.y += Math.abs(s) * 0.08; break
        case 'waterScoop': rot.z = (s * 0.5 + 0.5) * 0.9; pos.z -= 0.06; break
        case 'seedBasket': pos.z -= Math.abs(s) * 0.12; pos.y -= Math.abs(s) * 0.06; break
        case 'fertilizerBag': rot.z = s * 0.35; pos.y += Math.abs(s) * 0.03; break
        default: pos.z -= Math.abs(s) * 0.15; pos.y -= Math.abs(s) * 0.1
      }
    }
    this.holder.position.copyFrom(pos)
    this.holder.rotation.copyFrom(rot)
  }
}
