// The Signal Room — geometry + layout data. Pure functions: every builder returns merged geometry, the
// room component decides how to draw it. Interior-local coordinates, floor at y = 0, camera on +z.
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Path,
  PlaneGeometry,
  Quaternion,
  Shape,
  Vector3,
} from 'three'
import { rng } from '../engine/math'
import { GeoBuilder } from '../gfx/geo'

export const W = 30
export const D = 22

// ---- palette -----------------------------------------------------------------------------------------
export const NEON = {
  magenta: '#ff3ea5',
  cyan: '#35e8ff',
  gold: '#ffcf4a',
  coral: '#ff6a55',
  mint: '#5df2c1',
  violet: '#b479ff',
} as const

const S = {
  floor: '#1c2060',
  floorSide: '#1a1650',
  wall: '#26246c',
  wallTop: '#343290',
  wallDark: '#1a1850',
  plinth: '#2f2c7e',
  plinth2: '#3b38a0',
  plinthTop: '#5350c4',
  shaft: '#2a2874',
  shaftTop: '#4441b0',
  slab: '#302d84',
  slabTop: '#4340a8',
  brass: '#e8b862',
  brassDark: '#a9782f',
  ink: '#14123a',
  wood: '#5a3a52',
  woodDark: '#3e2740',
}

// ---- layout ---------------------------------------------------------------------------------------------
export interface Disp {
  w: number
  h: number
  /** local position of the display centre, tilt about x (radians, negative = leans back) */
  x: number
  y: number
  z: number
  tilt: number
}

export interface MonoDef {
  id: string // BIG id
  form: 'colossus' | 'obelisk' | 'community' | 'mast'
  variant: number
  x: number
  z: number
  yaw: number
  /** collider radius (circle) around (x, z) */
  r: number
  color: string
  color2: string
  disp: Disp
  /** hotspot position, local (x, z) in front of the monument */
  hs: [number, number]
  /** where sparks / bursts come from (local) */
  burst: [number, number, number]
  /** power-up radius measured from the collider edge */
  reach: number
}

export const MONOS: MonoDef[] = [
  {
    id: 'reach1b',
    form: 'colossus',
    variant: 0,
    x: 0,
    z: -7.6,
    yaw: 0,
    r: 3.5,
    color: NEON.gold,
    color2: NEON.cyan,
    disp: { w: 4.4, h: 2.2, x: 0, y: 2.4, z: 1.06, tilt: 0 },
    hs: [0, 3.9],
    burst: [0, 2.6, 1.6],
    reach: 6.4,
  },
  {
    id: 'views300',
    form: 'obelisk',
    variant: 0,
    x: -10.4,
    z: -6.8,
    yaw: 0.36,
    r: 1.9,
    color: NEON.magenta,
    color2: NEON.violet,
    disp: { w: 2.5, h: 1.25, x: 0, y: 1.85, z: 1.2, tilt: -0.06 },
    hs: [0, 3.5],
    burst: [0, 2.2, 1.4],
    reach: 5.5,
  },
  {
    id: 'views10',
    form: 'obelisk',
    variant: 1,
    x: 10.2,
    z: -5.8,
    yaw: -0.33,
    r: 1.6,
    color: NEON.cyan,
    color2: NEON.mint,
    disp: { w: 2.1, h: 1.05, x: 0, y: 1.6, z: 1.05, tilt: -0.06 },
    hs: [0, 3.2],
    burst: [0, 2.0, 1.3],
    reach: 5.5,
  },
  {
    id: 'community5',
    form: 'community',
    variant: 0,
    x: -4.3,
    z: -1.8,
    yaw: 0.1,
    r: 1.4,
    color: NEON.coral,
    color2: NEON.gold,
    disp: { w: 3.2, h: 1.6, x: 0, y: 3.6, z: -0.4, tilt: -0.12 },
    hs: [0, 2.6],
    burst: [0, 2.0, 0.5],
    reach: 5.5,
  },
  {
    id: 'imp27',
    form: 'mast',
    variant: 0,
    x: 4.3,
    z: -1.2,
    yaw: -0.05,
    r: 0.95,
    color: NEON.mint,
    color2: NEON.cyan,
    disp: { w: 3.6, h: 1.8, x: 0, y: 3.6, z: 0.2, tilt: -0.1 },
    hs: [0, 1.9],
    burst: [0, 3.2, 0.6],
    reach: 5.5,
  },
  {
    id: 'imp34',
    form: 'mast',
    variant: 1,
    x: -11.6,
    z: -1.6,
    yaw: 0.32,
    r: 1.5,
    color: NEON.violet,
    color2: NEON.magenta,
    disp: { w: 3.0, h: 1.9, x: 0, y: 3.2, z: 0.62, tilt: -0.08 },
    hs: [0.3, 2.7],
    burst: [0, 3.0, 0.6],
    reach: 5.5,
  },
  {
    id: 'imp5',
    form: 'mast',
    variant: 2,
    x: 12.2,
    z: -1.6,
    yaw: -0.5,
    r: 1.1,
    color: NEON.coral,
    color2: NEON.gold,
    disp: { w: 4.2, h: 1.9, x: 0, y: 4.2, z: 0.25, tilt: -0.1 },
    hs: [0, 2.8],
    burst: [0, 3.9, 0.6],
    reach: 5.5,
  },
]

// ---- small helpers ------------------------------------------------------------------------------------------
const _q = new Quaternion()
const _e = new Euler()
const _v = new Vector3()
const _one = new Vector3(1, 1, 1)

/** world (room-local) transform of a monument's local frame */
export function monoMatrix(m: MonoDef, out = new Matrix4()) {
  _q.setFromEuler(_e.set(0, m.yaw, 0))
  return out.compose(_v.set(m.x, 0, m.z), _q, _one)
}

/** room-local point of a monument-local point */
export function monoPoint(m: MonoDef, lx: number, ly: number, lz: number, out = new Vector3()) {
  const c = Math.cos(m.yaw)
  const s = Math.sin(m.yaw)
  return out.set(m.x + lx * c + lz * s, ly, m.z - lx * s + lz * c)
}

// ---- merged geometry with named ranges ------------------------------------------------------------------------
export interface Merged {
  geo: BufferGeometry
  ranges: { start: number; count: number }[]
  base: Float32Array
}

export function mergeColored(parts: BufferGeometry[]): Merged {
  let vc = 0
  let ic = 0
  for (const p of parts) {
    vc += p.attributes.position.count
    ic += p.index ? p.index.count : p.attributes.position.count
  }
  const pos = new Float32Array(vc * 3)
  const col = new Float32Array(vc * 3)
  const idx = new Uint32Array(ic)
  const ranges: Merged['ranges'] = []
  let vo = 0
  let io = 0
  for (const p of parts) {
    const n = p.attributes.position.count
    pos.set(p.attributes.position.array as Float32Array, vo * 3)
    col.set(p.attributes.color.array as Float32Array, vo * 3)
    if (p.index) {
      const a = p.index.array
      for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo
      io += a.length
    } else {
      for (let i = 0; i < n; i++) idx[io + i] = i + vo
      io += n
    }
    ranges.push({ start: vo, count: n })
    vo += n
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('color', new Float32BufferAttribute(col, 3))
  geo.setIndex(new BufferAttribute(vc > 65535 ? idx : new Uint16Array(idx), 1))
  geo.computeBoundingSphere()
  return { geo, ranges, base: col.slice() }
}

function newNeon(seed: number) {
  const n = new GeoBuilder(seed)
  n.ao = 0
  return n
}

// ---- room shell ----------------------------------------------------------------------------------------------------
export const WIN_X = [-9.6, 0, 9.6]
const WIN_W = 5.2
const WIN_SILL = 1.0
const WIN_TOP = 8.0
const WALL_H = 9.6

function wallShape(): Shape {
  const L = (W + 1.6) / 2
  const s = new Shape()
  s.moveTo(-L, 0)
  s.lineTo(L, 0)
  s.lineTo(L, WALL_H)
  s.lineTo(-L, WALL_H)
  s.lineTo(-L, 0)
  const hw = WIN_W / 2
  for (const cx of WIN_X) {
    const h = new Path()
    h.moveTo(cx - hw, WIN_SILL)
    h.lineTo(cx + hw, WIN_SILL)
    h.lineTo(cx + hw, WIN_TOP - hw)
    h.absarc(cx, WIN_TOP - hw, hw, 0, Math.PI, false)
    h.lineTo(cx - hw, WIN_SILL)
    s.holes.push(h)
  }
  return s
}

/** lit static shell: slab, floor, back wall with arched openings, low side walls */
export function buildShell(b: GeoBuilder) {
  b.aoHeight = 2.4
  b.ao = 0.26
  // floating slab + floor plate
  b.put(0, -1.88, 0, (b) => b.box(W + 1.2, 1.86, D + 1.2, S.floorSide))
  b.put(0, -3.9, 0, (b) => b.box(W - 3, 2.1, D - 3, '#141046', { ao: 0 }))
  b.put(0, -0.06, 0, (b) => b.box(W, 0.06, D, S.floor, { ao: 0 }))
  // brass edge line around the slab
  b.put(0, -0.12, D / 2 + 0.6, (b) => b.box(W + 1.3, 0.14, 0.12, S.brass, { ao: 0 }))
  // back wall (extruded with arch-shaped holes)
  b.push().at(0, 0, -D / 2 - 0.45)
  b.extrude(wallShape(), 0.9, S.wall, { top: S.wallTop })
  b.pop()
  // window sills + jamb brass lines
  for (const cx of WIN_X) {
    b.put(cx, WIN_SILL - 0.16, -D / 2 - 0.05, (b) => b.box(WIN_W + 0.6, 0.16, 1.1, S.brass, { ao: 0 }))
  }
  // pilasters between the windows
  for (const px of [-14.3, -4.8, 4.8, 14.3]) {
    b.put(px, 0, -D / 2 + 0.16, (b) => b.box(0.9, WALL_H - 0.6, 0.34, S.wallTop, { ao: 0.18 }))
    b.put(px, 0, -D / 2 + 0.16, (b) => b.box(1.15, 0.5, 0.42, S.brass, { ao: 0 }))
    b.put(px, WALL_H - 1.1, -D / 2 + 0.16, (b) => b.box(1.15, 0.3, 0.42, S.brass, { ao: 0 }))
  }
  // cornice
  b.put(0, WALL_H - 0.2, -D / 2 - 0.3, (b) => b.box(W + 2, 0.34, 1.3, S.brass, { ao: 0 }))
  // low side walls, with a rail cap
  for (const sx of [-1, 1]) {
    b.put(sx * (W / 2 + 0.35), 0, 0, (b) => b.box(0.7, 1.7, D + 1.4, S.wall, { top: S.wallTop }))
    b.put(sx * (W / 2 + 0.35), 1.7, 0, (b) => b.box(0.95, 0.2, D + 1.6, S.brass, { ao: 0 }))
  }
  // front lip
  b.put(0, 0, D / 2 + 0.35, (b) => b.box(W + 1.4, 0.4, 0.7, S.wall, { top: S.wallTop }))
  b.put(0, 0.4, D / 2 + 0.35, (b) => b.box(W + 1.6, 0.16, 0.9, S.brass, { ao: 0 }))
}

/** constant glow bits of the shell (pilaster light strips, side rails) — part of the "misc" neon group */
export function buildShellNeon(): BufferGeometry {
  const n = newNeon(11)
  for (const px of [-14.3, -4.8, 4.8, 14.3]) {
    n.put(px, 0.7, -D / 2 + 0.36, (b) => b.box(0.1, WALL_H - 2.6, 0.05, NEON.violet))
  }
  for (const sx of [-1, 1]) {
    n.put(sx * (W / 2 + 0.35), 1.9, 0, (b) => b.box(0.08, 0.06, D + 1.2, NEON.violet))
  }
  n.put(0, 0.58, D / 2 + 0.36, (b) => b.box(W + 1.2, 0.05, 0.05, NEON.violet))
  // window arch outlines (thin glowing frames just inside the reveal)
  for (const cx of WIN_X) {
    n.push().at(cx, WIN_SILL, -D / 2 + 0.03)
    const hw = WIN_W / 2 + 0.06
    n.put(-hw, 0, 0, (b) => b.box(0.06, WIN_TOP - WIN_SILL - hw, 0.04, NEON.cyan))
    n.put(hw, 0, 0, (b) => b.box(0.06, WIN_TOP - WIN_SILL - hw, 0.04, NEON.cyan))
    n.put(0, WIN_TOP - WIN_SILL - hw, 0, (b) => b.torus(hw, 0.03, NEON.cyan, {}, Math.PI, 4, 28))
    n.pop()
  }
  return n.build()
}

// ---- monuments -------------------------------------------------------------------------------------------------------
function playTriangle(): Shape {
  const s = new Shape()
  s.moveTo(-0.24, -0.36)
  s.lineTo(0.42, 0)
  s.lineTo(-0.24, 0.36)
  s.closePath()
  return s
}

function heartShape(): Shape {
  const s = new Shape()
  s.moveTo(0, -0.52)
  s.bezierCurveTo(-0.16, -0.36, -0.62, -0.06, -0.62, 0.22)
  s.bezierCurveTo(-0.62, 0.5, -0.2, 0.64, 0, 0.38)
  s.bezierCurveTo(0.2, 0.64, 0.62, 0.5, 0.62, 0.22)
  s.bezierCurveTo(0.62, -0.06, 0.16, -0.36, 0, -0.52)
  return s
}

function colossus(b: GeoBuilder, n: GeoBuilder, m: MonoDef) {
  // plinth tiers
  b.cyl(3.5, 3.8, 0.5, 8, S.plinth, { top: S.plinthTop })
  b.put(0, 0.5, 0, (b) => b.cyl(2.9, 3.2, 0.45, 8, S.plinth2, { top: S.plinthTop }))
  // monolith slab, pylons, brass frame
  b.put(0, 0.95, 0.35, (b) => b.box(5.3, 2.9, 1.3, S.slab, { top: S.slabTop }))
  for (const sx of [-1, 1]) {
    b.put(sx * 3.0, 0.5, 0.3, (b) => b.box(0.72, 4.4, 1.1, S.slab, { top: S.slabTop }))
    b.put(sx * 3.0, 4.9, 0.3, (b) => b.box(0.98, 0.2, 1.36, S.brass, { ao: 0 }))
    b.put(sx * 3.0, 5.1, 0.3, (b) => b.cone(0.3, 0.55, 4, S.brass, { ao: 0 }))
  }
  b.put(0, 3.85, 0.35, (b) => b.box(5.5, 0.14, 1.5, S.brass, { ao: 0 }))
  const fw = 0.12
  const dw = m.disp.w
  const dh = m.disp.h
  b.put(0, m.disp.y - dh / 2 - fw, 1.0, (b) => b.box(dw + fw * 2, fw, 0.1, S.brass, { ao: 0 }))
  b.put(0, m.disp.y + dh / 2, 1.0, (b) => b.box(dw + fw * 2, fw, 0.1, S.brass, { ao: 0 }))
  for (const sx of [-1, 1]) b.put(sx * (dw / 2 + fw / 2), m.disp.y - dh / 2 - fw, 1.0, (b) => b.box(fw, dh + fw * 2, 0.1, S.brass, { ao: 0 }))
  // neck + cradle + antenna (globe and rings float above)
  b.put(0, 3.99, -0.1, (b) => b.cyl(0.32, 0.9, 0.42, 8, S.shaft, { top: S.shaftTop }))
  b.put(0, 4.4, -0.1, (b) => b.cyl(0.66, 0.36, 0.26, 8, S.brass, { ao: 0 }))
  b.put(0, 4.6, -0.1, (b) => b.cyl(0.03, 0.05, 4.1, 6, S.brass, { ao: 0 }))

  // ---- neon ----
  n.put(0, 0.5, 0, (b) => b.rotX(Math.PI / 2).torus(3.52, 0.05, m.color, {}, Math.PI * 2, 4, 8))
  n.put(0, 0.95, 0, (b) => b.rotX(Math.PI / 2).torus(2.92, 0.05, m.color2, {}, Math.PI * 2, 4, 8))
  for (const sx of [-1, 1]) {
    n.put(sx * 2.62, 0.6, 0.86, (b) => b.box(0.07, 4.1, 0.05, m.color))
    n.put(sx * 3.32, 0.6, 0.86, (b) => b.box(0.07, 4.1, 0.05, m.color2))
    n.put(sx * 3.0, 4.7, 0.86, (b) => b.box(0.5, 0.08, 0.05, m.color))
  }
  n.put(0, 3.86, 1.1, (b) => b.box(5.3, 0.07, 0.05, m.color2))
  n.put(0, 4.62, -0.1, (b) => b.rotX(Math.PI / 2).torus(0.5, 0.04, m.color2, {}, Math.PI * 2, 4, 12))
  n.put(0, 8.7, -0.1, (b) => b.sphere(0.13, m.color, {}, 8, 6))
}

function obelisk(b: GeoBuilder, n: GeoBuilder, m: MonoDef) {
  const big = m.variant === 0
  const k = big ? 1 : 0.74
  const baseW = 3.1 * k + (big ? 0 : 0.2)
  b.box(baseW, 0.4, baseW, S.plinth, { top: S.plinthTop })
  b.put(0, 0.4, 0, (b) => b.box(baseW - 0.6, 0.35, baseW - 0.6, S.plinth2, { top: S.plinthTop }))
  const shaftH = big ? 5.9 : 4.1
  const y0 = 0.75
  const rB = big ? 1.5 : 1.22
  const rT = big ? 0.62 : 0.52
  b.push().at(0, y0, 0).rotY(Math.PI / 4)
  b.cyl(rT, rB, shaftH, 4, S.shaft, { top: S.shaftTop })
  b.pop()
  // pyramidion / cap
  b.push().at(0, y0 + shaftH, 0).rotY(Math.PI / 4)
  if (big) {
    b.cyl(0.001, rT + 0.02, 1.05, 4, S.brass, { ao: 0, flat: true })
  } else {
    b.cyl(rT * 0.55, rT + 0.02, 0.36, 4, S.brass, { ao: 0, flat: true })
  }
  b.pop()
  const half = (y: number) => ((rB - (rB - rT) * ((y - y0) / shaftH)) / Math.SQRT2)
  // medallion carrying the play button
  const my = y0 + shaftH * (big ? 0.52 : 0.55)
  const mz = half(my)
  b.push().at(0, my, mz - 0.02).rotX(Math.PI / 2)
  b.cyl(big ? 0.62 : 0.5, big ? 0.62 : 0.5, 0.1, 20, S.ink, { ao: 0 })
  b.pop()
  // LED cabinet
  const d = m.disp
  const cz = half(d.y)
  b.put(0, d.y - d.h / 2 - 0.1, cz - 0.05, (b) => b.box(d.w + 0.32, d.h + 0.2, d.z - cz + 0.1, S.ink, { ao: 0 }))
  b.put(0, d.y - d.h / 2 - 0.12, d.z - 0.02, (b) => b.box(d.w + 0.4, 0.08, 0.1, S.brass, { ao: 0 }))
  b.put(0, d.y + d.h / 2 + 0.08, d.z - 0.02, (b) => b.box(d.w + 0.4, 0.08, 0.1, S.brass, { ao: 0 }))
  for (const sx of [-1, 1]) b.put(sx * (d.w / 2 + 0.16), d.y - d.h / 2 - 0.12, d.z - 0.02, (b) => b.box(0.08, d.h + 0.28, 0.1, S.brass, { ao: 0 }))

  // ---- neon ----
  const tri = playTriangle()
  const sc = big ? 1 : 0.8
  n.push().at(0.02 * sc, my, mz + 0.1).scale(sc)
  n.extrude(tri, 0.08, m.color, {}, 0.02)
  n.pop()
  n.put(0, my, mz + 0.06, (b) => b.torus(big ? 0.62 : 0.5, 0.035, m.color, {}, Math.PI * 2, 4, 32))
  // seam lights on the shaft corners
  for (const sx of [-1, 1]) {
    const yy = my + (big ? 1.3 : 0.9)
    n.put(sx * half(yy) * 0.9, yy, half(yy) + 0.02, (b) => b.box(0.06, big ? 1.4 : 1.0, 0.04, m.color2))
  }
  n.put(0, y0 + shaftH + (big ? 1.08 : 0.4), 0, (b) => b.sphere(big ? 0.11 : 0.1, m.color, {}, 8, 6))
  n.put(0, 0.4, 0, (b) => b.rotX(Math.PI / 2).torus(baseW / 2 - 0.02, 0.035, m.color2, {}, Math.PI * 2, 4, 4))
}

function community(b: GeoBuilder, n: GeoBuilder, m: MonoDef) {
  // brazier: foot, pedestal, bowl, brass rim
  b.cyl(1.25, 1.4, 0.25, 14, S.plinth, { top: S.plinthTop })
  b.put(0, 0.25, 0, (b) => b.cyl(0.55, 0.75, 0.6, 12, S.plinth2, { top: S.plinthTop }))
  b.put(0, 0.85, 0, (b) => b.cyl(1.3, 0.62, 0.6, 14, S.plinth2, { top: S.plinthTop }))
  b.put(0, 1.45, 0, (b) => b.rotX(Math.PI / 2).torus(1.3, 0.075, S.brass, { ao: 0 }, Math.PI * 2, 6, 24))
  // sign posts + crossbars + the frame of the screen
  const d = m.disp
  for (const sx of [-1, 1]) {
    b.put(sx * (d.w / 2 + 0.22), 0, d.z - 0.1, (b) => b.cyl(0.09, 0.12, 4.6, 8, S.brass, { ao: 0 }))
    b.put(sx * (d.w / 2 + 0.22), 4.6, d.z - 0.1, (b) => b.sphere(0.16, S.brass, { ao: 0 }, 8, 6))
    b.put(sx * (d.w / 2 + 0.22), 0, d.z - 0.1, (b) => b.cyl(0.3, 0.36, 0.22, 8, S.plinth2))
  }
  const fw = 0.11
  b.put(0, d.y - d.h / 2 - fw, d.z - 0.04, (b) => b.box(d.w + fw * 2, fw, 0.14, S.brass, { ao: 0 }))
  b.put(0, d.y + d.h / 2, d.z - 0.04, (b) => b.box(d.w + fw * 2, fw, 0.14, S.brass, { ao: 0 }))
  for (const sx of [-1, 1]) b.put(sx * (d.w / 2 + fw / 2), d.y - d.h / 2 - fw, d.z - 0.04, (b) => b.box(fw, d.h + fw * 2, 0.14, S.brass, { ao: 0 }))
  b.put(0, d.y - d.h / 2, d.z - 0.14, (b) => b.box(d.w, d.h, 0.1, S.ink, { ao: 0 }))
  // stem for the heart lamp
  b.put(0, 1.4, 0, (b) => b.cyl(0.05, 0.07, 0.5, 6, S.brass, { ao: 0 }))

  // ---- neon ----
  // embers in the bowl + heart
  n.put(0, 1.42, 0, (b) => b.cyl(1.12, 1.12, 0.04, 20, '#c8402c'))
  n.push().at(0, 2.08, 0.05).scale(0.82)
  n.extrude(heartShape(), 0.34, '#ff5c8f', {}, 0.05)
  n.pop()
  n.put(0, 0.25, 0, (b) => b.rotX(Math.PI / 2).torus(1.28, 0.04, m.color2, {}, Math.PI * 2, 4, 24))
  for (const sx of [-1, 1]) n.put(sx * (d.w / 2 + 0.22), 4.8, d.z - 0.1, (b) => b.sphere(0.09, m.color2, {}, 6, 5))
}

function mast(b: GeoBuilder, n: GeoBuilder, m: MonoDef) {
  const d = m.disp
  const fw = 0.14
  const frame = (depth: number, dz: number) => {
    b.put(0, d.y - d.h / 2 - fw, dz, (b) => b.box(d.w + fw * 2, fw, depth, S.ink, { ao: 0 }))
    b.put(0, d.y + d.h / 2, dz, (b) => b.box(d.w + fw * 2, fw, depth, S.ink, { ao: 0 }))
    for (const sx of [-1, 1]) b.put(sx * (d.w / 2 + fw / 2), d.y - d.h / 2 - fw, dz, (b) => b.box(fw, d.h + fw * 2, depth, S.ink, { ao: 0 }))
    b.put(0, d.y - d.h / 2, dz - depth / 2 - 0.02, (b) => b.box(d.w, d.h, 0.08, S.ink, { ao: 0 }))
  }
  if (m.variant === 0) {
    // single pole billboard with a catwalk
    b.cyl(0.8, 0.98, 0.4, 8, S.plinth, { top: S.plinthTop })
    b.put(0, 0.4, -0.1, (b) => b.cyl(0.15, 0.22, 5.3, 8, S.shaft, { top: S.shaftTop }))
    frame(0.26, d.z - 0.02)
    for (const sx of [-1, 1]) b.bar([sx * 0.08, 2.4, -0.05], [sx * 1.6, d.y - d.h / 2 - 0.05, d.z - 0.15], 0.05, 5, S.brass, { ao: 0 })
    b.put(0, d.y - d.h / 2 - 0.34, d.z + 0.1, (b) => b.box(d.w + 0.3, 0.07, 0.5, S.brass, { ao: 0 }))
    for (const sx of [-1, 0, 1]) b.put(sx * (d.w / 2 + 0.12), d.y - d.h / 2 - 0.3, d.z + 0.33, (b) => b.box(0.05, 0.36, 0.05, S.brass, { ao: 0 }))
    b.put(0, d.y - d.h / 2 - 0.02, d.z + 0.34, (b) => b.box(d.w + 0.3, 0.05, 0.05, S.brass, { ao: 0 }))
    // top: floodlight arms + beacon mast
    for (const sx of [-1, 1]) {
      b.bar([sx * 0.9, d.y + d.h / 2 + 0.05, d.z - 0.1], [sx * 0.9, d.y + d.h / 2 + 0.5, d.z + 0.55], 0.04, 5, S.brass, { ao: 0 })
      b.put(sx * 0.9, d.y + d.h / 2 + 0.44, d.z + 0.55, (b) => b.rotX(-0.9).cyl(0.16, 0.1, 0.24, 8, S.ink, { ao: 0 }))
    }
    b.put(0, 4.7, -0.1, (b) => b.cyl(0.05, 0.08, 1.05, 6, S.brass, { ao: 0 }))
    n.put(0, 5.8, -0.1, (b) => b.sphere(0.15, m.color, {}, 8, 6))
    n.put(0, 2.6, -0.1, (b) => b.rotX(Math.PI / 2).torus(0.22, 0.03, m.color2, {}, Math.PI * 2, 4, 12))
    for (const sx of [-1, 1]) n.put(sx * 0.9, d.y + d.h / 2 + 0.46, d.z + 0.67, (b) => b.rotX(-0.9).cyl(0.11, 0.11, 0.03, 8, m.color2))
    n.put(0, 0.42, 0, (b) => b.rotX(Math.PI / 2).torus(0.9, 0.03, m.color2, {}, Math.PI * 2, 4, 8))
  } else if (m.variant === 1) {
    // A-frame gantry, screen hangs from the crossbar
    b.cyl(1.55, 1.7, 0.3, 8, S.plinth, { top: S.plinthTop })
    for (const sx of [-1, 1]) {
      b.bar([sx * 1.25, 0.3, 0.35], [sx * 0.34, 5.2, -0.08], 0.11, 6, S.shaft)
      b.bar([sx * 1.25, 0.3, -0.35], [sx * 0.34, 5.2, -0.08], 0.11, 6, S.shaft)
      b.put(sx * 1.25, 0.3, 0.35, (b) => b.cyl(0.2, 0.26, 0.16, 6, S.brass, { ao: 0 }))
      b.put(sx * 1.25, 0.3, -0.35, (b) => b.cyl(0.2, 0.26, 0.16, 6, S.brass, { ao: 0 }))
      b.put(sx * 0.34, 5.2, -0.08, (b) => b.sphere(0.14, S.brass, { ao: 0 }, 8, 6))
    }
    b.put(0, 5.05, -0.08, (b) => b.box(0.9, 0.12, 0.22, S.brass, { ao: 0 }))
    frame(0.24, d.z - 0.02)
    for (const sx of [-1, 1]) b.bar([sx * 0.5, 4.95, -0.02], [sx * (d.w / 2 + 0.1), d.y + d.h / 2 + 0.12, d.z - 0.1], 0.04, 5, S.brass, { ao: 0 })
    b.put(0, 1.35, 0, (b) => b.box(2.6, 0.1, 0.16, S.brass, { ao: 0 }))
    n.put(-0.34, 5.42, -0.08, (b) => b.sphere(0.12, m.color2, {}, 8, 6))
    n.put(0.34, 5.42, -0.08, (b) => b.sphere(0.12, m.color, {}, 8, 6))
    n.put(0, 0.3, 0, (b) => b.rotX(Math.PI / 2).torus(1.62, 0.03, m.color, {}, Math.PI * 2, 4, 8))
  } else {
    // lattice tower carrying a wide screen
    b.cyl(1.05, 1.2, 0.3, 8, S.plinth, { top: S.plinthTop })
    const top = d.y - d.h / 2 - 0.35
    const legs: [number, number][] = [
      [-0.7, -0.5],
      [0.7, -0.5],
      [-0.7, 0.5],
      [0.7, 0.5],
    ]
    for (const [lx, lz] of legs) b.bar([lx, 0.3, lz], [lx * 0.72, top, lz * 0.72], 0.06, 5, S.brass, { ao: 0 })
    const rungs = 5
    for (let i = 1; i <= rungs; i++) {
      const t = i / (rungs + 0.4)
      const y = 0.3 + (top - 0.3) * t
      const s = 1 - 0.28 * t
      const hx = 0.7 * s
      const hz = 0.5 * s
      b.bar([-hx, y, -hz], [hx, y, -hz], 0.03, 4, S.brass, { ao: 0 })
      b.bar([-hx, y, hz], [hx, y, hz], 0.03, 4, S.brass, { ao: 0 })
      b.bar([-hx, y, -hz], [-hx, y, hz], 0.03, 4, S.brass, { ao: 0 })
      b.bar([hx, y, -hz], [hx, y, hz], 0.03, 4, S.brass, { ao: 0 })
      if (i < rungs) {
        const t2 = (i + 1) / (rungs + 0.4)
        const y2 = 0.3 + (top - 0.3) * t2
        const s2 = 1 - 0.28 * t2
        b.bar([-hx, y, hz], [0.7 * s2, y2, 0.5 * s2], 0.025, 4, S.brass, { ao: 0 })
      }
    }
    b.put(0, top, 0, (b) => b.box(2.0, 0.18, 1.3, S.ink, { ao: 0 }))
    frame(0.28, d.z - 0.02)
    for (const sx of [-1, 1]) b.bar([sx * 0.9, top + 0.12, 0.1], [sx * (d.w / 2 - 0.35), d.y - d.h / 2 - 0.05, d.z - 0.12], 0.05, 5, S.brass, { ao: 0 })
    // side spotlights
    for (const sx of [-1, 1]) {
      b.bar([sx * (d.w / 2 + 0.1), d.y + d.h / 2 + 0.05, d.z - 0.05], [sx * (d.w / 2 + 0.1), d.y + d.h / 2 + 0.7, d.z + 0.1], 0.05, 5, S.brass, { ao: 0 })
      b.put(sx * (d.w / 2 + 0.1), d.y + d.h / 2 + 0.7, d.z + 0.1, (b) => b.sphere(0.2, S.ink, { ao: 0 }, 8, 6))
    }
    n.put(-(d.w / 2 + 0.1), d.y + d.h / 2 + 0.72, d.z + 0.28, (b) => b.sphere(0.13, m.color2, {}, 8, 6))
    n.put(d.w / 2 + 0.1, d.y + d.h / 2 + 0.72, d.z + 0.28, (b) => b.sphere(0.13, m.color, {}, 8, 6))
    n.put(0, 0.3, 0, (b) => b.rotX(Math.PI / 2).torus(1.16, 0.03, m.color, {}, Math.PI * 2, 4, 8))
  }
}

/** build every monument (static lit parts into `b`, neon parts into per-monument groups) */
export function buildMonuments(b: GeoBuilder, extraNeon: BufferGeometry[]): Merged {
  const neonParts: BufferGeometry[] = []
  MONOS.forEach((m, i) => {
    const n = newNeon(30 + i)
    b.push().at(m.x, 0, m.z).rotY(m.yaw)
    n.push().at(m.x, 0, m.z).rotY(m.yaw)
    if (m.form === 'colossus') colossus(b, n, m)
    else if (m.form === 'obelisk') obelisk(b, n, m)
    else if (m.form === 'community') community(b, n, m)
    else mast(b, n, m)
    b.pop()
    n.pop()
    neonParts.push(n.build())
  })
  // ranges: 0..6 = monuments, then the extras (constant glow)
  return mergeColored([...neonParts, ...extraNeon])
}

// ---- LED faces -------------------------------------------------------------------------------------------------------------
const CELL_U = 0.5
const CELL_V = 0.25

/** build the atlas quad geometry: one quad per display with UVs into its atlas cell */
export function buildLedGeometry(items: { m: Matrix4; w: number; h: number; cell: number }[]): BufferGeometry {
  const n = items.length
  const pos = new Float32Array(n * 12)
  const uv = new Float32Array(n * 8)
  const col = new Float32Array(n * 12).fill(1)
  const idx = new Uint16Array(n * 6)
  items.forEach((it, i) => {
    const pg = new PlaneGeometry(it.w, it.h)
    pg.applyMatrix4(it.m)
    pos.set(pg.attributes.position.array as Float32Array, i * 12)
    const col0 = it.cell % 2
    const row0 = it.cell >> 1
    const inset = 1.5 / 1024
    const u0 = col0 * CELL_U + inset
    const u1 = (col0 + 1) * CELL_U - inset
    const v1 = 1 - row0 * CELL_V - inset
    const v0 = 1 - (row0 + 1) * CELL_V + inset
    // PlaneGeometry vertex order: (-x,+y), (+x,+y), (-x,-y), (+x,-y)
    uv.set([u0, v1, u1, v1, u0, v0, u1, v0], i * 8)
    idx.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 1], i * 6)
    pg.dispose()
  })
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(new BufferAttribute(idx, 1))
  g.computeBoundingSphere()
  return g
}

// ---- tape path + ticker machine -----------------------------------------------------------------------------------------------------------
export const MACHINE = { x: -11.5, z: 4.5 }

const TAPE_PTS: [number, number, number][] = [
  [MACHINE.x + 0.56, 1.105, MACHINE.z],
  [MACHINE.x + 0.9, 1.105, MACHINE.z],
  [MACHINE.x + 1.12, 1.03, MACHINE.z + 0.02],
  [MACHINE.x + 1.32, 0.78, MACHINE.z + 0.08],
  [MACHINE.x + 1.5, 0.4, MACHINE.z + 0.2],
  [MACHINE.x + 1.75, 0.11, MACHINE.z + 0.4],
  [MACHINE.x + 2.3, 0.03, MACHINE.z + 0.76],
  [-7.4, 0.03, 6.4],
  [-5.4, 0.03, 6.8],
  [-3.4, 0.03, 5.6],
  [-1.6, 0.03, 3.9],
  [0.6, 0.03, 3.0],
  [2.8, 0.03, 3.6],
  [4.8, 0.03, 5.2],
  [7.0, 0.03, 6.6],
  [9.4, 0.03, 6.6],
  [11.4, 0.03, 5.4],
  [12.4, 0.03, 3.6],
]

export const tapeCurve = new CatmullRomCurve3(
  TAPE_PTS.map((p) => new Vector3(p[0], p[1], p[2])),
  false,
  'centripetal',
)

export const TAPE_W = 1.15
export const TAPE_PERIOD = 8

/** flat ribbon that drops out of the ticker machine and winds across the floor */
export function buildTape(): { geo: BufferGeometry; length: number } {
  const len = tapeCurve.getLength()
  const N = Math.ceil(len * 9)
  const pts = tapeCurve.getSpacedPoints(N)
  const pos = new Float32Array((N + 1) * 6)
  const uv = new Float32Array((N + 1) * 4)
  const idx: number[] = []
  let lat = new Vector3(0, 0, -1)
  const t = new Vector3()
  const up = new Vector3(0, 1, 0)
  let acc = 0
  for (let i = 0; i <= N; i++) {
    const p = pts[i]
    const p2 = pts[Math.min(N, i + 1)]
    const p1 = pts[Math.max(0, i - 1)]
    t.subVectors(p2, p1)
    const h = Math.hypot(t.x, t.z)
    if (h > 0.02) {
      t.y = 0
      t.normalize()
      lat = new Vector3().crossVectors(up, t).normalize()
    }
    if (i > 0) acc += pts[i].distanceTo(pts[i - 1])
    const a = TAPE_W / 2
    pos.set([p.x + lat.x * a, p.y + lat.y * a, p.z + lat.z * a, p.x - lat.x * a, p.y - lat.y * a, p.z - lat.z * a], i * 6)
    uv.set([acc / TAPE_PERIOD, 1, acc / TAPE_PERIOD, 0], i * 4)
    if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return { geo: g, length: acc }
}

/** antique stock-ticker machine on a round table (static, lit) */
export function buildMachine(b: GeoBuilder) {
  b.push().at(MACHINE.x, 0, MACHINE.z)
  // table
  b.cyl(0.7, 0.82, 0.14, 14, S.woodDark)
  b.put(0, 0.14, 0, (b) => b.cyl(0.2, 0.3, 0.86, 10, S.brassDark))
  b.put(0, 0.98, 0, (b) => b.cyl(1.0, 0.96, 0.1, 18, S.wood, { top: '#7a4f6c' }))
  b.put(0, 1.08, 0, (b) => b.rotX(Math.PI / 2).torus(0.98, 0.045, S.brass, { ao: 0 }, Math.PI * 2, 5, 24))
  // machine housing + paper reel (the glass dome is a separate mesh)
  b.put(0, 1.08, 0, (b) => b.cyl(0.5, 0.58, 0.28, 14, S.brass, { ao: 0 }))
  b.put(0, 1.36, 0, (b) => b.cyl(0.05, 0.05, 0.62, 6, S.brass, { ao: 0 }))
  b.put(0, 1.5, 0, (b) => b.cyl(0.25, 0.25, 0.2, 14, '#f4ecd6', { ao: 0 }))
  b.put(0, 1.47, 0, (b) => b.cyl(0.28, 0.28, 0.03, 14, S.brass, { ao: 0 }))
  b.put(0, 1.7, 0, (b) => b.cyl(0.28, 0.28, 0.03, 14, S.brass, { ao: 0 }))
  // tape slot lip
  b.put(0.5, 1.08, 0, (b) => b.box(0.24, 0.06, 0.44, S.brass, { ao: 0 }))
  // tiny hand-tally counter on the table edge
  b.put(0.42, 1.08, 0.56, (b) => b.rotY(-0.6).box(0.34, 0.2, 0.22, S.brass, { ao: 0 }))
  b.put(0.42, 1.28, 0.56, (b) => b.rotY(-0.6).cyl(0.06, 0.06, 0.07, 8, S.brassDark, { ao: 0 }))
  b.pop()
}

/** hidden-tally counter position (room-local) */
export const COUNTER = { x: MACHINE.x + 0.42, z: MACHINE.z + 0.56 }

// ---- turnstile ---------------------------------------------------------------------------------------------------------------------
export const TURN = { x: 5.4, z: 8.3 }

export function buildTurnstile(b: GeoBuilder) {
  b.push().at(TURN.x, 0, TURN.z)
  b.cyl(0.62, 0.7, 0.12, 12, S.plinth, { top: S.plinthTop })
  b.put(0, 0.12, 0, (b) => b.cyl(0.2, 0.26, 0.98, 10, S.brass, { ao: 0.12 }))
  b.put(0, 1.08, 0, (b) => b.cyl(0.29, 0.22, 0.12, 10, S.brassDark, { ao: 0 }))
  // counter housing on the front of the post
  b.put(0, 0.62, 0.23, (b) => b.box(0.52, 0.3, 0.14, S.ink, { ao: 0 }))
  b.pop()
}

export function buildTurnstileArms(): BufferGeometry {
  const b = new GeoBuilder(77)
  b.ao = 0
  for (let i = 0; i < 3; i++) {
    b.push().rotY((i * Math.PI * 2) / 3)
    b.bar([0.12, 0, 0], [0.86, -0.1, 0], 0.045, 6, S.brass, { ao: 0 })
    b.put(0.86, -0.1, 0, (b) => b.sphere(0.075, S.brass, { ao: 0 }, 8, 6))
    b.pop()
  }
  b.cyl(0.14, 0.14, 0.09, 10, S.brassDark, { ao: 0 })
  return b.build()
}

// ---- observatory dressing ---------------------------------------------------------------------------------------------------------------------
export const SCOPE = { x: 12.9, z: -8.9 }

export function buildScope(b: GeoBuilder) {
  b.push().at(SCOPE.x, 0, SCOPE.z).rotY(-0.6)
  for (let i = 0; i < 3; i++) {
    b.push().rotY((i * Math.PI * 2) / 3 + 0.3)
    b.bar([0.62, 0, 0], [0, 1.9, 0], 0.06, 5, S.brassDark, { ao: 0.1 })
    b.pop()
  }
  b.put(0, 1.85, 0, (b) => b.sphere(0.2, S.brass, { ao: 0 }, 10, 8))
  b.push().at(0, 1.95, 0).rotX(-1.08)
  b.cyl(0.2, 0.26, 2.6, 12, S.plinth2, { ao: 0 })
  b.put(0, 2.6, 0, (b) => b.cyl(0.25, 0.2, 0.16, 12, S.brass, { ao: 0 }))
  b.put(0, -0.16, 0, (b) => b.cyl(0.1, 0.1, 0.5, 8, S.brass, { ao: 0 }))
  b.pop()
  b.pop()
}

// ---- receipts ------------------------------------------------------------------------------------------------------------------------------------------
export interface CardPlace {
  x: number
  z: number
  yaw: number
  lean: number
  side: number
  /** tape-relative position 0..1 */
  s: number
}

export const CARD_W = 1.5
export const CARD_H = 1.05

export function placeCards(count: number): CardPlace[] {
  const r = rng(4242)
  const out: CardPlace[] = []
  const total = tapeCurve.getLength()
  const s0 = 3.4 / total
  const s1 = 0.965
  // keep receipts out of every other hotspot's way (spawn, exit, monuments, machine, turnstile)
  const avoid: [number, number, number][] = [
    [0, 6.2, 3.1],
    [0, 10.2, 3.4],
    [TURN.x, TURN.z + 0.3, 2.7],
    [MACHINE.x, MACHINE.z, 3.0],
    [COUNTER.x, COUNTER.z, 2.7],
  ]
  for (const m of MONOS) {
    const p = monoPoint(m, m.hs[0], 1, m.hs[1])
    avoid.push([p.x, p.z, 2.7])
  }
  for (let i = 0; i < count; i++) {
    const base = s0 + ((s1 - s0) * i) / (count - 1)
    const side0 = i % 2 === 0 ? -1 : 1
    const jo = r()
    const jy = r()
    const jl = r()
    let chosen: CardPlace | null = null
    for (const dS of [0, 0.008, -0.008, 0.016, -0.016, 0.026, -0.026, 0.036, -0.036, 0.05, -0.05, 0.065, -0.065, 0.08, -0.08]) {
      for (const flip of [1, -1]) {
        const s = base + dS
        if (s < s0 - 0.04 || s > 0.985) continue
        const side = side0 * flip
        const p = tapeCurve.getPointAt(s)
        const t = tapeCurve.getTangentAt(s)
        const off = (1.1 + jo * 0.24) * side
        const x = p.x - t.z * off
        const z = p.z + t.x * off
        if (x < -12.9 || x > 12.9 || z < -10 || z > 9.4) continue
        if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue
        if (out.some((c) => Math.hypot(x - c.x, z - c.z) < 2.5)) continue
        chosen = { x, z, yaw: (jy - 0.5) * 0.6 - Math.max(-0.35, Math.min(0.35, x * 0.02)), lean: 0.42 + jl * 0.16, side, s }
        break
      }
      if (chosen) break
    }
    if (!chosen) {
      const p = tapeCurve.getPointAt(base)
      const t = tapeCurve.getTangentAt(base)
      chosen = { x: p.x - t.z * side0, z: p.z + t.x * side0, yaw: 0, lean: 0.5, side: side0, s: base }
    }
    out.push(chosen)
  }
  return out
}

/** foot blocks for the cards (static lit geometry) */
export function buildCardFeet(b: GeoBuilder, cards: CardPlace[]) {
  for (const c of cards) {
    b.push().at(c.x, 0, c.z).rotY(c.yaw)
    b.box(0.62, 0.1, 0.3, S.brass, { ao: 0 })
    b.put(0, 0.1, -0.02, (b) => b.box(0.5, 0.07, 0.14, S.brassDark, { ao: 0 }))
    b.pop()
  }
}

/** card quads with atlas UVs (3 columns x 4 rows of the receipt atlas) */
export function buildCardGeometry(cards: CardPlace[]): BufferGeometry {
  const n = cards.length
  const pos = new Float32Array(n * 12)
  const uv = new Float32Array(n * 8)
  const idx = new Uint16Array(n * 6)
  const m = new Matrix4()
  const q = new Quaternion()
  const e = new Euler()
  const sc = new Vector3(1, 1, 1)
  const cols = 3
  const rows = 4
  cards.forEach((c, i) => {
    const pg = new PlaneGeometry(CARD_W, CARD_H)
    pg.translate(0, CARD_H / 2, 0)
    // lean back around the bottom edge, then yaw, then place
    e.set(-c.lean, c.yaw, 0, 'YXZ')
    q.setFromEuler(e)
    m.compose(new Vector3(c.x, 0.13, c.z), q, sc)
    pg.applyMatrix4(m)
    pos.set(pg.attributes.position.array as Float32Array, i * 12)
    pg.dispose()
    const col = i % cols
    const row = Math.floor(i / cols)
    const u0 = (col * 340 + 2) / 1024
    const u1 = ((col + 1) * 340 - 2) / 1024
    const v1 = 1 - (row * 255 + 2) / 1024
    const v0 = 1 - ((row + 1) * 255 - 2) / 1024
    uv.set([u0, v1, u1, v1, u0, v0, u1, v0], i * 8)
    idx.set([i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 1], i * 6)
  })
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(new BufferAttribute(idx, 1))
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

