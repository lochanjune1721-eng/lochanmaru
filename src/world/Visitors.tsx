// Four other visitors who wander the avenues, stop to look at you, and say something daft when you talk to them.
// They reuse the player's Character, just dressed differently, and stick to the paths + plaza.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import { register } from '../engine/interact'
import { clamp, damp } from '../engine/math'
import { game } from '../engine/game'
import { R, mapToN, stepOnSphere, toTangent } from '../engine/planet'
import { quality } from '../engine/quality'
import { player } from '../engine/state'
import { store } from '../engine/store'
import { CharLook, CharState, Character } from '../play/Character'
import { PLAZA, getPaths } from './layout'
import { terrain } from './terrain'

interface NpcDef {
  id: string
  title: string
  look: CharLook
  lines: string[]
  /** where on the plaza ring they start out (radians) */
  start: number
  speed: number
}

const DEFS: NpcDef[] = [
  {
    id: 'recruiter',
    title: 'The Recruiter',
    look: { hoodie: '#4a78d6', hoodieDark: '#3557ad', pants: '#2b2f55', hair: '#2b2438', skin: '#c98d6a', pack: '#8a94b8', phones: '#f2a33c' },
    lines: ['I came for a quick look. I’m still here.', 'Nobody told me the interview would be a walking tour.', 'Ten tabs open, zero regrets.'],
    start: 0.9,
    speed: 2.1,
  },
  {
    id: 'writer',
    title: 'The Writer',
    look: { hoodie: '#f0c04a', hoodieDark: '#c99a2e', pants: '#5b4a6e', hair: '#7a4a38', skin: '#f0c0a0', pack: '#a9684a', phones: '#e2493f' },
    lines: ['Every great story starts with someone wandering off the path.', 'I’ve stared at this sunset for an hour. No hook. Yet.', 'The lighthouse has the best last line.'],
    start: 2.6,
    speed: 1.8,
  },
  {
    id: 'camera',
    title: 'The Cameraperson',
    look: { hoodie: '#e2493f', hoodieDark: '#b5352e', pants: '#2b2438', hair: '#e8e0f0', skin: '#e0a57c', pack: '#2b2438', phones: '#2f9591' },
    lines: ['Hold still! The light is perfect. Actually, keep walking.', 'Vertical or horizontal? Don’t answer, I’ll shoot both.', 'Golden hour lasts forever here. Best deal in town.'],
    start: 4.1,
    speed: 2.4,
  },
  {
    id: 'explorer',
    title: 'The Explorer',
    look: { hoodie: '#5fae72', hoodieDark: '#3f8a56', pants: '#8a6a48', hair: '#c98d5e', skin: '#8a5a3c', pack: '#f2a33c', phones: '#fff2d8' },
    lines: ['I followed the signs. The signs followed me back.', 'Rumour has it there are secrets hidden all over. I found a frog.', 'Try every door. Some of them glow.'],
    start: 5.4,
    speed: 2.0,
  },
]

const plazaN = mapToN(PLAZA.x, PLAZA.z)
const ring = (a: number, r = 8.6) => mapToN(PLAZA.x + Math.sin(a) * r, PLAZA.z + Math.cos(a) * r)
const angleAround = (m: { x: number; z: number }) => Math.atan2(m.x - PLAZA.x, m.z - PLAZA.z)

interface Lane {
  pts: Vector3[]
  a0: number
  usable: number
}
/** Paths oriented to run away from the plaza, with how many samples are comfortable to visit. */
function lanes(): Lane[] {
  const out: Lane[] = []
  for (const p of getPaths()) {
    if (!['west', 'east', 'northwest', 'northeast', 'spine'].includes(p.def.id)) continue
    const fwd = p.pts[0].dot(plazaN) > p.pts[p.pts.length - 1].dot(plazaN)
    const pts = fwd ? p.pts : [...p.pts].reverse()
    const map = fwd ? p.map : [...p.map].reverse()
    const cum = fwd ? p.cum : p.cum.map((c) => p.cum[p.cum.length - 1] - c).reverse()
    let usable = pts.length - 1
    while (usable > 2 && (cum[usable] > 34 || terrain(pts[usable]) < 0.05)) usable--
    out.push({ pts, a0: angleAround(map[Math.min(2, map.length - 1)]), usable })
  }
  return out
}

interface Npc extends CharState {
  def: NpcDef
  n: Vector3
  route: Vector3[]
  at: { lane: number; idx: number }
  wait: number
  line: number
  anchor: Vector3
  look: Vector3
  angle: number
}

const _q = new Quaternion()
const _d = new Vector3()
const _c = new Vector3()

export function Visitors() {
  const all = useMemo(() => lanes(), [])
  const npcs = useMemo<Npc[]>(() => {
    const count = quality.tier === 0 ? 3 : 4
    return DEFS.slice(0, count).map((def) => {
      const n = ring(def.start).clone()
      const up = n.clone()
      const heading = toTangent(new Vector3(0, 1, 0), up)
      if (heading.lengthSq() < 0.5) heading.set(1, 0, 0)
      const s: Npc = {
        def,
        n,
        pos: n.clone().multiplyScalar(R + terrain(n)),
        up,
        heading,
        speed: 0,
        stride: Math.random() * 6,
        turn: 0,
        wet: 0,
        drop: -1,
        glance: null,
        sprint: false,
        lastMoveAt: 0,
        visible: true,
        route: [],
        at: { lane: -1, idx: 0 },
        wait: 1 + Math.random() * 4,
        line: Math.floor(Math.random() * def.lines.length),
        anchor: new Vector3(),
        look: new Vector3(),
        angle: def.start,
      }
      return s
    })
  }, [])

  const plan = (s: Npc) => {
    const route: Vector3[] = []
    // leave the current lane back towards the plaza
    if (s.at.lane >= 0) {
      const lane = all[s.at.lane]
      for (let i = s.at.idx; i > 0; i -= 3) route.push(lane.pts[i])
      route.push(lane.pts[0])
      s.angle = lane.a0
    }
    let next = Math.floor(Math.random() * all.length)
    if (next === s.at.lane) next = (next + 1) % all.length
    const lane = all[next]
    // walk round the plaza the short way
    let da = lane.a0 - s.angle
    while (da > Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    const steps = Math.max(1, Math.ceil(Math.abs(da) / 0.6))
    for (let k = 1; k <= steps; k++) route.push(ring(s.angle + (da * k) / steps))
    const target = Math.max(3, Math.floor(lane.usable * (0.35 + Math.random() * 0.65)))
    for (let i = 3; i < target; i += 3) route.push(lane.pts[i])
    route.push(lane.pts[target])
    s.at = { lane: next, idx: target }
    s.angle = lane.a0
    s.route = route
  }

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const t = game.time
    for (const s of npcs) {
      // only bother with the ones near the camera's side of the planet
      const near = s.n.dot(game.focusN) > 0.25
      s.visible = near
      if (!near) {
        s.speed = 0
        continue
      }
      const dPlayer = s.pos.distanceTo(player.pos)
      const watching = dPlayer < 5.2 && !player.frozen
      let want = 0
      if (watching) {
        // stop and turn to look at the visitor
        _d.copy(player.pos).sub(s.pos)
        toTangent(_d, s.up)
        turnTowards(s, _d, 5, dt)
        s.glance = player.pos
      } else {
        s.glance = null
        if (s.wait > 0) s.wait -= dt
        else if (s.route.length === 0) plan(s)
        else {
          const goal = s.route[0]
          _d.copy(goal).sub(s.n)
          toTangent(_d, s.up)
          const dist = Math.acos(clamp(s.n.dot(goal), -1, 1)) * R
          if (dist < 0.6) {
            s.route.shift()
            if (s.route.length === 0) s.wait = 3 + Math.random() * 6
          } else {
            turnTowards(s, _d, 4.5, dt)
            want = s.def.speed
          }
        }
      }
      s.speed = damp(s.speed, want, 6, dt)
      if (s.speed > 0.05) {
        const dist = s.speed * dt
        _c.copy(s.heading)
        stepOnSphere(s.n, _c, dist, _q)
        s.heading.applyQuaternion(_q)
        s.up.copy(s.n)
        toTangent(s.heading, s.up)
        s.stride += (dist / 1.55) * Math.PI
        s.lastMoveAt = t
      }
      s.pos.copy(s.n).multiplyScalar(R + terrain(s.n))
      s.anchor.copy(s.pos).addScaledVector(s.up, 1.1)
      s.look.copy(s.pos).addScaledVector(s.up, 1.5)
    }
  })

  useEffect(() => {
    const offs = npcs.map((s) =>
      register({
        id: `npc-${s.def.id}`,
        anchor: s.anchor,
        radius: 2.9,
        label: 'CHAT',
        title: s.def.title,
        kind: 'npc',
        look: s.look,
        onUse: () => {
          const line = s.def.lines[s.line++ % s.def.lines.length]
          store.getState().showToast(`${s.def.title}: “${line}”`, 'info')
        },
        active: () => s.visible !== false,
      }),
    )
    return () => offs.forEach((f) => f())
  }, [npcs])

  return (
    <>
      {npcs.map((s) => (
        <Character key={s.def.id} state={s} look={s.def.look} scale={0.9} />
      ))}
    </>
  )
}

/** Rotate `s.heading` about `s.up` towards `dir` at most `rate` rad/s. */
function turnTowards(s: Npc, dir: Vector3, rate: number, dt: number) {
  if (dir.lengthSq() < 1e-8) return
  const ang = Math.atan2(_c.crossVectors(s.heading, dir).dot(s.up), s.heading.dot(dir))
  const step = clamp(ang, -rate * dt, rate * dt)
  s.heading.applyAxisAngle(s.up, step)
  s.turn = damp(s.turn, step / Math.max(dt, 1e-4), 8, dt)
}
