// The design map of Lochan's world. x = east, z = north (surface arc-length units from the plaza).
// Everything that has a place — buildings, paths, ponds, the coast — is authored here.
import { Vector3 } from 'three'
import { DEG, TAU, smoothstep } from '../engine/math'
import { R, mapToN, nToMap, surfaceDistance } from '../engine/planet'

export type PoiId = 'home' | 'experience' | 'work' | 'results' | 'hire'

export interface Poi {
  id: PoiId
  x: number
  z: number
  /** compass heading the front door faces (0 = north, 90deg = east) */
  yaw: number
  /** radius (surface units) that gets levelled flat for the building + forecourt */
  flat: number
  /** radius of the building footprint itself: nothing grows or is scattered inside */
  foot: number
  label: string
}

// ---- coast --------------------------------------------------------------------------------------
// Land radius (from the plaza) as a function of compass bearing.
const COAST: [number, number][] = [
  [0, 74],
  [45, 66],
  [90, 53],
  [135, 48],
  [180, 46],
  [225, 49],
  [270, 53],
  [315, 62],
  [360, 74],
]

export function coastRadius(theta: number) {
  let deg = (theta / DEG) % 360
  if (deg < 0) deg += 360
  for (let i = 0; i < COAST.length - 1; i++) {
    const [a0, r0] = COAST[i]
    const [a1, r1] = COAST[i + 1]
    if (deg >= a0 && deg <= a1) {
      const t = smoothstep(a0, a1, deg)
      return r0 + (r1 - r0) * t
    }
  }
  return 60
}

const onCoast = (deg: number, inset: number) => {
  const r = coastRadius(deg * DEG) - inset
  return { x: Math.sin(deg * DEG) * r, z: Math.cos(deg * DEG) * r }
}

// ---- plaza --------------------------------------------------------------------------------------
export const PLAZA = { x: 0, z: 2, r: 11.5 }

// ---- points of interest ------------------------------------------------------------------------
const lh = onCoast(50, 8.5)

export const POIS: Record<PoiId, Poi> = {
  home: { id: 'home', x: 0, z: 19.5, yaw: 180 * DEG, flat: 12, foot: 9, label: 'WHO AM I' },
  experience: { id: 'experience', x: -41, z: 4, yaw: 90 * DEG, flat: 21, foot: 22, label: 'EXPERIENCE' },
  work: { id: 'work', x: 40, z: 6, yaw: 270 * DEG, flat: 17, foot: 13, label: 'WORK' },
  results: { id: 'results', x: -25, z: 40, yaw: 150 * DEG, flat: 12, foot: 9, label: 'RESULTS' },
  hire: { id: 'hire', x: lh.x, z: lh.z, yaw: 232 * DEG, flat: 10, foot: 8, label: 'HIRE LOCHAN' },
}

export const POI_LIST = Object.values(POIS)

/** Where the door mat / entry trigger of a building sits (in front of the door). */
export function doorPoint(id: PoiId, dist: number) {
  const p = POIS[id]
  return { x: p.x + Math.sin(p.yaw) * dist, z: p.z + Math.cos(p.yaw) * dist }
}

// ---- spawn --------------------------------------------------------------------------------------
export const SPAWN = { x: 0, z: -(coastRadius(Math.PI) - 8.5) }

// ---- ponds --------------------------------------------------------------------------------------
export const PONDS = [
  { x: -19, z: -17, r: 5.6 },
  { x: 24, z: -19, r: 4.2 },
  { x: 24, z: 32, r: 3.6 },
]

// ---- paths --------------------------------------------------------------------------------------
export interface PathDef {
  id: string
  width: number
  pts: [number, number][]
}

export const PATHS: PathDef[] = [
  // arrival: beach -> plaza
  { id: 'spine', width: 3.4, pts: [[SPAWN.x, SPAWN.z], [1.2, -32], [-1.6, -24], [0.8, -17], [0, -10]] },
  // plaza -> experience
  { id: 'west', width: 3, pts: [[-11, 2.5], [-19, 5.5], [-26, 3], [-31.5, 4]] },
  // plaza -> work
  { id: 'east', width: 3.4, pts: [[11, 2.5], [19, 5.5], [26, 3.5], [31.5, 6]] },
  // plaza -> results
  { id: 'northwest', width: 3, pts: [[-6, 11.5], [-12.5, 19], [-18, 27], [-20.5, 35]] },
  // plaza -> lighthouse
  { id: 'northeast', width: 3, pts: [[6, 11.5], [13, 19], [21, 25], [29, 31], [(lh.x + 35) / 2 - 2, (lh.z + 33) / 2 - 1], [lh.x - 5, lh.z - 4.5]] },
  // experience -> results
  { id: 'exp-res', width: 2.4, pts: [[-33, 13], [-31, 21], [-27.5, 29], [-22, 35]] },
  // work -> lighthouse
  { id: 'work-hire', width: 2.4, pts: [[33.5, 14.5], [34, 22], [34, 28], [32, 31.5]] },
  // little detour to the north side of home
  { id: 'home-back', width: 2, pts: [[-6, 24], [-2, 29], [5, 30], [12, 24.5]] },
]

// ---- landmarks used by the world ---------------------------------------------------------------
export const LANDMARKS = {
  windmill: { x: 22, z: -8, yaw: 200 * DEG },
  dock: { x: SPAWN.x, z: SPAWN.z - 6.5 },
  boat: { x: 4.2, z: SPAWN.z - 12 },
}

// ---- helpers ------------------------------------------------------------------------------------
export function poiN(id: PoiId, out = new Vector3()) {
  const p = POIS[id]
  return mapToN(p.x, p.z, out)
}

const _a = new Vector3()

// Precomputed path polylines (dense) as unit vectors, used for distance queries + ribbons.
export interface PathSamples {
  def: PathDef
  pts: Vector3[] // dense unit vectors
  cum: number[] // cumulative arc length
  map: { x: number; z: number }[]
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

export function samplePath(def: PathDef, step = 1.1): PathSamples {
  const P = def.pts
  const map: { x: number; z: number }[] = []
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[Math.min(P.length - 1, i + 2)]
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    const n = Math.max(2, Math.ceil(segLen / step))
    for (let k = 0; k < n; k++) {
      const t = k / n
      map.push({ x: catmull(p0[0], p1[0], p2[0], p3[0], t), z: catmull(p0[1], p1[1], p2[1], p3[1], t) })
    }
  }
  const last = P[P.length - 1]
  map.push({ x: last[0], z: last[1] })
  const pts = map.map((m) => mapToN(m.x, m.z))
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + surfaceDistance(pts[i - 1], pts[i]))
  return { def, pts, cum, map }
}

let _paths: PathSamples[] | null = null
export function getPaths() {
  if (!_paths) _paths = PATHS.map((p) => samplePath(p))
  return _paths
}

/** Distance (surface units) from a unit vector to the nearest path centre-line, and that path's half-width. */
export function nearestPath(n: Vector3): { dist: number; half: number } {
  let best = 1e9
  let half = 0
  const paths = getPaths()
  for (const p of paths) {
    const pts = p.pts
    for (let i = 0; i < pts.length - 1; i++) {
      // coarse reject with dot product of segment start
      const a = pts[i]
      const dotA = a.dot(n)
      if (dotA < 0.985) continue // > ~10 units away
      const b = pts[i + 1]
      // planar approximation in chord space is fine at these tiny distances
      _a.copy(b).sub(a)
      const l2 = _a.lengthSq()
      let t = l2 > 0 ? (n.x - a.x) * _a.x + (n.y - a.y) * _a.y + (n.z - a.z) * _a.z : 0
      t = l2 > 0 ? Math.min(1, Math.max(0, t / l2)) : 0
      const dx = a.x + _a.x * t - n.x
      const dy = a.y + _a.y * t - n.y
      const dz = a.z + _a.z * t - n.z
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) * R // chord ~ arc at this scale
      if (d < best) {
        best = d
        half = p.def.width / 2
      }
    }
  }
  return { dist: best, half }
}

export const angleDiff = (a: number, b: number) => {
  let d = (a - b) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}

export { nToMap }
