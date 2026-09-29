import { CSSProperties, ReactNode, useEffect, useState } from 'react'
import { openPage, setSection } from '../../engine/places'
import type { PlaceId } from '../../engine/store'
import { PAGES, PageGlyph, pageMeta } from './meta'

/** typed helper for setting CSS custom properties inline */
export const vars = (o: Record<string, string | number>) => o as CSSProperties

/** staggered fade-up for the things on a page */
export const rv = (i: number) => ({ className: 'rv', style: vars({ '--i': i }) })

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** The coloured top of every page: a kicker, a big title, and a round badge in the corner. */
export function Hero({
  id,
  kicker,
  title,
  sub,
  orb,
  accent,
  children,
  small = false,
}: {
  id: PlaceId
  kicker: ReactNode
  title: ReactNode
  sub?: ReactNode
  /** replaces the building icon inside the badge (a logo, a chapter number …) */
  orb?: ReactNode
  accent?: string
  children?: ReactNode
  small?: boolean
}) {
  const style = accent ? vars({ '--accent': accent, '--on': isLight(accent) ? '#2b2438' : '#fff8ea', '--tint': tintOf(accent) }) : undefined
  return (
    <header className={`pg-hero ${small ? 'small' : ''}`} style={style}>
      <div className="pg-orb" aria-hidden>
        {orb ?? <PageGlyph id={id} size={46} />}
      </div>
      <div className="pg-kick">{kicker}</div>
      <h1>{title}</h1>
      {sub && <p className="pg-sub">{sub}</p>}
      {children}
    </header>
  )
}

/** a pastel wash of the same hue as `hex` (for the top of a chapter / case-study page) */
export function tintOf(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  const d = mx - mn
  let hue = 0
  if (d > 0) {
    if (mx === r) hue = ((g - b) / d) % 6
    else if (mx === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue *= 60
    if (hue < 0) hue += 360
  }
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  const s = Math.min(72, Math.max(10, sat * 100 * 1.1))
  return `hsl(${Math.round(hue)} ${Math.round(s)}% 86%)`
}

/** rough perceived-lightness test so text on a chapter/wing colour stays readable */
export function isLight(hex: string) {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}

export function Sec({ title, aside, i = 0, id, children }: { title: ReactNode; aside?: ReactNode; i?: number; id?: string; children: ReactNode }) {
  return (
    <section className="pg-sec rv" style={vars({ '--i': i })} id={id}>
      <div className="pg-sec-h">
        <h2>{title}</h2>
        {aside && <span>{aside}</span>}
      </div>
      {children}
    </section>
  )
}

/** A pill button that jumps to another building's page (or a section inside it). */
export function Go({ to, section, children, tone = 'ink' }: { to: PlaceId; section?: string; children: ReactNode; tone?: 'ink' | 'soft' }) {
  return (
    <button className={`pg-go ${tone}`} onClick={() => openPage(to, section)}>
      {children}
    </button>
  )
}

/** "Next up" card at the end of a page: the next building along the street. */
export function NextUp({ id }: { id: PlaceId }) {
  const i = PAGES.findIndex((p) => p.id === id)
  const next = PAGES[(i + 1) % PAGES.length]
  return (
    <button className="pg-next rv" style={vars({ '--c': next.color, '--on': next.on, '--i': 12 })} onClick={() => openPage(next.id)}>
      <span className="pg-next-ic">
        <PageGlyph id={next.id} size={24} />
      </span>
      <span className="pg-next-t">
        <small>Next up</small>
        <b>{next.name}</b>
      </span>
      <span className="pg-next-go" aria-hidden>
        →
      </span>
    </button>
  )
}

/** Sticky strip at the top of a detail view: the way back to the overview, and where you are in the list. */
export function BackBar({ label, pos }: { label: string; pos?: string }) {
  return (
    <div className="pg-backbar">
      <button onClick={() => setSection(null)}>
        <span aria-hidden>←</span> {label}
      </button>
      {pos && <span>{pos}</span>}
    </div>
  )
}

/** Previous / next entry at the foot of a detail view. */
export function PrevNext({ prev, next }: { prev?: { name: string; id: string } | null; next?: { name: string; id: string } | null }) {
  if (!prev && !next) return null
  return (
    <div className="pg-pn rv" style={vars({ '--i': 10 })}>
      {prev ? (
        <button onClick={() => setSection(prev.id)}>
          <small>← Previous</small>
          <b>{prev.name}</b>
        </button>
      ) : (
        <span />
      )}
      {next ? (
        <button className="r" onClick={() => setSection(next.id)}>
          <small>Next →</small>
          <b>{next.name}</b>
        </button>
      ) : (
        <span />
      )}
    </div>
  )
}

/** counts up to a number once, when it first appears (or just shows it, if the visitor prefers less motion) */
export function CountUp({ to, suffix = '', delay = 0, ms = 1500 }: { to: number; suffix?: string; delay?: number; ms?: number }) {
  const dec = Number.isInteger(to) ? 0 : 1
  const [v, setV] = useState(reduced() ? to : 0)
  useEffect(() => {
    if (reduced()) return
    let raf = 0
    let t0 = 0
    const tick = (t: number) => {
      if (!t0) t0 = t
      const k = Math.min(1, Math.max(0, (t - t0 - delay) / ms))
      setV(to * (1 - Math.pow(1 - k, 4)))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, delay, ms])
  return (
    <>
      {v.toFixed(dec)}
      {suffix}
    </>
  )
}

export { pageMeta }
