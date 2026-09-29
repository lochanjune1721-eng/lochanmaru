import { useEffect, useRef } from 'react'
import { input } from '../engine/input'
import { store } from '../engine/store'

/**
 * Transparent layer over the canvas that turns pointer events into game input:
 * mouse: drag to look, hover/click to pick, wheel to zoom.
 * touch: floating joystick on the left half, drag-to-look on the right half.
 */
export function Controls() {
  const layer = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = layer.current!
    const R = 58
    type P = { id: number; kind: 'look' | 'stick'; x: number; y: number; sx: number; sy: number; t0: number; moved: number }
    const ptrs = new Map<number, P>()

    const showStick = (x: number, y: number) => {
      const b = base.current!
      b.style.opacity = '1'
      b.style.transform = `translate(${x - R}px, ${y - R}px)`
      thumb.current!.style.transform = 'translate(0px, 0px)'
    }
    const hideStick = () => {
      base.current!.style.opacity = '0'
      input.stick.set(0, 0)
    }

    const down = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId)
      input.lastActivity = performance.now()
      const touch = e.pointerType === 'touch' || e.pointerType === 'pen'
      if (touch && !input.touch) {
        input.touch = true
        store.getState().set({ touch: true })
      }
      const leftHalf = e.clientX < window.innerWidth * 0.5
      const hasStick = [...ptrs.values()].some((p) => p.kind === 'stick')
      // the floating stick only exists while walking is allowed (not while a page is open)
      const kind: P['kind'] = touch && leftHalf && !hasStick && input.enabled ? 'stick' : 'look'
      ptrs.set(e.pointerId, { id: e.pointerId, kind, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t0: performance.now(), moved: 0 })
      if (kind === 'stick') showStick(e.clientX, e.clientY)
      else input.dragging = true
    }

    const move = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      if (!p) {
        if (e.pointerType === 'mouse') {
          input.hoverX = e.clientX
          input.hoverY = e.clientY
        }
        return
      }
      const dx = e.clientX - p.x
      const dy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      p.moved += Math.abs(dx) + Math.abs(dy)
      if (p.kind === 'stick') {
        let vx = e.clientX - p.sx
        let vy = e.clientY - p.sy
        const l = Math.hypot(vx, vy)
        if (l > R) {
          vx = (vx / l) * R
          vy = (vy / l) * R
        }
        thumb.current!.style.transform = `translate(${vx}px, ${vy}px)`
        const dead = 0.14
        const nx = vx / R
        const ny = -vy / R
        const nl = Math.hypot(nx, ny)
        const sc = nl < dead ? 0 : Math.min(1, (nl - dead) / (1 - dead)) / nl
        input.stick.set(nx * sc, ny * sc)
      } else {
        input.lookDX += dx
        input.lookDY += dy
      }
      input.lastActivity = performance.now()
    }

    const up = (e: PointerEvent) => {
      const p = ptrs.get(e.pointerId)
      if (!p) return
      ptrs.delete(e.pointerId)
      if (p.kind === 'stick') hideStick()
      else if (![...ptrs.values()].some((q) => q.kind === 'look')) input.dragging = false
      // a tap/click that barely moved (a quick tap on the left half starts the stick, but it is still a tap)
      if (p.moved < 8 && performance.now() - p.t0 < 500) {
        input.clickX = e.clientX
        input.clickY = e.clientY
      }
    }

    const leave = () => {
      input.hoverX = -1
      input.hoverY = -1
    }
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      input.wheel += e.deltaY
    }
    const ctx = (e: Event) => e.preventDefault()

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('contextmenu', ctx)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('contextmenu', ctx)
    }
  }, [])

  return (
    <div ref={layer} className="controls-layer">
      <div ref={base} className="stick-base" aria-hidden>
        <div ref={thumb} className="stick-thumb" />
      </div>
    </div>
  )
}
