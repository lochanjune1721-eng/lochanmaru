// The Signal Room's light show: ONE instanced draw call for every additive glow in the room —
// stars, drifting motes, halos, floor pools, orbiting orbs, sparks, shock rings, beacons.
// Slots are plain typed-array entries; owners write them from useFrame (no allocations).
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  ShaderMaterial,
} from 'three'

/** slot kinds (see fragment shader) */
export const K = {
  glow: 0, // soft billboard glow
  ring: 1, // horizontal expanding ring (floor)
  orb: 2, // hot core + halo
  star: 3, // twinkling cross flare
  spark: 4, // small hot dot
  moon: 5, // moon disc + halo
  pool: 6, // horizontal soft pool of light on the floor
} as const

const VS = /* glsl */ `
attribute vec3 aPos;
attribute float aSize;
attribute vec4 aCol;
attribute vec2 aKind;
uniform float uTime;
varying vec2 vUv;
varying vec4 vCol;
varying vec2 vKind;
void main() {
  float k = aKind.x;
  vec4 col = aCol;
  if (k > 2.5 && k < 3.5) {
    float tw = 0.62 + 0.38 * sin(uTime * (1.1 + fract(aKind.y * 7.31) * 2.3) + aKind.y * 40.0);
    col.a *= tw;
  }
  vec2 cn = position.xy;
  vec4 mv;
  if ((k > 0.5 && k < 1.5) || k > 5.5) {
    mv = modelViewMatrix * vec4(aPos + vec3(cn.x, 0.0, cn.y) * aSize, 1.0);
  } else {
    mv = modelViewMatrix * vec4(aPos, 1.0);
    mv.xy += cn * aSize;
  }
  gl_Position = projectionMatrix * mv;
  vUv = cn;
  vCol = col;
  vKind = aKind;
}`

const FS = /* glsl */ `
varying vec2 vUv;
varying vec4 vCol;
varying vec2 vKind;
void main() {
  float r = length(vUv);
  float k = vKind.x;
  vec3 c = vCol.rgb;
  float a = 0.0;
  if (k < 0.5) {
    a = exp(-r * r * 5.5) * (1.0 - smoothstep(0.78, 1.0, r));
  } else if (k < 1.5) {
    float w = max(vKind.y, 0.02);
    a = (1.0 - smoothstep(0.0, w, abs(r - 0.86))) + exp(-r * r * 3.0) * 0.10;
    a *= 1.0 - smoothstep(0.9, 1.0, r);
  } else if (k < 2.5) {
    float core = exp(-r * r * 26.0);
    a = core * 1.15 + exp(-r * r * 4.0) * 0.42;
    a *= 1.0 - smoothstep(0.82, 1.0, r);
    c = mix(c, vec3(1.0), core * 0.65);
  } else if (k < 3.5) {
    float ax = abs(vUv.x);
    float ay = abs(vUv.y);
    float core = exp(-r * r * 46.0);
    float hor = exp(-ay * ay * 420.0) * (1.0 - smoothstep(0.0, 1.0, ax));
    float ver = exp(-ax * ax * 420.0) * (1.0 - smoothstep(0.0, 1.0, ay));
    a = core * 1.1 + (hor + ver) * 0.55 + exp(-r * r * 7.0) * 0.16;
    c = mix(c, vec3(1.0), core * 0.5);
  } else if (k < 4.5) {
    float core = exp(-r * r * 12.0);
    a = core * (1.0 - smoothstep(0.85, 1.0, r));
    c = mix(c, vec3(1.0), exp(-r * r * 34.0) * 0.8);
  } else if (k < 5.5) {
    float rad = 0.29;
    float disc = 1.0 - smoothstep(rad - 0.012, rad, r);
    vec2 p = vUv / rad;
    float cr = 1.0 - smoothstep(0.19, 0.24, length(p - vec2(-0.30, 0.26)));
    cr += (1.0 - smoothstep(0.12, 0.17, length(p - vec2(0.38, -0.18)))) * 0.8;
    cr += (1.0 - smoothstep(0.08, 0.12, length(p - vec2(0.02, 0.50)))) * 0.7;
    cr += (1.0 - smoothstep(0.15, 0.2, length(p - vec2(-0.12, -0.52)))) * 0.6;
    cr += (1.0 - smoothstep(0.06, 0.09, length(p - vec2(0.55, 0.42)))) * 0.6;
    vec3 moon = c * (1.0 - 0.16 * cr) * (0.94 + 0.06 * p.x);
    float halo = exp(-r * r * 7.5) * 0.5;
    gl_FragColor = vec4(moon * disc + c * halo * (1.0 - disc), vCol.a);
    #include <colorspace_fragment>
    return;
  } else {
    a = exp(-r * r * 3.4) * (1.0 - smoothstep(0.62, 1.0, r));
  }
  gl_FragColor = vec4(c, a * vCol.a);
  #include <colorspace_fragment>
}`

export class Fx {
  readonly cap: number
  readonly pos: Float32Array
  readonly size: Float32Array
  readonly col: Float32Array
  readonly kind: Float32Array
  readonly mesh: Mesh
  readonly mat: ShaderMaterial
  private aPos: InstancedBufferAttribute
  private aSize: InstancedBufferAttribute
  private aCol: InstancedBufferAttribute
  private aKind: InstancedBufferAttribute
  /** first slot that changes at runtime (everything before it is uploaded once) */
  dynStart = 0

  constructor(cap: number) {
    this.cap = cap
    this.pos = new Float32Array(cap * 3)
    this.size = new Float32Array(cap)
    this.col = new Float32Array(cap * 4)
    this.kind = new Float32Array(cap * 2)
    const g = new InstancedBufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3))
    g.setIndex([0, 1, 2, 0, 2, 3])
    this.aPos = new InstancedBufferAttribute(this.pos, 3).setUsage(DynamicDrawUsage)
    this.aSize = new InstancedBufferAttribute(this.size, 1).setUsage(DynamicDrawUsage)
    this.aCol = new InstancedBufferAttribute(this.col, 4).setUsage(DynamicDrawUsage)
    this.aKind = new InstancedBufferAttribute(this.kind, 2).setUsage(DynamicDrawUsage)
    g.setAttribute('aPos', this.aPos)
    g.setAttribute('aSize', this.aSize)
    g.setAttribute('aCol', this.aCol)
    g.setAttribute('aKind', this.aKind)
    g.instanceCount = cap
    this.mat = new ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: VS,
      fragmentShader: FS,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      fog: false,
    })
    this.mesh = new Mesh(g, this.mat)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 6
  }

  /** write a whole slot */
  put(i: number, kind: number, param: number, x: number, y: number, z: number, size: number, r: number, g: number, b: number, a: number) {
    const p = i * 3
    this.pos[p] = x
    this.pos[p + 1] = y
    this.pos[p + 2] = z
    this.size[i] = size
    const c = i * 4
    this.col[c] = r
    this.col[c + 1] = g
    this.col[c + 2] = b
    this.col[c + 3] = a
    this.kind[i * 2] = kind
    this.kind[i * 2 + 1] = param
  }
  move(i: number, x: number, y: number, z: number) {
    const p = i * 3
    this.pos[p] = x
    this.pos[p + 1] = y
    this.pos[p + 2] = z
  }
  color(i: number, r: number, g: number, b: number, a: number) {
    const c = i * 4
    this.col[c] = r
    this.col[c + 1] = g
    this.col[c + 2] = b
    this.col[c + 3] = a
  }
  alpha(i: number, a: number) {
    this.col[i * 4 + 3] = a
  }
  scale(i: number, s: number) {
    this.size[i] = s
  }
  hide(i: number) {
    this.size[i] = 0
    this.col[i * 4 + 3] = 0
  }

  /** call once after the static slots are written */
  commitStatic(dynStart: number) {
    this.dynStart = dynStart
    this.aPos.needsUpdate = true
    this.aSize.needsUpdate = true
    this.aCol.needsUpdate = true
    this.aKind.needsUpdate = true
  }
  /** call each frame after writing dynamic slots */
  commit(time: number) {
    this.mat.uniforms.uTime.value = time
    const s = this.dynStart
    const n = this.cap - s
    this.aPos.clearUpdateRanges()
    this.aPos.addUpdateRange(s * 3, n * 3)
    this.aPos.needsUpdate = true
    this.aSize.clearUpdateRanges()
    this.aSize.addUpdateRange(s, n)
    this.aSize.needsUpdate = true
    this.aCol.clearUpdateRanges()
    this.aCol.addUpdateRange(s * 4, n * 4)
    this.aCol.needsUpdate = true
    this.aKind.clearUpdateRanges()
    this.aKind.addUpdateRange(s * 2, n * 2)
    this.aKind.needsUpdate = true
  }
}

const _c = new Color()
/** hex -> linear rgb triplet (cached by caller) */
export function lin(hex: string): [number, number, number] {
  _c.set(hex)
  return [_c.r, _c.g, _c.b]
}

// ---- sparks + shock rings (analytic motion, safe against big time steps) --------------------------------
export class Sparks {
  private n: number
  private i = 0
  private birth: Float32Array
  private life: Float32Array
  private p0: Float32Array
  private v0: Float32Array
  private rgb: Float32Array
  private sz: Float32Array
  private ringI = 0
  private ringN: number
  private rBirth: Float32Array
  private rDur: Float32Array
  private rMax: Float32Array
  private rPos: Float32Array
  private rRgb: Float32Array
  constructor(
    private fx: Fx,
    private sparkStart: number,
    count: number,
    private ringStart: number,
    ringCount: number,
  ) {
    this.n = count
    this.birth = new Float32Array(count).fill(-99)
    this.life = new Float32Array(count)
    this.p0 = new Float32Array(count * 3)
    this.v0 = new Float32Array(count * 3)
    this.rgb = new Float32Array(count * 3)
    this.sz = new Float32Array(count)
    this.ringN = ringCount
    this.rBirth = new Float32Array(ringCount).fill(-99)
    this.rDur = new Float32Array(ringCount)
    this.rMax = new Float32Array(ringCount)
    this.rPos = new Float32Array(ringCount * 3)
    this.rRgb = new Float32Array(ringCount * 3)
    for (let i = 0; i < count; i++) fx.put(sparkStart + i, K.spark, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    for (let i = 0; i < ringCount; i++) fx.put(ringStart + i, K.ring, 0.11, 0, 0, 0, 0, 0, 0, 0, 0)
  }
  emit(t: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, rgb: [number, number, number]) {
    const i = this.i
    this.i = (i + 1) % this.n
    this.birth[i] = t
    this.life[i] = life
    this.p0[i * 3] = x
    this.p0[i * 3 + 1] = y
    this.p0[i * 3 + 2] = z
    this.v0[i * 3] = vx
    this.v0[i * 3 + 1] = vy
    this.v0[i * 3 + 2] = vz
    this.rgb[i * 3] = rgb[0]
    this.rgb[i * 3 + 1] = rgb[1]
    this.rgb[i * 3 + 2] = rgb[2]
    this.sz[i] = size
  }
  ring(t: number, x: number, z: number, maxR: number, dur: number, rgb: [number, number, number], delay = 0) {
    const i = this.ringI
    this.ringI = (i + 1) % this.ringN
    this.rBirth[i] = t + delay
    this.rDur[i] = dur
    this.rMax[i] = maxR
    this.rPos[i * 3] = x
    this.rPos[i * 3 + 2] = z
    this.rRgb[i * 3] = rgb[0]
    this.rRgb[i * 3 + 1] = rgb[1]
    this.rRgb[i * 3 + 2] = rgb[2]
  }
  update(t: number) {
    const fx = this.fx
    const DRAG = 1.7
    const G = 6.5
    for (let i = 0; i < this.n; i++) {
      const s = this.sparkStart + i
      const age = t - this.birth[i]
      const life = this.life[i]
      if (age < 0 || age >= life) {
        if (fx.size[s] !== 0) fx.hide(s)
        continue
      }
      const k = (1 - Math.exp(-DRAG * age)) / DRAG
      const u = age / life
      const x = this.p0[i * 3] + this.v0[i * 3] * k
      let y = this.p0[i * 3 + 1] + this.v0[i * 3 + 1] * k - 0.5 * G * age * age
      const z = this.p0[i * 3 + 2] + this.v0[i * 3 + 2] * k
      if (y < 0.06) y = 0.06
      const fade = (1 - u) * (1 - u)
      fx.put(s, K.spark, 0, x, y, z, this.sz[i] * (0.6 + 0.4 * (1 - u)), this.rgb[i * 3], this.rgb[i * 3 + 1], this.rgb[i * 3 + 2], fade * 1.25)
    }
    for (let i = 0; i < this.ringN; i++) {
      const s = this.ringStart + i
      const age = t - this.rBirth[i]
      const dur = this.rDur[i]
      if (age < 0 || age >= dur) {
        if (fx.size[s] !== 0) fx.hide(s)
        continue
      }
      const u = age / dur
      const e = 1 - Math.pow(1 - u, 3)
      fx.put(s, K.ring, 0.11, this.rPos[i * 3], 0.05, this.rPos[i * 3 + 2], this.rMax[i] * (0.08 + 0.92 * e), this.rRgb[i * 3], this.rRgb[i * 3 + 1], this.rRgb[i * 3 + 2], Math.pow(1 - u, 1.4) * 1.5)
    }
  }
}
