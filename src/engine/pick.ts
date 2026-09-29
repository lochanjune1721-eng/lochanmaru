// Click / hover picking for buildings: a ray from the pointer against just the five buildings' meshes.
import { Material, Mesh, Object3D, PerspectiveCamera, Raycaster, Sphere, Vector2, Vector3 } from 'three'
import { R } from './planet'
import { PLACE_ORDER, places } from './places'
import type { PlaceId } from './store'

const ray = new Raycaster()
const ndc = new Vector2()
/** the planet itself, a hair under sea level: nothing beyond where a ray enters it can be what the pointer is on */
const ground = new Sphere(new Vector3(), R - 0.5)
const _hit = new Vector3()

function ownerOf(obj: Object3D | null): PlaceId | null {
  for (let o = obj; o; o = o.parent) {
    for (const id of PLACE_ORDER) if (places[id]?.roots.includes(o)) return id
  }
  return null
}

/** Light beams, halos and glows: see-through, don't write depth, and shouldn't count as part of a building. */
function isEffect(o: Object3D) {
  const m = (o as Mesh).material as Material | Material[] | undefined
  if (!m) return false
  return (Array.isArray(m) ? m : [m]).every((x) => x.transparent && !x.depthWrite)
}

/** Which building (if any) is under this screen position? */
export function pickPlaceAt(camera: PerspectiveCamera, sx: number, sy: number): PlaceId | null {
  const roots: Object3D[] = []
  for (const id of PLACE_ORDER) roots.push(...(places[id]?.roots ?? []))
  if (!roots.length) return null
  ndc.set((sx / Math.max(1, window.innerWidth)) * 2 - 1, -(sy / Math.max(1, window.innerHeight)) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  // a ray that goes into the ground carries on through the planet and out the far side: ignore what it meets there
  const g = ray.ray.intersectSphere(ground, _hit)
  const limit = g ? ray.ray.origin.distanceTo(g) : Infinity
  const hits = ray.intersectObjects(roots, true)
  for (const h of hits) {
    if (h.distance > limit) break
    if (isEffect(h.object)) continue
    const id = ownerOf(h.object)
    if (id) return id
  }
  return null
}
