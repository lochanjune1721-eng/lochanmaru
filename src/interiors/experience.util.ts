// EXPERIENCE interior ("Main Street") — shared constants, colour helpers and a tiny textured-quad batcher.
import { BufferGeometry, Color, Euler, Float32BufferAttribute, Matrix4, Quaternion, Vector3 } from 'three'

// ---- room dimensions (interior-local coordinates, floor near y = 0, entry at +z) ----------------------
export const W = 38
export const D = 18
/** top of the floor slab made by parts.room() */
export const FL = 0.06
/** stalls sit on the back wall, one every PITCH units */
export const PITCH = 4
export const Z_WALL = -D / 2
/** front line of the stalls: awning bar + lantern posts */
export const Z_FRONT = -4.95
/** counter centre / top */
export const Z_CTR = -5.75
export const CTR_TOP = 1.12
/** hero props are built around this depth on the counter top */
export const PZ = -5.7

export const stallX = (i: number, n: number) => (i - (n - 1) / 2) * PITCH

// ---- colours ------------------------------------------------------------------------------------------
const _a = new Color()
const _b = new Color()
/** mix two hex colours (in the renderer's working space) */
export const mix = (a: string, b: string, t: number) => '#' + _a.set(a).lerp(_b.set(b), t).getHexString()
export const lighten = (c: string, t: number) => mix(c, '#fff6e6', t)
export const darken = (c: string, t: number) => mix(c, '#2a1c3a', t)

// ---- matrices -----------------------------------------------------------------------------------------
const _q = new Quaternion()
const _e = new Euler()
const _p = new Vector3()
const _s = new Vector3(1, 1, 1)
/** position + XYZ-euler rotation (+ optional uniform scale) */
export function xf(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, s = 1) {
  _e.set(rx, ry, rz, 'XYZ')
  _q.setFromEuler(_e)
  _p.set(x, y, z)
  _s.set(s, s, s)
  return new Matrix4().compose(_p, _q, _s)
}
/** a point (0, py, pz) of a frame that is tilted about X by `a` and sits at `o` */
export const tiltPt = (o: [number, number, number], a: number, py: number, pz: number, px = 0): [number, number, number] => [
  o[0] + px,
  o[1] + py * Math.cos(a) - pz * Math.sin(a),
  o[2] + py * Math.sin(a) + pz * Math.cos(a),
]

// ---- textured quads (one draw call for every painted board that shares an atlas) ------------------------
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export class TexBatch {
  private pos: number[] = []
  private nor: number[] = []
  private uv: number[] = []
  private idx: number[] = []
  constructor(private aw: number, private ah: number) {}

  private uvOf(r: Rect, u: number, v: number): [number, number] {
    // u,v in 0..1 across the rect, v = 0 at the bottom of the painted rectangle
    return [(r.x + u * r.w) / this.aw, 1 - (r.y + (1 - v) * r.h) / this.ah]
  }

  /** w x h rectangle centred on the matrix origin, facing local +z */
  quad(m: Matrix4, w: number, h: number, r: Rect) {
    const n = new Vector3(0, 0, 1).transformDirection(m)
    const base = this.pos.length / 3
    const corners: [number, number, number, number][] = [
      [-w / 2, -h / 2, 0, 0],
      [w / 2, -h / 2, 1, 0],
      [w / 2, h / 2, 1, 1],
      [-w / 2, h / 2, 0, 1],
    ]
    for (const [x, y, u, v] of corners) {
      const p = new Vector3(x, y, 0).applyMatrix4(m)
      this.pos.push(p.x, p.y, p.z)
      this.nor.push(n.x, n.y, n.z)
      const t = this.uvOf(r, u, v)
      this.uv.push(t[0], t[1])
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }

  /** any planar geometry (facing +z) whose x/y extent maps onto the rect */
  shape(g: BufferGeometry, m: Matrix4, r: Rect) {
    g.computeBoundingBox()
    const bb = g.boundingBox!
    const sx = bb.max.x - bb.min.x
    const sy = bb.max.y - bb.min.y
    const p = g.attributes.position
    const base = this.pos.length / 3
    const n = new Vector3(0, 0, 1).transformDirection(m)
    for (let i = 0; i < p.count; i++) {
      const v = new Vector3(p.getX(i), p.getY(i), p.getZ(i))
      const u0 = (v.x - bb.min.x) / sx
      const v0 = (v.y - bb.min.y) / sy
      v.applyMatrix4(m)
      this.pos.push(v.x, v.y, v.z)
      this.nor.push(n.x, n.y, n.z)
      const t = this.uvOf(r, u0, v0)
      this.uv.push(t[0], t[1])
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.idx.push(base + g.index.getX(i))
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i)
  }

  build() {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3))
    g.setAttribute('uv', new Float32BufferAttribute(this.uv, 2))
    g.setIndex(this.idx)
    g.computeBoundingSphere()
    return g
  }
}
