import { useEffect, useRef } from 'react'
import { clamp, easeInOutCubic } from '../engine/math'
import { irisCtl } from './iris'

/** Cartoon iris wipe: closes on the door you walked into, opens inside (and the reverse on the way out). */
export function Iris() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!
    let raf = 0
    const maxR = () => Math.hypot(window.innerWidth, window.innerHeight) * 1.02
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const tween = (from: number, to: number, ms: number) =>
      new Promise<void>((res) => {
        const t0 = performance.now()
        const dur = reduced ? 60 : ms
        const step = (t: number) => {
          const k = clamp((t - t0) / dur, 0, 1)
          el.style.setProperty('--r', `${from + (to - from) * easeInOutCubic(k)}px`)
          if (k < 1) raf = requestAnimationFrame(step)
          else res()
        }
        raf = requestAnimationFrame(step)
      })
    irisCtl.close = async (x, y, color) => {
      el.style.setProperty('--x', `${x}px`)
      el.style.setProperty('--y', `${y}px`)
      el.style.setProperty('--c', color)
      el.style.setProperty('--r', `${maxR()}px`)
      el.classList.add('on')
      await tween(maxR(), 0, 640)
    }
    irisCtl.open = async (x, y) => {
      el.style.setProperty('--x', `${x}px`)
      el.style.setProperty('--y', `${y}px`)
      await tween(0, maxR(), 760)
      el.classList.remove('on')
    }
    return () => cancelAnimationFrame(raf)
  }, [])
  return <div ref={ref} className="iris" aria-hidden />
}
