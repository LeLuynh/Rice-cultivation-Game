import { DynamicTexture, Texture, type Scene } from '@babylonjs/core'

// Texture vẽ bằng canvas (không tải file ngoài). Mọi texture lặp liền mạch (tileable).

type RGB = [number, number, number]

const hash2 = (x: number, y: number, seed: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Nhiễu giá trị lặp theo chu kỳ `period`, nhiều tầng (fbm), trả 0..1. */
export function tileNoise(u: number, v: number, period: number, seed: number, octaves = 4): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let p = period
  for (let o = 0; o < octaves; o++) {
    const x = u * p
    const y = v * p
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = x - x0
    const fy = y - y0
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const w = (a: number): number => ((a % p) + p) % p
    const n00 = hash2(w(x0), w(y0), seed + o)
    const n10 = hash2(w(x0 + 1), w(y0), seed + o)
    const n01 = hash2(w(x0), w(y0 + 1), seed + o)
    const n11 = hash2(w(x0 + 1), w(y0 + 1), seed + o)
    sum += amp * ((n00 * (1 - sx) + n10 * sx) * (1 - sy) + (n01 * (1 - sx) + n11 * sx) * sy)
    norm += amp
    amp *= 0.5
    p *= 2
  }
  return sum / norm
}

function canvasTexture(scene: Scene, name: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void, alpha = false): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, true)
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D
  draw(ctx, size)
  tex.update(true)
  tex.hasAlpha = alpha
  tex.wrapU = Texture.WRAP_ADDRESSMODE
  tex.wrapV = Texture.WRAP_ADDRESSMODE
  tex.anisotropicFilteringLevel = 8
  return tex
}

function pixels(ctx: CanvasRenderingContext2D, size: number, fn: (u: number, v: number) => RGB): void {
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = fn(x / size, y / size)
      const i = (y * size + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]

/** Đất nhiễu hai màu (bùn, đất khô, cỏ…). */
export function soilTexture(scene: Scene, name: string, dark: RGB, light: RGB, period = 8, seed = 1): DynamicTexture {
  return canvasTexture(scene, name, 256, (ctx, size) => pixels(ctx, size, (u, v) => {
    const n = tileNoise(u, v, period, seed, 5)
    const speck = hash2(Math.floor(u * size), Math.floor(v * size), seed) * 0.12
    return mix(dark, light, Math.min(1, n * 1.2 + speck))
  }))
}

/** Đất khô nứt nẻ: nền vàng nâu với đường nứt tối. */
export function crackedSoilTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'cracked', 256, (ctx, size) => pixels(ctx, size, (u, v) => {
    const n = tileNoise(u, v, 6, 3, 5)
    const cell = tileNoise(u, v, 5, 9, 1)
    const crack = Math.abs(cell - 0.5) < 0.025 ? 0.45 : 1
    return mix([120, 92, 58], [178, 146, 100], n).map(c => c * crack) as RGB
  }))
}

/** Ruộng đã cày: luống song song. */
export function furrowTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'furrow', 256, (ctx, size) => pixels(ctx, size, (u, v) => {
    const n = tileNoise(u, v, 8, 5, 4)
    const ridge = 0.5 + 0.5 * Math.sin(v * Math.PI * 2 * 8)
    return mix([52, 38, 26], [104, 80, 56], ridge * 0.7 + n * 0.3)
  }))
}

/** Bản đồ pháp tuyến cho mặt nước từ nhiễu. */
export function waterNormalTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'waterNormal', 256, (ctx, size) => pixels(ctx, size, (u, v) => {
    const e = 1 / size
    const h = (a: number, b: number): number => tileNoise(a, b, 6, 11, 4)
    const dx = (h(u + e, v) - h(u - e, v)) * 40
    const dy = (h(u, v + e) - h(u, v - e)) * 40
    const len = Math.hypot(dx, dy, 1)
    return [(-dx / len * 0.5 + 0.5) * 255, (-dy / len * 0.5 + 0.5) * 255, (1 / len * 0.5 + 0.5) * 255]
  }))
}

/** Mái ngói đỏ: hàng ngói cong xếp chồng. */
export function roofTileTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'roofTiles', 256, (ctx, size) => pixels(ctx, size, (u, v) => {
    const rows = 8
    const cols = 8
    const ry = (v * rows) % 1
    const offset = Math.floor(v * rows) % 2 === 0 ? 0 : 0.5
    const cx = ((u * cols + offset) % 1) - 0.5
    const curve = 1 - cx * cx * 3
    const shade = 0.55 + 0.45 * ry * curve
    const n = tileNoise(u, v, 16, 21, 3)
    const base: RGB = mix([150, 62, 38], [190, 92, 56], n)
    return base.map(c => c * shade) as RGB
  }))
}

/** Rơm / nón lá: sợi vàng nhạt. */
export function strawTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'straw', 128, (ctx, size) => pixels(ctx, size, (u, v) => {
    const fiber = tileNoise(u * 0.1, v, 32, 31, 2)
    const n = tileNoise(u, v, 8, 33, 3)
    return mix([176, 146, 82], [236, 214, 150], fiber * 0.6 + n * 0.4)
  }))
}

/** Lá dừa: gân giữa và các lá chét xiên, nền trong suốt. */
export function frondTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'frond', 256, (ctx, size) => {
    ctx.clearRect(0, 0, size, size)
    const mid = size / 2
    for (let i = 0; i < 46; i++) {
      const y = (i / 46) * size
      const len = (size / 2) * Math.sin((i / 46) * Math.PI) * 0.95 + 6
      const g = 90 + ((i * 37) % 50)
      ctx.strokeStyle = `rgb(${40 + (i % 3) * 8},${g},${36})`
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(mid, y)
        ctx.quadraticCurveTo(mid + side * len * 0.5, y + 6, mid + side * len, y + 22)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = '#6b7a2c'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(mid, 0)
    ctx.lineTo(mid, size)
    ctx.stroke()
  }, true)
}

/** Biển gỗ có chữ. */
export function signTexture(scene: Scene, lines: string[]): DynamicTexture {
  const tex = canvasTexture(scene, 'sign', 256, (ctx, size) => {
    pixels(ctx, size, (u, v) => mix([170, 128, 78], [214, 172, 112], tileNoise(u * 0.2, v, 16, 41, 3)))
    // UV của mặt phẳng (hệ tay phải) lật ngang so với canvas: vẽ chữ lật gương để lên biển đọc xuôi
    ctx.setTransform(-1, 0, 0, 1, size, 0)
    ctx.fillStyle = '#8f1d14'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    lines.forEach((line, i) => {
      ctx.font = i === 0 ? 'bold 96px sans-serif' : 'bold 52px sans-serif'
      ctx.fillText(line, size / 2, size * (lines.length === 1 ? 0.5 : 0.35 + i * 0.36))
    })
  })
  tex.wrapU = Texture.CLAMP_ADDRESSMODE
  tex.wrapV = Texture.CLAMP_ADDRESSMODE
  return tex
}

/** Bao tải trắng có nhãn xanh. */
export function sackTexture(scene: Scene): DynamicTexture {
  return canvasTexture(scene, 'sack', 128, (ctx, size) => {
    pixels(ctx, size, (u, v) => mix([214, 210, 196], [242, 240, 230], tileNoise(u, v, 32, 51, 2)))
    ctx.fillStyle = '#2f7d3a'
    ctx.fillRect(size * 0.2, size * 0.35, size * 0.6, size * 0.3)
  })
}
