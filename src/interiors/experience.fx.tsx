// EXPERIENCE interior — cheap atmosphere: every glow halo is one instanced billboard draw call,
// the dust motes in the sunbeams are one Points draw call whose motion lives entirely in the vertex shader.
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Color,
  SphereGeometry,
} from 'three'
import { game } from '../engine/game'
import { scene } from '../engine/scenes'
import { U } from '../gfx/materials'
import type { Halo } from './experience.props'

const HALO_VS = /* glsl */ `
attribute vec3 aCol;
uniform float uTime;
varying vec2 vUv;
varying vec3 vCol;
void main() {
  vUv = uv;
  vec4 c = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float s = length(instanceMatrix[0].xyz);
  vec4 mv = modelViewMatrix * c;
  float tw = 0.93 + 0.07 * sin(uTime * 2.1 + c.x * 1.7 + c.y * 2.3);
  mv.xy += position.xy * s * tw;
  vCol = aCol * (0.9 + 0.1 * sin(uTime * 1.7 + c.x * 0.9));
  gl_Position = projectionMatrix * mv;
}`

const HALO_FS = /* glsl */ `
varying vec2 vUv;
varying vec3 vCol;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(max(0.0, 1.0 - d), 2.3);
  float core = exp(-d * d * 16.0);
  gl_FragColor = vec4(vCol * (a * 0.85 + core * 0.7), 1.0);
  #include <colorspace_fragment>
}`

/** all glow halos of the room: additive camera-facing quads, one draw call */
export function HaloField({ halos }: { halos: Halo[] }) {
  const mesh = useMemo(() => {
    const geo = new PlaneGeometry(1, 1)
    const mat = new ShaderMaterial({
      uniforms: { uTime: U.uTime },
      vertexShader: HALO_VS,
      fragmentShader: HALO_FS,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    })
    const m = new InstancedMesh(geo, mat, halos.length)
    const col = new Float32Array(halos.length * 3)
    const o = new Object3D()
    const c = new Color()
    halos.forEach((h, i) => {
      o.position.set(h.p[0], h.p[1], h.p[2])
      o.scale.set(h.s, h.s, h.s)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      c.set(h.c).multiplyScalar(h.i)
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    })
    geo.setAttribute('aCol', new InstancedBufferAttribute(col, 3))
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    m.renderOrder = 6
    return m
  }, [halos])
  return <primitive object={mesh} />
}

const DUST_VS = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform float uPx;
varying float vA;
void main() {
  vec3 p = position;
  float t = uTime * aSeed.y;
  p.x += sin(t * 0.7 + aSeed.x * 6.283) * 0.55;
  p.z += cos(t * 0.5 + aSeed.x * 3.1) * 0.45;
  p.y = 0.5 + mod(p.y + t * 0.1, 7.0);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSeed.z * uPx;
  float fade = smoothstep(0.5, 1.6, p.y) * (1.0 - smoothstep(6.0, 7.5, p.y));
  vA = fade * (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed.w * 6.283)));
}`

const DUST_FS = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.05, d);
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.68) * a * vA * 0.8, 1.0);
  #include <colorspace_fragment>
}`

/** floating dust motes drifting through the sunbeams */
export function Dust({ count = 170, w = 36, z0 = -8.6, z1 = 4 }: { count?: number; w?: number; z0?: number; z1?: number }) {
  const dpr = useThree((s) => s.viewport.dpr)
  const { geo, mat } = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count * 4)
    let r = 12345
    const rnd = () => ((r = (r * 1664525 + 1013904223) % 4294967296) / 4294967296)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rnd() - 0.5) * w
      pos[i * 3 + 1] = rnd() * 7
      pos[i * 3 + 2] = z0 + rnd() * (z1 - z0)
      seed[i * 4] = rnd()
      seed[i * 4 + 1] = 0.5 + rnd()
      seed[i * 4 + 2] = 1.6 + rnd() * 2.2
      seed[i * 4 + 3] = rnd()
    }
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 4))
    geo.boundingSphere = null
    const mat = new ShaderMaterial({
      uniforms: { uTime: U.uTime, uPx: { value: 1 } },
      vertexShader: DUST_VS,
      fragmentShader: DUST_FS,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      fog: false,
    })
    return { geo, mat }
  }, [count, w, z0, z1])
  mat.uniforms.uPx.value = Math.max(1, dpr)
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />
}

/** soft sunbeams falling through the arched windows (vertex colours fade to black = transparent when additive) */
export function Shafts({ geometry }: { geometry: BufferGeometry }) {
  const mat = useMemo(
    () => new MeshBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false, fog: false }),
    [],
  )
  return <mesh geometry={geometry} material={mat} renderOrder={4} frustumCulled={false} />
}

/** a string of little bulbs that chase along the wire (the shared Bulbs component is frustum-culled by a stale bound) */
export function StringLights({ points, size = 0.06 }: { points: [number, number, number][]; size?: number }) {
  const { mesh, on, off, tmp } = useMemo(() => {
    const geo = new SphereGeometry(size, 8, 6)
    const mat = new MeshBasicMaterial({ toneMapped: false })
    const m = new InstancedMesh(geo, mat, points.length)
    const o = new Object3D()
    const on = new Color('#fff4c4')
    const off = new Color('#d59a45')
    points.forEach((p, i) => {
      o.position.set(p[0], p[1], p[2])
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, off)
    })
    m.instanceMatrix.needsUpdate = true
    m.frustumCulled = false
    return { mesh: m, on, off, tmp: new Color() }
  }, [points, size])
  const last = useMemo(() => ({ step: -1 }), [])
  useFrame(() => {
    if (scene.current !== 'experience') return
    const step = Math.floor(game.time * 4)
    if (step === last.step) return
    last.step = step
    for (let i = 0; i < points.length; i++) {
      const lit = (i + step) % 3 === 0
      tmp.copy(lit ? on : off)
      mesh.setColorAt(i, tmp)
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })
  return <primitive object={mesh} />
}
