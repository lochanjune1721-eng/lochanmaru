// EXPERIENCE interior — everything that is painted on a canvas: sign/plaque atlas, chalk boards, posters,
// the clock face, window glass and the animated screens. Nothing here invents facts: all wording that
// describes the work comes straight from src/content/experience.ts.
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Chapter } from '../content/experience'
import { P } from '../gfx/palette'
import { FONT, fitText, loadHandFont, makeCanvas, roundRect, toTexture } from '../gfx/text'
import { darken, lighten, Rect } from './experience.util'

export type Draw = (g: CanvasRenderingContext2D, t: number, w: number, h: number) => void

const spaced = (g: CanvasRenderingContext2D, px: number) => {
  ;(g as unknown as { letterSpacing: string }).letterSpacing = `${px}px`
}

// ---- atlas A: hanging signs + floor plaques + small labels (opaque, lit) ----------------------------------
export const A_SIZE = 1024
const SIGN_W = 512
const SIGN_H = 122
const PLQ_W = 256
const PLQ_H = 128
const PLQ_Y0 = 610
export const signRect = (i: number): Rect => ({ x: (i % 2) * SIGN_W, y: Math.floor(i / 2) * SIGN_H, w: SIGN_W, h: SIGN_H })
/** 0..8 chapter plaques, then extras */
export const plaqueRect = (i: number): Rect => ({ x: (i % 4) * PLQ_W, y: PLQ_Y0 + Math.floor(i / 4) * PLQ_H, w: PLQ_W, h: PLQ_H })
export const PLQ_EXIT = 9
export const PLQ_PULL = 10
export const PLQ_MAIN = 11

function paintSign(g: CanvasRenderingContext2D, r: Rect, ch: Chapter) {
  const { x, y, w, h } = r
  g.save()
  g.translate(x, y)
  g.fillStyle = darken(ch.color, 0.3)
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#fff3d8'
  roundRect(g, 6, 6, w - 12, h - 12, 12)
  g.fill()
  g.strokeStyle = ch.color
  g.lineWidth = 3.5
  roundRect(g, 12, 12, w - 24, h - 24, 8)
  g.stroke()
  // round badge with the chapter number
  const R = h * 0.34
  const cx = 24 + R
  const cy = h / 2
  g.fillStyle = ch.color
  g.beginPath()
  g.arc(cx, cy, R, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = 4
  g.strokeStyle = '#fff3d8'
  g.beginPath()
  g.arc(cx, cy, R - 5, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#fff8ea'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `700 ${Math.round(R * 0.92)}px ${FONT.mono}`
  g.fillText(ch.mark, cx, cy + 2)
  // name
  const x0 = cx + R + 16
  const maxW = w - 24 - x0
  const name = ch.name
  g.fillStyle = P.ink
  g.textAlign = 'left'
  let size = fitText(g, name, maxW, 50, 900, FONT.display, 12)
  const period = ch.period || 'ask me'
  if (size >= 34) {
    g.font = `900 ${size}px ${FONT.display}`
    g.fillText(name, x0, h * 0.4)
  } else {
    // two lines: split before a parenthesis, else at the space nearest the middle
    let cut = name.indexOf(' (')
    if (cut < 0) {
      let best = -1
      let bd = 1e9
      for (let i = 0; i < name.length; i++) if (name[i] === ' ' && Math.abs(i - name.length / 2) < bd) ((bd = Math.abs(i - name.length / 2)), (best = i))
      cut = best
    }
    if (cut > 0) {
      const l1 = name.slice(0, cut)
      const l2 = name.slice(cut + 1)
      size = Math.min(fitText(g, l1, maxW, 38, 900, FONT.display, 12), fitText(g, l2, maxW, 38, 900, FONT.display, 12))
      g.font = `900 ${size}px ${FONT.display}`
      g.fillText(l1, x0, h * 0.3)
      g.fillText(l2, x0, h * 0.55)
    } else {
      g.font = `900 ${size}px ${FONT.display}`
      g.fillText(name, x0, h * 0.4)
    }
  }
  // period (mono)
  spaced(g, 2)
  const ps = fitText(g, period.toUpperCase(), maxW, 24, 500, FONT.mono, 10)
  g.font = `500 ${ps}px ${FONT.mono}`
  g.fillStyle = darken(ch.color, 0.35)
  g.fillText(period.toUpperCase(), x0, h * 0.8)
  spaced(g, 0)
  g.restore()
}

function paintPlaque(g: CanvasRenderingContext2D, r: Rect, ch: Chapter) {
  const { x, y, w, h } = r
  g.save()
  g.translate(x, y)
  g.fillStyle = darken(ch.color, 0.25)
  g.fillRect(0, 0, w, h)
  g.fillStyle = '#fff3d8'
  roundRect(g, 6, 6, w - 12, h - 12, 14)
  g.fill()
  g.strokeStyle = ch.color
  g.lineWidth = 4
  roundRect(g, 12, 12, w - 24, h - 24, 10)
  g.stroke()
  g.fillStyle = P.ink
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const txt = ch.period
  if (!txt) {
    g.font = `900 78px ${FONT.display}`
    g.fillText('?', w / 2, h * 0.44)
    spaced(g, 4)
    g.font = `500 20px ${FONT.mono}`
    g.fillStyle = darken(ch.color, 0.3)
    g.fillText('ASK ME', w / 2, h * 0.8)
  } else if (txt.includes(' ')) {
    const [a, b] = [txt.slice(0, txt.indexOf(' ')), txt.slice(txt.indexOf(' ') + 1)]
    const s = Math.min(fitText(g, a, w - 60, 50, 900, FONT.display, 14), fitText(g, b, w - 60, 50, 900, FONT.display, 14))
    g.font = `900 ${s}px ${FONT.display}`
    g.fillText(a, w / 2, h * 0.36)
    g.fillStyle = darken(ch.color, 0.15)
    g.fillText(b, w / 2, h * 0.68)
  } else {
    const s = fitText(g, txt, w - 64, 72, 900, FONT.display, 14)
    g.font = `900 ${s}px ${FONT.display}`
    g.fillText(txt, w / 2, h * 0.52)
  }
  // number dot in the corner
  g.fillStyle = ch.color
  g.beginPath()
  g.arc(30, 30, 15, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#fff8ea'
  g.font = `700 15px ${FONT.mono}`
  g.fillText(ch.mark, 30, 31)
  g.restore()
}

function paintExtras(g: CanvasRenderingContext2D) {
  // EXIT arrow plate (floor)
  {
    const r = plaqueRect(PLQ_EXIT)
    g.save()
    g.translate(r.x, r.y)
    g.fillStyle = P.tealDeep
    g.fillRect(0, 0, r.w, r.h)
    g.strokeStyle = '#fff3d8'
    g.lineWidth = 4
    roundRect(g, 10, 10, r.w - 20, r.h - 20, 12)
    g.stroke()
    g.fillStyle = '#fff3d8'
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    spaced(g, 5)
    g.font = `900 46px ${FONT.mono}`
    g.fillText('EXIT', 30, r.h / 2 + 2)
    spaced(g, 0)
    // arrow
    g.fillStyle = P.marigold
    g.beginPath()
    g.moveTo(150, r.h / 2 - 9)
    g.lineTo(186, r.h / 2 - 9)
    g.lineTo(186, r.h / 2 - 24)
    g.lineTo(224, r.h / 2)
    g.lineTo(186, r.h / 2 + 24)
    g.lineTo(186, r.h / 2 + 9)
    g.lineTo(150, r.h / 2 + 9)
    g.closePath()
    g.fill()
    g.restore()
  }
  // PULL plate (brass)
  {
    const r = plaqueRect(PLQ_PULL)
    g.save()
    g.translate(r.x, r.y)
    const gr = g.createLinearGradient(0, 0, 0, r.h)
    gr.addColorStop(0, '#f6cf7a')
    gr.addColorStop(1, '#c98f2e')
    g.fillStyle = gr
    g.fillRect(0, 0, r.w, r.h)
    g.strokeStyle = '#7a4a1c'
    g.lineWidth = 5
    roundRect(g, 10, 10, r.w - 20, r.h - 20, 10)
    g.stroke()
    g.fillStyle = '#3a2412'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    spaced(g, 6)
    g.font = `900 58px ${FONT.mono}`
    g.fillText('PULL', r.w / 2 + 3, r.h / 2 + 3)
    spaced(g, 0)
    g.restore()
  }
  // MAIN STREET welcome mat text
  {
    const r = plaqueRect(PLQ_MAIN)
    g.save()
    g.translate(r.x, r.y)
    g.fillStyle = '#7a3a2c'
    g.fillRect(0, 0, r.w, r.h)
    g.strokeStyle = P.marigold
    g.lineWidth = 4
    roundRect(g, 9, 9, r.w - 18, r.h - 18, 12)
    g.stroke()
    g.fillStyle = '#fff3d8'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const s = fitText(g, 'MAIN STREET', r.w - 44, 44, 900, FONT.display, 12)
    g.font = `900 ${s}px ${FONT.display}`
    g.fillText('MAIN STREET', r.w / 2, r.h * 0.4)
    spaced(g, 2)
    g.fillStyle = P.marigold
    g.font = `500 19px ${FONT.mono}`
    g.fillText('WALK THIS WAY', r.w / 2 - 12, r.h * 0.75)
    spaced(g, 0)
    g.beginPath()
    g.moveTo(r.w / 2 + 84, r.h * 0.75 - 9)
    g.lineTo(r.w / 2 + 102, r.h * 0.75)
    g.lineTo(r.w / 2 + 84, r.h * 0.75 + 9)
    g.closePath()
    g.fill()
    g.restore()
  }
}

export function makeAtlasA(chapters: Chapter[]): CanvasTexture {
  const { c, g } = makeCanvas(A_SIZE, A_SIZE)
  g.fillStyle = '#fff3d8'
  g.fillRect(0, 0, A_SIZE, A_SIZE)
  chapters.forEach((ch, i) => {
    paintSign(g, signRect(i), ch)
    paintPlaque(g, plaqueRect(i), ch)
  })
  paintExtras(g)
  return toTexture(c, 8)
}

// ---- atlas B: chalk boards + posters + a chair label (opaque, lit) --------------------------------------
const CH_W = 512
const CH_H = 138
export const chalkRect = (i: number): Rect => ({ x: (i % 2) * CH_W, y: Math.floor(i / 2) * CH_H, w: CH_W, h: CH_H })
const POSTER_W = 341
const POSTER_H = 470
export const posterRect = (i: number): Rect => ({ x: i * POSTER_W, y: 420, w: POSTER_W, h: POSTER_H })
export const dirRect: Rect = { x: 0, y: 900, w: 256, h: 64 }

const CHALK = ['#ffd27a', '#9be4d4', '#ff9a82', '#c8b5ff']

/** what the chalk board says, using ONLY words/numbers found in the chapter data */
export function chalkRows(c: Chapter): { a: string; b?: string }[] | null {
  if (c.source === 'brief') return [{ a: 'Ask me about', b: 'this one' }]
  if (!c.work?.length) return null
  const rows = c.work.map((w) => ({ a: w.name, b: w.growth ?? w.note }))
  const first = c.facts?.[0]
  if (first && rows.length === 1 && !rows[0].b) rows[0] = { a: first.k, b: first.v }
  return rows
}

function paintChalk(g: CanvasRenderingContext2D, r: Rect, c: Chapter) {
  const rows = chalkRows(c)
  if (!rows) return
  g.save()
  g.translate(r.x, r.y)
  g.fillStyle = '#26403f'
  g.fillRect(0, 0, r.w, r.h)
  // dusty smears
  g.strokeStyle = 'rgba(255,255,255,0.055)'
  g.lineWidth = 26
  g.beginPath()
  g.moveTo(-10, r.h * 0.8)
  g.lineTo(r.w + 10, r.h * 0.3)
  g.stroke()
  g.lineWidth = 3
  g.strokeStyle = 'rgba(255,255,255,0.14)'
  g.strokeRect(9, 9, r.w - 18, r.h - 18)
  g.textBaseline = 'middle'
  if (c.source === 'brief') {
    g.textAlign = 'center'
    g.fillStyle = '#fff8ea'
    g.font = `600 50px ${FONT.hand}`
    g.fillText(rows[0].a, r.w / 2 - 20, r.h * 0.34)
    g.fillStyle = CHALK[0]
    g.font = `700 58px ${FONT.hand}`
    g.fillText(rows[0].b ?? '', r.w / 2 - 20, r.h * 0.72)
    // a chalky question mark doodle
    g.strokeStyle = CHALK[1]
    g.lineWidth = 6
    g.lineCap = 'round'
    g.beginPath()
    g.arc(r.w - 66, r.h * 0.4, 20, Math.PI * 1.05, Math.PI * 2.35)
    g.lineTo(r.w - 66, r.h * 0.4 + 40)
    g.stroke()
    g.beginPath()
    g.arc(r.w - 66, r.h * 0.4 + 62, 2, 0, Math.PI * 2)
    g.stroke()
  } else if (rows.length <= 2) {
    g.textAlign = 'left'
    const n = rows.length
    const slot = (r.h - 26) / n
    rows.forEach((row, i) => {
      const cy = 13 + slot * (i + 0.5)
      g.fillStyle = '#fff8ea'
      const s1 = fitText(g, row.a, r.w - 70, 30, 600, FONT.hand, 14)
      g.font = `600 ${s1}px ${FONT.hand}`
      g.fillText(row.a, 34, cy - slot * 0.26)
      if (row.b) {
        g.fillStyle = CHALK[i % CHALK.length]
        const s2 = fitText(g, row.b, r.w - 70, 36, 700, FONT.hand, 14)
        g.font = `700 ${s2}px ${FONT.hand}`
        g.fillText(row.b, 34, cy + slot * 0.26)
      }
    })
  } else {
    g.textAlign = 'left'
    const slot = (r.h - 20) / rows.length
    rows.forEach((row, i) => {
      const cy = 10 + slot * (i + 0.5)
      g.fillStyle = '#fff8ea'
      const nm = row.a
      let s = 26
      g.font = `600 ${s}px ${FONT.hand}`
      const wA = g.measureText(nm).width
      const wB = row.b ? (g.font = `700 ${s}px ${FONT.hand}`, g.measureText(row.b).width) : 0
      const avail = r.w - 64
      if (wA + wB + 26 > avail) s = Math.max(14, Math.floor((s * avail) / (wA + wB + 26)))
      g.font = `600 ${s}px ${FONT.hand}`
      g.fillText(nm, 30, cy)
      if (row.b) {
        g.fillStyle = CHALK[i % CHALK.length]
        g.font = `700 ${s}px ${FONT.hand}`
        g.textAlign = 'right'
        g.fillText(row.b, r.w - 30, cy)
        g.textAlign = 'left'
      }
    })
  }
  g.restore()
}

function paintPosters(g: CanvasRenderingContext2D) {
  // 0 - sunny hills: pure microcopy
  {
    const r = posterRect(0)
    g.save()
    g.translate(r.x, r.y)
    g.fillStyle = '#f6d7a6'
    g.fillRect(0, 0, r.w, r.h)
    const sky = g.createLinearGradient(0, 0, 0, r.h * 0.7)
    sky.addColorStop(0, '#ffb99a')
    sky.addColorStop(1, '#ffe6b0')
    g.fillStyle = sky
    g.fillRect(14, 14, r.w - 28, r.h * 0.66)
    g.fillStyle = '#fff2c4'
    g.beginPath()
    g.arc(r.w * 0.6, r.h * 0.42, 46, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = P.leaf
    g.beginPath()
    g.moveTo(14, r.h * 0.68)
    g.quadraticCurveTo(r.w * 0.3, r.h * 0.5, r.w * 0.62, r.h * 0.68)
    g.lineTo(14, r.h * 0.68)
    g.fill()
    g.fillStyle = P.leafDark
    g.beginPath()
    g.moveTo(r.w - 14, r.h * 0.68)
    g.quadraticCurveTo(r.w * 0.66, r.h * 0.52, r.w * 0.34, r.h * 0.68)
    g.lineTo(r.w - 14, r.h * 0.68)
    g.fill()
    g.fillStyle = P.ink
    g.textAlign = 'center'
    g.font = `900 40px ${FONT.display}`
    g.fillText('Keep', r.w / 2, r.h * 0.8)
    g.fillText('walking', r.w / 2, r.h * 0.8 + 44)
    g.strokeStyle = P.terracotta
    g.lineWidth = 8
    g.strokeRect(6, 6, r.w - 12, r.h - 12)
    g.restore()
  }
  // 1 - paper plane
  {
    const r = posterRect(1)
    g.save()
    g.translate(r.x, r.y)
    g.fillStyle = '#cfe6ff'
    g.fillRect(0, 0, r.w, r.h)
    g.strokeStyle = '#7b98d8'
    g.lineWidth = 3
    g.setLineDash([9, 10])
    g.beginPath()
    g.moveTo(40, r.h * 0.72)
    g.bezierCurveTo(90, r.h * 0.9, 150, r.h * 0.4, 220, r.h * 0.42)
    g.stroke()
    g.setLineDash([])
    g.fillStyle = '#fffaf0'
    g.beginPath()
    g.moveTo(220, r.h * 0.42)
    g.lineTo(302, r.h * 0.3)
    g.lineTo(250, r.h * 0.5)
    g.closePath()
    g.fill()
    g.fillStyle = '#d6e0f5'
    g.beginPath()
    g.moveTo(220, r.h * 0.42)
    g.lineTo(250, r.h * 0.5)
    g.lineTo(240, r.h * 0.44)
    g.closePath()
    g.fill()
    g.fillStyle = P.indigo
    g.textAlign = 'center'
    g.font = `900 38px ${FONT.display}`
    g.fillText('Send it', r.w / 2, r.h * 0.83)
    g.strokeStyle = P.indigo
    g.lineWidth = 8
    g.strokeRect(6, 6, r.w - 12, r.h - 12)
    g.restore()
  }
  // 2 - no undo
  {
    const r = posterRect(2)
    g.save()
    g.translate(r.x, r.y)
    g.fillStyle = '#fff3d8'
    g.fillRect(0, 0, r.w, r.h)
    g.fillStyle = P.ink
    g.textAlign = 'center'
    g.font = `900 46px ${FONT.display}`
    g.fillText('Edits,', r.w / 2, r.h * 0.34)
    g.fillText('not undo.', r.w / 2, r.h * 0.34 + 54)
    g.strokeStyle = P.coral
    g.lineWidth = 7
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(r.w * 0.28, r.h * 0.62)
    g.quadraticCurveTo(r.w * 0.5, r.h * 0.7, r.w * 0.72, r.h * 0.6)
    g.stroke()
    // pencil
    g.save()
    g.translate(r.w * 0.5, r.h * 0.83)
    g.rotate(-0.5)
    g.fillStyle = P.marigold
    g.fillRect(-46, -8, 76, 16)
    g.fillStyle = '#f2c9a0'
    g.beginPath()
    g.moveTo(30, -8)
    g.lineTo(52, 0)
    g.lineTo(30, 8)
    g.closePath()
    g.fill()
    g.fillStyle = P.coral
    g.fillRect(-58, -8, 12, 16)
    g.restore()
    g.strokeStyle = P.terracotta
    g.lineWidth = 8
    g.strokeRect(6, 6, r.w - 12, r.h - 12)
    g.restore()
  }
  // director's chair back label
  {
    const r = dirRect
    g.save()
    g.translate(r.x, r.y)
    g.fillStyle = '#fff3d8'
    g.fillRect(0, 0, r.w, r.h)
    g.fillStyle = P.ink
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    spaced(g, 6)
    g.font = `900 34px ${FONT.mono}`
    g.fillText('DIRECTOR', r.w / 2 + 3, r.h / 2 + 2)
    spaced(g, 0)
    g.restore()
  }
}

export function makeAtlasB(chapters: Chapter[]): CanvasTexture {
  const { c, g } = makeCanvas(A_SIZE, A_SIZE)
  g.fillStyle = '#26403f'
  g.fillRect(0, 0, A_SIZE, A_SIZE)
  const paint = () => {
    g.fillStyle = '#26403f'
    g.fillRect(0, 0, A_SIZE, 420)
    let k = 0
    for (const ch of chapters) if (chalkRows(ch)) paintChalk(g, chalkRect(k++), ch)
  }
  paint()
  paintPosters(g)
  const tex = toTexture(c, 8) as CanvasTexture
  loadHandFont().then(() => {
    paint()
    tex.needsUpdate = true
  })
  return tex
}

/** chalk board slot index for a chapter (only chapters with a board get one) */
export function chalkIndex(chapters: Chapter[], id: string) {
  let k = 0
  for (const ch of chapters) {
    if (chalkRows(ch)) {
      if (ch.id === id) return k
      k++
    }
  }
  return -1
}

// ---- unlit textures ---------------------------------------------------------------------------------------
export function windowTexture() {
  const w = 384
  const h = 640
  const { c, g } = makeCanvas(w, h)
  const sky = g.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#9fc2f0')
  sky.addColorStop(0.5, '#f7d2c8')
  sky.addColorStop(1, '#ffe7b5')
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  const sun = g.createRadialGradient(w * 0.62, h * 0.72, 6, w * 0.62, h * 0.72, 210)
  sun.addColorStop(0, 'rgba(255,250,220,1)')
  sun.addColorStop(0.3, 'rgba(255,226,150,0.6)')
  sun.addColorStop(1, 'rgba(255,220,150,0)')
  g.fillStyle = sun
  g.fillRect(0, 0, w, h)
  g.fillStyle = 'rgba(255,255,255,0.75)'
  for (const [cx, cy, s] of [[90, 200, 1], [250, 300, 1.25], [150, 470, 0.9]] as const) {
    g.beginPath()
    g.ellipse(cx, cy, 58 * s, 16 * s, 0, 0, Math.PI * 2)
    g.ellipse(cx + 26 * s, cy - 10 * s, 34 * s, 14 * s, 0, 0, Math.PI * 2)
    g.fill()
  }
  // mullions
  g.strokeStyle = 'rgba(248,236,213,0.95)'
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(w / 2, 0)
  g.lineTo(w / 2, h)
  g.moveTo(0, h * 0.5)
  g.lineTo(w, h * 0.5)
  g.moveTo(0, h * 0.78)
  g.lineTo(w, h * 0.78)
  g.stroke()
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

export function clockFaceTexture() {
  const S = 512
  const { c, g } = makeCanvas(S, S)
  g.fillStyle = '#f8ecd5'
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2 - 4, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = 14
  g.strokeStyle = P.terracotta
  g.stroke()
  g.lineWidth = 5
  g.strokeStyle = P.marigold
  g.beginPath()
  g.arc(S / 2, S / 2, S / 2 - 30, 0, Math.PI * 2)
  g.stroke()
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const big = i % 5 === 0
    const r0 = S / 2 - (big ? 76 : 60)
    const r1 = S / 2 - 42
    g.lineWidth = big ? 9 : 3
    g.strokeStyle = P.ink
    g.beginPath()
    g.moveTo(S / 2 + Math.sin(a) * r0, S / 2 - Math.cos(a) * r0)
    g.lineTo(S / 2 + Math.sin(a) * r1, S / 2 - Math.cos(a) * r1)
    g.stroke()
  }
  g.fillStyle = P.ink
  g.font = `900 62px ${FONT.display}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const [n, a] of [[12, 0], [3, 90], [6, 180], [9, 270]] as const) {
    g.fillText(String(n), S / 2 + Math.sin((a * Math.PI) / 180) * 146, S / 2 - Math.cos((a * Math.PI) / 180) * 146)
  }
  return toTexture(c, 8)
}

export function zzzTexture() {
  const { c, g } = makeCanvas(256, 160)
  g.textBaseline = 'middle'
  g.textAlign = 'center'
  g.fillStyle = '#ffffff'
  g.strokeStyle = 'rgba(70,60,110,0.55)'
  g.lineWidth = 6
  g.lineJoin = 'round'
  ;([[70, 118, 46], [130, 76, 64], [196, 36, 84]] as const).forEach(([x, y, s]) => {
    g.font = `900 italic ${s}px ${FONT.display}`
    g.strokeText('z', x, y)
    g.fillText('z', x, y)
  })
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

// ---- animated screens ---------------------------------------------------------------------------------------
/** NIT Mechanics: a 2x2 video-call grid; the "speaker" highlight hops between tiles */
export function callDraw(): Draw {
  const tiles = [
    { a: '#3e4392', b: '#6a72d8', skin: '#f0c6a0', shirt: '#ffb347', hair: '#2b2438' },
    { a: '#2f9591', b: '#63d0c4', skin: '#8d5a3c', shirt: '#f7f2e7', hair: '#1c1620' },
    { a: '#d9744f', b: '#f4a877', skin: '#e6b48c', shirt: '#3e4392', hair: '#6a3a22' },
    { a: '#7b5fd6', b: '#b39cf6', skin: '#c98e66', shirt: '#f2a33c', hair: '#2b2438' },
  ]
  let grads: CanvasGradient[] | null = null
  return (g, t, w, h) => {
    g.fillStyle = '#12101f'
    g.fillRect(0, 0, w, h)
    const pad = 10
    const gap = 8
    const bar = 40
    const tw = (w - pad * 2 - gap) / 2
    const th = (h - pad * 2 - gap - bar) / 2
    if (!grads) {
      grads = tiles.map((tile) => {
        const gr = g.createLinearGradient(0, 0, 0, th)
        gr.addColorStop(0, tile.a)
        gr.addColorStop(1, tile.b)
        return gr
      })
    }
    const speaker = Math.floor(t / 1.3) % 4
    for (let i = 0; i < 4; i++) {
      const x = pad + (i % 2) * (tw + gap)
      const y = pad + Math.floor(i / 2) * (th + gap)
      const tile = tiles[i]
      g.save()
      g.translate(x, y)
      g.fillStyle = grads[i]
      roundRect(g, 0, 0, tw, th, 14)
      g.fill()
      const cx = tw / 2
      // shoulders (clipped to the tile)
      g.save()
      roundRect(g, 0, 0, tw, th, 14)
      g.clip()
      g.fillStyle = tile.shirt
      g.beginPath()
      g.ellipse(cx, th + 6, tw * 0.34, th * 0.42, 0, Math.PI, 0)
      g.fill()
      g.restore()
      const hy = th * 0.44
      const hr = th * 0.21
      g.fillStyle = tile.skin
      g.beginPath()
      g.arc(cx, hy, hr, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = tile.hair
      g.beginPath()
      g.arc(cx, hy - 2, hr + 2, Math.PI * 1.02, Math.PI * 1.98)
      g.fill()
      g.fillStyle = '#2b2438'
      g.beginPath()
      g.arc(cx - hr * 0.38, hy + 1, 3.2, 0, Math.PI * 2)
      g.arc(cx + hr * 0.38, hy + 1, 3.2, 0, Math.PI * 2)
      g.fill()
      if (i === speaker) {
        const m = 0.5 + 0.5 * Math.sin(t * 15)
        g.fillStyle = '#7a2a2a'
        g.beginPath()
        g.ellipse(cx, hy + hr * 0.55, hr * 0.22, 2 + hr * 0.16 * m, 0, 0, Math.PI * 2)
        g.fill()
        g.strokeStyle = '#7CFF9E'
        g.lineWidth = 5
        roundRect(g, 2, 2, tw - 4, th - 4, 12)
        g.stroke()
      } else {
        g.strokeStyle = '#7a2a2a'
        g.lineWidth = 3
        g.beginPath()
        g.arc(cx, hy + hr * 0.3, hr * 0.28, 0.2, Math.PI - 0.2)
        g.stroke()
      }
      g.fillStyle = 'rgba(20,16,32,0.55)'
      roundRect(g, 8, th - 20, tw * 0.4, 12, 6)
      g.fill()
      g.restore()
    }
    // control bar
    const by = h - bar + 4
    for (let k = 0; k < 3; k++) {
      g.fillStyle = k === 2 ? '#e2493f' : '#4a4763'
      g.beginPath()
      g.arc(w / 2 + (k - 1) * 46, by + 14, 14, 0, Math.PI * 2)
      g.fill()
    }
  }
}

/** Fix Health: a phone chat with bubbles popping in (no wording — shapes only) */
export function chatDraw(accent: string): Draw {
  const msgs = [
    { me: false, bars: [0.78, 0.5] },
    { me: true, bars: [0.6] },
    { me: false, bars: [0.85, 0.7, 0.32] },
    { me: true, bars: [0.46, 0.3] },
  ]
  return (g, t, w, h) => {
    g.fillStyle = '#f3f6fb'
    g.fillRect(0, 0, w, h)
    g.fillStyle = accent
    g.fillRect(0, 0, w, 62)
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(34, 31, 15, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = P.red
    g.fillRect(28, 21, 12, 20)
    g.fillRect(24, 25, 20, 12)
    g.fillStyle = 'rgba(255,255,255,0.85)'
    roundRect(g, 62, 19, 92, 11, 5)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.5)'
    roundRect(g, 62, 36, 60, 9, 4)
    g.fill()
    const cycle = 10
    const p = t % cycle
    let y = 84
    for (let i = 0; i < msgs.length; i++) {
      const at = 0.7 + i * 1.9
      if (p < at) {
        // typing dots for the next bubble
        if (p > at - 0.9) {
          const left = !msgs[i].me
          const bx = left ? 18 : w - 18 - 74
          g.fillStyle = left ? '#e1e6ef' : lighten(accent, 0.4)
          roundRect(g, bx, y, 74, 34, 17)
          g.fill()
          g.fillStyle = left ? '#8a93a6' : '#fff'
          for (let d = 0; d < 3; d++) {
            g.beginPath()
            g.arc(bx + 22 + d * 15, y + 17 - Math.max(0, Math.sin(t * 8 - d * 0.9)) * 5, 4, 0, Math.PI * 2)
            g.fill()
          }
        }
        break
      }
      const k = Math.min(1, (p - at) / 0.22)
      const m = msgs[i]
      const bw = 168 * (0.55 + 0.45 * Math.max(...m.bars))
      const bh = 22 + m.bars.length * 17
      const bx = m.me ? w - 18 - bw : 18
      g.save()
      g.translate(bx + (m.me ? bw : 0), y + bh / 2)
      g.scale(0.7 + 0.3 * k, 0.7 + 0.3 * k)
      g.globalAlpha = k
      g.fillStyle = m.me ? accent : '#e1e6ef'
      roundRect(g, m.me ? -bw : 0, -bh / 2, bw, bh, 16)
      g.fill()
      g.fillStyle = m.me ? 'rgba(255,255,255,0.85)' : '#8a93a6'
      m.bars.forEach((f, j) => {
        roundRect(g, (m.me ? -bw : 0) + 14, -bh / 2 + 12 + j * 17, (bw - 28) * f, 8, 4)
        g.fill()
      })
      g.restore()
      y += bh + 14
    }
    // little heart at the bottom bar
    g.fillStyle = '#fff'
    g.fillRect(0, h - 56, w, 56)
    g.fillStyle = '#e8ecf4'
    roundRect(g, 16, h - 44, w - 90, 30, 15)
    g.fill()
    g.fillStyle = P.coral
    g.beginPath()
    const hx = w - 40
    const hy = h - 30
    g.moveTo(hx, hy + 9)
    g.bezierCurveTo(hx - 18, hy - 4, hx - 8, hy - 16, hx, hy - 6)
    g.bezierCurveTo(hx + 8, hy - 16, hx + 18, hy - 4, hx, hy + 9)
    g.fill()
  }
}

/** Yaas: a stock-style ticker built from the numbers on the chapter */
export function tickerDraw(items: { label: string; delta: string }[]): Draw {
  let widths: number[] | null = null
  let total = 0
  let font = ''
  return (g, t, w, h) => {
    g.fillStyle = '#0b1310'
    g.fillRect(0, 0, w, h)
    g.textBaseline = 'middle'
    g.textAlign = 'left'
    const fs = Math.round(h * 0.5)
    if (!widths) {
      font = `500 ${fs}px ${FONT.mono}`
      g.font = font
      widths = items.map((it) => g.measureText(it.label).width + g.measureText(it.delta).width + fs * 3.4)
      total = widths.reduce((a, b) => a + b, 0)
    }
    let x = -((t * 120) % total)
    for (let rep = 0; rep < 2; rep++) {
      items.forEach((it, i) => {
        // green triangle
        g.fillStyle = '#4df08c'
        g.beginPath()
        g.moveTo(x + fs * 0.1, h / 2 + fs * 0.32)
        g.lineTo(x + fs * 0.9, h / 2 + fs * 0.32)
        g.lineTo(x + fs * 0.5, h / 2 - fs * 0.36)
        g.closePath()
        g.fill()
        g.font = font
        g.fillStyle = '#fff3d8'
        g.fillText(it.label, x + fs * 1.2, h / 2 + 2)
        const lw = g.measureText(it.label).width
        g.fillStyle = '#4df08c'
        g.fillText(it.delta, x + fs * 1.2 + lw + fs * 0.6, h / 2 + 2)
        x += widths![i]
      })
    }
    // scanlines
    g.fillStyle = 'rgba(0,0,0,0.18)'
    for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1.5)
  }
}

/** Surviving AI: a friendly robot face — blinks, glances around, smiles */
export function robotDraw(): Draw {
  let gl: CanvasGradient | null = null
  return (g, t, w, h) => {
    g.fillStyle = '#0c1424'
    g.fillRect(0, 0, w, h)
    if (!gl) {
      gl = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.7)
      gl.addColorStop(0, 'rgba(70,200,255,0.16)')
      gl.addColorStop(1, 'rgba(70,200,255,0)')
    }
    g.fillStyle = gl
    g.fillRect(0, 0, w, h)
    const bp = t % 3.9
    const blink = bp > 3.72 ? 1 - Math.abs(Math.sin(((bp - 3.72) / 0.18) * Math.PI)) : 1
    const look = Math.sin(t * 0.8) * 12
    const ey = h * 0.42
    g.save()
    g.shadowColor = '#5ff3ff'
    g.shadowBlur = 22
    g.fillStyle = '#a9f8ff'
    for (const sx of [-1, 1]) {
      const ex = w / 2 + sx * w * 0.2 + look
      const eh = 64 * Math.max(0.08, blink)
      roundRect(g, ex - 24, ey - eh / 2, 48, eh, 22)
      g.fill()
    }
    g.restore()
    g.strokeStyle = '#a9f8ff'
    g.lineWidth = 7
    g.lineCap = 'round'
    g.beginPath()
    g.arc(w / 2 + look * 0.5, h * 0.62, 26, 0.25 * Math.PI, 0.75 * Math.PI)
    g.stroke()
    g.fillStyle = 'rgba(255,140,170,0.35)'
    for (const sx of [-1, 1]) {
      g.beginPath()
      g.ellipse(w / 2 + sx * w * 0.36 + look * 0.4, h * 0.6, 14, 8, 0, 0, Math.PI * 2)
      g.fill()
    }
  }
}

/** June & Lochan: a phone scrolling a reels grid */
export function reelsDraw(): Draw {
  const cols = ['#ff6b8b', '#ffb347', '#8f6bf0', '#35b3a8', '#e2493f', '#f0b93a', '#4f80e0', '#f48fb1']
  let grads: CanvasGradient[] | null = null
  return (g, t, w, h) => {
    g.fillStyle = '#1a1226'
    g.fillRect(0, 0, w, h)
    const gap = 8
    const tw = (w - gap * 3) / 2
    const th = tw * 1.62
    if (!grads) {
      grads = cols.map((col) => {
        const gr = g.createLinearGradient(0, 0, 0, th)
        gr.addColorStop(0, col)
        gr.addColorStop(1, darken(col, 0.45))
        return gr
      })
    }
    const off = (t * 26) % (th + gap)
    const first = Math.floor((t * 26) / (th + gap))
    for (let r = -1; r < 4; r++) {
      for (let c = 0; c < 2; c++) {
        const x = gap + c * (tw + gap)
        const y = 62 + r * (th + gap) - off
        if (y > h || y + th < 50) continue
        const idx = ((((first + r) * 2 + c) % cols.length) + cols.length) % cols.length
        g.save()
        g.translate(x, y)
        g.fillStyle = grads[idx]
        roundRect(g, 0, 0, tw, th, 12)
        g.fill()
        g.fillStyle = 'rgba(255,255,255,0.9)'
        g.beginPath()
        g.moveTo(tw / 2 - 12, th / 2 - 16)
        g.lineTo(tw / 2 + 16, th / 2)
        g.lineTo(tw / 2 - 12, th / 2 + 16)
        g.closePath()
        g.fill()
        g.fillStyle = 'rgba(255,255,255,0.75)'
        roundRect(g, 10, th - 22, tw * 0.45, 8, 4)
        g.fill()
        g.restore()
      }
    }
    g.fillStyle = '#1a1226'
    g.fillRect(0, 0, w, 58)
    g.fillStyle = '#fff3d8'
    g.font = `800 30px ${FONT.sans}`
    g.textAlign = 'left'
    g.textBaseline = 'middle'
    g.fillText('Reels', 16, 30)
    g.fillStyle = '#ff6b8b'
    g.beginPath()
    g.arc(w - 30, 30, 10, 0, Math.PI * 2)
    g.fill()
  }
}

/** SaaSFlash: three small monitors (editor timeline, live bars, waveform) drawn on one wide plane */
export function monitorsDraw(): Draw {
  let sky: CanvasGradient | null = null
  return (g, t, w, h) => {
    g.fillStyle = '#211a3a'
    g.fillRect(0, 0, w, h)
    const mw = w / 3
    for (let k = 0; k < 3; k++) {
      const x = k * mw + 7
      const y = 7
      const iw = mw - 14
      const ih = h - 14
      g.fillStyle = '#0d0b18'
      roundRect(g, x, y, iw, ih, 14)
      g.fill()
      g.save()
      g.beginPath()
      roundRect(g, x + 10, y + 10, iw - 20, ih - 20, 8)
      g.clip()
      const sx = x + 10
      const sy = y + 10
      const sw = iw - 20
      const sh = ih - 20
      if (k === 0) {
        if (!sky) {
          sky = g.createLinearGradient(0, sy, 0, sy + sh * 0.58)
          sky.addColorStop(0, '#ffb99a')
          sky.addColorStop(1, '#ffe6b0')
        }
        g.fillStyle = sky
        g.fillRect(sx, sy, sw, sh * 0.58)
        g.fillStyle = '#fff6cf'
        g.beginPath()
        g.arc(sx + sw * (0.3 + 0.4 * ((t * 0.08) % 1)), sy + sh * 0.3, 14, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = 'rgba(255,255,255,0.9)'
        g.beginPath()
        g.moveTo(sx + sw / 2 - 8, sy + sh * 0.29 - 11)
        g.lineTo(sx + sw / 2 + 12, sy + sh * 0.29)
        g.lineTo(sx + sw / 2 - 8, sy + sh * 0.29 + 11)
        g.closePath()
        g.fill()
        const cols = ['#7b5fd6', '#2f9591', '#f2a33c']
        for (let r = 0; r < 3; r++) {
          for (let b = 0; b < 4; b++) {
            g.fillStyle = cols[(r + b) % 3]
            g.fillRect(sx + 4 + b * (sw / 4) + r * 6, sy + sh * 0.64 + r * 15, sw / 4 - 8 - (b % 2) * 6, 10)
          }
        }
        g.fillStyle = '#fff'
        g.fillRect(sx + 6 + ((t * 24) % (sw - 12)), sy + sh * 0.6, 3, sh * 0.4)
      } else if (k === 1) {
        g.fillStyle = '#131028'
        g.fillRect(sx, sy, sw, sh)
        const n = 6
        for (let i = 0; i < n; i++) {
          const v = 0.25 + 0.7 * (i / (n - 1)) * (0.75 + 0.25 * Math.sin(t * 1.4 + i))
          const bw = sw / n - 8
          g.fillStyle = i === n - 1 ? '#4df08c' : '#8f6bf0'
          g.fillRect(sx + 4 + i * (sw / n), sy + sh - 6 - v * (sh - 16), bw, v * (sh - 16))
        }
        g.strokeStyle = '#ffd27a'
        g.lineWidth = 3
        g.beginPath()
        for (let i = 0; i < n; i++) {
          const v = 0.25 + 0.7 * (i / (n - 1))
          const px = sx + 4 + i * (sw / n) + (sw / n - 8) / 2
          const py = sy + sh - 6 - v * (sh - 16) - 10
          if (i) g.lineTo(px, py)
          else g.moveTo(px, py)
        }
        g.stroke()
      } else {
        g.fillStyle = '#1b0f1c'
        g.fillRect(sx, sy, sw, sh)
        const on = Math.floor(t * 1.6) % 2 === 0
        g.fillStyle = on ? '#ff4d5e' : '#7a2a35'
        g.beginPath()
        g.arc(sx + 16, sy + 16, 7, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#fff3d8'
        g.font = `700 16px ${FONT.mono}`
        g.textAlign = 'left'
        g.textBaseline = 'middle'
        g.fillText('REC', sx + 30, sy + 17)
        g.strokeStyle = '#5ff3ff'
        g.lineWidth = 3
        g.beginPath()
        for (let i = 0; i <= 36; i++) {
          const px = sx + (i / 36) * sw
          const py = sy + sh * 0.62 + Math.sin(i * 0.9 + t * 7) * (6 + 16 * Math.abs(Math.sin(i * 0.31 + t * 1.3)))
          if (i) g.lineTo(px, py)
          else g.moveTo(px, py)
        }
        g.stroke()
      }
      g.restore()
    }
  }
}
