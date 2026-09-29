// Canvas paintings for the Signal Room: LED atlas, receipt cards, ticker tape, star-chart floor.
import { CanvasTexture, RepeatWrapping } from 'three'
import { rng } from '../engine/math'
import { FONT, fitText, makeCanvas, toTexture } from '../gfx/text'
import { PROOF, type Proof } from '../content/results'
import { NEON, W, D } from './results.geo'

export const CELL_W = 512
export const CELL_H = 256

export function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

// ---- LED atlas ------------------------------------------------------------------------------------------------------
export interface LedFace {
  cell: number
  /** display size in world units (drives the aspect compensation) */
  w: number
  h: number
  color: string
  color2: string
  label: string
}

/** tabular figure layout: digits share one cell width so a counting number never jitters */
function drawFigure(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, maxW: number, maxH: number, color: string) {
  const fam = FONT.sans
  const wgt = 800
  let size = maxH
  let ws: number[] = []
  let total = 0
  const ls = 2
  for (let pass = 0; pass < 8; pass++) {
    g.font = `${wgt} ${size}px ${fam}`
    let dw = 0
    for (let d = 0; d < 10; d++) dw = Math.max(dw, g.measureText(String(d)).width)
    ws = []
    total = 0
    for (const ch of text) {
      const w = ch >= '0' && ch <= '9' ? dw : g.measureText(ch).width
      ws.push(w)
      total += w + ls
    }
    total -= ls
    if (total <= maxW) break
    size *= Math.max(0.6, maxW / total) * 0.98
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const draw = (blur: number, fill: string, alpha: number) => {
    g.save()
    g.globalAlpha = alpha
    g.shadowColor = color
    g.shadowBlur = blur
    g.fillStyle = fill
    let x = cx - total / 2
    let i = 0
    for (const ch of text) {
      g.fillText(ch, x + ws[i] / 2, cy)
      x += ws[i] + ls
      i++
    }
    g.restore()
  }
  draw(size * 0.28, color, 0.9)
  draw(0, color, 1)
  draw(0, '#ffffff', 0.5)
}

export class LedAtlas {
  readonly canvas: HTMLCanvasElement
  readonly g: CanvasRenderingContext2D
  readonly tex: CanvasTexture
  constructor() {
    const { c, g } = makeCanvas(1024, 1024)
    this.canvas = c
    this.g = g
    g.fillStyle = '#05031a'
    g.fillRect(0, 0, 1024, 1024)
    this.tex = toTexture(c, 4) as CanvasTexture
  }

  paint(f: LedFace, text: string) {
    const g = this.g
    const ox = (f.cell % 2) * CELL_W
    const oy = (f.cell >> 1) * CELL_H
    g.save()
    g.beginPath()
    g.rect(ox, oy, CELL_W, CELL_H)
    g.clip()
    g.translate(ox, oy)
    // panel + colour wash
    g.fillStyle = '#060320'
    g.fillRect(0, 0, CELL_W, CELL_H)
    const wash = g.createRadialGradient(CELL_W / 2, CELL_H * 0.44, 6, CELL_W / 2, CELL_H * 0.44, CELL_W * 0.6)
    wash.addColorStop(0, rgba(f.color, 0.3))
    wash.addColorStop(1, rgba(f.color, 0.03))
    g.fillStyle = wash
    g.fillRect(0, 0, CELL_W, CELL_H)

    // display space: the aspect of the real screen is preserved whatever the cell shape
    const LW = Math.round(f.w * 100)
    const LH = Math.round(f.h * 100)
    g.save()
    g.scale(CELL_W / LW, CELL_H / LH)
    // frame + corner brackets
    g.strokeStyle = rgba(f.color, 0.95)
    g.lineWidth = 3
    g.strokeRect(7, 7, LW - 14, LH - 14)
    g.strokeStyle = rgba(f.color2, 0.9)
    g.lineWidth = 3
    const cb = Math.min(LW, LH) * 0.16
    for (const [x, y, sx, sy] of [
      [13, 13, 1, 1],
      [LW - 13, 13, -1, 1],
      [13, LH - 13, 1, -1],
      [LW - 13, LH - 13, -1, -1],
    ]) {
      g.beginPath()
      g.moveTo(x, y + sy * cb)
      g.lineTo(x, y)
      g.lineTo(x + sx * cb, y)
      g.stroke()
    }
    // signal bars, top right
    for (let i = 0; i < 4; i++) {
      g.fillStyle = rgba(f.color2, 0.55 + i * 0.12)
      const bh = 5 + i * 4
      g.fillRect(LW - 44 + i * 8, 30 - bh + 8, 5, bh)
    }
    // figure
    drawFigure(g, text, LW / 2, LH * 0.43, LW * 0.84, LH * 0.5, f.color)
    // label
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    ;(g as any).letterSpacing = '4px'
    const ls = fitText(g, f.label, LW * 0.8, LH * 0.13, 500, FONT.mono, 9)
    g.font = `500 ${ls}px ${FONT.mono}`
    g.fillStyle = '#efeaff'
    g.globalAlpha = 0.95
    g.fillText(f.label, LW / 2 + 2, LH * 0.8)
    g.globalAlpha = 1
    ;(g as any).letterSpacing = '0px'
    g.restore()

    // LED pixel grid + scanline sheen
    g.strokeStyle = 'rgba(3,2,16,0.34)'
    g.lineWidth = 1
    g.beginPath()
    for (let x = 0; x <= CELL_W; x += 4) {
      g.moveTo(x + 0.5, 0)
      g.lineTo(x + 0.5, CELL_H)
    }
    for (let y = 0; y <= CELL_H; y += 4) {
      g.moveTo(0, y + 0.5)
      g.lineTo(CELL_W, y + 0.5)
    }
    g.stroke()
    const sheen = g.createLinearGradient(0, 0, CELL_W, CELL_H)
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)')
    sheen.addColorStop(0.35, 'rgba(255,255,255,0.0)')
    g.fillStyle = sheen
    g.fillRect(0, 0, CELL_W, CELL_H)
    g.restore()
    this.tex.needsUpdate = true
  }

  /** the turnstile's amber tally window */
  paintCounter(cell: number, n: number) {
    const g = this.g
    const ox = (cell % 2) * CELL_W
    const oy = (cell >> 1) * CELL_H
    g.save()
    g.beginPath()
    g.rect(ox, oy, CELL_W, CELL_H)
    g.clip()
    g.translate(ox, oy)
    g.fillStyle = '#0b0718'
    g.fillRect(0, 0, CELL_W, CELL_H)
    g.strokeStyle = rgba(NEON.gold, 0.85)
    g.lineWidth = 6
    g.strokeRect(8, 8, CELL_W - 16, CELL_H - 16)
    const s = String(n % 100000).padStart(5, '0')
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.font = `500 150px ${FONT.mono}`
    g.shadowColor = NEON.gold
    g.shadowBlur = 24
    g.fillStyle = NEON.gold
    g.fillText(s, CELL_W / 2, CELL_H * 0.54)
    g.shadowBlur = 0
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fillText(s, CELL_W / 2, CELL_H * 0.54)
    g.strokeStyle = 'rgba(3,2,16,0.35)'
    g.lineWidth = 1
    g.beginPath()
    for (let x = 0; x <= CELL_W; x += 4) {
      g.moveTo(x + 0.5, 0)
      g.lineTo(x + 0.5, CELL_H)
    }
    g.stroke()
    g.restore()
    this.tex.needsUpdate = true
  }
}

// ---- receipts -----------------------------------------------------------------------------------------------------------
const CW = 340
const CH = 255
const ACCENTS = [NEON.magenta, NEON.cyan, NEON.coral, NEON.violet, NEON.mint, NEON.gold]
const ACCENT_DARK = ['#a3186c', '#0f7f96', '#b2402e', '#6a3fb5', '#1c8f6c', '#9a6c00']

function paintReceipt(g: CanvasRenderingContext2D, i: number, p: Proof) {
  const ox = (i % 3) * CW
  const oy = Math.floor(i / 3) * CH
  const r = rng(700 + i * 13)
  const accent = ACCENTS[i % ACCENTS.length]
  const dark = ACCENT_DARK[i % ACCENT_DARK.length]
  g.save()
  g.translate(ox, oy)
  // paper with a torn bottom edge
  g.beginPath()
  g.moveTo(5, 5)
  g.lineTo(CW - 5, 5)
  g.lineTo(CW - 5, CH - 24)
  let up = false
  for (let x = CW - 5; x >= 5; x -= 9 + r() * 5) {
    g.lineTo(x, CH - 22 + (up ? -9 - r() * 4 : 3 + r() * 4))
    up = !up
  }
  g.lineTo(5, CH - 22)
  g.closePath()
  const paper = g.createLinearGradient(0, 0, 0, CH)
  paper.addColorStop(0, '#fffaf0')
  paper.addColorStop(1, '#f1e6cb')
  g.fillStyle = paper
  g.fill()
  g.save()
  g.clip()
  // accent header
  g.fillStyle = accent
  g.fillRect(0, 0, CW, 38)
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  ;(g as any).letterSpacing = '6px'
  g.font = `500 15px ${FONT.mono}`
  g.fillText('RECEIPT', CW / 2 + 3, 20)
  ;(g as any).letterSpacing = '0px'
  // value
  const vs = fitText(g, p.value, CW - 56, 112, 900, FONT.display, 30)
  g.font = `900 ${vs}px ${FONT.display}`
  g.fillStyle = '#2a2350'
  g.fillText(p.value, CW / 2, 40 + (CH - 60 - 40) * 0.34)
  // perforation
  g.strokeStyle = '#b9a986'
  g.lineWidth = 2
  g.setLineDash([6, 6])
  g.beginPath()
  g.moveTo(18, 138)
  g.lineTo(CW - 18, 138)
  g.stroke()
  g.setLineDash([])
  // label (wrapped)
  g.font = `500 19px ${FONT.mono}`
  const words = p.label.split(/\s+/)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w
    if (g.measureText(t).width > CW - 44 && cur) {
      lines.push(cur)
      cur = w
    } else cur = t
  }
  if (cur) lines.push(cur)
  g.fillStyle = '#4b4268'
  lines.slice(0, 2).forEach((ln, k) => g.fillText(ln, CW / 2, 160 + k * 23))
  // who
  const ws = fitText(g, p.who, CW - 40, 25, 800, FONT.sans, 12)
  g.font = `800 ${ws}px ${FONT.sans}`
  g.fillStyle = dark
  g.fillText(p.who, CW / 2, CH - 44)
  g.restore()
  g.restore()
}

export function makeReceiptAtlas(): CanvasTexture {
  const { c, g } = makeCanvas(1024, 1024)
  PROOF.forEach((p, i) => paintReceipt(g, i, p))
  return toTexture(c, 8) as CanvasTexture
}

export const CARD_ACCENT = ACCENTS

// ---- ticker tape -------------------------------------------------------------------------------------------------------------
export function makeTapeTexture(): CanvasTexture {
  const w = 1024
  const h = 128
  const { c, g } = makeCanvas(w, h)
  g.fillStyle = '#eee4ca'
  g.fillRect(0, 0, w, h)
  // edge shading + sprocket holes
  const edge = g.createLinearGradient(0, 0, 0, h)
  edge.addColorStop(0, 'rgba(120,100,70,0.22)')
  edge.addColorStop(0.16, 'rgba(120,100,70,0)')
  edge.addColorStop(0.84, 'rgba(120,100,70,0)')
  edge.addColorStop(1, 'rgba(120,100,70,0.22)')
  g.fillStyle = edge
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(44,38,112,0.55)'
  for (let x = 8; x < w; x += 32) {
    for (const y of [11, h - 11]) {
      g.beginPath()
      g.arc(x, y, 3.6, 0, Math.PI * 2)
      g.fill()
    }
  }
  // ticks
  g.strokeStyle = 'rgba(58,48,110,0.7)'
  g.lineWidth = 2
  for (let x = 0; x < w; x += 16) {
    const long = x % 128 === 0
    const mid = x % 64 === 0
    g.beginPath()
    g.moveTo(x + 1, h * 0.5 + 8)
    g.lineTo(x + 1, h * 0.5 + (long ? 40 : mid ? 28 : 18))
    g.stroke()
  }
  // figures from the receipts, printed faintly along the tape
  g.textBaseline = 'middle'
  g.textAlign = 'left'
  g.font = `500 22px ${FONT.mono}`
  g.fillStyle = 'rgba(58,48,110,0.62)'
  PROOF.slice(0, 8).forEach((p, i) => g.fillText(p.value, i * 128 + 10, h * 0.5 - 12))
  // dotted centre line
  g.fillStyle = 'rgba(58,48,110,0.35)'
  for (let x = 4; x < w; x += 8) g.fillRect(x, h * 0.5 + 2, 3, 2)
  const t = toTexture(c, 8) as CanvasTexture
  t.wrapS = RepeatWrapping
  return t
}

// ---- star-chart floor --------------------------------------------------------------------------------------------------------------
export function makeFloorTexture(windows: number[]): CanvasTexture {
  const w = 1024
  const h = 768
  const { c, g } = makeCanvas(w, h)
  const sx = w / W
  const sz = h / D
  g.translate(w / 2, h / 2)
  g.scale(sx, sz)
  const r = rng(99)
  // soft centre glow
  const glow = g.createRadialGradient(0, 0, 0.5, 0, 0, 10)
  glow.addColorStop(0, 'rgba(126,96,255,0.34)')
  glow.addColorStop(0.5, 'rgba(90,70,220,0.13)')
  glow.addColorStop(1, 'rgba(60,50,200,0)')
  g.fillStyle = glow
  g.fillRect(-W / 2, -D / 2, W, D)
  // moonlight falling through the windows
  for (const wx of windows) {
    for (let k = 0; k < 7; k++) {
      const inset = k * 0.28
      const top = 5.2 / 2 - inset
      g.beginPath()
      g.moveTo(wx - top, -D / 2)
      g.lineTo(wx + top, -D / 2)
      g.lineTo(wx + top + 5.4 - inset * 1.3, -D / 2 + 9.5)
      g.lineTo(wx - top + 5.4 + inset * 1.3, -D / 2 + 9.5)
      g.closePath()
      const lg = g.createLinearGradient(0, -D / 2, 0, -D / 2 + 9.5)
      lg.addColorStop(0, 'rgba(150,175,255,0.055)')
      lg.addColorStop(1, 'rgba(150,175,255,0)')
      g.fillStyle = lg
      g.fill()
    }
  }
  // astrolabe rings
  const cx = 0
  const cz = -0.6
  g.lineCap = 'round'
  const ring = (rad: number, lw: number, col: string, dash?: number[]) => {
    g.beginPath()
    g.setLineDash(dash ?? [])
    g.strokeStyle = col
    g.lineWidth = lw
    g.arc(cx, cz, rad, 0, Math.PI * 2)
    g.stroke()
    g.setLineDash([])
  }
  ring(2.6, 0.06, 'rgba(160,150,255,0.46)')
  ring(2.9, 0.03, 'rgba(160,150,255,0.26)')
  ring(4.6, 0.05, 'rgba(120,225,255,0.34)', [0.5, 0.35])
  ring(6.8, 0.06, 'rgba(160,150,255,0.42)')
  ring(7.05, 0.03, 'rgba(160,150,255,0.24)')
  ring(9.4, 0.05, 'rgba(255,150,220,0.26)', [0.12, 0.3])
  ring(12.4, 0.06, 'rgba(160,150,255,0.34)')
  ring(15.8, 0.05, 'rgba(120,225,255,0.22)', [0.9, 0.5])
  // ticks around two rings
  g.strokeStyle = 'rgba(190,180,255,0.4)'
  for (const [rad, len, step] of [
    [6.8, 0.38, 3],
    [12.4, 0.3, 5],
  ]) {
    for (let a = 0; a < 360; a += step) {
      const t = (a * Math.PI) / 180
      const l = a % 30 === 0 ? len * 1.9 : len
      g.lineWidth = a % 30 === 0 ? 0.06 : 0.03
      g.beginPath()
      g.moveTo(cx + Math.cos(t) * rad, cz + Math.sin(t) * rad)
      g.lineTo(cx + Math.cos(t) * (rad + l), cz + Math.sin(t) * (rad + l))
      g.stroke()
    }
  }
  // spokes
  g.strokeStyle = 'rgba(160,150,255,0.16)'
  g.lineWidth = 0.03
  for (let a = 0; a < 360; a += 15) {
    const t = (a * Math.PI) / 180
    g.beginPath()
    g.moveTo(cx + Math.cos(t) * 2.9, cz + Math.sin(t) * 2.9)
    g.lineTo(cx + Math.cos(t) * 6.8, cz + Math.sin(t) * 6.8)
    g.stroke()
  }
  // constellations
  const stars: [number, number][] = []
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2
    const rad = 3.4 + r() * 11
    stars.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad * 0.9])
  }
  g.strokeStyle = 'rgba(190,210,255,0.26)'
  g.lineWidth = 0.035
  for (let k = 0; k < 6; k++) {
    g.beginPath()
    const s0 = Math.floor(r() * stars.length)
    g.moveTo(stars[s0][0], stars[s0][1])
    let last = s0
    for (let j = 0; j < 4; j++) {
      let best = -1
      let bd = 1e9
      for (let q = 0; q < stars.length; q++) {
        if (q === last) continue
        const d = Math.hypot(stars[q][0] - stars[last][0], stars[q][1] - stars[last][1])
        if (d > 1.2 && d < bd && r() > 0.3) {
          bd = d
          best = q
        }
      }
      if (best < 0) break
      g.lineTo(stars[best][0], stars[best][1])
      last = best
    }
    g.stroke()
  }
  for (const [x, y] of stars) {
    const rr = 0.07 + r() * 0.08
    g.fillStyle = 'rgba(215,225,255,0.7)'
    g.beginPath()
    g.arc(x, y, rr, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(160,180,255,0.16)'
    g.beginPath()
    g.arc(x, y, rr * 3, 0, Math.PI * 2)
    g.fill()
  }
  return toTexture(c, 8) as CanvasTexture
}
