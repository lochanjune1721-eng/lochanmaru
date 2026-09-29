// HIRE LOCHAN — the final destination: a red-and-white lighthouse on the far headland whose beam
// sweeps across the whole planet, with a keeper's cottage, a neon sign, a mailbox and a pier.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, ConeGeometry, DoubleSide, Group, ShaderMaterial, Vector3 } from 'three'
import { register } from '../../engine/interact'
import { game } from '../../engine/game'
import { openPage } from '../../engine/places'
import { store } from '../../engine/store'
import { GeoBuilder } from '../../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { FONT, fitText, makeCanvas, roundRect, toTexture } from '../../gfx/text'
import { registerCullable } from '../cull'
import { POIS } from '../layout'
import { Placed, boxCollider, circleCollider, makeFrame, subFrame } from '../place'
import { addBench, addLamp, addMailbox, addPlanter, V3 } from '../props'
import { Door, SignBoard, usePlace } from './parts'

const TOWER_Y0 = 0.5
const TOWER_H = 15.5
const COTTAGE_Z = 5.6 // front face of the cottage
const R_BASE = 3.5
const R_TOP = 2.35

function neonTexture() {
  const W = 1024
  const H = 320
  const { c, g } = makeCanvas(W, H)
  g.fillStyle = '#17112b'
  roundRect(g, 0, 0, W, H, 34)
  g.fill()
  g.lineWidth = 10
  g.strokeStyle = '#ff5a6a'
  g.shadowColor = '#ff5a6a'
  g.shadowBlur = 26
  roundRect(g, 16, 16, W - 32, H - 32, 26)
  g.stroke()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const text = 'HIRE LOCHAN'
  const size = fitText(g, text, W - 150, 168, 900, FONT.display, 60)
  g.font = `900 ${size}px ${FONT.display}`
  // neon: wide blurred halo, then bright core
  g.shadowColor = '#ff2f5a'
  g.shadowBlur = 44
  g.fillStyle = '#ff7a8c'
  g.fillText(text, W / 2, H * 0.44)
  g.shadowBlur = 16
  g.fillStyle = '#fff1f0'
  g.fillText(text, W / 2, H * 0.44)
  g.shadowBlur = 20
  g.shadowColor = '#7fe9ff'
  g.font = `500 34px ${FONT.mono}`
  ;(g as any).letterSpacing = '9px'
  g.fillStyle = '#c8f6ff'
  g.fillText("LET'S BUILD SOMETHING", W / 2, H * 0.83)
  return toTexture(c, 8)
}

function buildLighthouse() {
  const b = new GeoBuilder(71)
  b.aoHeight = 2.6
  b.ao = 0.3
  // rocky islet: a ring of boulders + a skirt
  b.put(0, -2.4, 0, (b) => b.cyl(6.6, 7.8, 3.2, 16, '#a89484', { top: '#c9b8a6' }))
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + 0.3
    const r = 6.2 + (i % 3) * 0.7
    b.push().stand(Math.sin(a) * r, Math.cos(a) * r).scale(1.7 + (i % 4) * 0.5, 1.1 + (i % 3) * 0.4, 1.7 + (i % 2) * 0.5)
    b.blob(0.9, i % 2 ? P.stone : P.stoneDark, { top: '#e4d4c3', tint: 0.05 })
    b.pop()
  }
  // tower: alternating red / cream bands, gently tapering
  const bands = 5
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands
    const t1 = (i + 1) / bands
    const r0 = R_BASE + (R_TOP - R_BASE) * t0
    const r1 = R_BASE + (R_TOP - R_BASE) * t1
    b.put(0, TOWER_Y0 + t0 * TOWER_H, 0, (b) => b.cyl(r1, r0, TOWER_H / bands + 0.02, 20, i % 2 ? P.cream : P.red, { top: i % 2 ? '#fff6e6' : '#f2665c' }))
  }
  b.put(0, TOWER_Y0, 0, (b) => b.cyl(R_BASE + 0.3, R_BASE + 0.45, 0.5, 20, P.stoneDark))
  // little windows
  for (const [y, a] of [[3.2, 0.5], [6.6, 3.6], [10.0, 1.4], [12.8, 4.6]] as [number, number][]) {
    const rr = R_BASE + (R_TOP - R_BASE) * (y / TOWER_H) - 0.05
    b.push().rotY(a).at(0, y, rr).arch(0.7, 1.3, 0.22, P.cream).put(0, 0.05, 0.12, (b) => b.arch(0.45, 1.1, 0.1, '#2a1b33', { glow: 0.6, ao: 0 })).pop()
  }
  // gallery + railing + lantern room
  const gy = TOWER_Y0 + TOWER_H
  b.put(0, gy, 0, (b) => b.cyl(3.5, 2.7, 0.7, 20, P.ink))
  b.put(0, gy + 0.7, 0, (b) => b.cyl(3.5, 3.5, 0.16, 20, '#4b425a'))
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2
    b.push().rotY(a).at(0, gy + 0.8, 3.35).cyl(0.05, 0.05, 1.05, 5, P.ink).pop()
  }
  b.put(0, gy + 1.85, 0, (b) => b.rotX(Math.PI / 2).torus(3.35, 0.06, P.ink, {}, Math.PI * 2, 5, 32))
  b.put(0, gy + 0.85, 0, (b) => b.cyl(1.75, 1.75, 2.5, 16, '#ffe9a8', { glow: 1, ao: 0 }))
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    b.push().rotY(a).at(0, gy + 0.85, 1.72).box(0.16, 2.5, 0.16, P.ink).pop()
  }
  b.put(0, gy + 3.3, 0, (b) => b.cyl(2.0, 1.85, 0.3, 16, P.ink))
  b.put(0, gy + 3.6, 0, (b) => b.cone(2.0, 1.7, 16, P.red, { top: '#f2665c' }))
  b.put(0, gy + 5.2, 0, (b) => b.cyl(0.05, 0.1, 1.0, 5, P.gold))
  b.put(0, gy + 6.25, 0, (b) => b.sphere(0.2, P.gold, { glow: 0.5 }, 8, 6))

  // keeper's cottage against the tower
  const cw = 8.2
  const cd = 6.4
  const cz = COTTAGE_Z - cd / 2
  b.put(0, -0.9, cz, (b) => b.box(cw + 0.5, 1.6, cd + 0.5, '#e8d7b4'))
  b.put(0, 0.5, cz, (b) => b.box(cw, 4.0, cd, P.cream, { top: '#fff6e6' }))
  b.put(0, 0.5, cz, (b) => b.box(cw + 0.18, 0.5, cd + 0.18, P.red))
  b.put(0, 4.5, cz, (b) => b.rotY(Math.PI / 2).gable(cd + 0.3, 2.3, cw + 1.0, P.red, { top: '#f2665c' }))
  b.put(-2.8, 5.0, cz - 1.3, (b) => b.box(0.9, 2.2, 0.9, P.stoneDark))
  b.put(-2.8, 7.2, cz - 1.3, (b) => b.box(1.15, 0.25, 1.15, P.stone))
  // windows either side of the door
  for (const x of [-2.9, 2.9]) {
    b.put(x, 1.5, COTTAGE_Z + 0.06, (b) => b.arch(1.35, 1.9, 0.24, P.cream))
    b.put(x, 1.55, COTTAGE_Z + 0.2, (b) => b.arch(0.95, 1.55, 0.1, '#2a1b33', { glow: 0.65, ao: 0 }))
    b.put(x, 1.55, COTTAGE_Z + 0.27, (b) => b.box(0.06, 1.2, 0.05, P.cream))
    b.put(x, 2.0, COTTAGE_Z + 0.27, (b) => b.box(0.95, 0.06, 0.05, P.cream))
  }
  // steps + porch light
  b.put(0, 0.05, COTTAGE_Z + 0.6, (b) => b.box(3.6, 0.22, 1.3, '#ead6b0'))
  b.put(0, 0.0, COTTAGE_Z + 1.1, (b) => b.box(4.1, 0.11, 0.9, '#f3e4c4'))
  for (const x of [-1.7, 1.7]) {
    b.put(x, 2.6, COTTAGE_Z + 0.12, (b) => b.cyl(0.05, 0.05, 0.9, 5, P.ink))
    b.put(x, 3.05, COTTAGE_Z + 0.12, (b) => b.box(0.36, 0.48, 0.36, P.marigold, { glow: 0.9, ao: 0 }))
    b.put(x, 3.5, COTTAGE_Z + 0.12, (b) => b.cone(0.28, 0.3, 4, P.ink))
  }
  return b.build()
}

function buildPier() {
  const b = new GeoBuilder(72)
  b.aoHeight = 0.6
  b.ao = 0.2
  const len = 15
  for (let i = 0; i < len * 2; i++) {
    const z = -8 - i * 0.5
    b.stand(0, z)
    b.put(0, 0.35, 0, (b) => b.box(2.7, 0.14, 0.44, i % 2 ? '#b57448' : '#a3663f', { tint: 0.05 }))
    b.pop()
  }
  for (let i = 0; i <= len; i += 3) {
    for (const sx of [-1.25, 1.25]) {
      b.stand(sx, -8 - i)
      b.put(0, -1.6, 0, (b) => b.cyl(0.14, 0.16, 2.6, 6, P.woodDark))
      b.pop()
    }
  }
  return b.build()
}

function buildBoat() {
  const b = new GeoBuilder(73)
  b.ao = 0
  b.put(0, 0.1, 0, (b) => b.scale(1, 0.55, 2.1).sphere(0.75, P.terracotta, { top: '#e98a62' }, 12, 8))
  b.put(0, 0.42, 0, (b) => b.box(0.9, 0.08, 2.1, P.cream))
  b.put(0, 0.45, 0.2, (b) => b.cyl(0.05, 0.06, 2.6, 5, P.woodDark))
  b.put(0.03, 1.5, 0.17, (b) => b.box(0.02, 1.2, 0.95, '#fff2d2'))
  return b.build()
}

const beamMatFactory = () =>
  new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uColor: { value: new Color('#fff0c4') } },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.3); float a = pow(vUv.y, 1.6) * f; gl_FragColor = vec4(uColor, a * 0.24); }`,
  })

export function Hire() {
  const poi = POIS.hire
  const frame = useMemo(() => makeFrame(poi.x, poi.z, poi.yaw), [poi])
  const geo = useMemo(buildLighthouse, [])
  const pierGeo = useMemo(buildPier, [])
  const boatGeo = useMemo(buildBoat, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffe6a0', 0.7), [])
  const neon = useMemo(neonTexture, [])
  const root = useRef<Group>(null)
  const beam = useRef<Group>(null)
  const boat = useRef<Group>(null)
  const beamGeo = useMemo(() => new ConeGeometry(7, 90, 26, 1, true).rotateX(Math.PI).translate(0, 45, 0), [])
  const beamMat = useMemo(beamMatFactory, [])
  const boatFrame = useMemo(() => subFrame(frame, 0, -20.5, 0.6), [frame])
  const mailFrame = useMemo(() => subFrame(frame, 5.2, COTTAGE_Z + 2.4, 0.3), [frame])
  const court = useMemo(() => {
    const b = new GeoBuilder(74)
    const glows: V3[] = []
    glows.push(addLamp(b, -3.6, COTTAGE_Z + 3.2), addLamp(b, 3.6, COTTAGE_Z + 3.2))
    addPlanter(b, -2.9, COTTAGE_Z + 0.6, 1, P.coral)
    addPlanter(b, 2.9, COTTAGE_Z + 0.6, 1, P.marigold)
    addBench(b, -5.4, COTTAGE_Z + 4.6, Math.PI / 2 - 0.5)
    addMailbox(b, 5.2, COTTAGE_Z + 2.4, -0.3)
    return { geo: b.build(), glows }
  }, [])
  const courtHalo = useMemo(() => glowSpriteMaterial('#ffbf5a', 0.85), [])
  const gy = TOWER_Y0 + TOWER_H

  usePlace({ id: 'hire', label: poi.label, color: '#e2493f', frame, roots: [root], doorZ: COTTAGE_Z + 0.16, lookY: 1.9, focus: [0, 11, 1], dist: 46, pitch: 0.3, yaw: 0.42, tag: [0, 8, COTTAGE_Z + 1] })

  useEffect(() => {
    const offs = [
      circleCollider(frame, 0, 0, R_BASE + 0.4, 30),
      boxCollider(frame, 0, COTTAGE_Z - 3.2, 4.3, 3.3, 9),
      circleCollider(frame, -3.6, COTTAGE_Z + 3.2, 0.35, 3),
      circleCollider(frame, 3.6, COTTAGE_Z + 3.2, 0.35, 3),
      circleCollider(frame, -2.9, COTTAGE_Z + 0.6, 0.5, 2),
      circleCollider(frame, 2.9, COTTAGE_Z + 0.6, 0.5, 2),
      circleCollider(frame, 5.2, COTTAGE_Z + 2.4, 0.4, 2),
      registerCullable({ obj: root.current!, n: frame.n, ang: 0.4, h: 30 }),
      register({
        id: 'mailbox',
        anchor: frame.toWorld(5.2, 1.4, COTTAGE_Z + 3.4),
        radius: 2.8,
        label: 'OPEN',
        title: 'Mailbox',
        kind: 'link',
        look: frame.toWorld(5.2, 1.3, COTTAGE_Z + 2.4),
        onUse: () => {
          const st = store.getState()
          if (st.addSecret('mailbox')) st.showToast('You found the mailbox. Now write a letter.', 'secret')
          openPage('hire', 'contact')
        },
      }),
    ]
    return () => offs.forEach((f) => f())
  }, [frame])

  useFrame(() => {
    const t = game.time
    if (beam.current) beam.current.rotation.y = t * 0.7
    if (boat.current) {
      boat.current.position.y = Math.sin(t * 1.2) * 0.12 - 0.42
      boat.current.rotation.z = Math.sin(t * 0.9) * 0.05
    }
  })

  return (
    <>
      <Placed frame={frame}>
        <group ref={root}>
          <mesh geometry={geo} material={mat} castShadow receiveShadow />
          <Door id="hire" width={2.1} height={3.2} color={P.red} dark="#a5342d" position={[0, 0.02, COTTAGE_Z + 0.16]} frame={frame} localZ={COTTAGE_Z + 0.16} />
          <SignBoard map={neon} w={5.6} h={1.75} position={[0, 4.55, COTTAGE_Z + 0.55]} lit={false} />
          <mesh geometry={court.geo} material={mat} castShadow receiveShadow />
          {court.glows.map((g, i) => (
            <sprite key={i} material={courtHalo} position={g} scale={[2.6, 2.6, 1]} />
          ))}
          <mesh geometry={pierGeo} material={mat} castShadow receiveShadow />
          <group position={[0, gy + 1.85, 0]}>
            <sprite material={halo} scale={[11, 11, 1]} />
            <group ref={beam}>
              <mesh geometry={beamGeo} material={beamMat} rotation={[0, 0, Math.PI / 2 - 0.02]} />
              <mesh geometry={beamGeo} material={beamMat} rotation={[0, Math.PI, Math.PI / 2 - 0.02]} />
            </group>
          </group>
        </group>
      </Placed>
      <Placed frame={boatFrame}>
        <group ref={boat}>
          <mesh geometry={boatGeo} material={mat} castShadow />
        </group>
      </Placed>
      <sprite material={courtHalo} position={mailFrame.toWorld(0, 1.3, 0)} scale={[0.001, 0.001, 1]} />
    </>
  )
}

void Vector3
