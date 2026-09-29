import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import { current } from '../engine/interactions'
import { clamp } from '../engine/math'
import { R } from '../engine/planet'
import { hoverTag, openPage, places, stage } from '../engine/places'
import { useStore } from '../engine/store'
import { PAGES, PageGlyph } from './pages/meta'
import { vars } from './pages/parts'

const _p = new Vector3()

/**
 * Floating name tags over the five buildings. They ride on the projected position of each roof, fade with distance, hide
 * when the building is behind the planet's curve, and are real buttons (click / tap / Tab + Enter) that open the page.
 */
export function PlaceTags() {
  const phase = useStore((s) => s.phase)
  const page = useStore((s) => s.page)
  const hover = useStore((s) => s.hoverPlace)
  const visited = useStore((s) => s.visited)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const camera = stage.camera
      if (!camera) return
      const W = window.innerWidth
      const H = window.innerHeight
      const c = camera.position
      const dc = c.length()
      for (const meta of PAGES) {
        const el = refs.current[meta.id]
        const pl = places[meta.id]
        if (!el) continue
        if (!pl) {
          el.style.visibility = 'hidden'
          continue
        }
        const t = pl.labelAt
        // is the roof above the horizon as seen from the camera?
        const dt = t.length()
        const ang = Math.acos(clamp(c.dot(t) / (dc * dt), -1, 1))
        const seen = ang < Math.acos(clamp(R / dc, 0, 1)) + Math.acos(clamp(R / dt, 0, 1))
        const dist = c.distanceTo(t)
        _p.copy(t).project(camera)
        let x = (_p.x * 0.5 + 0.5) * W
        let y = (-_p.y * 0.5 + 0.5) * H
        // a tag whose anchor has slipped off the top / sides of the screen stays pinned just inside it
        const inView = _p.z < 1 && x > -90 && x < W + 90 && y < H + 40
        x = clamp(x, 70, W - 70)
        y = Math.max(y, 104)
        const onScreen = inView
        // the OPEN prompt already names the building you're standing at
        const atDoor = current.item?.id === `open-${meta.id}`
        const o = seen && onScreen && !atDoor ? clamp((84 - dist) / 30, 0, 1) : 0
        el.style.visibility = o > 0.02 ? 'visible' : 'hidden'
        el.style.opacity = String(o)
        el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      hoverTag.id = null
    }
  }, [])

  if (phase !== 'playing' || page) return null
  return (
    <div className="tags np" aria-label="Buildings">
      {PAGES.map((p) => (
        <button
          key={p.id}
          ref={(el) => {
            refs.current[p.id] = el
          }}
          className={`tag ${hover === p.id ? 'hover' : ''} ${visited[p.id] ? '' : 'new'}`}
          style={vars({ '--c': p.color, '--on': p.on })}
          onClick={() => openPage(p.id)}
          onPointerEnter={() => (hoverTag.id = p.id)}
          onPointerLeave={() => (hoverTag.id = null)}
          onFocus={() => (hoverTag.id = p.id)}
          onBlur={() => (hoverTag.id = null)}
          aria-label={`Open ${p.name}`}
        >
          <span className="tag-ic">
            <PageGlyph id={p.id} size={15} />
          </span>
          <span className="tag-t">{p.label}</span>
        </button>
      ))}
    </div>
  )
}
