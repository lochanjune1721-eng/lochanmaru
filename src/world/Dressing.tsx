// Everything that makes the outside feel lived in between the five buildings: lamps and benches along the paths,
// signposts, the pier + rowboat on the arrival beach, the windmill and a handful of tiny secrets to find.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, DoubleSide, Group, MeshBasicMaterial, PointsMaterial, Vector3 } from 'three'
import { game } from '../engine/game'
import { register } from '../engine/interact'
import { SEA, mapToN, surfaceDistance } from '../engine/planet'
import { store } from '../engine/store'
import { GeoBuilder } from '../gfx/geo'
import { glowTexture, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { FONT, makeCanvas, roundRect, toTexture } from '../gfx/text'
import { DOCK, LANDMARKS, PLAZA, POI_LIST, SECRET_SPOTS, getPaths } from './layout'
import { Frame3, Placed, boxCollider, circleCollider, makeFrame } from './place'
import { addBench, addCrate, addLamp } from './props'
import { shoreDistance, terrain } from './terrain'

const plazaN = mapToN(PLAZA.x, PLAZA.z)
const poiNs = POI_LIST.map((p) => ({ n: mapToN(p.x, p.z), foot: p.foot }))

// ---- shared bits ------------------------------------------------------------------------------------------
let glowMap: ReturnType<typeof glowTexture> | null = null
function GlowPoints({ positions, color = '#ffc46a', size = 3.6, opacity = 0.85 }: { positions: Vector3[]; color?: string; size?: number; opacity?: number }) {
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry()
    const arr = new Float32Array(positions.length * 3)
    positions.forEach((p, i) => p.toArray(arr, i * 3))
    g.setAttribute('position', new BufferAttribute(arr, 3))
    g.computeBoundingSphere()
    glowMap ??= glowTexture()
    const m = new PointsMaterial({ map: glowMap, color, size, sizeAttenuation: true, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, fog: false })
    return { geo: g, mat: m }
  }, [positions, color, size, opacity])
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={3} />
}

const say = (id: string, text: string) => () => {
  const st = store.getState()
  st.showToast(text, st.addSecret(id) ? 'secret' : 'info')
}

// ---- path furniture: lamps + benches ----------------------------------------------------------------------------
interface Item {
  kind: 'lamp' | 'bench'
  f: Frame3
}

function planFurniture(): Item[] {
  const items: Item[] = []
  const paths = getPaths()
  for (const path of paths) {
    let next = 6.5
    let side = 1
    let k = 0
    for (let i = 1; i < path.pts.length; i++) {
      if (path.cum[i] < next) continue
      next += 9
      const m = path.map[i]
      const m0 = path.map[i - 1]
      let dx = m.x - m0.x
      let dz = m.z - m0.z
      const l = Math.hypot(dx, dz) || 1
      dx /= l
      dz /= l
      const off = path.def.width / 2 + 0.85
      const lamp = { x: m.x - dz * off * side, z: m.z + dx * off * side }
      const isBench = k % 3 === 2
      k++
      const n = mapToN(lamp.x, lamp.z)
      if (surfaceDistance(n, plazaN) < PLAZA.r + 2.6) continue
      if (poiNs.some((p) => surfaceDistance(n, p.n) < p.foot + 5.5)) continue
      if (shoreDistance(n) > -3.2 || terrain(n) < 0.05) continue
      // benches face the path
      const toPath = { x: m.x - lamp.x, z: m.z - lamp.z }
      const f = makeFrame(lamp.x, lamp.z, isBench ? Math.atan2(toPath.x, toPath.z) : 0)
      items.push({ kind: isBench ? 'bench' : 'lamp', f })
      side = -side
    }
  }
  return items
}

function PathFurniture() {
  const built = useMemo(() => {
    const items = planFurniture()
    const b = new GeoBuilder(77)
    b.aoHeight = 1.4
    const glows: Vector3[] = []
    for (const it of items) {
      b.push().apply(it.f.matrix)
      if (it.kind === 'lamp') {
        const h = addLamp(b, 0, 0, 0, 3.3)
        glows.push(it.f.toWorld(h[0], h[1], h[2]))
      } else addBench(b, 0, 0, 0)
      b.pop()
    }
    return { items, geo: b.build(), glows }
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])
  useEffect(() => {
    const offs = built.items.map((it) => (it.kind === 'lamp' ? circleCollider(it.f, 0, 0, 0.3, 3) : boxCollider(it.f, 0, 0, 1.05, 0.38, 1.2)))
    return () => offs.forEach((f) => f())
  }, [built])
  return (
    <>
      <mesh geometry={built.geo} material={mat} castShadow receiveShadow frustumCulled={false} />
      <GlowPoints positions={built.glows} size={3.4} />
    </>
  )
}

// ---- signposts ----------------------------------------------------------------------------------------------------
interface SignDef {
  path: string
  /** metres along the path (from its first point) */
  at: number
  side: 1 | -1
  front: string
  back: string
  color: string
}
const SIGNS: SignDef[] = [
  { path: 'spine', at: 8, side: 1, front: 'THE PLAZA', back: 'THE BEACH', color: '#2f9591' },
  { path: 'west', at: 4.5, side: 1, front: 'EXPERIENCE', back: 'THE PLAZA', color: '#3e4392' },
  { path: 'east', at: 4.5, side: -1, front: 'WORK', back: 'THE PLAZA', color: '#d9744f' },
  { path: 'northwest', at: 4.5, side: 1, front: 'RESULTS', back: 'THE PLAZA', color: '#7b5fd6' },
  { path: 'northeast', at: 4.5, side: -1, front: 'HIRE LOCHAN', back: 'THE PLAZA', color: '#e2493f' },
]

function plankCanvas(rows: { text: string; color: string }[]) {
  const W = 1024
  const RH = 176
  const { c, g } = makeCanvas(W, RH * rows.length)
  rows.forEach((r, i) => {
    const y = i * RH
    g.save()
    g.translate(0, y)
    g.fillStyle = '#d99a63'
    roundRect(g, 10, 14, W - 20, RH - 28, 26)
    g.fill()
    g.lineWidth = 8
    g.strokeStyle = '#7a4a38'
    roundRect(g, 10, 14, W - 20, RH - 28, 26)
    g.stroke()
    g.fillStyle = r.color
    roundRect(g, 30, 34, 120, RH - 68, 16)
    g.fill()
    // up arrow
    g.fillStyle = '#fff6e4'
    g.beginPath()
    g.moveTo(90, 50)
    g.lineTo(122, 92)
    g.lineTo(104, 92)
    g.lineTo(104, RH - 52)
    g.lineTo(76, RH - 52)
    g.lineTo(76, 92)
    g.lineTo(58, 92)
    g.closePath()
    g.fill()
    g.fillStyle = '#2b2438'
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    let size = 96
    g.font = `900 ${size}px ${FONT.display}`
    while (g.measureText(r.text).width > W - 230 && size > 30) {
      size -= 4
      g.font = `900 ${size}px ${FONT.display}`
    }
    g.fillText(r.text, 176, RH / 2 + 4)
    g.restore()
  })
  return { c, rows: rows.length, RH, W }
}

function Signposts() {
  const built = useMemo(() => {
    const paths = getPaths()
    const rows: { text: string; color: string }[] = []
    const placed: { f: Frame3; front: number; back: number }[] = []
    for (const sd of SIGNS) {
      const path = paths.find((p) => p.def.id === sd.path)
      if (!path) continue
      let i = 1
      while (i < path.pts.length - 1 && path.cum[i] < sd.at) i++
      const m = path.map[i]
      const m0 = path.map[i - 1]
      let dx = m.x - m0.x
      let dz = m.z - m0.z
      const l = Math.hypot(dx, dz) || 1
      dx /= l
      dz /= l
      const off = path.def.width / 2 + 1.35
      const x = m.x - dz * off * sd.side
      const z = m.z + dx * off * sd.side
      // the front plank faces back towards where the path starts
      const f = makeFrame(x, z, Math.atan2(-dx, -dz))
      rows.push({ text: sd.front, color: sd.color })
      rows.push({ text: sd.back, color: '#7a6a60' })
      placed.push({ f, front: rows.length - 2, back: rows.length - 1 })
    }
    const at = plankCanvas(rows)
    const tex = toTexture(at.c, 8)
    // posts (lit, merged) + planks (one atlas mesh)
    const b = new GeoBuilder(91)
    b.aoHeight = 1.2
    const pos: number[] = []
    const nor: number[] = []
    const uv: number[] = []
    const idx: number[] = []
    const w = 2.9
    const h = 0.72
    const quad = (f: Frame3, sign: 1 | -1, row: number) => {
      const z = 0.075 * sign
      const y0 = 1.62
      const y1 = y0 + h
      const x0 = -w / 2
      const x1 = w / 2
      const corners: [number, number][] = sign > 0 ? [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] : [[x1, y0], [x0, y0], [x0, y1], [x1, y1]]
      const v0 = 1 - (row + 1) / at.rows
      const v1 = 1 - row / at.rows
      const base = pos.length / 3
      const nv = f.dir(0, sign)
      corners.forEach(([cx, cy], k) => {
        const p = f.toWorld(cx, cy, z)
        pos.push(p.x, p.y, p.z)
        nor.push(nv.x, nv.y, nv.z)
        uv.push(k === 0 || k === 3 ? 0 : 1, k < 2 ? v0 : v1)
      })
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    for (const s of placed) {
      b.push().apply(s.f.matrix)
      b.cyl(0.11, 0.14, 2.7, 6, P.woodDark)
      b.put(0, 2.7, 0, (b) => b.cone(0.2, 0.26, 6, P.terracotta))
      b.put(0, 1.5, 0, (b) => b.box(0.32, 0.12, 0.3, P.woodDark))
      b.pop()
      quad(s.f, 1, s.front)
      quad(s.f, -1, s.back)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
    g.setIndex(idx)
    g.computeBoundingSphere()
    return { postGeo: b.build(), plankGeo: g, tex, placed }
  }, [])
  const postMat = useMemo(() => worldMaterial({}), [])
  const plankMat = useMemo(() => new MeshBasicMaterial({ map: built.tex, transparent: true, alphaTest: 0.35, toneMapped: false, side: DoubleSide }), [built.tex])
  useEffect(() => {
    const offs = built.placed.map((s) => circleCollider(s.f, 0, 0, 0.22, 3))
    return () => offs.forEach((f) => f())
  }, [built])
  return (
    <>
      <mesh geometry={built.postGeo} material={postMat} castShadow frustumCulled={false} />
      <mesh geometry={built.plankGeo} material={plankMat} frustumCulled={false} />
    </>
  )
}

// ---- pier + rowboat ------------------------------------------------------------------------------------------------
function Pier() {
  const n0 = useMemo(() => mapToN(DOCK.x, DOCK.z), [])
  const lift = useMemo(() => DOCK.h - terrain(n0), [n0])
  const frame = useMemo(() => makeFrame(DOCK.x, DOCK.z, Math.PI, lift), [lift])
  const built = useMemo(() => {
    const b = new GeoBuilder(131)
    b.aoHeight = 1.6
    b.ao = 0.22
    const len = DOCK.len
    // deck boards
    for (let z = 0.35, i = 0; z < len; z += 0.66, i++) {
      b.stand(0, z)
      b.put(0, -0.13, 0, (b) => b.box(DOCK.halfW * 2 + 0.2, 0.13, 0.6, i % 2 ? '#c98d5e' : '#b87a52', { tint: 0.05, ao: 0.1 }))
      b.pop()
    }
    // stringers
    for (const sx of [-1.0, 1.0]) {
      b.stand(sx, len / 2)
      b.put(0, -0.45, 0, (b) => b.box(0.22, 0.3, len + 0.2, P.woodDark, { ao: 0.05 }))
      b.pop()
    }
    // posts + rope rails
    const posts: number[] = []
    for (let z = 0.4; z <= len + 0.1; z += 2.5) posts.push(z)
    const glows: [number, number, number][] = []
    for (const sx of [-1, 1]) {
      posts.forEach((z, i) => {
        b.stand(sx * (DOCK.halfW + 0.05), z)
        b.put(0, -3.6, 0, (b) => b.cyl(0.14, 0.17, 4.6, 6, P.woodDark))
        b.put(0, 0.98, 0, (b) => b.sphere(0.13, P.terracotta, {}, 6, 5))
        b.pop()
        if (i < posts.length - 1) {
          b.stand(sx * (DOCK.halfW + 0.05), (z + posts[i + 1]) / 2)
          b.bar([0, 0.85, -1.25], [0, 0.72, 1.25], 0.035, 5, '#efe1c2', { ao: 0 })
          b.pop()
        }
      })
    }
    // lanterns on the last posts
    for (const sx of [-1, 1]) {
      const h = addLamp(b, sx * (DOCK.halfW + 0.05), len + 0.1, 0, 2.3)
      glows.push(h)
    }
    // crates and a rope coil near the start
    addCrate(b, -1.0, 1.4, 0.3, 0.9)
    addCrate(b, -1.1, 2.3, -0.2, 0.7)
    b.stand(0.9, 2.2)
    b.torus(0.32, 0.07, '#e8d9b0', {}, Math.PI * 2, 5, 14)
    b.pop()
    return { geo: b.build(), glows }
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const glowPositions = useMemo(() => built.glows.map((g) => frame.toWorld(g[0], g[1], g[2])), [built, frame])
  useEffect(() => {
    // rails: solid on both sides and at the end
    const offs = [
      boxCollider(frame, -(DOCK.halfW + 0.1), DOCK.len / 2, 0.12, DOCK.len / 2 + 0.2, 1.2),
      boxCollider(frame, DOCK.halfW + 0.1, DOCK.len / 2, 0.12, DOCK.len / 2 + 0.2, 1.2),
      boxCollider(frame, 0, DOCK.len + 0.35, DOCK.halfW + 0.2, 0.15, 1.2),
    ]
    return () => offs.forEach((f) => f())
  }, [frame])
  return (
    <>
      <Placed frame={frame}>
        <mesh geometry={built.geo} material={mat} castShadow receiveShadow />
      </Placed>
      <GlowPoints positions={glowPositions} size={3.2} />
    </>
  )
}

function Rowboat() {
  const b0 = LANDMARKS.boat
  const n0 = useMemo(() => mapToN(b0.x, b0.z), [b0])
  const frame = useMemo(() => makeFrame(b0.x, b0.z, 1.2, SEA + 0.08 - terrain(n0)), [b0, n0])
  const geo = useMemo(() => {
    const b = new GeoBuilder(141)
    b.ao = 0.16
    b.aoHeight = 0.8
    const hull = '#2f7d86'
    b.put(0, -0.3, 0, (b) => b.box(1.25, 0.28, 2.9, '#a86a45'))
    for (const sx of [-1, 1]) {
      b.put(sx * 0.68, -0.18, 0, (b) => b.rotZ(-sx * 0.42).box(0.12, 0.85, 3.05, hull))
      b.put(sx * 0.9, 0.2, 0, (b) => b.box(0.08, 0.06, 2.95, P.cream, { ao: 0 }))
    }
    b.put(0, -0.18, 1.55, (b) => b.rotY(Math.PI / 4).box(1.0, 0.85, 1.0, hull))
    b.put(0, 0.2, 1.55, (b) => b.rotY(Math.PI / 4).box(0.7, 0.06, 0.7, P.cream, { ao: 0 }))
    b.put(0, -0.18, -1.5, (b) => b.box(1.45, 0.85, 0.12, hull))
    b.put(0, 0.05, 0.15, (b) => b.box(1.3, 0.09, 0.42, '#d9a06c'))
    b.put(0, 0.05, -0.75, (b) => b.box(1.3, 0.09, 0.42, '#d9a06c'))
    // oars resting across the seats
    b.bar([-1.4, 0.35, 0.15], [1.2, 0.2, -0.15], 0.04, 5, '#c98d5e')
    b.bar([1.4, 0.35, -0.7], [-1.2, 0.2, -0.75], 0.04, 5, '#c98d5e')
    // lantern at the bow
    b.put(0, 0.2, 1.75, (b) => b.cyl(0.03, 0.03, 0.7, 4, P.ink))
    b.put(0, 0.9, 1.75, (b) => b.box(0.26, 0.3, 0.26, P.marigold, { glow: 0.9, ao: 0 }))
    return b.build()
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const ref = useRef<Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const t = game.time
    g.position.y = Math.sin(t * 1.15) * 0.07
    g.rotation.z = Math.sin(t * 0.9) * 0.05
    g.rotation.x = Math.sin(t * 0.7 + 1) * 0.03
  })
  return (
    <Placed frame={frame}>
      <group ref={ref}>
        <mesh geometry={geo} material={mat} castShadow />
      </group>
    </Placed>
  )
}

// ---- windmill ------------------------------------------------------------------------------------------------------
const spin = { boost: 0 }

function Windmill() {
  const wm = LANDMARKS.windmill
  const frame = useMemo(() => makeFrame(wm.x, wm.z, wm.yaw), [wm])
  const geo = useMemo(() => {
    const b = new GeoBuilder(151)
    b.aoHeight = 2.4
    b.ao = 0.26
    // stone footing sunk into the slope
    b.put(0, -1.6, 0, (b) => b.cyl(2.7, 2.9, 1.8, 14, '#b9a58e'))
    b.cyl(2.35, 2.7, 0.7, 14, '#efe1c7')
    b.put(0, 0.7, 0, (b) => b.cyl(1.7, 2.35, 5.2, 14, '#f6ead2', { top: '#efdcbc' }))
    b.put(0, 3.4, 0, (b) => b.cyl(2.05, 1.95, 0.32, 14, P.terracotta))
    b.put(0, 5.7, 0, (b) => b.cone(2.15, 2.6, 14, P.terracotta, { top: '#e98a62' }))
    b.put(0, 8.25, 0, (b) => b.sphere(0.16, P.gold, {}, 6, 5))
    // door, window, hub
    b.put(0, 0.5, 2.05, (b) => b.arch(1.15, 1.9, 0.3, '#3a2b3d'))
    b.put(0, 0.5, 2.12, (b) => b.arch(0.95, 1.7, 0.16, P.teal))
    b.put(0.0, 3.8, 1.72, (b) => b.arch(0.8, 1.2, 0.3, '#3a2b3d', { glow: 0.5 }))
    b.put(0, 5.15, 1.5, (b) => b.rotX(Math.PI / 2).cyl(0.28, 0.28, 0.9, 10, P.woodDark))
    return b.build()
  }, [])
  const sailGeo = useMemo(() => {
    const b = new GeoBuilder(152)
    b.ao = 0
    for (let k = 0; k < 4; k++) {
      b.push().rotZ((k * Math.PI) / 2)
      b.put(0, 0.3, 0, (b) => b.box(0.14, 4.8, 0.14, P.woodDark))
      b.put(0.5, 1.4, 0.03, (b) => b.box(0.9, 3.1, 0.05, '#fff2d8', { tint: 0.03 }))
      for (let j = 0; j < 4; j++) b.put(0.5, 1.5 + j * 0.75, 0.06, (b) => b.box(0.9, 0.05, 0.03, P.woodDark, { ao: 0 }))
      b.pop()
    }
    b.put(0, 0, 0, (b) => b.rotX(Math.PI / 2).cyl(0.34, 0.34, 0.3, 10, P.gold))
    return b.build()
  }, [])
  const mat = useMemo(() => worldMaterial({ double: true }), [])
  const sails = useRef<Group>(null)
  useFrame((_, dt) => {
    spin.boost = Math.max(0, spin.boost - dt * 0.3)
    if (sails.current) sails.current.rotation.z -= dt * (0.32 + spin.boost * 4)
  })
  useEffect(() => {
    const offs = [
      circleCollider(frame, 0, 0, 2.55, 9),
      register({
        id: 'windmill',
        anchor: frame.toWorld(0, 1.5, 3.4),
        radius: 3,
        label: 'SPIN',
        title: 'Windmill',
        kind: 'secret',
        look: frame.toWorld(0, 5.1, 1.8),
        onUse: () => {
          spin.boost = 1
          say('windmill', 'Slow and steady. This windmill has never missed a deadline.')()
        },
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [frame])
  return (
    <Placed frame={frame}>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      <group position={[0, 5.15, 2.0]} ref={sails}>
        <mesh geometry={sailGeo} material={mat} castShadow />
      </group>
    </Placed>
  )
}

// ---- tiny secrets ---------------------------------------------------------------------------------------------------------
function Secrets() {
  const s = SECRET_SPOTS
  const frames = useMemo(
    () => ({
      frog: makeFrame(s.frog.x, s.frog.z, 2.2),
      bottle: makeFrame(s.bottle.x, s.bottle.z, 0.6),
      bench: makeFrame(s.bench.x, s.bench.z, s.bench.yaw),
      cactus: makeFrame(s.cactus.x, s.cactus.z, 0.4),
    }),
    [s],
  )
  const geo = useMemo(() => {
    const b = new GeoBuilder(161)
    b.aoHeight = 1.2
    // frog's rock
    b.push().apply(frames.frog.matrix)
    b.put(0, -0.15, 0, (b) => b.blob(0.6, '#a8a2b0', { tint: 0.05 }, 1))
    b.pop()
    // message in a bottle, half sunk in the sand
    b.push().apply(frames.bottle.matrix)
    b.put(0, 0.12, 0, (b) => b.rotZ(Math.PI / 2 - 0.25).cyl(0.2, 0.2, 0.75, 8, '#9fe0d0', { glow: 0.35, ao: 0 }))
    b.put(0.32, 0.27, 0, (b) => b.rotZ(Math.PI / 2 - 0.25).cyl(0.07, 0.2, 0.3, 8, '#9fe0d0', { glow: 0.35, ao: 0 }))
    b.put(0.52, 0.32, 0, (b) => b.rotZ(Math.PI / 2 - 0.25).cyl(0.075, 0.075, 0.12, 6, '#b98a5e'))
    b.put(-0.08, 0.16, 0, (b) => b.rotZ(Math.PI / 2 - 0.25).cyl(0.1, 0.1, 0.5, 6, '#fff2d8', { ao: 0 }))
    b.pop()
    // bench by the pond
    b.push().apply(frames.bench.matrix)
    addBench(b, 0, 0, 0, '#b98a5e')
    b.pop()
    // the cactus with a face
    b.push().apply(frames.cactus.matrix)
    const g = '#4fae72'
    b.put(0, 0, 0, (b) => b.cyl(0.42, 0.52, 2.6, 10, g, { top: '#7fcf8c' }))
    b.put(0, 2.6, 0, (b) => b.sphere(0.42, '#7fcf8c', {}, 10, 7))
    b.put(-0.42, 1.2, 0, (b) => b.rotZ(Math.PI / 2).cyl(0.2, 0.2, 0.55, 8, g))
    b.put(-0.85, 1.2, 0, (b) => b.cyl(0.2, 0.2, 1.05, 8, g, { top: '#7fcf8c' }))
    b.put(0.42, 1.65, 0, (b) => b.rotZ(-Math.PI / 2).cyl(0.18, 0.18, 0.5, 8, g))
    b.put(0.78, 1.65, 0, (b) => b.cyl(0.18, 0.18, 0.8, 8, g, { top: '#7fcf8c' }))
    b.put(0, 3.0, 0.02, (b) => b.sphere(0.16, P.pink, { glow: 0.2 }, 6, 5))
    for (const sx of [-1, 1]) b.put(sx * 0.15, 1.95, 0.4, (b) => b.sphere(0.06, P.ink, {}, 5, 4))
    b.put(0, 1.72, 0.44, (b) => b.rotZ(Math.PI).torus(0.12, 0.022, P.ink, {}, Math.PI, 4, 10))
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      b.put(Math.sin(a) * 0.45, 0.6 + (i % 3) * 0.6, Math.cos(a) * 0.45, (b) => b.sphere(0.035, '#fff2d8', {}, 4, 3))
    }
    b.pop()
    return b.build()
  }, [frames])
  const frogGeo = useMemo(() => {
    const b = new GeoBuilder(162)
    b.ao = 0.1
    const gr = '#5cbf6a'
    b.put(0, 0.05, 0, (b) => b.scale(1.1, 0.75, 1.3).sphere(0.32, gr, {}, 9, 7))
    b.put(0, 0.27, 0.26, (b) => b.sphere(0.2, gr, {}, 8, 6))
    for (const sx of [-1, 1]) {
      b.put(sx * 0.13, 0.48, 0.32, (b) => b.sphere(0.09, '#fff8ea', {}, 6, 5))
      b.put(sx * 0.13, 0.5, 0.39, (b) => b.sphere(0.045, P.ink, {}, 5, 4))
      b.put(sx * 0.3, 0.0, -0.05, (b) => b.scale(0.5, 0.45, 1.2).sphere(0.2, '#49a85a', {}, 6, 5))
    }
    b.put(0, 0.2, 0.42, (b) => b.box(0.22, 0.03, 0.03, '#2d6a3a', { ao: 0 }))
    return b.build()
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const frog = useRef<Group>(null)
  const hop = useRef(-1)
  useFrame((_, dt) => {
    const g = frog.current
    if (!g) return
    if (hop.current >= 0) {
      hop.current += dt
      const t = hop.current / 0.7
      g.position.y = t < 1 ? Math.sin(t * Math.PI) * 0.9 : 0
      g.scale.set(1, t < 0.12 || t > 0.9 ? 0.75 : 1.1, 1)
      if (t > 1.05) {
        hop.current = -1
        g.scale.set(1, 1, 1)
      }
    }
  })
  useEffect(() => {
    const mk = (id: string, f: Frame3, opts: { ly: number; label: string; title: string; text: string; look?: [number, number, number]; r?: number; ax?: number; az?: number }) =>
      register({
        id,
        anchor: f.toWorld(opts.ax ?? 0, opts.ly, opts.az ?? 0.6),
        radius: opts.r ?? 2.4,
        label: opts.label,
        title: opts.title,
        kind: 'secret',
        look: f.toWorld(0, opts.look ? opts.look[1] : opts.ly, 0),
        onUse: () => {
          if (id === 'frog') hop.current = 0
          say(id, opts.text)()
        },
      })
    const offs = [
      mk('frog', frames.frog, { ly: 0.6, label: 'POKE', title: 'Frog', text: 'Ribbit. (Translation: hire the human.)', r: 2.4 }),
      mk('bottle', frames.bottle, { ly: 0.4, label: 'OPEN', title: 'Message in a bottle', text: 'Inside, a tiny note: “If you found this, say hi.”', r: 2.4 }),
      mk('bench', frames.bench, { ly: 0.9, label: 'SIT', title: 'Bench', text: 'You sat for a moment. The whole planet slowed down with you.', r: 2.6, az: 0.9 }),
      mk('cactus', frames.cactus, { ly: 1.6, label: 'HUG', title: 'Cactus', text: 'Ouch. Worth it.', r: 2.8, az: 1.2, look: [0, 1.8, 0] }),
      boxCollider(frames.bench, 0, 0, 1.05, 0.4, 1.2),
      circleCollider(frames.cactus, 0, 0, 0.7, 3),
      circleCollider(frames.frog, 0, 0, 0.55, 1),
    ]
    return () => offs.forEach((f) => f())
  }, [frames])
  return (
    <>
      <mesh geometry={geo} material={mat} castShadow receiveShadow frustumCulled={false} />
      <Placed frame={frames.frog}>
        <group ref={frog} position={[0, 0.35, 0]}>
          <mesh geometry={frogGeo} material={mat} castShadow />
        </group>
      </Placed>
    </>
  )
}

/** The lived-in parts of the outside world. */
export function Dressing() {
  return (
    <>
      <PathFurniture />
      <Signposts />
      <Pier />
      <Rowboat />
      <Windmill />
      <Secrets />
    </>
  )
}

