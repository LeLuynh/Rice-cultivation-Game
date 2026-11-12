import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode, type Scene } from '@babylonjs/core'
import type { Materials } from './materials'

export interface Person {
  root: TransformNode
  /**
   * Tư thế mỗi khung hình: `walk` là pha bước chân (radian, 0 = đứng yên khi `moving` false),
   * `bend` 0..1 là cúi người làm ruộng, `work` là pha động tác tay khi cúi.
   */
  pose(p: { walk: number; moving: boolean; bend: number; work: number }): void
  dispose(): void
}

const shirtCache = new Map<string, StandardMaterial>()
function cloth(scene: Scene, hex: string): StandardMaterial {
  const key = `${scene.uid}:${hex}`
  let m = shirtCache.get(key)
  if (!m) {
    m = new StandardMaterial(`cloth-${hex}`, scene)
    m.diffuseColor = Color3.FromHexString(hex)
    m.specularColor = new Color3(0.03, 0.03, 0.03)
    shirtCache.set(key, m)
  }
  return m
}

function limb(scene: Scene, name: string, length: number, radius: number, parent: TransformNode, mat: StandardMaterial): Mesh {
  // khớp ở gốc (đỉnh) của chi, chi treo xuống theo −y
  const m = MeshBuilder.CreateCapsule(name, { height: length, radius, tessellation: 8, subdivisions: 1 }, scene)
  m.position.y = -length / 2
  m.parent = parent
  m.material = mat
  return m
}

/** Người dựng bằng khối có khớp (hông, vai, gối), đội nón lá. Cao ~1.65 m. */
export function createPerson(scene: Scene, m: Materials, opts: { shirt: string; pants?: string; name: string }): Person {
  const root = new TransformNode(opts.name, scene)
  const shirt = cloth(scene, opts.shirt)
  const pants = cloth(scene, opts.pants ?? '#2b2824')
  const meshes: Mesh[] = []

  const hips = new TransformNode(`${opts.name}-hips`, scene)
  hips.parent = root
  hips.position.y = 0.9

  const legs = [-1, 1].map(side => {
    const hip = new TransformNode(`${opts.name}-hip${side}`, scene)
    hip.parent = hips
    hip.position.x = side * 0.1
    meshes.push(limb(scene, `${opts.name}-thigh${side}`, 0.45, 0.075, hip, pants))
    const knee = new TransformNode(`${opts.name}-knee${side}`, scene)
    knee.parent = hip
    knee.position.y = -0.45
    meshes.push(limb(scene, `${opts.name}-shin${side}`, 0.45, 0.065, knee, pants))
    return { hip, knee }
  })

  const torso = new TransformNode(`${opts.name}-torso`, scene)
  torso.parent = hips
  const body = MeshBuilder.CreateCapsule(`${opts.name}-body`, { height: 0.62, radius: 0.17, tessellation: 10 }, scene)
  body.scaling.z = 0.75
  body.position.y = 0.3
  body.parent = torso
  body.material = shirt
  meshes.push(body)

  const head = MeshBuilder.CreateSphere(`${opts.name}-head`, { diameter: 0.24, segments: 10 }, scene)
  head.position.y = 0.72
  head.parent = torso
  head.material = m.skin
  meshes.push(head)

  // nón lá: chóp nón rộng, thấp
  const hat = MeshBuilder.CreateCylinder(`${opts.name}-hat`, { height: 0.2, diameterTop: 0, diameterBottom: 0.62, tessellation: 20 }, scene)
  hat.position.y = 0.86
  hat.parent = torso
  hat.material = m.straw
  meshes.push(hat)

  const arms = [-1, 1].map(side => {
    const shoulder = new TransformNode(`${opts.name}-shoulder${side}`, scene)
    shoulder.parent = torso
    shoulder.position.set(side * 0.22, 0.56, 0)
    meshes.push(limb(scene, `${opts.name}-upper${side}`, 0.3, 0.055, shoulder, shirt))
    const elbow = new TransformNode(`${opts.name}-elbow${side}`, scene)
    elbow.parent = shoulder
    elbow.position.y = -0.3
    meshes.push(limb(scene, `${opts.name}-fore${side}`, 0.28, 0.045, elbow, m.skin))
    return { shoulder, elbow }
  })

  for (const mesh of meshes) {
    mesh.isPickable = false
    mesh.receiveShadows = true
  }

  return {
    root,
    pose({ walk, moving, bend, work }) {
      const stride = moving ? Math.sin(walk) * 0.5 : 0
      legs[0].hip.rotation.x = stride - bend * 0.3
      legs[1].hip.rotation.x = -stride - bend * 0.3
      // gối gập ra sau (+z), nên góc âm
      legs[0].knee.rotation.x = -(moving ? Math.max(0, -Math.sin(walk)) * 0.7 : bend * 0.5)
      legs[1].knee.rotation.x = -(moving ? Math.max(0, Math.sin(walk)) * 0.7 : bend * 0.5)
      hips.position.y = 0.9 - bend * 0.12 + (moving ? Math.abs(Math.cos(walk)) * 0.03 : 0)
      // cúi người về phía trước (−z cục bộ là hướng mặt)
      torso.rotation.x = -bend * 1.1
      // tay bù lại góc cúi để buông xuống ruộng, rồi đưa ra đưa vào khi làm
      const reach = Math.sin(work) * 0.35
      arms[0].shoulder.rotation.x = moving ? -stride * 0.8 : bend * (1.2 + reach)
      arms[1].shoulder.rotation.x = moving ? stride * 0.8 : bend * (1.2 - reach)
      arms[0].elbow.rotation.x = 0.2 + bend * 0.3
      arms[1].elbow.rotation.x = 0.2 + bend * 0.3
    },
    dispose() { root.dispose(false, false) },
  }
}

/** Mesh con (để thêm vào bóng đổ / phản chiếu). */
export function personMeshes(p: Person): Mesh[] {
  return p.root.getChildMeshes(false) as Mesh[]
}
