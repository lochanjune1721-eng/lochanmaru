// EXPERIENCE — "The Street of Years": a crescent of shopfront bays, one per chapter of the career,
// curving around a courtyard with a giant clock. Every bay is placed in its own ground-aligned
// frame, so the whole arcade bends with the planet instead of floating off it.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Group, Matrix4, Texture, Vector3 } from 'three'
import { Chapter, chapterById } from '../../content/experience'
import { register } from '../../engine/interact'
import { game } from '../../engine/game'
import { DEG } from '../../engine/math'
import { openPage } from '../../engine/places'
import { mapToN } from '../../engine/planet'
import { store } from '../../engine/store'
import { GeoBuilder } from '../../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { FONT, makeCanvas, signTexture, toTexture } from '../../gfx/text'
import { registerCullable } from '../cull'
import { POIS } from '../layout'
import { Frame3, Mat4, Placed, boxCollider, circleCollider, compassDir, frameFromUnit, geodesic } from '../place'
import { ribbon } from '../ribbon'
import { Door, SignBoard, usePlace } from './parts'

const RC = 12.5
const STEP = 11 * DEG
const DEPTH = 9
const C_MAP = { x: -30, z: 4 }

interface Spec {
  key: string
  w: number
  chapter?: string
  door?: boolean
}

const SPECS: Spec[] = [
  { key: 'nit', w: 1, chapter: 'nit' },
  { key: 'fix', w: 1, chapter: 'fixhealth' },
  { key: 'brand', w: 1, chapter: 'brandflow' },
  { key: 'yaas', w: 1, chapter: 'yaas' },
  { key: 'door', w: 2, door: true },
  { key: 'beyond', w: 1, chapter: 'beyond' },
  { key: 'surviving', w: 1, chapter: 'survivingai' },
  { key: 'june', w: 1, chapter: 'june' },
  { key: 'saas', w: 1, chapter: 'saasflash' },
  { key: 'social', w: 1, chapter: 'socialcapital' },
]

const SHORT: Record<string, string> = {
  nit: 'NIT MECHANICS',
  fixhealth: 'FIX HEALTH',
  brandflow: 'BRAND FLOW MEDIA',
  yaas: 'YAAS',
  beyond: 'BEYOND DEGREE',
  survivingai: 'SURVIVING AI',
  june: 'JUNE & LOCHAN',
  saasflash: 'SAASFLASH',
  socialcapital: 'SOCIAL CAPITAL',
}

const ERA: Record<string, string> = {
  nit: '2021',
  fixhealth: '2023',
  brandflow: '2023-24',
  yaas: '2024',
  beyond: 'NOW',
  survivingai: 'NOW',
  june: 'NOW',
  saasflash: 'PRESENT',
  socialcapital: '',
}

interface Mod extends Spec {
  bearing: number
  frame: Frame3
  wf: number
  wb: number
  rel?: Matrix4
}

function computeLayout() {
  const cn = mapToN(C_MAP.x, C_MAP.z)
  const total = SPECS.reduce((a, s) => a + s.w, 0)
  const start = 270 * DEG - (total * STEP) / 2
  let cum = 0
  const mods: Mod[] = SPECS.map((s) => {
    const bearing = start + (cum + s.w / 2) * STEP
    cum += s.w
    const dir = compassDir(cn, bearing)
    const mn = geodesic(cn, dir, RC)
    const toC = cn.clone().sub(mn)
    const frame = frameFromUnit(mn, toC)
    const wf = 2 * RC * Math.tan((s.w * STEP) / 2)
    const wb = 2 * (RC + DEPTH) * Math.tan((s.w * STEP) / 2)
    return { ...s, bearing, frame, wf, wb }
  })
  const main = mods.find((m) => m.door)!.frame
  const inv = new Matrix4().copy(main.matrix).invert()
  mods.forEach((m) => (m.rel = new Matrix4().multiplyMatrices(inv, m.frame.matrix)))
  return { cn, mods, main, start, end: start + total * STEP }
}

const trap = (wf: number, wb: number, d: number, grow = 0): [number, number][] => [
  [-wf / 2 - grow, grow],
  [wf / 2 + grow, grow],
  [wb / 2 + grow, -d],
  [-wb / 2 - grow, -d],
]

function bay(b: GeoBuilder, m: Mod, ch: Chapter | undefined) {
  const H = m.door ? 9.4 : 6.7
  const { wf, wb } = m
  const c = ch?.color ?? P.teal
  // plinth (buried) + body
  b.put(0, -2.6, 0, (b) => b.prism(trap(wf, wb, DEPTH, 0.14), 3.1, '#e9d7b3'))
  b.prism(trap(wf, wb, DEPTH), H, P.terracotta, { top: '#eb8c62' })
  // piers + cornice
  for (const sx of [-1, 1]) b.put(sx * (wf / 2 - 0.13), 0, 0.14, (b) => b.box(0.28, H, 0.3, P.cream))
  b.put(0, H - 0.05, 0.16, (b) => b.box(wf + 0.08, 0.36, 0.62, P.marigold))
  b.put(0, H - 0.75, 0.06, (b) => b.box(wf - 0.2, 0.16, 0.16, P.cream))
  // merlons
  const nM = m.door ? 5 : 2
  for (let i = 0; i < nM; i++) {
    const x = (i / (nM - 1) - 0.5) * (wf - 0.9)
    b.put(x, H + 0.31, 0.1, (b) => b.box(0.5, 0.58, 0.28, P.cream))
  }
  if (m.door) {
    // gatehouse crown: onion dome + jharokha balcony above the arch
    b.put(0, H + 0.3, -1.7, (b) => b.cyl(1.75, 1.85, 0.5, 14, P.cream))
    b.put(0, H + 0.8, -1.7, (b) => b.onion(1.85, 3.1, P.marigold, { top: '#ffd76a' }, 18))
    b.put(0, H + 3.9, -1.7, (b) => b.cyl(0.05, 0.1, 0.9, 6, P.gold))
    b.put(0, H + 4.8, -1.7, (b) => b.sphere(0.16, P.gold, { glow: 0.3 }, 8, 6))
    b.put(0, 5.7, 0.55, (b) => b.box(2.7, 0.22, 1.1, P.cream))
    b.put(0, 5.92, 0.55, (b) => b.box(2.55, 1.05, 0.12, P.cream))
    for (const x of [-0.85, 0, 0.85]) b.put(x, 6.0, 1.08, (b) => b.arch(0.7, 0.85, 0.12, '#2a1b33', { glow: 0.55, ao: 0 }))
    b.put(0, 7.0, 0.55, (b) => b.box(2.9, 0.2, 1.2, P.marigold))
    return
  }
  // arch bay: cream surround, dark glowing recess, tiny display inside
  b.put(0, 0, 0.13, (b) => b.arch(wf - 0.55, 3.95, 0.26, P.cream))
  b.put(0, 0, 0.28, (b) => b.arch(wf - 0.98, 3.5, 0.08, '#2a1b33', { glow: 0.5, ao: 0 }))
  b.put(0, 1.0, 0.65, (b) => b.box(wf - 1.25, 0.1, 0.7, P.wood))
  b.put(0, 1.06, 0.62, (b) => b.box(0.62, 0.42, 0.06, c, { glow: 0.9, ao: 0 }))
  b.put(0, 1.06, 0.55, (b) => b.box(0.08, 0.24, 0.08, P.ink))
  b.put(-0.42, 1.1, 0.82, (b) => b.sphere(0.09, P.marigold, { glow: 0.9 }, 6, 5))
  // striped awning
  const strips = 6
  for (let i = 0; i < strips; i++) {
    const x = ((i + 0.5) / strips - 0.5) * (wf - 0.4)
    b.put(x, 3.98, 0.74, (b) => b.rotX(-0.36).box((wf - 0.4) / strips, 0.08, 1.2, i % 2 ? P.cream : c))
  }
  // name board frame
  b.put(0, 4.68, 0.2, (b) => b.box(wf - 0.22, 0.7, 0.14, P.woodDark))
  // small dome on the roof
  b.put(0, H + 0.02, -1.6, (b) => b.cyl(0.85, 0.95, 0.35, 10, P.cream))
  b.put(0, H + 0.36, -1.6, (b) => b.onion(0.95, 1.5, c, {}, 12))
  b.put(0, H + 1.88, -1.6, (b) => b.sphere(0.08, P.gold, {}, 5, 4))
}

function buildCrescent(mods: Mod[]) {
  const b = new GeoBuilder(77)
  b.aoHeight = 2.4
  b.ao = 0.26
  for (const m of mods) {
    const ch = m.chapter ? chapterById(m.chapter) : undefined
    b.push().apply(m.rel!)
    bay(b, m, ch)
    b.pop()
  }
  return b.build()
}

function clockFaceTexture() {
  const S = 512
  const { c, g } = makeCanvas(S, S)
  g.fillStyle = '#f8ecd5'
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2 - 6, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = 16
  g.strokeStyle = P.terracotta
  g.stroke()
  g.lineWidth = 6
  g.strokeStyle = P.marigold
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2 - 34, 0, Math.PI * 2)
  g.stroke()
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const big = i % 5 === 0
    const r0 = S / 2 - (big ? 78 : 62)
    const r1 = S / 2 - 46
    g.lineWidth = big ? 9 : 3
    g.strokeStyle = P.ink
    g.beginPath()
    g.moveTo(S / 2 + Math.sin(a) * r0, S / 2 - Math.cos(a) * r0)
    g.lineTo(S / 2 + Math.sin(a) * r1, S / 2 - Math.cos(a) * r1)
    g.stroke()
  }
  g.fillStyle = P.ink
  g.font = `900 64px ${FONT.display}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const [n, a] of [[12, 0], [3, 90], [6, 180], [9, 270]] as const) {
    g.fillText(String(n), S / 2 + Math.sin((a * Math.PI) / 180) * 148, S / 2 - Math.cos((a * Math.PI) / 180) * 148)
  }
  return toTexture(c, 8)
}

function buildClock() {
  const b = new GeoBuilder(78)
  b.aoHeight = 2.5
  b.cyl(3.2, 3.5, 0.5, 8, '#eadbb8')
  b.put(0, 0.5, 0, (b) => b.cyl(2.6, 2.9, 0.5, 8, P.cream))
  b.put(0, 1.0, 0, (b) => b.box(2.7, 4.2, 2.7, P.terracotta, { top: '#eb8c62' }))
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.put(sx * 1.32, 1.0, sz * 1.32, (b) => b.box(0.34, 4.2, 0.34, P.cream))
  b.put(0, 5.2, 0, (b) => b.box(3.4, 0.4, 3.4, P.marigold))
  b.put(0, 5.6, 0, (b) => b.box(3.1, 3.5, 3.1, P.cream, { top: '#fff4de' }))
  b.put(0, 9.1, 0, (b) => b.box(3.5, 0.4, 3.5, P.marigold))
  b.put(0, 9.5, 0, (b) => b.rotY(Math.PI / 4).cone(2.85, 3.0, 4, P.marigold, { top: '#ffd76a' }))
  b.put(0, 12.4, 0, (b) => b.cyl(0.05, 0.1, 1.0, 6, P.gold))
  b.put(0, 13.45, 0, (b) => b.sphere(0.18, P.gold, { glow: 0.3 }, 8, 6))
  // little pennant flags on the corners
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.put(sx * 1.75, 9.5, sz * 1.75, (b) => b.cyl(0.08, 0.1, 1.0, 6, P.gold))
    b.put(sx * 1.75, 10.5, sz * 1.75, (b) => b.sphere(0.13, P.gold, {}, 6, 5))
  }
  return b.build()
}

function buildHand(len: number, w: number, color: string) {
  const b = new GeoBuilder(79)
  b.ao = 0
  b.box(w, len, 0.05, color)
  b.put(0, len, 0, (b) => b.cone(w * 1.3, 0.18, 3, color))
  return b.build()
}

function timelineTexture(mods: Mod[], start: number, end: number) {
  const W = 2048
  const H = 192
  const { c, g } = makeCanvas(W, H)
  g.fillStyle = '#efdcb2'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = '#d3b781'
  g.lineWidth = 6
  g.setLineDash([26, 16])
  g.beginPath()
  g.moveTo(0, H * 0.5)
  g.lineTo(W, H * 0.5)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = '#d9bd86'
  g.fillRect(0, 0, W, 10)
  g.fillRect(0, H - 10, W, 10)
  const a0 = start - 3 * DEG
  const a1 = end + 3 * DEG
  for (const m of mods) {
    const u = (m.bearing - a0) / (a1 - a0)
    const x = u * W
    const ch = m.chapter ? chapterById(m.chapter) : undefined
    const label = m.door ? '' : ERA[m.chapter ?? ''] ?? ''
    g.fillStyle = ch?.color ?? P.teal
    g.beginPath()
    g.arc(x, H * 0.28, 22, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f8ecd5'
    g.font = `900 22px ${FONT.mono}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    if (ch) g.fillText(ch.mark, x, H * 0.28 + 1)
    if (label) {
      g.fillStyle = P.ink
      g.font = `900 54px ${FONT.display}`
      g.fillText(label, x, H * 0.68)
    }
    if (m.door) {
      g.fillStyle = P.tealDeep
      g.font = `700 34px ${FONT.mono}`
      g.fillText('▲  ENTER  ▲', x, H * 0.5)
    }
  }
  return toTexture(c, 8)
}

export function Experience() {
  const poi = POIS.experience
  const L = useMemo(computeLayout, [])
  const geo = useMemo(() => buildCrescent(L.mods), [L])
  const clockGeo = useMemo(buildClock, [])
  const handMin = useMemo(() => buildHand(1.0, 0.09, P.ink), [])
  const handHr = useMemo(() => buildHand(0.7, 0.13, P.terracottaDeep), [])
  const faceTex = useMemo(clockFaceTexture, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffbf5a', 0.7), [])
  const clockFrame = useMemo(() => frameFromUnit(L.cn, compassDir(L.cn, 90 * DEG)), [L])
  const root = useRef<Group>(null)
  const clockRoot = useRef<Group>(null)
  const hands = useRef<Group[]>([])
  const groundTex = useMemo(() => timelineTexture(L.mods, L.start, L.end), [L])
  const walk = useMemo(() => {
    const pts: Vector3[] = []
    const a0 = L.start - 3 * DEG
    const a1 = L.end + 3 * DEG
    const N = 80
    for (let i = 0; i <= N; i++) pts.push(geodesic(L.cn, compassDir(L.cn, a0 + ((a1 - a0) * i) / N), RC - 3.4))
    return ribbon({ pts, width: 1.7, lift: 0.055, cross: [{ at: -1, color: new Color('#fff') }, { at: 1, color: new Color('#fff') }] })
  }, [L])
  const walkMat = useMemo(() => worldMaterial({ map: groundTex, ground: true, rim: false, decal: true }), [groundTex])

  const boards = useMemo(
    () =>
      L.mods.map((m) => {
        if (m.door) return signTexture({ text: 'EXPERIENCE', sub: 'THE STREET OF YEARS', w: 1024, h: 300, bg: P.tealDeep, border: P.cream, color: P.cream, subColor: '#bfeee8' })
        const ch = chapterById(m.chapter!)!
        return signTexture({ text: SHORT[ch.id] ?? ch.name.toUpperCase(), sub: ERA[ch.id] || ' ', w: 640, h: 220, bg: ch.color, border: P.cream, color: P.cream, subColor: '#ffffff' })
      }),
    [L],
  )

  usePlace({ id: 'experience', label: poi.label, color: '#2f9591', frame: L.main, roots: [root, clockRoot], doorZ: 0.14, lookY: 2.2, focus: [0, 4, RC], dist: 56, pitch: 0.34, yaw: 0.35, tag: [0, 8.2, 1] })

  useEffect(() => {
    const offs: (() => void)[] = []
    for (const m of L.mods) offs.push(boxCollider(m.frame, 0, -DEPTH / 2, (m.wf + m.wb) / 4 - 0.1, DEPTH / 2, 9))
    offs.push(circleCollider(clockFrame, 0, 0, 2.5, 14))
    offs.push(registerCullable({ obj: root.current!, n: L.cn, ang: 0.62, h: 20 }))
    // every bay is a doorway into that chapter, even without stepping inside
    for (const m of L.mods) {
      if (m.door || !m.chapter) continue
      const ch = chapterById(m.chapter)!
      const anchor = m.frame.toWorld(0, 2.0, 1.5)
      offs.push(
        register({
          id: `peek-${ch.id}`,
          anchor,
          radius: 3.1,
          label: 'OPEN CHAPTER',
          title: ch.name,
          kind: 'object',
          dir: m.frame.dir(0, 1),
          dirCos: 0.45,
          look: m.frame.toWorld(0, 2.2, 0.4),
          onUse: () => openPage('experience', ch.id),
        }),
      )
    }
    offs.push(
      register({
        id: 'clock',
        anchor: clockFrame.toWorld(0, 1.6, 2.8),
        radius: 3.6,
        label: 'LOOK UP',
        title: 'The clock',
        kind: 'secret',
        look: clockFrame.toWorld(0, 7.3, 0),
        onUse: () => {
          const st = store.getState()
          if (st.addSecret('clock')) st.showToast('It runs fast on purpose. Careers do too.', 'secret')
          else st.showToast('Still running fast.', 'info')
        },
      }),
    )
    return () => offs.forEach((f) => f())
  }, [L, clockFrame])

  useFrame(() => {
    const t = game.time
    hands.current.forEach((g) => {
      if (!g) return
      const kind = g.userData.kind
      g.rotation.z = kind === 'min' ? -t * 0.9 : -t * 0.075
    })
  })

  return (
    <>
      <Placed frame={L.main}>
        <group ref={root}>
          <mesh geometry={geo} material={mat} castShadow receiveShadow />
          <Door id="experience" width={2.1} height={4.3} color={P.teal} dark={P.tealDeep} position={[0, 0.02, 0.14]} frame={L.main} localZ={0.14} />
          {L.mods.map((m, i) => (
            <Mat4 key={m.key} matrix={m.rel!}>
              <SignBoard map={boards[i] as Texture} w={m.door ? 3.9 : m.wf - 0.4} h={m.door ? 1.15 : 0.56} position={[0, m.door ? 5.2 : 4.68, m.door ? 0.32 : 0.29]} />
            </Mat4>
          ))}
        </group>
      </Placed>
      {/* courtyard: pavement with the years, and the clock */}
      <mesh geometry={walk} material={walkMat} receiveShadow renderOrder={1} />
      <Placed frame={clockFrame}>
        <group ref={clockRoot}>
        <mesh geometry={clockGeo} material={mat} castShadow receiveShadow />
        {[0, 1, 2, 3].map((k) => {
          const a = (k * Math.PI) / 2
          return (
            <group key={k} rotation={[0, a, 0]} position={[0, 0, 0]}>
              <group position={[0, 7.35, 1.575]}>
                <mesh position={[0, 0, 0.01]}>
                  <circleGeometry args={[1.32, 40]} />
                  <meshBasicMaterial map={faceTex} toneMapped={false} />
                </mesh>
                <group
                  ref={(g) => {
                    if (g) {
                      g.userData.kind = 'hr'
                      hands.current[k * 2] = g
                    }
                  }}
                  position={[0, 0, 0.05]}
                >
                  <mesh geometry={handHr} material={mat} />
                </group>
                <group
                  ref={(g) => {
                    if (g) {
                      g.userData.kind = 'min'
                      hands.current[k * 2 + 1] = g
                    }
                  }}
                  position={[0, 0, 0.09]}
                >
                  <mesh geometry={handMin} material={mat} />
                </group>
              </group>
            </group>
          )
        })}
        <sprite material={halo} position={[0, 7.3, 0]} scale={[8, 8, 1]} />
        </group>
      </Placed>
    </>
  )
}
