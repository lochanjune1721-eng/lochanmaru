// The plaza floor: a hand-painted rangoli/mandala drawn procedurally at load (no image files).
import { makeCanvas, toTexture } from './text'
import { P } from './palette'
import { rng } from '../engine/math'

export function rangoliCanvas(size = 1024) {
  const { c, g } = makeCanvas(size, size)
  const cx = size / 2
  const R0 = size / 2
  const rand = rng(77)

  // base: warm cream tile with faint grain
  g.fillStyle = '#f3e4c4'
  g.fillRect(0, 0, size, size)

  const disc = (r: number, fill: string) => {
    g.beginPath()
    g.arc(cx, cx, r, 0, Math.PI * 2)
    g.fillStyle = fill
    g.fill()
  }
  const ring = (r0: number, r1: number, fill: string) => {
    g.beginPath()
    g.arc(cx, cx, r1, 0, Math.PI * 2)
    g.arc(cx, cx, r0, 0, Math.PI * 2, true)
    g.fillStyle = fill
    g.fill('evenodd')
  }
  const petals = (n: number, r0: number, r1: number, w: number, fills: string[], rot = 0) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2
      g.save()
      g.translate(cx, cx)
      g.rotate(a)
      g.beginPath()
      g.moveTo(r0, 0)
      g.quadraticCurveTo((r0 + r1) / 2, -w, r1, 0)
      g.quadraticCurveTo((r0 + r1) / 2, w, r0, 0)
      g.fillStyle = fills[i % fills.length]
      g.fill()
      g.restore()
    }
  }
  const dots = (n: number, r: number, dr: number, fill: string, rot = 0) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2
      g.beginPath()
      g.arc(cx + Math.cos(a) * r, cx + Math.sin(a) * r, dr, 0, Math.PI * 2)
      g.fillStyle = fill
      g.fill()
    }
  }
  const tris = (n: number, rBase: number, rTip: number, w: number, fill: string, rot = 0) => {
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2
      g.save()
      g.translate(cx, cx)
      g.rotate(a)
      g.beginPath()
      g.moveTo(rBase, -w)
      g.lineTo(rTip, 0)
      g.lineTo(rBase, w)
      g.closePath()
      g.fillStyle = fill
      g.fill()
      g.restore()
    }
  }

  // outer border: terracotta band with cream "temple" triangles
  ring(R0 * 0.9, R0 * 0.995, P.terracotta)
  tris(56, R0 * 0.9, R0 * 0.99, R0 * 0.028, '#f8ecd5')
  ring(R0 * 0.865, R0 * 0.9, P.tealDeep)
  dots(56, R0 * 0.882, R0 * 0.0085, '#f8ecd5', 0.05)

  // marigold garland ring
  ring(R0 * 0.72, R0 * 0.865, '#f8e2b5')
  petals(28, R0 * 0.73, R0 * 0.86, R0 * 0.036, [P.marigold, P.coral, P.saffron])
  dots(28, R0 * 0.79, R0 * 0.012, P.indigo, 0.11)

  // lotus ring
  ring(R0 * 0.5, R0 * 0.72, '#f3e4c4')
  petals(16, R0 * 0.51, R0 * 0.71, R0 * 0.085, [P.teal, '#f8ecd5'], 0)
  petals(16, R0 * 0.51, R0 * 0.62, R0 * 0.05, [P.coral, P.terracotta], Math.PI / 16)
  dots(16, R0 * 0.665, R0 * 0.014, P.indigoDeep, Math.PI / 16)

  // indigo ring with stars
  ring(R0 * 0.38, R0 * 0.5, P.indigo)
  dots(24, R0 * 0.44, R0 * 0.014, '#f8ecd5', 0)
  dots(24, R0 * 0.44, R0 * 0.006, P.marigold, Math.PI / 24)

  // sun in the centre (fountain stands here)
  disc(R0 * 0.38, '#f8e2b5')
  petals(12, R0 * 0.15, R0 * 0.37, R0 * 0.06, [P.saffron, P.coral])
  disc(R0 * 0.16, P.tealDeep)
  disc(R0 * 0.125, '#f8ecd5')

  // subtle painted grain
  g.globalCompositeOperation = 'multiply'
  for (let i = 0; i < 1800; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = 1 + rand() * 3.5
    g.fillStyle = `rgba(150,110,80,${0.035 + rand() * 0.05})`
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  g.globalCompositeOperation = 'source-over'
  return c
}

export function rangoliTexture(size = 1024) {
  return toTexture(rangoliCanvas(size), 8)
}
