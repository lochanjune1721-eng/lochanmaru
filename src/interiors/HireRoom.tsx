// HIRE LOCHAN — the lantern room at the top of the lighthouse: the last stop. Four doors (what I do), a ring of
// small objects (ways to reach me) and a lens that keeps sweeping the dark for the next idea worth backing.
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Group, MeshBasicMaterial, PlaneGeometry, RingGeometry } from 'three'
import { CHANNELS, CLOSER, DOORS, Door } from '../content/contact'
import { channelPanel, doorPanel } from '../content/panels'
import { SITE } from '../content/site'
import { game } from '../engine/game'
import { damp } from '../engine/math'
import { store } from '../engine/store'
import { GeoBuilder } from '../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { FONT, makeCanvas, roundRect, signTexture, toTexture } from '../gfx/text'
import { SignBoard } from '../world/buildings/parts'
import { beamGeometry, makeBeamMaterial, Motes, ringWallGeos, roundRoom, Stars, useRingWall } from './fx'
import { Hotspot, Interior, useBox, useCircle, useOpen } from './kit'
import { cat, plant } from './parts'

const R = 11
const DEG = Math.PI / 180
const BRASS = '#d9a441'
const BRASS_D = '#9a6f2c'
const NAVY = '#20255a'

// ---- layout -----------------------------------------------------------------------------------------------
const DOOR_X = [-5.6, -1.9, 1.9, 5.6]
const doorPose = (i: number) => {
  const x = DOOR_X[i]
  return { x, z: -7.9 + 0.024 * x * x, rot: -x * 0.03 }
}
const DOOR_W = 2.4
const DOOR_H = 3.7

type ChanId = 'email' | 'linkedin' | 'instagram' | 'phone' | 'resume' | 'x'
const SLOTS: Record<string, { x: number; z: number }> = {
  L1: { x: -8.1, z: 0.2 },
  L2: { x: -6.8, z: 3.7 },
  L3: { x: -4.0, z: 6.5 },
  R1: { x: 8.1, z: 0.2 },
  R2: { x: 6.8, z: 3.7 },
  R3: { x: 4.0, z: 6.5 },
}
const CHAN_SLOT: Record<ChanId, string> = { email: 'L1', linkedin: 'L2', instagram: 'L3', phone: 'R1', resume: 'R2', x: 'R3' }
const CHAN_LABEL: Record<ChanId, string> = { email: 'WRITE', linkedin: 'CONNECT', instagram: 'FOLLOW', phone: 'CALL', resume: 'READ', x: 'FOLLOW' }
const LENS = { x: 0, z: -0.6 }

// ---- small builders ------------------------------------------------------------------------------------------
function tablePedestal(b: GeoBuilder, x: number, z: number, accent: string) {
  b.push().at(x, 0, z)
  b.cyl(1.0, 1.14, 0.22, 18, BRASS_D)
  b.put(0, 0.22, 0, (b) => b.cyl(0.62, 0.82, 0.68, 18, NAVY, { top: '#2f3680' }))
  b.put(0, 0.72, 0, (b) => b.cyl(0.86, 0.86, 0.09, 22, accent, { ao: 0, glow: 0.25 }))
  b.put(0, 0.81, 0, (b) => b.cyl(0.98, 0.98, 0.1, 22, BRASS))
  b.pop()
}

function buildChannelObject(b: GeoBuilder, id: ChanId, x: number, z: number) {
  const y = 0.91
  b.push().at(x, y, z)
  if (id === 'email') {
    // envelope with a wax seal
    b.push().rotY(-0.25)
    b.put(0, 0, 0, (b) => b.box(1.3, 0.09, 0.86, '#fff5e2'))
    b.put(0, 0.09, 0.02, (b) => b.rotY(Math.PI / 4).box(0.6, 0.02, 0.6, '#efe1c2'))
    b.put(0, 0.11, 0.12, (b) => b.sphere(0.13, P.red, { glow: 0.2 }, 8, 6))
    b.pop()
  } else if (id === 'linkedin') {
    // a name-tag on a little stand
    b.put(0, 0, -0.15, (b) => b.rotX(-0.22).box(1.1, 1.4, 0.06, '#fdf6e8'))
    b.put(0, 0.05, 0.05, (b) => b.box(0.14, 0.5, 0.3, BRASS_D))
    b.put(0, 1.42, -0.3, (b) => b.torus(0.16, 0.025, BRASS, {}, Math.PI * 2, 5, 12))
  } else if (id === 'instagram') {
    // an instant camera with a print sliding out
    b.put(0, 0, 0, (b) => b.box(1.25, 0.78, 0.58, '#f5ead0'))
    b.put(0, 0.5, 0, (b) => b.box(1.25, 0.28, 0.58, P.terracotta))
    b.put(0, 0.32, 0.3, (b) => b.rotX(Math.PI / 2).cyl(0.27, 0.27, 0.16, 14, '#2b2438'))
    b.put(0, 0.32, 0.4, (b) => b.rotX(Math.PI / 2).cyl(0.17, 0.17, 0.05, 14, '#8fd4ff', { glow: 0.5 }))
    b.put(-0.42, 0.85, 0, (b) => b.box(0.3, 0.16, 0.22, '#fff2c8', { glow: 0.6 }))
    b.put(0.28, 0.78, 0, (b) => b.rotZ(-0.12).box(0.62, 0.72, 0.03, '#ffffff'))
    b.put(0.28, 0.92, 0.02, (b) => b.rotZ(-0.12).box(0.5, 0.46, 0.03, '#f2a5b8', { ao: 0 }))
  } else if (id === 'phone') {
    // rotary telephone
    b.put(0, 0, 0, (b) => b.box(1.15, 0.34, 0.9, P.red))
    b.put(0, 0.34, 0.1, (b) => b.rotX(-0.35).cyl(0.36, 0.4, 0.18, 14, '#f5ead0'))
    b.put(0, 0.34, -0.12, (b) => b.box(0.9, 0.16, 0.34, P.red))
    b.bar([-0.55, 0.62, -0.12], [0.55, 0.62, -0.12], 0.07, 6, '#2b2438')
    b.put(-0.55, 0.5, -0.12, (b) => b.sphere(0.13, '#2b2438', {}, 7, 5))
    b.put(0.55, 0.5, -0.12, (b) => b.sphere(0.13, '#2b2438', {}, 7, 5))
  } else if (id === 'resume') {
    // a rolled scroll in a cradle
    for (const sx of [-0.55, 0.55]) b.put(sx, 0, 0, (b) => b.box(0.1, 0.42, 0.5, BRASS_D))
    b.put(0, 0.42, 0, (b) => b.rotZ(Math.PI / 2).cyl(0.3, 0.3, 1.25, 12, '#fff5e2'))
    for (const sx of [-1, 1]) b.put(sx * 0.66, 0.42, 0, (b) => b.rotZ(Math.PI / 2).cyl(0.12, 0.12, 0.1, 8, BRASS))
    b.put(0, 0.42, 0, (b) => b.rotZ(Math.PI / 2).cyl(0.33, 0.33, 0.14, 12, P.red, { ao: 0 }))
  } else {
    // X: two crossed brass bars
    b.bar([-0.5, 0.05, 0], [0.5, 1.25, 0], 0.1, 6, BRASS)
    b.bar([0.5, 0.05, 0], [-0.5, 1.25, 0], 0.1, 6, BRASS)
  }
  b.pop()
}

function buildLens() {
  const b = new GeoBuilder(505)
  b.ao = 0.1
  // drum
  b.cyl(1.55, 1.7, 0.38, 20, BRASS_D)
  b.put(0, 0.38, 0, (b) => b.cyl(1.35, 1.5, 0.32, 20, NAVY, { top: '#2f3680' }))
  b.put(0, 0.7, 0, (b) => b.cyl(1.5, 1.5, 0.08, 22, BRASS))
  // beehive lens: alternating glass and brass
  const rings = [1.05, 1.2, 1.28, 1.2, 1.05]
  rings.forEach((r, i) => {
    const y = 0.78 + i * 0.5
    b.put(0, y, 0, (b) => b.cyl(r, r, 0.4, 20, '#fff0c4', { glow: 0.95, ao: 0 }))
    b.put(0, y + 0.4, 0, (b) => b.cyl(r + 0.05, r + 0.05, 0.1, 20, BRASS))
  })
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    b.put(Math.sin(a) * 1.12, 0.78, Math.cos(a) * 1.12, (b) => b.cyl(0.035, 0.035, 2.55, 4, BRASS))
  }
  b.put(0, 3.35, 0, (b) => b.cone(1.15, 0.7, 20, BRASS_D))
  b.put(0, 4.0, 0, (b) => b.sphere(0.16, BRASS, {}, 8, 6))
  return b.build()
}

function paperPlaneGeo() {
  const N = [0, 0.02, 1.15]
  const L = [-0.8, 0.16, -0.5]
  const Rr = [0.8, 0.16, -0.5]
  const K = [0, -0.06, -0.45]
  const B = [0, -0.34, -0.32]
  const tri = (a: number[], b: number[], c: number[]) => [...a, ...b, ...c]
  const pos = [...tri(N, L, K), ...tri(N, K, Rr), ...tri(N, K, B), ...tri(N, B, K)]
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

function buildHire() {
  const b = new GeoBuilder(404)
  b.aoHeight = 2.2
  b.ao = 0.26
  roundRoom(b, { r: R, wallH: 1.7, lowH: 0.95, floorTop: '#6e4f3f', floorSide: '#26295c', wall: '#1f2358', wallTop: '#2c3170', trim: BRASS, segs: 96 })

  // floor inlay: brass rings + spokes around the lens
  const ring = (r0: number, r1: number, col: string, y = 0.075, glow = 0.1) => {
    const g = new RingGeometry(r0, r1, 96).rotateX(-Math.PI / 2)
    g.translate(LENS.x, y, LENS.z)
    b.custom(g, col, { ao: 0, glow })
  }
  ring(2.35, 2.5, BRASS)
  ring(5.5, 5.62, BRASS)
  ring(9.3, 9.46, BRASS)
  for (let i = 0; i < 24; i++) {
    const g = new RingGeometry(2.5, 5.5, 1, 1, (i / 24) * Math.PI * 2, 1.6 * DEG).rotateX(-Math.PI / 2)
    g.translate(LENS.x, 0.074, LENS.z)
    b.custom(g, i % 3 === 0 ? BRASS : '#8a6650', { ao: 0 })
  }
  // darker inner floor + planks
  {
    const g = new RingGeometry(0, 2.35, 48).rotateX(-Math.PI / 2)
    g.translate(LENS.x, 0.072, LENS.z)
    b.custom(g, '#3a3466', { ao: 0 })
  }

  // glass rail: brass mullions all round the back half
  const rail = ringWallGeos(R + 0.05, 0.16, 6.6, 1.2, 112)
  b.custom(rail.cap, BRASS, { ao: 0 })
  for (let deg = -108; deg <= 108; deg += 6) {
    const a = Math.PI - deg * DEG
    const back = (1 - Math.cos(a)) / 2
    const h = 1.2 + (6.6 - 1.2) * smooth(0.18, 0.86, back)
    b.put(Math.sin(a) * (R + 0.08), 0, Math.cos(a) * (R + 0.08), (b) => b.box(0.16, h, 0.16, BRASS, { ao: 0.1 }))
  }
  rail.inner.dispose()
  rail.outer.dispose()
  rail.skirt.dispose()

  // four freestanding door frames
  DOORS.forEach((d, i) => {
    const p = doorPose(i)
    b.push().at(p.x, 0, p.z).rotY(p.rot)
    const hw = DOOR_W / 2
    for (const sx of [-1, 1]) b.put(sx * (hw + 0.17), 0, 0, (b) => b.box(0.34, DOOR_H - hw, 0.56, BRASS))
    b.put(0, DOOR_H - hw, 0, (b) => b.torus(hw + 0.17, 0.17, BRASS, {}, Math.PI, 8, 20))
    b.put(0, 0, -0.14, (b) => b.arch(DOOR_W + 0.02, DOOR_H + 0.02, 0.1, '#0e1030', { ao: 0 }))
    b.put(0, 0, 0.1, (b) => b.box(DOOR_W + 0.9, 0.12, 1.1, BRASS_D))
    // little lanterns on each side in the door's colour
    for (const sx of [-1, 1]) {
      b.put(sx * (hw + 0.62), 1.55, 0.05, (b) => b.cyl(0.02, 0.02, 0.5, 4, P.ink))
      b.put(sx * (hw + 0.62), 1.05, 0.05, (b) => b.box(0.3, 0.42, 0.3, d.color, { glow: 0.85, ao: 0 }))
      b.put(sx * (hw + 0.62), 1.47, 0.05, (b) => b.cone(0.26, 0.2, 4, P.ink))
    }
    b.pop()
  })

  // channel pedestals + the objects on them
  for (const c of CHANNELS) {
    const slot = SLOTS[CHAN_SLOT[c.id as ChanId]]
    if (!slot) continue
    tablePedestal(b, slot.x, slot.z, '#e2493f')
    buildChannelObject(b, c.id as ChanId, slot.x, slot.z)
  }

  // guestbook lectern (or where X would go), telescope, globe, cat, plants
  {
    const hasX = CHANNELS.some((c) => c.id === 'x')
    if (!hasX) {
      const s = SLOTS.R3
      b.push().at(s.x, 0, s.z)
      b.cyl(0.26, 0.4, 0.2, 10, BRASS_D)
      b.put(0, 0.2, 0, (b) => b.cyl(0.09, 0.09, 1.0, 6, BRASS))
      b.put(0, 1.2, 0, (b) => b.rotX(-0.5).box(1.25, 0.08, 0.9, P.woodDark))
      b.put(-0.31, 1.3, 0.02, (b) => b.rotX(-0.5).box(0.6, 0.06, 0.78, '#fff5e2'))
      b.put(0.31, 1.3, 0.02, (b) => b.rotX(-0.5).box(0.6, 0.06, 0.78, '#fff5e2'))
      b.bar([0.45, 1.5, 0.15], [0.85, 2.0, -0.05], 0.03, 4, '#f5ead0')
      b.pop()
    }
    // telescope (left-back)
    b.push().at(-8.1, 0, -3.1)
    for (const a of [0, 2.1, 4.2]) b.push().rotY(a).at(0.5, 0, 0).rotZ(0.3).cyl(0.045, 0.06, 1.8, 5, BRASS_D).pop()
    b.bar([-0.2, 1.7, 0.2], [0.75, 2.3, -0.55], 0.17, 10, BRASS)
    b.bar([0.7, 2.25, -0.5], [1.05, 2.5, -0.75], 0.24, 10, '#2b2438')
    b.bar([-0.2, 1.7, 0.2], [-0.4, 1.56, 0.34], 0.1, 8, BRASS_D)
    b.pop()
    // globe (right-back)
    b.push().at(8.1, 0, -3.1)
    b.cyl(0.5, 0.6, 0.18, 12, BRASS_D)
    b.put(0, 0.18, 0, (b) => b.cyl(0.08, 0.08, 1.0, 6, BRASS))
    b.put(0, 1.7, 0, (b) => b.sphere(0.8, '#2f6fae', { glow: 0.05 }, 16, 12))
    b.put(0.15, 1.75, 0.3, (b) => b.sphere(0.5, '#e9c977', {}, 10, 8))
    b.put(0, 1.7, 0, (b) => b.rotZ(0.4).torus(0.9, 0.03, BRASS, {}, Math.PI * 2, 5, 28))
    b.pop()
    cat(b, 3.0, 1.2, 2.4, '#2c2a48')
    plant(b, -9.1, -5.0, 1.3, P.pink)
    plant(b, 9.1, -5.0, 1.3, P.marigold)
  }
  return b.build()
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// ---- door -----------------------------------------------------------------------------------------------------
function LanternDoor({ d, i }: { d: Door; i: number }) {
  const p = doorPose(i)
  const open = useOpen()
  const geo = useMemo(() => {
    const b = new GeoBuilder(60 + i)
    b.ao = 0
    const w = DOOR_W
    const h = DOOR_H
    b.put(w / 2, 0, 0, (b) => b.arch(w - 0.04, h - 0.02, 0.14, d.color))
    // planks, rails and a brass handle
    for (let k = 1; k < 4; k++) b.put((k * w) / 4, 0.16, 0.085, (b) => b.box(0.045, h - 0.9, 0.02, shadeHex(d.color, 0.7)))
    b.put(w * 0.5, h * 0.55, 0.09, (b) => b.box(w * 0.92, 0.09, 0.03, shadeHex(d.color, 0.7)))
    b.put(w * 0.5, h * 0.24, 0.09, (b) => b.box(w * 0.92, 0.09, 0.03, shadeHex(d.color, 0.7)))
    b.put(w * 0.82, h * 0.38, 0.14, (b) => b.sphere(0.1, BRASS, {}, 8, 6))
    return b.build()
  }, [d.color, i])
  const mat = useMemo(() => worldMaterial({}), [])
  const hinge = useRef<Group>(null)
  const st = useRef({ open: 0, until: 0 })
  const glowMat = useMemo(() => new MeshBasicMaterial({ color: new Color(d.color).lerp(new Color('#ffffff'), 0.4), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false }), [d.color])
  const spillMat = useMemo(() => new MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, side: DoubleSide }), [d.color])
  const glowGeo = useMemo(() => new PlaneGeometry(DOOR_W, DOOR_H * 0.98), [])
  const spillGeo = useMemo(() => new PlaneGeometry(DOOR_W * 1.5, 4.6).rotateX(-Math.PI / 2), [])
  const plate = useMemo(() => signTexture({ text: d.label, color: '#fff8ea', bg: '#161a48', border: d.color, w: 1024, h: 256, letterSpacing: 1 }), [d.label, d.color])
  useFrame((_, dt) => {
    if (game.mode !== 'interior') return
    const s = st.current
    const want = game.time < s.until || store.getState().panel?.id === `door-${d.id}`
    s.open = damp(s.open, want ? 1 : 0, want ? 5 : 2.4, Math.min(dt, 0.05))
    if (hinge.current) hinge.current.rotation.y = -s.open * 1.6
    glowMat.opacity = 1.0 * s.open
    spillMat.opacity = 0.42 * s.open
  })
  const fx = p.x + Math.sin(p.rot) * 2.0
  const fz = p.z + Math.cos(p.rot) * 2.0
  return (
    <>
      <group position={[p.x, 0, p.z]} rotation={[0, p.rot, 0]}>
        <group ref={hinge} position={[-DOOR_W / 2, 0, 0.1]}>
          <mesh geometry={geo} material={mat} castShadow />
        </group>
        <mesh geometry={glowGeo} material={glowMat} position={[0, DOOR_H * 0.49, -0.05]} renderOrder={4} />
        <mesh geometry={spillGeo} material={spillMat} position={[0, 0.09, 2.3]} renderOrder={4} />
        <SignBoard map={plate} w={3.9} h={0.98} position={[0, DOOR_H + 0.95, 0.1]} lit={false} />
      </group>
      <Hotspot
        id={`door-${d.id}`}
        x={fx}
        y={1.0}
        z={fz}
        radius={2.5}
        label="OPEN THE DOOR"
        title={d.label}
        look={[p.x, 2, p.z]}
        markAt={[p.x, DOOR_H + 2.0, p.z]}
        onUse={() => {
          st.current.until = game.time + 7
          const panel = doorPanel(d.id)
          if (panel) open(panel, p.x, 2.2, p.z, 10.5)
        }}
      />
    </>
  )
}

function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * k)
  const g = Math.round(((n >> 8) & 255) * k)
  const bl = Math.round((n & 255) * k)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

// ---- lens + beams ------------------------------------------------------------------------------------------------
function Lens({ boost }: { boost: { v: number } }) {
  const geo = useMemo(buildLens, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const beamG = useMemo(() => beamGeometry(3.4, 26, 28).rotateZ(Math.PI / 2), [])
  const beamM = useMemo(() => makeBeamMaterial('#ffe9b6', 0.2), [])
  const coreG = useMemo(() => beamGeometry(1.1, 26, 20).rotateZ(Math.PI / 2), [])
  const coreM = useMemo(() => makeBeamMaterial('#fff6dc', 0.24), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffd98a', 0.9), [])
  const halo2 = useMemo(() => glowSpriteMaterial('#fff4d0', 0.8), [])
  const spin = useRef<Group>(null)
  const sweep = useRef<Group>(null)
  useFrame((_, dt) => {
    if (game.mode !== 'interior') return
    const d = Math.min(dt, 0.05)
    boost.v = Math.max(0, boost.v - d * 0.25)
    if (spin.current) spin.current.rotation.y += d * (0.5 + boost.v * 3)
    if (sweep.current) sweep.current.rotation.y -= d * (0.45 + boost.v * 1.6)
    beamM.uniforms.uOpacity.value = 0.2 + boost.v * 0.25
    coreM.uniforms.uOpacity.value = 0.24 + boost.v * 0.3
  })
  return (
    <group position={[LENS.x, 0, LENS.z]}>
      <group ref={spin}>
        <mesh geometry={geo} material={mat} castShadow />
      </group>
      <group ref={sweep} position={[0, 2.5, 0]}>
        {[0, Math.PI].map((a) => (
          <group key={a} rotation={[0, a, 0]}>
            <mesh geometry={beamG} material={beamM} renderOrder={5} />
            <mesh geometry={coreG} material={coreM} renderOrder={5} />
          </group>
        ))}
      </group>
      <sprite material={halo} position={[0, 2.5, 0]} scale={[8.5, 8.5, 1]} />
      <sprite material={halo2} position={[0, 2.5, 0]} scale={[3.4, 3.4, 1]} />
    </group>
  )
}

// ---- canvases -----------------------------------------------------------------------------------------------------
function closerTexture() {
  const w = 1600
  const h = 420
  const { c, g } = makeCanvas(w, h)
  g.fillStyle = '#231d44'
  roundRect(g, 0, 0, w, h, 60)
  g.fill()
  g.lineWidth = 12
  g.strokeStyle = BRASS
  roundRect(g, 14, 14, w - 28, h - 28, 48)
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = 'rgba(217,164,65,0.5)'
  roundRect(g, 34, 34, w - 68, h - 68, 36)
  g.stroke()
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const text = CLOSER.toUpperCase().replace(/[.]$/, '')
  const words = text.split(' ')
  const mid = Math.ceil(words.length / 2)
  const lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  g.font = `900 132px ${FONT.display}`
  g.shadowColor = 'rgba(255,196,90,0.9)'
  g.shadowBlur = 34
  g.fillStyle = '#ffe3a1'
  lines.forEach((ln, i) => g.fillText(ln, w / 2, 148 + i * 138))
  g.shadowBlur = 0
  g.fillStyle = '#fff8ea'
  lines.forEach((ln, i) => g.fillText(ln, w / 2, 148 + i * 138))
  return toTexture(c, 8)
}

function neonTexture() {
  const w = 1024
  const h = 256
  const { c, g } = makeCanvas(w, h)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `900 150px ${FONT.display}`
  for (const [blur, col] of [
    [60, 'rgba(255,90,120,0.9)'],
    [26, 'rgba(255,120,150,1)'],
    [8, '#ff8fa8'],
  ] as const) {
    g.shadowColor = col
    g.shadowBlur = blur
    g.fillStyle = '#ffb3c4'
    g.fillText('HIRE LOCHAN', w / 2, h / 2)
  }
  g.shadowBlur = 0
  g.fillStyle = '#fff1f4'
  g.fillText('HIRE LOCHAN', w / 2, h / 2)
  return toTexture(c, 4)
}

function nameTexture() {
  const { c, g } = makeCanvas(256, 340)
  g.fillStyle = '#fdf6e8'
  g.fillRect(0, 0, 256, 340)
  g.fillStyle = P.red
  g.fillRect(0, 0, 256, 96)
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.font = `900 52px ${FONT.sans}`
  g.fillText('HELLO', 128, 62)
  g.font = `500 26px ${FONT.mono}`
  g.fillStyle = '#7a6a60'
  g.fillText('my name is', 128, 142)
  g.font = `700 74px ${FONT.hand}`
  g.fillStyle = '#2b2438'
  g.fillText(SITE.first, 128, 236)
  g.strokeStyle = '#2b2438'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(52, 262)
  g.lineTo(204, 262)
  g.stroke()
  return toTexture(c, 4)
}

function plateTexture(label: string, value: string) {
  const { c, g } = makeCanvas(512, 150)
  g.fillStyle = '#12153a'
  roundRect(g, 0, 0, 512, 150, 22)
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = BRASS
  roundRect(g, 5, 5, 502, 140, 18)
  g.stroke()
  g.textAlign = 'center'
  g.fillStyle = '#ffe3a1'
  g.font = `900 58px ${FONT.display}`
  g.fillText(label.toUpperCase(), 256, 70)
  g.fillStyle = 'rgba(255,248,234,0.75)'
  let s = 26
  g.font = `500 ${s}px ${FONT.mono}`
  while (g.measureText(value).width > 470 && s > 12) {
    s -= 1
    g.font = `500 ${s}px ${FONT.mono}`
  }
  g.fillText(value, 256, 116)
  return toTexture(c, 4)
}

// ---- the room ---------------------------------------------------------------------------------------------------------
function HireContent() {
  const geo = useMemo(buildHire, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const glassGeo = useMemo(() => {
    const r = ringWallGeos(R + 0.02, 0.02, 6.6, 1.2, 112)
    r.outer.dispose()
    r.cap.dispose()
    r.skirt.dispose()
    return r.inner
  }, [])
  const glassMat = useMemo(() => new MeshBasicMaterial({ color: '#9db8ff', transparent: true, opacity: 0.07, depthWrite: false, side: DoubleSide, toneMapped: false }), [])
  const open = useOpen()
  const boost = useMemo(() => ({ v: 0 }), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffbf6a', 0.6), [])
  const closer = useMemo(closerTexture, [])
  const neon = useMemo(neonTexture, [])
  const nameTex = useMemo(nameTexture, [])
  const plane = useRef<Group>(null)
  const planeGeo = useMemo(paperPlaneGeo, [])
  const planeMat = useMemo(() => new MeshBasicMaterial({ color: '#fff6e0', side: DoubleSide, toneMapped: false }), [])
  const plateTex = useMemo(() => Object.fromEntries(CHANNELS.map((c) => [c.id, plateTexture(c.label, c.value)])), [])
  const hasX = CHANNELS.some((c) => c.id === 'x')

  useRingWall(R, 36, 3.2)

  useFrame((s) => {
    if (game.mode !== 'interior' || !plane.current) return
    plane.current.position.y = 2.15 + Math.sin(s.clock.elapsedTime * 1.6) * 0.1
    plane.current.rotation.y = s.clock.elapsedTime * 0.9
  })

  const note = (id: string, text: string) => () => {
    const st = store.getState()
    st.showToast(text, st.addSecret(id) ? 'secret' : 'info')
  }

  return (
    <>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      <SolidCircle at={[LENS.x, LENS.z, 1.9, 4]} />
      {DOORS.map((_, i) => (
        <SolidBox key={i} at={[doorPose(i).x, doorPose(i).z, 1.6, 0.5, 4, doorPose(i).rot]} />
      ))}
      {CHANNELS.map((c) => {
        const s = SLOTS[CHAN_SLOT[c.id as ChanId]]
        return s ? <SolidCircle key={c.id} at={[s.x, s.z, 1.0, 1.4]} /> : null
      })}
      {!hasX && <SolidCircle at={[SLOTS.R3.x, SLOTS.R3.z, 0.9, 2]} />}
      <SolidCircle at={[-8.1, -3.1, 0.7, 3]} />
      <SolidCircle at={[8.1, -3.1, 0.8, 3]} />
      <SolidCircle at={[-9.1, -5.0, 0.6, 2]} />
      <SolidCircle at={[9.1, -5.0, 0.6, 2]} />
      <mesh geometry={glassGeo} material={glassMat} renderOrder={3} />
      <Stars count={320} radius={150} />
      <Motes count={60} box={[20, 7, 18]} color="#ffdc8f" size={3.2} position={[0, 0, 0]} />
      <Lens boost={boost} />
      {DOORS.map((d, i) => (
        <LanternDoor key={d.id} d={d} i={i} />
      ))}

      {/* the closing line, set into the floor where you arrive */}
      <mesh position={[0, 0.095, 3.7]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
        <planeGeometry args={[8.8, 2.31]} />
        <meshBasicMaterial map={closer} transparent toneMapped={false} />
      </mesh>
      <SignBoard map={neon} w={6.4} h={1.6} position={[0, 5.6, -R + 0.5]} lit={false} />
      <sprite material={halo} position={[0, 5.6, -R + 0.9]} scale={[9, 4, 1]} />

      {/* nameplates + the paper plane above the envelope */}
      {CHANNELS.map((c) => {
        const s = SLOTS[CHAN_SLOT[c.id as ChanId]]
        if (!s) return null
        return <SignBoard key={c.id} map={plateTex[c.id]} w={1.8} h={0.53} position={[s.x, 2.95, s.z + 0.15]} rotation={[-0.3, 0, 0]} lit={false} />
      })}
      <group ref={plane} position={[SLOTS.L1.x, 2.15, SLOTS.L1.z]}>
        <mesh geometry={planeGeo} material={planeMat} scale={0.8} />
      </group>
      <SignBoard map={nameTex} w={0.98} h={1.3} position={[SLOTS.L2.x, 1.63, SLOTS.L2.z - 0.1]} rotation={[-0.22, 0, 0]} lit={false} />

      {CHANNELS.map((c) => {
        const s = SLOTS[CHAN_SLOT[c.id as ChanId]]
        if (!s) return null
        return (
          <Hotspot
            key={c.id}
            id={`chan-${c.id}`}
            x={s.x}
            y={1.0}
            z={s.z + 0.9}
            radius={2.6}
            label={CHAN_LABEL[c.id as ChanId]}
            title={c.label}
            look={[s.x, 1.6, s.z]}
            markAt={[s.x, 3.75, s.z]}
            onUse={() => {
              const p = channelPanel(c.id)
              if (p) open(p, s.x, 1.7, s.z, 11, 0.85)
            }}
          />
        )
      })}

      {!hasX && (
        <Hotspot
          id="guestbook"
          x={SLOTS.R3.x}
          y={1.0}
          z={SLOTS.R3.z + 0.9}
          radius={2.4}
          label="SIGN"
          title="Guestbook"
          kind="secret"
          look={[SLOTS.R3.x, 1.4, SLOTS.R3.z]}
          onUse={note('guestbook', 'You signed the guestbook. Now sign an email.')}
        />
      )}
      <Hotspot id="telescope" x={-8.1} y={1.0} z={-1.9} radius={2.4} label="LOOK" title="Telescope" kind="secret" look={[-7.6, 2.1, -3.4]} onUse={note('telescope', 'Nothing but stars. Somewhere below: a small desert planet full of good ideas.')} />
      <Hotspot
        id="lens"
        x={LENS.x}
        y={1.0}
        z={LENS.z + 2.6}
        radius={2.0}
        label="BOOST"
        title="The lens"
        kind="secret"
        look={[LENS.x, 2.4, LENS.z]}
        onUse={() => {
          boost.v = 1
          note('lens', 'Signal boosted. Somewhere, someone just saw a good idea.')()
        }}
      />
    </>
  )
}

function SolidCircle({ at }: { at: [number, number, number, number] }) {
  useCircle(at[0], at[1], at[2], at[3])
  return null
}
function SolidBox({ at }: { at: [number, number, number, number, number, number] }) {
  useBox(at[0], at[1], at[2], at[3], at[4], at[5])
  return null
}

export function HireRoom() {
  return (
    <Interior id="hire" w={R * 2} d={R * 2} floor="wood">
      <HireContent />
    </Interior>
  )
}

