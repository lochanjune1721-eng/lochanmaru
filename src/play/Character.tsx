import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CanvasTexture, Group, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { damp, dampAngle, smoothstep } from '../engine/math'
import { bus } from '../engine/bus'
import { game } from '../engine/game'
import { GeoBuilder } from '../gfx/geo'
import { P } from '../gfx/palette'
import { worldMaterial } from '../gfx/materials'

export interface CharState {
  pos: Vector3
  up: Vector3
  heading: Vector3
  speed: number
  stride: number
  turn: number
  wet: number
  drop: number
  glance: Vector3 | null
  sprint: boolean
  lastMoveAt: number
  visible?: boolean
}

export interface CharLook {
  hoodie: string
  hoodieDark: string
  pants: string
  hair: string
  skin: string
  pack: string
  phones: string
}

export const LOOK_PLAYER: CharLook = {
  hoodie: P.saffron,
  hoodieDark: '#d98a26',
  pants: '#30346f',
  hair: P.ink,
  skin: '#e0a57c',
  pack: P.terracotta,
  phones: P.teal,
}

function buildParts(c: CharLook) {
  const s = 1
  // ---- torso ------------------------------------------------------------------
  const t = new GeoBuilder(3)
  t.ao = 0
  t.cyl(0.36, 0.43, 0.6, 14, c.hoodie, { top: c.hoodie })
  t.push().at(0, 0.6, 0).scale(1, 0.55, 0.9).sphere(0.36, c.hoodie).pop()
  t.push().at(0, 0.02, 0).cyl(0.445, 0.445, 0.09, 14, c.hoodieDark).pop()
  t.push().at(0, 0.16, 0.41).box(0.32, 0.15, 0.06, c.hoodieDark).pop()
  // backpack
  t.push().at(0, 0.08, -0.42).box(0.5, 0.58, 0.24, c.pack).pop()
  t.push().at(0, 0.5, -0.42).box(0.52, 0.12, 0.26, P.terracottaDeep).pop()
  t.push().at(-0.2, 0.05, -0.3).box(0.06, 0.55, 0.06, P.cream).pop()
  t.push().at(0.2, 0.05, -0.3).box(0.06, 0.55, 0.06, P.cream).pop()
  // hood rim at the neck
  t.push().at(0, 0.7, 0).rotX(Math.PI / 2).torus(0.24, 0.07, c.hoodieDark, {}, Math.PI * 2, 6, 14).pop()

  // ---- head -------------------------------------------------------------------
  const h = new GeoBuilder(4)
  h.ao = 0
  h.push().at(0, 0.44, 0).scale(1.06, 1, 1).sphere(0.43, c.skin, {}, 16, 12).pop()
  // hair cap + fringe + tuft
  h.push().at(0, 0.5, -0.05).scale(1.06, 0.92, 1.02).dome(0.46, c.hair, {}, 14).pop()
  h.push().at(0, 0.5, -0.06).rotX(Math.PI).scale(1.06, 0.4, 1).dome(0.45, c.hair, {}, 12).pop()
  h.push().at(0.07, 0.93, 0.08).rotZ(-0.5).scale(1.6, 0.9, 1).sphere(0.13, c.hair, { flat: true }, 8, 6).pop()
  h.push().at(-0.1, 0.9, 0.12).rotZ(0.5).scale(1.4, 0.8, 1).sphere(0.1, c.hair, { flat: true }, 8, 6).pop()
  h.push().at(0, 0.78, 0.3).scale(1.3, 0.55, 0.65).sphere(0.16, c.hair, { flat: true }, 8, 6).pop()
  // face
  const e = new GeoBuilder(7)
  e.ao = 0
  e.push().at(-0.15, 0, 0.385).scale(0.055, 0.09, 0.04).sphere(1, P.ink, {}, 8, 6).pop()
  e.push().at(0.15, 0, 0.385).scale(0.055, 0.09, 0.04).sphere(1, P.ink, {}, 8, 6).pop()
  h.push().at(-0.25, 0.33, 0.33).scale(0.09, 0.05, 0.03).sphere(1, '#ef8f8a', {}, 8, 6).pop()
  h.push().at(0.25, 0.33, 0.33).scale(0.09, 0.05, 0.03).sphere(1, '#ef8f8a', {}, 8, 6).pop()
  h.push().at(0, 0.29, 0.405).rotZ(Math.PI).torus(0.05, 0.014, '#8a4a44', {}, Math.PI, 5, 8).pop()
  // headphones
  h.push().at(0, 0.44, 0).rotZ(0).torus(0.46, 0.035, c.phones, {}, Math.PI, 6, 16).pop()
  h.push().at(-0.455, 0.44, 0).rotZ(Math.PI / 2).cyl(0.16, 0.16, 0.1, 12, c.phones).pop()
  h.push().at(0.405, 0.44, 0).rotZ(Math.PI / 2).cyl(0.16, 0.16, 0.1, 12, c.phones).pop()
  h.push().at(-0.51, 0.44, 0).rotZ(Math.PI / 2).cyl(0.11, 0.11, 0.04, 10, P.terracotta).pop()
  h.push().at(0.505, 0.44, 0).rotZ(Math.PI / 2).cyl(0.11, 0.11, 0.04, 10, P.terracotta).pop()

  // ---- limbs (origin at joint, hanging down) -------------------------------------
  const arm = new GeoBuilder(5)
  arm.ao = 0
  arm.push().at(0, -0.5, 0).cyl(0.085, 0.095, 0.5, 8, c.hoodie).pop()
  arm.push().at(0, -0.06, 0).sphere(0.11, c.hoodie, {}, 8, 6).pop()
  arm.push().at(0, -0.53, 0).sphere(0.095, c.skin, {}, 8, 6).pop()
  const leg = new GeoBuilder(6)
  leg.ao = 0
  leg.push().at(0, -0.5, 0).cyl(0.115, 0.12, 0.5, 8, c.pants).pop()
  leg.push().at(0, -0.5, 0.06).scale(0.95, 0.75, 1.5).sphere(0.15, P.cream, {}, 8, 6).pop()

  return { torso: t.build(), head: h.build(), eyes: e.build(), arm: arm.build(), leg: leg.build(), s }
}

let blobTex: CanvasTexture | null = null
function blobTexture() {
  if (blobTex) return blobTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 32)
  grd.addColorStop(0, 'rgba(30,20,50,0.55)')
  grd.addColorStop(0.55, 'rgba(30,20,50,0.28)')
  grd.addColorStop(1, 'rgba(30,20,50,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  blobTex = new CanvasTexture(c)
  return blobTex
}

const _x = new Vector3()
const _z = new Vector3()
const _m = new Matrix4()
const _g = new Vector3()

/** The little walking figure. Driven entirely by a CharState so NPCs can reuse it. */
export function Character({ state, look = LOOK_PLAYER, scale = 0.92, isPlayer = false }: { state: CharState; look?: CharLook; scale?: number; isPlayer?: boolean }) {
  const parts = useMemo(() => buildParts(look), [look])
  const mat = useMemo(() => worldMaterial({ rim: true }), [])
  const blob = useMemo(() => new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), [])
  const blobGeo = useMemo(() => new PlaneGeometry(1.5, 1.5).rotateX(-Math.PI / 2), [])

  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  const head = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const eyes = useRef<Group>(null)
  const blobMesh = useRef<Mesh>(null)

  const anim = useRef({ lean: 0, bank: 0, bob: 0, squash: 0, yaw: 0, pitch: 0, wave: 0, waveT: -1, blinkAt: 2, blink: 0, land: 0, dropped: false, breath: 0, idleLook: 0, idleLookAt: 4 })

  useFrame((_, dtRaw) => {
    const r = root.current
    if (!r) return
    const dt = Math.min(dtRaw, 0.05)
    const a = anim.current
    const S = state
    const t = game.time

    // ---- placement (basis from up + heading) ------------------------------------
    _z.copy(S.heading)
    _x.crossVectors(S.up, _z).normalize()
    _z.crossVectors(_x, S.up).normalize()
    _m.makeBasis(_x, S.up, _z)

    // arrival drop from the sky
    let lift = 0
    if (S.drop >= 0) {
      const d = Math.min(1, S.drop)
      lift = 26 * (1 - d) * (1 - d)
      if (d >= 1 && !a.dropped) {
        a.dropped = true
        a.land = 1
        bus.emit('land', S.pos)
      }
    }
    _g.copy(S.pos).addScaledVector(S.up, lift)
    _m.setPosition(_g)
    r.matrix.copy(_m)
    r.matrixWorldNeedsUpdate = true
    r.visible = S.visible !== false

    // ---- gait ----------------------------------------------------------------------
    const spd = S.speed
    const amp = Math.min(1, spd / 4.5)
    const ph = S.stride
    const swing = Math.sin(ph) * amp
    const bobT = Math.abs(Math.sin(ph)) * amp * 0.09
    a.bob = damp(a.bob, bobT, 22, dt)
    a.lean = damp(a.lean, Math.min(spd / 8.4, 1) * 0.2 + (S.sprint ? 0.08 : 0), 9, dt)
    a.bank = damp(a.bank, Math.max(-0.35, Math.min(0.35, -S.turn * 0.05)) * amp, 8, dt)
    a.land = damp(a.land, 0, 6, dt)
    const wet = S.wet
    if (legL.current && legR.current && armL.current && armR.current && body.current && head.current) {
      legL.current.rotation.x = swing * 0.95
      legR.current.rotation.x = -swing * 0.95
      armL.current.rotation.x = -swing * 0.85
      armR.current.rotation.x = swing * 0.85
      armL.current.rotation.z = 0.09 + amp * 0.05
      armR.current.rotation.z = -0.09 - amp * 0.05

      // idle life: breathing, occasional look-around, wave after a while
      a.breath += dt * 2.1
      const idle = spd < 0.3
      const idleFor = t - S.lastMoveAt
      if (idle && idleFor > 8 && a.waveT < 0 && !S.glance) {
        a.waveT = 0
      }
      if (!idle) a.waveT = -1
      if (a.waveT >= 0) {
        a.waveT += dt
        const w = a.waveT
        const on = smoothstep(0, 0.35, w) * (1 - smoothstep(2.1, 2.6, w))
        armR.current.rotation.x = -2.5 * on + swing * 0.85 * (1 - on)
        armR.current.rotation.z = (-0.5 - Math.sin(w * 9) * 0.35) * on + (-0.09 - amp * 0.05) * (1 - on)
        if (w > 3.4 + 6) a.waveT = -1
        if (w > 2.7 && idleFor < 8.4) a.waveT = -1
      }
      const breathe = idle ? Math.sin(a.breath) * 0.018 : 0
      body.current.position.y = 0.5 + a.bob * (1 - wet * 0.5) - wet * 0.1 + breathe - a.land * 0.12
      body.current.scale.set(1 + a.land * 0.1, 1 - a.land * 0.12 + breathe * 0.6, 1 + a.land * 0.1)
      body.current.rotation.x = a.lean
      body.current.rotation.z = a.bank
      body.current.rotation.y = swing * 0.08

      // head: glance at a target, or idly look around
      let wantYaw = 0
      let wantPitch = 0
      if (S.glance) {
        const dv = _g.copy(S.glance).sub(S.pos)
        const lx = dv.dot(_x)
        const lz = dv.dot(_z)
        wantYaw = Math.max(-0.9, Math.min(0.9, Math.atan2(lx, lz)))
        wantPitch = Math.max(-0.3, Math.min(0.3, -(dv.dot(S.up) - 1.6) * 0.06))
      } else if (idle && t > a.idleLookAt) {
        a.idleLook = (Math.random() - 0.5) * 1.4
        a.idleLookAt = t + 2 + Math.random() * 3.5
      }
      if (!S.glance && idle) wantYaw = a.idleLook
      a.yaw = dampAngle(a.yaw, wantYaw, 7, dt)
      a.pitch = damp(a.pitch, wantPitch, 7, dt)
      head.current.rotation.y = a.yaw
      head.current.rotation.x = a.pitch - a.lean * 0.6 - bobT * 0.5

      // blink
      if (t > a.blinkAt) {
        a.blink = 1
        a.blinkAt = t + 2.4 + Math.random() * 3.4
      }
      a.blink = Math.max(0, a.blink - dt * 8)
    }
    if (eyes.current) eyes.current.scale.y = 1 - Math.sin(Math.min(1, a.blink) * Math.PI) * 0.92
    if (blobMesh.current) {
      const h = Math.max(0, lift)
      blobMesh.current.position.y = -lift + 0.05
      const k = 1 / (1 + h * 0.18)
      blobMesh.current.scale.set(k, 1, k)
      blob.opacity = 0.9 * k
    }
  })

  const s = scale
  return (
    <group ref={root} matrixAutoUpdate={false} scale={1}>
      <group scale={s}>
        <group ref={legL} position={[-0.16, 0.52, 0]}>
          <mesh geometry={parts.leg} material={mat} castShadow />
        </group>
        <group ref={legR} position={[0.16, 0.52, 0]}>
          <mesh geometry={parts.leg} material={mat} castShadow />
        </group>
        <group ref={body} position={[0, 0.5, 0]}>
          <mesh geometry={parts.torso} material={mat} castShadow />
          <group ref={head} position={[0, 0.72, 0]}>
            <mesh geometry={parts.head} material={mat} castShadow />
            <group ref={eyes} position={[0, 0.44, 0]}>
              <mesh geometry={parts.eyes} material={mat} />
            </group>
          </group>
          <group ref={armL} position={[-0.47, 0.6, 0]}>
            <mesh geometry={parts.arm} material={mat} castShadow />
          </group>
          <group ref={armR} position={[0.47, 0.6, 0]}>
            <mesh geometry={parts.arm} material={mat} castShadow />
          </group>
        </group>
      </group>
      <mesh ref={blobMesh} geometry={blobGeo} material={blob} renderOrder={3} />
    </group>
  )
}

