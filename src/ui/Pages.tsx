import { ComponentType, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { closePage, openPage, setSection, stepPage } from '../engine/places'
import { PlaceId, useStore } from '../engine/store'
import '../styles/pages.css'
import { AboutPage } from './pages/AboutPage'
import { ExperiencePage } from './pages/ExperiencePage'
import { HirePage } from './pages/HirePage'
import { PAGES, PageGlyph, pageMeta } from './pages/meta'
import { vars } from './pages/parts'
import { ResultsPage } from './pages/ResultsPage'
import { WorkPage } from './pages/WorkPage'

const BODY: Record<PlaceId, ComponentType> = {
  home: AboutPage,
  experience: ExperiencePage,
  work: WorkPage,
  results: ResultsPage,
  hire: HirePage,
}

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/**
 * The page that slides in when you open a building. The 3D world stays visible next to it (the camera swings round to
 * show the building), and the row of icons at the top hops between buildings.
 */
export function Pages() {
  const page = useStore((s) => s.page)
  const section = useStore((s) => s.pageSection)
  const visited = useStore((s) => s.visited)
  const touch = useStore((s) => s.touch)
  const [shown, setShown] = useState<PlaceId | null>(null)
  const [open, setOpen] = useState(false)
  const [tall, setTall] = useState(false)
  const dlg = useRef<HTMLElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (page) {
      setShown((cur) => {
        if (!cur) returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        return page
      })
      const r = requestAnimationFrame(() => setOpen(true))
      return () => cancelAnimationFrame(r)
    }
    setOpen(false)
    setTall(false)
    const t = setTimeout(() => setShown(null), 700)
    return () => clearTimeout(t)
  }, [page])

  // always start a new view at its top
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [shown, section])

  // move focus into the page when it opens, and back out when it closes
  useEffect(() => {
    if (open) dlg.current?.focus({ preventScroll: true })
    else if (returnTo.current && returnTo.current.isConnected && !useStore.getState().page) {
      returnTo.current.focus({ preventScroll: true })
      returnTo.current = null
    }
  }, [open])

  useEffect(() => {
    if (!page) return
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (st.helpOpen || st.textOpen || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.code === 'Escape') {
        if (st.pageSection && (st.page === 'work' || st.page === 'experience')) setSection(null)
        else closePage()
      } else if (e.code === 'ArrowRight' && !(e.target as HTMLElement | null)?.closest?.('iframe')) stepPage(1)
      else if (e.code === 'ArrowLeft') stepPage(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [page])

  // phones: the grip toggles between a half and a nearly-full sheet; swipe it up to expand, down to collapse / put away
  const swipe = useRef<{ y: number } | null>(null)
  const swiped = useRef(false)

  if (!shown) return null
  const meta = pageMeta(shown)
  const Body = BODY[shown]
  return (
    <aside
      ref={dlg}
      tabIndex={-1}
      className={`pg ${open ? 'show' : ''} ${tall ? 'tall' : ''}`}
      style={vars({ '--accent': meta.color, '--on': meta.on })}
      role="dialog"
      aria-modal="false"
      aria-label={meta.label}
    >
      <button
        className="pg-grip"
        aria-label={tall ? 'Show less of the page' : 'Show more of the page'}
        aria-expanded={tall}
        onPointerDown={(e) => {
          swipe.current = { y: e.clientY }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerUp={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const dy = e.clientY - s.y
          if (dy > 60) {
            swiped.current = true
            if (tall) setTall(false)
            else closePage()
          } else if (dy < -60) {
            swiped.current = true
            setTall(true)
          }
        }}
        onPointerCancel={() => (swipe.current = null)}
        onClick={() => {
          if (swiped.current) swiped.current = false
          else setTall((t) => !t)
        }}
      >
        <i />
      </button>
      <nav className="pg-bar" aria-label="Places">
        <ul className="pg-tabs">
          {PAGES.map((p) => (
            <li key={p.id}>
              <button
                className={`pg-tab ${p.id === shown ? 'on' : ''} ${visited[p.id] ? 'seen' : ''}`}
                style={vars({ '--c': p.color, '--on': p.on })}
                aria-current={p.id === page ? 'page' : undefined}
                title={p.label}
                onClick={() => (p.id === page ? setSection(null) : openPage(p.id))}
              >
                <PageGlyph id={p.id} size={17} />
                <span>{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="pg-x" onClick={closePage} aria-label="Close and go back to the world" title={touch ? 'Back to the world' : 'Back to the world (Esc)'}>
          <svg viewBox="0 0 16 16" aria-hidden>
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
      </nav>
      <div className="pg-scroll" ref={scroller}>
        <div className="pg-page" key={shown}>
          <Body />
        </div>
      </div>
    </aside>
  )
}
