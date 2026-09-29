// GeoBuilder: compose chunky low-poly forms with a tiny modelling DSL and bake them into ONE
// BufferGeometry with vertex colours, baked contact-shadow gradients, per-vertex glow and wind-sway
// weights. One building = one draw call, and every asset shares the same hand-made look.
import {
  BoxGeometry,
  BufferGeometry,
  Quaternion,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix3,
  Matrix4,
  PlaneGeometry,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from 'three'
import { rng, smoothstep } from '../engine/math'
import { R as PLANET_R } from '../engine/planet'

export type ColorLike = string | number | Color

export interface PrimOpts {
  /** 0..1 self-illumination (windows, lamps, signs) */
  glow?: number
  /** colour at the top of the primitive (linear gradient over its own height) */
  top?: ColorLike
  /** faceted normals */
  flat?: boolean
  /** override baked bottom darkening (0 = none) */
  ao?: number
  /** random vertex displacement for a hand-made wobble */
  jitter?: number
  /** wind sway strength (0..1), scaled by height in builder space */
  sway?: number
  /** random brightness variation of this primitive (+/-) */
  tint?: number
}

const _c = new Color()
const _v = new Vector3()
const _n = new Vector3()

export class GeoBuilder {
  private pos: number[] = []
  private nor: number[] = []
  private col: number[] = []
  private aux: number[] = []
  private idx: number[] = []
  private m = new Matrix4()
  private stack: Matrix4[] = []
  private rand: () => number

  /** height (builder-space) over which contact-shadow darkening fades out */
  aoHeight = 1.6
  /** default baked bottom darkening */
  ao = 0.28
  /** sway weight reaches 1 at this height */
  swayHeight = 4

  constructor(seed = 1) {
    this.rand = rng(seed * 7919 + 13)
  }

  // ---- transform stack ------------------------------------------------------------------------
  push() {
    this.stack.push(this.m.clone())
    return this
  }
  pop() {
    this.m.copy(this.stack.pop()!)
    return this
  }
  reset() {
    this.m.identity()
    this.stack.length = 0
    return this
  }
  at(x = 0, y = 0, z = 0) {
    this.m.multiply(new Matrix4().makeTranslation(x, y, z))
    return this
  }
  rotY(a: number) {
    this.m.multiply(new Matrix4().makeRotationY(a))
    return this
  }
  rotX(a: number) {
    this.m.multiply(new Matrix4().makeRotationX(a))
    return this
  }
  rotZ(a: number) {
    this.m.multiply(new Matrix4().makeRotationZ(a))
    return this
  }
  scale(x: number, y = x, z = x) {
    this.m.multiply(new Matrix4().makeScale(x, y, z))
    return this
  }
  /** multiply an arbitrary matrix into the current transform (use inside push/pop) */
  apply(m: Matrix4) {
    this.m.multiply(m)
    return this
  }
  /**
   * Stand something on the curved ground: `x`,`z` are tangent-plane offsets from the model origin.
   * Sinks the local origin onto the sphere and tilts +Y along the local surface normal.
   * Pushes the transform — the caller must `pop()` afterwards.
   */
  stand(x: number, z: number, radius = PLANET_R) {
    this.push()
    const d = new Vector3(x, radius, z)
    d.normalize()
    const s = new Vector3(d.x * radius, d.y * radius - radius, d.z * radius)
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d)
    this.m.multiply(new Matrix4().compose(s, q, new Vector3(1, 1, 1)))
    return this
  }
  /** run `fn` with a temporary translation (restored afterwards) */
  put(x: number, y: number, z: number, fn: (b: this) => void) {
    this.push().at(x, y, z)
    fn(this)
    return this.pop()
  }
  /** run `fn` inside a saved transform */
  with(fn: (b: this) => void) {
    this.push()
    fn(this)
    this.pop()
    return this
  }

  // ---- primitives (all origin at the base centre unless stated) -------------------------------
  box(w: number, h: number, d: number, color: ColorLike, o: PrimOpts = {}) {
    const g = new BoxGeometry(w, h, d)
    g.translate(0, h / 2, 0)
    return this.add(g, color, o)
  }

  /** box with its origin at its centre */
  boxC(w: number, h: number, d: number, color: ColorLike, o: PrimOpts = {}) {
    return this.add(new BoxGeometry(w, h, d), color, o)
  }

  cyl(rTop: number, rBot: number, h: number, seg: number, color: ColorLike, o: PrimOpts = {}) {
    const g = new CylinderGeometry(rTop, rBot, h, seg, 1)
    g.translate(0, h / 2, 0)
    return this.add(g, color, o)
  }

  cone(r: number, h: number, seg: number, color: ColorLike, o: PrimOpts = {}) {
    return this.cyl(0.0001, r, h, seg, color, o)
  }

  /** sphere centred at the origin */
  sphere(r: number, color: ColorLike, o: PrimOpts = {}, ws = 12, hs = 9) {
    return this.add(new SphereGeometry(r, ws, hs), color, o)
  }

  /** hemisphere sitting on y = 0 */
  dome(r: number, color: ColorLike, o: PrimOpts = {}, seg = 16) {
    const g = new SphereGeometry(r, seg, Math.max(4, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2)
    return this.add(g, color, o)
  }

  /** onion / chhatri dome: bulges then pinches to a point */
  onion(r: number, h: number, color: ColorLike, o: PrimOpts = {}, seg = 16) {
    const pts: Vector2[] = []
    const N = 12
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const y = t * h
      // bulb profile
      const bulge = Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.95)
      const rad = r * (0.18 + 0.82 * Math.pow(bulge, 0.75)) * (1 - Math.pow(t, 5) * 0.92)
      pts.push(new Vector2(Math.max(0.001, rad), y))
    }
    return this.add(new LatheGeometry(pts, seg), color, o)
  }

  /** squashed, jittered icosphere for foliage & rocks (centred) */
  blob(r: number, color: ColorLike, o: PrimOpts = {}, detail = 1) {
    return this.add(new IcosahedronGeometry(r, detail), color, { flat: true, jitter: r * 0.12, ...o })
  }

  torus(rad: number, tube: number, color: ColorLike, o: PrimOpts = {}, arc = Math.PI * 2, rs = 8, ts = 16) {
    return this.add(new TorusGeometry(rad, tube, rs, ts, arc), color, o)
  }

  /** flat disc on y = 0 facing up */
  disc(r: number, color: ColorLike, o: PrimOpts = {}, seg = 24) {
    const g = new CylinderGeometry(r, r, 0.04, seg, 1)
    g.translate(0, 0.02, 0)
    return this.add(g, color, o)
  }

  /** vertical quad facing +Z, origin at bottom centre */
  quad(w: number, h: number, color: ColorLike, o: PrimOpts = {}) {
    const g = new PlaneGeometry(w, h)
    g.translate(0, h / 2, 0)
    return this.add(g, color, o)
  }

  /** gable roof: triangular prism along Z, origin at base centre of the ridge line */
  gable(w: number, h: number, d: number, color: ColorLike, o: PrimOpts = {}) {
    const s = new Shape()
    s.moveTo(-w / 2, 0)
    s.lineTo(w / 2, 0)
    s.lineTo(0, h)
    s.closePath()
    const g = new ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
    g.translate(0, 0, -d / 2)
    return this.add(g, color, { flat: true, ...o })
  }

  /** arch-topped slab (doors, windows, niches). Origin bottom centre; faces +Z; thickness = depth. */
  arch(w: number, h: number, depth: number, color: ColorLike, o: PrimOpts = {}) {
    const r = w / 2
    const s = new Shape()
    s.moveTo(-r, 0)
    s.lineTo(r, 0)
    s.lineTo(r, h - r)
    s.absarc(0, h - r, r, 0, Math.PI, false)
    s.lineTo(-r, 0)
    const g = new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 })
    g.translate(0, 0, -depth / 2)
    return this.add(g, color, o)
  }

  extrude(shape: Shape, depth: number, color: ColorLike, o: PrimOpts = {}, bevel = 0) {
    const g = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
      curveSegments: 8,
    })
    g.translate(0, 0, -depth / 2)
    return this.add(g, color, o)
  }

  lathe(profile: [number, number][], seg: number, color: ColorLike, o: PrimOpts = {}) {
    return this.add(new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), seg), color, o)
  }

  /** convex polygon prism (points in the XZ plane, counter-clockwise seen from above), base at y = 0 */
  prism(pts: [number, number][], h: number, color: ColorLike, o: PrimOpts = {}) {
    const pos: number[] = []
    const idx: number[] = []
    const n = pts.length
    // ring of bottom + top vertices, then flat-shaded via toNonIndexed in add()
    for (const [x, z] of pts) pos.push(x, 0, z)
    for (const [x, z] of pts) pos.push(x, h, z)
    for (let i = 1; i < n - 1; i++) idx.push(n, n + i, n + i + 1) // top (facing up)
    for (let i = 1; i < n - 1; i++) idx.push(0, i + 1, i) // bottom
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      idx.push(i, j, n + j, i, n + j, n + i)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return this.add(g, color, { flat: true, ...o })
  }

  /** a round bar (cylinder) between two points, for rails, ropes, spokes, chains */
  bar(a: [number, number, number], b: [number, number, number], r: number, seg: number, color: ColorLike, o: PrimOpts = {}) {
    const v = new Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const len = v.length()
    if (len < 1e-6) return this
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), v.normalize())
    this.push()
    this.m.multiply(new Matrix4().makeTranslation(a[0], a[1], a[2])).multiply(new Matrix4().makeRotationFromQuaternion(q))
    this.cyl(r, r, len, seg, color, o)
    return this.pop()
  }

  custom(g: BufferGeometry, color: ColorLike, o: PrimOpts = {}) {
    return this.add(g, color, o)
  }

  // ---- core -----------------------------------------------------------------------------------
  private add(src: BufferGeometry, color: ColorLike, o: PrimOpts) {
    let g = src
    if (o.flat) {
      g = g.index ? g.toNonIndexed() : g
      g.deleteAttribute('normal')
    }
    if (o.jitter) {
      // displace shared positions consistently so the mesh stays watertight
      const p = g.attributes.position
      const seen = new Map<string, [number, number, number]>()
      for (let i = 0; i < p.count; i++) {
        const key = `${p.getX(i).toFixed(3)}|${p.getY(i).toFixed(3)}|${p.getZ(i).toFixed(3)}`
        let d = seen.get(key)
        if (!d) {
          d = [(this.rand() - 0.5) * o.jitter, (this.rand() - 0.5) * o.jitter, (this.rand() - 0.5) * o.jitter]
          seen.set(key, d)
        }
        p.setXYZ(i, p.getX(i) + d[0], p.getY(i) + d[1], p.getZ(i) + d[2])
      }
    }
    if (o.flat) g.computeVertexNormals()

    g.computeBoundingBox()
    const bb = g.boundingBox!
    const yMin = bb.min.y
    const ySpan = Math.max(1e-5, bb.max.y - bb.min.y)

    const base = new Color(color as never)
    const topC = o.top !== undefined ? new Color(o.top as never) : null
    const tint = o.tint ? 1 + (this.rand() - 0.5) * 2 * o.tint : 1
    const ao = o.ao ?? this.ao
    const glow = o.glow ?? 0
    const swayAmt = o.sway ?? 0

    const p = g.attributes.position
    const n = g.attributes.normal
    const start = this.pos.length / 3
    const normalMat = new Matrix3().getNormalMatrix(this.m)

    for (let i = 0; i < p.count; i++) {
      const ly = p.getY(i)
      _v.set(p.getX(i), ly, p.getZ(i)).applyMatrix4(this.m)
      _n.set(n.getX(i), n.getY(i), n.getZ(i)).applyMatrix3(normalMat).normalize()
      this.pos.push(_v.x, _v.y, _v.z)
      this.nor.push(_n.x, _n.y, _n.z)

      // colour: optional vertical gradient, tint, baked contact shadow by builder-space height
      _c.copy(base)
      if (topC) _c.lerp(topC, (ly - yMin) / ySpan)
      const k = ao > 0 ? 1 - ao * (1 - smoothstep(0, this.aoHeight, _v.y)) : 1
      this.col.push(_c.r * k * tint, _c.g * k * tint, _c.b * k * tint)

      const sw = swayAmt > 0 ? swayAmt * Math.pow(Math.min(1, Math.max(0, _v.y / this.swayHeight)), 1.6) : 0
      this.aux.push(glow, sw)
    }

    if (g.index) {
      const ix = g.index
      for (let i = 0; i < ix.count; i++) this.idx.push(ix.getX(i) + start)
    } else {
      for (let i = 0; i < p.count; i++) this.idx.push(i + start)
    }
    if (g !== src) g.dispose()
    src.dispose()
    return this
  }

  build(): BufferGeometry {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(this.pos, 3))
    g.setAttribute('normal', new Float32BufferAttribute(this.nor, 3))
    g.setAttribute('color', new Float32BufferAttribute(this.col, 3))
    g.setAttribute('aAux', new Float32BufferAttribute(this.aux, 2))
    g.setIndex(this.idx)
    g.computeBoundingSphere()
    g.computeBoundingBox()
    return g
  }
}
