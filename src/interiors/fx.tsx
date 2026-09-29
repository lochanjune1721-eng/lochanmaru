// Shared effects + helpers for interiors: light beams, floating motes, star fields, round rooms, image loading.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  ShaderMaterial,
  Vector3,
} from 'three'
import { game } from '../engine/game'
import { smoothstep } from '../engine/math'
import { GeoBuilder } from '../gfx/geo'
import { useInterior } from './kit'

// ---- images --------------------------------------------------------------------------------------
const imgCache = new Map<string, Promise<HTMLImageElement | null>>()
export function loadImage(url: string) {
  let p = imgCache.get(url)
  if (!p) {
    p = new Promise<HTMLImageElement | null>((res) => {
      const im = new Image()
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = url
    })
    imgCache.set(url, p)
  }
  return p
}

/** null until the image has loaded (then a re-render is triggered). */
export function useImage(url?: string) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  useEffect(() => {
    let live = true
    if (url) loadImage(url).then((im) => live && setImg(im))
    return () => {
      live = false
    }
  }, [url])
  return img
}

// ---- volumetric-looking light beam ------------------------------------------------------------------
const beamVert = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`
const beamFrag = `uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.3); float a = (0.25 + 0.75 * vUv.y) * f; gl_FragColor = vec4(uColor, a * uOpacity); }`

export function makeBeamMaterial(color: string, opacity = 0.3) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uColor: { value: new Color(color) }, uOpacity: { value: opacity } },
    vertexShader: beamVert,
    fragmentShader: beamFrag,
  })
}

/** A cone of light whose apex is at the origin and which opens downwards (-y). vUv.y = 1 at the apex. */
export function beamGeometry(radius: number, length: number, seg = 24) {
  const g = new ConeGeometry(radius, length, seg, 1, true)
  g.rotateX(Math.PI) // apex down -> flip so apex is at the origin and the cone opens downwards
  g.translate(0, -length / 2, 0)
  // ConeGeometry's uv.y is 1 at the apex; after flipping the apex sits at y = 0 (top), keep uv as is
  return g
}

// ---- floating motes ------------------------------------------------------------------------------------
const moteVert = `uniform float uTime; uniform float uSize; uniform vec3 uBox; attribute float aSeed; varying float vA;
void main(){
  vec3 p = position;
  float s = aSeed;
  p.y = mod(p.y + uTime * (0.12 + 0.2 * fract(s * 7.3)), uBox.y);
  p.x += sin(uTime * (0.3 + s) + s * 40.0) * 0.5;
  p.z += cos(uTime * (0.25 + s) + s * 23.0) * 0.5;
  vA = smoothstep(0.0, 0.8, p.y) * smoothstep(uBox.y, uBox.y - 1.5, p.y) * (0.45 + 0.55 * sin(uTime * (1.0 + s * 2.0) + s * 60.0) * 0.5 + 0.27);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * (0.6 + fract(s * 13.7)) * (26.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}`
const moteFrag = `uniform vec3 uColor; varying float vA;
void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor, a * a * vA); }`

/** Drifting dust / fireflies inside a box (centred on x/z, sitting on y = 0). */
export function Motes({ count = 90, box = [20, 8, 16], color = '#fff2cc', size = 3.2, position = [0, 0, 0] }: { count?: number; box?: [number, number, number]; color?: string; size?: number; position?: [number, number, number] }) {
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * box[0]
      pos[i * 3 + 1] = Math.random() * box[1]
      pos[i * 3 + 2] = (Math.random() - 0.5) * box[2]
      seed[i] = Math.random()
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    const m = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSize: { value: size }, uColor: { value: new Color(color) }, uBox: { value: new Vector3(...box) } },
      vertexShader: moteVert,
      fragmentShader: moteFrag,
    })
    return { geo: g, mat: m }
  }, [count, box[0], box[1], box[2], color, size]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (game.mode !== 'interior') return
    mat.uniforms.uTime.value = game.time
  })
  return <points geometry={geo} material={mat} position={position} frustumCulled={false} renderOrder={6} />
}

// ---- stars -------------------------------------------------------------------------------------------------
const starVert = `uniform float uTime; attribute float aSeed; attribute vec3 aCol; varying vec3 vC; varying float vT;
void main(){ vC = aCol; vT = 0.65 + 0.35 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 90.0); vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 1.4 + aSeed * 2.4; gl_Position = projectionMatrix * mv; }`
const starFrag = `varying vec3 vC; varying float vT; void main(){ vec2 c = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.05, length(c)); gl_FragColor = vec4(vC, a * vT); }`

/** A night-sky of tiny twinkling stars on a big sphere around the room (default: the band of directions the interior camera actually sees). */
export function Stars({ count = 260, radius = 170, position = [0, 0, 0], elevation = [-1.15, 0.12] }: { count?: number; radius?: number; position?: [number, number, number]; elevation?: [number, number] }) {
  const { geo, mat } = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    const c = new Color()
    const tints = ['#ffffff', '#ffe9c2', '#cfe0ff', '#ffd0e8']
    for (let i = 0; i < count; i++) {
      // keep them above the horizon and mostly behind the room (the camera looks toward -z)
      const az = (Math.random() - 0.5) * Math.PI * 1.7 + Math.PI
      const el = elevation[0] + Math.random() * (elevation[1] - elevation[0])
      pos[i * 3] = Math.sin(az) * Math.cos(el) * radius
      pos[i * 3 + 1] = Math.sin(el) * radius
      pos[i * 3 + 2] = Math.cos(az) * Math.cos(el) * radius
      seed[i] = Math.random()
      c.set(tints[i % tints.length])
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    g.setAttribute('aCol', new BufferAttribute(col, 3))
    const m = new ShaderMaterial({ transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uTime: { value: 0 } }, vertexShader: starVert, fragmentShader: starFrag })
    return { geo: g, mat: m }
  }, [count, radius, elevation[0], elevation[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (game.mode !== 'interior') return
    mat.uniforms.uTime.value = game.time
  })
  return <points geometry={geo} material={mat} position={position} frustumCulled={false} renderOrder={-50} />
}

// ---- round rooms -----------------------------------------------------------------------------------------
export interface RoundOpts {
  r: number
  wallH: number
  /** height of the wall at the (open) front */
  lowH?: number
  floorTop: string
  floorSide?: string
  wall: string
  wallTop?: string
  trim: string
  segs?: number
  thick?: number
}

/** Angle convention for round rooms: a = 0 is the FRONT (+z), a = PI the back; position = (r sin a, r cos a). */
export const ringPos = (r: number, a: number): [number, number] => [Math.sin(a) * r, Math.cos(a) * r]

export function roundWallHeight(a: number, wallH: number, lowH: number) {
  const back = (1 - Math.cos(a)) / 2
  return lowH + (wallH - lowH) * smoothstep(0.18, 0.86, back)
}

interface Strip {
  pos: number[]
  nor: number[]
  idx: number[]
}
const newStrip = (): Strip => ({ pos: [], nor: [], idx: [] })
const stripGeo = (t: Strip) => {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(t.pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(t.nor, 3))
  g.setIndex(t.idx)
  return g
}
/** Connect a ladder of vertex pairs into triangles that face `want` (checked numerically on the first rung). */
function ladder(t: Strip, rungs: number, want: [number, number, number]) {
  const P = t.pos
  const v = (i: number) => new Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2])
  const a = v(0)
  const b = v(1)
  const c = v(2)
  const n = b.clone().sub(a).cross(c.clone().sub(a))
  const flip = n.x * want[0] + n.y * want[1] + n.z * want[2] < 0
  for (let i = 0; i < rungs; i++) {
    const k = i * 2
    if (!flip) t.idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    else t.idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3)
  }
}

/** Smooth curved wall pieces (inner face, outer face, cap, skirting) whose height sweeps from tall at the back to low at the front. */
export function ringWallGeos(r: number, thick: number, wallH: number, lowH: number, N = 112) {
  const inner = newStrip()
  const outer = newStrip()
  const cap = newStrip()
  const skirt = newStrip()
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2
    const h = roundWallHeight(a, wallH, lowH)
    const s = Math.sin(a)
    const c = Math.cos(a)
    const r2 = r + thick
    inner.pos.push(s * r, 0, c * r, s * r, h, c * r)
    inner.nor.push(-s, 0, -c, -s, 0, -c)
    outer.pos.push(s * r2, 0, c * r2, s * r2, h, c * r2)
    outer.nor.push(s, 0, c, s, 0, c)
    cap.pos.push(s * (r - 0.12), h + 0.001, c * (r - 0.12), s * (r2 + 0.14), h + 0.001, c * (r2 + 0.14))
    cap.nor.push(0, 1, 0, 0, 1, 0)
    skirt.pos.push(s * (r - 0.08), 0, c * (r - 0.08), s * (r - 0.08), 0.42, c * (r - 0.08))
    skirt.nor.push(-s, 0, -c, -s, 0, -c)
  }
  // inward-facing strips are checked against the direction to the axis at the first rung (a = 0 -> -z)
  ladder(inner, N, [0, 0, -1])
  ladder(outer, N, [0, 0, 1])
  ladder(cap, N, [0, 1, 0])
  ladder(skirt, N, [0, 0, -1])
  return { inner: stripGeo(inner), outer: stripGeo(outer), cap: stripGeo(cap), skirt: stripGeo(skirt) }
}

/** A floating round slab of floor with a wall that sweeps from tall at the back to low at the front. */
export function roundRoom(b: GeoBuilder, o: RoundOpts) {
  const { r } = o
  const lowH = o.lowH ?? 1.1
  const thick = o.thick ?? 0.9
  b.put(0, -1.6, 0, (b) => b.cyl(r + 0.9, r + 0.6, 1.6, 64, o.floorSide ?? '#9a7660'))
  b.put(0, -3.5, 0, (b) => b.cyl(r - 1.5, r - 3.2, 1.9, 40, '#6a5570', { ao: 0 }))
  b.put(0, -0.06, 0, (b) => b.cyl(r, r, 0.12, 64, o.floorTop, { ao: 0 }))
  const g = ringWallGeos(r, thick, o.wallH, lowH, o.segs ?? 112)
  b.custom(g.inner, o.wall, { top: o.wallTop ?? o.wall })
  b.custom(g.outer, o.wall, { top: o.wallTop ?? o.wall })
  b.custom(g.cap, o.trim, { ao: 0 })
  b.custom(g.skirt, o.trim, { ao: 0 })
}

/** Solid ring wall (many small boxes) so the visitor can never leave the round floor. */
export function useRingWall(r: number, n = 32, h = 3, thick = 0.9) {
  const { X0, colliders } = useInterior()
  useEffect(() => {
    const cols: ReturnType<typeof colliders.box>[] = []
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * Math.PI * 2
      const len = ((Math.PI * 2 * (r + thick / 2)) / n) * 0.55
      const [x, z] = ringPos(r + thick / 2, a)
      const c = Math.cos(a)
      const s = Math.sin(a)
      cols.push(colliders.box(new Vector3(X0 + x, 0, z), new Vector3(c, 0, -s), new Vector3(s, 0, c), len, thick / 2, h))
    }
    return () => {
      for (const col of cols) {
        const i = colliders.list.indexOf(col)
        if (i >= 0) colliders.list.splice(i, 1)
      }
    }
  }, [X0, colliders, r, n, h, thick])
}
