// Small deterministic math helpers: RNG, value noise, easing, damping.

export const TAU = Math.PI * 2
export const DEG = Math.PI / 180

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => (v - a) / (b - a)
export const saturate = (v: number) => clamp(v, 0, 1)

export function smoothstep(a: number, b: number, x: number) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export const smootherstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Frame-rate independent exponential smoothing. `lambda` ~ responsiveness (1/s). */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

export function dampAngle(current: number, target: number, lambda: number, dt: number) {
  let d = (target - current) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return current + d * (1 - Math.exp(-lambda * dt))
}

export const approach = (current: number, target: number, maxDelta: number) =>
  current < target ? Math.min(current + maxDelta, target) : Math.max(current - maxDelta, target)

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}
export const easeOutElastic = (t: number) => {
  if (t === 0 || t === 1) return t
  return Math.pow(2, -10 * t) * Math.sin(((t * 10 - 0.75) * TAU) / 3) + 1
}

/** Seeded RNG (mulberry32). */
export function rng(seed: number) {
  let a = seed | 0
  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash3(ix: number, iy: number, iz: number) {
  let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return ((h >>> 0) / 4294967295) * 2 - 1
}

/** 3D value noise in [-1, 1]. */
export function noise3(x: number, y: number, z: number) {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const w = zf * zf * (3 - 2 * zf)
  const n000 = hash3(xi, yi, zi)
  const n100 = hash3(xi + 1, yi, zi)
  const n010 = hash3(xi, yi + 1, zi)
  const n110 = hash3(xi + 1, yi + 1, zi)
  const n001 = hash3(xi, yi, zi + 1)
  const n101 = hash3(xi + 1, yi, zi + 1)
  const n011 = hash3(xi, yi + 1, zi + 1)
  const n111 = hash3(xi + 1, yi + 1, zi + 1)
  const x00 = n000 + (n100 - n000) * u
  const x10 = n010 + (n110 - n010) * u
  const x01 = n001 + (n101 - n001) * u
  const x11 = n011 + (n111 - n011) * u
  const y0 = x00 + (x10 - x00) * v
  const y1 = x01 + (x11 - x01) * v
  return y0 + (y1 - y0) * w
}

export function fbm3(x: number, y: number, z: number, octaves = 3) {
  let amp = 0.5
  let f = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x * f, y * f, z * f) * amp
    norm += amp
    amp *= 0.5
    f *= 2.03
  }
  return sum / norm
}

export const pick = <T,>(arr: readonly T[], r: () => number): T => arr[Math.floor(r() * arr.length) % arr.length]
