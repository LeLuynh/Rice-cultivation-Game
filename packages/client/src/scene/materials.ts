import { Color3, DynamicTexture, StandardMaterial, type Scene, type Texture } from '@babylonjs/core'
import { BrickProceduralTexture, WoodProceduralTexture } from '@babylonjs/procedural-textures'
import {
  crackedSoilTexture, frondTexture, furrowTexture, roofTileTexture, sackTexture, soilTexture, strawTexture,
} from './textures'

export interface Materials {
  grass: StandardMaterial
  bund: StandardMaterial
  mud: StandardMaterial
  dry: StandardMaterial
  plowed: StandardMaterial
  brick: StandardMaterial
  roof: StandardMaterial
  wood: StandardMaterial
  darkWood: StandardMaterial
  plaster: StandardMaterial
  straw: StandardMaterial
  frond: StandardMaterial
  trunk: StandardMaterial
  bamboo: StandardMaterial
  sack: StandardMaterial
  metal: StandardMaterial
  skin: StandardMaterial
  window: StandardMaterial
  concrete: StandardMaterial
}

/** Bản sao có nội dung: DynamicTexture.clone() của Babylon chỉ tạo texture trống, nên phải chép canvas. */
function copyTexture(t: Texture): Texture {
  if (!(t instanceof DynamicTexture)) return t.clone() ?? t
  const c = t.clone()
  const ctx = c.getContext() as unknown as CanvasRenderingContext2D
  ctx.drawImage((t.getContext() as unknown as CanvasRenderingContext2D).canvas, 0, 0)
  c.update(true)
  c.anisotropicFilteringLevel = t.anisotropicFilteringLevel
  return c
}

function mat(scene: Scene, name: string, opts: { color?: string; texture?: Texture; scale?: number; specular?: number; twoSided?: boolean }): StandardMaterial {
  const m = new StandardMaterial(name, scene)
  m.diffuseColor = opts.color ? Color3.FromHexString(opts.color) : Color3.White()
  if (opts.texture) {
    const t = copyTexture(opts.texture)
    t.uScale = opts.scale ?? 1
    t.vScale = opts.scale ?? 1
    m.diffuseTexture = t
  }
  m.specularColor = new Color3(1, 1, 1).scale(opts.specular ?? 0.02)
  if (opts.twoSided) m.backFaceCulling = false
  return m
}

/** Bộ vật liệu dùng chung của cả cảnh. */
export function createMaterials(scene: Scene): Materials {
  const grassTex = soilTexture(scene, 'grassTex', [58, 104, 34], [120, 168, 66], 8, 2)
  const mudTex = soilTexture(scene, 'mudTex', [48, 36, 24], [96, 74, 50], 8, 4)
  const straw = strawTexture(scene)

  const brickTex = new BrickProceduralTexture('brickTex', 256, scene)
  brickTex.numberOfBricksHeight = 14
  brickTex.numberOfBricksWidth = 6
  brickTex.brickColor = new Color3(0.72, 0.36, 0.22)
  brickTex.jointColor = new Color3(0.78, 0.7, 0.6)

  const woodTex = new WoodProceduralTexture('woodTex', 256, scene)
  woodTex.ampScale = 60
  woodTex.woodColor = new Color3(0.42, 0.27, 0.14)

  const frond = mat(scene, 'frond', { texture: frondTexture(scene), twoSided: true, specular: 0.05 })
  frond.diffuseTexture!.hasAlpha = true
  frond.alphaCutOff = 0.25

  const windowMat = mat(scene, 'window', { color: '#2e2a22' })
  windowMat.emissiveColor = Color3.FromHexString('#ffc864')

  const metal = mat(scene, 'metal', { color: '#8d939a', specular: 0.45 })
  metal.specularPower = 64

  return {
    grass: mat(scene, 'grass', { texture: grassTex, scale: 60 }),
    bund: mat(scene, 'bund', { texture: grassTex, scale: 2, color: '#d8e6b8' }),
    mud: mat(scene, 'mud', { texture: mudTex, scale: 2, specular: 0.15 }),
    dry: mat(scene, 'dry', { texture: crackedSoilTexture(scene), scale: 2 }),
    plowed: mat(scene, 'plowed', { texture: furrowTexture(scene), scale: 2 }),
    brick: mat(scene, 'brick', { texture: brickTex, scale: 3 }),
    roof: mat(scene, 'roof', { texture: roofTileTexture(scene), scale: 4 }),
    wood: mat(scene, 'wood', { texture: woodTex, scale: 1 }),
    darkWood: mat(scene, 'darkWood', { texture: woodTex, scale: 1, color: '#7a5a40' }),
    plaster: mat(scene, 'plaster', { color: '#e8dcc0' }),
    straw: mat(scene, 'straw', { texture: straw, scale: 2, twoSided: true }),
    frond,
    trunk: mat(scene, 'trunk', { texture: woodTex, scale: 2, color: '#a89a88' }),
    bamboo: mat(scene, 'bamboo', { color: '#7fa046', specular: 0.2 }),
    sack: mat(scene, 'sackMat', { texture: sackTexture(scene) }),
    metal,
    skin: mat(scene, 'skin', { color: '#c98f64', specular: 0.08 }),
    window: windowMat,
    concrete: mat(scene, 'concrete', { texture: soilTexture(scene, 'concTex', [150, 146, 136], [196, 192, 182], 16, 6), scale: 4 }),
  }
}
