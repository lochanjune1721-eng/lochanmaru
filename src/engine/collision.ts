// Tiny 2D collision layer. Static colliders live in a local tangent frame (on the planet) or
// directly in the XZ plane (interiors). Circles + oriented boxes, sliding resolution.
import { Vector3 } from 'three'
import { R } from './planet'

export interface Collider {
  kind: 'circle' | 'box'
  /** world-space centre (unit vector for the planet, absolute position for interiors) */
  c: Vector3
  /** local tangent axes */
  ex: Vector3
  ez: Vector3
  hx: number
  hz: number
  r: number
  /** height, used by the camera to decide whether a wall occludes it */
  h: number
  /** coarse rejection: cosine of the angular reach (planet) */
  cosReach: number
  /** squared planar reach (interiors) */
  reach2: number
  solid: boolean
}

export class ColliderSet {
  list: Collider[] = []
  constructor(readonly planet: boolean) {}

  circle(c: Vector3, ex: Vector3, ez: Vector3, r: number, h = 3) {
    const col: Collider = {
      kind: 'circle',
      c: c.clone(),
      ex: ex.clone(),
      ez: ez.clone(),
      hx: r,
      hz: r,
      r,
      h,
      cosReach: Math.cos((r + 2.5) / R),
      reach2: (r + 2.5) * (r + 2.5),
      solid: true,
    }
    this.list.push(col)
    return col
  }

  box(c: Vector3, ex: Vector3, ez: Vector3, hx: number, hz: number, h = 4) {
    const reach = Math.hypot(hx, hz) + 2.5
    const col: Collider = {
      kind: 'box',
      c: c.clone(),
      ex: ex.clone(),
      ez: ez.clone(),
      hx,
      hz,
      r: 0,
      h,
      cosReach: Math.cos(reach / R),
      reach2: reach * reach,
      solid: true,
    }
    this.list.push(col)
    return col
  }

  clear() {
    this.list.length = 0
  }

  /**
   * Push point `p` out of any colliders. On the planet `p` is a unit vector (modified + renormalised),
   * in interiors it is an absolute position. Returns true if anything pushed back.
   */
  resolve(p: Vector3, radius: number): boolean {
    let hit = false
    for (let iter = 0; iter < 2; iter++) {
      let any = false
      for (const c of this.list) {
        if (!c.solid) continue
        let dx: number, dy: number, dz: number
        if (this.planet) {
          if (p.dot(c.c) < c.cosReach) continue
          dx = (p.x - c.c.x) * R
          dy = (p.y - c.c.y) * R
          dz = (p.z - c.c.z) * R
        } else {
          dx = p.x - c.c.x
          dy = p.y - c.c.y
          dz = p.z - c.c.z
          if (dx * dx + dz * dz > c.reach2) continue
        }
        const lx = dx * c.ex.x + dy * c.ex.y + dz * c.ex.z
        const lz = dx * c.ez.x + dy * c.ez.y + dz * c.ez.z
        let px = 0
        let pz = 0
        if (c.kind === 'circle') {
          const d = Math.hypot(lx, lz)
          const min = c.r + radius
          if (d >= min) continue
          if (d < 1e-5) {
            px = min
          } else {
            px = (lx / d) * (min - d)
            pz = (lz / d) * (min - d)
          }
        } else {
          const cx = Math.max(-c.hx, Math.min(c.hx, lx))
          const cz = Math.max(-c.hz, Math.min(c.hz, lz))
          const ox = lx - cx
          const oz = lz - cz
          const d = Math.hypot(ox, oz)
          if (d >= radius) continue
          if (d > 1e-5) {
            px = (ox / d) * (radius - d)
            pz = (oz / d) * (radius - d)
          } else {
            // centre is inside the box: leave through the nearest face
            const ex = c.hx - Math.abs(lx)
            const ez = c.hz - Math.abs(lz)
            if (ex < ez) px = (lx >= 0 ? 1 : -1) * (ex + radius)
            else pz = (lz >= 0 ? 1 : -1) * (ez + radius)
          }
        }
        const k = this.planet ? 1 / R : 1
        p.x += (c.ex.x * px + c.ez.x * pz) * k
        p.y += (c.ex.y * px + c.ez.y * pz) * k
        p.z += (c.ex.z * px + c.ez.z * pz) * k
        any = true
        hit = true
      }
      if (this.planet) p.normalize()
      if (!any) break
    }
    return hit
  }

  /** is a point inside any collider taller than `minH`? (used by the camera boom) */
  blocks(p: Vector3, pad: number, minH: number): boolean {
    for (const c of this.list) {
      if (!c.solid || c.h < minH) continue
      let dx: number, dy: number, dz: number
      if (this.planet) {
        const u = p.clone().normalize()
        if (u.dot(c.c) < c.cosReach) continue
        dx = (u.x - c.c.x) * R
        dy = (u.y - c.c.y) * R
        dz = (u.z - c.c.z) * R
      } else {
        dx = p.x - c.c.x
        dy = p.y - c.c.y
        dz = p.z - c.c.z
      }
      const lx = dx * c.ex.x + dy * c.ex.y + dz * c.ex.z
      const lz = dx * c.ez.x + dy * c.ez.y + dz * c.ez.z
      if (c.kind === 'circle') {
        if (Math.hypot(lx, lz) < c.r + pad) return true
      } else if (Math.abs(lx) < c.hx + pad && Math.abs(lz) < c.hz + pad) return true
    }
    return false
  }
}

export const worldColliders = new ColliderSet(true)
