import { Color3, Color4, Matrix, Mesh, MeshBuilder, Quaternion, Vector3, VertexBuffer, type Scene } from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials'
import type { Stage } from '@rice/core'
import type { Clump } from './view'

/** Mặt bùn dưới nước, nơi gốc lúa mọc. */
export const MUD_TOP = 0.06

type Look = 'seedling' | 'young' | 'green' | 'flowering' | 'ripe' | 'bundled' | 'weed'

interface LookSpec {
  blades: number
  lean: number
  width: number
  base: string
  tip: string
  panicles?: { count: number; droop: number; color: string }
}

const LOOKS: Record<Exclude<Look, 'bundled'>, LookSpec> = {
  seedling: { blades: 6, lean: 0.25, width: 0.018, base: '#5f9a3a', tip: '#b8e07a' },
  young: { blades: 10, lean: 0.3, width: 0.016, base: '#3f7f2c', tip: '#8fcf5a' },
  green: { blades: 14, lean: 0.35, width: 0.014, base: '#2c6a24', tip: '#6fbf44' },
  flowering: { blades: 14, lean: 0.38, width: 0.014, base: '#3a7028', tip: '#8cbf4a', panicles: { count: 5, droop: 0.3, color: '#c8cf82' } },
  ripe: { blades: 14, lean: 0.42, width: 0.014, base: '#5f7a2c', tip: '#c2b450', panicles: { count: 7, droop: 0.75, color: '#e0ad3a' } },
  weed: { blades: 10, lean: 0.6, width: 0.03, base: '#24501c', tip: '#4f8a2c' },
}

export function lookFor(stage: Stage): Look | null {
  switch (stage) {
    case 'seedling':
    case 'seedlingReady': return 'seedling'
    case 'young': return 'young'
    case 'green': return 'green'
    case 'flowering': return 'flowering'
    case 'ripe': return 'ripe'
    case 'bundled': return 'bundled'
    default: return null
  }
}

function paint(mesh: Mesh, color: (y: number) => Color4): void {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind)!
  const colors: number[] = []
  for (let i = 0; i < pos.length; i += 3) {
    const c = color(pos[i + 1])
    colors.push(c.r, c.g, c.b, 1)
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors)
}

const hash = (n: number): number => {
  const s = Math.sin(n * 91.7 + 17.3) * 43758.5453
  return s - Math.floor(s)
}

/** Một cụm lúa cao 1 m (đơn vị): lá dải cong ra ngoài, có thể có bông rủ. */
function buildClump(scene: Scene, name: string, spec: LookSpec): Mesh {
  const parts: Mesh[] = []
  const base = Color3.FromHexString(spec.base)
  const tip = Color3.FromHexString(spec.tip)
  for (let b = 0; b < spec.blades; b++) {
    const a = (b / spec.blades) * Math.PI * 2 + hash(b) * 0.6
    const lean = spec.lean * (0.6 + 0.8 * hash(b + 5))
    const h = 0.75 + 0.3 * hash(b + 9)
    const dir = new Vector3(Math.cos(a), 0, Math.sin(a))
    const side = new Vector3(-Math.sin(a), 0, Math.cos(a))
    const left: Vector3[] = []
    const right: Vector3[] = []
    const SEG = 6
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG
      const center = dir.scale(lean * t * t + 0.02).add(new Vector3(0, h * t * (1 - 0.25 * lean * t), 0))
      const w = spec.width * Math.pow(1 - t, 0.6) + 0.002
      left.push(center.add(side.scale(w)))
      right.push(center.subtract(side.scale(w)))
    }
    parts.push(MeshBuilder.CreateRibbon(`${name}-b${b}`, { pathArray: [left, right] }, scene))
  }
  for (const p of parts) paint(p, y => Color4.FromColor3(Color3.Lerp(base, tip, Math.min(1, y))))

  if (spec.panicles) {
    const grain = Color3.FromHexString(spec.panicles.color)
    for (let k = 0; k < spec.panicles.count; k++) {
      const a = (k / spec.panicles.count) * Math.PI * 2 + 0.4
      const dir = new Vector3(Math.cos(a), 0, Math.sin(a))
      const path: Vector3[] = []
      for (let s = 0; s <= 8; s++) {
        const t = s / 8
        const out = 0.05 + t * 0.22
        const y = 0.95 + 0.12 * t - spec.panicles.droop * t * t * 0.5
        path.push(dir.scale(out).add(new Vector3(0, y, 0)))
      }
      // cuống bông mảnh, rủ xuống; vài nhánh hạt tỏa ra hai bên
      const tube = MeshBuilder.CreateTube(`${name}-p${k}`, { path, tessellation: 4, radius: 0.006 }, scene)
      paint(tube, () => Color4.FromColor3(grain))
      parts.push(tube)
      for (let br = 2; br <= 7; br += 1) {
        const from = path[br]
        const side = new Vector3(-dir.z, 0, dir.x).scale(br % 2 === 0 ? 1 : -1)
        const to = from.add(side.scale(0.05)).add(dir.scale(0.03)).add(new Vector3(0, -0.06 - spec.panicles.droop * 0.06, 0))
        const branch = MeshBuilder.CreateTube(`${name}-p${k}b${br}`, {
          path: [from, to], tessellation: 4, radiusFunction: (i: number) => (i === 0 ? 0.004 : 0.012),
        }, scene)
        paint(branch, () => Color4.FromColor3(grain))
        parts.push(branch)
      }
    }
  }
  const merged = Mesh.MergeMeshes(parts, true, true)!
  merged.name = name
  return merged
}

/** Bó lúa đã cắt nằm trên ruộng. */
function buildBundle(scene: Scene): Mesh {
  const body = MeshBuilder.CreateCylinder('bundle-body', { height: 1.1, diameterTop: 0.3, diameterBottom: 0.38, tessellation: 10 }, scene)
  body.rotation.z = Math.PI / 2
  body.position.y = 0.18
  body.bakeCurrentTransformIntoVertices()
  paint(body, () => Color4.FromColor3(Color3.FromHexString('#cfa94a')))
  const tie = MeshBuilder.CreateTorus('bundle-tie', { diameter: 0.36, thickness: 0.04, tessellation: 12 }, scene)
  tie.rotation.z = Math.PI / 2
  tie.position.y = 0.18
  tie.bakeCurrentTransformIntoVertices()
  paint(tie, () => Color4.FromColor3(Color3.FromHexString('#7a5a2a')))
  const merged = Mesh.MergeMeshes([body, tie], true, true)!
  merged.name = 'bundle'
  return merged
}

/** Vật liệu có gió: đỉnh cây lắc nhiều, gốc đứng yên. */
function windMaterial(scene: Scene, name: string): CustomMaterial {
  const m = new CustomMaterial(name, scene)
  m.diffuseColor = Color3.White()
  m.specularColor = new Color3(0.08, 0.08, 0.05)
  m.backFaceCulling = false
  m.twoSidedLighting = true
  m.AddUniform('windTime', 'float', 0)
  m.Vertex_After_WorldPosComputed(`
    float hh = max(positionUpdated.y, 0.0);
    float sway = sin(windTime * 1.6 + worldPos.x * 0.35 + worldPos.z * 0.22) + 0.4 * sin(windTime * 3.1 + worldPos.x * 1.3);
    worldPos.x += sway * 0.05 * hh * hh;
    worldPos.z += cos(windTime * 1.2 + worldPos.z * 0.3) * 0.03 * hh * hh;
  `)
  return m
}

/**
 * Tất cả cây lúa (và cỏ dại) của cánh đồng: mỗi kiểu cây là một mesh với thin instances,
 * nên cả cánh đồng chỉ tốn vài lượt vẽ.
 */
export class RiceLayer {
  private meshes = new Map<Look, Mesh>()
  private material: CustomMaterial
  private time = 0
  /** Gọi khi một mesh cây mới được tạo (để thêm vào danh sách phản chiếu nước, bóng…). */
  onMeshCreated: (m: Mesh) => void = () => {}

  constructor(private scene: Scene, private receiveShadows: boolean) {
    this.material = windMaterial(scene, 'riceWind')
    this.material.onBindObservable.add(() => this.material.getEffect()?.setFloat('windTime', this.time))
  }

  private mesh(look: Look): Mesh {
    let m = this.meshes.get(look)
    if (!m) {
      m = look === 'bundled' ? buildBundle(this.scene) : buildClump(this.scene, `rice-${look}`, LOOKS[look])
      m.material = this.material
      m.isPickable = false
      m.receiveShadows = this.receiveShadows
      m.alwaysSelectAsActiveMesh = true
      this.meshes.set(look, m)
      this.onMeshCreated(m)
    }
    return m
  }

  /** Đặt lại toàn bộ cây theo danh sách cụm của từng kiểu. */
  set(byLook: Map<Look, Clump[]>): void {
    for (const look of new Set<Look>([...this.meshes.keys(), ...byLook.keys()])) {
      const clumps = byLook.get(look) ?? []
      if (clumps.length === 0) {
        this.meshes.get(look)?.setEnabled(false)
        continue
      }
      const m = this.mesh(look)
      m.setEnabled(true)
      const buf = new Float32Array(clumps.length * 16)
      const mat = new Matrix()
      clumps.forEach((c, i) => {
        const s = look === 'bundled' ? 1 : c.scale
        Matrix.ComposeToRef(new Vector3(s, s, s), Quaternion.RotationAxis(Vector3.Up(), c.rotation), new Vector3(c.x, c.y ?? MUD_TOP, c.z), mat)
        mat.copyToArray(buf, i * 16)
      })
      m.thinInstanceSetBuffer('matrix', buf, 16, false)
    }
  }

  get allMeshes(): Mesh[] { return [...this.meshes.values()] }

  update(dt: number): void { this.time += dt }
}

export type { Look }
