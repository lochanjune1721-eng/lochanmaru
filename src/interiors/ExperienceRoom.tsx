// EXPERIENCE — "Main Street". The career as a row of tiny shops in a sunlit market hall: walk left to right
// through time; every stall is one chapter of the story. Geometry lives in experience.build.ts / .props.ts,
// painting in experience.tex.ts, atmosphere in experience.fx.tsx — this file wires up the behaviour:
// colliders, hotspots, the clock + lever, and the little animations.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CircleGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three'
import { CHAPTERS } from '../content/experience'
import type { Chapter } from '../content/experience'
import { chapterPanel } from '../content/panels'
import { game } from '../engine/game'
import { scene, stage } from '../engine/scenes'
import { cam } from '../engine/state'
import { store } from '../engine/store'
import { worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { LedScreen } from '../world/buildings/led'
import { Hotspot, Interior, interiorOrigin, useBox, useCircle, useOpen } from './kit'
import { Dust, HaloField, Shafts, StringLights } from './experience.fx'
import { buildExperience } from './experience.build'
import { buildHandGeo } from './experience.hands'
import { callDraw, chatDraw, clockFaceTexture, makeAtlasA, makeAtlasB, monitorsDraw, reelsDraw, robotDraw, tickerDraw, windowTexture, zzzTexture } from './experience.tex'
import { D, W, Z_CTR, Z_FRONT, Z_WALL } from './experience.util'

const inRoom = () => scene.current === 'experience'

// ---- tiny solid helpers (hooks must live inside <Interior>) ----------------------------------------------
function SolidBox({ x, z, hx, hz, h = 2, rot = 0 }: { x: number; z: number; hx: number; hz: number; h?: number; rot?: number }) {
  useBox(x, z, hx, hz, h, rot)
  return null
}
function SolidCircle({ x, z, r, h = 2.5 }: { x: number; z: number; r: number; h?: number }) {
  useCircle(x, z, r, h)
  return null
}

const easeOut = (t: number) => 1 - (1 - t) * (1 - t)
const SPIN_TIME = 3.2

function Content() {
  const built = useMemo(() => buildExperience(CHAPTERS), [])
  const open = useOpen()

  // materials + textures ------------------------------------------------------------------------------------
  const matStatic = useMemo(() => worldMaterial({}), [])
  const matSway = useMemo(() => worldMaterial({ sway: true }), [])
  const texA = useMemo(() => makeAtlasA(CHAPTERS), [])
  const texB = useMemo(() => makeAtlasB(CHAPTERS), [])
  const matA = useMemo(() => worldMaterial({ map: texA, rim: false }), [texA])
  const matB = useMemo(() => worldMaterial({ map: texB, rim: false }), [texB])
  const glassMat = useMemo(() => new MeshBasicMaterial({ map: windowTexture(), toneMapped: false }), [])
  const faceMat = useMemo(() => new MeshBasicMaterial({ map: clockFaceTexture(), toneMapped: false }), [])
  const faceGeo = useMemo(() => new CircleGeometry(built.clock.r, 56), [built])
  const handHr = useMemo(() => buildHandGeo(0.86, 0.13, P.terracottaDeep), [])
  const handMin = useMemo(() => buildHandGeo(1.2, 0.085, P.ink, true), [])
  const zzzMat = useMemo(() => new MeshBasicMaterial({ map: zzzTexture(), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.6 }), [])
  const zzzGeo = useMemo(() => new PlaneGeometry(1.15, 0.72), [])

  // animated screens ------------------------------------------------------------------------------------------
  const draws = useMemo(() => {
    const fix = CHAPTERS.find((c) => c.id === 'fixhealth')
    const yaas = CHAPTERS.find((c) => c.id === 'yaas')
    const items = (yaas?.work ?? []).filter((w) => w.growth).map((w) => ({ label: w.name, delta: w.growth! }))
    return {
      call: callDraw(),
      chat: chatDraw(fix?.color ?? '#808a99'),
      ticker: tickerDraw(items.length ? items : [{ label: yaas?.name ?? '', delta: '' }]),
      robot: robotDraw(),
      reels: reelsDraw(),
      monitors: monitorsDraw(),
    } as Record<string, ReturnType<typeof callDraw>>
  }, [])

  // animation state (no allocations per frame) ---------------------------------------------------------------------
  const refs = useRef<Record<string, Mesh | null>>({})
  const hourRef = useRef<Group>(null)
  const minRef = useRef<Group>(null)
  const zzzRef = useRef<Mesh>(null)
  const st = useRef({ last: 0, extra: 0, spin: 0, lever: 0.6, clap: 0 })
  const clockLook = useMemo(() => new Vector3(interiorOrigin('experience') + built.clock.x, built.clock.y - 0.6, Z_WALL + 0.4), [built])

  useFrame(() => {
    if (!inRoom()) return
    const t = game.time
    const a = st.current
    const dt = Math.min(0.1, Math.max(0, t - a.last))
    a.last = t

    // clock: runs fast on purpose; the lever makes it whirl
    let boost = 0
    if (a.spin > 0) {
      a.spin = Math.max(0, a.spin - dt)
      boost = easeOut(Math.min(1, a.spin / (SPIN_TIME * 0.7)))
      if (a.spin === 0 && cam.focusTarget === clockLook) cam.focusTarget = null
    }
    a.extra += dt * boost * 15
    if (minRef.current) minRef.current.rotation.z = -(t * 0.9 + a.extra)
    if (hourRef.current) hourRef.current.rotation.z = -(t * 0.075 + a.extra / 12)

    // lever arm follows the pull
    const lv = refs.current.lever
    if (lv?.parent) {
      const target = a.spin > 0 ? -0.6 : 0.6
      a.lever += (target - a.lever) * (1 - Math.exp(-(a.spin > 0 ? 14 : 2.2) * dt))
      lv.parent.rotation.z = a.lever
    }
    const cog = refs.current.cog
    if (cog) cog.rotation.z = -t * 0.6
    const globe = refs.current.globe
    if (globe) globe.rotation.y = t * 0.45
    const cat = refs.current.cat
    if (cat) cat.scale.y = 1 + 0.035 * Math.sin(t * 1.6)
    // clapperboard: open for a while, then snap shut
    const cl = refs.current.clap
    if (cl?.parent) {
      const p = t % 5
      const open = p < 3.3 ? 0.42 + 0.03 * Math.sin(t * 2) : p < 3.5 ? 0.42 * (1 - (p - 3.3) / 0.2) : 0
      cl.parent.rotation.z = open
    }
    if (zzzRef.current) {
      zzzRef.current.position.y = 1.85 + 0.14 * Math.sin(t * 1.1)
      zzzMat.opacity = 0.5 + 0.35 * Math.sin(t * 1.1 + 1)
    }
  })

  // secrets -------------------------------------------------------------------------------------------------------------
  const pull = () => {
    const s = store.getState()
    if (s.addSecret('lever')) s.showToast('Rewinding… kidding. Careers only have edits, no undo.', 'secret')
    else s.showToast('Still no undo. Only edits.', 'info')
    st.current.spin = SPIN_TIME
    // let the camera glance up at the clock while it whirls
    if (!s.panel && !game.reducedMotion) {
      cam.shake = 0.08
      cam.focusTarget = clockLook
      cam.focusDist = 13
      cam.focusPitch = 0.5
    }
  }
  const useStall = (ch: Chapter, x: number) => () => {
    const s = store.getState()
    if (ch.id === 'socialcapital' && s.addSecret('briefcase')) s.showToast('Combination: 0000. Just kidding — ask me.', 'secret')
    // the camera centres the stall in whatever part of the screen the panel leaves free: 10 units away shows the
    // whole stall (sign to counter) beside the desktop card; on phones (bottom sheet) pull back further
    open(chapterPanel(ch), x, 2.2, -5.5, window.innerWidth < 760 ? 15 : 10)
  }

  return (
    <>
      <mesh geometry={built.geo} material={matStatic} castShadow receiveShadow />
      <mesh geometry={built.sway} material={matSway} receiveShadow />
      <mesh geometry={built.texA} material={matA} receiveShadow />
      <mesh geometry={built.texB} material={matB} receiveShadow />
      <mesh geometry={built.glass} material={glassMat} />
      <Shafts geometry={built.shafts} />
      <HaloField halos={built.halos} />
      <Dust />
      <StringLights points={built.bulbs} size={0.06} />

      {/* animated pieces */}
      {built.anims.map((an) => (
        <group key={an.id} position={an.pos} rotation={an.rot ?? [0, 0, 0]}>
          <mesh ref={(m) => void (refs.current[an.id] = m)} geometry={an.geo} material={matStatic} />
        </group>
      ))}

      {/* the clock */}
      <mesh geometry={faceGeo} material={faceMat} position={[built.clock.x, built.clock.y, built.clock.z]} />
      <group ref={hourRef} position={[built.clock.x, built.clock.y, built.clock.z + 0.03]}>
        <mesh geometry={handHr} material={matStatic} />
      </group>
      <group ref={minRef} position={[built.clock.x, built.clock.y, built.clock.z + 0.07]}>
        <mesh geometry={handMin} material={matStatic} />
      </group>

      {/* someone is asleep */}
      <mesh ref={zzzRef} geometry={zzzGeo} material={zzzMat} position={[-16.35, 1.85, -1.9]} rotation={[-0.45, 0, 0]} />

      {built.leds.map((l) => (
        <LedScreen key={l.id} w={l.w} h={l.h} position={l.pos} rotation={l.rot} draw={draws[l.id]} fps={l.fps} texW={l.texW} texH={l.texH} range={30} active={inRoom} />
      ))}

      {/* solid things */}
      <SolidBox x={0} z={-7.9} hx={19.5} hz={1.3} h={3} />
      {built.stalls.map(({ ch, x }) => (
        <SolidBox key={ch.id} x={x} z={Z_CTR} hx={1.72} hz={0.7} h={1.2} />
      ))}
      {built.posts.map((px) => (
        <SolidCircle key={px} x={px} z={Z_FRONT} r={0.2} h={4} />
      ))}
      <SolidCircle x={-18.25} z={-2.5} r={0.48} />
      <SolidCircle x={18.3} z={-2.3} r={0.46} />
      <SolidCircle x={-18.2} z={6.2} r={0.5} />
      <SolidCircle x={18.2} z={6.2} r={0.5} />
      <SolidCircle x={-14.2} z={7.9} r={0.45} />
      <SolidCircle x={14.4} z={7.9} r={0.45} />
      <SolidCircle x={-17.0} z={-2.2} r={0.42} h={1.2} />
      <SolidBox x={-7.6} z={7.15} hx={1.4} hz={0.42} h={0.8} />
      <SolidBox x={7.6} z={7.15} hx={1.4} hz={0.42} h={0.8} />

      {/* one hotspot per stall */}
      {built.stalls.map(({ ch, x, look }) => (
        <Hotspot key={ch.id} id={ch.id} x={x} y={0.3} z={-3.5} radius={3.4} label="OPEN CHAPTER" title={ch.name} look={look} onUse={useStall(ch, x)} />
      ))}
      <Hotspot id="lever" x={built.lever.x} y={0.9} z={-4.05} radius={1.9} label="PULL" title="The lever" kind="secret" look={[built.lever.x, 1.5, Z_FRONT]} onUse={pull} />
    </>
  )
}

export function ExperienceRoom() {
  // Start the visit at the beginning of the street (Interior parks the spawn in the middle of the hall, which
  // would drop visitors into 'Building Now'). Runs after <Interior>'s own effect, so it wins; keeps the camera
  // framing the first stalls whatever the window's aspect ratio.
  useEffect(() => {
    const apply = () => {
      const sp = stage.spawn.experience
      if (!sp) return
      const halfView = 8.26 * (window.innerWidth / Math.max(1, window.innerHeight))
      sp.pos.x = interiorOrigin('experience') - 16 + Math.max(2, Math.min(5.5, halfView * 0.5))
    }
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])
  return (
    <Interior id="experience" w={W} d={D} floor="wood">
      <Content />
    </Interior>
  )
}

