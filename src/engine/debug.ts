// Debug/test hooks (only installed with ?debug). Lets automated tests step the simulation deterministically.
import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three'
import { resetFollowSmoothing, debugPose } from './camera'
import { simStep } from './sim'
import { game } from './game'
import { input } from './input'
import { current } from './interactions'
import { mapBasisAt, mapToN, nToMap } from './planet'
import { cam, player } from './state'
import { store } from './store'
import { groundPoint } from '../world/terrain'
import { buildings, scene } from './scenes'
import { registry } from './interact'
import { toTangent } from './planet'

export function installDebug(camera: PerspectiveCamera, gl?: WebGLRenderer) {
  const api = {
    camera,
    player,
    cam,
    game,
    store,
    input,
    current,
    registry,
    buildings,
    scene,
    step(n = 1, dt = 1 / 30) {
      for (let i = 0; i < n; i++) simStep(dt, camera)
    },
    teleport(x: number, z: number, yawDeg?: number) {
      const n = mapToN(x, z)
      player.n.copy(n)
      player.up.copy(n)
      groundPoint(n, player.pos)
      if (yawDeg !== undefined) {
        const north = new Vector3()
        const east = new Vector3()
        mapBasisAt(n, north, east)
        const a = (yawDeg * Math.PI) / 180
        player.heading.copy(north).multiplyScalar(Math.cos(a)).addScaledVector(east, Math.sin(a)).normalize()
        player.velDir.copy(player.heading)
        cam.fwd.copy(player.heading)
      }
      resetFollowSmoothing()
    },
    /** free camera around a design-map point (skyline inspection) */
    view(x: number, z: number, dist = 30, height = 12, yawDeg = 0, lift = 6, fov = 38) {
      const n = mapToN(x, z)
      const north = new Vector3()
      const east = new Vector3()
      mapBasisAt(n, north, east)
      const a = (yawDeg * Math.PI) / 180
      const fwd = north.clone().multiplyScalar(Math.cos(a)).addScaledVector(east, Math.sin(a)).normalize()
      const g = groundPoint(n, new Vector3())
      debugPose.on = true
      debugPose.pos.copy(g).addScaledVector(n, height).addScaledVector(fwd, -dist)
      debugPose.look.copy(g).addScaledVector(n, lift)
      debugPose.up.copy(n)
      debugPose.fov = fov
      game.focusN.copy(n)
      game.up.copy(n)
      game.focus.copy(g)
    },
    /** absolute free camera (interior inspection) */
    freeCam(pos: [number, number, number], look: [number, number, number], fov = 40) {
      debugPose.on = true
      debugPose.pos.set(...pos)
      debugPose.look.set(...look)
      debugPose.up.set(0, 1, 0)
      debugPose.fov = fov
    },
    /** stand a few steps in front of a building's door, facing it */
    goDoor(id: string, back = 0.5) {
      const b = (buildings as any)[id]
      if (!b) return false
      const n = b.outN.clone().lerp(b.door.clone().normalize(), back).normalize()
      player.n.copy(n)
      player.up.copy(n)
      groundPoint(n, player.pos)
      const h = toTangent(b.outDir.clone().negate(), n)
      player.heading.copy(h)
      player.velDir.copy(h)
      cam.fwd.copy(h)
      resetFollowSmoothing()
      return true
    },
    viewOff() {
      debugPose.on = false
    },
    /** renderer statistics for the last frame (draw calls, triangles, textures, geometries, programs) */
    stats() {
      if (!gl) return null
      const i = gl.info
      return { calls: i.render.calls, triangles: i.render.triangles, points: i.render.points, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length ?? 0 }
    },
    where() {
      return nToMap(player.n)
    },
    key(code: string, down: boolean) {
      if (down) input.keys.add(code)
      else input.keys.delete(code)
    },
    press() {
      input.interact = true
    },
  }
  ;(window as any).__lw = api
}
