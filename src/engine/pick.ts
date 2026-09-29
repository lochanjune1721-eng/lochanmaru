// Click / hover picking for buildings: a ray from the pointer against just the five buildings' meshes.
import { Object3D, PerspectiveCamera, Raycaster, Vector2 } from 'three'
import { PLACE_ORDER, places } from './places'
import type { PlaceId } from './store'

const ray = new Raycaster()
const ndc = new Vector2()

function ownerOf(obj: Object3D | null): PlaceId | null {
  for (let o = obj; o; o = o.parent) {
    for (const id of PLACE_ORDER) if (places[id]?.roots.includes(o)) return id
  }
  return null
}

/** Which building (if any) is under this screen position? */
export function pickPlaceAt(camera: PerspectiveCamera, sx: number, sy: number): PlaceId | null {
  const roots: Object3D[] = []
  for (const id of PLACE_ORDER) roots.push(...(places[id]?.roots ?? []))
  if (!roots.length) return null
  ndc.set((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  const hits = ray.intersectObjects(roots, true)
  for (const h of hits) {
    const id = ownerOf(h.object)
    if (id) return id
  }
  return null
}
