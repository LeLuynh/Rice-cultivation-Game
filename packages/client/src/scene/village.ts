import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector2, Vector3, VertexData, type Scene } from '@babylonjs/core'
import { HOUSE_BOX } from '../game/layout'
import type { Materials } from './materials'

const hash = (n: number): number => {
  const s = Math.sin(n * 53.3 + 7.1) * 43758.5453
  return s - Math.floor(s)
}

/** Lăng trụ tam giác (hồi nhà) dọc trục x: đáy rộng `depth` theo z, cao `rise`. */
function gable(scene: Scene, name: string, width: number, depth: number, rise: number): Mesh {
  const hw = width / 2
  const hd = depth / 2
  const p = [
    [-hw, 0, -hd], [-hw, 0, hd], [-hw, rise, 0],
    [hw, 0, -hd], [hw, 0, hd], [hw, rise, 0],
  ]
  const positions = p.flat()
  const indices = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0]
  const uvs = p.flatMap(([x, y, z]) => [(x + z) * 0.25, y * 0.25])
  const mesh = new Mesh(name, scene)
  const data = new VertexData()
  data.positions = positions
  data.indices = indices
  data.uvs = uvs
  const normals: number[] = []
  VertexData.ComputeNormals(positions, indices, normals)
  data.normals = normals
  data.applyToMesh(mesh)
  mesh.convertToFlatShadedMesh()
  return mesh
}

/** Nhà gạch mái ngói có hiên cột gỗ. Trả về các mesh để đổ bóng. */
export function createHouse(scene: Scene, m: Materials, opts: { center: [number, number]; width: number; depth: number; rotationY?: number; name: string }): TransformNode {
  const root = new TransformNode(opts.name, scene)
  root.position.set(opts.center[0], 0, opts.center[1])
  root.rotation.y = opts.rotationY ?? 0
  const { width: w, depth: d } = opts
  const wallH = 3.2
  const rise = 1.9
  const add = (mesh: Mesh, mat: StandardMaterial): Mesh => {
    mesh.parent = root
    mesh.material = mat
    mesh.receiveShadows = true
    mesh.isPickable = false
    return mesh
  }

  const walls = add(MeshBuilder.CreateBox(`${opts.name}-walls`, { width: w, height: wallH, depth: d, wrap: true }, scene), m.brick)
  walls.position.y = wallH / 2
  const plinth = add(MeshBuilder.CreateBox(`${opts.name}-plinth`, { width: w + 0.3, height: 0.35, depth: d + 0.3 }, scene), m.concrete)
  plinth.position.y = 0.17

  const g = add(gable(scene, `${opts.name}-gable`, w, d, rise), m.brick)
  g.position.y = wallH

  const eave = 0.8
  const run = d / 2 + eave
  const slab = Math.hypot(run, rise + 0.25)
  const angle = Math.atan2(rise + 0.25, run)
  for (const side of [-1, 1]) {
    const roof = add(MeshBuilder.CreateBox(`${opts.name}-roof${side}`, { width: w + 1.2, height: 0.12, depth: slab }, scene), m.roof)
    roof.position.set(0, wallH + (rise + 0.25) / 2 - 0.15, (side * run) / 2)
    roof.rotation.x = side * angle
  }
  const ridge = add(MeshBuilder.CreateCylinder(`${opts.name}-ridge`, { height: w + 1.3, diameter: 0.28, tessellation: 8 }, scene), m.roof)
  ridge.rotation.z = Math.PI / 2
  ridge.position.y = wallH + rise + 0.12

  // hiên trước: sàn, cột gỗ, mái hiên
  const front = d / 2
  const porch = add(MeshBuilder.CreateBox(`${opts.name}-porch`, { width: w, height: 0.3, depth: 2.6 }, scene), m.concrete)
  porch.position.set(0, 0.15, front + 1.3)
  for (const x of [-w / 2 + 0.5, -w / 6, w / 6, w / 2 - 0.5]) {
    const col = add(MeshBuilder.CreateCylinder(`${opts.name}-col${x}`, { height: 2.7, diameter: 0.22, tessellation: 10 }, scene), m.darkWood)
    col.position.set(x, 1.35 + 0.3, front + 2.4)
  }
  const porchRoof = add(MeshBuilder.CreateBox(`${opts.name}-porchRoof`, { width: w + 0.6, height: 0.1, depth: 3.0 }, scene), m.roof)
  porchRoof.position.set(0, 3.05, front + 1.5)
  porchRoof.rotation.x = 0.2

  const door = add(MeshBuilder.CreatePlane(`${opts.name}-door`, { width: 1.6, height: 2.3 }, scene), m.darkWood)
  door.position.set(0, 1.5, front + 0.02)
  for (const x of [-w / 3, w / 3]) {
    const win = add(MeshBuilder.CreatePlane(`${opts.name}-win${x}`, { width: 1.3, height: 1.0 }, scene), m.window)
    win.position.set(x, 1.8, front + 0.02)
    const frame = add(MeshBuilder.CreateBox(`${opts.name}-frame${x}`, { width: 1.5, height: 1.2, depth: 0.04 }, scene), m.wood)
    frame.position.set(x, 1.8, front + 0.005)
  }
  // mặt sau của cửa/cửa sổ (plane chỉ có một mặt) không cần vì người chơi không vào nhà
  return root
}

/** Mẫu cây dừa (thân cong, tàu lá rủ, trái dừa); dùng createInstance để trồng nhiều. */
function palmTemplate(scene: Scene, m: Materials): Mesh {
  const parts: Mesh[] = []
  const path: Vector3[] = []
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    path.push(new Vector3(1.2 * t * t, 7.5 * t, 0))
  }
  const trunk = MeshBuilder.CreateTube('palm-trunk', { path, tessellation: 10, radiusFunction: i => 0.24 * (1 - 0.4 * (i / 10)) }, scene)
  trunk.material = m.trunk
  parts.push(trunk)
  const top = path[path.length - 1]
  for (let f = 0; f < 12; f++) {
    const a = (f / 12) * Math.PI * 2 + hash(f) * 0.3
    const dir = new Vector3(Math.cos(a), 0, Math.sin(a))
    const side = new Vector3(-Math.sin(a), 0, Math.cos(a))
    const len = 3.2 + hash(f + 3) * 0.8
    const lift = 0.5 + hash(f + 7) * 0.6
    const left: Vector3[] = []
    const right: Vector3[] = []
    const uvs: Vector2[] = []
    const N = 8
    for (let i = 0; i <= N; i++) {
      const s = i / N
      const c = top.add(dir.scale(len * s)).add(new Vector3(0, lift * s - 2.0 * s * s, 0))
      const wdt = 0.75 * Math.sin(Math.PI * Math.min(1, s * 1.1 + 0.05))
      left.push(c.add(side.scale(wdt)).add(new Vector3(0, -0.15 * wdt, 0)))
      right.push(c.subtract(side.scale(wdt)).add(new Vector3(0, -0.15 * wdt, 0)))
    }
    for (let i = 0; i <= N; i++) uvs.push(new Vector2(0, i / N))
    for (let i = 0; i <= N; i++) uvs.push(new Vector2(1, i / N))
    const frond = MeshBuilder.CreateRibbon(`palm-frond${f}`, { pathArray: [left, right], uvs }, scene)
    frond.material = m.frond
    parts.push(frond)
  }
  for (let c = 0; c < 4; c++) {
    const nut = MeshBuilder.CreateSphere(`palm-nut${c}`, { diameter: 0.32, segments: 6 }, scene)
    nut.position = top.add(new Vector3(Math.cos(c * 1.6) * 0.25, -0.3, Math.sin(c * 1.6) * 0.25))
    nut.material = m.bamboo
    parts.push(nut)
  }
  const palm = Mesh.MergeMeshes(parts, true, true, undefined, false, true)!
  palm.name = 'palm'
  palm.isPickable = false
  palm.receiveShadows = true
  return palm
}

/** Mẫu bụi tre: nhiều thân cao hơi cong, lá ở ngọn. */
function bambooTemplate(scene: Scene, m: Materials): Mesh {
  const parts: Mesh[] = []
  for (let s = 0; s < 9; s++) {
    const a = hash(s) * Math.PI * 2
    const r = hash(s + 1) * 0.7
    const h = 6 + hash(s + 2) * 3
    const lean = new Vector3(Math.cos(a), 0, Math.sin(a)).scale(0.8 + hash(s + 3))
    const base = new Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)
    const path: Vector3[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      path.push(base.add(lean.scale(t * t)).add(new Vector3(0, h * t, 0)))
    }
    const stem = MeshBuilder.CreateTube(`bamboo-stem${s}`, { path, radius: 0.06, tessellation: 6 }, scene)
    stem.material = m.bamboo
    parts.push(stem)
    for (let l = 0; l < 4; l++) {
      const tip = path[4 + (l % 3)]
      const la = a + l * 1.7
      const leafDir = new Vector3(Math.cos(la), -0.25, Math.sin(la))
      const side = new Vector3(-Math.sin(la), 0, Math.cos(la))
      const left: Vector3[] = []
      const right: Vector3[] = []
      for (let i = 0; i <= 4; i++) {
        const t = i / 4
        const c = tip.add(leafDir.scale(1.6 * t)).add(new Vector3(0, -0.4 * t * t, 0))
        const w = 0.35 * Math.sin(Math.PI * Math.min(1, t + 0.1))
        left.push(c.add(side.scale(w)))
        right.push(c.subtract(side.scale(w)))
      }
      const uvs = [0, 1].flatMap(u => [0, 1, 2, 3, 4].map(i => new Vector2(u, i / 4)))
      const leaf = MeshBuilder.CreateRibbon(`bamboo-leaf${s}-${l}`, { pathArray: [left, right], uvs }, scene)
      leaf.material = m.frond
      parts.push(leaf)
    }
  }
  const clump = Mesh.MergeMeshes(parts, true, true, undefined, false, true)!
  clump.name = 'bamboo'
  clump.isPickable = false
  return clump
}

function haystackTemplate(scene: Scene, m: Materials): Mesh {
  const body = MeshBuilder.CreateCylinder('hay-body', { height: 2.2, diameterTop: 1.2, diameterBottom: 2.8, tessellation: 16 }, scene)
  body.position.y = 1.1
  const cap = MeshBuilder.CreateSphere('hay-cap', { diameter: 1.25, segments: 8, slice: 0.5 }, scene)
  cap.position.y = 2.2
  const pole = MeshBuilder.CreateCylinder('hay-pole', { height: 1.2, diameter: 0.08 }, scene)
  pole.position.y = 3.0
  const hay = Mesh.MergeMeshes([body, cap, pole], true)!
  hay.name = 'haystack'
  hay.material = m.straw
  hay.isPickable = false
  return hay
}

function bushTemplate(scene: Scene, m: Materials): Mesh {
  const parts: Mesh[] = []
  for (let i = 0; i < 5; i++) {
    const b = MeshBuilder.CreateSphere(`bush${i}`, { diameter: 1.2 + hash(i) * 0.8, segments: 6 }, scene)
    b.position.set((hash(i + 1) - 0.5) * 1.6, 0.5 + hash(i + 2) * 0.4, (hash(i + 3) - 0.5) * 1.6)
    parts.push(b)
  }
  const bush = Mesh.MergeMeshes(parts, true)!
  const mat = new StandardMaterial('bushMat', scene)
  mat.diffuseTexture = m.bund.diffuseTexture
  mat.diffuseColor = new Color3(0.55, 0.8, 0.5)
  mat.specularColor = Color3.Black()
  bush.material = mat
  bush.name = 'bush'
  bush.isPickable = false
  return bush
}

const PALMS: [number, number][] = [
  [-28, -22], [-29, -12], [-27, -2], [-29, 8], [-28, 18], [-27, 28],
  [-14, 31], [-4, 32], [6, 31], [16, 32], [27, 30], [29, 20],
  [-12, -42], [12, -43], [-24, -40], [26, -38], [30, -18], [31, 4],
  [-45, -25], [-52, 5], [48, -30], [55, 12], [-40, 40], [42, 44],
]
const BAMBOO: [number, number][] = [[-16, -45], [17, -46], [-33, 31], [34, -6], [-36, -30]]
const HAYSTACKS: [number, number][] = [[10, -24], [13.5, -22.5]]
const BUSHES: [number, number][] = [[-8, -27], [8, -27], [-9, -40], [9, -40], [-31, 0], [25, -26], [-20, 34]]

/** Làng: nhà Địa chủ, nhà hàng xóm phía xa, dừa, tre, đống rơm, bụi cây. Trả mesh đổ bóng. */
export function createVillage(scene: Scene, m: Materials): Mesh[] {
  const casters: Mesh[] = []
  const center: [number, number] = [(HOUSE_BOX.min[0] + HOUSE_BOX.max[0]) / 2, (HOUSE_BOX.min[1] + HOUSE_BOX.max[1]) / 2]
  const houses = [
    createHouse(scene, m, { center, width: HOUSE_BOX.max[0] - HOUSE_BOX.min[0], depth: HOUSE_BOX.max[1] - HOUSE_BOX.min[1], name: 'landlordHouse' }),
    createHouse(scene, m, { center: [-52, -14], width: 9, depth: 7, rotationY: Math.PI / 2, name: 'house2' }),
    createHouse(scene, m, { center: [54, -24], width: 8, depth: 7, rotationY: -Math.PI / 2, name: 'house3' }),
    createHouse(scene, m, { center: [36, 52], width: 9, depth: 7, rotationY: Math.PI, name: 'house4' }),
  ]
  for (const h of houses) casters.push(...(h.getChildMeshes() as Mesh[]))

  const yard = MeshBuilder.CreateGround('yard', { width: HOUSE_BOX.max[0] - HOUSE_BOX.min[0] + 6, height: 6 }, scene)
  yard.position.set(center[0], 0.02, HOUSE_BOX.max[1] + 5.5)
  yard.material = m.concrete
  yard.receiveShadows = true
  yard.isPickable = false

  const plant = (template: Mesh, spots: [number, number][], scale: (i: number) => number): void => {
    // cây mẫu đứng ở chỗ đầu tiên, các chỗ còn lại là instance (tắt mẫu sẽ tắt luôn instance)
    spots.forEach(([x, z], i) => {
      const inst = i === 0 ? template : template.createInstance(`${template.name}-${i}`)
      inst.position.set(x, 0, z)
      inst.rotation.y = hash(i + x) * Math.PI * 2
      const s = scale(i)
      inst.scaling.set(s, s, s)
      inst.isPickable = false
      casters.push(inst as Mesh)
    })
  }
  plant(palmTemplate(scene, m), PALMS, i => 0.85 + hash(i) * 0.4)
  plant(bambooTemplate(scene, m), BAMBOO, i => 0.9 + hash(i + 5) * 0.3)
  plant(haystackTemplate(scene, m), HAYSTACKS, () => 1)
  plant(bushTemplate(scene, m), BUSHES, i => 0.8 + hash(i + 9) * 0.5)
  return casters
}
