import { useEffect, useRef } from 'react'
import { current } from '../engine/interactions'
import { use } from '../engine/interactions'
import { stage } from '../engine/scenes'
import { useStore } from '../engine/store'
import { Vector3 } from 'three'

const _p = new Vector3()

/** The "ENTER" pill: a DOM element that rides on the projected position of the nearest interactable. */
export function Prompt() {
  const prompt = useStore((s) => s.prompt)
  const touch = useStore((s) => s.touch)
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef(prompt)
  if (prompt) last.current = prompt
  const shown = prompt ?? last.current

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = ref.current
      const it = current.item
      const cam = stage.camera
      if (el && cam && it) {
        _p.copy(it.anchor).project(cam)
        const behind = _p.z > 1
        const x = (_p.x * 0.5 + 0.5) * window.innerWidth
        const y = (-_p.y * 0.5 + 0.5) * window.innerHeight
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -118%)`
        el.style.visibility = behind ? 'hidden' : 'visible'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!shown) return null
  return (
    <div ref={ref} className={`prompt ${prompt ? 'show' : ''}`} aria-live="polite">
      <div className="prompt-inner" onClick={() => current.item && use(current.item)} role="button" tabIndex={-1}>
        <span className="key">{touch ? 'TAP' : shown.key}</span>
        <span className="lbl">
          <b>{shown.label}</b>
          {shown.title && <span>{shown.title}</span>}
        </span>
      </div>
    </div>
  )
}

/** Big round action button for touch screens. */
export function ActionButton() {
  const prompt = useStore((s) => s.prompt)
  const touch = useStore((s) => s.touch)
  if (!touch) return null
  return (
    <button className={`action ${prompt ? 'show' : ''}`} onClick={() => current.item && use(current.item)} aria-label={prompt ? `${prompt.label} ${prompt.title ?? ''}` : 'Interact'}>
      {prompt?.label ?? ''}
    </button>
  )
}
