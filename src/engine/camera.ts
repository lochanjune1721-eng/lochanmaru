// Camera director. Modes: intro orbit -> flight -> follow (world) / follow (interior). Everything is
// exponentially damped so the camera never feels robotic, and it never clips through buildings.
import { PerspectiveCamera, Vector2, Vector3 } from 'three'
import { clamp, damp, easeInOutCubic, lerp, DEG } from './math'
import { game } from './game'
import { consumeLook, consumeWheel, input } from './input'
import { R, mapToN, toTangent } from './planet'
import { worldColliders } from './collision'
import { cam, player } from './state'
import { walkTerrain } from '../world/terrain'
import { store } from './store'

const _look = new Vector2()
const _pos = new Vector3()
const _tgt = new Vector3()
const _right = new Vector3()
const _des = new Vector3()
const _tmp = new Vector3()
const _dirA = new Vector3()
const _dirB = new Vector3()

export const debugPose = { on: false, pos: new Vector3(), look: new Vector3(), up: new Vector3(0, 1, 0), fov: 38 }

export const flight = {
  fromPos: new Vector3(),
  fromLook: new Vector3(),
  fromUp: new Vector3(0, 1, 0),
  fromFov: 34,
}

const INTRO_FOV = 33

/** smoothed camera scalars (NaN = uninitialised, snap on first use) */
const sm = { dist: NaN, pitch: NaN, shift: 0 }

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

function followPose(dt: number, pos: Vector3, look: Vector3, up: Vector3, hardSnap = false) {
  const interior = game.mode === 'interior'
  up.copy(player.up)

  // --- user look (drag) + zoom ---
  const panelOpen = !!store.getState().panel
  if (input.enabled && !panelOpen) {
    consumeLook(_look)
    if (_look.lengthSq() > 0) {
      const sens = input.touch ? 0.0062 : 0.0052
      cam.fwd.applyAxisAngle(up, _look.x * sens)
      cam.pitch = clamp(cam.pitch + _look.y * sens * 0.8, interior ? 0.5 : 0.2, interior ? 0.95 : 1.15)
    }
    const w = consumeWheel()
    if (w) cam.zoom = clamp(cam.zoom + w * 0.0012, 0.62, 1.55)
  } else {
    consumeLook(_look)
    consumeWheel()
  }
  if (interior) {
    // keep the interior camera within a comfortable arc around "looking at the back wall"
    const base = _tmp.set(0, 0, -1)
    const ang = Math.atan2(cam.fwd.x * base.z - cam.fwd.z * base.x, cam.fwd.x * base.x + cam.fwd.z * base.z)
    const lim = 0.62
    if (Math.abs(ang) > lim) cam.fwd.applyAxisAngle(up, -(ang - Math.sign(ang) * lim))
  }
  toTangent(cam.fwd, up)

  // --- focus point ---
  const ahead = clamp(player.speed * 0.16, 0, 1.6)
  _tgt.copy(player.pos).addScaledVector(up, 1.15).addScaledVector(player.velDir, ahead)
  if (interior) _tgt.addScaledVector(cam.fwd, 3.2)
  // interaction focus: lean towards a target point
  if (cam.focusTarget) {
    cam.focusAmt = damp(cam.focusAmt, 1, 3.2, dt)
  } else {
    cam.focusAmt = damp(cam.focusAmt, 0, 3.2, dt)
  }
  if (cam.focusTarget && cam.focusAmt > 0.001) {
    _tmp.copy(cam.focusTarget)
    _tgt.lerp(_tmp, cam.focusAmt * 0.55)
  }
  if (hardSnap) cam.focus.copy(_tgt)
  else {
    const k = 1 - Math.exp(-9 * dt)
    cam.focus.lerp(_tgt, k)
  }

  // --- distance / pitch ---
  const baseDist = (interior ? 17.5 : 13.6) * cam.zoom
  const sprintBonus = player.sprint ? 1.3 : 0
  const focusDist = cam.focusTarget ? lerp(baseDist, cam.focusDist, cam.focusAmt) : baseDist
  const wantDist = focusDist + sprintBonus
  const wantPitch = cam.focusTarget ? lerp(cam.pitch, cam.focusPitch, cam.focusAmt) : cam.pitch
  sm.dist = hardSnap || Number.isNaN(sm.dist) ? wantDist : damp(sm.dist, wantDist, 3.5, dt)
  sm.pitch = hardSnap || Number.isNaN(sm.pitch) ? wantPitch : damp(sm.pitch, wantPitch, 4, dt)
  const dist = sm.dist
  const pitch = sm.pitch

  // --- panel shift: keep the subject visible next to a content panel ---
  const mobile = window.innerWidth < 760
  sm.shift = damp(sm.shift, panelOpen ? 1 : 0, 4, dt)
  const shift = sm.shift

  look.copy(cam.focus)
  _right.crossVectors(cam.fwd, up).normalize()
  // centre the subject in the part of the screen the panel leaves free (panel = 480px + margin on desktop,
  // ~78% of the height on phones): world shift = (covered fraction) * tan(fov/2) * distance
  const halfH = Math.tan((cam.fov * Math.PI) / 360) * dist
  if (!mobile) look.addScaledVector(_right, shift * (Math.min(494, window.innerWidth * 0.5) / window.innerHeight) * halfH)
  else look.addScaledVector(up, -shift * 0.68 * halfH)

  _des.copy(look).addScaledVector(up, Math.sin(pitch) * dist).addScaledVector(cam.fwd, -Math.cos(pitch) * dist)

  // --- boom: don't go through buildings ---
  if (!interior) {
    for (let i = 0; i < 8; i++) {
      const t = 1 - i * 0.1
      _pos.copy(look).lerp(_des, t)
      const h = _pos.length() - R
      if (!worldColliders.blocks(_pos, 0.9, h - 0.3)) {
        if (i > 0) _des.copy(_pos)
        break
      }
      if (i === 7) _des.copy(_pos)
    }
    // stay above the ground
    const r = _des.length()
    const n = _tmp.copy(_des).normalize()
    const minR = R + walkTerrain(n) + 1.1
    if (r < minR) _des.multiplyScalar(minR / r)
  } else {
    if (_des.y < look.y + 1.5) _des.y = look.y + 1.5
  }
  pos.copy(_des)
}

let time = 0

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
    // spherical interpolation of the camera position around the planet centre
    _dirA.copy(flight.fromPos).normalize()
    _dirB.copy(toPos).normalize()
    const ang = Math.acos(clamp(_dirA.dot(_dirB), -1, 1))
    if (ang < 1e-4) pose.pos.copy(toPos)
    else {
      const s = Math.sin(ang)
      const wa = Math.sin((1 - e) * ang) / s
      const wb = Math.sin(e * ang) / s
      pose.pos.set(0, 0, 0).addScaledVector(_dirA, wa).addScaledVector(_dirB, wb).normalize()
      pose.pos.multiplyScalar(lerp(flight.fromPos.length(), toPos.length(), e))
    }
    pose.look.lerpVectors(flight.fromLook, toLook, e)
    pose.up.lerpVectors(flight.fromUp, toUp, e).normalize()
    fov = lerp(INTRO_FOV, cam.fov, e)
    if (t >= 1) cam.mode = 'follow'
  } else {
    followPose(dt, pose.pos, pose.look, pose.up)
    // subtle FOV breathing when sprinting
    fov = cam.fov + (player.sprint ? 3 : 0)
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
  if (game.mode === 'world') {
    const focusN = cam.mode === 'intro' ? _tmp.copy(mapToN(0, -12)) : _tmp.copy(player.n)
    game.focusN.copy(focusN)
    game.up.copy(cam.mode === 'intro' ? focusN : player.up)
    game.focus.copy(cam.mode === 'intro' ? _tmp.multiplyScalar(R) : player.pos)
  } else {
    game.up.set(0, 1, 0)
    game.focusN.set(0, 1, 0)
    game.focus.copy(player.pos)
  }
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
  sm.shift = 0
}

export { DEG }
