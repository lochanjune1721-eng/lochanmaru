// The five buildings as places you can open. Each registers where it stands and how the camera should frame it;
// opening one eases the camera round to a three-quarter view and slides its page in, closing it eases back.
import type { Object3D, PerspectiveCamera, Vector3 } from 'three'
import type { Frame3 } from '../world/place'
import { bus } from './bus'
import { input } from './input'
import { cam, player } from './state'
import { PlaceId, store } from './store'

export const PLACE_ORDER: PlaceId[] = ['home', 'experience', 'work', 'results', 'hire']

export interface Place {
  id: PlaceId
  label: string
  color: string
  frame: Frame3
  /** ground point in front of the door */
  door: Vector3
  /** unit vector on the sphere a few steps in front of the door (used by tests / teleports) */
  outN: Vector3
  /** tangent direction pointing away from the building at outN */
  outDir: Vector3
  /** the door itself (head height), for glances */
  doorLook: Vector3
  /** what the camera looks at when this page is open */
  focus: Vector3
  /** camera distance from `focus`, its pitch (radians above the horizon) and how far round from straight-on it sits */
  dist: number
  pitch: number
  yaw: number
  /** where the floating name tag hangs (just above the entrance sign) */
  labelAt: Vector3
  /** the building's meshes, for click / hover picking */
  roots: Object3D[]
}

export const places: Partial<Record<PlaceId, Place>> = {}

/** A name tag under the pointer / keyboard focus (the ray-cast hover can't see it: it sits above the canvas). */
export const hoverTag = { id: null as PlaceId | null }

/** The live camera, shared with code that lives outside the React tree (prompts, picking, journeys). */
export const stage = { camera: null as PerspectiveCamera | null }

// ---- door animation state (read by <Door/>) --------------------------------------------------------------
export const doorState: Record<string, { open: number; force: boolean }> = {}
export const getDoor = (id: string) => (doorState[id] ??= { open: 0, force: false })

// ---- opening + closing pages --------------------------------------------------------------------------------
let prevEnabled = true

export function openPage(id: PlaceId, section?: string) {
  const place = places[id]
  const st = store.getState()
  if (!place || st.phase !== 'playing') return
  const wasOpen = st.page
  if (wasOpen && wasOpen !== id) getDoor(wasOpen).force = false
  st.set({ page: id, pageSection: section ?? null, prompt: null, hoverPlace: null, helpOpen: false })
  st.markVisited(id)
  // the name tags unmount without a pointer-leave, and a key that opened the page must not also "use" something
  hoverTag.id = null
  input.interact = false
  if (!wasOpen) {
    prevEnabled = input.enabled
    input.enabled = false
    input.keys.clear()
    input.stick.set(0, 0)
  }
  player.autoTarget = null
  player.glance = null
  cam.place = place
  getDoor(id).force = true
  bus.emit('page', 'open', id)
}

export function closePage() {
  const st = store.getState()
  const id = st.page
  if (!id) return
  // the section is kept until the sheet has slid away, so its content doesn't change under the exit animation
  st.set({ page: null })
  hoverTag.id = null
  input.interact = false
  input.enabled = prevEnabled
  setTimeout(() => {
    const now = store.getState()
    if (now.page !== id) getDoor(id).force = false
    if (!now.page) now.set({ pageSection: null })
  }, 750)
  bus.emit('page', 'close', id)
}

/** Move within the open page (a case study, a chapter …); null goes back to the page's overview. */
export function setSection(section: string | null) {
  const st = store.getState()
  if (!st.page || st.pageSection === section) return
  st.set({ pageSection: section })
  bus.emit('page', 'section', st.page)
}

/** Go to the previous / next building's page (the camera glides round the planet to it). */
export function stepPage(dir: 1 | -1) {
  const cur = store.getState().page
  if (!cur) return
  const i = PLACE_ORDER.indexOf(cur)
  openPage(PLACE_ORDER[(i + dir + PLACE_ORDER.length) % PLACE_ORDER.length])
}
