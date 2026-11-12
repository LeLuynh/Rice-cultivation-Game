import { Color3, Mesh, MeshBuilder, PointLight, StandardMaterial, TransformNode, Vector3, type Camera, type Scene } from '@babylonjs/core'
import { HOUSE_BOX } from '../game/layout'
import type { Materials } from './materials'
import { FIELD_HALF } from './terrain'

const WARM = Color3.FromHexString('#ffb85c')

/**
 * Cột đèn dầu: quanh mép cánh đồng và hai bên hiên nhà Địa chủ.
 * Chỉ vài cột có ánh sáng thật: mỗi đèn tốn một khối uniform của GPU (nhiều máy chỉ cho 12–14).
 */
const LIT = new Set([1, 4, 8, 9])
export const LAMP_SPOTS: [number, number][] = [
  [-FIELD_HALF[0] - 0.9, -13.5], [-FIELD_HALF[0] - 0.9, 4.5], [-FIELD_HALF[0] - 0.9, 18],
  [FIELD_HALF[0] + 0.9, -13.5], [FIELD_HALF[0] + 0.9, 4.5], [FIELD_HALF[0] + 0.9, 18],
  [0, -FIELD_HALF[1] - 0.9], [0, FIELD_HALF[1] + 0.9],
  [HOUSE_BOX.min[0] - 0.6, HOUSE_BOX.max[1] + 2.6], [HOUSE_BOX.max[0] + 0.6, HOUSE_BOX.max[1] + 2.6],
]

/** Đèn ban đêm: cột đèn có ánh sáng thật (máy mạnh) và đèn dầu cầm tay đi theo người chơi. */
export class Lamps {
  private lights: PointLight[] = []
  private bulb: StandardMaterial
  private hand: PointLight

  constructor(scene: Scene, m: Materials, camera: Camera, withPostLights: boolean) {
    this.bulb = new StandardMaterial('lampBulb', scene)
    this.bulb.diffuseColor = Color3.Black()
    this.bulb.specularColor = Color3.Black()
    this.bulb.emissiveColor = Color3.Black()
    this.bulb.disableLighting = true

    const parts: Mesh[] = []
    LAMP_SPOTS.forEach(([x, z], i) => {
      const root = new TransformNode(`lamp${i}`, scene)
      root.position.set(x, 0, z)
      const pole = MeshBuilder.CreateCylinder(`lampPole${i}`, { height: 3.2, diameter: 0.12, tessellation: 6 }, scene)
      pole.position.y = 1.6
      pole.material = m.darkWood
      const arm = MeshBuilder.CreateBox(`lampArm${i}`, { width: 0.08, height: 0.08, depth: 0.6 }, scene)
      arm.position.set(0, 3.1, -0.25)
      arm.material = m.darkWood
      const lantern = MeshBuilder.CreateCylinder(`lantern${i}`, { height: 0.42, diameterTop: 0.22, diameterBottom: 0.3, tessellation: 8 }, scene)
      lantern.position.set(0, 2.8, -0.5)
      lantern.material = this.bulb
      const cap = MeshBuilder.CreateCylinder(`lanternCap${i}`, { height: 0.12, diameterTop: 0.05, diameterBottom: 0.36, tessellation: 8 }, scene)
      cap.position.set(0, 3.06, -0.5)
      cap.material = m.darkWood
      for (const p of [pole, arm, lantern, cap]) {
        p.parent = root
        p.isPickable = false
        parts.push(p)
      }
      if (withPostLights && LIT.has(i)) {
        const light = new PointLight(`lampLight${i}`, new Vector3(x, 2.7, z - 0.5), scene)
        light.diffuse = WARM
        light.specular = WARM.scale(0.3)
        light.range = 20
        light.intensity = 0
        this.lights.push(light)
      }
    })

    // đèn dầu cầm tay: luôn sáng quanh chỗ người chơi đứng
    this.hand = new PointLight('handLantern', new Vector3(0.35, -0.25, -0.4), scene)
    this.hand.parent = camera
    this.hand.diffuse = WARM
    this.hand.specular = WARM.scale(0.2)
    this.hand.range = 18
    this.hand.intensity = 0
  }

  /** `glow` 0 (ban ngày) .. 1 (tối hẳn). */
  setGlow(glow: number): void {
    this.bulb.emissiveColor = WARM.scale(0.1 + glow * 1.3)
    for (const l of this.lights) {
      l.intensity = glow * 1.6
      l.setEnabled(glow > 0.01)
    }
    this.hand.intensity = glow * 1.8
    this.hand.setEnabled(glow > 0.01)
  }
}
