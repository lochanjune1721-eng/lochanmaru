// Geometry for every plant and rock in the world. Chunky, faceted, wind-swayed, sharing one palette.
import { BufferGeometry } from 'three'
import { GeoBuilder } from '../gfx/geo'
import { P } from '../gfx/palette'

const cache = new Map<string, BufferGeometry>()
const memo = (k: string, f: () => BufferGeometry) => {
  let g = cache.get(k)
  if (!g) cache.set(k, (g = f()))
  return g
}

export const floraGeo = {
  roundTree: () =>
    memo('round', () => {
      const b = new GeoBuilder(101)
      b.swayHeight = 4.6
      b.aoHeight = 1.4
      b.cyl(0.2, 0.34, 2.1, 7, P.wood, { tint: 0.06 })
      b.push().at(0, 2.6, 0).blob(1.62, P.leaf, { sway: 1, top: P.leafLight, tint: 0.05 }).pop()
      b.push().at(0.95, 2.35, 0.3).blob(1.15, P.leafLight, { sway: 1, tint: 0.05 }).pop()
      b.push().at(-0.85, 2.45, -0.45).blob(1.2, P.leaf, { sway: 1, tint: 0.05 }).pop()
      b.push().at(0.1, 3.7, 0.1).blob(1.0, P.leafLight, { sway: 1, top: '#d4e58a' }).pop()
      b.push().at(-0.1, 1.9, 0.75).blob(0.8, P.leafDark, { sway: 1 }).pop()
      return b.build()
    }),
  blossomTree: () =>
    memo('blossom', () => {
      const b = new GeoBuilder(102)
      b.swayHeight = 4.4
      b.aoHeight = 1.4
      b.cyl(0.18, 0.3, 2.0, 7, '#8b5b4a')
      b.push().at(0, 2.55, 0).blob(1.55, P.pink, { sway: 1, top: '#f9b4c9', tint: 0.04 }).pop()
      b.push().at(0.95, 2.3, 0.2).blob(1.1, P.blush, { sway: 1, tint: 0.04 }).pop()
      b.push().at(-0.85, 2.45, -0.4).blob(1.15, '#f6a3bd', { sway: 1, tint: 0.04 }).pop()
      b.push().at(0.05, 3.55, 0.1).blob(0.95, '#fbc9d6', { sway: 1 }).pop()
      return b.build()
    }),
  cypress: () =>
    memo('cypress', () => {
      const b = new GeoBuilder(103)
      b.swayHeight = 6
      b.aoHeight = 1.3
      b.cyl(0.16, 0.26, 1.0, 6, P.woodDark)
      b.push().at(0, 0.8, 0).cone(1.15, 2.6, 7, P.leafDark, { sway: 0.6, flat: true, tint: 0.05 }).pop()
      b.push().at(0, 2.3, 0).cone(0.95, 2.4, 7, P.leaf, { sway: 0.8, flat: true }).pop()
      b.push().at(0, 3.7, 0).cone(0.7, 2.2, 7, P.leafDark, { sway: 1, flat: true, top: P.leaf }).pop()
      b.push().at(0, 4.9, 0).cone(0.4, 1.4, 6, P.leaf, { sway: 1, flat: true }).pop()
      return b.build()
    }),
  palm: () =>
    memo('palm', () => {
      const b = new GeoBuilder(104)
      b.swayHeight = 6.2
      b.aoHeight = 1.5
      // curved trunk
      let x = 0
      let y = 0
      let a = 0.06
      for (let i = 0; i < 6; i++) {
        b.push().at(x, y, 0).rotZ(-a).cyl(0.17 - i * 0.008, 0.2 - i * 0.008, 0.95, 6, i % 2 ? '#a5765a' : '#946650', { sway: i > 3 ? 0.4 : 0 }).pop()
        x += Math.sin(a) * 0.95
        y += Math.cos(a) * 0.95
        a += 0.075
      }
      // fronds
      const top = { x, y }
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2
        b.push()
          .at(top.x, top.y, 0)
          .rotY(ang)
          .rotZ(-1.15 - (i % 2) * 0.2)
          .scale(1, 1, 0.28)
          .cone(0.55, 2.7, 5, i % 2 ? P.leaf : '#7fb865', { sway: 1, flat: true, top: P.leafDark })
          .pop()
      }
      b.push().at(top.x + 0.15, top.y - 0.25, 0.1).sphere(0.17, '#7b5236', { sway: 0.5 }, 6, 5).pop()
      b.push().at(top.x - 0.12, top.y - 0.3, -0.1).sphere(0.15, '#7b5236', { sway: 0.5 }, 6, 5).pop()
      return b.build()
    }),
  acacia: () =>
    memo('acacia', () => {
      const b = new GeoBuilder(105)
      b.swayHeight = 5
      b.aoHeight = 1.4
      b.push().rotZ(0.1).cyl(0.14, 0.24, 2.0, 6, '#8a6046').pop()
      b.push().at(0.2, 1.95, 0).rotZ(-0.35).cyl(0.1, 0.14, 1.3, 6, '#8a6046').pop()
      b.push().at(-0.05, 2.0, 0).rotZ(0.55).cyl(0.09, 0.13, 1.1, 6, '#8a6046').pop()
      b.push().at(0.65, 3.15, 0).scale(1, 0.34, 1).blob(2.0, '#8dbd63', { sway: 1, top: '#b4d77a', tint: 0.05 }).pop()
      b.push().at(-0.75, 2.95, 0.2).scale(1, 0.34, 1).blob(1.5, '#7fb262', { sway: 1 }).pop()
      return b.build()
    }),
  cactus: () =>
    memo('cactus', () => {
      const b = new GeoBuilder(106)
      b.swayHeight = 20
      b.aoHeight = 1
      const g = '#69a882'
      const g2 = '#7dbb93'
      b.cyl(0.3, 0.34, 2.1, 8, g, { top: g2 })
      b.push().at(0, 2.1, 0).sphere(0.3, g2, {}, 8, 5).pop()
      b.push().at(0.32, 0.9, 0).rotZ(Math.PI / 2).cyl(0.17, 0.17, 0.5, 7, g).pop()
      b.push().at(0.8, 0.9, 0).cyl(0.17, 0.17, 0.95, 7, g, { top: g2 }).pop()
      b.push().at(0.8, 1.85, 0).sphere(0.17, g2, {}, 7, 5).pop()
      b.push().at(-0.32, 1.25, 0).rotZ(-Math.PI / 2).cyl(0.15, 0.15, 0.45, 7, g).pop()
      b.push().at(-0.72, 1.25, 0).cyl(0.15, 0.15, 0.7, 7, g, { top: g2 }).pop()
      b.push().at(-0.72, 1.95, 0).sphere(0.15, g2, {}, 7, 5).pop()
      b.push().at(0.05, 2.38, 0.05).sphere(0.1, P.pink, {}, 6, 5).pop()
      return b.build()
    }),
  bush: () =>
    memo('bush', () => {
      const b = new GeoBuilder(107)
      b.swayHeight = 1.6
      b.aoHeight = 0.8
      b.push().at(0, 0.5, 0).blob(0.75, P.leaf, { sway: 0.7, top: P.leafLight, tint: 0.06 }).pop()
      b.push().at(0.6, 0.38, 0.2).blob(0.55, P.leafLight, { sway: 0.7 }).pop()
      b.push().at(-0.55, 0.4, -0.15).blob(0.58, P.leafDark, { sway: 0.7 }).pop()
      return b.build()
    }),
  flowerBush: () =>
    memo('flowerBush', () => {
      const b = new GeoBuilder(108)
      b.swayHeight = 1.6
      b.aoHeight = 0.8
      b.push().at(0, 0.45, 0).blob(0.7, P.leaf, { sway: 0.7 }).pop()
      b.push().at(0.5, 0.36, 0.2).blob(0.5, P.leafLight, { sway: 0.7 }).pop()
      for (const [x, y, z, c] of [
        [0.1, 0.92, 0.3, P.pink],
        [-0.3, 0.78, 0.4, P.marigold],
        [0.45, 0.72, -0.15, P.coral],
        [-0.15, 0.95, -0.2, P.cream],
        [0.7, 0.55, 0.45, P.lilac],
      ] as const) {
        b.push().at(x, y, z).sphere(0.13, c, { sway: 0.8, glow: 0.05 }, 6, 5).pop()
      }
      return b.build()
    }),
  rock: () =>
    memo('rock', () => {
      const b = new GeoBuilder(109)
      b.aoHeight = 0.9
      b.push().at(0, 0.32, 0).scale(1.2, 0.72, 1).blob(0.7, P.stone, { top: '#e0d0bf', tint: 0.05, jitter: 0.16 }).pop()
      b.push().at(0.65, 0.2, 0.2).scale(1, 0.7, 1).blob(0.38, P.stoneDark, { jitter: 0.1 }).pop()
      return b.build()
    }),
  pebbles: () =>
    memo('pebbles', () => {
      const b = new GeoBuilder(110)
      b.aoHeight = 0.4
      b.push().at(0, 0.09, 0).scale(1.2, 0.6, 1).blob(0.16, '#d9c7ae', { jitter: 0.03 }, 0).pop()
      b.push().at(0.26, 0.07, 0.1).scale(1.1, 0.6, 1).blob(0.11, '#c9b598', { jitter: 0.02 }, 0).pop()
      b.push().at(-0.18, 0.06, 0.2).scale(1, 0.6, 1).blob(0.1, '#e3d3ba', { jitter: 0.02 }, 0).pop()
      return b.build()
    }),
  tuft: () =>
    memo('tuft', () => {
      const b = new GeoBuilder(111)
      b.swayHeight = 0.6
      b.ao = 0.3
      b.aoHeight = 0.4
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + i * 0.4
        b.push()
          .rotY(a)
          .at(0.06, 0, 0)
          .rotZ(-0.32 - (i % 3) * 0.12)
          .scale(1, 1, 0.5)
          .cone(0.06, 0.55 + (i % 2) * 0.22, 3, i % 2 ? '#58b97b' : '#4aa870', { sway: 1, top: '#b6ea8f' })
          .pop()
      }
      return b.build()
    }),
  flower: () =>
    memo('flower', () => {
      const b = new GeoBuilder(112)
      b.swayHeight = 0.5
      b.ao = 0.2
      b.aoHeight = 0.3
      b.cyl(0.012, 0.016, 0.3, 4, '#6fa55b', { sway: 0.6 })
      b.push().at(0, 0.34, 0).sphere(0.075, '#ffffff', { sway: 1, glow: 0.05 }, 6, 4).pop()
      b.push().at(0, 0.34, 0.05).sphere(0.03, '#f7c04a', { sway: 1 }, 5, 4).pop()
      return b.build()
    }),
  reed: () =>
    memo('reed', () => {
      const b = new GeoBuilder(113)
      b.swayHeight = 1.4
      b.ao = 0.2
      for (let i = 0; i < 4; i++) {
        b.push()
          .at((i - 1.5) * 0.06, 0, (i % 2) * 0.05)
          .rotZ((i - 1.5) * 0.08)
          .cyl(0.014, 0.02, 1.1 + i * 0.15, 4, '#7ea866', { sway: 1 })
          .pop()
        b.push()
          .at((i - 1.5) * 0.06 + (i - 1.5) * 0.08 * 0.5, 1.05 + i * 0.15, (i % 2) * 0.05)
          .cyl(0.045, 0.045, 0.24, 5, '#8a5a3c', { sway: 1 })
          .pop()
      }
      return b.build()
    }),
  lily: () =>
    memo('lily', () => {
      const b = new GeoBuilder(114)
      b.ao = 0
      b.push().scale(1, 0.4, 1).disc(0.5, '#6fb46e').pop()
      b.push().at(0.12, 0.05, 0.05).sphere(0.11, P.pink, {}, 6, 4).pop()
      return b.build()
    }),
}
