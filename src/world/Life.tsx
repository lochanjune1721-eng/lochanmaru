// Things that move on their own: drifting clouds, birds, butterflies and the dust your feet kick up.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from 'three'
import { bus } from '../engine/bus'
import { game } from '../engine/game'
import { rng } from '../engine/math'
import { R, mapBasisAt, mapToN } from '../engine/planet'
import { quality } from '../engine/quality'
import { player } from '../engine/state'
import { GeoBuilder } from '../gfx/geo'
import { U, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { PLAZA } from './layout'
import { shoreDistance, terrain } from './terrain'

const UP = new Vector3(0, 1, 0)

// ---- clouds -------------------------------------------------------------------------------------------------------
function cloudGroupGeo(seed: number, count: number) {
  const r = rng(seed)
  const b = new GeoBuilder(seed)
  b.ao = 0
  const q = new Quaternion()
  const m = new Matrix4()
  for (let i = 0; i < count; i++) {
    // a random spot on the sphere, standing at altitude 19..34
    const n = new Vector3(r() * 2 - 1, r() * 1.6 - 0.8, r() * 2 - 1).normalize()
    const alt = 19 + r() * 15
    q.setFromUnitVectors(UP, n)
    m.compose(n.clone().multiplyScalar(R + alt), q, new Vector3(1, 1, 1))
    b.push().apply(m).rotY(r() * 6.28)
    const puffs = 6 + Math.floor(r() * 4)
    const len = 4 + r() * 4
    for (let k = 0; k < puffs; k++) {
      const t = puffs > 1 ? k / (puffs - 1) : 0.5
      const x = (t - 0.5) * len * 2
      const s = (1.9 + r() * 1.7) * (1 - Math.abs(t - 0.5) * 0.7)
      const z = (r() - 0.5) * 2.2
      const y = (r() - 0.3) * 0.9 + (1 - Math.abs(t - 0.5) * 2) * 0.7
      b.put(x, y, z, (b) => b.scale(1.15, 0.72, 1).blob(s, '#f5d9e2', { top: '#ffffff', glow: 0.55, ao: 0 }, 1))
    }
    b.pop()
  }
  return b.build()
}

function Clouds() {
  const groups = useMemo(() => {
    const n = quality.cloudGroups
    return Array.from({ length: n }, (_, i) => ({ geo: cloudGroupGeo(300 + i * 17, 7), axis: new Vector3(Math.sin(i * 2.1), Math.cos(i * 1.3 + 0.5), Math.sin(i * 0.7 + 1)).normalize(), speed: (i % 2 ? -1 : 1) * (0.005 + i * 0.0018) }))
  }, [])
  const mat = useMemo(() => worldMaterial({ rim: false }), [])
  const refs = useRef<Group[]>([])
  useFrame((_, dt) => {
    if (game.mode !== 'world') return
    groups.forEach((g, i) => {
      const o = refs.current[i]
      if (o) o.rotateOnWorldAxis(g.axis, g.speed * Math.min(dt, 0.05))
    })
  })
  return (
    <>
      {groups.map((g, i) => (
        <group key={i} ref={(o) => { if (o) refs.current[i] = o }}>
          <mesh geometry={g.geo} material={mat} frustumCulled={false} />
        </group>
      ))}
    </>
  )
}

// ---- birds --------------------------------------------------------------------------------------------------------------
const birdVert = /* glsl */ `
  uniform float uTime; attribute float aPhase; varying float vFog; varying float vShade;
  void main(){
    vec3 p = position;
    float flap = sin(uTime * 7.0 + aPhase * 6.28);
    p.y += flap * abs(p.x) * 0.8;
    p.z -= abs(flap) * abs(p.x) * 0.18;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    vFog = 1.0 - exp(-pow(0.022 * -mv.z, 2.0));
    vShade = 0.5 + 0.5 * flap * sign(position.x);
    gl_Position = projectionMatrix * mv;
  }`
const birdFrag = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uFog; varying float vFog; varying float vShade;
  void main(){ vec3 c = uColor * (0.85 + 0.15 * vShade); gl_FragColor = vec4(mix(c, uFog, vFog), 1.0); }`

function birdGeometry() {
  const v = [
    // wings
    0, 0, 0.3, -0.82, 0.0, -0.06, 0, 0, -0.26, 0, 0, 0.3, 0, 0, -0.26, 0.82, 0.0, -0.06,
    // body + tail
    0, 0.02, 0.55, 0.09, 0, -0.1, -0.09, 0, -0.1, 0, 0, -0.2, 0.14, 0, -0.62, -0.14, 0, -0.62,
  ]
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(v, 3))
  return g
}

const _a = new Vector3()
const _p = new Vector3()
const _f = new Vector3()
const _u = new Vector3()
const _r = new Vector3()
const _m = new Matrix4()

function Birds() {
  const N = quality.birds
  const { mesh, orbits } = useMemo(() => {
    const r = rng(4242)
    const geo = birdGeometry()
    const phase = new Float32Array(N)
    const orbits = Array.from({ length: N }, (_, i) => {
      const axis = new Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize()
      const a = new Vector3().crossVectors(axis, Math.abs(axis.y) < 0.9 ? UP : new Vector3(1, 0, 0)).normalize()
      const b = new Vector3().crossVectors(axis, a).normalize()
      phase[i] = r()
      return { a, b, w: (0.05 + r() * 0.05) * (r() < 0.5 ? -1 : 1), t0: r() * 6.28, alt: 10 + r() * 7, s: 0.9 + r() * 0.5, flock: Math.floor(i / 4) }
    })
    // birds of a flock share an orbit (offset slightly) so they fly together
    for (let i = 0; i < N; i++) {
      const lead = orbits[Math.floor(i / 4) * 4]
      if (lead !== orbits[i]) {
        const o = orbits[i]
        o.a = lead.a
        o.b = lead.b
        o.w = lead.w
        o.t0 = lead.t0 + (r() - 0.5) * 0.06
        o.alt = lead.alt + (r() - 0.5) * 2.4
      }
    }
    const mat = new ShaderMaterial({
      uniforms: { uTime: U.uTime, uColor: { value: new Color('#3d2c54') }, uFog: { value: new Color(P.fog) } },
      vertexShader: birdVert,
      fragmentShader: birdFrag,
      side: DoubleSide,
    })
    const m = new InstancedMesh(geo, mat, N)
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1))
    m.frustumCulled = false
    return { mesh: m, orbits }
  }, [N])
  useFrame(() => {
    if (game.mode !== 'world') return
    const t = game.time
    for (let i = 0; i < N; i++) {
      const o = orbits[i]
      const ang = o.t0 + o.w * t
      const c = Math.cos(ang)
      const s = Math.sin(ang)
      _p.copy(o.a).multiplyScalar(c).addScaledVector(o.b, s)
      _f.copy(o.a).multiplyScalar(-s).addScaledVector(o.b, c).multiplyScalar(Math.sign(o.w))
      _u.copy(_p)
      _r.crossVectors(_u, _f).normalize()
      const rad = R + o.alt + Math.sin(t * 0.9 + i) * 0.6
      _m.makeBasis(_r.multiplyScalar(o.s), _u.multiplyScalar(o.s), _f.multiplyScalar(o.s)).setPosition(_p.multiplyScalar(rad))
      mesh.setMatrixAt(i, _m)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

// ---- butterflies ----------------------------------------------------------------------------------------------------------
const flyVert = /* glsl */ `
  uniform float uTime; attribute float aPhase; varying vec3 vCol; varying float vFog;
  void main(){
    vec3 p = position;
    float flap = sin(uTime * 22.0 + aPhase * 6.28);
    p.y += abs(p.x) * flap * 1.5;
    vec4 mv = modelViewMatrix * instanceMatrix * vec4(p, 1.0);
    vFog = 1.0 - exp(-pow(0.026 * -mv.z, 2.0));
    vCol = instanceColor;
    gl_Position = projectionMatrix * mv;
  }`
const flyFrag = /* glsl */ `
  uniform vec3 uFog; varying vec3 vCol; varying float vFog;
  void main(){ gl_FragColor = vec4(mix(vCol, uFog, vFog), 1.0); }`

function Butterflies() {
  const N = quality.butterflies
  const { mesh, homes } = useMemo(() => {
    const r = rng(9911)
    // each wing is a little fan (upper lobe + lower lobe) hinged on the body line
    const wing = (sx: number) => [
      0, 0, 0.06, sx * 0.2, 0.02, 0.22, sx * 0.3, 0.0, 0.1,
      0, 0, 0.06, sx * 0.3, 0.0, 0.1, sx * 0.24, 0.0, -0.04,
      0, 0, 0.0, sx * 0.24, 0.0, -0.04, sx * 0.12, 0.0, -0.2,
      0, 0, 0.0, sx * 0.12, 0.0, -0.2, 0, 0, -0.1,
    ]
    const v = [...wing(1), ...wing(-1)]
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(v, 3))
    const phase = new Float32Array(N)
    const cols = new Float32Array(N * 3)
    const pal = [P.pink, P.marigold, P.lilac, P.coral, '#fff4d0', P.teal].map((c) => new Color(c))
    const homes: { n: Vector3; north: Vector3; east: Vector3; ax: number; az: number; fx: number; fz: number; h: number; ph: number; base: number }[] = []
    let tries = 0
    while (homes.length < N && tries++ < 400) {
      // scatter around the plaza and along the avenues
      const ang = r() * Math.PI * 2
      const rad = 6 + Math.sqrt(r()) * 34
      const n = mapToN(PLAZA.x + Math.sin(ang) * rad, PLAZA.z + Math.cos(ang) * rad)
      if (shoreDistance(n) > -6 || terrain(n) < 0.02) continue
      const north = new Vector3()
      const east = new Vector3()
      mapBasisAt(n, north, east)
      homes.push({ n, north, east, ax: 1.2 + r() * 2.4, az: 1.2 + r() * 2.4, fx: 0.25 + r() * 0.35, fz: 0.2 + r() * 0.35, h: 0.8 + r() * 1.1, ph: r() * 6.28, base: R + terrain(n) })
    }
    for (let i = 0; i < N; i++) {
      phase[i] = r()
      const c = pal[Math.floor(r() * pal.length)]
      cols.set([c.r, c.g, c.b], i * 3)
    }
    geo.setAttribute('aPhase', new InstancedBufferAttribute(phase, 1))
    const mat = new ShaderMaterial({ uniforms: { uTime: U.uTime, uFog: { value: new Color(P.fog) } }, vertexShader: flyVert, fragmentShader: flyFrag, side: DoubleSide })
    const m = new InstancedMesh(geo, mat, N)
    m.instanceColor = new InstancedBufferAttribute(cols, 3)
    m.frustumCulled = false
    return { mesh: m, homes }
  }, [N])
  const o = useMemo(() => new Object3D(), [])
  useFrame(() => {
    if (game.mode !== 'world') return
    const t = game.time
    for (let i = 0; i < homes.length; i++) {
      const h = homes[i]
      const dx = Math.sin(t * h.fx + h.ph) * h.ax + Math.sin(t * h.fx * 2.3 + h.ph) * 0.4
      const dz = Math.cos(t * h.fz + h.ph * 1.7) * h.az
      const dy = h.h + Math.sin(t * 1.3 + h.ph) * 0.35
      _p.copy(h.n).multiplyScalar(h.base + dy).addScaledVector(h.east, dx).addScaledVector(h.north, dz)
      // face the direction of travel
      const vx = Math.cos(t * h.fx + h.ph) * h.ax * h.fx
      const vz = -Math.sin(t * h.fz + h.ph * 1.7) * h.az * h.fz
      _f.copy(h.east).multiplyScalar(vx).addScaledVector(h.north, vz).normalize()
      _u.copy(h.n)
      _r.crossVectors(_u, _f).normalize()
      _m.makeBasis(_r, _u, _f).setPosition(_p)
      o.matrix.copy(_m)
      mesh.setMatrixAt(i, o.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })
  return <primitive object={mesh} />
}

// ---- footstep dust -------------------------------------------------------------------------------------------------------------
const DUST_N = 28
const dustVert = /* glsl */ `
  attribute float aAge; attribute float aSize; attribute vec3 aCol; varying float vA; varying vec3 vC;
  void main(){
    vA = (1.0 - aAge) * (1.0 - aAge) * 0.75; vC = aCol;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (0.5 + aAge * 1.6) * (40.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }`
const dustFrag = /* glsl */ `
  varying float vA; varying vec3 vC;
  void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.1, d) * vA; gl_FragColor = vec4(vC, a); }`

const SURF: Record<string, string> = { grass: '#d7efb4', sand: '#f3e2b6', path: '#f3e2b6', tile: '#f6ead6', wood: '#ecd7b8', water: '#ffffff' }

function Dust() {
  const data = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32BufferAttribute(new Float32Array(DUST_N * 3), 3)
    const age = new Float32BufferAttribute(new Float32Array(DUST_N).fill(1), 1)
    const size = new Float32BufferAttribute(new Float32Array(DUST_N), 1)
    const col = new Float32BufferAttribute(new Float32Array(DUST_N * 3), 3)
    pos.setUsage(35048)
    age.setUsage(35048)
    geo.setAttribute('position', pos)
    geo.setAttribute('aAge', age)
    geo.setAttribute('aSize', size)
    geo.setAttribute('aCol', col)
    const mat = new ShaderMaterial({ vertexShader: dustVert, fragmentShader: dustFrag, transparent: true, depthWrite: false })
    const vel = Array.from({ length: DUST_N }, () => new Vector3())
    return { geo, mat, pos, age, size, col, vel, next: 0 }
  }, [])
  useEffect(() => {
    const c = new Color()
    return bus.on('step', (surface: string, speed: number) => {
      if (game.mode !== 'world') return
      const n = speed > 6.5 ? 3 : 1
      for (let k = 0; k < n; k++) {
        const i = data.next++ % DUST_N
        _p.copy(player.pos).addScaledVector(player.up, 0.12).addScaledVector(player.heading, -0.25)
        _p.x += (Math.random() - 0.5) * 0.35
        _p.y += (Math.random() - 0.5) * 0.15
        _p.z += (Math.random() - 0.5) * 0.35
        data.pos.setXYZ(i, _p.x, _p.y, _p.z)
        data.vel[i].copy(player.up).multiplyScalar(0.5 + Math.random() * 0.5).addScaledVector(player.heading, -0.4 * Math.random()).addScaledVector(_a.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5), 0.5)
        data.age.setX(i, 0)
        data.size.setX(i, speed > 6.5 ? 2.4 : 1.6)
        c.set(SURF[surface] ?? '#f3e2b6')
        data.col.setXYZ(i, c.r, c.g, c.b)
      }
    })
  }, [data])
  useFrame((_, dt) => {
    if (game.mode !== 'world') return
    const d = Math.min(dt, 0.05)
    for (let i = 0; i < DUST_N; i++) {
      const a = data.age.getX(i)
      if (a >= 1) continue
      data.age.setX(i, Math.min(1, a + d * 1.9))
      data.pos.setXYZ(i, data.pos.getX(i) + data.vel[i].x * d, data.pos.getY(i) + data.vel[i].y * d, data.pos.getZ(i) + data.vel[i].z * d)
    }
    data.pos.needsUpdate = true
    data.age.needsUpdate = true
    data.size.needsUpdate = true
    data.col.needsUpdate = true
  })
  return <points geometry={data.geo} material={data.mat} frustumCulled={false} renderOrder={4} />
}

/** Sky, air and ground life. */
export function Life() {
  return (
    <>
      <Clouds />
      <Birds />
      <Butterflies />
      <Dust />
    </>
  )
}

