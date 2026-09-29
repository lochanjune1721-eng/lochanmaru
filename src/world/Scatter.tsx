import { useEffect, useMemo } from 'react'
import { Color, Group, InstancedMesh, Matrix4, Vector3 } from 'three'
import { worldColliders } from '../engine/collision'
import { quality } from '../engine/quality'
import { R, SEA } from '../engine/planet'
import { worldMaterial } from '../gfx/materials'
import { registerCullable } from './cull'
import { floraGeo } from './flora'
import { COLLIDE, FloraKind, Placement, generateFlora } from './scatter'
import { terrain } from './terrain'

const HEIGHT: Record<FloraKind, number> = {
  roundTree: 5,
  blossomTree: 4.6,
  cypress: 6.4,
  palm: 7,
  acacia: 4.4,
  cactus: 2.8,
  bush: 1.5,
  flowerBush: 1.5,
  rock: 1.4,
  pebbles: 0.4,
  tuft: 0.9,
  flower: 0.6,
  reed: 1.6,
  lily: 0.2,
}
const SWAY = new Set<FloraKind>(['roundTree', 'blossomTree', 'cypress', 'palm', 'acacia', 'cactus', 'bush', 'flowerBush', 'tuft', 'flower', 'reed'])
const CAST = new Set<FloraKind>(['roundTree', 'blossomTree', 'cypress', 'palm', 'acacia', 'cactus', 'bush', 'flowerBush', 'rock'])

const _x = new Vector3()
const _z = new Vector3()
const _t = new Vector3()
const _m = new Matrix4()
const _pos = new Vector3()

function matrixFor(p: Placement, kind: FloraKind, out: Matrix4) {
  const n = p.n
  _t.set(0, 1, 0).cross(n)
  if (_t.lengthSq() < 1e-4) _t.set(1, 0, 0).cross(n)
  _t.normalize()
  // rotate the reference tangent about n by yaw
  _z.copy(_t).multiplyScalar(Math.cos(p.yaw)).addScaledVector(_x.crossVectors(n, _t), Math.sin(p.yaw))
  _x.crossVectors(n, _z).normalize()
  const sx = p.s
  const sy = p.sy ?? p.s
  out.makeBasis(_x.multiplyScalar(sx), _pos.copy(n).multiplyScalar(sy), _z.multiplyScalar(sx))
  const radial = kind === 'lily' ? R + SEA + 0.05 : R + terrain(n) - 0.04
  return out.setPosition(n.x * radial, n.y * radial, n.z * radial)
}

function cellKey(n: Vector3) {
  const ix = Math.min(7, Math.floor((n.x + 1) * 4))
  const iy = Math.min(7, Math.floor((n.y + 1) * 4))
  const iz = Math.min(7, Math.floor((n.z + 1) * 4))
  return ix + iy * 8 + iz * 64
}

function build(): { group: Group; teardown: () => void } {
  const flora = generateFlora(quality.scatter)
  const group = new Group()
  group.name = 'scatter'
  const offs: (() => void)[] = []
  const tmpC = new Color()

  ;(Object.keys(flora) as FloraKind[]).forEach((kind) => {
    const list = flora[kind]
    if (!list.length) return
    const geo = floraGeo[kind]()
    const mat = worldMaterial({ sway: SWAY.has(kind) })
    const cells = new Map<number, Placement[]>()
    for (const p of list) {
      const k = cellKey(p.n)
      let a = cells.get(k)
      if (!a) cells.set(k, (a = []))
      a.push(p)
    }
    const hasColor = list.some((p) => p.color)
    cells.forEach((items) => {
      const mesh = new InstancedMesh(geo, mat, items.length)
      const center = new Vector3()
      items.forEach((p, i) => {
        mesh.setMatrixAt(i, matrixFor(p, kind, _m))
        if (hasColor) mesh.setColorAt(i, p.color ?? tmpC.set('#ffffff'))
        center.add(p.n)
      })
      center.normalize()
      let ang = 0
      for (const p of items) ang = Math.max(ang, Math.acos(Math.min(1, center.dot(p.n))))
      mesh.instanceMatrix.needsUpdate = true
      mesh.castShadow = CAST.has(kind)
      mesh.receiveShadow = true
      mesh.computeBoundingSphere()
      group.add(mesh)
      offs.push(registerCullable({ obj: mesh, n: center, ang: ang + 0.02, h: HEIGHT[kind] * 1.5 }))
    })

    const r = COLLIDE[kind]
    if (r) {
      const ex = new Vector3()
      const ez = new Vector3()
      for (const p of list) {
        ex.set(0, 1, 0).cross(p.n)
        if (ex.lengthSq() < 1e-4) ex.set(1, 0, 0).cross(p.n)
        ex.normalize()
        ez.crossVectors(p.n, ex)
        const col = worldColliders.circle(p.n, ex, ez, r * p.s, 0.4)
        offs.push(() => {
          const i = worldColliders.list.indexOf(col)
          if (i >= 0) worldColliders.list.splice(i, 1)
        })
      }
    }
  })
  return {
    group,
    teardown: () => offs.forEach((f) => f()),
  }
}

/** Every tree, flower, rock and tuft in the world. */
export function Scatter() {
  const built = useMemo(build, [])
  useEffect(() => () => built.teardown(), [built])
  return <primitive object={built.group} />
}
