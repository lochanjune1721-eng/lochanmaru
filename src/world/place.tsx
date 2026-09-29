// Placing authored things on the planet. A Frame3 is a local coordinate system standing on the ground:
// +Y = up (surface normal), +Z = the way the thing faces, +X = its right-hand side.
import { ReactNode, useLayoutEffect, useMemo, useRef } from 'react'
import { Group, Matrix4, Vector3 } from 'three'
import { worldColliders } from '../engine/collision'
import { R, mapBasisAt, mapToN, toTangent } from '../engine/planet'
import { terrain } from './terrain'

export interface Frame3 {
  n: Vector3
  x: Vector3
  fwd: Vector3
  base: Vector3
  matrix: Matrix4
  /** model-space point -> world position */
  toWorld(lx: number, ly: number, lz: number, out?: Vector3): Vector3
  /** model-space XZ offset -> unit vector on the sphere */
  unit(lx: number, lz: number, out?: Vector3): Vector3
  /** model-space direction (x,z) -> world tangent direction at the frame origin */
  dir(lx: number, lz: number, out?: Vector3): Vector3
}

export function frameFromUnit(n0: Vector3, fwd0: Vector3, lift = 0): Frame3 {
  const n = n0.clone().normalize()
  const fwd = toTangent(fwd0.clone(), n)
  const x = new Vector3().crossVectors(n, fwd).normalize()
  const radial = R + terrain(n) + lift
  const base = new Vector3().copy(n).multiplyScalar(radial)
  const matrix = new Matrix4().makeBasis(x, n, fwd).setPosition(base)
  return {
    n,
    x,
    fwd,
    base,
    matrix,
    toWorld(lx, ly, lz, out = new Vector3()) {
      return out.copy(base).addScaledVector(x, lx).addScaledVector(n, ly).addScaledVector(fwd, lz)
    },
    unit(lx, lz, out = new Vector3()) {
      return out.copy(n).multiplyScalar(R).addScaledVector(x, lx).addScaledVector(fwd, lz).normalize()
    },
    dir(lx, lz, out = new Vector3()) {
      return out.set(0, 0, 0).addScaledVector(x, lx).addScaledVector(fwd, lz).normalize()
    },
  }
}

/** Frame at a design-map point, facing a compass heading (0 = north, 90deg = east). */
export function makeFrame(mx: number, mz: number, yaw: number, lift = 0): Frame3 {
  const n = mapToN(mx, mz)
  const north = new Vector3()
  const east = new Vector3()
  mapBasisAt(n, north, east)
  const fwd = new Vector3().copy(north).multiplyScalar(Math.cos(yaw)).addScaledVector(east, Math.sin(yaw))
  return frameFromUnit(n, fwd, lift)
}

/** A frame standing at model offset (lx, lz) of a parent frame, rotated `rot` about up. */
export function subFrame(parent: Frame3, lx: number, lz: number, rot = 0, lift = 0): Frame3 {
  const n = parent.unit(lx, lz)
  const fwd = parent.dir(Math.sin(rot), Math.cos(rot))
  return frameFromUnit(n, fwd, lift)
}

/** Walk `dist` surface units from unit vector `n0` along tangent direction `dir`. */
export function geodesic(n0: Vector3, dir: Vector3, dist: number, out = new Vector3()) {
  const a = dist / R
  return out.copy(n0).multiplyScalar(Math.cos(a)).addScaledVector(dir, Math.sin(a)).normalize()
}

/** compass direction (0 = north, 90deg = east) as a tangent vector at n */
export function compassDir(n: Vector3, bearing: number, out = new Vector3()) {
  const north = new Vector3()
  const east = new Vector3()
  mapBasisAt(n, north, east)
  return out.copy(north).multiplyScalar(Math.cos(bearing)).addScaledVector(east, Math.sin(bearing)).normalize()
}

/** Register a box collider defined in a frame's model space. Returns a remover. */
export function boxCollider(f: Frame3, lx: number, lz: number, hx: number, hz: number, h: number, rot = 0) {
  const c = f.unit(lx, lz)
  const ex = f.dir(Math.cos(rot), -Math.sin(rot))
  const ez = f.dir(Math.sin(rot), Math.cos(rot))
  toTangent(ex, c)
  toTangent(ez, c)
  const col = worldColliders.box(c, ex, ez, hx, hz, h)
  return () => {
    const i = worldColliders.list.indexOf(col)
    if (i >= 0) worldColliders.list.splice(i, 1)
  }
}

export function circleCollider(f: Frame3, lx: number, lz: number, r: number, h: number) {
  const c = f.unit(lx, lz)
  const ex = toTangent(f.dir(1, 0), c)
  const ez = toTangent(f.dir(0, 1), c)
  const col = worldColliders.circle(c, ex, ez, r, h)
  return () => {
    const i = worldColliders.list.indexOf(col)
    if (i >= 0) worldColliders.list.splice(i, 1)
  }
}

export function Placed({ x = 0, z = 0, yaw = 0, lift = 0, children, frame }: { x?: number; z?: number; yaw?: number; lift?: number; children?: ReactNode; frame?: Frame3 }) {
  const f = useMemo(() => frame ?? makeFrame(x, z, yaw, lift), [frame, x, z, yaw, lift])
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    g.matrixAutoUpdate = false
    g.matrix.copy(f.matrix)
    g.matrixWorldNeedsUpdate = true
  }, [f])
  return <group ref={ref}>{children}</group>
}

/** A group positioned by an arbitrary matrix (e.g. a module's transform relative to its building). */
export function Mat4({ matrix, children }: { matrix: Matrix4; children?: ReactNode }) {
  const ref = useRef<Group>(null)
  useLayoutEffect(() => {
    const g = ref.current
    if (!g) return
    g.matrixAutoUpdate = false
    g.matrix.copy(matrix)
    g.matrixWorldNeedsUpdate = true
  }, [matrix])
  return <group ref={ref}>{children}</group>
}
