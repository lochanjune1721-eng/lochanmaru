// The visitor's avatar: acceleration, smooth turning, planet stepping, collision and wading.
import { Quaternion, Vector2, Vector3 } from 'three'
import { approach, clamp, damp, smoothstep } from './math'
import { bus } from './bus'
import { game } from './game'
import { input, isSprinting, readMove } from './input'
import { R, SEA, WALK_MIN, mapBasisAt, stepOnSphere, surfaceDistance, toTangent } from './planet'
import { worldColliders } from './collision'
import { cam, player } from './state'
import { PLAZA, nearestPath } from '../world/layout'
import { mapToN } from './planet'
import { deckHeight, walkTerrain } from '../world/terrain'

const WALK = 5.4
const RUN = 8.4
const ACCEL = 26
const DECEL = 34
const STRIDE = 1.55 // world units per full leg cycle half (foot plant)
const plazaN = mapToN(PLAZA.x, PLAZA.z)

const _mv = new Vector2()
const _right = new Vector3()
const _des = new Vector3()
const _nNew = new Vector3()
const _q = new Quaternion()
const _north = new Vector3()
const _east = new Vector3()
const _tmp = new Vector3()

function setSurface(dt: number) {
  const now = game.time
  if ((setSurface as any).t > now) return
  ;(setSurface as any).t = now + 0.1
  const t = walkTerrain(player.n)
  player.wet = smoothstep(SEA + 0.15, SEA - 0.45, t)
  let s: typeof player.surface = 'grass'
  if (t < SEA + 0.05) s = 'water'
  else if (deckHeight(player.n) > -1) s = 'wood'
  else if (surfaceDistance(player.n, plazaN) < PLAZA.r) s = 'tile'
  else {
    const p = nearestPath(player.n)
    if (p.dist < p.half + 0.2) s = 'path'
    else if (t < -0.1) s = 'sand'
  }
  player.surface = s
}
;(setSurface as any).t = 0

/** Keep the walker on walkable ground by sliding along the shoreline gradient. */
function clampWalkable(n: Vector3, from: Vector3) {
  let t = walkTerrain(n)
  if (t >= WALK_MIN) return
  for (let i = 0; i < 5; i++) {
    mapBasisAt(n, _north, _east)
    const e = 0.5
    _tmp.copy(n).addScaledVector(_east, e / R).normalize()
    const te1 = walkTerrain(_tmp)
    _tmp.copy(n).addScaledVector(_east, -e / R).normalize()
    const te0 = walkTerrain(_tmp)
    _tmp.copy(n).addScaledVector(_north, e / R).normalize()
    const tn1 = walkTerrain(_tmp)
    _tmp.copy(n).addScaledVector(_north, -e / R).normalize()
    const tn0 = walkTerrain(_tmp)
    const gx = (te1 - te0) / (2 * e)
    const gz = (tn1 - tn0) / (2 * e)
    const g2 = gx * gx + gz * gz
    if (g2 < 1e-6) break
    const k = (WALK_MIN + 0.03 - t) / g2
    n.addScaledVector(_east, (gx * k) / R).addScaledVector(_north, (gz * k) / R).normalize()
    t = walkTerrain(n)
    if (t >= WALK_MIN) return
  }
  if (walkTerrain(n) < WALK_MIN) n.copy(from)
}

/** Read steering: camera-relative desired direction (tangent, magnitude 0..1). */
function desiredDirection(out: Vector3, up: Vector3) {
  readMove(_mv)
  if (_mv.lengthSq() < 1e-4) return 0
  _right.crossVectors(cam.fwd, up).normalize()
  out.set(0, 0, 0).addScaledVector(cam.fwd, _mv.y).addScaledVector(_right, _mv.x)
  const m = out.length()
  if (m < 1e-4) return 0
  out.multiplyScalar(1 / m)
  return Math.min(1, _mv.length())
}

let prevPhase = 0

function animate(dt: number, dist: number) {
  const stridePer = STRIDE
  const dPhase = (dist / stridePer) * Math.PI
  player.stride += dPhase
  const prev = Math.floor(prevPhase / Math.PI)
  const cur = Math.floor(player.stride / Math.PI)
  if (cur !== prev && player.speed > 0.8) bus.emit('step', player.surface, player.speed)
  prevPhase = player.stride
}

export function updatePlayer(dt: number) {
  updateWorld(dt)
}

function steer(dt: number, up: Vector3) {
  let mag = 0
  if (!player.frozen && input.enabled) {
    mag = desiredDirection(_des, up)
    // any manual steering cancels click-to-walk
    if (mag > 0 && player.autoTarget) player.autoTarget = null
    if (mag === 0 && player.autoTarget) {
      const d = _tmp.copy(player.autoTarget).sub(player.pos)
      d.addScaledVector(up, -d.dot(up))
      const l = d.length()
      if (l > 1.2) {
        _des.copy(d).multiplyScalar(1 / l)
        mag = Math.min(1, l / 3)
      } else player.autoTarget = null
    }
  }
  const sprint = isSprinting()
  const max = (sprint ? RUN : WALK) * (1 - player.wet * 0.32)
  const target = mag * max
  const rate = target > player.speed ? ACCEL : DECEL
  player.speed = approach(player.speed, target, rate * dt)
  if (mag > 0.05) {
    if (player.speed < 0.6) player.velDir.copy(_des)
    else {
      // rotate velocity direction towards the desired one, quickly but not instantly
      const k = 1 - Math.exp(-13 * dt)
      player.velDir.lerp(_des, k)
      toTangent(player.velDir, up)
    }
  }
  player.sprint = sprint && mag > 0.05
  player.moving = player.speed > 0.15
  if (player.moving) player.lastMoveAt = game.time
}

function faceForward(dt: number, up: Vector3) {
  if (player.speed > 0.5) {
    const before = _tmp.copy(player.heading)
    const k = 1 - Math.exp(-15 * dt)
    player.heading.lerp(player.velDir, k)
    toTangent(player.heading, up)
    // signed turn rate for banking
    const cross = before.cross(player.heading).dot(up)
    player.turn = damp(player.turn, cross / Math.max(dt, 1e-4), 10, dt)
  } else {
    player.turn = damp(player.turn, 0, 8, dt)
  }
}

function updateWorld(dt: number) {
  const up = player.up.copy(player.n)
  steer(dt, up)
  let dist = player.speed * dt
  if (dist > 0) {
    _nNew.copy(player.n)
    stepOnSphere(_nNew, player.velDir, dist, _q)
    const from = player.n.clone()
    worldColliders.resolve(_nNew, player.radius)
    clampWalkable(_nNew, from)
    // parallel-transport all tangent frames by the *actual* move
    const actual = Math.acos(clamp(from.dot(_nNew), -1, 1)) * R
    if (actual > 1e-6) {
      _q.setFromUnitVectors(from, _nNew)
      player.velDir.applyQuaternion(_q)
      player.heading.applyQuaternion(_q)
      cam.fwd.applyQuaternion(_q)
      player.n.copy(_nNew)
    }
    dist = actual
    player.moved = dist / Math.max(dt, 1e-4)
  } else {
    player.moved = 0
  }
  player.up.copy(player.n)
  toTangent(player.velDir, player.up)
  toTangent(player.heading, player.up)
  toTangent(cam.fwd, player.up)
  faceForward(dt, player.up)
  player.pos.copy(player.n).multiplyScalar(R + walkTerrain(player.n))
  animate(dt, dist)
  setSurface(dt)
}
