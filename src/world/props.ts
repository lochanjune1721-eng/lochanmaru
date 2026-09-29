// Small furnishings, all built with the same builder + palette. Each helper appends to a GeoBuilder
// (so a whole forecourt or street becomes one draw call) and reports where glow halos should sit.
import { GeoBuilder } from '../gfx/geo'
import { P } from '../gfx/palette'

export type V3 = [number, number, number]

/** A lamp post with a warm lantern. Returns the halo position (builder space). */
export function addLamp(b: GeoBuilder, x: number, z: number, rot = 0, height = 3.4): V3 {
  b.stand(x, z).rotY(rot)
  b.cyl(0.24, 0.3, 0.36, 8, P.ink)
  b.put(0, 0.36, 0, (b) => b.cyl(0.075, 0.1, height - 0.7, 6, '#3a3049'))
  b.put(0, height - 0.5, 0, (b) => b.cyl(0.14, 0.09, 0.14, 8, P.ink))
  b.put(0, height - 0.36, 0, (b) => b.box(0.44, 0.64, 0.44, P.marigold, { glow: 0.95, ao: 0 }))
  b.put(0, height - 0.38, 0, (b) => b.box(0.5, 0.06, 0.5, P.ink, { ao: 0 }))
  b.put(0, height + 0.26, 0, (b) => b.box(0.5, 0.06, 0.5, P.ink, { ao: 0 }))
  b.put(0, height + 0.3, 0, (b) => b.cone(0.44, 0.42, 4, P.terracotta))
  b.put(0, height + 0.7, 0, (b) => b.sphere(0.07, P.gold, {}, 5, 4))
  b.pop()
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  void c
  void s
  return [x, height - 0.05, z]
}

export function addBench(b: GeoBuilder, x: number, z: number, rot = 0, color: string = P.wood) {
  b.stand(x, z).rotY(rot)
  b.put(0, 0.46, 0, (b) => b.box(2.0, 0.12, 0.62, color, { tint: 0.04 }))
  b.put(0, 0.9, -0.3, (b) => b.rotX(-0.12).box(2.0, 0.5, 0.09, color))
  for (const sx of [-0.85, 0.85]) {
    b.put(sx, 0, -0.18, (b) => b.box(0.11, 0.48, 0.09, P.ink))
    b.put(sx, 0, 0.2, (b) => b.box(0.11, 0.48, 0.09, P.ink))
    b.put(sx, 0.4, 0, (b) => b.box(0.1, 0.09, 0.66, P.ink))
    b.put(sx, 0.62, -0.28, (b) => b.box(0.1, 0.7, 0.08, P.ink))
  }
  b.pop()
}

export function addPlanter(b: GeoBuilder, x: number, z: number, s = 1, bloom: string = P.pink) {
  b.stand(x, z).scale(s)
  b.cyl(0.5, 0.38, 0.72, 10, P.terracotta, { top: '#e98a62' })
  b.put(0, 0.68, 0, (b) => b.cyl(0.56, 0.5, 0.16, 10, P.terracottaDeep))
  b.put(0, 1.05, 0, (b) => b.blob(0.6, P.leaf, { top: P.leafLight, tint: 0.05 }))
  b.put(0.28, 1.22, 0.15, (b) => b.blob(0.32, P.leafLight))
  for (const [px, py, pz] of [
    [0.05, 1.55, 0.3],
    [-0.3, 1.32, 0.3],
    [0.35, 1.45, -0.1],
    [-0.1, 1.62, -0.25],
  ] as V3[]) {
    b.put(px, py, pz, (b) => b.sphere(0.13, bloom, { glow: 0.05 }, 6, 5))
  }
  b.pop()
}

export function addRug(b: GeoBuilder, x: number, z: number, r: number, colors: [string, string, string]) {
  b.stand(x, z).at(0, 0.05, 0)
  b.disc(r, colors[0], { ao: 0 }, 32)
  b.put(0, 0.012, 0, (b) => b.disc(r * 0.82, colors[1], { ao: 0 }, 32))
  b.put(0, 0.024, 0, (b) => b.disc(r * 0.6, colors[0], { ao: 0 }, 32))
  b.put(0, 0.036, 0, (b) => b.disc(r * 0.34, colors[2], { ao: 0 }, 32))
  b.pop()
}

export function addMailbox(b: GeoBuilder, x: number, z: number, rot = 0, color: string = P.red) {
  b.stand(x, z).rotY(rot)
  b.cyl(0.07, 0.09, 1.3, 6, P.woodDark)
  b.put(0, 1.15, 0, (b) => b.box(0.62, 0.5, 0.95, color))
  b.put(0, 1.4, 0, (b) => b.rotX(0).cyl(0.31, 0.31, 0.95, 10, color, {}))
  b.put(0.3, 1.2, 0.2, (b) => b.box(0.05, 0.4, 0.05, P.marigold))
  b.put(0.3, 1.55, 0.2, (b) => b.box(0.05, 0.22, 0.16, P.marigold))
  b.pop()
}

export function addCrate(b: GeoBuilder, x: number, z: number, rot = 0, s = 1) {
  b.stand(x, z).rotY(rot).scale(s)
  b.box(0.9, 0.8, 0.9, '#c98d5e', { tint: 0.05 })
  b.put(0, 0.05, 0.46, (b) => b.box(0.9, 0.12, 0.03, P.woodDark))
  b.put(0, 0.62, 0.46, (b) => b.box(0.9, 0.12, 0.03, P.woodDark))
  b.pop()
}

export function addBarrel(b: GeoBuilder, x: number, z: number, s = 1) {
  b.stand(x, z).scale(s)
  b.cyl(0.42, 0.34, 0.95, 10, '#b57448')
  b.put(0, 0.2, 0, (b) => b.cyl(0.44, 0.44, 0.06, 10, P.ink))
  b.put(0, 0.7, 0, (b) => b.cyl(0.44, 0.44, 0.06, 10, P.ink))
  b.pop()
}

/** A wooden signpost with 1-3 arrow boards. Boards are plain colour; text lives on separate sign planes. */
export function addSignpost(b: GeoBuilder, x: number, z: number, rot = 0, boards = 2) {
  b.stand(x, z).rotY(rot)
  b.cyl(0.11, 0.14, 3.0, 7, P.woodDark)
  for (let i = 0; i < boards; i++) {
    b.push().at(0, 2.5 - i * 0.62, 0).rotY(i % 2 ? 0.28 : -0.28)
    b.put(0.5, 0, 0, (b) => b.boxC(1.5, 0.46, 0.09, P.wood))
    b.put(1.28, 0, 0, (b) => b.rotZ(Math.PI / 4).boxC(0.33, 0.33, 0.09, P.wood))
    b.pop()
  }
  b.put(0, 3.0, 0, (b) => b.sphere(0.13, P.gold, {}, 6, 5))
  b.pop()
}
