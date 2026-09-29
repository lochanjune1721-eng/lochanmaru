import { Vector3 } from 'three'
import { cam, player } from './state'
import { game } from './game'
import { mapBasisAt, mapToN } from './planet'
import { SPAWN } from '../world/layout'
import { groundPoint } from '../world/terrain'
import { resetFollowSmoothing } from './camera'

const _north = new Vector3()
const _east = new Vector3()

/** Put the visitor on the beach, facing the plaza. */
export function resetPlayerToSpawn() {
  const n = mapToN(SPAWN.x, SPAWN.z)
  player.n.copy(n)
  player.up.copy(n)
  groundPoint(n, player.pos)
  mapBasisAt(n, _north, _east)
  player.heading.copy(_north)
  player.velDir.copy(_north)
  cam.fwd.copy(_north)
  player.speed = 0
  player.stride = 0
  player.autoTarget = null
  game.mode = 'world'
  player.interior = null
  resetFollowSmoothing()
}
