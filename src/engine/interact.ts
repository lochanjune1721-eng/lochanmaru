// Interactables: doors, objects, NPCs, secrets. Registered by whatever owns them; the player loop
// finds the nearest usable one each frame and the HUD shows a prompt for it.
import { Vector3 } from 'three'

export type InteractKind = 'door' | 'exit' | 'object' | 'npc' | 'secret' | 'link'

export interface Interactable {
  id: string
  /** where the prompt floats + where distance is measured from (world space) */
  anchor: Vector3
  radius: number
  label: string
  title?: string
  kind: InteractKind
  /** 'world' or an interior id */
  scope: string
  /** optional: only usable from within a cone in front of `dir` (unit, tangent-ish) */
  dir?: Vector3
  dirCos?: number
  priority?: number
  active?: () => boolean
  onUse: () => void
  /** point the camera should ease towards when this is used/focused */
  look?: Vector3
  /** called each frame while this is the nearest interactable (lets the world react: doors open, screens wake) */
  onNear?: (dist: number) => void
}

export const registry = new Set<Interactable>()

export function register(i: Interactable) {
  registry.add(i)
  return () => {
    registry.delete(i)
  }
}

const _d = new Vector3()

export function findNearest(pos: Vector3, scope: string): { item: Interactable; dist: number } | null {
  let best: Interactable | null = null
  let bestScore = Infinity
  let bestDist = 0
  for (const i of registry) {
    if (i.scope !== scope) continue
    if (i.active && !i.active()) continue
    const d = _d.copy(i.anchor).sub(pos).length()
    if (d > i.radius) continue
    if (i.dir) {
      const cos = _d.normalize().dot(i.dir)
      // player must be on the side the direction points AWAY from (i.e. in front of the door)
      if (-cos < (i.dirCos ?? 0.2)) continue
    }
    const score = d - (i.priority ?? 0) * 3
    if (score < bestScore) {
      bestScore = score
      best = i
      bestDist = d
    }
  }
  return best ? { item: best, dist: bestDist } : null
}
