import { useMemo } from 'react'
import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from 'three'
import { noise3 } from '../engine/math'
import { R } from '../engine/planet'
import { worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { getPaths } from './layout'
import { terrain } from './terrain'

const cCenter = new Color(P.pathA)
const cEdge = new Color(P.pathB)
const cLip = new Color('#c9a874')

/** Sand-coloured ribbons hugging the ground: wobbly hand-cut edges, a darker worn lip. */
function buildRibbons(): BufferGeometry {
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const up = new Vector3()
  const tan = new Vector3()
  const side = new Vector3()
  const p = new Vector3()
  const tmp = new Vector3()
  const CROSS = [-1.08, -1, -0.78, 0, 0.78, 1, 1.08]
  const COLS = [cLip, cEdge, cCenter, cCenter, cCenter, cEdge, cLip]

  for (const path of getPaths()) {
    const pts = path.pts
    const base = pos.length / 3
    for (let i = 0; i < pts.length; i++) {
      up.copy(pts[i])
      const a = pts[Math.max(0, i - 1)]
      const b = pts[Math.min(pts.length - 1, i + 1)]
      tan.copy(b).sub(a)
      tan.addScaledVector(up, -tan.dot(up)).normalize()
      side.crossVectors(up, tan).normalize()
      const half = path.def.width / 2
      // taper the very ends so paths melt into the plaza/forecourts
      const endFade = Math.min(1, path.cum[i] / 2.5, (path.cum[path.cum.length - 1] - path.cum[i]) / 2.5)
      const wob = 1 + 0.09 * noise3(up.x * 21 + 3, up.y * 21, up.z * 21)
      for (let k = 0; k < CROSS.length; k++) {
        const off = CROSS[k] * half * wob * (0.72 + 0.28 * endFade)
        p.copy(up).multiplyScalar(R).addScaledVector(side, off).normalize()
        const h = terrain(p) + 0.045 + (Math.abs(CROSS[k]) > 1.05 ? -0.01 : 0)
        tmp.copy(p).multiplyScalar(R + h)
        pos.push(tmp.x, tmp.y, tmp.z)
        const c = COLS[k]
        col.push(c.r, c.g, c.b)
      }
    }
    const W = CROSS.length
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < W - 1; k++) {
        const a = base + i * W + k
        const b = a + 1
        const c = a + W
        const d = c + 1
        idx.push(a, c, b, b, c, d)
      }
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

export function Paths() {
  const geo = useMemo(buildRibbons, [])
  const mat = useMemo(() => {
    const m = worldMaterial({ ground: true, rim: false, double: true, decal: true })
    return m
  }, [])
  return <mesh geometry={geo} material={mat} receiveShadow renderOrder={1} />
}
