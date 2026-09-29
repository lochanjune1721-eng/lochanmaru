// Horizon culling: on a small planet most of the world is *behind* the curve. We hide whole chunks
// that cannot possibly be seen (accounting for how tall they are) instead of shading them to nothing.
import { useFrame } from '@react-three/fiber'
import { Object3D, Vector3 } from 'three'
import { game } from '../engine/game'
import { R } from '../engine/planet'

export interface Cullable {
  obj: Object3D
  /** unit vector at the chunk centre */
  n: Vector3
  /** angular radius of the chunk (radians) */
  ang: number
  /** tallest point above the ground (world units) */
  h: number
}

const list: Cullable[] = []
export function registerCullable(c: Cullable) {
  list.push(c)
  return () => {
    const i = list.indexOf(c)
    if (i >= 0) list.splice(i, 1)
  }
}

const _n = new Vector3()
let tick = 0

export function HorizonCuller() {
  useFrame(() => {
    if (tick++ % 5 !== 0) return
    const h = Math.max(0.5, game.camPos.length() - R)
    const camDip = Math.acos(R / (R + h))
    _n.copy(game.camPos).normalize()
    for (const c of list) {
      const ang = Math.acos(Math.min(1, Math.max(-1, _n.dot(c.n))))
      const objDip = Math.acos(R / (R + c.h))
      c.obj.visible = ang - c.ang < camDip + objDip + 0.06
    }
  })
  return null
}

/** Force everything visible (used by the intro fly-over of the whole planet). */
export function showAllCullables() {
  for (const c of list) c.obj.visible = true
}
