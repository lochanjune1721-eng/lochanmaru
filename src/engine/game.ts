// Mutable per-frame game state. Kept outside React so the render loop never triggers re-renders.
import { Vector3 } from 'three'

export type Mode = 'world' | 'interior'

export const game = {
  time: 0,
  dt: 0,
  mode: 'world' as Mode,
  /** unit vector of the surface point under the current focus (player / camera target) */
  focusN: new Vector3(0, 0, 1),
  /** world position of the focus point */
  focus: new Vector3(0, 0, 45),
  camPos: new Vector3(0, 0, 60),
  /** local "up" for sky orientation */
  up: new Vector3(0, 0, 1),
  /** sun direction (unit, pointing towards the sun) in world space */
  sunDir: new Vector3(0.3, 0.5, 0.8).normalize(),
  quality: 1 as 0 | 1 | 2,
  reducedMotion: false,
}
