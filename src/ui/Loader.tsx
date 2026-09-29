import { useEffect, useState } from 'react'
import { useStore } from '../engine/store'

const LINES = ['Warming up the sun', 'Planting the trees', 'Painting the plaza', 'Hanging the signs', 'Winding the clock', 'Waking the lighthouse']

/** LOADING LOCHAN'S WORLD… — a tiny planet turns while a tiny person walks on it. */
export function Loader() {
  const phase = useStore((s) => s.phase)
  const target = useStore((s) => s.loadProgress)
  const [shown, setShown] = useState(0)
  const [line, setLine] = useState(0)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      setShown((p) => p + (target - p) * 0.08 + (target > p ? 0.002 : 0))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  useEffect(() => {
    const t = setInterval(() => setLine((l) => (l + 1) % LINES.length), 1300)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (phase !== 'loading') {
      const t = setTimeout(() => setGone(true), 1100)
      return () => clearTimeout(t)
    }
  }, [phase])

  if (gone) return null
  const C = 2 * Math.PI * 78
  const p = Math.min(1, Math.max(0, phase === 'loading' ? shown : 1))
  return (
    <div className={`loader ${phase !== 'loading' ? 'out' : ''}`} role="status" aria-live="polite">
      <div className="loader-in">
        <svg viewBox="0 0 168 168" aria-hidden>
          <defs>
            <radialGradient id="pl" cx="35%" cy="30%" r="80%">
              <stop offset="0" stopColor="#b6ea9a" />
              <stop offset="1" stopColor="#4fae72" />
            </radialGradient>
          </defs>
          <circle cx="84" cy="84" r="78" fill="none" stroke="rgba(43,36,56,.14)" strokeWidth="3" />
          <circle className="ring" cx="84" cy="84" r="78" fill="none" stroke="#2b2438" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - p)} transform="rotate(-90 84 84)" />
          <g>
            <circle cx="84" cy="84" r="60" fill="url(#pl)" stroke="#2b2438" strokeWidth="3" />
            <g className="spin">
              <path d="M84 24 L88 36 L80 36Z" fill="#3a8a6e" stroke="#2b2438" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="84" cy="26" r="0" />
              <g transform="rotate(70 84 84)">
                <rect x="78" y="20" width="12" height="16" rx="2" fill="#f2a33c" stroke="#2b2438" strokeWidth="1.5" />
                <path d="M77 20 L84 12 L91 20Z" fill="#d9744f" stroke="#2b2438" strokeWidth="1.5" strokeLinejoin="round" />
              </g>
              <g transform="rotate(150 84 84)">
                <path d="M84 20 L90 36 L78 36Z" fill="#3a8a6e" stroke="#2b2438" strokeWidth="1.5" strokeLinejoin="round" />
              </g>
              <g transform="rotate(220 84 84)">
                <rect x="79" y="22" width="10" height="14" rx="2" fill="#2f9591" stroke="#2b2438" strokeWidth="1.5" />
                <circle cx="84" cy="20" r="6" fill="#ff7a8c" stroke="#2b2438" strokeWidth="1.5" />
              </g>
              <g transform="rotate(290 84 84)">
                <path d="M84 19 L91 36 L77 36Z" fill="#4fae72" stroke="#2b2438" strokeWidth="1.5" strokeLinejoin="round" />
              </g>
            </g>
            {/* the little visitor */}
            <g className="walker">
              <rect x="77.5" y="8" width="13" height="15" rx="6" fill="#f2a33c" stroke="#2b2438" strokeWidth="2" />
              <circle cx="84" cy="4" r="6" fill="#e0a57c" stroke="#2b2438" strokeWidth="2" />
              <path d="M78 2.5 Q84 -5 90 2.5" fill="#2b2438" />
            </g>
          </g>
        </svg>
        <h2>LOADING LOCHAN’S WORLD…</h2>
        <p>{LINES[line]}</p>
        <div className="pct">{Math.round(p * 100)}%</div>
      </div>
    </div>
  )
}
