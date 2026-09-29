// Per-frame mutable state for the player and the camera (kept out of React on purpose).
import { Vector3 } from 'three'
import type { ColliderSet } from './collision'

export type Surface = 'grass' | 'sand' | 'path' | 'water' | 'tile' | 'wood'

export interface InteriorRuntime {
  id: string
  colliders: ColliderSet
  /** walkable rectangle in interior XZ space */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
  origin: Vector3
  floor: Surface
}

export const player = {
  /** unit vector (world mode) */
  n: new Vector3(0, 0, 1),
  /** feet position in world space */
  pos: new Vector3(),
  up: new Vector3(0, 0, 1),
  heading: new Vector3(0, 1, 0),
  velDir: new Vector3(0, 1, 0),
  speed: 0,
  /** measured speed after collisions (drives the walk cycle) */
  moved: 0,
  moving: false,
  sprint: false,
  stride: 0,
  surface: 'grass' as Surface,
  wet: 0,
  /** cutscene lock: no input steering */
  frozen: true,
  radius: 0.5,
  visible: false,
  /** 0..1 spawn-drop animation progress; -1 = not dropping */
  drop: -1,
  /** angular velocity of heading (for banking into turns) */
  turn: 0,
  interior: null as InteriorRuntime | null,
  /** look-at target for the head (world position) or null */
  glance: null as Vector3 | null,
  /** timestamp of last movement, for idle behaviours */
  lastMoveAt: 0,
  /** click-to-walk target (world) */
  autoTarget: null as Vector3 | null,
  /** scripted glide along the surface (walking through a door) */
  script: null as null | { from: Vector3; to: Vector3; dur: number; t: number; done: () => void },
}

export const cam = {
  mode: 'intro' as 'intro' | 'flight' | 'follow' | 'focus',
  /** camera forward direction projected on the tangent plane (transported with the player) */
  fwd: new Vector3(0, 1, 0),
  /** desired pitch (radians above horizontal) and distance from the focus point */
  pitch: 0.6,
  dist: 12.5,
  zoom: 1,
  /** smoothed point the camera looks at */
  focus: new Vector3(),
  fov: 38,
  /** extra look target easing (interactions) */
  focusTarget: null as Vector3 | null,
  focusAmt: 0,
  focusDist: 8,
  focusPitch: 0.42,
  /** flight timing */
  flightT: 0,
  flightDur: 3.4,
  shake: 0,
  /** interior camera yaw limit around its default */
  interiorYaw: 0,
}
