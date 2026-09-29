// Procedural audio: Web Audio only, no asset files. Muted until the visitor opts in.
//
//   beds   wind, waves, fountain, birds and chimes, cross-faded by where the visitor stands
//   shots  steps, doors, paper, discovery ... fired from the event bus
//   all of it -> high-pass -> soft-knee limiter -> master (-16 dB, 0.4 s fades) -> speakers
//
// Browsers only start audio after a user gesture, so a returning visitor (audioOn saved) gets capturing listeners that
// start it on the first tap or key. Enabling swells the ambience in over 0.4 s (one-shots, like the toggle's own tick, are
// heard at once); muting fades everything out over 0.4 s, suspend()s the context and stops every timer.
// Voices are plain functions of (BaseAudioContext, destination, start time, ...) so tests can render them offline.
import { bus } from './bus'
import { clamp, smoothstep } from './math'
import { mapToN, surfaceDistance } from './planet'
import { player, Surface } from './state'
import { useStore } from './store'
import { PLAZA } from '../world/layout'
import { shoreDistance } from '../world/terrain'

type Ctx = BaseAudioContext
export type NoiseKind = 'white' | 'pink' | 'brown'
export type UiName = 'tick' | 'open' | 'close' | 'discover' | 'door' | 'whoosh' | 'pop'
export type LayerId = 'wind' | 'waves' | 'fountain' | 'birds' | 'chimes'

const MASTER = 0.158 // -16 dB
const FADE = 0.4 // master fade in/out (s)
const TAU = 1.2 // bed cross-fade time constant (s)
const AHEAD = 0.35 // how far past "now" the 100 ms control tick schedules events (s)
const MAX_VOICES = 24 // live voices per context; further one-shots are dropped instead of piling up
/** D major pentatonic over two octaves, from D4. */
export const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21].map((n) => 293.66 * Math.pow(2, n / 12))
const TRIAD = [587.33, 739.99, 880] // D5 F#5 A5
const SPARK = [1174.66, 1479.98, 1760, 2349.32] // D6 F#6 A6 D7

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const jit = (v: number, amt = 0.12) => v * (1 + rand(-amt, amt))
const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]

// ---- noise: three shared loops, made once ------------------------------------------------------------------------
const noises: Partial<Record<NoiseKind, AudioBuffer>> = {}
const KELLET = [[0.99886, 0.0555179], [0.99332, 0.0750759], [0.969, 0.153852], [0.8665, 0.3104856], [0.55, 0.5329522], [-0.7616, -0.016898]]

/** 3 s loop. Every kind has the same RMS (0.25), so gains mean the same thing across beds; the loop seam is cross-faded. */
export function noiseBuffer(c: Ctx, kind: NoiseKind): AudioBuffer {
  const have = noises[kind]
  if (have) return have
  const rate = 32000
  const len = rate * 3
  const xf = 2048
  const raw = new Float32Array(len + xf)
  const pole = [0, 0, 0, 0, 0, 0, 0]
  let s = 0
  let sum = 0
  for (let i = -4096; i < raw.length; i++) {
    const w = Math.random() * 2 - 1
    if (kind === 'white') s = w
    else if (kind === 'brown') s = (s + 0.02 * w) / 1.02
    else {
      // pink: Paul Kellet's economy filter
      s = w * 0.5362 + pole[6]
      KELLET.forEach(([a, b], j) => (s += pole[j] = a * pole[j] + w * b))
      pole[6] = w * 0.115926
    }
    if (i >= 0) {
      raw[i] = s // the first 4096 samples only warm the filters up
      sum += s * s
    }
  }
  const k = 0.25 / Math.sqrt(sum / raw.length)
  const buf = c.createBuffer(1, len, rate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = raw[i] * k
  for (let i = 0; i < xf; i++) {
    // the head fades in from the samples that would have followed the tail, so the loop point has no jump
    const a = ((i + 0.5) / xf) * (Math.PI / 2)
    d[i] = (raw[i] * Math.sin(a) + raw[len + i] * Math.cos(a)) * k
  }
  return (noises[kind] = buf)
}

// ---- voice library -----------------------------------------------------------------------------------------------
/** Configure a node in one expression: AudioParams get `.value`, everything else is assigned. */
function set<N extends AudioNode>(n: N, props: Record<string, unknown>): N {
  const o = n as unknown as Record<string, unknown>
  for (const [k, v] of Object.entries(props)) {
    if (o[k] instanceof AudioParam) (o[k] as AudioParam).value = v as number
    else o[k] = v
  }
  return n
}
const gain = (c: Ctx, v = 1) => set(c.createGain(), { gain: v })
const filt = (c: Ctx, type: BiquadFilterType, f: number, q = 0.7) => set(c.createBiquadFilter(), { type, frequency: f, Q: q })
const osc = (c: Ctx, type: OscillatorType, f: number) => set(c.createOscillator(), { type, frequency: f })
const noise = (c: Ctx, kind: NoiseKind, rate = 1) => set(c.createBufferSource(), { buffer: noiseBuffer(c, kind), loop: true, playbackRate: rate })
/** Stereo panner (a plain pass-through on old Safari, which lacks one). */
const pan = (c: Ctx, v: number): AudioNode => (typeof c.createStereoPanner === 'function' ? set(c.createStereoPanner(), { pan: v }) : gain(c))
const link = (...n: AudioNode[]) => {
  for (let i = 1; i < n.length; i++) n[i - 1].connect(n[i])
  return n[n.length - 1]
}

/** Click-free envelope on a gain: linear attack `a`, a 60 dB exponential fall over `d`, then `r` to true zero. Returns the end time. */
export function env(p: AudioParam, t: number, peak: number, a: number, d: number, r = 0.02) {
  p.setValueAtTime(0.0001, t)
  p.linearRampToValueAtTime(peak, t + a)
  p.exponentialRampToValueAtTime(peak * 0.001, t + a + d)
  p.linearRampToValueAtTime(0, t + a + d + r)
  return t + a + d + r
}

const alive = new WeakMap<Ctx, number>()
const busy = (c: Ctx) => alive.get(c) ?? 0
/** Voices that ask for reverb (`wa`) look up the send of the bus they play into. */
const sends = new WeakMap<AudioNode, AudioNode>()

/** Start a voice's sources, stop them at `end`, and disconnect every node when the last one ends, so nothing leaks. */
function fin(c: Ctx, t: number, end: number, srcs: AudioScheduledSourceNode[], nodes: AudioNode[]) {
  alive.set(c, busy(c) + 1)
  let left = srcs.length
  for (const s of srcs) {
    s.onended = () => {
      if (--left) return
      for (const n of [...srcs, ...nodes]) n.disconnect()
      alive.set(c, busy(c) - 1)
    }
    if (s instanceof AudioBufferSourceNode) s.start(t, rand(0, 2))
    else s.start(t)
    s.stop(end)
  }
}

interface ToneOpts {
  type?: OscillatorType
  a?: number // attack (s)
  parts?: [ratio: number, amp: number][] // extra partials sharing the envelope
  to?: number // glide to this pitch over `glide` seconds (default: the whole decay)
  glide?: number
  wa?: number // reverb send level, if the destination bus has one
}
/** A pitched blip: partials -> 60 dB exponential decay over `d` seconds. */
export function tone(c: Ctx, dest: AudioNode, t: number, f: number, peak: number, d: number, o: ToneOpts = {}) {
  const g = gain(c, 0)
  const srcs: OscillatorNode[] = []
  const nodes: AudioNode[] = [g]
  for (const [r, amp] of [[1, 1] as [number, number], ...(o.parts ?? [])]) {
    const s = osc(c, o.type ?? 'sine', f * r)
    const p = gain(c, amp)
    if (o.to) {
      s.frequency.setValueAtTime(f * r, t)
      s.frequency.exponentialRampToValueAtTime(o.to * r, t + (o.glide ?? d))
    }
    link(s, p, g)
    srcs.push(s)
    nodes.push(p)
  }
  g.connect(dest)
  const wet = o.wa ? sends.get(dest) : undefined
  if (wet) {
    const w = gain(c, o.wa)
    link(g, w, wet)
    nodes.push(w)
  }
  fin(c, t, env(g.gain, t, peak, o.a ?? 0.004, d), srcs, nodes)
}

interface BurstOpts {
  kind?: NoiseKind
  type?: BiquadFilterType
  q?: number
  to?: number // sweep the filter to this frequency over the whole burst
  a?: number
}
/** A filtered noise burst: noise -> filter (optionally sweeping) -> 60 dB exponential decay over `d` seconds. */
export function burst(c: Ctx, dest: AudioNode, t: number, f: number, peak: number, d: number, o: BurstOpts = {}) {
  const a = o.a ?? 0.006
  const s = noise(c, o.kind ?? 'white')
  const b = filt(c, o.type ?? 'lowpass', f, o.q)
  const g = gain(c, 0)
  if (o.to) {
    b.frequency.setValueAtTime(f, t)
    b.frequency.exponentialRampToValueAtTime(o.to, t + a + d)
  }
  link(s, b, g, dest)
  fin(c, t, env(g.gain, t, peak, a, d), [s], [b, g])
}

function pop(c: Ctx, d: AudioNode, t: number, pitch = 1) {
  tone(c, d, t, 560 * pitch, 0.34, 0.08, { to: 320 * pitch, glide: 0.05, a: 0.002 })
  burst(c, d, t, 3500, 0.18, 0.012, { type: 'highpass', a: 0.001 })
}

// ---- the voices: every one is (context, destination, start time, ...options) ---------------------------------------
export const voices = {
  /** One footfall. Jittered pitch and level keep a run from machine-gunning; running is a little louder. */
  step(c: Ctx, d: AudioNode, t: number, surface: Surface = 'grass', speed = 5.4) {
    const v = jit(0.6 + 0.4 * clamp(speed / 8.4, 0, 1))
    const k = jit(1)
    switch (surface) {
      case 'grass': // soft puff
        burst(c, d, t, 900 * k, 1.2 * v, 0.07, { kind: 'pink', a: 0.008 })
        break
      case 'path':
      case 'sand': {
        // crunch: 2-3 micro-bursts of band-passed noise
        const f = surface === 'sand' ? 1500 : 2100
        for (let i = 0, n = 2 + Math.floor(rand(0, 2)); i < n; i++) {
          burst(c, d, t + i * rand(0.014, 0.026), jit(f, 0.2) * k, (surface === 'sand' ? 1.4 : 1.7) * v, 0.03, { type: 'bandpass', q: 1.1, a: 0.003 })
        }
        break
      }
      case 'tile': // tiny tick with a short ring
        burst(c, d, t, 5200 * k, 0.65 * v, 0.014, { type: 'highpass', a: 0.001 })
        tone(c, d, t, 2900 * k, 0.2 * v, 0.09, { a: 0.001 })
        break
      case 'wood': // hollow thump
        burst(c, d, t, 380 * k, 0.85 * v, 0.06, { kind: 'pink' })
        tone(c, d, t, 125 * k, 0.5 * v, 0.16, { to: 88 * k, glide: 0.1 })
        break
      case 'water': // soft splash and two droplets
        burst(c, d, t, 520 * k, 1.6 * v, 0.22, { kind: 'pink', type: 'bandpass', q: 0.9, to: 1500 * k, a: 0.03 })
        for (let i = 0; i < 2; i++) tone(c, d, t + 0.05 + i * 0.07, jit(1500), 0.05 * v, 0.05, { to: 2100 })
        break
    }
  },
  /** Landing after the intro drop: soft thud and a tiny poof. */
  land(c: Ctx, d: AudioNode, t: number) {
    tone(c, d, t, 100, 0.4, 0.24, { to: 46, glide: 0.14, a: 0.005 })
    burst(c, d, t, 650, 0.65, 0.22, { kind: 'pink', a: 0.012 })
  },
  /** Warm creak (a saw through a rising resonant band-pass, 0.35 s) and a latch tick. */
  door(c: Ctx, d: AudioNode, t: number) {
    const o = osc(c, 'sawtooth', 84)
    const b = filt(c, 'bandpass', 330, 7)
    const g = gain(c, 0)
    o.frequency.setValueAtTime(84, t)
    o.frequency.linearRampToValueAtTime(120, t + 0.35)
    b.frequency.setValueAtTime(330, t)
    b.frequency.exponentialRampToValueAtTime(720, t + 0.35)
    link(o, b, g, d)
    fin(c, t, env(g.gain, t, 0.5, 0.08, 0.25), [o], [b, g])
    burst(c, d, t + 0.36, 2300, 0.5, 0.025, { type: 'bandpass', q: 2, a: 0.001 })
    tone(c, d, t + 0.36, 170, 0.3, 0.06, { a: 0.001 })
  },
  /** Airy noise sweep: the world swinging into view at the start of the journey. */
  whoosh(c: Ctx, d: AudioNode, t: number, dir: 'open' | 'close' = 'open') {
    const [f0, f1] = dir === 'open' ? [450, 2600] : [2600, 450]
    burst(c, d, t, f0, 1.5, 0.34, { type: 'bandpass', q: 0.8, to: f1, a: 0.16 })
  },
  /** Two-note arrival chime, a perfect fifth (D5-A5); leaving is a minor third lower (B4-F#5). */
  arrive(c: Ctx, d: AudioNode, t: number, entering = true) {
    const [a, b] = entering ? [587.33, 880] : [493.88, 739.99]
    const o: ToneOpts = { a: 0.012, parts: [[2, 0.2], [3, 0.06]], wa: 0.5 }
    tone(c, d, t, a, 0.26, 0.9, o)
    tone(c, d, t + 0.13, b, 0.24, 1.1, o)
  },
  /** Paper slide and a soft pop; closing is the shorter, lower, reversed version. */
  paper(c: Ctx, d: AudioNode, t: number, opening = true) {
    const [f0, f1] = opening ? [1000, 3400] : [3200, 1100]
    burst(c, d, t, f0, 1.1, opening ? 0.14 : 0.09, { kind: 'pink', type: 'bandpass', q: 0.7, to: f1, a: 0.04 })
    pop(c, d, t + (opening ? 0.1 : 0.05), opening ? 1 : 0.75)
  },
  pop,
  /** The "press E" prompt: a tick that is barely there. */
  prompt(c: Ctx, d: AudioNode, t: number) {
    tone(c, d, t, 3300, 0.05, 0.035, { a: 0.002 })
  },
  /** The sound toggle's confirmation. */
  tick(c: Ctx, d: AudioNode, t: number) {
    tone(c, d, t, 1650, 0.3, 0.05, { a: 0.002 })
    tone(c, d, t + 0.045, 2480, 0.22, 0.07, { a: 0.002 })
  },
  /** The journey begins: a gentle rising three-note swell over a breath of air. */
  start(c: Ctx, d: AudioNode, t: number) {
    TRIAD.forEach((f, i) => {
      tone(c, d, t + i * 0.2, f, 0.2, i === 2 ? 2.2 : 1.6, { type: 'triangle', a: 0.07, parts: [[1.003, 0.6], [2, 0.25], [3, 0.06]], wa: 0.8 })
    })
    burst(c, d, t, 700, 0.6, 0.5, { kind: 'pink', type: 'bandpass', q: 0.7, to: 2600, a: 0.5 })
  },
  /** A secret: four quick rising bell tones, each with a near-unison partner for shimmer, and a long tail. */
  discover(c: Ctx, d: AudioNode, t: number) {
    SPARK.forEach((f, i) => {
      tone(c, d, t + i * 0.085, f, 0.15, 1 + i * 0.25, { a: 0.003, parts: [[1.004, 0.55], [2.76, 0.22], [5.4, 0.07]], wa: 0.9 })
    })
  },
  /** Sparse bird phrase: 2-3 fast FM'd sine sweeps at a random pitch (2.2-4.5 kHz) and stereo position. */
  bird(c: Ctx, d: AudioNode, t: number) {
    const f0 = rand(2200, 4500)
    const side = rand(-0.8, 0.8)
    const up = Math.random() < 0.7
    let at = t
    for (let i = 0, n = 2 + Math.floor(rand(0, 2)); i < n; i++, at += rand(0.1, 0.17)) {
      const f = f0 * rand(0.92, 1.12)
      const len = rand(0.06, 0.1)
      const car = osc(c, 'sine', f)
      const mod = osc(c, 'sine', rand(35, 80))
      const depth = gain(c, f * rand(0.03, 0.08))
      const g = gain(c, 0)
      const p = pan(c, side)
      car.frequency.setValueAtTime(f, at)
      car.frequency.exponentialRampToValueAtTime(f * (up ? 1.3 : 0.75), at + len)
      link(mod, depth)
      depth.connect(car.frequency)
      link(car, g, p, d)
      fin(c, at, env(g.gain, at, 0.12, 0.012, len), [car, mod], [depth, g, p])
    }
  },
  /** Kalimba / wind-chime note: sine, a little 2nd harmonic, ~1.7 s decay into the reverb. */
  chime(c: Ctx, d: AudioNode, t: number, f = pick(PENTA)) {
    tone(c, d, t, f, 0.17, 1.7, { a: 0.006, parts: [[2, 0.16], [5.4, 0.03]], wa: 0.9 })
  },
  plink(c: Ctx, d: AudioNode, t: number) {
    const f = rand(1300, 2900)
    tone(c, d, t, f, rand(0.04, 0.09), 0.07, { a: 0.002, to: f * 1.35, glide: 0.03 })
  },
}

/** Cheap convolution reverb: `secs` of stereo noise that decays 60 dB and darkens as it fades. */
export function reverb(c: Ctx, secs = 1.8) {
  const n = Math.floor(c.sampleRate * secs)
  const pre = Math.floor(c.sampleRate * 0.012)
  const ir = c.createBuffer(2, n, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    let lp = 0
    for (let i = pre; i < n; i++) {
      const x = i / n
      lp += (Math.random() * 2 - 1 - lp) * (0.75 - 0.62 * x)
      d[i] = lp * Math.exp(-6.9 * x) * Math.min(1, (i - pre) / 96)
    }
  }
  return set(c.createConvolver(), { buffer: ir })
}

// ---- beds: persistent graphs, built the first time they are needed; after that only their gain moves -------------------
export interface Layer {
  out: GainNode
  tick?: (now: number, lvl: number) => void // schedules random events (birds, drops, ticks) a little ahead of time
}

/** Look-ahead scheduler: `fn(t)` runs for each event due before now+AHEAD and returns the gap to the next one. */
function ticker(fn: (t: number) => number, first: () => number = () => 0.05) {
  let next = NaN
  return (now: number) => {
    if (!(next >= now)) next = now + first() // first run, or stale after a spell of silence
    while (next < now + AHEAD) next += Math.max(0.02, fn(next))
  }
}
const every = (gap: () => number, fn: (t: number) => void, first?: () => number) =>
  ticker((t) => {
    fn(t)
    return gap()
  }, first)

/** Persistent noise -> filter -> gain -> dest, started now. Returns [gain, filter] so callers can modulate them. */
function bed(c: Ctx, dest: AudioNode, kind: NoiseKind, type: BiquadFilterType, f: number, level: number, q = 0.7, rate = 1) {
  const s = noise(c, kind, rate)
  const [b, g] = [filt(c, type, f, q), gain(c, level)]
  link(s, b, g, dest)
  s.start(0, rand(0, 2))
  return [g, b] as const
}
/** Slow sine LFO of amplitude `depth` added to each param. */
function lfo(c: Ctx, rate: number, depth: number, ...ps: AudioParam[]) {
  const [o, g] = [osc(c, 'sine', rate), gain(c, depth)]
  o.connect(g)
  for (const p of ps) g.connect(p)
  o.start()
}

/** The bed factories (exported so tests can render one on its own). */
export const BEDS: Record<LayerId, (c: Ctx, wet: AudioNode) => Layer> = {
  wind(c) {
    const out = gain(c, 0)
    const gusts: AudioParam[] = []
    const cuts: AudioParam[] = []
    for (const side of [-1, 1]) {
      // one decorrelated copy per ear keeps the wind wide instead of a mono hiss
      const gust = gain(c, 0.55)
      const [, body] = bed(c, gust, 'pink', 'bandpass', 330, 0.9, 0.4, 1 + side * 0.06)
      bed(c, gust, 'pink', 'bandpass', 1500, 0.2, 0.6)
      link(gust, pan(c, side * 0.85), out)
      gusts.push(gust.gain)
      cuts.push(body.frequency)
    }
    // two slow gust LFOs (0.067 and 0.121 Hz, so they rarely line up) move both loudness and brightness
    lfo(c, 0.067, 0.24, ...gusts)
    lfo(c, 0.121, 0.17, ...gusts)
    lfo(c, 0.067, 150, ...cuts)
    return { out }
  },
  waves(c) {
    const out = gain(c, 0)
    const sides: AudioParam[][] = []
    for (const side of [-1, 1]) {
      const p = pan(c, side * 0.75)
      const [g, bp] = bed(c, p, 'pink', 'bandpass', 500, 0.1, 0.35, 1 + side * 0.05)
      bed(c, p, 'pink', 'highpass', 2800, 0.045, 0.5) // faint continuous foam hiss
      p.connect(out)
      sides.push([g.gain, bp.frequency])
    }
    // each wave swells, crests brighter and drains back over 6-9 s; the right ear lags 0.7 s so it rolls across
    const wave = ticker((t) => {
      const T = rand(6, 9)
      const peak = rand(0.55, 1)
      sides.forEach(([g, f], i) => {
        for (const [p, lo, hi] of [[g, 0.1, 0.8 * peak], [f, 500, 500 + 1300 * peak]] as [AudioParam, number, number][]) {
          const t0 = t + i * 0.7
          p.setValueAtTime(lo, t0)
          p.linearRampToValueAtTime(hi, t0 + T * 0.4)
          p.linearRampToValueAtTime(lo, t0 + T - 0.05)
        }
      })
      return T
    })
    return { out, tick: wave }
  },
  fountain(c) {
    const out = gain(c, 0)
    const hiss: AudioParam[] = []
    for (const side of [-1, 1]) {
      const p = pan(c, side * 0.7)
      hiss.push(bed(c, p, 'white', 'bandpass', 3000, 0.36, 0.7, 1 + side * 0.04)[0].gain) // splashy hiss
      bed(c, p, 'pink', 'bandpass', 700, 0.28, 0.5) // watery body
      p.connect(out)
    }
    lfo(c, 0.41, 0.12, ...hiss)
    let near = 0
    const drops = every(() => rand(0.12, 0.5) / (0.3 + near), (t) => voices.plink(c, out, t)) // more drops the closer you stand
    return {
      out,
      tick: (now, lvl) => {
        near = lvl
        drops(now)
      },
    }
  },
  birds(c) {
    const out = gain(c, 0)
    return { out, tick: every(() => rand(4, 12), (t) => voices.bird(c, out, t), () => rand(1.5, 6)) }
  },
  chimes(c, wet) {
    const out = gain(c, 0)
    sends.set(out, wet)
    let deg = 4
    const note = (t: number) => {
      deg = clamp(deg + pick([-3, -2, -1, 1, 2, 3]), 0, PENTA.length - 1) // drifts up and down like chimes in a breeze
      voices.chime(c, out, t, PENTA[deg])
    }
    return { out, tick: every(() => rand(6, 15), note, () => rand(2, 7)) }
  },
}
const IDS = Object.keys(BEDS) as LayerId[]

// ---- where the visitor stands -> how present each bed is -> the graph ----------------------------------------------
export interface Zone {
  orbit: boolean // title screen: the planet seen from far away
  page: boolean // a building's page is open
  plaza: number // surface distance to the fountain (units)
  shore: number // |distance to the shoreline| (units)
}

/** Bed presence (0..1) for a zone. */
export function levels(z: Zone): Record<LayerId, number> {
  const near = z.orbit ? 0 : 1
  return {
    wind: z.orbit ? 0.7 : 0.4 + 0.6 * smoothstep(3, 40, z.plaza), // a little stronger the further from the plaza
    waves: near * smoothstep(14, 2, z.shore),
    fountain: near * smoothstep(14, 1.5, z.plaza),
    birds: near * (z.page ? 0 : 1),
    chimes: 1,
  }
}

/** A static soft-knee limiter curve: exactly linear up to 0.6, then rounding off towards 0.9. */
const SOFT = Float32Array.from({ length: 2048 }, (_, i) => {
  const x = i / 1023.5 - 1
  const a = Math.abs(x)
  return Math.sign(x) * (a < 0.6 ? a : 0.6 + 0.4 * Math.tanh((a - 0.6) / 0.4))
})

export interface Graph {
  out: GainNode // master gain (0 until faded in)
  amb: GainNode // ambience bus gain (the engine swells it in on enable)
  sfx: GainNode // bus for one-shots, with a reverb send
  update(now: number, z: Zone): void
}

/** Master chain, buses, reverb and the lazily built beds. `update` is what the 100 ms control tick calls. */
export function buildGraph(c: Ctx, dest: AudioNode = c.destination): Graph {
  const [master, sfx, amb, duck, wet] = [gain(c, 0), gain(c), gain(c), gain(c), gain(c)]
  // Safety limiter. A static curve on purpose: a DynamicsCompressorNode blunts the first ~40 ms of any sound that follows
  // silence (footsteps, clicks) even far below its threshold.
  const lim = set(c.createWaveShaper(), { curve: SOFT })
  const hp = filt(c, 'highpass', 40, 0.6) // nothing below 40 Hz: small speakers only flap on it
  link(sfx, hp, lim, master, dest)
  link(amb, duck, hp)
  link(wet, reverb(c), gain(c, 0.7), duck)
  sends.set(sfx, wet)
  const beds: Partial<Record<LayerId, { L: Layer; q: number; on: boolean; off: number }>> = {}
  let duckQ = 1
  return {
    out: master,
    amb,
    sfx,
    update(now, z) {
      const lv = levels(z)
      const dq = z.page ? 0.5 : 1 // reading a page: ambience halves (attack 0.2 s, slower release)
      if (dq !== duckQ) {
        duckQ = dq
        duck.gain.setTargetAtTime(dq, now, dq < 1 ? 0.2 : 0.7)
      }
      for (const id of IDS) {
        const q = Math.round(lv[id] * 50) / 50 // steps of 2%: no need to re-automate on every tiny move
        let s = beds[id]
        if (!s && !q) continue
        s ??= beds[id] = { L: BEDS[id](c, wet), q: 0, on: false, off: 0 }
        if (q !== s.q) {
          s.q = q
          if (q && !s.on) {
            s.L.out.connect(amb)
            s.on = true
          }
          s.L.out.gain.setTargetAtTime(q, now, TAU)
          if (!q) s.off = now + 5 * TAU
        }
        if (!q && s.on && now > s.off) {
          s.L.out.disconnect() // faded out for good: an unconnected bed costs no CPU
          s.on = false
        }
        if (s.on && q >= 0.1) s.L.tick?.(now, q)
      }
    },
  }
}

// ---- engine ------------------------------------------------------------------------------------------------------
const plazaN = mapToN(PLAZA.x, PLAZA.z)

/** Read the visitor's whereabouts from the game (cheap enough for a 10 Hz poll). */
export function zone(): Zone {
  const st = useStore.getState()
  return {
    page: !!st.page,
    orbit: st.phase === 'loading' || st.phase === 'intro', // wind and chimes only
    plaza: surfaceDistance(player.n, plazaN),
    shore: Math.abs(shoreDistance(player.n)),
  }
}

type Voice = (c: Ctx, d: AudioNode, t: number) => unknown
const UI: Record<UiName, Voice> = {
  tick: voices.tick,
  open: (c, d, t) => voices.paper(c, d, t, true),
  close: (c, d, t) => voices.paper(c, d, t, false),
  discover: voices.discover,
  door: voices.door,
  whoosh: (c, d, t) => voices.whoosh(c, d, t, 'open'),
  pop: voices.pop,
}

/** `enabled` is the visitor's setting. A returning visitor is enabled before their first gesture; audio.info().ctx says whether it is actually running. */
const state = { enabled: false }
const AC: typeof AudioContext | undefined =
  typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const
let ctx: AudioContext | null = null
let graph: Graph | null = null
let timer: ReturnType<typeof setInterval> | undefined
let stopper: ReturnType<typeof setTimeout> | undefined
let armed = false
let inited = false
let warned = false
let wakeUntil = 0 // performance.now() until which a context that is still resuming accepts (and queues) sounds

const wantsSound = () => state.enabled && !document.hidden

function fade(p: AudioParam, to: number, now: number, d = FADE) {
  p.cancelScheduledValues(now)
  p.setValueAtTime(p.value, now)
  p.linearRampToValueAtTime(to, now + d)
}

/** Listen for the first real gesture (the only thing that lets a browser start audio); onState() removes them once running. */
function arm() {
  if (armed || !AC) return
  armed = true
  for (const e of GESTURES) window.addEventListener(e, sync, { capture: true, passive: true })
}
function disarm() {
  if (!armed) return
  armed = false
  for (const e of GESTURES) window.removeEventListener(e, sync, true)
}

/** Create the context lazily, and only once the browser will let it start (otherwise Chrome logs an autoplay warning). */
function open() {
  if (ctx && (ctx.state as string) !== 'closed') return ctx
  if (!AC || navigator.userActivation?.hasBeenActive === false) return null
  try {
    ctx = new AC()
    graph = buildGraph(ctx)
    graph.amb.gain.value = 0
    ctx.onstatechange = onState
  } catch {
    ctx?.close().catch(() => {})
    ctx = graph = null
  }
  return ctx
}

/** Reconcile the context with what is wanted: sound on and tab visible -> running; otherwise fade, suspend, no timers. */
function sync() {
  clearTimeout(stopper)
  stopper = undefined
  if (wantsSound()) {
    const c = open()
    if (!c || !graph) return arm()
    if (c.state !== 'running') {
      wakeUntil = performance.now() + 500
      c.resume().catch(() => {})
    }
    fade(graph.out.gain, MASTER, c.currentTime, 0.03) // quick, so the toggle's own tick is heard at full level...
    fade(graph.amb.gain, 1, c.currentTime) // ...while the ambience swells in over 0.4 s
    timer ??= setInterval(control, 100)
    control()
    if (c.state !== 'running') arm() // still waiting on a gesture (autoplay policy, iOS)
  } else {
    if (!state.enabled) disarm()
    clearInterval(timer)
    timer = undefined
    const c = ctx
    const g = graph
    if (!c || !g) return
    fade(g.out.gain, 0, c.currentTime)
    stopper = setTimeout(() => {
      stopper = undefined
      c.suspend().catch(() => {})
      g.amb.gain.value = 0 // the next enable swells the ambience in again
    }, FADE * 1000 + 80)
  }
}

function onState() {
  if (!ctx) return
  const s: string = ctx.state // Safari adds 'interrupted' (phone call, Siri, backgrounding)
  if (s === 'running') {
    disarm()
    if (wantsSound()) control()
    else sync() // the OS resumed us while we wanted silence
  } else if (wantsSound()) arm() // interrupted: the next gesture resumes
}

function control() {
  if (!ctx || !graph || ctx.state !== 'running') return
  try {
    graph.update(ctx.currentTime, zone())
  } catch (e) {
    if (import.meta.env.DEV && !warned) {
      warned = true
      console.warn('[audio]', e)
    }
  }
}

/** Play a voice on the one-shot bus. A context that is still resuming inside the gesture queues it; one that has stopped drops it. */
function shot<A extends unknown[]>(fn: (c: Ctx, d: AudioNode, t: number, ...a: A) => unknown, ...a: A) {
  const c = ctx
  const running = c?.state === 'running'
  if (!c || !graph || !state.enabled || busy(c) >= MAX_VOICES || (!running && performance.now() > wakeUntil)) return
  try {
    fn(c, graph.sfx, c.currentTime + (running ? 0.005 : 0.04), ...a) // 40 ms while waking: after the master's quick 30 ms ramp
  } catch {
    /* a failed voice must never break the game */
  }
}

function setEnabled(on: boolean) {
  state.enabled = on
  sync()
}

function init() {
  if (inited || typeof window === 'undefined') return
  inited = true
  let lastStep = 0
  let lastPrompt = 0
  bus.on('step', (surface: Surface, speed: number) => {
    const now = performance.now()
    if (now - lastStep < 90) return // rate limit
    lastStep = now
    shot(voices.step, surface, speed)
  })
  bus.on('land', () => shot(voices.land))
  bus.on('page', (kind: string) => {
    if (kind === 'open') {
      shot(voices.door)
      shot(voices.arrive, true)
    }
    shot(voices.paper, kind === 'open')
    control() // duck (or un-duck) right away instead of on the next tick
  })
  bus.on('use', () => shot(voices.pop))
  bus.on('prompt', () => {
    const now = performance.now()
    if (now - lastPrompt < 400) return
    lastPrompt = now
    shot(voices.prompt)
  })
  bus.on('start', () => shot(voices.start))
  useStore.subscribe((s, p) => {
    if (s.secrets.length > p.secrets.length) shot(voices.discover)
  })
  document.addEventListener('visibilitychange', sync)
  if (useStore.getState().audioOn) {
    state.enabled = true // a returning visitor: start on their first gesture
    sync()
  }
}

export const audio = {
  state,
  init,
  setEnabled,
  ui: (name: UiName) => shot(UI[name]),
  /** Snapshot for tests and debugging. */
  info: () => ({ enabled: state.enabled, ctx: ctx ? (ctx.state as string) : null, timer: timer !== undefined, armed, voices: ctx ? busy(ctx) : 0 }),
  get ctx() {
    return ctx
  },
  get graph() {
    return graph
  },
}
