// Builds the ground and sea meshes from one shared cube-sphere lattice so the shoreline lines up.
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Vector3 } from 'three'
import { fbm3, lerp, noise3, saturate, smoothstep } from '../engine/math'
import { R, SEA } from '../engine/planet'
import { P } from '../gfx/palette'
import { terrain } from './terrain'

const FACES = [
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
]

interface Lattice {
  dirs: Float32Array // unit directions (3 per vertex)
  heights: Float32Array
  index: number[]
  count: number
}

function buildLattice(N: number): Lattice {
  const per = N + 1
  const count = per * per * 6
  const dirs = new Float32Array(count * 3)
  const heights = new Float32Array(count)
  const index: number[] = []
  const v = new Vector3()
  let vi = 0
  for (let f = 0; f < 6; f++) {
    const F = FACES[f]
    const base = f * per * per
    for (let j = 0; j <= N; j++) {
      for (let i = 0; i <= N; i++) {
        // slight tangent warp evens out cube-sphere cell sizes
        const s = Math.tan(((i / N) * 2 - 1) * Math.PI * 0.25)
        const t = Math.tan(((j / N) * 2 - 1) * Math.PI * 0.25)
        v.set(F.n[0] + F.u[0] * s + F.v[0] * t, F.n[1] + F.u[1] * s + F.v[1] * t, F.n[2] + F.u[2] * s + F.v[2] * t).normalize()
        dirs[vi * 3] = v.x
        dirs[vi * 3 + 1] = v.y
        dirs[vi * 3 + 2] = v.z
        heights[vi] = terrain(v)
        vi++
      }
    }
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = base + j * per + i
        const b = a + 1
        const c = a + per
        const d = c + 1
        // every face basis has u x v = +n, so one CCW order fits all six
        index.push(a, b, c, b, d, c)
      }
    }
  }
  return { dirs, heights, index, count }
}

const cGrassA = new Color(P.grassA)
const cGrassB = new Color(P.grassB)
const cGrassC = new Color(P.grassC)
const cDry = new Color(P.grassDry)
const cDark = new Color(P.grassDark)
const cSand = new Color(P.sand)
const cSandD = new Color(P.sandDark)
const cWet = new Color(P.sandWet)
const cBed = new Color(P.seabed)
const tmp = new Color()

function groundColor(n: Vector3, h: number, out: Color) {
  const a = noise3(n.x * 7.5, n.y * 7.5, n.z * 7.5) * 0.5 + 0.5
  const b = noise3(n.x * 19 + 4, n.y * 19, n.z * 19) * 0.5 + 0.5
  const dryPatch = smoothstep(0.55, 0.85, fbm3(n.x * 2.4 + 9, n.y * 2.4, n.z * 2.4, 2) * 0.5 + 0.5)
  out.copy(cGrassB).lerp(cGrassA, a)
  out.lerp(cGrassC, smoothstep(0.6, 0.95, b) * 0.55)
  out.lerp(cDry, dryPatch * 0.42)
  // hollows read darker & lusher, crests lighter
  out.lerp(cDark, smoothstep(0.0, -0.05, h) * 0.0)
  out.lerp(cGrassC, saturate(h / 3) * 0.25)

  // beach: sand where the ground dips towards the water
  const sandy = smoothstep(-0.05, -0.34, h)
  tmp.copy(cSand).lerp(cSandD, smoothstep(0.4, 0.9, a) * 0.7)
  out.lerp(tmp, sandy)
  // wet sand & sea-bed
  const wet = smoothstep(SEA + 0.28, SEA - 0.05, h)
  out.lerp(cWet, wet * 0.9)
  const bed = smoothstep(SEA - 0.15, SEA - 1.6, h)
  out.lerp(cBed, bed)
  return out
}

export interface PlanetGeometries {
  ground: BufferGeometry
  sea: BufferGeometry
}

export function buildPlanetGeometries(N = 64): PlanetGeometries {
  const L = buildLattice(N)
  const n = new Vector3()

  // ---- ground
  const pos = new Float32Array(L.count * 3)
  const col = new Float32Array(L.count * 3)
  const c = new Color()
  for (let i = 0; i < L.count; i++) {
    n.set(L.dirs[i * 3], L.dirs[i * 3 + 1], L.dirs[i * 3 + 2])
    const h = L.heights[i]
    pos[i * 3] = n.x * (R + h)
    pos[i * 3 + 1] = n.y * (R + h)
    pos[i * 3 + 2] = n.z * (R + h)
    groundColor(n, h, c)
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  let ground = new BufferGeometry()
  ground.setAttribute('position', new Float32BufferAttribute(pos, 3))
  ground.setAttribute('color', new Float32BufferAttribute(col, 3))
  ground.setIndex(L.index)
  ground = mergeVertices(ground, 1e-3)
  ground.computeVertexNormals()
  ground.computeBoundingSphere()

  // ---- sea (only triangles that can touch water)
  const depth = new Float32Array(L.count)
  const spos = new Float32Array(L.count * 3)
  for (let i = 0; i < L.count; i++) {
    depth[i] = SEA - L.heights[i]
    const r = R + SEA
    spos[i * 3] = L.dirs[i * 3] * r
    spos[i * 3 + 1] = L.dirs[i * 3 + 1] * r
    spos[i * 3 + 2] = L.dirs[i * 3 + 2] * r
  }
  const seaIndex: number[] = []
  for (let t = 0; t < L.index.length; t += 3) {
    const a = L.index[t]
    const b = L.index[t + 1]
    const d = L.index[t + 2]
    if (depth[a] > -0.5 || depth[b] > -0.5 || depth[d] > -0.5) seaIndex.push(a, b, d)
  }
  let sea = new BufferGeometry()
  sea.setAttribute('position', new Float32BufferAttribute(spos, 3))
  sea.setAttribute('aDepth', new Float32BufferAttribute(depth, 1))
  sea.setIndex(seaIndex)
  sea = mergeVertices(sea, 1e-3)
  sea.computeBoundingSphere()

  return { ground, sea }
}

export { lerp }
