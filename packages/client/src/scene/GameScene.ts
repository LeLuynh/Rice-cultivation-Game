import {
  Color3, Color4, DefaultRenderingPipeline, DirectionalLight, Engine, FreeCamera, HemisphericLight, ImageProcessingConfiguration,
  MeshBuilder, Scene, ShadowGenerator, Vector3, type Mesh,
} from '@babylonjs/core'
import { SkyMaterial } from '@babylonjs/materials'
import { CONFIG, clockTime } from '@rice/core'
import { useGame, type Quality } from '../game/store'
import { HOUSE_DOOR } from '../game/layout'
import { lightingAt } from './lighting'
import { createMaterials } from './materials'
import { createBunds, createCanal, createFieldWater, createTerrain } from './terrain'
import { createVillage } from './village'
import { RiceLayer } from './rice'
import { PlotViews } from './plots'
import { PlayerController } from './player'
import { HeldTool } from './heldTool'
import { Workers } from './workers'
import { Lamps } from './lamps'
import { createPerson, personMeshes } from './person'
import { sunDirection } from './view'

const WINDOW_GLOW = Color3.FromHexString('#ffc864')

/** Vị trí mặt trời cho bầu trời: tiếp tục lặn xuống dưới chân trời sau 18 giờ để trời tối thật. */
function skySun(hour: number): Vector3 {
  const angle = ((hour - 6) / 12) * Math.PI
  // nâng nhẹ để 6–8 giờ sáng trời đã xanh; sau 19 giờ vẫn xuống dưới chân trời
  return new Vector3(Math.cos(angle), Math.sin(angle) * 0.75 + 0.25, 0.35).normalize().scale(100)
}

/** Toàn bộ cảnh 3D Babylon.js; đọc store zustand mỗi khung hình (spec 11). */
export class GameScene {
  private engine: Engine
  private scene: Scene
  private disposeFns: (() => void)[] = []

  constructor(canvas: HTMLCanvasElement, quality: Quality) {
    const high = quality === 'high'
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true }, true)
    this.engine.setHardwareScalingLevel(high ? 1 / Math.min(window.devicePixelRatio || 1, 1.5) : 1)
    const scene = new Scene(this.engine)
    this.scene = scene
    scene.useRightHandedSystem = true
    scene.clearColor = new Color4(0.55, 0.75, 0.9, 1)
    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = 0.0045
    scene.skipPointerMovePicking = true

    const camera = new FreeCamera('eye', new Vector3(0, 1.6, 0), scene)
    camera.inputs.clear()
    camera.minZ = 0.05
    camera.maxZ = 1200
    camera.fov = 1.15

    const hemi = new HemisphericLight('sky', new Vector3(0, 1, 0), scene)
    hemi.groundColor = Color3.FromHexString('#4a5a2a')
    const sun = new DirectionalLight('sun', new Vector3(-0.5, -1, -0.3), scene)
    sun.position = new Vector3(0, 80, 0)

    const sky = MeshBuilder.CreateBox('skyBox', { size: 1000, sideOrientation: 1 }, scene)
    const skyMat = new SkyMaterial('skyMat', scene)
    skyMat.backFaceCulling = false
    skyMat.useSunPosition = true
    skyMat.turbidity = 6
    skyMat.rayleigh = 2
    skyMat.mieDirectionalG = 0.85
    skyMat.luminance = 1
    sky.material = skyMat
    sky.infiniteDistance = true
    sky.isPickable = false
    sky.applyFog = false

    const m = createMaterials(scene)
    const terrain = createTerrain(scene, m)
    const bunds = createBunds(scene, m)
    createCanal(scene, m)
    const casters = createVillage(scene, m)

    const landlord = createPerson(scene, m, { shirt: '#6e2323', pants: '#1e1c1a', name: 'landlord' })
    landlord.root.position.set(HOUSE_DOOR[0] + 1.5, 0.3, HOUSE_DOOR[1] - 0.5)
    landlord.root.rotation.y = Math.PI
    casters.push(...personMeshes(landlord))

    let shadows: ShadowGenerator | null = null
    if (high) {
      shadows = new ShadowGenerator(2048, sun)
      shadows.usePercentageCloserFiltering = true
      shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM
      shadows.bias = 0.002
      shadows.normalBias = 0.02
      for (const c of casters) shadows.addShadowCaster(c)
      sun.autoUpdateExtends = false
      sun.shadowMinZ = 1
      sun.shadowMaxZ = 260
      sun.orthoLeft = -70
      sun.orthoRight = 70
      sun.orthoTop = 70
      sun.orthoBottom = -70
    }

    const perSide = high ? 12 : 8
    const plots = new PlotViews(scene, m, CONFIG.plotCount, perSide)
    const rice = new RiceLayer(scene, true)
    const { water } = createFieldWater(scene, high)
    if (water) {
      const reflected: Mesh[] = [sky, terrain, bunds, ...casters.filter(c => c.getClassName() === 'Mesh')]
      for (const r of reflected) water.addToRenderList(r)
      for (const g of plots.grounds) water.addToRenderList(g)
    }
    rice.onMeshCreated = mesh => { if (water) water.addToRenderList(mesh) }

    const player = new PlayerController(scene, camera, canvas)
    const held = new HeldTool(scene, m, camera)
    const workers = new Workers(scene, m, shadows)

    const lamps = new Lamps(scene, m, camera, high)
    // mặc định Babylon chỉ tính 4 đèn mỗi vật liệu; ban đêm cần trời, trăng, đèn cầm tay và 4 cột đèn (tổng 7)
    const maxLights = high ? 7 : 3
    const raiseLights = (mt: unknown): void => {
      if (mt && typeof mt === 'object' && 'maxSimultaneousLights' in mt) (mt as { maxSimultaneousLights: number }).maxSimultaneousLights = maxLights
    }
    scene.materials.forEach(raiseLights)
    scene.onNewMaterialAddedObservable.add(raiseLights)

    const pipeline = new DefaultRenderingPipeline('post', true, scene, [camera])
    pipeline.samples = high ? 4 : 1
    pipeline.fxaaEnabled = true
    pipeline.imageProcessingEnabled = true
    pipeline.imageProcessing.toneMappingEnabled = true
    pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES
    pipeline.imageProcessing.exposure = 1.1
    pipeline.imageProcessing.contrast = 1.15
    pipeline.imageProcessing.vignetteEnabled = true
    pipeline.imageProcessing.vignetteWeight = 1.2
    pipeline.bloomEnabled = high
    pipeline.bloomThreshold = 0.85
    pipeline.bloomWeight = 0.25
    pipeline.bloomKernel = 48

    let elapsed = 0
    let lastHour = -1
    scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1)
      elapsed += dt
      const state = useGame.getState()
      const game = state.game
      if (!game) return

      const byLook = plots.sync(game.plots)
      if (byLook) rice.set(byLook)
      rice.update(dt)
      plots.animate(elapsed)

      // ánh sáng theo giờ: cập nhật khi giờ đổi đủ nhiều (mỗi phút game)
      const { hour, minute } = clockTime(game.dayElapsedSec)
      const h = hour + minute / 60
      if (Math.abs(h - lastHour) >= 1 / 60) {
        lastHour = h
        const light = lightingAt(h)
        const dir = sunDirection(h)
        sun.direction.set(...dir)
        sun.position = new Vector3(-dir[0] * 100, -dir[1] * 100, -dir[2] * 100)
        sun.intensity = light.sunIntensity * 1.6
        sun.diffuse = Color3.FromHexString(light.sunColor)
        hemi.intensity = light.ambient * 1.3
        hemi.diffuse = Color3.FromHexString(light.sky).scale(0.5).add(new Color3(0.5, 0.5, 0.5))
        skyMat.sunPosition = skySun(h)
        skyMat.luminance = h >= 19 ? 0.4 : 1
        const fog = Color3.FromHexString(light.sky)
        scene.fogColor = fog
        scene.clearColor = Color4.FromColor3(fog)
        m.window.emissiveColor = WINDOW_GLOW.scale(light.windowGlow * 1.6)
        lamps.setGlow(light.windowGlow)
      }

      held.select(state.selectedTool)
      const acting = player.update(dt)
      held.update(dt, acting, player.moving)
      landlord.pose({ walk: 0, moving: false, bend: 0, work: 0 })
      workers.update(state.workerVisits, performance.now())
    })

    this.engine.runRenderLoop(() => scene.render())
    const onResize = (): void => this.engine.resize()
    window.addEventListener('resize', onResize)
    this.disposeFns.push(() => window.removeEventListener('resize', onResize), () => player.dispose())
  }

  dispose(): void {
    for (const f of this.disposeFns) f()
    this.engine.stopRenderLoop()
    this.scene.dispose()
    this.engine.dispose()
  }
}
