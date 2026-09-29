// EXPERIENCE interior — geometry for the clock hands (kept apart so the room file stays readable).
import { GeoBuilder } from '../gfx/geo'

/** a clock hand pointing up from its pivot; `cap` adds a brass boss at the pivot */
export function buildHandGeo(len: number, w: number, color: string, cap = false) {
  const b = new GeoBuilder(79)
  b.ao = 0
  b.box(w, len, 0.05, color, { ao: 0 })
  b.put(0, len, 0, (b) => b.cone(w * 1.3, 0.22, 3, color, { ao: 0 }))
  b.put(0, -0.24, 0, (b) => b.box(w * 0.8, 0.24, 0.05, color, { ao: 0 }))
  if (cap) b.put(0, 0, 0.04, (b) => b.sphere(0.11, '#e9b04c', { ao: 0 }, 10, 8))
  return b.build()
}
