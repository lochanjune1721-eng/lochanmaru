import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { game } from '../engine/game'
import { R, mapToN } from '../engine/planet'
import { cam, player } from '../engine/state'
import { store } from '../engine/store'
import { POI_LIST, POIS } from '../world/layout'

const COLORS: Record<string, string> = { home: '#f2a33c', experience: '#2f9591', work: '#e2493f', results: '#3e4392', hire: '#ff5a6a' }
const GLYPH: Record<string, string> = { home: '?', experience: 'E', work: 'W', results: 'R', hire: '♥' }

const pois = POI_LIST.map((p) => ({ id: p.id, n: mapToN(p.x, p.z) }))
const _t = new Vector3()
const _r = new Vector3()

/** A tiny compass-map: where the five places are, relative to where you're looking. */
export function Radar() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const S = 118
    c.width = c.height = S * dpr
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    let raf = 0
    let last = 0
    const RANGE = 70
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw)
      if (t - last < 60) return
      last = t
      g.clearRect(0, 0, S, S)
      const cx = S / 2
      const cy = S / 2
      const visited = store.getState().visited
      // rings
      g.strokeStyle = 'rgba(43,36,56,0.18)'
      g.lineWidth = 1
      for (const r of [0.34, 0.68]) {
        g.beginPath()
        g.arc(cx, cy, (S / 2 - 4) * r, 0, Math.PI * 2)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(cx, 6)
      g.lineTo(cx, S - 6)
      g.moveTo(6, cy)
      g.lineTo(S - 6, cy)
      g.stroke()
      if (game.mode === 'world') {
        _r.crossVectors(cam.fwd, player.up).normalize()
        for (const p of pois) {
          _t.copy(p.n).addScaledVector(player.n, -p.n.dot(player.n))
          const ang = Math.acos(Math.min(1, Math.max(-1, p.n.dot(player.n))))
          const dist = ang * R
          if (_t.lengthSq() < 1e-9) continue
          _t.normalize()
          const fx = _t.dot(cam.fwd)
          const rx = _t.dot(_r)
          let d = Math.min(dist, RANGE) / RANGE
          d = Math.pow(d, 0.75)
          const rad = (S / 2 - 15) * d
          const x = cx + rx * rad
          const y = cy - fx * rad
          const far = dist > RANGE
          g.globalAlpha = far ? 0.6 : 1
          g.fillStyle = COLORS[p.id]
          g.strokeStyle = '#2b2438'
          g.lineWidth = 1.6
          g.beginPath()
          g.arc(x, y, visited[p.id as keyof typeof visited] ? 8 : 7, 0, Math.PI * 2)
          g.fill()
          g.stroke()
          g.fillStyle = '#fff8ea'
          g.font = '700 9px "DM Mono", monospace'
          g.textAlign = 'center'
          g.textBaseline = 'middle'
          g.fillText(GLYPH[p.id], x, y + 0.5)
          if (visited[p.id as keyof typeof visited]) {
            g.strokeStyle = '#f7c04a'
            g.lineWidth = 2
            g.beginPath()
            g.arc(x, y, 10.5, 0, Math.PI * 2)
            g.stroke()
          }
          g.globalAlpha = 1
        }
      }
      // you
      g.fillStyle = '#2b2438'
      g.beginPath()
      g.moveTo(cx, cy - 7)
      g.lineTo(cx + 5, cy + 5)
      g.lineTo(cx, cy + 2)
      g.lineTo(cx - 5, cy + 5)
      g.closePath()
      g.fill()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="radar" aria-hidden>
      <canvas ref={ref} />
    </div>
  )
}

void POIS
