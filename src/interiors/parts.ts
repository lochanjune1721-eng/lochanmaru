// Furniture + architecture for interiors, as GeoBuilder helpers (interior-local coordinates, floor at y = 0).
import { GeoBuilder } from '../gfx/geo'
import { P } from '../gfx/palette'

export interface RoomOpts {
  w: number
  d: number
  wallH?: number
  floorTop: string
  floorSide?: string
  wall: string
  wallTop?: string
  trim: string
  /** height of the side walls (they stay low so the camera can see over them) */
  sideH?: number
}

/** A floating slab of floor with a tall back wall and low side walls: a cut-away diorama. */
export function room(b: GeoBuilder, o: RoomOpts) {
  const { w, d } = o
  const H = o.wallH ?? 6
  const sideH = o.sideH ?? 1.5
  // slab
  b.put(0, -1.6, 0, (b) => b.box(w + 1.2, 1.6, d + 1.2, o.floorSide ?? '#9a7660'))
  b.put(0, -0.06, 0, (b) => b.box(w, 0.12, d, o.floorTop, { ao: 0 }))
  b.put(0, -3.4, 0, (b) => b.box(w - 2, 1.9, d - 2, '#6a5570', { ao: 0 }))
  // back wall + trim
  b.put(0, 0, -d / 2 - 0.35, (b) => b.box(w + 1.4, H, 0.7, o.wall, { top: o.wallTop ?? o.wall }))
  b.put(0, 0, -d / 2 + 0.04, (b) => b.box(w, 0.42, 0.14, o.trim, { ao: 0 }))
  b.put(0, H - 0.1, -d / 2 - 0.35, (b) => b.box(w + 1.6, 0.34, 0.9, o.trim))
  // low side walls
  for (const sx of [-1, 1]) {
    b.put(sx * (w / 2 + 0.35), 0, 0, (b) => b.box(0.7, sideH, d + 1.4, o.wall, { top: o.wallTop ?? o.wall }))
    b.put(sx * (w / 2 + 0.35), sideH, 0, (b) => b.box(0.9, 0.22, d + 1.6, o.trim))
  }
  // front lip
  b.put(0, 0, d / 2 + 0.35, (b) => b.box(w + 1.4, 0.35, 0.7, o.trim))
}

export function desk(b: GeoBuilder, x: number, z: number, rot = 0, top = P.wood) {
  b.push().at(x, 0, z).rotY(rot)
  b.put(0, 1.1, 0, (b) => b.box(3.4, 0.14, 1.5, top, { tint: 0.03 }))
  for (const sx of [-1.5, 1.5]) for (const sz of [-0.6, 0.6]) b.put(sx, 0, sz, (b) => b.box(0.14, 1.1, 0.14, P.woodDark))
  b.put(1.0, 0.25, 0, (b) => b.box(1.1, 0.8, 1.3, P.woodDark))
  b.pop()
}

export function chair(b: GeoBuilder, x: number, z: number, rot = 0, color: string = P.terracotta) {
  b.push().at(x, 0, z).rotY(rot)
  b.put(0, 0.7, 0, (b) => b.box(0.9, 0.14, 0.9, color))
  b.put(0, 0.7, -0.4, (b) => b.box(0.9, 1.0, 0.12, color))
  for (const sx of [-0.35, 0.35]) for (const sz of [-0.35, 0.35]) b.put(sx, 0, sz, (b) => b.box(0.09, 0.7, 0.09, P.ink))
  b.pop()
}

export function plant(b: GeoBuilder, x: number, z: number, s = 1, bloom?: string) {
  b.push().at(x, 0, z).scale(s)
  b.cyl(0.42, 0.32, 0.6, 9, P.terracotta, { top: '#e98a62' })
  b.put(0, 0.6, 0, (b) => b.cyl(0.46, 0.42, 0.12, 9, P.terracottaDeep))
  b.put(0, 1.05, 0, (b) => b.blob(0.55, P.leaf, { top: P.leafLight }))
  b.put(0.3, 1.3, 0.1, (b) => b.blob(0.35, P.leafLight))
  b.put(-0.25, 1.25, -0.1, (b) => b.blob(0.32, P.leafDark))
  if (bloom) b.put(0.05, 1.7, 0.2, (b) => b.sphere(0.14, bloom, { glow: 0.1 }, 6, 5))
  b.pop()
}

export function lamp(b: GeoBuilder, x: number, z: number, h = 2.6) {
  b.push().at(x, 0, z)
  b.cyl(0.3, 0.34, 0.14, 8, P.ink)
  b.put(0, 0.14, 0, (b) => b.cyl(0.05, 0.05, h, 5, P.ink))
  b.put(0, h, 0, (b) => b.cyl(0.42, 0.28, 0.5, 8, P.marigold, { glow: 0.8, ao: 0 }))
  b.pop()
  return [x, h + 0.2, z] as [number, number, number]
}

export function bookshelf(b: GeoBuilder, x: number, z: number, rot: number, w = 3.2, h = 4.2, seed = 1) {
  b.push().at(x, 0, z).rotY(rot)
  b.put(0, 0, 0, (b) => b.box(w, h, 0.9, P.woodDark))
  b.put(0, 0.12, 0.08, (b) => b.box(w - 0.24, h - 0.24, 0.8, '#3a2a30', { ao: 0 }))
  const cols = [P.terracotta, P.teal, P.marigold, P.indigo, P.coral, P.cream, P.leaf, P.pink]
  const rows = Math.floor(h / 1.0)
  let s = seed
  for (let r = 0; r < rows; r++) {
    b.put(0, 0.42 + r * 1.0 + 0.55, 0.2, (b) => b.box(w - 0.2, 0.08, 0.7, P.wood))
    let cx = -w / 2 + 0.3
    while (cx < w / 2 - 0.4) {
      s = (s * 9301 + 49297) % 233280
      const bw = 0.16 + (s / 233280) * 0.16
      const bh = 0.5 + ((s * 7) % 100) / 100 * 0.32
      b.put(cx + bw / 2, 0.5 + r * 1.0, 0.3, (b) => b.box(bw, bh, 0.5, cols[s % cols.length], { ao: 0.1 }))
      cx += bw + 0.02
    }
  }
  b.pop()
}

export function rug(b: GeoBuilder, x: number, z: number, w: number, d: number, c1: string, c2: string, c3?: string) {
  b.push().at(x, 0.02, z)
  b.box(w, 0.05, d, c1, { ao: 0 })
  b.put(0, 0.05, 0, (b) => b.box(w - 0.5, 0.03, d - 0.5, c2, { ao: 0 }))
  if (c3) b.put(0, 0.08, 0, (b) => b.box(w - 1.3, 0.03, d - 1.3, c3, { ao: 0 }))
  b.pop()
}

export function cat(b: GeoBuilder, x: number, z: number, rot = 0, color = '#3a3350') {
  b.push().at(x, 0, z).rotY(rot)
  b.put(0, 0.25, 0, (b) => b.scale(1.4, 0.7, 0.9).sphere(0.42, color, { flat: true }, 8, 6))
  b.put(0.5, 0.35, 0.05, (b) => b.sphere(0.24, color, {}, 8, 6))
  b.put(0.55, 0.62, -0.06, (b) => b.cone(0.08, 0.16, 4, color))
  b.put(0.55, 0.62, 0.16, (b) => b.cone(0.08, 0.16, 4, color))
  b.put(-0.55, 0.18, 0.3, (b) => b.rotZ(0.6).cyl(0.06, 0.06, 0.6, 5, color))
  b.pop()
}

export function pedestal(b: GeoBuilder, x: number, z: number, h = 1.1, r = 0.7, color: string = P.cream) {
  b.push().at(x, 0, z)
  b.cyl(r, r + 0.08, h, 14, color, { top: '#fff4de' })
  b.put(0, h, 0, (b) => b.cyl(r + 0.1, r + 0.1, 0.1, 14, P.gold))
  b.pop()
}
