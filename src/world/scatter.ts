// Decides where every plant and stone lives. Deterministic (seeded) so the world is identical every visit.
import { Color, Vector3 } from 'three'
import { fbm3, noise3, rng, smoothstep } from '../engine/math'
import { R, surfaceDistance, mapToN } from '../engine/planet'
import { P } from '../gfx/palette'
import { KEEP_CLEAR, PLAZA, POI_LIST, PONDS, SPAWN, nearestPath } from './layout'
import { shoreDistance, terrain } from './terrain'

export interface Placement {
  n: Vector3
  yaw: number
  s: number
  sy?: number
  color?: Color
}

export type FloraKind =
  | 'roundTree'
  | 'blossomTree'
  | 'cypress'
  | 'palm'
  | 'acacia'
  | 'cactus'
  | 'bush'
  | 'flowerBush'
  | 'rock'
  | 'pebbles'
  | 'tuft'
  | 'flower'
  | 'reed'
  | 'lily'

export type Flora = Record<FloraKind, Placement[]>

/** trunk collision radii (0 = walk-through) */
export const COLLIDE: Partial<Record<FloraKind, number>> = {
  roundTree: 0.5,
  blossomTree: 0.5,
  cypress: 0.45,
  palm: 0.35,
  acacia: 0.4,
  cactus: 0.45,
  bush: 0.7,
  flowerBush: 0.7,
  rock: 0.75,
}

const PLAZA_N_MAP = mapToN(PLAZA.x, PLAZA.z)
const SPAWN_N = mapToN(SPAWN.x, SPAWN.z)
const poiNs = POI_LIST.map((p) => ({ n: mapToN(p.x, p.z), foot: p.foot }))
const pondNs = PONDS.map((p) => ({ n: mapToN(p.x, p.z), r: p.r }))

/** Points spread evenly over the sphere (Fibonacci lattice). */
function fibonacci(count: number, out: Vector3[]) {
  const ga = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count
    const r = Math.sqrt(1 - y * y)
    const a = i * ga
    out.push(new Vector3(Math.cos(a) * r, y, Math.sin(a) * r))
  }
  return out
}

const tangentA = new Vector3()
const tangentB = new Vector3()

function jitterOnSphere(n: Vector3, amount: number, rand: () => number, out: Vector3) {
  tangentA.set(0, 1, 0).cross(n)
  if (tangentA.lengthSq() < 1e-4) tangentA.set(1, 0, 0).cross(n)
  tangentA.normalize()
  tangentB.crossVectors(n, tangentA)
  return out
    .copy(n)
    .addScaledVector(tangentA, (rand() - 0.5) * 2 * amount)
    .addScaledVector(tangentB, (rand() - 0.5) * 2 * amount)
    .normalize()
}

export function generateFlora(density = 1): Flora {
  const rand = rng(20240607)
  const flora = {} as Flora
  ;(['roundTree', 'blossomTree', 'cypress', 'palm', 'acacia', 'cactus', 'bush', 'flowerBush', 'rock', 'pebbles', 'tuft', 'flower', 'reed', 'lily'] as FloraKind[]).forEach((k) => (flora[k] = []))

  const spacing = (u: number) => u / R // surface units -> radians
  const cand: Vector3[] = []

  const gather = (unitsApart: number) => {
    cand.length = 0
    const area = 4 * Math.PI * R * R
    const count = Math.round(area / (unitsApart * unitsApart))
    return fibonacci(count, cand)
  }

  const clearNs = KEEP_CLEAR.map((c) => ({ n: mapToN(c.x, c.z), r: c.r }))
  const scratch = new Vector3()
  const info = (n: Vector3) => {
    const s = shoreDistance(n)
    const h = terrain(n)
    const pd = nearestPath(n)
    let dPoi = 1e9
    for (const p of poiNs) if (n.dot(p.n) > 0.6) dPoi = Math.min(dPoi, surfaceDistance(n, p.n) - p.foot)
    const dPlaza = surfaceDistance(n, PLAZA_N_MAP) - PLAZA.r
    let dPond = 1e9
    for (const p of pondNs) if (n.dot(p.n) > 0.85) dPond = Math.min(dPond, surfaceDistance(n, p.n) - p.r)
    const dSpawn = surfaceDistance(n, SPAWN_N)
    let dClear = 1e9
    for (const c of clearNs) if (n.dot(c.n) > 0.8) dClear = Math.min(dClear, surfaceDistance(n, c.n) - c.r)
    return { s, h, dPath: pd.dist - pd.half, dPoi, dPlaza, dPond, dSpawn, dClear }
  }

  const pushP = (k: FloraKind, n: Vector3, sMin: number, sMax: number, color?: Color, tall = true) => {
    const s = sMin + rand() * (sMax - sMin)
    flora[k].push({ n: n.clone(), yaw: rand() * Math.PI * 2, s, sy: tall ? s * (0.92 + rand() * 0.22) : s, color })
  }

  const dens = Math.max(0.2, density)

  // ---- trees (spaced ~4.8 units apart) -------------------------------------------------------
  {
    const pts = gather(4.6)
    const kept: Vector3[] = []
    for (const base of pts) {
      const n = jitterOnSphere(base, spacing(2.1), rand, scratch.clone())
      const i = info(n)
      if (i.s > -4.5 || i.h < 0.05 || i.dPond < 3.2 || i.dSpawn < 12 || i.dClear < 2) continue
      if (i.dPath < 2.6 || i.dPoi < 3 || i.dPlaza < 3.2) continue
      const grove = fbm3(n.x * 3.7 + 2, n.y * 3.7, n.z * 3.7, 3)
      const dry = fbm3(n.x * 2.4 + 9, n.y * 2.4, n.z * 2.4, 2) * 0.5 + 0.5
      let p = smoothstep(-0.02, 0.32, grove) * 0.95 + 0.05
      // keep a little air around the plaza and the arrival avenue
      p *= 0.4 + 0.6 * smoothstep(3, 14, i.dPlaza)
      if (rand() > p * dens) continue
      // min spacing
      let ok = true
      for (const q of kept) {
        if (q.dot(n) > 0.9925) {
          ok = false
          break
        }
      }
      if (!ok) continue
      kept.push(n)
      if (dry > 0.62 && i.h > 0.1) {
        if (rand() < 0.55) pushP('acacia', n, 0.95, 1.35)
        else pushP('cactus', n, 0.9, 1.4)
      } else {
        const r = rand()
        const nearCoast = i.s > -13
        if (nearCoast && r < 0.4) pushP('cypress', n, 0.9, 1.3)
        else if (r < 0.62) pushP('roundTree', n, 0.9, 1.35)
        else if (r < 0.8) pushP('blossomTree', n, 0.9, 1.3)
        else if (r < 0.92) pushP('cypress', n, 0.85, 1.25)
        else pushP('acacia', n, 0.9, 1.2)
      }
    }
  }

  // ---- palms along the beaches ---------------------------------------------------------------
  {
    const pts = gather(3.6)
    const kept: Vector3[] = []
    for (const base of pts) {
      const n = jitterOnSphere(base, spacing(1.6), rand, scratch.clone())
      const s = shoreDistance(n)
      if (s > -1.8 || s < -6.5) continue
      const h = terrain(n)
      if (h < -0.34 || h > 0.05) continue
      const i = info(n)
      if (i.dPath < 3 || i.dPoi < 2 || i.dSpawn < 13 || i.dClear < 1.5) continue
      if (rand() > 0.22 * dens) continue
      let ok = true
      for (const q of kept) if (q.dot(n) > 0.9968) ok = false
      if (!ok) continue
      kept.push(n)
      pushP('palm', n, 0.9, 1.35)
    }
  }

  // ---- bushes, flower bushes, rocks -------------------------------------------------------------
  {
    const pts = gather(2.5)
    for (const base of pts) {
      const n = jitterOnSphere(base, spacing(1.1), rand, scratch.clone())
      const i = info(n)
      if (i.s > -3 || i.h < 0.02 || i.dPond < 1.8 || i.dSpawn < 8 || i.dClear < 1.2) continue
      if (i.dPath < 1.6 || i.dPoi < 1 || i.dPlaza < 1.4) continue
      const bushN = fbm3(n.x * 5.5 + 4, n.y * 5.5, n.z * 5.5, 2)
      const r = rand()
      if (bushN > 0.12 && r < 0.42 * dens) {
        if (rand() < 0.4) pushP('flowerBush', n, 0.85, 1.3)
        else pushP('bush', n, 0.8, 1.4)
      } else if (r > 0.985) pushP('rock', n, 0.8, 1.7)
    }
  }

  // ---- path edge dressing: pebbles + tufts hugging the trail --------------------------------------
  {
    const pts = gather(1.15)
    for (const base of pts) {
      const n = jitterOnSphere(base, spacing(0.55), rand, scratch.clone())
      const s = shoreDistance(n)
      if (s > -3) continue
      const pd = nearestPath(n)
      const d = pd.dist - pd.half
      if (d > 0.9 || d < -0.05) continue
      if (rand() < 0.16 * dens) pushP('pebbles', n, 0.8, 1.3)
    }
  }

  // ---- grass tufts + flowers (dense) --------------------------------------------------------------
  {
    const pts = gather(0.66)
    for (const base of pts) {
      const n = jitterOnSphere(base, spacing(0.4), rand, scratch.clone())
      const s = shoreDistance(n)
      if (s > -3.5) continue
      // cheap early-out before the heavier tests
      const h = terrain(n)
      if (h < 0.03) continue
      const i = info(n)
      if (i.dPath < 0.55 || i.dPoi < -0.5 || i.dPlaza < 0.6 || i.dPond < 0.4 || i.dClear < 0.3) continue
      const clump = noise3(n.x * 13, n.y * 13, n.z * 13) * 0.5 + 0.5
      const near = smoothstep(2.4, 0.6, i.dPath)
      if (rand() < (0.2 + clump * 0.42 + near * 0.3) * dens) pushP('tuft', n, 0.55, 1.05)
      const fl = fbm3(n.x * 8.8 + 30, n.y * 8.8, n.z * 8.8, 2)
      if (fl > 0.2 && rand() < 0.5 * dens) {
        const pal = [P.pink, P.marigold, P.cream, P.lilac, P.coral]
        pushP('flower', n, 0.8, 1.3, new Color(pal[Math.floor(rand() * pal.length)]))
      }
    }
  }

  // ---- reeds + lilies around ponds ------------------------------------------------------------------
  for (const pond of pondNs) {
    const count = Math.round(pond.r * 5)
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2
      const dist = pond.r * (0.9 + rand() * 0.5)
      // offset in the tangent plane at the pond centre
      tangentA.set(0, 1, 0).cross(pond.n)
      if (tangentA.lengthSq() < 1e-4) tangentA.set(1, 0, 0).cross(pond.n)
      tangentA.normalize()
      tangentB.crossVectors(pond.n, tangentA)
      const n = pond.n.clone().addScaledVector(tangentA, (Math.cos(a) * dist) / R).addScaledVector(tangentB, (Math.sin(a) * dist) / R).normalize()
      const h = terrain(n)
      if (h > -0.05 && h < 0.5) pushP('reed', n, 0.8, 1.3)
    }
    // lily pads float on the water
    for (let k = 0; k < Math.round(pond.r * 1.6); k++) {
      const a = rand() * Math.PI * 2
      const dist = Math.sqrt(rand()) * pond.r * 0.62
      const n = pond.n.clone().addScaledVector(tangentA, (Math.cos(a) * dist) / R).addScaledVector(tangentB, (Math.sin(a) * dist) / R).normalize()
      if (terrain(n) < -0.6) pushP('lily', n, 0.7, 1.2)
    }
  }

  return flora
}
