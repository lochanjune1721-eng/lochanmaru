// EXPERIENCE interior — the nine hero props (one per stall) plus small reusable bits.
// Everything is built from GeoBuilder primitives in interior-local coordinates: x along the street,
// y up, z towards the visitor. Props live on the counter top (y = CTR_TOP, centred on PZ).
import { BufferGeometry, Shape } from 'three'
import type { Chapter } from '../content/experience'
import { GeoBuilder } from '../gfx/geo'
import { P } from '../gfx/palette'
import { CTR_TOP, FL, PZ, Z_WALL, darken, lighten, tiltPt } from './experience.util'
import type { Rect } from './experience.util'

const GOLD = '#e9b04c'
const GOLD_HI = '#f6cf7a'
const BRASS_DK = '#b8801f'

export interface Halo {
  p: [number, number, number]
  /** diameter in world units */
  s: number
  c: string
  i: number
}
export interface Led {
  id: string
  pos: [number, number, number]
  rot: [number, number, number]
  w: number
  h: number
  texW: number
  texH: number
  fps: number
}
export interface Anim {
  id: string
  geo: BufferGeometry
  pos: [number, number, number]
  rot?: [number, number, number]
}
/** everything a prop builder can contribute to */
export interface Ctx {
  b: GeoBuilder
  /** swaying bits: flags, valances, lanterns */
  s: GeoBuilder
  /** textured quads sharing atlas B (chalk + posters), added by the caller through this hook */
  quadB: (m: { x: number; y: number; z: number; rx?: number; ry?: number; rz?: number }, w: number, h: number, r: Rect) => void
  halos: Halo[]
  leds: Led[]
  anims: Anim[]
  bulbs: [number, number, number][]
}

// ---- reusable bits --------------------------------------------------------------------------------------
/** a disc whose axis is z (faces the visitor), centred */
function discZ(b: GeoBuilder, r: number, t: number, color: string, o: { glow?: number; ao?: number; top?: string } = {}, seg = 18) {
  b.push().rotX(Math.PI / 2).at(0, -t / 2, 0).cyl(r, r, t, seg, color, { ao: 0, ...o }).pop()
}

/** a toothed wheel with its axis along z */
function gearZ(b: GeoBuilder, r: number, teeth: number, t: number, body: string, tooth: string) {
  discZ(b, r * 0.86, t, body, {}, 26)
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    b.push().rotZ(a).at(r * 0.86, 0, 0)
    b.boxC(r * 0.3, r * 0.3, t, tooth, { ao: 0 })
    b.pop()
  }
}

/** flat gear lying on a surface (axis y) */
function gearFlat(b: GeoBuilder, r: number, teeth: number, h: number, body: string, tooth: string) {
  b.cyl(r * 0.86, r * 0.86, h, 18, body, { top: lighten(body, 0.25) })
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    b.push().rotY(a).at(r * 0.86, 0, 0)
    b.box(r * 0.3, h, r * 0.3, tooth)
    b.pop()
  }
  b.put(0, h, 0, (b) => b.cyl(r * 0.22, r * 0.22, 0.02, 10, P.ink))
}

function pill(b: GeoBuilder, cx: number, cz: number, ry: number, c1: string, c2: string, r = 0.052, len = 0.13) {
  b.push().at(cx, r, cz).rotY(ry)
  b.push().at(-len, 0, 0).rotZ(-Math.PI / 2).cyl(r, r, len, 8, c1, { ao: 0 }).pop()
  b.push().rotZ(-Math.PI / 2).cyl(r, r, len, 8, c2, { ao: 0 }).pop()
  b.put(-len, 0, 0, (b) => b.sphere(r, c1, { ao: 0 }, 8, 6))
  b.put(len, 0, 0, (b) => b.sphere(r, c2, { ao: 0 }, 8, 6))
  b.pop()
}

function heartShape(s: number) {
  const h = new Shape()
  h.moveTo(0, -1 * s)
  h.bezierCurveTo(-1.4 * s, -0.1 * s, -1.0 * s, 1.0 * s, 0, 0.45 * s)
  h.bezierCurveTo(1.0 * s, 1.0 * s, 1.4 * s, -0.1 * s, 0, -1 * s)
  return h
}

/** a megaphone on a short pole; the bell faces the visitor. Local origin = pole foot. */
function megaphone(b: GeoBuilder, body: string, trim: string, sc = 1) {
  b.push().scale(sc)
  b.cyl(0.035, 0.045, 0.42, 6, P.ink)
  b.push().at(0, 0.42, 0).rotY(0.95).rotX(Math.PI / 2 - 0.7)
  b.cyl(0.42, 0.1, 0.9, 14, body, { top: lighten(body, 0.2) })
  b.put(0, 0.88, 0, (b) => b.cyl(0.46, 0.46, 0.07, 14, trim))
  b.put(0, 0.94, 0, (b) => b.cyl(0.37, 0.37, 0.03, 14, P.ink, { ao: 0 }))
  b.put(0, 0.5, 0, (b) => b.cyl(0.29, 0.27, 0.07, 14, trim))
  b.put(0, -0.13, 0, (b) => b.cyl(0.085, 0.105, 0.16, 8, P.ink))
  b.pop()
  b.pop()
}

function bulbGlow(k: Ctx, x: number, y: number, z: number, s: number, c: string, i = 0.6) {
  k.halos.push({ p: [x, y, z], s, c, i })
}

// ---- 0 · NIT Mechanics: brass cog, video-call laptop, pennant --------------------------------------------
function buildCog() {
  const g = new GeoBuilder(11)
  g.ao = 0
  gearZ(g, 0.6, 10, 0.2, GOLD, GOLD_HI)
  discZ(g, 0.38, 0.23, BRASS_DK, {}, 22)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3
    g.put(Math.cos(a) * 0.235, Math.sin(a) * 0.235, 0, (g) => discZ(g, 0.07, 0.25, P.ink, {}, 10))
  }
  discZ(g, 0.15, 0.3, GOLD_HI, {}, 14)
  discZ(g, 0.055, 0.34, P.ink, {}, 8)
  return g.build()
}

export function nitProp(k: Ctx, x0: number, ch: Chapter) {
  const { b, s } = k
  b.push().at(x0, CTR_TOP, PZ)
  // stand for the big cog
  b.put(-1.0, 0, -0.1, (b) => {
    b.box(0.94, 0.09, 0.38, P.woodDark, { top: P.wood })
    b.put(0, 0.09, 0, (b) => b.box(0.3, 0.06, 0.3, P.wood))
  })
  k.anims.push({ id: 'cog', geo: buildCog(), pos: [x0 - 1.0, CTR_TOP + 0.79, PZ - 0.1] })
  // small cog lying on the counter
  b.put(-1.5, 0, 0.42, (b) => gearFlat(b, 0.24, 8, 0.07, '#2f9591', '#57c7be'))
  // laptop
  b.put(0.5, 0, 0.22, (b) => {
    b.box(1.0, 0.05, 0.66, '#c7cdda', { top: '#e6eaf2' })
    b.put(0, 0.05, 0.1, (b) => b.box(0.82, 0.012, 0.3, '#7d8398', { ao: 0 }))
    b.put(0, 0.05, 0.32, (b) => b.box(0.3, 0.012, 0.16, '#aeb4c4', { ao: 0 }))
  })
  const hinge: [number, number, number] = [x0 + 0.5, CTR_TOP + 0.05, PZ + 0.22 - 0.3]
  b.push().at(0.5, 0.05, 0.22 - 0.3).rotX(-0.36).box(1.0, 0.66, 0.05, '#2c2a3c').pop()
  k.leds.push({ id: 'call', pos: tiltPt(hinge, -0.36, 0.35, 0.032), rot: [-0.36, 0, 0], w: 0.88, h: 0.52, texW: 512, texH: 302, fps: 8 })
  // pennant on a pole
  b.put(1.5, 0, -0.32, (b) => {
    b.cyl(0.022, 0.03, 1.22, 6, GOLD)
    b.put(0, 1.22, 0, (b) => b.sphere(0.06, GOLD_HI, {}, 8, 6))
  })
  s.push().at(x0 + 1.5, CTR_TOP + 0.98, PZ - 0.32).rotZ(Math.PI / 2)
  s.gable(0.34, 0.62, 0.03, ch.color, { sway: 0.9, ao: 0 })
  s.put(0, 0, 0.022, (s) => s.gable(0.16, 0.36, 0.02, '#fff3d8', { sway: 0.9, ao: 0 }))
  s.pop()
  // pencil cup
  b.put(1.05, 0, 0.5, (b) => {
    b.cyl(0.15, 0.13, 0.3, 10, P.terracotta, { top: '#eb8c62' })
    const cols = [P.marigold, P.teal, P.coral, P.cream]
    cols.forEach((c, i) => {
      const a = (i / cols.length) * Math.PI * 2
      b.push().at(Math.cos(a) * 0.06, 0.28, Math.sin(a) * 0.06).rotZ(Math.cos(a) * 0.3).rotX(Math.sin(a) * 0.3)
      b.cyl(0.018, 0.018, 0.34, 5, c, { ao: 0 })
      b.put(0, 0.34, 0, (b) => b.cone(0.018, 0.06, 5, '#f2c9a0', { ao: 0 }))
      b.pop()
    })
  })
  b.pop()
}

// ---- 1 · Fix Health: cross lamp, clipboard, jar of capsules, chat phone ------------------------------------
export function fixProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  // first-aid cross lamp
  b.put(-1.12, 0, 0, (b) => {
    b.cyl(0.27, 0.31, 0.07, 12, '#f4f1ea')
    b.put(0, 0.07, 0, (b) => b.cyl(0.05, 0.06, 0.4, 8, '#dfe3ea'))
    b.put(0, 0.47, 0, (b) => {
      b.box(0.66, 0.6, 0.4, '#fbf7ef', { top: '#ffffff', glow: 0.22, ao: 0 })
      b.put(0, 0.3, 0.205, (b) => {
        b.boxC(0.15, 0.46, 0.03, P.red, { glow: 0.9, ao: 0 })
        b.boxC(0.46, 0.15, 0.03, P.red, { glow: 0.9, ao: 0 })
      })
      b.put(0, 0.6, 0, (b) => b.box(0.72, 0.05, 0.46, '#e7e2d6'))
    })
  })
  bulbGlow(k, x0 - 1.12, CTR_TOP + 0.78, PZ + 0.3, 1.5, '#ff9aa0', 0.4)
  // jar of capsules
  b.put(-0.4, 0, 0.12, (b) => {
    b.cyl(0.24, 0.25, 0.52, 14, '#c6ebe2', { top: '#e2f7f1' })
    b.put(0, 0.52, 0, (b) => b.cyl(0.26, 0.26, 0.1, 14, P.coral))
    b.put(0, 0.27, 0.245, (b) => b.boxC(0.32, 0.24, 0.02, '#fffaf0', { ao: 0 }))
    b.put(0, 0.27, 0.258, (b) => {
      b.boxC(0.06, 0.17, 0.012, P.red, { glow: 0.5, ao: 0 })
      b.boxC(0.17, 0.06, 0.012, P.red, { glow: 0.5, ao: 0 })
    })
  })
  pill(b, -0.05, 0.58, 0.4, P.red, P.cream)
  pill(b, 0.12, 0.72, -0.5, '#3e6fd0', P.marigold)
  pill(b, -0.3, 0.72, 1.1, P.teal, P.cream)
  // phone on a dock
  const pOrigin: [number, number, number] = [x0 + 0.5, CTR_TOP + 0.06, PZ + 0.18]
  b.put(0.5, 0, 0.32, (b) => b.box(0.52, 0.06, 0.36, '#2b2438'))
  b.push().at(0.5, 0.06, 0.18).rotX(-0.3).box(0.46, 0.82, 0.05, '#1f1b2e').pop()
  k.leds.push({ id: 'chat', pos: tiltPt(pOrigin, -0.3, 0.42, 0.03), rot: [-0.3, 0, 0], w: 0.39, h: 0.7, texW: 256, texH: 458, fps: 8 })
  // clipboard
  b.push().at(1.3, 0, -0.05).rotX(-0.26)
  b.box(0.58, 0.76, 0.04, P.wood)
  b.put(0, 0.05, 0.025, (b) => b.box(0.48, 0.62, 0.012, '#fffdf5', { ao: 0 }))
  b.put(0, 0.68, 0.03, (b) => b.box(0.22, 0.1, 0.04, '#c9cfdb'))
  b.put(0, 0.36, 0.04, (b) => {
    b.boxC(0.05, 0.2, 0.01, P.red, { ao: 0 })
    b.boxC(0.2, 0.05, 0.01, P.red, { ao: 0 })
  })
  for (let i = 0; i < 3; i++) b.put(0, 0.18 - i * 0.055, 0.04, (b) => b.boxC(0.34, 0.012, 0.008, '#b4bccb', { ao: 0 }))
  b.pop()
  b.pop()
}

// ---- 2 · Brand Flow Media: megaphone, rising bars, film reels --------------------------------------------
export function brandProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  b.put(-1.2, 0, 0.0, (b) => megaphone(b, P.red, P.cream))
  // rising bar chart
  b.put(-0.3, 0, 0.05, (b) => {
    b.box(1.05, 0.06, 0.44, P.woodDark, { top: P.wood })
    const bars: [number, number, string][] = [
      [-0.34, 0.5, P.cream],
      [0.0, 0.92, P.marigold],
      [0.34, 1.26, P.coral],
    ]
    for (const [x, h, c] of bars) b.put(x, 0.06, 0, (b) => b.box(0.27, h, 0.27, c, { top: lighten(c, 0.3) }))
    b.bar([-0.5, 0.42, 0.24], [0.3, 1.0, 0.24], 0.03, 5, P.cream)
    const ang = Math.atan2(0.58, 0.8)
    b.push().at(0.3, 1.0, 0.24).rotZ(-(Math.PI / 2 - ang)).cone(0.1, 0.24, 6, P.cream).pop()
  })
  // film reels
  b.put(0.72, 0.42, 0.0, (b) => {
    discZ(b, 0.31, 0.1, '#5a3a2c')
    b.put(0, 0, 0.07, (b) => discZ(b, 0.42, 0.025, '#3a3a48', {}, 24))
    b.put(0, 0, -0.07, (b) => discZ(b, 0.42, 0.025, '#3a3a48', {}, 24))
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3
      b.put(Math.cos(a) * 0.23, Math.sin(a) * 0.23, 0.075, (b) => discZ(b, 0.08, 0.02, '#7a5a48', {}, 10))
    }
    b.put(0, 0, 0.09, (b) => discZ(b, 0.1, 0.03, GOLD, {}, 12))
    b.put(0, 0, 0.11, (b) => discZ(b, 0.035, 0.03, P.ink, {}, 8))
  })
  b.put(1.35, 0, 0.32, (b) => {
    for (let i = 0; i < 3; i++) {
      b.put(0, i * 0.07, 0, (b) => {
        b.cyl(0.32, 0.32, 0.06, 16, '#3a3a48', { top: '#54546a' })
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * Math.PI * 2 + i
          b.put(Math.cos(a) * 0.19, 0.06, Math.sin(a) * 0.19, (b) => b.cyl(0.05, 0.05, 0.005, 8, '#e9dfc9', { ao: 0 }))
        }
      })
    }
    b.put(0, 0.21, 0, (b) => b.cyl(0.07, 0.07, 0.04, 10, GOLD))
  })
  // film strip trailing over the counter
  b.push().at(0.95, 0.012, 0.36).rotY(-0.5)
  b.box(0.11, 0.008, 0.62, P.ink, { ao: 0 })
  for (let i = 0; i < 6; i++) {
    b.put(-0.04, 0.008, -0.26 + i * 0.1, (b) => b.boxC(0.02, 0.006, 0.04, '#e9dfc9', { ao: 0 }))
    b.put(0.04, 0.008, -0.26 + i * 0.1, (b) => b.boxC(0.02, 0.006, 0.04, '#e9dfc9', { ao: 0 }))
  }
  b.pop()
  b.pop()
}

// ---- 3 · Yaas: candlestick sculpture, coin stacks (+ the ticker, which lives on the counter front) -------
export function yaasProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  b.put(-0.5, 0, 0.0, (b) => b.box(1.6, 0.08, 0.5, P.woodDark, { top: P.wood }))
  const cs: [number, number, boolean][] = [
    [0.3, 0.22, true],
    [0.34, 0.18, false],
    [0.52, 0.3, true],
    [0.62, 0.22, true],
    [0.64, 0.2, false],
    [0.98, 0.36, true],
  ]
  cs.forEach(([cy, bh, up], i) => {
    const col = up ? '#3fd08a' : '#ef4b57'
    b.put(-1.12 + i * 0.25, 0.08, 0, (b) => {
      b.put(0, cy - bh / 2 - 0.12, 0, (b) => b.cyl(0.014, 0.014, bh + 0.24, 5, '#f3e6c6', { ao: 0 }))
      b.put(0, cy - bh / 2, 0, (b) => b.box(0.16, bh, 0.16, col, { top: lighten(col, 0.25), glow: 0.1 }))
    })
  })
  // coin stacks
  const stack = (x: number, z: number, n: number) => {
    for (let j = 0; j < n; j++) b.put(x, j * 0.056, z, (b) => b.cyl(0.2, 0.2, 0.05, 14, j % 2 ? '#f2b73f' : '#e6a02a', { top: '#ffd870' }))
  }
  stack(0.65, 0.05, 7)
  stack(0.98, 0.14, 4)
  stack(1.3, 0.02, 6)
  b.put(0.95, 0.24, 0.52, (b) => {
    b.rotY(-0.25)
    discZ(b, 0.21, 0.05, '#f2b73f', {}, 18)
    b.put(0, 0, 0.03, (b) => discZ(b, 0.14, 0.02, '#d99a25', {}, 16))
  })
  b.pop()
}

// ---- 4 · Beyond Degree: cap on a hook, globe, book stack ---------------------------------------------------
function buildGlobe() {
  const g = new GeoBuilder(41)
  g.ao = 0
  g.sphere(0.36, '#3f8fd0', { ao: 0 }, 16, 12)
  const lands: [number, number, number][] = [
    [0.3, 0.55, 0.14],
    [-0.1, 0.8, 0.12],
    [0.1, -0.2, 0.15],
    [-0.35, 0.1, 0.13],
    [0.35, -0.75, 0.11],
    [-0.15, 2.4, 0.13],
    [0.4, 1.8, 0.11],
    [-0.5, -1.3, 0.12],
  ]
  for (const [lat, lon, r] of lands) {
    g.put(Math.cos(lat) * Math.sin(lon) * 0.36, Math.sin(lat) * 0.36, Math.cos(lat) * Math.cos(lon) * 0.36, (g) => g.blob(r, P.leaf, { top: P.leafLight, ao: 0 }, 1))
  }
  g.put(0, 0.36, 0, (g) => g.sphere(0.07, P.cream, { ao: 0 }, 8, 6))
  return g.build()
}

export function beyondProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  // hat stand with the graduation cap hung on a hook
  b.put(-1.25, 0, 0.0, (b) => {
    b.cyl(0.3, 0.34, 0.07, 14, P.woodDark, { top: P.wood })
    b.put(0, 0.07, 0, (b) => b.cyl(0.035, 0.045, 1.02, 6, P.wood))
    b.put(0, 1.09, 0, (b) => b.sphere(0.07, GOLD, {}, 8, 6))
    b.bar([0, 0.84, 0], [0.26, 0.96, 0], 0.028, 5, GOLD)
    b.bar([0, 0.84, 0], [-0.24, 0.94, 0], 0.028, 5, GOLD)
    b.put(0.34, 0.86, 0.03, (b) => {
      b.rotZ(-0.32)
      b.cyl(0.19, 0.21, 0.17, 10, '#23202d')
      b.put(0, 0.17, 0, (b) => {
        b.rotY(0.6)
        b.box(0.68, 0.045, 0.68, '#23202d', { top: '#3a3646', ao: 0 })
        b.put(0, 0.045, 0, (b) => b.sphere(0.04, GOLD, {}, 6, 5))
        b.bar([0, 0.05, 0], [0.34, 0.03, 0.34], 0.01, 4, GOLD_HI)
        b.put(0.34, -0.25, 0.34, (b) => {
          b.cyl(0.006, 0.006, 0.28, 4, GOLD_HI, { ao: 0 })
          b.cyl(0.035, 0.05, 0.13, 6, GOLD, { ao: 0 })
        })
      })
    })
  })
  // globe on a stand
  b.put(-0.15, 0, 0.1, (b) => {
    b.cyl(0.27, 0.3, 0.06, 14, P.woodDark, { top: P.wood })
    b.put(0, 0.06, 0, (b) => b.cyl(0.04, 0.05, 0.2, 6, GOLD))
    b.put(0, 0.71, 0, (b) => b.rotZ(0.38).torus(0.46, 0.022, GOLD, { ao: 0 }, Math.PI * 2, 6, 28))
  })
  k.anims.push({ id: 'globe', geo: buildGlobe(), pos: [x0 - 0.15, CTR_TOP + 0.71, PZ + 0.1], rot: [0, 0, 0.38] })
  // stack of books with a bookmark
  b.put(0.88, 0, 0.14, (b) => {
    const bk = (y: number, w: number, h: number, d: number, ry: number, c: string) =>
      b.put(0, y, 0, (b) => {
        b.rotY(ry)
        b.box(w, h, d, c, { top: lighten(c, 0.25) })
        b.put(0, 0.02, d / 2 + 0.003, (b) => b.boxC(w - 0.08, h - 0.05, 0.01, '#f3e8cc', { ao: 0 }))
      })
    bk(0, 0.94, 0.15, 0.6, 0.07, P.terracotta)
    bk(0.15, 0.86, 0.13, 0.55, -0.1, P.tealDeep)
    bk(0.28, 0.9, 0.14, 0.58, 0.14, P.marigold)
    bk(0.42, 0.72, 0.12, 0.5, -0.06, P.indigo)
    b.put(0.14, 0.545, 0.05, (b) => b.box(0.05, 0.012, 0.34, P.red, { ao: 0 }))
    b.put(0.14, 0.27, 0.34, (b) => b.box(0.05, 0.28, 0.012, P.red, { ao: 0 }))
  })
  b.pop()
}

// ---- 5 · Surviving AI: friendly robot-head lamp + lifebuoy ---------------------------------------------------
export function survivingProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  b.put(-0.15, 0, 0.08, (b) => {
    b.cyl(0.36, 0.4, 0.09, 14, '#dfe4ee', { top: '#f4f7fb' })
    for (let i = 0; i < 3; i++) b.put(0, 0.09 + i * 0.075, 0, (b) => b.cyl(0.1, 0.1, 0.06, 8, i % 2 ? '#8892a6' : '#c5ccda'))
    b.put(0, 0.32, 0, (b) => {
      b.box(0.94, 0.62, 0.68, '#eef1f7', { top: '#ffffff', glow: 0.12, ao: 0 })
      b.put(0, 0.08, 0.34, (b) => b.box(0.76, 0.46, 0.03, '#10182c', { ao: 0 }))
      for (const sx of [-1, 1]) {
        b.push().at(sx * 0.47, 0.31, 0).rotZ(-sx * (Math.PI / 2))
        b.cyl(0.16, 0.16, 0.1, 12, '#3e6fd0', { top: '#6f95ea', ao: 0 })
        b.pop()
      }
      b.put(0, 0.62, 0, (b) => b.cyl(0.018, 0.018, 0.26, 5, '#8892a6', { ao: 0 }))
      b.put(0, 0.9, 0, (b) => b.sphere(0.075, P.coral, { glow: 0.95, ao: 0 }, 8, 6))
    })
  })
  const headC: [number, number, number] = [x0 - 0.15, CTR_TOP + 0.32 + 0.31, PZ + 0.08]
  k.leds.push({ id: 'robot', pos: [headC[0], headC[1] + 0.08, headC[2] + 0.358], rot: [0, 0, 0], w: 0.72, h: 0.44, texW: 256, texH: 156, fps: 9 })
  bulbGlow(k, headC[0], headC[1] + 0.05, headC[2] + 0.5, 1.8, '#7fe9ff', 0.3)
  bulbGlow(k, headC[0], CTR_TOP + 1.22, headC[2], 0.55, '#ff8a70', 0.6)
  // succulent + notepad on the right
  b.put(1.2, 0, 0.15, (b) => {
    b.cyl(0.22, 0.16, 0.28, 10, P.terracotta, { top: '#eb8c62' })
    b.put(0, 0.3, 0, (b) => b.blob(0.24, P.leaf, { top: P.leafLight }))
    b.put(0.1, 0.42, 0.05, (b) => b.blob(0.14, P.leafLight))
  })
  b.put(0.7, 0, 0.55, (b) => {
    b.rotY(0.3)
    b.box(0.4, 0.03, 0.3, '#fffaf0', { ao: 0 })
    b.put(0.05, 0.03, 0, (b) => b.rotY(0.5).boxC(0.3, 0.01, 0.02, '#8892a6', { ao: 0 }))
  })
  b.pop()
  // lifebuoy hung on the wall behind the counter
  b.push().at(x0 - 1.28, 1.5, Z_WALL + 0.16)
  for (let i = 0; i < 8; i++) b.push().rotZ((i * Math.PI) / 4 + 0.1).torus(0.4, 0.12, i % 2 ? P.cream : P.red, { ao: 0 }, Math.PI / 4 + 0.03, 6, 6).pop()
  b.put(0, 0.54, -0.02, (b) => b.box(0.14, 0.09, 0.06, GOLD))
  b.pop()
}

// ---- 6 · June & Lochan: mugs, glowing heart, reels phone, string lights ----------------------------------------
export function juneProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  const mug = (x: number, z: number, body: string, side: number) => {
    b.put(x, 0, z, (b) => {
      b.cyl(0.27, 0.28, 0.03, 12, '#f1e6d0')
      b.put(0, 0.03, 0, (b) => {
        b.cyl(0.17, 0.15, 0.3, 12, body, { top: lighten(body, 0.3) })
        b.put(0, 0.285, 0, (b) => b.cyl(0.14, 0.14, 0.02, 10, '#5a3a2a', { ao: 0 }))
        b.put(side * 0.16, 0.15, 0, (b) => b.rotZ(side > 0 ? -Math.PI / 2 : Math.PI / 2).torus(0.085, 0.028, body, {}, Math.PI, 6, 8))
      })
    })
  }
  mug(-1.15, 0.28, '#fff3d8', 1)
  mug(-0.68, 0.48, P.red, -1)
  // glowing heart sign
  b.put(-0.1, 0, -0.3, (b) => {
    b.box(0.6, 0.05, 0.26, P.woodDark, { top: P.wood })
    b.put(0, 0.05, 0, (b) => b.cyl(0.03, 0.035, 0.42, 6, P.woodDark))
    b.put(0, 0.98, 0, (b) => b.extrude(heartShape(0.5), 0.15, '#ff5c7c', { glow: 0.95, ao: 0 }, 0.03))
  })
  bulbGlow(k, x0 - 0.1, CTR_TOP + 1.0, PZ - 0.1, 1.9, '#ff6f95', 0.45)
  // phone showing a reels grid
  const pOrigin: [number, number, number] = [x0 + 0.72, CTR_TOP + 0.06, PZ + 0.2]
  b.put(0.72, 0, 0.32, (b) => b.box(0.54, 0.06, 0.38, '#3a2540'))
  b.push().at(0.72, 0.06, 0.2).rotX(-0.3).box(0.48, 0.86, 0.05, '#2a1c3a').pop()
  k.leds.push({ id: 'reels', pos: tiltPt(pOrigin, -0.3, 0.44, 0.03), rot: [-0.3, 0, 0], w: 0.41, h: 0.74, texW: 256, texH: 462, fps: 8 })
  // a tiny plant + coaster cluster
  b.put(1.4, 0, 0.1, (b) => {
    b.cyl(0.18, 0.13, 0.24, 9, '#f1e6d0')
    b.put(0, 0.26, 0, (b) => b.blob(0.22, P.leaf, { top: P.leafLight }))
    b.put(0.05, 0.44, 0, (b) => b.sphere(0.06, P.pink, { glow: 0.2 }, 6, 5))
  })
  b.pop()
  // warm string lights along the awning edge
  const n = 15
  let prev: [number, number, number] | null = null
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = x0 - 1.7 + 3.4 * t
    const y = 3.98 - 0.13 * Math.sin(Math.PI * ((t * 2) % 1))
    const z = -4.9
    if (prev) b.bar(prev, [x, y, z], 0.01, 4, '#3a2a30')
    if (i % 1 === 0) k.bulbs.push([x, y - 0.06, z + 0.02])
    prev = [x, y, z]
  }
}

// ---- 7 · SaaSFlash: director's chair, clapperboard, three monitors, megaphone ---------------------------
function buildClapper() {
  const g = new GeoBuilder(71)
  g.ao = 0
  g.put(0.4, 0, 0, (g) => g.box(0.8, 0.1, 0.06, '#15131f', { ao: 0 }))
  for (let i = 0; i < 5; i++) g.put(0.1 + i * 0.16, 0.05, 0.032, (g) => g.rotZ(0.55).boxC(0.05, 0.16, 0.006, '#f3ead8', { ao: 0 }))
  return g.build()
}

export function saasProp(k: Ctx, x0: number, ch: Chapter, dirLabel: Rect, quadB: Ctx['quadB']) {
  const { b } = k
  // director's chair, behind the counter
  b.push().at(x0 - 1.15, FL, -7.25)
  for (const z of [-0.26, 0.26]) {
    b.bar([-0.3, 0.02, z], [0.3, 0.78, z], 0.035, 5, P.wood)
    b.bar([0.3, 0.02, z], [-0.3, 0.78, z], 0.035, 5, P.wood)
  }
  b.put(0, 0.78, 0, (b) => b.box(0.68, 0.05, 0.6, ch.color, { top: lighten(ch.color, 0.25) }))
  for (const x of [-0.33, 0.33]) {
    b.bar([x, 0.84, -0.28], [x, 0.84, 0.28], 0.03, 5, P.wood)
    b.put(x, 0.8, -0.28, (b) => b.cyl(0.03, 0.03, 0.9, 6, P.wood))
    b.put(x, 0.8, 0.24, (b) => b.cyl(0.03, 0.03, 0.5, 6, P.wood))
    b.bar([x, 1.3, -0.28], [x, 1.3, 0.24], 0.034, 5, P.wood)
  }
  b.put(0, 1.06, -0.27, (b) => b.box(0.62, 0.36, 0.03, ch.color, { top: lighten(ch.color, 0.2), ao: 0 }))
  b.pop()
  quadB({ x: x0 - 1.15, y: FL + 1.24, z: -7.25 - 0.27 + 0.02 }, 0.56, 0.14, dirLabel)

  b.push().at(x0, CTR_TOP, PZ)
  // clapperboard
  const bo: [number, number, number] = [x0 - 0.98, CTR_TOP, PZ + 0.32]
  b.push().at(-0.98, 0, 0.32).rotX(-0.2)
  b.box(0.8, 0.5, 0.05, '#15131f', { ao: 0 })
  for (let i = 0; i < 3; i++) b.put(0, 0.13 + i * 0.12, 0.03, (b) => b.boxC(0.62, 0.02, 0.01, '#f3ead8', { ao: 0 }))
  for (let i = 0; i < 3; i++) b.put(-0.26 + i * 0.26, 0.05, 0.03, (b) => b.boxC(0.1, 0.06, 0.01, [P.marigold, P.coral, P.teal][i], { ao: 0 }))
  b.put(0, 0.5, 0, (b) => b.box(0.8, 0.09, 0.06, '#15131f', { ao: 0 }))
  for (let i = 0; i < 5; i++) b.put(-0.3 + i * 0.16, 0.545, 0.033, (b) => b.rotZ(-0.55).boxC(0.05, 0.13, 0.006, '#f3ead8', { ao: 0 }))
  b.pop()
  k.anims.push({ id: 'clap', geo: buildClapper(), pos: tiltPt([bo[0] - 0.4, bo[1], bo[2]], -0.2, 0.6, 0.0), rot: [-0.2, 0, 0] })
  // small megaphone
  b.put(-0.45, 0, 0.5, (b) => megaphone(b, ch.color, '#fff3d8', 0.5))
  // three little monitors on a shared stand
  const mo: [number, number, number] = [x0 + 1.0, CTR_TOP + 0.16, PZ + 0.1]
  b.put(1.0, 0, 0.1, (b) => {
    b.box(1.62, 0.05, 0.34, '#2b2438')
    for (const x of [-0.48, 0.48]) b.put(x, 0.05, -0.02, (b) => b.cyl(0.05, 0.07, 0.11, 8, '#3a3450'))
  })
  b.push().at(1.0, 0.16, 0.1).rotX(-0.2).box(1.62, 0.5, 0.05, '#0d0b18').pop()
  k.leds.push({ id: 'monitors', pos: tiltPt(mo, -0.2, 0.26, 0.031), rot: [-0.2, 0, 0], w: 1.58, h: 0.46, texW: 768, texH: 224, fps: 8 })
  b.pop()
}

// ---- 8 · Social Capital: closed briefcase + glowing "?" lamp ----------------------------------------------------
export function socialProp(k: Ctx, x0: number, ch: Chapter) {
  const { b } = k
  b.push().at(x0, CTR_TOP, PZ)
  // briefcase
  b.put(-0.5, 0, 0.12, (b) => {
    b.rotY(0.12)
    const leather = '#8a4a2c'
    b.box(1.04, 0.68, 0.32, leather, { top: '#a85d38' })
    b.put(0, 0.43, 0.001, (b) => b.box(1.05, 0.025, 0.325, '#4a2616', { ao: 0 }))
    b.put(0, 0.68, 0, (b) => b.torus(0.17, 0.03, '#4a2616', {}, Math.PI, 6, 12))
    for (const sx of [-1, 1]) {
      b.put(sx * 0.3, 0.44, 0.165, (b) => {
        b.boxC(0.15, 0.16, 0.035, GOLD, { ao: 0 })
        b.put(0, -0.02, 0.02, (b) => b.boxC(0.05, 0.06, 0.012, P.ink, { ao: 0 }))
      })
      for (const sy of [0.04, 0.64]) b.put(sx * 0.5, sy, 0.16, (b) => b.boxC(0.07, 0.07, 0.04, GOLD, { ao: 0 }))
    }
    b.put(0, 0.42, 0.166, (b) => b.boxC(0.1, 0.1, 0.03, GOLD_HI, { ao: 0 }))
  })
  // glowing question-mark lamp
  b.put(0.85, 0, 0.0, (b) => {
    b.cyl(0.3, 0.34, 0.08, 14, ch.color, { top: lighten(ch.color, 0.25) })
    b.put(0, 0.08, 0, (b) => b.cyl(0.03, 0.03, 0.34, 6, P.ink))
    const y0 = 0.98
    b.put(0, y0, 0, (b) => {
      b.push().rotZ(-Math.PI / 3)
      b.torus(0.25, 0.058, '#ffd98a', { glow: 1, ao: 0 }, (4 * Math.PI) / 3, 8, 22)
      b.pop()
      b.bar([0.125, -0.216, 0], [0.0, -0.4, 0], 0.056, 6, '#ffd98a', { glow: 1, ao: 0 })
      b.put(0, -0.6, 0, (b) => b.sphere(0.075, '#ffd98a', { glow: 1, ao: 0 }, 10, 8))
    })
  })
  bulbGlow(k, x0 + 0.85, CTR_TOP + 1.0, PZ + 0.1, 2.0, '#ffd27a', 0.5)
  b.pop()
}
