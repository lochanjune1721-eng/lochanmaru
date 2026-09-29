// Canvas-drawn textures for in-world signage and screens, using the same self-hosted fonts as the UI.
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'

export const FONT = {
  display: "'Fraunces', 'Times New Roman', serif",
  sans: "'DM Sans', system-ui, sans-serif",
  mono: "'DM Mono', ui-monospace, monospace",
  hand: "'Caveat', 'Comic Sans MS', cursive",
}

let fontsPromise: Promise<void> | null = null
/** Resolves once the display + UI fonts are ready (so canvas text never falls back). */
export function loadFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise
  const fonts = (document as any).fonts as FontFaceSet | undefined
  if (!fonts?.load) return (fontsPromise = Promise.resolve())
  fontsPromise = Promise.all([
    fonts.load("900 64px 'Fraunces'"),
    fonts.load("600 32px 'Fraunces'"),
    fonts.load("500 32px 'DM Sans'"),
    fonts.load("700 32px 'DM Sans'"),
    fonts.load("500 24px 'DM Mono'"),
  ])
    .then(() => undefined)
    .catch(() => undefined)
  return fontsPromise
}

let handPromise: Promise<void> | null = null
export function loadHandFont() {
  if (handPromise) return handPromise
  const fonts = (document as any).fonts as FontFaceSet | undefined
  if (!document.getElementById('lw-hand')) {
    const st = document.createElement('style')
    st.id = 'lw-hand'
    st.textContent = "@font-face{font-family:'Caveat';src:url('/fonts/caveat.woff2') format('woff2');font-weight:400 700;font-display:swap}"
    document.head.appendChild(st)
  }
  handPromise = fonts?.load ? fonts.load("600 40px 'Caveat'").then(() => undefined).catch(() => undefined) : Promise.resolve()
  return handPromise
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return { c, g: c.getContext('2d')! }
}

export function toTexture(c: HTMLCanvasElement, aniso = 8) {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = aniso
  t.minFilter = LinearMipmapLinearFilter
  t.generateMipmaps = true
  return t
}

export function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  g.beginPath()
  g.moveTo(x + rr, y)
  g.arcTo(x + w, y, x + w, y + h, rr)
  g.arcTo(x + w, y + h, x, y + h, rr)
  g.arcTo(x, y + h, x, y, rr)
  g.arcTo(x, y, x + w, y, rr)
  g.closePath()
}

/** Fit text on one line by shrinking the font size. Returns the size used. */
export function fitText(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: string | number, family: string, min = 10) {
  let s = size
  do {
    g.font = `${weight} ${s}px ${family}`
    if (g.measureText(text).width <= maxW) break
    s -= 2
  } while (s > min)
  return s
}

/** Word-wrap into lines that fit maxW. */
export function wrapLines(g: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const t = line ? `${line} ${w}` : w
    if (g.measureText(t).width > maxW && line) {
      lines.push(line)
      line = w
    } else line = t
  }
  if (line) lines.push(line)
  return lines
}

export interface SignOpts {
  text: string
  w?: number
  h?: number
  color?: string
  bg?: string | null
  border?: string | null
  family?: string
  weight?: string | number
  radius?: number
  sub?: string
  subColor?: string
  shadow?: string | null
  letterSpacing?: number
}

/** A painted board: rounded rectangle, border, big centred lettering, optional sub-line. */
export function signCanvas(o: SignOpts) {
  const w = o.w ?? 1024
  const h = o.h ?? 256
  const { c, g } = makeCanvas(w, h)
  const pad = h * 0.14
  if (o.bg) {
    g.fillStyle = o.bg
    roundRect(g, 0, 0, w, h, o.radius ?? h * 0.18)
    g.fill()
  }
  if (o.border) {
    g.lineWidth = h * 0.045
    g.strokeStyle = o.border
    roundRect(g, h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1, (o.radius ?? h * 0.18) * 0.75)
    g.stroke()
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const fam = o.family ?? FONT.display
  const wgt = o.weight ?? 900
  const hasSub = !!o.sub
  const mainH = hasSub ? h * 0.6 : h * 0.72
  const size = fitText(g, o.text, w - pad * 2, mainH, wgt, fam)
  ;(g as any).letterSpacing = `${o.letterSpacing ?? 0}px`
  g.font = `${wgt} ${size}px ${fam}`
  const cy = hasSub ? h * 0.42 : h * 0.52
  if (o.shadow) {
    g.fillStyle = o.shadow
    g.fillText(o.text, w / 2 + size * 0.03, cy + size * 0.05)
  }
  g.fillStyle = o.color ?? '#2b2438'
  g.fillText(o.text, w / 2, cy)
  if (hasSub) {
    ;(g as any).letterSpacing = '3px'
    const ss = fitText(g, o.sub!, w - pad * 2, h * 0.16, 500, FONT.mono)
    g.font = `500 ${ss}px ${FONT.mono}`
    g.fillStyle = o.subColor ?? o.color ?? '#2b2438'
    g.fillText(o.sub!, w / 2, h * 0.82)
  }
  return c
}

export function signTexture(o: SignOpts) {
  return toTexture(signCanvas(o))
}
