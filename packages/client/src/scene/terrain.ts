import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector2, VertexBuffer, VertexData, type Scene } from '@babylonjs/core'
import { WaterMaterial } from '@babylonjs/materials'
import { BUND_WIDTH, CANAL, PLOT_SIZE } from '../game/layout'
import type { Materials } from './materials'
import { tileNoise, waterNormalTexture } from './textures'

const PITCH = PLOT_SIZE + BUND_WIDTH
/** Mép cánh đồng (tâm bờ ngoài cùng). */
export const FIELD_HALF: [number, number] = [2 * PITCH, 2.5 * PITCH]
/** Mặt nước ruộng. */
export const WATER_Y = 0.13
const BUND_TOP = 0.3
const TERRAIN_SIZE = 700

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** Độ cao địa hình: phẳng quanh làng, núi xanh nhấp nhô ở xa. */
export function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z + 7)
  const ramp = smoothstep(140, 300, d)
  if (ramp === 0) return 0
  const u = x / TERRAIN_SIZE + 0.5
  const v = z / TERRAIN_SIZE + 0.5
  const n = tileNoise(u, v, 5, 77, 5)
  const ridge = 1 - Math.abs(tileNoise(u, v, 3, 78, 3) * 2 - 1)
  return ramp * (10 + 45 * n * n + 20 * ridge)
}

/** Mặt đất cỏ + dãy núi (một mesh). */
export function createTerrain(scene: Scene, m: Materials): Mesh {
  const ground = MeshBuilder.CreateGround('terrain', { width: TERRAIN_SIZE, height: TERRAIN_SIZE, subdivisions: 160, updatable: true }, scene)
  const pos = ground.getVerticesData(VertexBuffer.PositionKind)!
  const colors: number[] = []
  const low = Color3.FromHexString('#ffffff')
  const high = Color3.FromHexString('#7f9fa8')
  for (let i = 0; i < pos.length; i += 3) {
    const h = terrainHeight(pos[i], pos[i + 2])
    pos[i + 1] = h
    const c = Color3.Lerp(low, high, Math.min(1, h / 50))
    colors.push(c.r, c.g, c.b, 1)
  }
  ground.updateVerticesData(VertexBuffer.PositionKind, pos)
  const normals: number[] = []
  VertexData.ComputeNormals(pos, ground.getIndices()!, normals)
  ground.updateVerticesData(VertexBuffer.NormalKind, normals)
  ground.setVerticesData(VertexBuffer.ColorKind, colors)
  ground.material = m.grass
  ground.receiveShadows = true
  ground.isPickable = false
  return ground
}

/** Bờ ruộng giữa các ô và quanh cánh đồng. */
export function createBunds(scene: Scene, m: Materials): Mesh {
  const parts: Mesh[] = []
  const [hx, hz] = FIELD_HALF
  for (let i = -2; i <= 2; i++) {
    const b = MeshBuilder.CreateBox(`bundX${i}`, { width: BUND_WIDTH, height: BUND_TOP, depth: hz * 2 + BUND_WIDTH }, scene)
    b.position.set(i * PITCH, BUND_TOP / 2, 0)
    parts.push(b)
  }
  for (let j = -5; j <= 5; j += 2) {
    const b = MeshBuilder.CreateBox(`bundZ${j}`, { width: hx * 2 + BUND_WIDTH, height: BUND_TOP, depth: BUND_WIDTH }, scene)
    b.position.set(0, BUND_TOP / 2, (j * PITCH) / 2)
    parts.push(b)
  }
  const bunds = Mesh.MergeMeshes(parts, true)!
  bunds.name = 'bunds'
  bunds.material = m.bund
  bunds.receiveShadows = true
  bunds.isPickable = false
  return bunds
}

/** Mặt nước chung của cả cánh đồng; ô khô được nâng đất lên trên mặt nước. */
export function createFieldWater(scene: Scene, high: boolean): { mesh: Mesh; water: WaterMaterial | null } {
  const [hx, hz] = FIELD_HALF
  const mesh = MeshBuilder.CreateGround('fieldWater', { width: hx * 2, height: hz * 2 }, scene)
  mesh.position.y = WATER_Y
  mesh.isPickable = false
  const bump = waterNormalTexture(scene)
  if (high) {
    const water = new WaterMaterial('paddyWater', scene, new Vector2(512, 512))
    water.bumpTexture = bump
    water.windForce = -1.5
    water.waveHeight = 0
    water.bumpHeight = 0.06
    water.waveLength = 0.08
    water.windDirection = new Vector2(1, 0.6)
    water.waterColor = new Color3(0.32, 0.36, 0.24)
    water.colorBlendFactor = 0.22
    water.alpha = 0.92
    mesh.material = water
    return { mesh, water }
  }
  const simple = new StandardMaterial('paddyWaterLow', scene)
  simple.diffuseColor = new Color3(0.42, 0.52, 0.5)
  simple.specularColor = new Color3(0.6, 0.6, 0.6)
  simple.specularPower = 80
  simple.bumpTexture = bump
  simple.bumpTexture.level = 0.3
  simple.alpha = 0.6
  mesh.material = simple
  return { mesh, water: null }
}

/** Kênh nước dọc cạnh đông, có bờ đất hai bên. */
export function createCanal(scene: Scene, m: Materials): Mesh[] {
  const length = CANAL.zMax - CANAL.zMin
  const zMid = (CANAL.zMin + CANAL.zMax) / 2
  const water = MeshBuilder.CreateGround('canal', { width: CANAL.width, height: length }, scene)
  water.position.set(CANAL.x, 0.04, zMid)
  const mat = new StandardMaterial('canalMat', scene)
  mat.diffuseColor = new Color3(0.22, 0.38, 0.4)
  mat.specularColor = new Color3(0.8, 0.8, 0.8)
  mat.specularPower = 96
  mat.bumpTexture = waterNormalTexture(scene)
  mat.bumpTexture.level = 0.4
  ;(mat.bumpTexture as unknown as { uScale: number; vScale: number }).vScale = 8
  water.material = mat
  water.isPickable = false
  const banks = [-1, 1].map(side => {
    const b = MeshBuilder.CreateBox(`canalBank${side}`, { width: 0.5, height: 0.18, depth: length }, scene)
    b.position.set(CANAL.x + side * (CANAL.width / 2 + 0.25), 0.09, zMid)
    b.material = m.mud
    b.isPickable = false
    b.receiveShadows = true
    return b
  })
  return [water, ...banks]
}
