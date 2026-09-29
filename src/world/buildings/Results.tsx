// RESULTS — "The Scoreboard": a slim landmark tower. A crown of giant number billboards turns slowly
// above a ticker band; the digits count up when you get close. Visible from across the planet.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, RepeatWrapping, CanvasTexture } from 'three'
import { BIG } from '../../content/results'
import { game } from '../../engine/game'
import { player } from '../../engine/state'
import { GeoBuilder } from '../../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { FONT, fitText, makeCanvas, signTexture, toTexture } from '../../gfx/text'
import { registerCullable } from '../cull'
import { POIS } from '../layout'
import { Placed, boxCollider, circleCollider, makeFrame } from '../place'
import { addBench, addLamp, addPlanter, V3 } from '../props'
import { LedScreen } from './led'
import { Door, SignBoard, useBuildingDoor } from './parts'
import { easeOutCubic, damp } from '../../engine/math'

const BASE_R = 6.4
const BASE_H = 5.6
const SHAFT_H = 20
const PORCH_Z = BASE_R + 2.6

const PANELS = [BIG[0], BIG[1], BIG[2], BIG[6]] // 300M+ views · 1B+ accounts reached · 5M+ community · 10M+ views

function buildTower() {
  const b = new GeoBuilder(61)
  b.aoHeight = 2.8
  b.ao = 0.3
  b.put(0, -2.6, 0, (b) => b.cyl(BASE_R + 0.6, BASE_R + 0.9, 3.2, 32, '#e8d7b4'))
  b.cyl(BASE_R, BASE_R + 0.05, BASE_H, 32, P.indigo, { top: '#525ab8' })
  b.put(0, 0.5, 0, (b) => b.cyl(BASE_R + 0.18, BASE_R + 0.18, 0.4, 32, P.cream))
  b.put(0, BASE_H - 0.9, 0, (b) => b.cyl(BASE_R + 0.12, BASE_R + 0.12, 0.45, 32, P.coral))
  b.put(0, BASE_H - 0.2, 0, (b) => b.cyl(BASE_R + 0.5, BASE_R + 0.3, 0.32, 32, P.marigold))
  // roof terrace + shaft
  b.put(0, BASE_H + 0.12, 0, (b) => b.cyl(BASE_R + 0.3, BASE_R + 0.3, 0.2, 32, P.cream))
  b.put(0, BASE_H, 0, (b) => b.cyl(3.1, 3.6, SHAFT_H, 16, P.indigoDeep, { top: '#3a4092' }))
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    b.push().rotY(a).at(0, BASE_H + 1.5, 3.28).box(0.16, SHAFT_H - 3.2, 0.09, '#fff2c9', { glow: 0.85, ao: 0 }).pop()
  }
  for (const y of [BASE_H + 4.2, BASE_H + SHAFT_H - 0.6]) b.put(0, y, 0, (b) => b.cyl(3.7, 3.7, 0.5, 16, P.coral))
  // crown
  b.put(0, BASE_H + SHAFT_H, 0, (b) => b.cyl(4.2, 3.2, 0.9, 16, P.indigo))
  b.put(0, BASE_H + SHAFT_H + 0.9, 0, (b) => b.cone(3.3, 4.6, 16, P.coral, { top: '#ff9a82' }))
  b.put(0, BASE_H + SHAFT_H + 5.4, 0, (b) => b.cyl(0.07, 0.14, 3.0, 6, P.gold))
  b.put(0, BASE_H + SHAFT_H + 8.5, 0, (b) => b.sphere(0.34, '#fff2c9', { glow: 1 }, 10, 8))
  // battlement on the base terrace
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2
    b.push().rotY(a).at(0, BASE_H + 0.25, BASE_R + 0.15).box(0.9, 0.7, 0.36, P.cream).pop()
  }
  // windows around the drum (not the front)
  for (const deg of [-62, 62, -108, 108, 150, -150, 180]) {
    const a = (deg * Math.PI) / 180
    b.push().rotY(a).at(0, 1.7, BASE_R - 0.05)
    b.arch(1.5, 2.6, 0.24, P.cream)
    b.put(0, 0.05, 0.14, (b) => b.arch(1.15, 2.3, 0.1, '#2a1b33', { glow: 0.55, ao: 0 }))
    b.pop()
  }
  // porch
  b.put(0, 0, PORCH_Z - 1.6, (b) => b.box(5.4, BASE_H, 3.2, P.cream, { top: '#fff4de' }))
  b.put(0, BASE_H - 0.9, PORCH_Z - 1.6, (b) => b.box(5.65, 0.5, 3.45, P.coral))
  b.put(0, BASE_H - 0.15, PORCH_Z - 1.6, (b) => b.box(5.95, 0.32, 3.7, P.marigold))
  b.put(0, 4.45, PORCH_Z + 0.03, (b) => b.box(4.55, 1.25, 0.16, P.indigoDeep))
  b.put(0, 0, PORCH_Z + 0.5, (b) => b.box(4.2, 0.22, 1.5, '#ead6b0'))
  b.put(0, 0, PORCH_Z + 0.95, (b) => b.box(4.7, 0.11, 1.0, '#f3e4c4'))
  for (const x of [-2.0, 2.0]) {
    b.put(x, 2.7, PORCH_Z + 0.12, (b) => b.cyl(0.05, 0.05, 0.9, 5, P.ink))
    b.put(x, 3.15, PORCH_Z + 0.12, (b) => b.box(0.38, 0.5, 0.38, P.marigold, { glow: 0.85, ao: 0 }))
    b.put(x, 3.65, PORCH_Z + 0.12, (b) => b.cone(0.3, 0.32, 4, P.ink))
  }
  return b.build()
}

function buildCrown() {
  // four billboard frames on struts; rotates as a unit
  const b = new GeoBuilder(62)
  b.ao = 0
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2
    b.push().rotY(a)
    b.put(0, 0, 4.7, (b) => b.boxC(6.6, 6.6, 0.4, P.ink))
    b.put(0, 0, 4.55, (b) => b.boxC(7.0, 7.0, 0.16, P.coral))
    for (const y of [-2.4, 2.4]) b.bar([0, y, 3.2], [0, y, 4.55], 0.12, 6, P.ink)
    b.pop()
  }
  b.cyl(0.9, 0.9, 0.0001, 4, P.ink)
  return b.build()
}

function buildRings() {
  const b = new GeoBuilder(63)
  b.ao = 0
  b.torus(4.4, 0.13, P.marigold, { glow: 0.9 }, Math.PI * 2, 6, 48)
  return b.build()
}

function tickerTexture() {
  const W = 4096
  const H = 128
  const { c, g } = makeCanvas(W, H)
  g.fillStyle = '#1b1838'
  g.fillRect(0, 0, W, H)
  g.textBaseline = 'middle'
  g.font = `900 78px ${FONT.display}`
  const items = BIG.map((b) => `${b.value} ${b.label}`)
  const sep = '   ✦   '
  let text = items.join(sep) + sep
  let x = 30
  const total = () => g.measureText(text).width
  while (x < W) {
    g.fillStyle = '#ffe3a1'
    g.fillText(text, x, H / 2 + 4)
    x += total()
    if (total() < 100) break
  }
  const t = toTexture(c, 4) as CanvasTexture
  t.wrapS = RepeatWrapping
  return t
}

export function Results() {
  const poi = POIS.results
  const frame = useMemo(() => makeFrame(poi.x, poi.z, poi.yaw), [poi])
  const geo = useMemo(buildTower, [])
  const crownGeo = useMemo(buildCrown, [])
  const ringGeo = useMemo(buildRings, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffd27a', 0.8), [])
  const haloCoral = useMemo(() => glowSpriteMaterial('#ff8f7a', 0.28), [])
  const root = useRef<Group>(null)
  const crown = useRef<Group>(null)
  const rings = useRef<Group[]>([])
  const beacon = useRef<Mesh>(null)
  const wake = useRef(0)
  const ringMats = useMemo(() => ['#ffe3a1', '#ff9a82', '#ffe3a1'].map((c) => new MeshBasicMaterial({ color: c, toneMapped: false })), [])
  const tick = useMemo(tickerTexture, [])
  const tickMat = useMemo(() => new MeshBasicMaterial({ map: tick, toneMapped: false, side: DoubleSide }), [tick])
  const tickGeo = useMemo(() => new CylinderGeometry(BASE_R + 0.08, BASE_R + 0.08, 0.95, 64, 1, true), [])
  const sign = useMemo(() => signTexture({ text: 'RESULTS', sub: 'THE SCALE OF IT', w: 1024, h: 300, bg: P.marigold, border: P.indigoDeep, color: P.indigoDeep, subColor: P.indigo }), [])
  const court = useMemo(() => {
    const b = new GeoBuilder(64)
    const glows: V3[] = []
    glows.push(addLamp(b, -4.4, PORCH_Z + 1.8), addLamp(b, 4.4, PORCH_Z + 1.8))
    addPlanter(b, -3.1, PORCH_Z + 0.5, 1, P.coral)
    addPlanter(b, 3.1, PORCH_Z + 0.5, 1, P.marigold)
    addBench(b, -6.6, PORCH_Z + 5.0, Math.PI / 2 - 0.5)
    return { geo: b.build(), glows }
  }, [])
  const courtHalo = useMemo(() => glowSpriteMaterial('#ffbf5a', 0.85), [])

  useBuildingDoor({ id: 'results', label: poi.label, color: '#3e4392', frame, doorZ: PORCH_Z + 0.16, lookY: 2.0 })

  useEffect(() => {
    const offs = [
      circleCollider(frame, 0, 0, BASE_R + 0.4, 30),
      boxCollider(frame, 0, PORCH_Z - 1.6, 2.8, 1.7, 8),
      circleCollider(frame, -4.4, PORCH_Z + 1.8, 0.35, 3),
      circleCollider(frame, 4.4, PORCH_Z + 1.8, 0.35, 3),
      circleCollider(frame, -3.1, PORCH_Z + 0.5, 0.5, 2),
      circleCollider(frame, 3.1, PORCH_Z + 0.5, 0.5, 2),
      registerCullable({ obj: root.current!, n: frame.n, ang: 0.42, h: 40 }),
    ]
    return () => offs.forEach((f) => f())
  }, [frame])

  const panelDraw = useMemo(
    () =>
      PANELS.map((p) => (g: CanvasRenderingContext2D, t: number, w: number, h: number) => {
        const k = easeOutCubic(Math.min(1, wake.current))
        const grd = g.createLinearGradient(0, 0, w, h)
        grd.addColorStop(0, '#1b1838')
        grd.addColorStop(1, '#3e4392')
        g.fillStyle = grd
        g.fillRect(0, 0, w, h)
        g.fillStyle = 'rgba(255,255,255,0.04)'
        for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 3)
        // shimmer sweep
        const sx = ((t * 0.35) % 1.6) * w - 0.3 * w
        const sh = g.createLinearGradient(sx - 90, 0, sx + 90, 0)
        sh.addColorStop(0, 'rgba(255,255,255,0)')
        sh.addColorStop(0.5, 'rgba(255,240,200,0.10)')
        sh.addColorStop(1, 'rgba(255,255,255,0)')
        g.fillStyle = sh
        g.fillRect(0, 0, w, h)
        const decimals = (p.value.split('.')[1] || '').replace(/\D.*/, '').length
        const shown = (p.num * k).toFixed(decimals) + p.suffix
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillStyle = '#ffe3a1'
        const s = fitText(g, shown, w - 90, 300, 900, FONT.display, 60)
        g.font = `900 ${s}px ${FONT.display}`
        g.fillText(shown, w / 2, h * 0.44)
        g.fillStyle = '#fff8ea'
        ;(g as any).letterSpacing = '10px'
        const ls = fitText(g, p.label, w - 110, 58, 500, FONT.mono, 24)
        g.font = `500 ${ls}px ${FONT.mono}`
        g.fillText(p.label, w / 2, h * 0.76)
        ;(g as any).letterSpacing = '0px'
        g.strokeStyle = 'rgba(255,227,161,0.55)'
        g.lineWidth = 6
        g.strokeRect(26, 26, w - 52, h - 52)
      }),
    [],
  )

  useFrame((_, dt) => {
    const t = game.time
    const d = player.pos.distanceTo(frame.base)
    wake.current = damp(wake.current, game.mode === 'world' && d < 48 ? 1.35 : 0, d < 48 ? 0.9 : 0.5, Math.min(dt, 0.05))
    if (crown.current) crown.current.rotation.y = t * 0.22
    rings.current.forEach((r, i) => {
      if (!r) return
      r.rotation.x = 1.1 + Math.sin(t * 0.5 + i) * 0.5
      r.rotation.y = t * (0.6 + i * 0.35) * (i % 2 ? -1 : 1)
    })
    if (beacon.current) {
      const s = 1 + Math.sin(t * 3) * 0.25
      beacon.current.scale.setScalar(s)
    }
    tick.offset.x = -t * 0.018
  })

  return (
    <Placed frame={frame}>
      <group ref={root}>
        <mesh geometry={geo} material={mat} castShadow receiveShadow />
        <Door id="results" width={2.3} height={3.2} color={P.marigold} dark="#c98d2a" position={[0, 0.02, PORCH_Z + 0.16]} frame={frame} localZ={PORCH_Z + 0.16} />
        <SignBoard map={sign} w={4.3} h={1.1} position={[0, 4.45, PORCH_Z + 0.13]} />
        <mesh geometry={tickGeo} material={tickMat} position={[0, 2.45, 0]} rotation={[0, 0, 0]} />
        <group ref={crown} position={[0, BASE_H + 9.2, 0]}>
          <mesh geometry={crownGeo} material={mat} castShadow />
          {PANELS.map((p, k) => {
            const a = (k * Math.PI) / 2
            return (
              <group key={p.id} rotation={[0, a, 0]}>
                <LedScreen w={6.2} h={6.2} position={[0, 0, 4.92]} draw={panelDraw[k]} fps={9} texW={512} texH={512} range={95} />
              </group>
            )
          })}
        </group>
        <group position={[0, BASE_H + SHAFT_H + 3.2, 0]}>
          {[0, 1, 2].map((i) => (
            <group key={i} ref={(g) => { if (g) rings.current[i] = g }} scale={1 + i * 0.22}>
              <mesh geometry={ringGeo} material={ringMats[i]} />
            </group>
          ))}
        </group>
        <mesh ref={beacon} position={[0, BASE_H + SHAFT_H + 8.5, 0]}>
          <sphereGeometry args={[0.001, 4, 4]} />
          <meshBasicMaterial visible={false} />
          <sprite material={halo} scale={[9, 9, 1]} />
        </mesh>
        <sprite material={haloCoral} position={[0, BASE_H + 9.2, 0]} scale={[13, 13, 1]} />
        <mesh geometry={court.geo} material={mat} castShadow receiveShadow />
        {court.glows.map((g, i) => (
          <sprite key={i} material={courtHalo} position={g} scale={[2.6, 2.6, 1]} />
        ))}
      </group>
    </Placed>
  )
}

