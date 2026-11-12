import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, type Scene } from '@babylonjs/core'
import { CONFIG, type PlotState } from '@rice/core'
import { PLOT_SIZE, plotCenter } from '../game/layout'
import type { Materials } from './materials'
import { MUD_TOP, lookFor, type Look } from './rice'
import { WATER_Y } from './terrain'
import { signTexture } from './textures'
import { riceClumps, type Clump } from './view'

/** Mặt đất khi ô cạn nước: nhô lên trên mặt nước chung. */
const DRY_TOP = WATER_Y + 0.07
const GROUND_DEPTH = 0.4

// Vị trí cố định (tương đối tâm ô) của cỏ dại và sâu.
const WEED_SPOTS: [number, number][] = [[-2.6, -1.8], [1.9, -2.7], [-0.8, 2.4], [2.8, 1.2], [-3.1, 0.6], [0.4, -0.5], [-1.6, -3.1], [3.2, -0.4]]
const PEST_SPOTS: [number, number][] = [[-1.7, -0.9], [2.3, -1.1], [0.9, 1.9], [-2.4, 2.8], [1.2, -3.0], [-0.3, 0.6]]

const groundTop = (p: PlotState): number => (p.water > 0 ? MUD_TOP : DRY_TOP)

/** Một ô ruộng: nền đất (để nhắm), sâu bay, biển bán. Cây lúa nằm ở RiceLayer chung. */
class PlotView {
  readonly ground: Mesh
  private pests: TransformNode | null = null
  private sign: TransformNode | null = null
  private key = ''

  constructor(private scene: Scene, private m: Materials, readonly id: number, private pestMat: StandardMaterial) {
    const [x, z] = plotCenter(id)
    this.ground = MeshBuilder.CreateBox(`plot${id}`, { width: PLOT_SIZE, height: GROUND_DEPTH, depth: PLOT_SIZE }, scene)
    this.ground.position.set(x, 0, z)
    this.ground.metadata = { plotId: id }
    this.ground.receiveShadows = true
  }

  /** Cập nhật theo trạng thái ô; trả true nếu cây lúa / cỏ của ô cần dựng lại. */
  update(p: PlotState): boolean {
    const key = `${p.stage}|${p.water > 0}|${p.hasWeeds}|${p.hasPests}|${p.owner}`
    if (key === this.key) return false
    this.key = key
    this.ground.position.y = groundTop(p) - GROUND_DEPTH / 2
    this.ground.material = p.stage === 'dry' ? this.m.dry : p.stage === 'plowed' && p.water === 0 ? this.m.plowed : this.m.mud
    this.setPests(p.hasPests)
    this.setSign(p.owner === 'forSale')
    return true
  }

  clumps(p: PlotState, perSide: number): { look: Look; clumps: Clump[] }[] {
    const [cx, cz] = plotCenter(this.id)
    const y = groundTop(p)
    const out: { look: Look; clumps: Clump[] }[] = []
    const look = lookFor(p.stage)
    if (look) out.push({ look, clumps: riceClumps(p.stage, [cx, cz], perSide).map(c => ({ ...c, y })) })
    if (p.hasWeeds) {
      out.push({ look: 'weed', clumps: WEED_SPOTS.map(([dx, dz], i) => ({ x: cx + dx, z: cz + dz, y, scale: 0.55, rotation: i })) })
    }
    return out
  }

  private setPests(on: boolean): void {
    if (on && !this.pests) {
      const [cx, cz] = plotCenter(this.id)
      this.pests = new TransformNode(`pests${this.id}`, this.scene)
      PEST_SPOTS.forEach(([dx, dz], i) => {
        const bug = MeshBuilder.CreateSphere(`bug${this.id}-${i}`, { diameter: 0.12, segments: 4 }, this.scene)
        bug.scaling.z = 1.6
        bug.material = this.pestMat
        bug.isPickable = false
        bug.parent = this.pests
        bug.position.set(cx + dx, 0.9, cz + dz)
      })
    } else if (!on && this.pests) {
      this.pests.dispose()
      this.pests = null
    }
  }

  private setSign(on: boolean): void {
    if (on && !this.sign) {
      const [cx, cz] = plotCenter(this.id)
      this.sign = new TransformNode(`sign${this.id}`, this.scene)
      this.sign.position.set(cx, 0, cz - PLOT_SIZE / 2 + 0.6)
      const post = MeshBuilder.CreateCylinder(`signPost${this.id}`, { height: 1.6, diameter: 0.1, tessellation: 6 }, this.scene)
      post.position.y = 0.8
      post.material = this.m.darkWood
      const board = MeshBuilder.CreateBox(`signBoard${this.id}`, { width: 1.3, height: 0.8, depth: 0.06 }, this.scene)
      board.position.y = 1.5
      board.material = this.m.wood
      // chữ dán hai mặt: mặt sau là bản xoay 180° của mặt trước nên nhìn phía nào cũng đọc xuôi
      const mat = new StandardMaterial(`signMat${this.id}`, this.scene)
      mat.diffuseTexture = signTexture(this.scene, ['BÁN', `${CONFIG.landPrice} Xu`])
      mat.specularColor = Color3.Black()
      const front = MeshBuilder.CreatePlane(`signFront${this.id}`, { width: 1.26, height: 0.76 }, this.scene)
      front.position.set(0, 1.5, 0.032)
      front.rotation.y = Math.PI
      front.material = mat
      const back = front.clone(`signBack${this.id}`)
      back.position.z = -0.032
      back.rotation.y = 0
      for (const mesh of [post, board, front, back]) {
        mesh.parent = this.sign
        mesh.isPickable = false
      }
    } else if (!on && this.sign) {
      this.sign.dispose(false, true)
      this.sign = null
    }
  }

  /** Sâu bay vòng vòng. */
  animate(t: number): void {
    if (!this.pests) return
    this.pests.getChildMeshes().forEach((bug, i) => {
      const [cx, cz] = plotCenter(this.id)
      const [dx, dz] = PEST_SPOTS[i]
      bug.position.set(cx + dx + Math.sin(t * 3 + i) * 0.25, 0.8 + Math.sin(t * 7 + i * 2) * 0.12, cz + dz + Math.cos(t * 2.6 + i) * 0.25)
    })
  }
}

/** Mọi ô ruộng của cánh đồng. */
export class PlotViews {
  private views: PlotView[] = []

  constructor(scene: Scene, m: Materials, count: number, private perSide: number) {
    const pestMat = new StandardMaterial('pestMat', scene)
    pestMat.diffuseColor = Color3.FromHexString('#7a3b12')
    pestMat.emissiveColor = new Color3(0.15, 0.05, 0)
    for (let id = 1; id <= count; id++) this.views.push(new PlotView(scene, m, id, pestMat))
  }

  get grounds(): Mesh[] { return this.views.map(v => v.ground) }

  /** Đồng bộ với trạng thái game; trả danh sách cụm cây theo kiểu nếu có ô thay đổi, ngược lại null. */
  sync(plots: PlotState[]): Map<Look, Clump[]> | null {
    let changed = false
    plots.forEach((p, i) => { if (this.views[i].update(p)) changed = true })
    if (!changed) return null
    const byLook = new Map<Look, Clump[]>()
    plots.forEach((p, i) => {
      for (const { look, clumps } of this.views[i].clumps(p, this.perSide)) {
        byLook.set(look, [...(byLook.get(look) ?? []), ...clumps])
      }
    })
    return byLook
  }

  animate(t: number): void { for (const v of this.views) v.animate(t) }
}
