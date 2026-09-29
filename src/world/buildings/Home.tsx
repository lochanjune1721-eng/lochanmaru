// WHO AM I — a cosy round tower-house with chhatri pavilions, a marigold onion dome, and a giant
// slowly-turning "?" you can see from across the planet.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Group } from 'three'
import { game } from '../../engine/game'
import { GeoBuilder } from '../../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { signTexture } from '../../gfx/text'
import { POIS } from '../layout'
import { Placed, boxCollider, circleCollider, makeFrame } from '../place'
import { registerCullable } from '../cull'
import { Door, SignBoard, usePlace } from './parts'
import { Forecourt } from './Forecourt'

const R1 = 5.4
const H1 = 5.6
const R2 = 3.9
const H2 = 3.1
const PORCH_Z = 6.9

function windowArch(b: GeoBuilder, angle: number, y: number, radius: number, w: number, h: number) {
  b.push().rotY(angle).at(0, y, radius - 0.06)
  b.arch(w + 0.55, h + 0.4, 0.22, P.cream)
  b.put(0, 0.05, 0.13, (b) => b.arch(w, h, 0.1, '#2a1b33', { glow: 0.5, ao: 0 }))
  b.put(0, h * 0.36, 0.2, (b) => b.box(w, 0.06, 0.05, P.cream, { ao: 0 }))
  b.put(0, 0.05, 0.2, (b) => b.box(0.06, h * 0.7, 0.05, P.cream, { ao: 0 }))
  b.put(0, -0.02, 0.2, (b) => b.box(w + 0.7, 0.18, 0.4, P.cream, { ao: 0 }))
  b.pop()
}

function chhatri(b: GeoBuilder, x: number, y: number, z: number) {
  b.push().at(x, y, z)
  for (const [px, pz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) b.put(px, 0, pz, (b) => b.cyl(0.09, 0.11, 1.5, 6, P.cream))
  b.put(0, 1.5, 0, (b) => b.box(1.5, 0.16, 1.5, P.cream))
  b.put(0, 1.66, 0, (b) => b.onion(0.85, 1.25, P.marigold, {}, 12))
  b.put(0, 2.9, 0, (b) => b.sphere(0.09, P.gold, {}, 6, 5))
  b.pop()
}

function buildHome() {
  const b = new GeoBuilder(41)
  b.aoHeight = 2.2
  b.ao = 0.3
  // plinth (sunk below ground so it hugs the curve)
  b.put(0, -1.5, 0, (b) => b.cyl(R1 + 0.7, R1 + 0.9, 2.1, 20, '#efdcbc'))
  // ground-floor drum
  b.cyl(R1, R1 + 0.06, H1, 22, P.cream, { top: '#fff4de' })
  // terracotta band + cornice
  b.put(0, H1 - 0.85, 0, (b) => b.cyl(R1 + 0.08, R1 + 0.08, 0.5, 22, P.terracotta))
  b.put(0, H1 - 0.15, 0, (b) => b.cyl(R1 + 0.35, R1 + 0.2, 0.3, 22, P.marigold))
  // crenellations on the terrace edge
  const N = 22
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2
    b.push().rotY(a).at(0, H1 + 0.15, R1 + 0.12).box(0.78, 0.75, 0.32, P.cream).pop()
  }
  // upper drum
  b.put(0, H1, 0, (b) => b.cyl(R2, R2 + 0.05, H2, 20, P.cream, { top: '#fff4de' }))
  b.put(0, H1 + H2 - 0.5, 0, (b) => b.cyl(R2 + 0.06, R2 + 0.06, 0.4, 20, P.terracotta))
  b.put(0, H1 + H2 - 0.1, 0, (b) => b.cyl(R2 + 0.4, R2 + 0.22, 0.28, 20, P.marigold))
  // big onion dome
  b.put(0, H1 + H2 + 0.18, 0, (b) => b.onion(R2 + 0.2, 5.4, P.marigold, { top: '#ffd76a' }, 22))
  b.put(0, H1 + H2 + 5.4, 0, (b) => b.cyl(0.05, 0.12, 1.3, 6, P.gold))
  b.put(0, H1 + H2 + 6.7, 0, (b) => b.sphere(0.2, P.gold, { glow: 0.3 }, 8, 6))
  // dome ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    b.push().rotY(a).at(0, H1 + H2 + 0.35, R2 + 0.15).rotX(-0.02).box(0.09, 0.09, 0.09, P.terracotta).pop()
  }
  // chhatri pavilions on the terrace
  for (const a of [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4]) {
    chhatri(b, Math.sin(a) * 4.75, H1 + 0.02, Math.cos(a) * 4.75)
  }
  // windows: ground floor (skip the porch side) and upper floor
  for (const deg of [-70, 70, -118, 118, 180]) windowArch(b, (deg * Math.PI) / 180, 1.45, R1, 1.25, 2.5)
  for (const deg of [0, 60, 120, 180, 240, 300]) windowArch(b, (deg * Math.PI) / 180, H1 + 0.55, R2, 0.95, 1.9)

  // ---- porch ----------------------------------------------------------------------------------
  b.put(0, 0, 5.3, (b) => b.box(5.4, H1, 3.3, P.cream, { top: '#fff4de' }))
  b.put(0, H1 - 0.85, 5.3, (b) => b.box(5.62, 0.5, 3.5, P.terracotta))
  b.put(0, H1 - 0.15, 5.3, (b) => b.box(5.9, 0.32, 3.7, P.marigold))
  for (let i = -3; i <= 3; i++) b.put(i * 0.9, H1 + 0.15, PORCH_Z - 0.05, (b) => b.box(0.62, 0.55, 0.3, P.cream))
  b.put(0, H1 + 0.15, 5.3, (b) => b.box(4.6, 0.3, 2.6, P.cream))
  b.put(0, H1 + 0.42, 5.3, (b) => b.onion(1.55, 2.5, P.marigold, {}, 14))
  b.put(0, H1 + 2.85, 5.3, (b) => b.sphere(0.11, P.gold, {}, 6, 5))
  // sign frame (the board itself is a textured plane)
  b.put(0, 4.52, PORCH_Z + 0.03, (b) => b.box(4.45, 1.22, 0.16, P.woodDark))
  // steps
  b.put(0, 0, PORCH_Z + 0.5, (b) => b.box(4.2, 0.22, 1.5, '#ead6b0'))
  b.put(0, 0, PORCH_Z + 0.95, (b) => b.box(4.7, 0.11, 1.0, '#f3e4c4'))
  // lanterns beside the door
  for (const x of [-2.0, 2.0]) {
    b.put(x, 2.7, PORCH_Z + 0.12, (b) => b.cyl(0.05, 0.05, 0.9, 5, P.ink))
    b.put(x, 3.15, PORCH_Z + 0.12, (b) => b.box(0.38, 0.5, 0.38, P.marigold, { glow: 0.85, ao: 0 }))
    b.put(x, 3.65, PORCH_Z + 0.12, (b) => b.cone(0.3, 0.32, 4, P.ink))
  }
  return b.build()
}

/** The "?" — extruded from a torus arc + stem + dot so it reads from any side. */
function buildMark() {
  const b = new GeoBuilder(42)
  b.ao = 0
  const c = P.saffron
  const o = { glow: 0.55 }
  b.push().rotZ((-40 * Math.PI) / 180).torus(1.05, 0.36, c, o, (250 * Math.PI) / 180, 8, 28).pop()
  const a = (-40 * Math.PI) / 180
  const ex = Math.cos(a) * 1.05
  const ey = Math.sin(a) * 1.05
  b.bar([ex, ey, 0], [0.05, -1.55, 0], 0.36, 10, c, o)
  b.push().at(ex, ey, 0).sphere(0.36, c, o, 10, 8).pop()
  b.push().at(0.05, -1.55, 0).sphere(0.36, c, o, 10, 8).pop()
  b.push().at(0, -2.55, 0).sphere(0.46, c, o, 12, 9).pop()
  return b.build()
}

export function Home() {
  const poi = POIS.home
  const frame = useMemo(() => makeFrame(poi.x, poi.z, poi.yaw), [poi])
  const geo = useMemo(buildHome, [])
  const markGeo = useMemo(buildMark, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const signTex = useMemo(
    () => signTexture({ text: 'WHO AM I', sub: 'START HERE', w: 1024, h: 260, bg: P.terracotta, border: P.cream, color: P.cream, subColor: '#ffd9a8', family: "'Fraunces', serif", weight: 900 }),
    [],
  )
  const mark = useRef<Group>(null)
  const halo = useMemo(() => glowSpriteMaterial('#ffb84a', 0.75), [])
  const root = useRef<Group>(null)

  usePlace({ id: 'home', label: poi.label, color: '#f2a33c', frame, roots: [root], doorZ: PORCH_Z, focus: [0, 9.5, 2], dist: 46, pitch: 0.3, yaw: 0.45, tag: [0, 7.6, PORCH_Z + 1] })

  useEffect(() => {
    const offs = [
      circleCollider(frame, 0, 0, R1 + 0.25, 12),
      boxCollider(frame, 0, 5.3, 2.75, 1.75, 8),
    ]
    const off2 = registerCullable({ obj: root.current!, n: frame.n, ang: 0.32, h: 27 })
    return () => {
      offs.forEach((f) => f())
      off2()
    }
  }, [frame])

  useFrame(() => {
    const m = mark.current
    if (!m) return
    const t = game.time
    m.rotation.y = t * 0.55
    m.position.y = 20.4 + Math.sin(t * 1.1) * 0.35
  })

  return (
    <Placed frame={frame}>
      <group ref={root}>
        <mesh geometry={geo} material={mat} castShadow receiveShadow />
        <Door id="home" width={2.3} height={3.35} position={[0, 0.02, PORCH_Z]} frame={frame} localZ={PORCH_Z} />
        <SignBoard map={signTex} w={4.2} h={1.06} position={[0, 4.52, PORCH_Z + 0.13]} />
        <group ref={mark} position={[0, 20.4, 0]}>
          <mesh geometry={markGeo} material={mat} castShadow />
          <sprite material={halo} scale={[9, 9, 1]} position={[0, -0.6, 0]} />
        </group>
        <Forecourt frame={frame} z={PORCH_Z} kind="home" />
      </group>
    </Placed>
  )
}
