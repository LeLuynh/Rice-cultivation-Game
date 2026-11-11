export interface Lighting {
  sky: string
  sunIntensity: number
  sunColor: string
  ambient: number
  windowGlow: number
}

// Các mốc giờ trong ngày (spec 7): sáng trời xanh, 17–19 giờ hoàng hôn, 19–22 giờ tối có trăng.
const KEYS: { hour: number; l: Lighting }[] = [
  { hour: 6, l: { sky: '#f3b58a', sunIntensity: 0.7, sunColor: '#ffd2a1', ambient: 0.45, windowGlow: 0 } },
  { hour: 8, l: { sky: '#8fd0f0', sunIntensity: 1.3, sunColor: '#fff6e5', ambient: 0.6, windowGlow: 0 } },
  { hour: 17, l: { sky: '#8fd0f0', sunIntensity: 1.2, sunColor: '#fff1d6', ambient: 0.6, windowGlow: 0 } },
  { hour: 18, l: { sky: '#f08a4b', sunIntensity: 0.8, sunColor: '#ff9a50', ambient: 0.45, windowGlow: 0.3 } },
  { hour: 19, l: { sky: '#2a3566', sunIntensity: 0.25, sunColor: '#9fb3ff', ambient: 0.25, windowGlow: 1 } },
  { hour: 22, l: { sky: '#0c1430', sunIntensity: 0.2, sunColor: '#9fb3ff', ambient: 0.18, windowGlow: 1 } },
]

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

function lerpColor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  let out = 0
  for (const shift of [16, 8, 0]) {
    const ca = (pa >> shift) & 0xff
    const cb = (pb >> shift) & 0xff
    out |= Math.round(lerp(ca, cb, t)) << shift
  }
  return `#${out.toString(16).padStart(6, '0')}`
}

/** Ánh sáng tại giờ `hour` (6–22), nội suy mượt giữa các mốc; ngoài khoảng thì giữ mốc đầu/cuối. */
export function lightingAt(hour: number): Lighting {
  if (hour <= KEYS[0].hour) return { ...KEYS[0].l }
  const last = KEYS[KEYS.length - 1]
  if (hour >= last.hour) return { ...last.l }
  const i = KEYS.findIndex(k => k.hour > hour)
  const a = KEYS[i - 1]
  const b = KEYS[i]
  const t = (hour - a.hour) / (b.hour - a.hour)
  return {
    sky: lerpColor(a.l.sky, b.l.sky, t),
    sunIntensity: lerp(a.l.sunIntensity, b.l.sunIntensity, t),
    sunColor: lerpColor(a.l.sunColor, b.l.sunColor, t),
    ambient: lerp(a.l.ambient, b.l.ambient, t),
    windowGlow: lerp(a.l.windowGlow, b.l.windowGlow, t),
  }
}
