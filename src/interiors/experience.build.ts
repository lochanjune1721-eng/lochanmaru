// EXPERIENCE interior ("Main Street") — assembles the room's geometry:
//  * static  : one merged, vertex-coloured mesh (shell, floor, carpet, stalls, props, plants)
//  * sway    : a second merged mesh whose vertices flutter (awning valances, bunting, lanterns, pennant)
//  * texA/B  : painted boards (signs, plaques / chalk boards, posters) — one draw call per atlas
//  * glass   : window panes (unlit),  shafts: additive light beams
import { BufferGeometry, Float32BufferAttribute, Path, Shape, ShapeGeometry } from 'three'
import type { Chapter } from '../content/experience'
import { GeoBuilder } from '../gfx/geo'
import { P } from '../gfx/palette'
import { PLQ_EXIT, PLQ_MAIN, PLQ_PULL, A_SIZE, chalkIndex, chalkRect, dirRect, plaqueRect, posterRect, signRect } from './experience.tex'
import {
  Anim,
  Ctx,
  Halo,
  Led,
  beyondProp,
  brandProp,
  fixProp,
  juneProp,
  nitProp,
  saasProp,
  socialProp,
  survivingProp,
  yaasProp,
} from './experience.props'
import { CTR_TOP, D, FL, PITCH, PZ, TexBatch, W, Z_CTR, Z_FRONT, Z_WALL, darken, lighten, mix, stallX, xf } from './experience.util'
import { plant, room } from './parts'

const GOLD = '#e9b04c'
const GOLD_HI2 = '#f6cf7a'
const CREAM = '#fbf1da'
const CARPET_Z = 0.8

export interface Built {
  geo: BufferGeometry
  sway: BufferGeometry
  texA: BufferGeometry
  texB: BufferGeometry
  glass: BufferGeometry
  shafts: BufferGeometry
  halos: Halo[]
  leds: Led[]
  anims: Anim[]
  bulbs: [number, number, number][]
  stalls: { ch: Chapter; x: number; look: [number, number, number] }[]
  posts: number[]
  clock: { x: number; y: number; z: number; r: number }
  lever: { x: number; z: number }
}

function arch<T extends Path>(p: T, w: number, h: number, y0 = 0): T {
  const r = w / 2
  p.moveTo(-r, y0)
  p.lineTo(r, y0)
  p.lineTo(r, y0 + h - r)
  p.absarc(0, y0 + h - r, r, 0, Math.PI, false)
  p.lineTo(-r, y0)
  return p
}

function buildCat() {
  const g = new GeoBuilder(51)
  g.ao = 0
  const fur = '#eaa663'
  const dark = '#c47a3c'
  g.put(0, 0.27, 0, (g) => g.scale(1.3, 0.72, 0.9).sphere(0.42, fur, {}, 12, 9))
  for (let i = 0; i < 3; i++) g.put(-0.22 + i * 0.22, 0.555 - Math.abs(i - 1) * 0.02, 0.02, (g) => g.boxC(0.05, 0.02, 0.5, dark, { ao: 0 }))
  g.put(0.5, 0.24, 0.16, (g) => g.sphere(0.24, fur, {}, 12, 9))
  g.put(0.42, 0.47, 0.06, (g) => g.rotZ(0.3).cone(0.085, 0.17, 4, fur))
  g.put(0.58, 0.47, 0.26, (g) => g.rotZ(-0.2).cone(0.085, 0.17, 4, fur))
  for (const dz of [0.06, 0.29]) g.put(0.69, 0.27, dz, (g) => g.rotY(Math.PI / 2).boxC(0.09, 0.016, 0.01, '#3a2418', { ao: 0 }))
  g.put(0.73, 0.2, 0.175, (g) => g.sphere(0.03, '#f08a98', { ao: 0 }, 6, 5))
  g.put(0.66, 0.06, 0.02, (g) => g.sphere(0.09, '#f6d9b0', {}, 8, 6))
  g.put(0.66, 0.06, 0.34, (g) => g.sphere(0.09, '#f6d9b0', {}, 8, 6))
  g.put(-0.05, 0.13, 0.42, (g) => g.rotX(Math.PI / 2).torus(0.3, 0.07, fur, {}, Math.PI * 1.15, 6, 14))
  return g.build()
}

export function buildExperience(chapters: Chapter[]): Built {
  const n = chapters.length
  const b = new GeoBuilder(101)
  b.aoHeight = 2.0
  b.ao = 0.24
  const s = new GeoBuilder(102)
  s.swayHeight = 2.2
  s.aoHeight = 2.0
  s.ao = 0.12
  const A = new TexBatch(A_SIZE, A_SIZE)
  const B = new TexBatch(A_SIZE, A_SIZE)
  const G = new TexBatch(1, 1)
  const halos: Halo[] = []
  const leds: Led[] = []
  const anims: Anim[] = []
  const bulbs: [number, number, number][] = []
  const quadB: Ctx['quadB'] = (m, w, h, r) => B.quad(xf(m.x, m.y, m.z, m.rx ?? 0, m.ry ?? 0, m.rz ?? 0), w, h, r)
  const k: Ctx = { b, s, quadB, halos, leds, anims, bulbs }
  const xs = chapters.map((_, i) => stallX(i, n))

  // ---- shell + floor ----------------------------------------------------------------------------------
  room(b, { w: W, d: D, wallH: 11, floorTop: '#b48a5e', floorSide: '#a98368', wall: '#f7e6cb', wallTop: '#fbeed8', trim: '#c9976b', sideH: 1.7 })
  for (let j = 0; j < D; j++) b.put(0, FL, -D / 2 + j + 0.5, (b) => b.box(W - 0.1, 0.012, 0.93, j % 2 ? '#dcc096' : '#e6cea6', { ao: 0 }))
  // baseboard along the low side walls
  for (const sx of [-1, 1]) b.put(sx * (W / 2 - 0.02), 0, 0, (b) => b.box(0.06, 0.62, D - 0.2, '#b98a68', { ao: 0 }))

  // ---- timeline carpet ----------------------------------------------------------------------------------
  b.put(0, FL + 0.008, CARPET_Z, (b) => b.box(36.8, 0.03, 3.0, '#a5432f', { ao: 0 }))
  b.put(0, FL + 0.038, CARPET_Z, (b) => b.box(36.4, 0.012, 2.66, '#f3e2bd', { ao: 0 }))
  for (const sz of [-1, 1]) {
    b.put(0, FL + 0.05, CARPET_Z + sz * 1.13, (b) => b.box(36.4, 0.008, 0.07, P.teal, { ao: 0 }))
    b.put(0, FL + 0.05, CARPET_Z + sz * 1.0, (b) => b.box(36.4, 0.008, 0.035, P.marigold, { ao: 0 }))
  }
  for (const sx of [-1, 1]) for (let f = 0; f < 15; f++) b.put(sx * 18.55, FL, CARPET_Z - 1.4 + f * 0.2, (b) => b.box(0.34, 0.026, 0.1, f % 2 ? '#f3e2bd' : '#a5432f', { ao: 0 }))
  // chevrons pointing right, flowing from one chapter colour to the next
  const chevron = (x: number, z: number, col: string) => {
    for (const sg of [-1, 1]) {
      b.push().at(x + 0.075, FL + 0.052, z + sg * 0.275).rotY(sg * -Math.PI / 4)
      b.box(0.2, 0.008, 0.8, col, { ao: 0 })
      b.pop()
    }
  }
  for (let i = -1; i < n; i++) {
    const xm = i < 0 ? xs[0] - 2 : i === n - 1 ? xs[n - 1] + 2 : (xs[i] + xs[i + 1]) / 2
    const ca = chapters[Math.max(0, i)].color
    const cb = chapters[Math.min(n - 1, i + 1)].color
    chevron(xm - 0.1, CARPET_Z, lighten(mix(ca, cb, 0.5), 0.05))
    chevron(xm + 0.32, CARPET_Z, lighten(mix(ca, cb, 0.5), 0.35))
  }
  // year plaques, painted to read upright from the camera (stretched in depth to undo the foreshortening)
  chapters.forEach((_, i) => A.quad(xf(xs[i], FL + 0.062, CARPET_Z, -Math.PI / 2), 1.82, 1.6, plaqueRect(i)))
  // welcome mat at the spawn + an exit hint towards the door
  A.quad(xf(-11.4, FL + 0.03, 6.1, -Math.PI / 2), 3.0, 2.65, plaqueRect(PLQ_MAIN))
  A.quad(xf(-4.7, FL + 0.03, 6.55, -Math.PI / 2), 2.2, 1.95, plaqueRect(PLQ_EXIT))
  for (let i = 0; i < 3; i++) chevron(-3.4 + i * 0.7, 6.55, i === 1 ? GOLD : GOLD_HI2)

  // ---- back wall: string course, pilasters, arched windows, posters ----------------------------------------
  b.put(0, 5.05, Z_WALL + 0.1, (b) => b.box(W, 0.16, 0.28, '#e6cfa5'))
  b.put(0, 10.6, Z_WALL + 0.1, (b) => b.box(W, 0.2, 0.3, '#e6cfa5'))
  const posts: number[] = []
  for (let i = 0; i <= n; i++) posts.push(xs[0] - PITCH / 2 + i * PITCH)
  for (const px of posts) {
    b.put(px, FL, Z_WALL + 0.11, (b) => b.box(0.34, 5.0, 0.22, '#f6e9cf', { top: '#fff3de' }))
    b.put(px, FL, Z_WALL + 0.14, (b) => b.box(0.5, 0.3, 0.3, '#e6cfa5'))
    b.put(px, 4.95, Z_WALL + 0.14, (b) => b.box(0.52, 0.18, 0.3, '#e6cfa5'))
  }
  const clockX = xs[Math.floor(n / 2)]
  const glassSrc = { x: 0, y: 0, w: 1, h: 1 }
  chapters.forEach((_, i) => {
    if (xs[i] === clockX) return
    const wx = xs[i]
    const frame = arch(new Shape(), 2.3, 4.2)
    frame.holes.push(arch(new Path(), 1.9, 3.85, 0.14))
    b.put(wx, 5.4, Z_WALL + 0.02, (b) => b.extrude(frame, 0.22, '#f4e3c0', {}, 0))
    b.put(wx, 5.28, Z_WALL + 0.2, (b) => b.box(2.7, 0.14, 0.42, '#e6cfa5'))
    G.shape(new ShapeGeometry(arch(new Shape(), 1.9, 3.85, 0.14), 10), xf(wx, 5.4, Z_WALL + 0.045), glassSrc)
  })
  // posters between the windows
  const posterSpots: [number, number][] = [[posts[2], 0], [posts[6], 1], [posts[8], 2]]
  for (const [px, pi] of posterSpots) {
    b.put(px, 6.05, Z_WALL + 0.06, (b) => b.box(1.32, 1.78, 0.07, P.woodDark))
    B.quad(xf(px, 6.94, Z_WALL + 0.11), 1.16, 1.6, posterRect(pi))
  }

  // ---- the clock niche ----------------------------------------------------------------------------------------
  const zc = Z_WALL + 0.32
  const clock = { x: clockX, y: 6.95, z: zc + 0.006, r: 1.45 }
  b.put(clockX, 5.1, Z_WALL + 0.08, (b) => b.arch(4.3, 4.35, 0.26, '#f1dfba'))
  b.put(clockX, 5.14, Z_WALL + 0.24, (b) => b.arch(3.85, 4.0, 0.05, '#c9a473', { ao: 0 }))
  b.put(clockX, clock.y, zc, (b) => {
    b.push().rotX(Math.PI / 2).at(0, -0.08, 0).cyl(1.5, 1.5, 0.08, 40, '#f8ecd5', { ao: 0 }).pop()
    b.put(0, 0, -0.02, (b) => b.torus(1.5, 0.11, GOLD, { ao: 0 }, Math.PI * 2, 8, 44))
    b.put(0, 0, 0.0, (b) => b.torus(1.25, 0.025, '#b8801f', { ao: 0 }, Math.PI * 2, 5, 44))
  })
  b.put(clockX, 9.45, Z_WALL + 0.08, (b) => b.sphere(0.14, GOLD, {}, 8, 6))
  halos.push({ p: [clockX, clock.y, Z_WALL + 0.8], s: 7.5, c: '#ffcf80', i: 0.22 })

  // ---- lever box on the post right of the clock's stall ---------------------------------------------------------
  const lever = { x: posts[Math.floor(n / 2) + 1], z: Z_FRONT }
  b.put(lever.x, 0, Z_FRONT + 0.12, (b) => {
    b.box(0.62, 1.05, 0.14, P.woodDark, { top: P.wood })
    b.put(0, 1.05, 0, (b) => b.box(0.7, 0.08, 0.2, GOLD))
    b.bar([0, 1.13, 0], [0, 3.4, -0.02], 0.045, 6, GOLD)
    b.put(0, 0.52, 0.085, (b) => b.boxC(0.46, 0.5, 0.03, '#3a2a30'))
    b.put(0, 0.52, 0.11, (b) => b.torus(0.17, 0.016, GOLD_HI2, {}, Math.PI, 6, 14))
    b.put(0, 0.28, 0.105, (b) => b.boxC(0.34, 0.006, 0.006, GOLD, { ao: 0 }))
    b.put(0, 0.52, 0.12, (b) => b.sphere(0.06, GOLD, {}, 8, 6))
  })
  A.quad(xf(lever.x, 0.9, Z_FRONT + 0.2), 0.42, 0.21, plaqueRect(PLQ_PULL))
  anims.push({ id: 'lever', geo: buildLever(), pos: [lever.x, 0.52, Z_FRONT + 0.25] })

  // ---- the nine stalls ---------------------------------------------------------------------------------------------
  const stalls: Built['stalls'] = []
  chapters.forEach((ch, i) => {
    const x0 = xs[i]
    stall(k, A, B, i, ch, x0, chalkIndex(chapters, ch.id))
    switch (ch.id) {
      case 'nit':
        nitProp(k, x0, ch)
        break
      case 'fixhealth':
        fixProp(k, x0, ch)
        break
      case 'brandflow':
        brandProp(k, x0, ch)
        break
      case 'yaas':
        yaasProp(k, x0, ch)
        break
      case 'beyond':
        beyondProp(k, x0, ch)
        break
      case 'survivingai':
        survivingProp(k, x0, ch)
        break
      case 'june':
        juneProp(k, x0, ch)
        break
      case 'saasflash':
        saasProp(k, x0, ch, dirRect, quadB)
        break
      case 'socialcapital':
        socialProp(k, x0, ch)
        break
    }
    const lookX: Record<string, number> = { nit: -0.85, fixhealth: -0.8, brandflow: -0.45, yaas: -0.2, beyond: -0.2, survivingai: -0.15, june: -0.15, saasflash: 0.55, socialcapital: -0.35 }
    stalls.push({ ch, x: x0, look: [x0 + (lookX[ch.id] ?? 0), CTR_TOP + 0.6, PZ] })
  })

  // ---- lantern posts + bunting between them ------------------------------------------------------------------------------
  const flagCols = [P.coral, P.marigold, P.teal, P.cream, P.pink, P.leafLight, P.lilac]
  posts.forEach((px, pi) => {
    b.put(px, 0, Z_FRONT, (b) => {
      b.cyl(0.19, 0.22, 0.2, 10, '#e6cfa5')
      b.put(0, 0.2, 0, (b) => b.cyl(0.1, 0.13, 3.95, 8, '#f6e9cf', { top: '#fff3de' }))
      b.put(0, 0.9, 0, (b) => b.cyl(0.15, 0.15, 0.09, 8, GOLD))
      b.put(0, 4.15, 0, (b) => {
        b.cyl(0.16, 0.12, 0.13, 8, GOLD)
        b.put(0, 0.13, 0, (b) => b.sphere(0.21, '#ffe2a0', { glow: 0.9, ao: 0 }, 10, 8))
        b.put(0, 0.3, 0, (b) => b.cone(0.22, 0.24, 8, GOLD))
        b.put(0, 0.52, 0, (b) => b.sphere(0.05, GOLD, {}, 6, 5))
      })
    })
    halos.push({ p: [px, 4.3, Z_FRONT + 0.08], s: 1.5, c: '#ffcf7a', i: 0.36 })
    if (pi < posts.length - 1) {
      const nx = posts[pi + 1]
      const segs = 10
      let prev: [number, number, number] | null = null
      for (let j = 0; j <= segs; j++) {
        const t = j / segs
        const x = px + (nx - px) * t
        const y = 4.68 - 0.36 * (1 - (2 * t - 1) * (2 * t - 1))
        const p: [number, number, number] = [x, y, Z_FRONT + 0.02]
        if (prev) b.bar(prev, p, 0.011, 4, '#5a4032')
        prev = p
        if (j > 0 && j < segs && Math.abs(t - 0.5) > 0.1) {
          s.put(x, y - 0.01, Z_FRONT + 0.02, (s) => s.rotZ(Math.PI).gable(0.27, 0.34, 0.018, flagCols[(pi * 3 + j) % flagCols.length], { sway: 0.7, ao: 0 }))
        }
      }
    }
  })

  // ---- decor: plants, a stool with a sleeping cat, benches -----------------------------------------------------------------------
  plant(b, -18.25, -2.5, 1.0, P.pink)
  plant(b, 18.3, -2.3, 0.95, P.marigold)
  plant(b, -18.2, 6.2, 1.15)
  plant(b, 18.2, 6.2, 1.15, P.pink)
  plant(b, -14.2, 7.9, 0.9)
  plant(b, 14.4, 7.9, 0.95, P.marigold)
  // stool
  b.put(-17.0, 0, -2.2, (b) => {
    b.cyl(0.37, 0.37, 0.09, 12, P.wood, { top: '#c68a62' })
    b.put(0, 0.57, 0, (b) => b.cyl(0.4, 0.37, 0.09, 12, P.wood, { top: '#c68a62' }))
    for (let l = 0; l < 3; l++) {
      const a = (l / 3) * Math.PI * 2 + 0.5
      b.bar([Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3], [Math.cos(a) * 0.36, 0, Math.sin(a) * 0.36], 0.035, 5, P.woodDark)
    }
    b.put(0.2, 0.66, 0.3, (b) => b.cyl(0.1, 0.1, 0.02, 8, P.terracotta, { ao: 0 }))
  })
  anims.push({ id: 'cat', geo: buildCat(), pos: [-17.0, 0.66, -2.28], rot: [0, -0.5, 0] })
  // window boxes along the tops of the low side walls
  const blooms = [P.pink, P.marigold, P.coral, P.cream]
  for (const sx of [-1, 1]) {
    for (let j = 0; j < 6; j++) {
      const z = -7.4 + j * 2.9
      b.put(sx * (W / 2 + 0.35), 1.92, z, (b) => {
        b.box(0.56, 0.3, 1.0, P.terracotta, { top: '#e98a62', ao: 0 })
        b.put(0, 0.3, -0.25, (b) => b.blob(0.3, P.leaf, { top: P.leafLight, ao: 0 }))
        b.put(0.02, 0.3, 0.25, (b) => b.blob(0.27, P.leafDark, { top: P.leaf, ao: 0 }))
        b.put(-0.05, 0.62, 0.0, (b) => b.sphere(0.09, blooms[(j + (sx > 0 ? 2 : 0)) % blooms.length], { glow: 0.12, ao: 0 }, 6, 5))
      })
    }
  }
  // benches
  for (const bx of [-7.6, 7.6]) {
    b.put(bx, 0, 7.15, (b) => {
      b.put(0, 0.5, 0, (b) => b.box(2.7, 0.12, 0.72, P.wood, { top: '#c68a62' }))
      for (const lx of [-1.15, 1.15]) for (const lz of [-0.26, 0.26]) b.put(lx, 0, lz, (b) => b.box(0.12, 0.5, 0.12, P.woodDark))
      b.put(-0.7, 0.62, 0, (b) => b.box(0.62, 0.14, 0.5, k2(bx), { ao: 0 }))
    })
  }

  // ---- light shafts -------------------------------------------------------------------------------------------------------------
  const shafts = buildShafts(chapters.map((_, i) => xs[i]).filter((x) => x !== clockX))

  return {
    geo: b.build(),
    sway: s.build(),
    texA: A.build(),
    texB: B.build(),
    glass: G.build(),
    shafts,
    halos,
    leds,
    anims,
    bulbs,
    stalls,
    posts,
    clock,
    lever,
  }
}

const k2 = (x: number) => (x < 0 ? P.teal : P.terracotta)

function buildLever() {
  const g = new GeoBuilder(61)
  g.ao = 0
  // arm pointing up; the component rotates it around z
  g.cyl(0.05, 0.05, 0.62, 6, GOLD, { ao: 0 })
  g.put(0, 0.66, 0, (g) => g.sphere(0.1, P.red, { ao: 0 }, 10, 8))
  g.sphere(0.075, '#b8801f', { ao: 0 }, 8, 6)
  return g.build()
}

function buildShafts(xs: number[]) {
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const add = (x: number) => {
    // y, z, x-shift, half-width, intensity: a slanted sheet falling from the window towards the street
    const rows: [number, number, number, number, number][] = [
      [9.4, Z_WALL + 0.3, 0.0, 0.7, 0.09],
      [5.6, Z_WALL + 1.9, 1.4, 0.95, 0.05],
      [1.6, Z_WALL + 3.9, 2.8, 1.25, 0.0],
    ]
    const base = pos.length / 3
    rows.forEach(([y, z, dx, hw, it]) => {
      pos.push(x + dx - hw, y, z, x + dx + hw, y, z)
      const c = [1.0 * it, 0.84 * it, 0.5 * it]
      col.push(...c, ...c)
    })
    for (let r = 0; r < 2; r++) {
      const a = base + r * 2
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2)
    }
  }
  xs.forEach(add)
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeBoundingSphere()
  return g
}

// ---- one stall: rug, back panel, counter (+ chalk), awning, hanging sign, paper lantern ----------------------------
function stall(k: Ctx, A: TexBatch, B: TexBatch, i: number, ch: Chapter, x0: number, chalkIdx: number) {
  const { b, s, halos } = k
  const c = ch.color
  const cDeep = darken(c, 0.4)
  const cMid = lighten(c, 0.12)
  const cLight = lighten(c, 0.62)
  b.push().at(x0, 0, 0)
  // rug in the chapter colour, from the wall to the walkway
  b.put(0, FL + 0.006, -6.35, (b) => b.box(3.7, 0.02, 5.3, cDeep, { ao: 0 }))
  b.put(0, FL + 0.02, -6.35, (b) => b.box(3.36, 0.012, 4.96, lighten(c, 0.3), { ao: 0 }))
  b.put(0, FL + 0.03, -6.35, (b) => b.box(3.36, 0.008, 0.08, CREAM, { ao: 0 }))
  // back panel + wainscot + a shelf with a few knick-knacks
  b.put(0, FL, Z_WALL + 0.06, (b) => b.box(3.7, 4.1, 0.08, cLight, { ao: 0.15 }))
  b.put(0, FL, Z_WALL + 0.12, (b) => b.box(3.7, 1.05, 0.1, cMid))
  b.put(0, 1.72, Z_WALL + 0.34, (b) => b.box(3.2, 0.07, 0.42, P.wood, { top: '#c68a62' }))
  const jar = [P.terracotta, P.teal, P.marigold, P.indigo, P.coral, P.leaf, P.pink, P.cream]
  for (let j = 0; j < 6; j++) {
    const sx = -1.35 + j * 0.54 + ((i * 7 + j * 3) % 5) * 0.03
    const col = jar[(i * 3 + j * 5) % jar.length]
    const kind = (i + j) % 3
    b.put(sx, 1.79, Z_WALL + 0.32, (b) => {
      if (kind === 0) b.cyl(0.11, 0.11, 0.26, 8, col, { top: lighten(col, 0.3) })
      else if (kind === 1) b.box(0.22, 0.2 + ((j * 13) % 4) * 0.03, 0.2, col)
      else b.box(0.1, 0.3, 0.18, col)
    })
  }
  // counter
  b.put(0, 0, Z_CTR, (b) => b.box(3.44, 1.0, 1.3, cDeep, { ao: 0.2 }))
  b.put(0, 1.0, Z_CTR, (b) => b.box(3.64, 0.12, 1.5, '#dcc191', { top: '#e9d3a6', ao: 0 }))
  const zf = Z_CTR + 0.65
  b.put(0, 0, zf + 0.02, (b) => b.box(3.44, 0.13, 0.04, '#3a2a30', { ao: 0 }))
  b.put(0, 0.9, zf + 0.02, (b) => b.box(3.44, 0.1, 0.05, cMid, { ao: 0 }))
  for (const sx of [-1, 1]) b.put(sx * 1.66, 0.13, zf + 0.02, (b) => b.box(0.14, 0.77, 0.05, cMid, { ao: 0 }))
  if (chalkIdx >= 0) {
    const yaas = ch.id === 'yaas'
    const cw = yaas ? 2.06 : 2.34
    const chh = cw * (138 / 512)
    const cy = yaas ? 0.36 : 0.52
    b.put(0, cy - chh / 2 - 0.06, zf + 0.02, (b) => {
      b.box(cw + 0.14, chh + 0.12, 0.05, P.woodDark, { top: P.wood, ao: 0 })
    })
    B.quad(xf(x0, cy, zf + 0.056), cw, chh, chalkRect(chalkIdx))
  } else {
    for (const px of [-1, 0, 1]) b.put(px * 1.06, 0.2, zf + 0.02, (b) => b.box(0.9, 0.66, 0.035, cMid, { top: lighten(c, 0.35), ao: 0 }))
  }
  if (ch.id === 'yaas') {
    b.put(0, 0.7, zf + 0.02, (b) => b.box(2.34, 0.2, 0.05, '#0b1310', { ao: 0 }))
    k.leds.push({ id: 'ticker', pos: [x0, 0.8, zf + 0.05], rot: [0, 0, 0], w: 2.2, h: 0.15, texW: 1024, texH: 70, fps: 14 })
  }
  // awning: canvas stripes sloping up towards the wall, scalloped valance on the front edge
  const nS = 7
  const sw = 3.7 / nS
  const yF = 3.9
  const yB = 4.9
  const zB = Z_WALL + 0.06
  const len = Math.hypot(Z_FRONT - zB, yB - yF)
  const ang = Math.atan2(yB - yF, Z_FRONT - zB)
  for (let j = 0; j < nS; j++) {
    const x = (j - (nS - 1) / 2) * sw
    const col = j % 2 === 0 ? c : CREAM
    b.push().at(x, (yF + yB) / 2, (Z_FRONT + zB) / 2).rotX(ang)
    b.box(sw - 0.006, 0.06, len, col, { top: lighten(col, 0.16), ao: 0 })
    b.pop()
    s.put(x0 + x, yF - 0.3, Z_FRONT, (s) => s.box(sw - 0.006, 0.3, 0.05, col, { sway: 0.28, ao: 0 }))
    s.push().at(x0 + x, yF - 0.3, Z_FRONT - 0.005).rotX(Math.PI / 2).at(0, -0.025, 0)
    s.cyl(sw / 2 - 0.003, sw / 2 - 0.003, 0.05, 12, col, { sway: 0.28, ao: 0 })
    s.pop()
  }
  b.push().at(-1.86, yF - 0.01, Z_FRONT + 0.03).rotZ(-Math.PI / 2).cyl(0.045, 0.045, 3.72, 8, P.woodDark).pop()
  // hanging sign
  const sy = 3.36
  const sz = Z_FRONT + 0.16
  const tilt = -0.26
  b.push().at(0, sy, sz).rotX(tilt).boxC(3.38, 0.8, 0.09, P.woodDark).pop()
  for (const sx of [-1.42, 1.42]) b.bar([sx, sy + 0.38, sz - 0.08], [sx, yF, Z_FRONT + 0.03], 0.014, 4, GOLD)
  A.quad(xf(x0, sy, sz, tilt).multiply(xf(0, 0, 0.049)), 3.2, 0.76, signRect(i))
  b.pop()
  // paper lantern above the sign, in the chapter colour
  s.push().at(x0, 4.36, Z_FRONT + 0.02).scale(1, 1.18, 1)
  s.sphere(0.25, lighten(c, 0.12), { glow: 0.55, ao: 0, sway: 0.4 }, 10, 8)
  s.pop()
  s.put(x0, 4.36 + 0.3, Z_FRONT + 0.02, (s) => s.cyl(0.09, 0.09, 0.04, 8, '#3a2a30', { sway: 0.4, ao: 0 }))
  s.put(x0, 4.36 - 0.33, Z_FRONT + 0.02, (s) => s.cyl(0.07, 0.07, 0.04, 8, '#3a2a30', { sway: 0.4, ao: 0 }))
  s.put(x0, 4.36 - 0.55, Z_FRONT + 0.02, (s) => s.cyl(0.012, 0.012, 0.22, 4, GOLD, { sway: 0.4, ao: 0 }))
  halos.push({ p: [x0, 4.36, Z_FRONT + 0.14], s: 1.35, c: lighten(c, 0.2), i: 0.3 })
  // a warm glow inside the stall
  halos.push({ p: [x0, 2.3, Z_CTR - 0.8], s: 3.0, c: '#ffd9a0', i: 0.1 })
}
