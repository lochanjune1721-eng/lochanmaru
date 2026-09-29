// One deterministic simulation step. Everything time-based (drops, journeys, scripted moments) runs on
// simulation time, so a slow device stays consistent and tests can fast-forward.
import { PerspectiveCamera } from 'three'
import { updateCamera } from './camera'
import { game } from './game'
import { updateInteractions } from './interactions'
import { updatePlayer } from './player'
import { player } from './state'
import { U } from '../gfx/materials'

interface Timer {
  at: number
  fn: () => void
}
const timers: Timer[] = []

/** Run `fn` after `seconds` of *simulation* time. */
export function after(seconds: number, fn: () => void) {
  timers.push({ at: game.time + seconds, fn })
}

export function simStep(dt: number, camera: PerspectiveCamera) {
  game.time += dt
  game.dt = dt
  U.uTime.value = game.time
  if (player.drop >= 0 && player.drop < 1) player.drop = Math.min(1, player.drop + dt / 1.35)
  for (let i = timers.length - 1; i >= 0; i--) {
    if (game.time >= timers[i].at) {
      const t = timers.splice(i, 1)[0]
      t.fn()
    }
  }
  updatePlayer(dt)
  updateInteractions(dt, camera)
  updateCamera(camera, dt)
}
