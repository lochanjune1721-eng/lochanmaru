// RESULTS — "The Signal Room": a night-time observatory where the scale of the work stands around you as
// glowing monuments that power up as you approach. A paper ticker tape winds across the floor carrying
// the twelve receipts. Everything is procedural: merged geometry, canvas paintings and ONE additive
// instanced batch for every glow / star / spark (see results.fx.ts).
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three'
import { projectPanel } from '../content/panels'
import { projectById } from '../content/projects'
import { BIG, PROOF, type Proof } from '../content/results'
import { game } from '../engine/game'
import { easeOutCubic, rng } from '../engine/math'
import { quality } from '../engine/quality'
import { cam, player } from '../engine/state'
import { store, type PanelContent } from '../engine/store'
import { GeoBuilder } from '../gfx/geo'
import { worldMaterial } from '../gfx/materials'
import { FONT, makeCanvas, toTexture } from '../gfx/text'
import { Fx, K, Sparks, lin } from './results.fx'
import {
  COUNTER,
  D,
  MACHINE,
  MONOS,
  NEON,
  SCOPE,
  TURN,
  W,
  WIN_X,
  buildCardFeet,
  buildCardGeometry,
  buildLedGeometry,
  buildMachine,
  buildMonuments,
  buildScope,
  buildShell,
  buildShellNeon,
  buildTape,
  buildTurnstile,
  buildTurnstileArms,
  monoMatrix,
  monoPoint,
  placeCards,
  tapeCurve,
} from './results.geo'
import { CARD_ACCENT, LedAtlas, makeFloorTexture, makeReceiptAtlas, makeTapeTexture, type LedFace } from './results.tex'
import { Hotspot, Interior, hasSeen, useCircle, useInterior, useOpen } from './kit'

// ---- FX slot map ----------------------------------------------------------------------------------------
const NSTAR = 320
const S_NEB = NSTAR
const S_MOON = S_NEB + 6
const STATIC_END = S_MOON + 1
const S_MOTE = STATIC_END
const NMOTE = 110
const S_SPARK = S_MOTE + NMOTE
const NSPARK = 170
const S_RING = S_SPARK + NSPARK
const NRING = 16
const S_ORB = S_RING + NRING
const NORB = 42
const S_GLOBE = S_ORB + NORB
const NGLOBE = 150
const S_MARQ = S_GLOBE + NGLOBE
const MARQ_PER = 36
const S_SHOOT = S_MARQ + 3 * MARQ_PER
const NSHOOT = 9
const S_HALO = S_SHOOT + NSHOOT
// halo block layout
const H_DISP = 0 // +i : glow in front of each display
const H_POOL = 7 // +i : floor pool
const H_TOP = 14 // +i : beacon flare
const H_FLAME = 21 // 3 flames
const H_HEART = 24
const H_CORE = 25
const H_DOME = 26
const H_TURN = 27
const H_SPEC = 28
const H_CARD = 30 // +k : 12 unread flares
const H_SPILL = 44 // +i : light spilled on the floor in front of each display
const NHALO = 52
const CAP = S_HALO + NHALO

const N = MONOS.length
const CARD_KEYS = PROOF.map((p) => `results:rc-${p.id}`)
const BIGS = MONOS.map((m) => BIG.find((b) => b.id === m.id)!)
const TITLES = BIGS.map((b) => `${b.value} ${b.label}`)
const DECS = BIGS.map((b) => (String(b.num).includes('.') ? 1 : 0))

// local tops of each monument (beacon flare)
const TOPS: [number, number, number][] = [
  [0, 8.7, -0.1],
  [0, 7.73, 0],
  [0, 5.25, 0],
  [0, 2.5, 0.1],
  [0, 5.8, -0.1],
  [0, 5.42, -0.08],
  [0, 5.5, 0],
]

const ORB_COLORS = [NEON.coral, NEON.gold, NEON.magenta, NEON.cyan, NEON.mint, NEON.violet].map(lin)
const C_FLAME = lin('#ff8a44')
const C_DOME = lin('#ffcf8a')
const C_GOLD = lin(NEON.gold)
const C_CARD = lin('#ffdc7a')

// scratch (no allocations per frame)
const _v = new Vector3()
const rand = rng(31337)

function Circle({ x, z, r, h = 3 }: { x: number; z: number; r: number; h?: number }) {
  useCircle(x, z, r, h)
  return null
}

const note = (id: string, text: string) => () => {
  const st = store.getState()
  st.showToast(text, st.addSecret(id) ? 'secret' : 'info')
}

function proofPanel(p: Proof, i: number): PanelContent {
  if (p.projectId) {
    const pr = projectById(p.projectId)
    if (pr) return projectPanel(pr)
  }
  const blocks: PanelContent['blocks'] = [{ t: 'metrics', items: [{ value: p.value, label: p.label }] }]
  if (p.who.includes(' · ')) blocks.push({ t: 'tags', items: p.who.split(' · ') })
  return {
    id: `proof-${p.id}`,
    kicker: 'The receipts',
    title: p.who,
    accent: CARD_ACCENT[i % CARD_ACCENT.length],
    blocks,
  }
}

// ---- the collar of scrolling text around the colossus ---------------------------------------------------------
function bandTexture(text: string): CanvasTexture {
  const { c, g } = makeCanvas(1024, 96)
  g.fillStyle = '#080522'
  g.fillRect(0, 0, 1024, 96)
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.font = `800 50px ${FONT.sans}`
  ;(g as any).letterSpacing = '5px'
  const sep = '   ✦   '
  const unit = `${text}${sep}`
  const w1 = g.measureText(unit).width
  const reps = Math.max(1, Math.round(1024 / w1))
  const scale = 1024 / (w1 * reps)
  g.save()
  g.scale(scale, 1)
  g.fillStyle = NEON.gold
  g.shadowColor = NEON.gold
  g.shadowBlur = 12
  for (let i = 0; i < reps; i++) g.fillText(unit, i * w1 + 4, 50)
  g.restore()
  g.fillStyle = 'rgba(3,2,16,0.3)'
  for (let x = 0; x < 1024; x += 4) g.fillRect(x, 0, 1, 96)
  const t = toTexture(c, 8) as CanvasTexture
  t.wrapS = RepeatWrapping
  return t
}

// ---- static + animated pieces ------------------------------------------------------------------------------------
function ResultsContent() {
  const { X0 } = useInterior()
  const open = useOpen()
  const gRings = useRef<(Group | null)[]>([null, null, null])
  const domeRef = useRef<Mesh>(null)
  const armsRef = useRef<Mesh>(null)
  const bandRef = useRef<Mesh>(null)

  const built = useMemo(() => {
    const b = new GeoBuilder(1201)
    buildShell(b)
    const cards = placeCards(PROOF.length)
    buildCardFeet(b, cards)
    buildMachine(b)
    buildTurnstile(b)
    buildScope(b)
    const neon = buildMonuments(b, [buildShellNeon()])
    const geo = b.build()
    const tape = buildTape()
    const cardGeo = buildCardGeometry(cards)
    // LED faces: 7 monuments + the turnstile tally
    const faces: LedFace[] = MONOS.map((m, i) => ({ cell: i, w: m.disp.w, h: m.disp.h, color: m.color, color2: m.color2, label: BIGS[i].label }))
    const items = MONOS.map((m, i) => {
      const mat = monoMatrix(m)
        .multiply(new Matrix4().makeTranslation(m.disp.x, m.disp.y, m.disp.z))
        .multiply(new Matrix4().makeRotationX(m.disp.tilt))
      return { m: mat, w: m.disp.w, h: m.disp.h, cell: i }
    })
    items.push({ m: new Matrix4().makeTranslation(TURN.x, 0.77, TURN.z + 0.312), w: 0.44, h: 0.22, cell: 7 })
    const ledGeo = buildLedGeometry(items)
    return { geo, neon, tape, cards, cardGeo, faces, ledGeo }
  }, [])

  const res = useMemo(() => {
    const atlas = new LedAtlas()
    const staticMat = worldMaterial({})
    const neonMat = new MeshBasicMaterial({ vertexColors: true, toneMapped: false, fog: false })
    const ledMat = new MeshBasicMaterial({ map: atlas.tex, vertexColors: true, toneMapped: false, fog: false })
    const receiptTex = makeReceiptAtlas()
    const cardMat = worldMaterial({ map: receiptTex, alphaTest: 0.5, rim: false, double: true })
    const tapeTex = makeTapeTexture()
    const tapeMat = new MeshBasicMaterial({ map: tapeTex, side: DoubleSide, toneMapped: false, fog: false, color: '#d8d2ff' })
    const floorTex = makeFloorTexture(WIN_X)
    const floorMat = new MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false, toneMapped: false, fog: false })
    const floorGeo = new PlaneGeometry(W, D).rotateX(-Math.PI / 2)
    const domeGeo = new SphereGeometry(0.5, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2)
    const domeMat = new MeshBasicMaterial({ color: '#b9d6ff', transparent: true, opacity: 0.17, depthWrite: false, side: DoubleSide, toneMapped: false, fog: false })
    const armsGeo = buildTurnstileArms()
    const ringGeo = new TorusGeometry(1, 0.028, 6, 96)
    const ringMats = [NEON.gold, NEON.cyan, NEON.magenta].map((c) => new MeshBasicMaterial({ color: c, toneMapped: false, fog: false }))
    const bandTex = bandTexture(BIGS[0].value + ' ' + BIGS[0].label)
    const bandGeo = new CylinderGeometry(0.9, 0.9, 0.4, 40, 1, true)
    const bandMat = new MeshBasicMaterial({ map: bandTex, side: DoubleSide, toneMapped: false, fog: false })
    const fx = new Fx(CAP)
    const sparks = new Sparks(fx, S_SPARK, NSPARK, S_RING, NRING)
    return { atlas, staticMat, neonMat, ledMat, receiptTex, cardMat, tapeTex, tapeMat, floorTex, floorMat, floorGeo, domeGeo, domeMat, armsGeo, ringGeo, ringMats, bandTex, bandGeo, bandMat, fx, sparks }
  }, [])

  // ---- runtime state (typed arrays, no per-frame allocations) ---------------------------------------------------
  const S = useMemo(() => {
    const fx = res.fx
    const r = rng(2024)
    const white = lin('#dfe6ff')
    const blue = lin('#9fb8ff')
    const gold = lin('#ffe6a8')
    const pink = lin('#ffb5e6')
    // stars (mostly in the cone you can see through the windows / over the sides)
    for (let i = 0; i < NSTAR; i++) {
      const vis = i < NSTAR * 0.64
      const az = vis ? (r() - 0.5) * 2 * 1.2 : (r() - 0.5) * 2 * 2.9
      const el = vis ? -0.14 - r() * 0.78 : -1.2 + r() * 1.9
      const dist = 105 + r() * 60
      const x = dist * Math.cos(el) * Math.sin(az)
      const y = 8 + dist * Math.sin(el)
      const z = -dist * Math.cos(el) * Math.cos(az)
      const q = r()
      const c = q < 0.5 ? white : q < 0.75 ? blue : q < 0.92 ? gold : pink
      const bigStar = r() < 0.09
      fx.put(i, K.star, r(), x, y, z, bigStar ? 1.7 + r() * 0.9 : 0.5 + r() * 0.85, c[0], c[1], c[2], 0.5 + r() * 0.5)
    }
    // nebula washes far behind the windows
    const neb: [string, number, number, number, number][] = [
      ['#6a3cff', 0.5, -0.36, 62, 0.13],
      ['#ff4fa8', -0.15, -0.42, 50, 0.09],
      ['#2f9bff', 0.85, -0.5, 56, 0.1],
      ['#7a3cff', -0.75, -0.3, 58, 0.1],
      ['#36e0ff', 0.05, -0.62, 44, 0.07],
      ['#ff6ab8', 0.98, -0.28, 40, 0.07],
    ]
    neb.forEach(([hex, az, el, size, a], i) => {
      const c = lin(hex)
      const dist = 150
      fx.put(S_NEB + i, K.glow, 0, dist * Math.cos(el) * Math.sin(az), 8 + dist * Math.sin(el), -dist * Math.cos(el) * Math.cos(az), size, c[0], c[1], c[2], a)
    })
    // the moon
    {
      const az = 0.34
      const el = -0.29
      const dist = 150
      const c = lin('#fff1cf')
      fx.put(S_MOON, K.moon, 0, dist * Math.cos(el) * Math.sin(az), 8 + dist * Math.sin(el), -dist * Math.cos(el) * Math.cos(az), 30, c[0], c[1], c[2], 1)
    }
    // motes: [bx,by,bz, ax,ay,az, f1,f2,f3, ph, size, twinkle]
    const mote = new Float32Array(NMOTE * 12)
    const mc = [lin('#c9c2ff'), lin('#8fe6ff'), lin('#ffe6a8'), lin('#ffb0e0')]
    for (let i = 0; i < NMOTE; i++) {
      const o = i * 12
      mote[o] = (r() - 0.5) * 27
      mote[o + 1] = 0.5 + r() * 6.5
      mote[o + 2] = (r() - 0.5) * 19
      mote[o + 3] = 0.4 + r() * 0.9
      mote[o + 4] = 0.25 + r() * 0.6
      mote[o + 5] = 0.4 + r() * 0.9
      mote[o + 6] = 0.12 + r() * 0.22
      mote[o + 7] = 0.15 + r() * 0.25
      mote[o + 8] = 0.1 + r() * 0.2
      mote[o + 9] = r() * 6.28
      mote[o + 10] = 0.05 + r() * 0.09
      mote[o + 11] = 0.6 + r() * 1.4
      const c = mc[i % mc.length]
      fx.put(S_MOTE + i, K.glow, 0, 0, 0, 0, mote[o + 10], c[0], c[1], c[2], 0.4)
    }
    // orbs of the gathering: [R, w, ph, h, tilt, size, color]
    const orb = new Float32Array(NORB * 8)
    for (let i = 0; i < NORB; i++) {
      const o = i * 8
      const ring = i % 3
      orb[o] = 1.6 + ring * 0.6 + r() * 0.3
      orb[o + 1] = (0.45 + r() * 0.5) * (ring % 2 ? -1 : 1)
      orb[o + 2] = r() * 6.28
      orb[o + 3] = 0.9 + ring * 0.5 + r() * 0.5
      orb[o + 4] = (r() - 0.5) * 0.9
      orb[o + 5] = 0.15 + r() * 0.14
      orb[o + 6] = i % ORB_COLORS.length
    }
    // globe of light-points (Fibonacci sphere, tilted)
    const globe = new Float32Array(NGLOBE * 3)
    const tilt = 0.42
    for (let i = 0; i < NGLOBE; i++) {
      const y = 1 - (i / (NGLOBE - 1)) * 2
      const rad = Math.sqrt(1 - y * y)
      const th = i * 2.399963
      let x = Math.cos(th) * rad
      let z = Math.sin(th) * rad
      let yy = y
      const c = Math.cos(tilt)
      const s = Math.sin(tilt)
      const nx = x * c - yy * s
      const ny = x * s + yy * c
      x = nx
      yy = ny
      globe[i * 3] = x
      globe[i * 3 + 1] = yy
      globe[i * 3 + 2] = z
    }
    // marquee dots around the three masts' screens
    const marq: Float32Array[] = []
    const marqN: number[] = []
    for (let j = 0; j < 3; j++) {
      const m = MONOS[4 + j]
      const hw = m.disp.w / 2 + 0.07
      const hh = m.disp.h / 2 + 0.07
      const per = 4 * (hw + hh)
      const n = Math.min(MARQ_PER, Math.round(per / 0.36))
      const arr = new Float32Array(n * 3)
      for (let k = 0; k < n; k++) {
        let s = (k / n) * per
        let lx: number
        let ly: number
        if (s < 2 * hw) {
          lx = -hw + s
          ly = hh
        } else if ((s -= 2 * hw) < 2 * hh) {
          lx = hw
          ly = hh - s
        } else if ((s -= 2 * hh) < 2 * hw) {
          lx = hw - s
          ly = -hh
        } else {
          s -= 2 * hw
          lx = -hw
          ly = -hh + s
        }
        const p = monoPoint(m, m.disp.x + lx, m.disp.y + ly, m.disp.z + 0.13)
        arr[k * 3] = p.x
        arr[k * 3 + 1] = p.y
        arr[k * 3 + 2] = p.z
      }
      marq.push(arr)
      marqN.push(n)
    }
    fx.commitStatic(STATIC_END)
    // anchors per monument
    const A = MONOS.map((m, i) => ({
      disp: monoPoint(m, m.disp.x, m.disp.y, m.disp.z),
      halo: monoPoint(m, m.disp.x, m.disp.y, m.disp.z + 0.75),
      burst: monoPoint(m, m.burst[0], m.burst[1], m.burst[2]),
      base: monoPoint(m, 0, 0, 0),
      top: monoPoint(m, TOPS[i][0], TOPS[i][1], TOPS[i][2]),
      hs: monoPoint(m, m.hs[0], 1.0, m.hs[1]),
      spill: monoPoint(m, m.disp.x, 0, m.disp.z + 1.5 + m.disp.w * 0.12),
      rgb: lin(m.color),
      rgb2: lin(m.color2),
    }))
    const st = {
      power: new Float32Array(N).fill(0.25),
      flash: new Float32Array(N),
      on: new Uint8Array(N),
      t0: new Float32Array(N).fill(-99),
      onAt: new Float32Array(N).fill(-99),
      lastDraw: new Float32Array(N).fill(-99),
      lastStr: BIGS.map((b) => b.value),
      br: new Float32Array(N).fill(-1),
      kn: new Float32Array(N).fill(-1),
      acc: new Float32Array(N),
      mq: new Float32Array(3),
      orbClock: 0,
      globeClock: 0,
      ringClock: 0,
      active: false,
      last: 0,
      tapeKick: -99,
      shootAt: 4,
      shootT0: -99,
      shootP: new Float32Array(3),
      shootV: new Float32Array(3),
      turnCount: 0,
      turnAng: 0,
      turnTarget: 0,
      turnKick: -99,
      feed: 0,
      mote,
      orb,
      globe,
      marq,
      marqN,
      A,
    }
    return st
  }, [res])

  // initial paints (fonts are ready before the world mounts)
  useEffect(() => {
    built.faces.forEach((f, i) => res.atlas.paint(f, BIGS[i].value))
    res.atlas.paintCounter(7, 0)
    const c = built.neon.geo.attributes.color as unknown as { array: Float32Array; needsUpdate: boolean }
    for (let i = 0; i < N; i++) applyNeon(c, built.neon.ranges[i], built.neon.base, 0.34 + 0.66 * 0.25)
    applyNeon(c, built.neon.ranges[N], built.neon.base, 0.85)
    c.needsUpdate = true
    if (typeof location !== 'undefined' && location.search.includes('debug')) {
      ;(window as any).__res = { S, fx: res.fx, sparks: res.sparks, atlas: res.atlas, built, burst, monos: MONOS, tapeCurve }
    }
  }, [built, res, S])

  const burst = (i: number) => {
    const t = game.time
    const m = MONOS[i]
    const a = S.A[i]
    S.flash[i] = 1
    res.sparks.ring(t, a.base.x, a.base.z, 5.5 + m.r * 1.3, 0.95, a.rgb)
    res.sparks.ring(t, a.base.x, a.base.z, 3.2 + m.r * 0.8, 0.75, a.rgb2, 0.14)
    for (let k = 0; k < 30; k++) {
      const ang = rand() * 6.283
      const sp = 2.6 + rand() * 4.6
      res.sparks.emit(t, a.burst.x, a.burst.y, a.burst.z, Math.cos(ang) * sp, 2.2 + rand() * 5.2, Math.sin(ang) * sp, 0.9 + rand() * 0.8, 0.13 + rand() * 0.12, rand() < 0.55 ? a.rgb : rand() < 0.5 ? a.rgb2 : WHITE)
    }
    if (i === 0 && !quality.reduced) cam.shake = Math.max(cam.shake, 0.07)
  }

  // ---- the show ---------------------------------------------------------------------------------------------------------
  useFrame(() => {
    if (game.mode !== 'interior' || store.getState().interior !== 'results') {
      if (S.active) {
        // left the room: next visit starts calm, with every display showing its final figure
        S.active = false
        S.power.fill(0.25)
        S.on.fill(0)
        S.flash.fill(0)
        S.lastStr.fill('')
        S.br.fill(-1)
        S.kn.fill(-1)
      }
      return
    }
    const t = game.time
    if (!S.active) {
      S.active = true
      S.last = t
    }
    const dt = Math.max(0, t - S.last)
    S.last = t
    const fx = res.fx
    const px = player.pos.x - X0
    const pz = player.pos.z
    const ledCol = built.ledGeo.attributes.color as unknown as { array: Float32Array; needsUpdate: boolean }
    const neonCol = built.neon.geo.attributes.color as unknown as { array: Float32Array; needsUpdate: boolean }
    const beat = Math.pow(Math.max(0, Math.sin(t * 3.1)), 6)

    // ---- power / count-up / LED brightness / neon ----
    let dirtyLo = 1e9
    let dirtyHi = -1
    for (let i = 0; i < N; i++) {
      const m = MONOS[i]
      const near = Math.hypot(px - m.x, pz - m.z) - m.r < m.reach
      const target = near ? 1 : 0.25
      S.power[i] = target + (S.power[i] - target) * Math.exp(-(near ? 3.4 : 1.1) * dt)
      const pw = S.power[i]
      if (!S.on[i] && pw > 0.6) {
        S.on[i] = 1
        S.t0[i] = t
        S.onAt[i] = t
        S.flash[i] = Math.max(S.flash[i], 0.6)
        S.lastStr[i] = ''
        const a = S.A[i]
        res.sparks.ring(t, a.base.x, a.base.z, 4 + m.r, 0.9, a.rgb)
        for (let k = 0; k < 12; k++) emitTop(i, t, 1.5)
      } else if (S.on[i] && pw < 0.4) {
        S.on[i] = 0
        S.lastStr[i] = ''
        S.t0[i] = -99
      }
      S.flash[i] = Math.max(0, S.flash[i] - dt / 0.75)
      // digits
      let want: string
      if (S.on[i] && t - S.t0[i] < 1.25) {
        const u = Math.min(1, (t - S.t0[i]) / 1.2)
        want = u >= 1 ? BIGS[i].value : countStr(i, u)
      } else want = BIGS[i].value
      if (want !== S.lastStr[i] && (t - S.lastDraw[i] >= 0.055 || want === BIGS[i].value)) {
        res.atlas.paint(built.faces[i], want)
        S.lastStr[i] = want
        S.lastDraw[i] = t
      }
      // led brightness with a power-on flicker
      const age = t - S.onAt[i]
      const flick = age >= 0 && age < 0.46 && !quality.reduced ? (Math.floor(age * 6.5) % 2 === 0 ? 0.4 : 1) : 1
      const br = (0.58 + 0.42 * pw) * (1 + 0.85 * S.flash[i]) * flick
      if (Math.abs(br - S.br[i]) > 0.003) {
        S.br[i] = br
        const o = i * 12
        for (let q = 0; q < 12; q++) ledCol.array[o + q] = br
        ledCol.needsUpdate = true
      }
      // neon accents
      const kn = (0.34 + 0.66 * pw) * (1 + 1.2 * S.flash[i]) * (i === 3 ? 1 + 0.3 * beat : 1)
      if (Math.abs(kn - S.kn[i]) > 0.003) {
        S.kn[i] = kn
        const rg = built.neon.ranges[i]
        applyNeon(neonCol, rg, built.neon.base, kn)
        if (rg.start < dirtyLo) dirtyLo = rg.start
        if (rg.start + rg.count > dirtyHi) dirtyHi = rg.start + rg.count
      }
      // sparks while powered
      if (S.on[i]) {
        S.acc[i] += dt * 3.2
        let n = 0
        while (S.acc[i] >= 1 && n < 3) {
          S.acc[i] -= 1
          n++
          emitTop(i, t, 1)
        }
        if (S.acc[i] > 3) S.acc[i] = 0
      }
    }
    if (dirtyHi >= 0) {
      const na = built.neon.geo.attributes.color as unknown as { needsUpdate: boolean; clearUpdateRanges: () => void; addUpdateRange: (s: number, c: number) => void }
      na.clearUpdateRanges()
      na.addUpdateRange(dirtyLo * 3, (dirtyHi - dirtyLo) * 3)
      na.needsUpdate = true
    }
    if (S.turnTarget !== S.turnAng) {
      S.turnAng += (S.turnTarget - S.turnAng) * (1 - Math.exp(-13 * dt))
      if (Math.abs(S.turnTarget - S.turnAng) < 0.002) S.turnAng = S.turnTarget
    }
    if (armsRef.current) armsRef.current.rotation.y = S.turnAng

    // ---- halos, pools, beacons ----
    for (let i = 0; i < N; i++) {
      const a = S.A[i]
      const m = MONOS[i]
      const pw = S.power[i]
      const fl = S.flash[i]
      fx.put(S_HALO + H_DISP + i, K.glow, 0, a.halo.x, a.halo.y, a.halo.z, m.disp.w * 0.9, a.rgb[0], a.rgb[1], a.rgb[2], 0.1 + 0.2 * pw + 0.5 * fl)
      fx.put(S_HALO + H_POOL + i, K.pool, 0, a.base.x, 0.03, a.base.z, m.r * 2 + 1.6, a.rgb[0], a.rgb[1], a.rgb[2], 0.06 + 0.2 * pw + 0.4 * fl)
      fx.put(S_HALO + H_SPILL + i, K.pool, 0, a.spill.x, 0.035, a.spill.z, m.disp.w * 0.7, a.rgb[0], a.rgb[1], a.rgb[2], 0.03 + 0.14 * pw + 0.35 * fl)
      const blink = ((t * (1.1 + pw) + i * 0.37) % 1) < 0.22 ? 0.95 : 0.18
      fx.put(S_HALO + H_TOP + i, K.star, 0.1 + i * 0.13, a.top.x, a.top.y, a.top.z, 0.5 + 0.5 * pw, a.rgb2[0], a.rgb2[1], a.rgb2[2], blink * (0.5 + 0.5 * pw))
    }

    // ---- colossus crown: globe, core, rings, collar ----
    {
      const pw = S.power[0]
      S.globeClock += dt * (0.45 + 0.9 * pw)
      S.ringClock += dt * (0.5 + 0.8 * pw)
      const c = S.A[0].base
      const gy = 5.3
      const gz = c.z - 0.1
      const cs = Math.cos(S.globeClock)
      const sn = Math.sin(S.globeClock)
      const R = 1.0
      for (let i = 0; i < NGLOBE; i++) {
        const gx0 = S.globe[i * 3]
        const gy0 = S.globe[i * 3 + 1]
        const gz0 = S.globe[i * 3 + 2]
        const x = gx0 * cs + gz0 * sn
        const z = -gx0 * sn + gz0 * cs
        const front = 0.5 + 0.5 * z
        const col = i % 3 === 0 ? S.A[0].rgb2 : S.A[0].rgb
        fx.put(S_GLOBE + i, K.orb, 0, c.x + x * R, gy + gy0 * R, gz + z * R, 0.09 + 0.06 * front, col[0], col[1], col[2], (0.28 + 0.72 * front) * (0.55 + 0.45 * pw))
      }
      fx.put(S_HALO + H_CORE, K.glow, 0, c.x, gy, gz + 0.2, 3.1 + 0.6 * pw + 1.2 * S.flash[0], S.A[0].rgb2[0], S.A[0].rgb2[1], S.A[0].rgb2[2], 0.2 + 0.4 * pw + 0.4 * S.flash[0])
      for (let k = 0; k < 3; k++) {
        const g = gRings.current[k]
        if (!g) continue
        const dirn = k % 2 ? -1 : 1
        g.rotation.x = 1.15 + k * 0.5 + Math.sin(S.ringClock * 0.6 + k) * 0.35
        g.rotation.y = S.ringClock * (0.55 + k * 0.3) * dirn
        g.rotation.z = k * 0.6
      }
      const band = bandRef.current
      if (band) res.bandTex.offset.x = (res.bandTex.offset.x + dt * (0.03 + 0.08 * pw)) % 1
    }

    // ---- the gathering (community) ----
    {
      const pw = S.power[3]
      S.orbClock += dt * (0.55 + 1.0 * pw)
      const c = S.A[3].base
      for (let i = 0; i < NORB; i++) {
        const o = i * 8
        const a = S.orb[o + 2] + S.orb[o + 1] * S.orbClock
        const R = S.orb[o] * (1 + 0.07 * Math.sin(t * 0.8 + S.orb[o + 2])) * (0.94 + 0.12 * pw)
        const x = Math.cos(a) * R
        const z = Math.sin(a) * R * 0.88
        const y = S.orb[o + 3] + 0.3 * Math.sin(a * 2 + S.orb[o + 2]) + z * S.orb[o + 4] * 0.25
        const col = ORB_COLORS[S.orb[o + 6]]
        fx.put(S_ORB + i, K.orb, 0, c.x + x, y, c.z + z, S.orb[o + 5] * (0.85 + 0.35 * pw), col[0], col[1], col[2], 0.55 + 0.45 * pw)
      }
      const fl = C_FLAME
      for (let k = 0; k < 3; k++) {
        const s = 0.85 + 0.28 * Math.sin(t * (8 + k * 2.3) + k * 2) + 0.35 * pw
        fx.put(S_HALO + H_FLAME + k, K.glow, 0, c.x + (k - 1) * 0.32, 1.65 + k * 0.05 + 0.1 * Math.sin(t * 7 + k), c.z + 0.05, s, fl[0], fl[1], fl[2], 0.22 + 0.24 * pw)
      }
      fx.put(S_HALO + H_HEART, K.glow, 0, c.x, 2.05, c.z + 0.3, 2.0 + 0.5 * beat, S.A[3].rgb[0], S.A[3].rgb[1], S.A[3].rgb[2], 0.2 + 0.25 * pw + 0.2 * beat + 0.4 * S.flash[3])
    }

    // ---- mast marquees ----
    for (let j = 0; j < 3; j++) {
      const i = 4 + j
      const pw = S.power[i]
      S.mq[j] += dt * (3.2 + 6 * pw)
      const arr = S.marq[j]
      const n = S.marqN[j]
      const a = S.A[i]
      for (let k = 0; k < n; k++) {
        const ph = (((k - S.mq[j]) % 6) + 6) % 6
        const b = ph < 1.4 ? 1 : ph < 2.6 ? 0.55 : 0.2
        const col = k % 2 ? a.rgb : a.rgb2
        fx.put(S_MARQ + j * MARQ_PER + k, K.orb, 0, arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2], 0.085, col[0], col[1], col[2], b * (0.4 + 0.6 * pw) + 0.25 * S.flash[i])
      }
      for (let k = n; k < MARQ_PER; k++) fx.hide(S_MARQ + j * MARQ_PER + k)
    }

    // ---- a shooting star now and then, through the windows ----
    {
      if (t > S.shootAt && !quality.reduced) {
        S.shootAt = t + 7 + rand() * 9
        S.shootT0 = t
        const az = -0.9 + rand() * 1.8
        const el = -0.2 - rand() * 0.4
        const dist = 135
        S.shootP[0] = dist * Math.cos(el) * Math.sin(az)
        S.shootP[1] = 8 + dist * Math.sin(el)
        S.shootP[2] = -dist * Math.cos(el) * Math.cos(az)
        const dirx = rand() < 0.5 ? -1 : 1
        S.shootV[0] = dirx * (48 + rand() * 30)
        S.shootV[1] = -(14 + rand() * 16)
        S.shootV[2] = 0
      }
      const age = t - S.shootT0
      for (let k = 0; k < NSHOOT; k++) {
        const a = age - k * 0.045
        if (a < 0 || a > 1.1) {
          fx.hide(S_SHOOT + k)
          continue
        }
        const fade = (1 - a / 1.1) * (1 - k / NSHOOT)
        fx.put(S_SHOOT + k, K.star, 0.9, S.shootP[0] + S.shootV[0] * a, S.shootP[1] + S.shootV[1] * a, S.shootP[2], 1.5 * (1 - k / (NSHOOT + 2)), 1, 1, 1, fade)
      }
    }

    // ---- motes ----
    for (let i = 0; i < NMOTE; i++) {
      const o = i * 12
      const M = S.mote
      const x = M[o] + M[o + 3] * Math.sin(t * M[o + 6] + M[o + 9])
      const y = M[o + 1] + M[o + 4] * Math.sin(t * M[o + 7] + M[o + 9] * 1.3)
      const z = M[o + 2] + M[o + 5] * Math.cos(t * M[o + 8] + M[o + 9] * 0.7)
      fx.move(S_MOTE + i, x, y, z)
      fx.alpha(S_MOTE + i, 0.16 + 0.34 * (0.5 + 0.5 * Math.sin(t * M[o + 11] + M[o + 9] * 3)))
    }

    // ---- ticker machine, tape, turnstile, receipts ----
    {
      const kick = t - S.tapeKick
      const active = kick >= 0 && kick < 1.5
      const e = active ? 1 - kick / 1.5 : 0
      S.feed = e * 2.6
      res.tapeTex.offset.x -= dt * S.feed * 0.9
      const d = domeRef.current
      if (d) {
        d.position.y = 1.36 + (active ? Math.sin(t * 60) * 0.012 * e : 0)
        d.rotation.z = active ? Math.sin(t * 47) * 0.02 * e : 0
      }
      const w = C_DOME
      fx.put(S_HALO + H_DOME, K.glow, 0, MACHINE.x, 1.62, MACHINE.z, 1.15 + 0.4 * e, w[0], w[1], w[2], 0.2 + 0.05 * Math.sin(t * 2) + 0.5 * e)
      fx.put(S_HALO + H_SPEC, K.glow, 0, MACHINE.x - 0.2, 1.95, MACHINE.z + 0.22, 0.2, 1, 1, 1, 0.7)
      if (active && kick < 1.2 && rand() < 0.5) {
        res.sparks.emit(t, MACHINE.x + 0.62, 1.15, MACHINE.z, 1.6 + rand() * 1.6, 1.6 + rand() * 2, (rand() - 0.5) * 1.6, 0.8, 0.09 + rand() * 0.06, PAPER)
      }
      const tk = t - S.turnKick
      const tg = C_GOLD
      fx.put(S_HALO + H_TURN, K.glow, 0, TURN.x, 0.78, TURN.z + 0.4, 0.7 + (tk >= 0 && tk < 0.5 ? (1 - tk / 0.5) * 0.6 : 0), tg[0], tg[1], tg[2], 0.28 + (tk >= 0 && tk < 0.5 ? (1 - tk / 0.5) * 0.6 : 0))
      const gold = C_CARD
      for (let k = 0; k < PROOF.length; k++) {
        const c = built.cards[k]
        const seen = hasSeen(CARD_KEYS[k])
        fx.put(S_HALO + H_CARD + k, K.star, 0.3, c.x, 1.55 + 0.06 * Math.sin(t * 2.1 + k), c.z, 0.34, gold[0], gold[1], gold[2], seen ? 0 : 0.5 + 0.3 * Math.sin(t * 2.4 + k * 1.7))
      }
    }
    // rest of halo block that is unused stays hidden
    res.sparks.update(t)
    fx.commit(t)
  })

  function emitTop(i: number, t: number, speed: number) {
    const m = MONOS[i]
    const d = m.disp
    monoPoint(m, d.x + (rand() - 0.5) * d.w * 0.9, d.y + d.h / 2 + 0.05, d.z + 0.1, _v)
    const a = S.A[i]
    const c = Math.cos(m.yaw)
    const s = Math.sin(m.yaw)
    const lx = (rand() - 0.5) * 2.4
    const lz = 0.4 + rand() * 1.6
    res.sparks.emit(t, _v.x, _v.y, _v.z, (lx * c + lz * s) * speed, (2.4 + rand() * 2.6) * speed, (-lx * s + lz * c) * speed, 0.7 + rand() * 0.6, 0.1 + rand() * 0.09, rand() < 0.6 ? a.rgb : rand() < 0.5 ? a.rgb2 : WHITE)
  }

  function countStr(i: number, u: number) {
    const b = BIGS[i]
    const v = b.num * easeOutCubic(u)
    if (b.suffix.startsWith('B')) return `${Math.round(v * 1000)}M+`
    return `${v.toFixed(DECS[i])}${b.suffix}`
  }

  const { geo, neon, tape, cards, cardGeo, ledGeo } = built
  const { staticMat, neonMat, ledMat, cardMat, tapeMat, floorMat, floorGeo, domeGeo, domeMat, armsGeo, ringGeo, ringMats, bandGeo, bandMat, fx } = res
  const ringR = [1.5, 1.9, 2.3]
  const globeC = S.A[0].base

  return (
    <>
      <mesh geometry={geo} material={staticMat} castShadow receiveShadow />
      <mesh geometry={floorGeo} material={floorMat} position={[0, 0.012, 0]} renderOrder={1} />
      <mesh geometry={tape.geo} material={tapeMat} renderOrder={2} />
      <mesh geometry={cardGeo} material={cardMat} />
      <mesh geometry={neon.geo} material={neonMat} />
      <mesh geometry={ledGeo} material={ledMat} />
      <mesh ref={domeRef} geometry={domeGeo} material={domeMat} position={[MACHINE.x, 1.36, MACHINE.z]} renderOrder={3} />
      <mesh ref={armsRef} geometry={armsGeo} material={staticMat} position={[TURN.x, 1.14, TURN.z]} />
      <mesh ref={bandRef} geometry={bandGeo} material={bandMat} position={[globeC.x, 4.2, globeC.z - 0.1]} />
      {ringR.map((r, k) => (
        <group key={k} ref={(g) => { gRings.current[k] = g }} position={[globeC.x, 5.3, globeC.z - 0.1]} scale={r}>
          <mesh geometry={ringGeo} material={ringMats[k]} />
        </group>
      ))}
      <primitive object={fx.mesh} />

      {/* solid things */}
      {MONOS.map((m) => (
        <Circle key={m.id} x={m.x} z={m.z} r={m.r} h={8} />
      ))}
      <Circle x={MACHINE.x} z={MACHINE.z} r={1.0} h={2} />
      <Circle x={TURN.x} z={TURN.z} r={0.62} h={1.4} />
      <Circle x={SCOPE.x} z={SCOPE.z} r={0.5} h={2.5} />
      {cards.map((c, i) => (
        <Circle key={i} x={c.x} z={c.z} r={0.42} h={1} />
      ))}

      {/* the seven monuments: CHARGE */}
      {MONOS.map((m, i) => (
        <Hotspot
          key={m.id}
          id={`mono-${m.id}`}
          x={S.A[i].hs.x}
          y={1.0}
          z={S.A[i].hs.z}
          radius={2.9}
          label="CHARGE"
          title={TITLES[i]}
          look={[S.A[i].disp.x, S.A[i].disp.y, S.A[i].disp.z]}
          onUse={() => burst(i)}
        />
      ))}

      {/* the receipts */}
      {PROOF.map((p, i) => (
        <Hotspot
          key={p.id}
          id={`rc-${p.id}`}
          x={cards[i].x}
          y={0.6}
          z={cards[i].z}
          radius={2.2}
          label="READ"
          title={p.who}
          look={[cards[i].x, 0.7, cards[i].z]}
          sparkle={false}
          onUse={() => open(proofPanel(p, i), cards[i].x, 0.7, cards[i].z, 6.2)}
        />
      ))}

      {/* secrets */}
      <Hotspot
        id="tape"
        x={MACHINE.x + 0.1}
        y={1.2}
        z={MACHINE.z}
        radius={2.5}
        label="TAP"
        title="The ticker machine"
        kind="secret"
        look={[MACHINE.x, 1.6, MACHINE.z]}
        onUse={() => {
          S.tapeKick = game.time
          note('tape', 'Ticker ticker. The receipts are the real ones.')()
        }}
      />
      <Hotspot
        id="counter"
        x={COUNTER.x}
        y={1.05}
        z={COUNTER.z}
        radius={1.65}
        priority={2}
        label="CLICK"
        title="Tally counter"
        kind="secret"
        look={[COUNTER.x, 1.2, COUNTER.z]}
        onUse={() => {
          for (let k = 0; k < 7; k++) res.sparks.emit(game.time, COUNTER.x, 1.25, COUNTER.z, (rand() - 0.5) * 1.6, 1.4 + rand() * 1.6, (rand() - 0.5) * 1.6, 0.6, 0.09, C_GOLD)
          note('counter', 'One more for the tally.')()
        }}
      />
      <Hotspot
        id="turnstile"
        x={TURN.x}
        y={0.9}
        z={TURN.z + 0.3}
        radius={1.9}
        label="PUSH"
        title="The turnstile"
        kind="secret"
        look={[TURN.x, 0.9, TURN.z]}
        onUse={() => {
          S.turnCount += 1
          S.turnTarget += (Math.PI * 2) / 3
          S.turnKick = game.time
          for (let k = 0; k < 6; k++) res.sparks.emit(game.time, TURN.x, 0.9, TURN.z + 0.3, (rand() - 0.5) * 2, 1.4 + rand() * 1.4, 0.5 + rand() * 1.2, 0.6, 0.09, C_GOLD)
          res.atlas.paintCounter(7, S.turnCount)
          note('turnstile', 'Click. You’re now part of the count.')()
        }}
      />
    </>
  )
}

const WHITE: [number, number, number] = [1, 1, 1]
const PAPER: [number, number, number] = lin('#f4ecd6')

function applyNeon(c: { array: Float32Array }, r: { start: number; count: number }, base: Float32Array, k: number) {
  const a = c.array
  const e = (r.start + r.count) * 3
  for (let i = r.start * 3; i < e; i++) a[i] = base[i] * k
}

export function ResultsRoom() {
  return (
    <Interior id="results" w={W} d={D} floor="tile">
      <ResultsContent />
    </Interior>
  )
}

