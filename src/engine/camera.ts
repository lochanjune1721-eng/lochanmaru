// Camera director. Modes: intro orbit -> flight -> follow. While a building's page is open the follow pose is blended
// into a three-quarter view of that building. Everything is exponentially damped so the camera never feels robotic,
// and it never clips through buildings.
import { PerspectiveCamera, Vector2, Vector3 } from 'three'
import { clamp, damp, easeInOutCubic, lerp, DEG } from './math'
import { game } from './game'
import { consumeLook, consumeWheel, input } from './input'
import { R, mapToN, toTangent } from './planet'
import { worldColliders } from './collision'
import { quality } from './quality'
import type { Place } from './places'
import { SHEET_H, pageCoverPx, sheetBottom } from './layout'
import { cam, player } from './state'
import { walkTerrain } from '../world/terrain'
import { store } from './store'

const _look = new Vector2()
const _pos = new Vector3()
const _bp = new Vector3()
const _tgt = new Vector3()
const _right = new Vector3()
const _des = new Vector3()
const _tmp = new Vector3()
const _dirA = new Vector3()
const _dirB = new Vector3()
const _out = new Vector3()

let time = 0

export const debugPose = { on: false, pos: new Vector3(), look: new Vector3(), up: new Vector3(0, 1, 0), fov: 38 }

export const flight = {
  fromPos: new Vector3(),
  fromLook: new Vector3(),
  fromUp: new Vector3(0, 1, 0),
  fromFov: 34,
}

const INTRO_FOV = 33

/** smoothed camera scalars (NaN = uninitialised, snap on first use) */
const sm = { dist: NaN, pitch: NaN }

/** the smoothed pose of the page view (so hopping between buildings glides instead of jumping) */
const pp = { pos: new Vector3(), look: new Vector3(), up: new Vector3(0, 1, 0), ready: false }

/** Spherical interpolation of two points around the planet centre (direction slerped, radius lerped). */
function slerpPoint(a: Vector3, b: Vector3, e: number, out: Vector3) {
  const ra = a.length()
  const rb = b.length()
  _dirA.copy(a).multiplyScalar(1 / Math.max(ra, 1e-6))
  _dirB.copy(b).multiplyScalar(1 / Math.max(rb, 1e-6))
  const ang = Math.acos(clamp(_dirA.dot(_dirB), -1, 1))
  const r = lerp(ra, rb, e)
  if (ang < 1e-4) {
    out.copy(_dirB).multiplyScalar(r)
    return out
  }
  const s = Math.sin(ang)
  const wa = Math.sin((1 - e) * ang) / s
  const wb = Math.sin(e * ang) / s
  out.set(0, 0, 0).addScaledVector(_dirA, wa).addScaledVector(_dirB, wb).normalize().multiplyScalar(r)
  return out
}

/** Pose of the intro orbit (a beautiful establishing shot of the tiny planet). */
export function introPose(time: number, pos: Vector3, look: Vector3, up: Vector3) {
  const a = Math.sin(time * 0.11) * 0.55
  const b = 0.16 + Math.sin(time * 0.07 + 1) * 0.05
  const base = mapToN(0, -12)
  // rotate around world Y (a) and X (b)
  const cy = Math.cos(a)
  const sy = Math.sin(a)
  const x1 = base.x * cy + base.z * sy
  const z1 = -base.x * sy + base.z * cy
  const cb = Math.cos(b)
  const sb = Math.sin(b)
  const y2 = base.y * cb - z1 * sb
  const z2 = base.y * sb + z1 * cb
  pos.set(x1, y2, z2).normalize().multiplyScalar(R + 90)
  look.set(0, 27, 0)
  up.set(0, 1, 0)
}

/** Pull a desired camera position in towards its look point until nothing solid is in the way, and keep it off the ground. */
function boom(look: Vector3, des: Vector3) {
  for (let i = 0; i < 8; i++) {
    const t = 1 - i * 0.1
    _bp.copy(look).lerp(des, t)
    const h = _bp.length() - R
    if (!worldColliders.blocks(_bp, 0.9, h - 0.3)) {
      if (i > 0) des.copy(_bp)
      break
    }
    if (i === 7) des.copy(_bp)
  }
  const r = des.length()
  const n = _tmp.copy(des).normalize()
  const minR = R + walkTerrain(n) + 1.1
  if (r < minR) des.multiplyScalar(minR / r)
}

function followPose(dt: number, pos: Vector3, look: Vector3, up: Vector3, hardSnap = false) {
  up.copy(player.up)

  // --- user look (drag) + zoom ---
  if (input.enabled && !store.getState().page) {
    consumeLook(_look)
    if (_look.lengthSq() > 0) {
      const sens = input.touch ? 0.0062 : 0.0052
      cam.fwd.applyAxisAngle(up, _look.x * sens)
      cam.pitch = clamp(cam.pitch + _look.y * sens * 0.8, 0.2, 1.15)
    }
    const w = consumeWheel()
    if (w) cam.zoom = clamp(cam.zoom + w * 0.0012, 0.62, 1.55)
  } else {
    consumeLook(_look)
    consumeWheel()
  }
  toTangent(cam.fwd, up)

  // --- focus point: a little ahead of the walker ---
  const ahead = clamp(player.speed * 0.16, 0, 1.6)
  _tgt.copy(player.pos).addScaledVector(up, 1.15).addScaledVector(player.velDir, ahead)
  if (hardSnap) cam.focus.copy(_tgt)
  else cam.focus.lerp(_tgt, 1 - Math.exp(-9 * dt))

  // --- distance / pitch ---
  const wantDist = 13.6 * cam.zoom + (player.sprint ? 1.3 : 0)
  sm.dist = hardSnap || Number.isNaN(sm.dist) ? wantDist : damp(sm.dist, wantDist, 3.5, dt)
  sm.pitch = hardSnap || Number.isNaN(sm.pitch) ? cam.pitch : damp(sm.pitch, cam.pitch, 4, dt)

  look.copy(cam.focus)
  _des.copy(look).addScaledVector(up, Math.sin(sm.pitch) * sm.dist).addScaledVector(cam.fwd, -Math.cos(sm.pitch) * sm.dist)
  boom(look, _des)
  pos.copy(_des)
}

/**
 * Where the camera sits to show a building next to its open page: in front of it and a little round to one side,
 * looking slightly above centre, with the building nudged into the part of the screen the page leaves free.
 */
function placeTarget(p: Place, pos: Vector3, look: Vector3, up: Vector3) {
  const f = p.frame
  const W = window.innerWidth
  const H = window.innerHeight
  const bottom = sheetBottom()
  const aspect = W / H
  // the framing distances are designed for a 16:9 window with roughly half of it free; back off when the free part is
  // narrower (fitW) or, for a bottom sheet, shorter (fitH)
  const freeW = bottom ? 1 : Math.max(0.3, 1 - pageCoverPx() / W)
  const fitW = (1.78 * 0.53) / (aspect * freeW)
  const fitH = bottom ? 0.8 / (1 - SHEET_H) : 1
  const D = p.dist * clamp(Math.max(fitW, fitH), 0.85, 2.6)
  const halfH = Math.tan((cam.fov * Math.PI) / 360) * D

  up.copy(f.n)
  // direction from the building towards the camera
  // a very slow drift, so the building the page is about never sits perfectly still
  const drift = quality.reduced ? 0 : 1
  const yaw = p.yaw + Math.sin(time * 0.32) * 0.045 * drift
  const pitch = p.pitch + Math.sin(time * 0.21 + 1.3) * 0.012 * drift
  _out.copy(f.fwd).multiplyScalar(Math.cos(yaw)).addScaledVector(f.x, Math.sin(yaw)).normalize()
  _right.crossVectors(_tmp.copy(_out).negate(), up).normalize()
  look.copy(p.focus)
  if (!bottom) look.addScaledVector(_right, (pageCoverPx() / H) * halfH)
  else look.addScaledVector(up, -SHEET_H * halfH)
  _des.copy(look).addScaledVector(up, Math.sin(pitch) * D).addScaledVector(_out, Math.cos(pitch) * D)
  boom(look, _des)
  pos.copy(_des)
}

export function updateCamera(camera: PerspectiveCamera, dt: number) {
  if (debugPose.on) {
    camera.position.copy(debugPose.pos)
    camera.up.copy(debugPose.up)
    camera.lookAt(debugPose.look)
    if (camera.fov !== debugPose.fov) {
      camera.fov = debugPose.fov
      camera.updateProjectionMatrix()
    }
    game.camPos.copy(camera.position)
    return
  }
  time += dt
  const pose = { pos: _pos, look: new Vector3(), up: new Vector3() }
  let fov = cam.fov
  let placeE = 0

  if (cam.mode === 'intro') {
    introPose(time, pose.pos, pose.look, pose.up)
    fov = INTRO_FOV
  } else if (cam.mode === 'flight') {
    cam.flightT += dt
    const t = clamp(cam.flightT / cam.flightDur, 0, 1)
    const e = easeInOutCubic(t)
    const toPos = new Vector3()
    const toLook = new Vector3()
    const toUp = new Vector3()
    followPose(dt, toPos, toLook, toUp, true)
    slerpPoint(flight.fromPos, toPos, e, pose.pos)
    pose.look.lerpVectors(flight.fromLook, toLook, e)
    pose.up.lerpVectors(flight.fromUp, toUp, e).normalize()
    fov = lerp(INTRO_FOV, cam.fov, e)
    if (t >= 1) cam.mode = 'follow'
  } else {
    followPose(dt, pose.pos, pose.look, pose.up)
    // subtle FOV breathing when sprinting
    fov = cam.fov + (player.sprint ? 3 : 0)

    // --- a building's page is open (or closing): blend towards the page view ---
    const want = store.getState().page && cam.place ? 1 : 0
    cam.placeAmt = damp(cam.placeAmt, want, 2.6, dt)
    if (cam.place && (want || cam.placeAmt > 0.002)) {
      const toPos = new Vector3()
      const toLook = new Vector3()
      const toUp = new Vector3()
      placeTarget(cam.place, toPos, toLook, toUp)
      if (!pp.ready) {
        pp.pos.copy(toPos)
        pp.look.copy(toLook)
        pp.up.copy(toUp)
        pp.ready = true
      } else {
        const k = 1 - Math.exp(-3.4 * dt)
        slerpPoint(pp.pos, toPos, k, pp.pos)
        slerpPoint(pp.look, toLook, k, pp.look)
        pp.up.lerp(toUp, k).normalize()
      }
      placeE = easeInOutCubic(clamp(cam.placeAmt, 0, 1))
      slerpPoint(pose.pos, pp.pos, placeE, pose.pos)
      slerpPoint(pose.look, pp.look, placeE, pose.look)
      pose.up.lerp(pp.up, placeE).normalize()
    } else if (!want) {
      pp.ready = false
      cam.place = null
    }
  }

  camera.position.copy(pose.pos)
  camera.up.copy(pose.up)
  camera.lookAt(pose.look)
  if (cam.shake > 0.001) {
    camera.position.x += (Math.random() - 0.5) * cam.shake
    camera.position.y += (Math.random() - 0.5) * cam.shake
    cam.shake = damp(cam.shake, 0, 10, dt)
  }
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = damp(camera.fov, fov, 6, dt)
    camera.updateProjectionMatrix()
  }
  // export for lights / sky / culling
  game.camPos.copy(camera.position)
  const intro = cam.mode === 'intro'
  const focusN = intro ? _tmp.copy(mapToN(0, -12)) : _tmp.copy(player.n)
  const focusW = intro ? _out.copy(focusN).multiplyScalar(R) : _out.copy(player.pos)
  if (placeE > 0 && cam.place) {
    focusN.lerp(cam.place.frame.n, placeE).normalize()
    focusW.lerp(cam.place.focus, placeE)
  }
  game.focusN.copy(focusN)
  game.up.copy(intro ? focusN : placeE > 0 ? focusN : player.up)
  game.focus.copy(focusW)
}

export function beginFlight(camera: PerspectiveCamera) {
  flight.fromPos.copy(camera.position)
  flight.fromUp.copy(camera.up)
  flight.fromLook.set(0, 27, 0)
  flight.fromFov = camera.fov
  cam.flightT = 0
  cam.mode = 'flight'
}

export function resetFollowSmoothing() {
  sm.dist = NaN
  sm.pitch = NaN
}

export { DEG }
