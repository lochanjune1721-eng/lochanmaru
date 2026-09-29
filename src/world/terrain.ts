// Height of the ground (offset from land level R) at any point of the planet.
// Combines: the coast + sea floor, ponds, gentle hills — flattened around buildings, plaza and paths.
import { Vector3 } from 'three'
import { fbm3, noise3, smoothstep } from '../engine/math'
import { R, SEA, WALK_MIN, mapToN, nToMap, surfaceDistance } from '../engine/planet'
import { PLAZA, PONDS, POI_LIST, coastRadius, nearestPath } from './layout'

const _m = { x: 0, z: 0, r: 0, theta: 0 }

const poiNs = POI_LIST.map((p) => ({ n: mapToN(p.x, p.z), flat: p.flat }))
const pondNs = PONDS.map((p) => ({ n: mapToN(p.x, p.z), r: p.r }))
const plazaN = mapToN(PLAZA.x, PLAZA.z)

/** Signed distance to the shoreline in surface units: negative on land, positive out at sea. */
export function shoreDistance(n: Vector3) {
  nToMap(n, _m)
  const wob = 2.4 * noise3(n.x * 5.2 + 3.1, n.y * 5.2, n.z * 5.2) + 1.1 * noise3(n.x * 13, n.y * 13 + 7, n.z * 13)
  return _m.r - coastRadius(_m.theta) + wob
}

function seaProfile(s: number) {
  const beach = -0.34 * smoothstep(-7, 0.5, s)
  const deep = -3.4 * smoothstep(0.5, 10, s)
  return beach + deep
}

function pondProfile(n: Vector3, i: number) {
  const p = pondNs[i]
  const d = surfaceDistance(n, p.n)
  const pr = p.r * (1 + 0.14 * noise3(n.x * 9 + i * 5, n.y * 9, n.z * 9))
  const s = d - pr
  return -2.3 * (1 - smoothstep(-pr, 1.3, s))
}

/** 0..1 how much the ground here must stay level (buildings, plaza, paths). */
export function flatMask(n: Vector3) {
  let m = 0
  const dp = surfaceDistance(n, plazaN)
  m = Math.max(m, 1 - smoothstep(PLAZA.r + 1, PLAZA.r + 9, dp))
  for (const p of poiNs) {
    if (n.dot(p.n) < 0.7) continue
    m = Math.max(m, 1 - smoothstep(p.flat, p.flat + 9, surfaceDistance(n, p.n)))
  }
  if (m < 1) {
    const { dist, half } = nearestPath(n)
    m = Math.max(m, 1 - smoothstep(half + 0.5, half + 5, dist))
  }
  return m
}

const HILL_AMP = 1.5

export function terrain(n: Vector3): number {
  const s = shoreDistance(n)
  if (s > 12) return -3.4 // deep sea; skip everything else
  let h = seaProfile(s)
  // ponds
  for (let i = 0; i < pondNs.length; i++) {
    if (n.dot(pondNs[i].n) > 0.9) h = Math.min(h, pondProfile(n, i))
  }
  // hills, only inland and away from anything we build
  if (s < -6) {
    const land = smoothstep(-13, -7, s)
    const flat = flatMask(n)
    const f = fbm3(n.x * 3.3 + 11, n.y * 3.3, n.z * 3.3, 3)
    const hills = Math.max(0, f + 0.05) * HILL_AMP * 1.6
    h += hills * land * (1 - flat)
  }
  return h
}

export const groundRadius = (n: Vector3) => R + terrain(n)
export const isWalkable = (n: Vector3) => terrain(n) >= WALK_MIN
export const isUnderwater = (n: Vector3) => terrain(n) < SEA

/** Ground-surface world position for a unit vector. */
export function groundPoint(n: Vector3, out = new Vector3(), lift = 0) {
  return out.copy(n).multiplyScalar(R + terrain(n) + lift)
}
