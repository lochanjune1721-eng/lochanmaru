// The world is a tiny planet. Everything is authored on a flat "design map"
// centred on the plaza (x = east, z = north, in surface arc-length units) and
// projected onto the sphere with an azimuthal-equidistant mapping.
import { Matrix4, Quaternion, Vector3 } from 'three'
import { clamp } from './math'

/** Planet radius at "land level". */
export const R = 44
/** Water surface offset from land level. */
export const SEA = -0.55
/** Deepest terrain the visitor may wade into. */
export const WALK_MIN = -0.92

/** Direction that the plaza sits on. East = +X, north = +Y, up = +Z at the plaza. */
export const PLAZA_N = new Vector3(0, 0, 1)

const _v = new Vector3()

/** Design-map point -> unit vector on the sphere. */
export function mapToN(x: number, z: number, out = new Vector3()): Vector3 {
  const r = Math.hypot(x, z)
  if (r < 1e-6) return out.copy(PLAZA_N)
  const a = r / R
  const s = Math.sin(a) / r
  return out.set(x * s, z * s, Math.cos(a))
}

/** Unit vector -> design-map coordinates (arc-length from plaza, bearing). */
export function nToMap(n: Vector3, out: { x: number; z: number; r: number; theta: number } = { x: 0, z: 0, r: 0, theta: 0 }) {
  const a = Math.acos(clamp(n.z, -1, 1))
  const s = Math.hypot(n.x, n.y)
  if (s < 1e-7) {
    out.x = 0
    out.z = 0
    out.r = a * R
    out.theta = 0
    return out
  }
  const r = a * R
  out.x = (n.x / s) * r
  out.z = (n.y / s) * r
  out.r = r
  out.theta = Math.atan2(out.x, out.z) // 0 = north, +east
  return out
}

/** Tangent unit vectors of the design map at a sphere point (north = +z of the map, east = +x). */
export function mapBasisAt(n: Vector3, north: Vector3, east: Vector3) {
  // "north" = direction of increasing design-map z, evaluated numerically.
  const m = nToMap(n)
  const e = 0.02
  mapToN(m.x, m.z + e, _v)
  north.copy(_v).addScaledVector(n, -_v.dot(n))
  if (north.lengthSq() < 1e-10) north.set(0, 1, 0).addScaledVector(n, -n.y)
  north.normalize()
  east.crossVectors(north, n).normalize()
}

export interface Frame {
  n: Vector3
  east: Vector3
  north: Vector3
}

export function frameAtMap(x: number, z: number): Frame {
  const n = mapToN(x, z)
  const north = new Vector3()
  const east = new Vector3()
  mapBasisAt(n, north, east)
  return { n, east, north }
}

/**
 * Object matrix for something standing at a design-map position.
 * Model space: +Y up, +Z = front (the side a visitor approaches from).
 * `yaw` is the compass heading the front faces: 0 = north, 90deg = east.
 */
export function placeMatrix(n: Vector3, north: Vector3, east: Vector3, yaw: number, radial: number, out = new Matrix4()) {
  const fx = Math.cos(yaw)
  const fe = Math.sin(yaw)
  const fwd = new Vector3().copy(north).multiplyScalar(fx).addScaledVector(east, fe).normalize()
  const x = new Vector3().crossVectors(n, fwd).normalize()
  const pos = new Vector3().copy(n).multiplyScalar(R + radial)
  return out.makeBasis(x, n, fwd).setPosition(pos)
}

/** Quaternion + position for arbitrary orientation frames (used by instancing). */
export function frameQuaternion(n: Vector3, fwd: Vector3, out = new Quaternion()) {
  const x = new Vector3().crossVectors(n, fwd).normalize()
  const z = new Vector3().crossVectors(x, n).normalize()
  const m = new Matrix4().makeBasis(x, n, z)
  return out.setFromRotationMatrix(m)
}

/** Great-circle angle between two unit vectors. */
export const angleBetween = (a: Vector3, b: Vector3) => Math.acos(clamp(a.dot(b), -1, 1))

/** Surface distance (arc-length units) between two unit vectors. */
export const surfaceDistance = (a: Vector3, b: Vector3) => angleBetween(a, b) * R

/**
 * Move a point `d` units along tangent direction `dir` on the sphere.
 * Writes the new unit vector into `n`, and the parallel-transport rotation into `q`.
 */
const _axis = new Vector3()
const _nNew = new Vector3()
export function stepOnSphere(n: Vector3, dir: Vector3, d: number, q: Quaternion) {
  const ang = d / R
  _axis.crossVectors(n, dir)
  if (_axis.lengthSq() < 1e-14 || Math.abs(ang) < 1e-9) {
    q.identity()
    return
  }
  _axis.normalize()
  q.setFromAxisAngle(_axis, ang)
  _nNew.copy(n).applyQuaternion(q).normalize()
  n.copy(_nNew)
}

/** Project v onto the tangent plane at n and normalise. */
export function toTangent(v: Vector3, n: Vector3) {
  v.addScaledVector(n, -v.dot(n))
  const l = v.length()
  if (l > 1e-8) v.multiplyScalar(1 / l)
  return v
}
