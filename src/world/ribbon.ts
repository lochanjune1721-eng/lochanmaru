// Ground-hugging ribbons: timeline pavement, red carpets, rings. Built on the sphere so they follow the curve.
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'
import { R } from '../engine/planet'
import { terrain } from './terrain'

export interface RibbonOpts {
  /** points along the centre-line as unit vectors */
  pts: Vector3[]
  width: number
  lift?: number
  /** cross-section: offsets in [-1, 1] and colours; UV v runs 0..1 across */
  cross?: { at: number; color: Color }[]
  /** metres of ribbon per unit of u (u runs 0..total/uLen) */
  uLen?: number
  /** flip the v texture coordinate (so text reads from the other side) */
  flipV?: boolean
}

export function ribbon({ pts, width, lift = 0.05, cross, uLen, flipV }: RibbonOpts): BufferGeometry {
  const cs = cross ?? [
    { at: -1, color: new Color('#ffffff') },
    { at: 1, color: new Color('#ffffff') },
  ]
  const pos: number[] = []
  const col: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const up = new Vector3()
  const tan = new Vector3()
  const side = new Vector3()
  const p = new Vector3()
  let total = 0
  const cum = [0]
  for (let i = 1; i < pts.length; i++) {
    total += Math.acos(Math.min(1, pts[i - 1].dot(pts[i]))) * R
    cum.push(total)
  }
  for (let i = 0; i < pts.length; i++) {
    up.copy(pts[i])
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    tan.copy(b).sub(a)
    tan.addScaledVector(up, -tan.dot(up)).normalize()
    side.crossVectors(up, tan).normalize()
    for (let k = 0; k < cs.length; k++) {
      p.copy(up).multiplyScalar(R).addScaledVector(side, cs[k].at * width * 0.5).normalize()
      const r = R + terrain(p) + lift
      pos.push(p.x * r, p.y * r, p.z * r)
      col.push(cs[k].color.r, cs[k].color.g, cs[k].color.b)
      uv.push(uLen ? cum[i] / uLen : cum[i] / total, flipV ? 1 - (cs[k].at + 1) / 2 : (cs[k].at + 1) / 2)
    }
  }
  const W = cs.length
  for (let i = 0; i < pts.length - 1; i++)
    for (let k = 0; k < W - 1; k++) {
      const a = i * W + k
      idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}
