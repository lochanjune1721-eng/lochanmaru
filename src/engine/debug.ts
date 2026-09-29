// Debug/test hooks (only installed with ?debug). Lets automated tests step the simulation deterministically.
import { PerspectiveCamera, Vector3 } from 'three'
import { updateCamera, resetFollowSmoothing, debugPose } from './camera'
import { game } from './game'
import { input } from './input'
import { updateInteractions, current } from './interactions'
import { mapBasisAt, mapToN, nToMap } from './planet'
import { updatePlayer } from './player'
import { cam, player } from './state'
import { store } from './store'
import { groundPoint } from '../world/terrain'

export function installDebug(camera: PerspectiveCamera) {
  const api = {
    player,
    cam,
    game,
    store,
    input,
    current,
    step(n = 1, dt = 1 / 30) {
      for (let i = 0; i < n; i++) {
        game.time += dt
        updatePlayer(dt)
        updateInteractions(dt, camera)
        updateCamera(camera, dt)
      }
    },
    teleport(x: number, z: number, yawDeg?: number) {
      const n = mapToN(x, z)
      player.n.copy(n)
      player.up.copy(n)
      groundPoint(n, player.pos)
      if (yawDeg !== undefined) {
        const north = new Vector3()
        const east = new Vector3()
        import('./planet').then(({ mapBasisAt }) => {
          mapBasisAt(n, north, east)
          const a = (yawDeg * Math.PI) / 180
          player.heading.copy(north).multiplyScalar(Math.cos(a)).addScaledVector(east, Math.sin(a)).normalize()
          player.velDir.copy(player.heading)
          cam.fwd.copy(player.heading)
        })
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
    viewOff() {
      debugPose.on = false
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
