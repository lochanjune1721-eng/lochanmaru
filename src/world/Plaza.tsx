import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, Points, ShaderMaterial, Vector3 } from 'three'
import { worldColliders } from '../engine/collision'
import { R, mapToN } from '../engine/planet'
import { rangoliTexture } from '../gfx/rangoli'
import { GeoBuilder } from '../gfx/geo'
import { U, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { PLAZA } from './layout'
import { Placed, circleCollider, makeFrame } from './place'
import { terrain } from './terrain'

function discGeometry(radius: number, rings = 10, seg = 72) {
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new Vector3()
  pos.push(...spot(0, 0, p))
  uv.push(0.5, 0.5)
  for (let r = 1; r <= rings; r++) {
    const rr = (r / rings) * radius
    for (let s = 0; s < seg; s++) {
      const a = (s / seg) * Math.PI * 2
      const dx = Math.cos(a) * rr
      const dz = Math.sin(a) * rr
      pos.push(...spot(dx, dz, p))
      uv.push(0.5 + dx / (2 * radius), 0.5 - dz / (2 * radius))
    }
  }
  for (let s = 0; s < seg; s++) idx.push(0, 1 + s, 1 + ((s + 1) % seg))
  for (let r = 1; r < rings; r++) {
    const a0 = 1 + (r - 1) * seg
    const a1 = 1 + r * seg
    for (let s = 0; s < seg; s++) {
      const s1 = (s + 1) % seg
      idx.push(a0 + s, a1 + s, a1 + s1, a0 + s, a1 + s1, a0 + s1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.computeBoundingSphere()
  return g
}

function spot(dx: number, dz: number, out: Vector3): [number, number, number] {
  const n = mapToN(PLAZA.x + dx, PLAZA.z + dz, out)
  const rad = R + terrain(n) + 0.055
  return [n.x * rad, n.y * rad, n.z * rad]
}

// ---- fountain jets: GPU-animated points on parabolic arcs ------------------------------------------
function Jets({ frame }: { frame: ReturnType<typeof makeFrame> }) {
  const ref = useRef<Points>(null)
  const { geo, mat } = useMemo(() => {
    const N = 90
    const phase = new Float32Array(N)
    const ang = new Float32Array(N)
    const spd = new Float32Array(N)
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      phase[i] = Math.random()
      ang[i] = Math.random() * Math.PI * 2
      spd[i] = 0.55 + Math.random() * 0.9
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('aPhase', new Float32BufferAttribute(phase, 1))
    g.setAttribute('aAng', new Float32BufferAttribute(ang, 1))
    g.setAttribute('aSpd', new Float32BufferAttribute(spd, 1))
    g.boundingSphere = null
    const m = new ShaderMaterial({
      uniforms: { uTime: U.uTime, uColor: { value: new Color('#dff8f4') } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aPhase; attribute float aAng; attribute float aSpd;
        uniform float uTime; varying float vA;
        void main(){
          float t = fract(uTime * 0.55 * aSpd + aPhase);
          float rad = t * (0.9 + aSpd * 0.9);
          float y = 3.0 * aSpd * t - 4.2 * t * t + 1.35;
          vec3 p = vec3(cos(aAng) * rad, y, sin(aAng) * rad);
          vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.75, 1.0, t));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp(90.0 / -mv.z * (0.7 + 0.5 * aSpd), 1.5, 9.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.2, d) * vA; gl_FragColor = vec4(uColor, a * 0.85); }`,
    })
    return { geo: g, mat: m }
  }, [])
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} position={[0, 0.6, 0]} />
}

/** The rangoli floor, the stepwell-inspired fountain and its collision. */
export function Plaza() {
  const tex = useMemo(() => rangoliTexture(1024), [])
  const floorGeo = useMemo(() => discGeometry(PLAZA.r + 0.6), [])
  const floorMat = useMemo(() => worldMaterial({ map: tex, ground: true, rim: false, decal: 2 }), [tex])
  const frame = useMemo(() => makeFrame(PLAZA.x, PLAZA.z, 0), [])

  const fountain = useMemo(() => {
    const b = new GeoBuilder(21)
    b.aoHeight = 1.2
    // stepwell-inspired: stepped tiers, terracotta basin, two bowls, marigold onion finial
    b.cyl(4.2, 4.4, 0.3, 36, P.cream)
    b.put(0, 0.3, 0, (b) => b.cyl(3.6, 3.8, 0.3, 32, '#f0d9b0'))
    b.put(0, 0.6, 0, (b) => b.cyl(3.0, 3.0, 0.9, 28, P.terracotta, { top: '#e98a62' }))
    // rim as a ring so the water shows inside it
    b.put(0, 1.5, 0, (b) => b.rotX(Math.PI / 2).torus(3.02, 0.2, P.cream, {}, Math.PI * 2, 6, 36))
    b.put(0, 1.5, 0, (b) => b.cyl(2.88, 2.88, 0.06, 28, '#6fd6cc', { glow: 0.6, ao: 0 }))
    b.put(0, 1.3, 0, (b) => b.cyl(0.5, 0.7, 1.5, 12, P.cream))
    b.put(0, 2.4, 0, (b) => b.cyl(1.6, 0.8, 0.4, 20, P.terracotta))
    b.put(0, 2.78, 0, (b) => b.cyl(1.4, 1.4, 0.05, 20, '#7fdcd0', { glow: 0.55, ao: 0 }))
    b.put(0, 2.8, 0, (b) => b.cyl(0.3, 0.4, 1.0, 10, P.cream))
    b.put(0, 3.8, 0, (b) => b.onion(0.5, 0.9, P.marigold, {}, 12))
    return b.build()
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])

  useEffect(() => {
    const off = circleCollider(frame, 0, 0, 4.3, 2.4)
    return off
  }, [frame])
  void worldColliders

  return (
    <>
      <mesh geometry={floorGeo} material={floorMat} receiveShadow renderOrder={1} />
      <Placed frame={frame}>
        <mesh geometry={fountain} material={mat} castShadow receiveShadow />
        <group position={[0, 2.85, 0]}>
          <Jets frame={frame} />
        </group>
      </Placed>
    </>
  )
}
