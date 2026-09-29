// Scene management: buildings register their door geometry, interiors register their stage.
// enterBuilding / exitBuilding choreograph: door opens -> visitor walks in -> iris closes -> swap -> iris opens.
import { Object3D, PerspectiveCamera, Vector3 } from 'three'
import { bus } from './bus'
import { game } from './game'
import { input } from './input'
import { cam, player, InteriorRuntime } from './state'
import { InteriorId, store } from './store'
import { irisCtl } from '../ui/iris'
import { resetFollowSmoothing } from './camera'
import { mapBasisAt, R } from './planet'

export interface BuildingRuntime {
  id: InteriorId
  label: string
  color: string
  /** world-space point on the door plane (ground level) */
  door: Vector3
  /** unit vectors on the sphere: just inside the door, and the exit spawn outside */
  insideN: Vector3
  outN: Vector3
  /** tangent direction pointing away from the building at the exit spawn */
  outDir: Vector3
  /** where the camera should look while entering (door centre) */
  doorLook: Vector3
}

export const buildings: Partial<Record<InteriorId, BuildingRuntime>> = {}

export const stage = {
  world: null as Object3D | null,
  interiors: {} as Partial<Record<InteriorId, Object3D>>,
  runtime: {} as Partial<Record<InteriorId, InteriorRuntime>>,
  /** entry spawn inside each interior (world coords) + which way to face */
  spawn: {} as Partial<Record<InteriorId, { pos: Vector3; dir: Vector3 }>>,
  camera: null as PerspectiveCamera | null,
}

export const doorState: Record<string, { open: number; force: boolean }> = {}
export const getDoor = (id: string) => (doorState[id] ??= { open: 0, force: false })

export const scene = { busy: false, current: null as InteriorId | null, lastExit: null as InteriorId | null }

const _v = new Vector3()

function screenOf(p: Vector3) {
  const c = stage.camera
  if (!c) return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  _v.copy(p).project(c)
  return { x: (_v.x * 0.5 + 0.5) * window.innerWidth, y: (-_v.y * 0.5 + 0.5) * window.innerHeight }
}

/** Ask the player controller to glide the avatar to a point (unit vector), ignoring collision. */
function walkTo(to: Vector3, dur: number) {
  return new Promise<void>((res) => {
    player.script = { from: player.n.clone(), to: to.clone(), dur, t: 0, done: res }
  })
}

export async function enterBuilding(id: InteriorId) {
  const b = buildings[id]
  if (!b || scene.busy || game.mode !== 'world') return
  scene.busy = true
  input.enabled = false
  player.frozen = true
  player.autoTarget = null
  store.getState().set({ prompt: null })
  getDoor(id).force = true
  bus.emit('door', id, 'open')
  cam.focusTarget = b.doorLook.clone()
  cam.focusDist = 8.5
  cam.focusPitch = 0.34
  await new Promise((r) => setTimeout(r, 380))
  await walkTo(b.insideN, 1.05)
  const p = screenOf(b.doorLook)
  bus.emit('iris', 'close')
  await irisCtl.close(p.x, p.y, b.color)
  swapToInterior(id)
  // let the first interior frames render before revealing
  await new Promise((r) => setTimeout(r, 120))
  bus.emit('iris', 'open')
  await irisCtl.open(window.innerWidth / 2, window.innerHeight * 0.62)
  player.frozen = false
  input.enabled = true
  scene.busy = false
  getDoor(id).force = false
}

function swapToInterior(id: InteriorId) {
  const rt = stage.runtime[id]
  const sp = stage.spawn[id]
  if (!rt || !sp) return
  game.mode = 'interior'
  scene.current = id
  cam.focusTarget = null
  cam.focusAmt = 0
  stage.world && (stage.world.visible = false)
  for (const k of Object.keys(stage.interiors) as InteriorId[]) {
    const o = stage.interiors[k]
    if (o) o.visible = k === id
  }
  player.interior = rt
  player.script = null
  player.pos.copy(sp.pos)
  player.up.set(0, 1, 0)
  player.heading.copy(sp.dir)
  player.velDir.copy(sp.dir)
  player.speed = 0
  cam.fwd.set(0, 0, -1)
  cam.pitch = 0.74
  cam.zoom = 1
  cam.focus.copy(sp.pos)
  resetFollowSmoothing()
  store.getState().set({ interior: id })
  store.getState().markVisited(id)
  bus.emit('enter', id)
}

export async function exitBuilding() {
  const id = scene.current
  if (!id || scene.busy) return
  const b = buildings[id]
  if (!b) return
  scene.busy = true
  input.enabled = false
  player.frozen = true
  store.getState().set({ prompt: null, panel: null })
  bus.emit('iris', 'close')
  await irisCtl.close(window.innerWidth / 2, window.innerHeight * 0.66, b.color)
  // back outside
  game.mode = 'world'
  scene.current = null
  scene.lastExit = id
  stage.world && (stage.world.visible = true)
  for (const k of Object.keys(stage.interiors) as InteriorId[]) {
    const o = stage.interiors[k]
    if (o) o.visible = false
  }
  player.interior = null
  player.script = null
  player.n.copy(b.outN)
  player.up.copy(b.outN)
  player.pos.copy(b.outN).multiplyScalar(R + 0.0)
  player.heading.copy(b.outDir)
  player.velDir.copy(b.outDir)
  player.speed = 0
  cam.fwd.copy(b.outDir)
  cam.pitch = 0.62
  cam.zoom = 1
  cam.focus.copy(player.pos)
  cam.focusTarget = null
  cam.focusAmt = 0
  resetFollowSmoothing()
  store.getState().set({ interior: null })
  getDoor(id).force = true
  bus.emit('exit', id)
  await new Promise((r) => setTimeout(r, 160))
  const p = screenOf(b.doorLook)
  bus.emit('iris', 'open')
  await irisCtl.open(p.x, p.y)
  player.frozen = false
  input.enabled = true
  scene.busy = false
  setTimeout(() => {
    getDoor(id).force = false
  }, 900)
}

export { mapBasisAt }
