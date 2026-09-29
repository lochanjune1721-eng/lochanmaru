import { useEffect, useRef } from 'react'
import { CHANNELS, CLOSER, DOORS } from '../../content/contact'
import { LINKS, SITE } from '../../content/site'
import { useStore } from '../../engine/store'
import { Hero, NextUp, Sec, vars } from './parts'

/** a small mark for each way of getting in touch */
function ChannelIcon({ id }: { id: string }) {
  const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (id) {
    case 'email':
      return (
        <svg {...p}>
          <rect x="3.5" y="6" width="17" height="12.5" rx="2" />
          <path d="m4 8 8 5.5L20 8" />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...p}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="17" cy="7" r="0.6" fill="currentColor" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...p}>
          <path d="M6.6 4h3l1.5 4-2 1.3a10 10 0 0 0 5.6 5.6l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A15 15 0 0 1 4.6 6.2 2 2 0 0 1 6.6 4z" />
        </svg>
      )
    case 'resume':
      return (
        <svg {...p}>
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4M10 13h5M10 17h5" />
        </svg>
      )
    case 'linkedin':
      return <b>in</b>
    case 'x':
      return <b>𝕏</b>
    default:
      return <b>→</b>
  }
}

/** HIRE LOCHAN — the closing line, four ways to work together, every way to reach out. */
export function HirePage() {
  const section = useStore((s) => s.pageSection)
  const channels = useRef<HTMLElement>(null)
  useEffect(() => {
    if (section !== 'contact') return
    const t = setTimeout(() => channels.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
    return () => clearTimeout(t)
  }, [section])

  return (
    <>
      <Hero id="hire" kicker="Hire Lochan" title={CLOSER}>
        <div className="pg-hero-cta">
          <a className="pg-btn" href={LINKS.emailCompose} target="_blank" rel="noopener noreferrer">
            Write an email <span aria-hidden>↗</span>
          </a>
          <a className="pg-btn ghost" href={LINKS.resume} target="_blank" rel="noopener noreferrer">
            Résumé <span aria-hidden>↗</span>
          </a>
        </div>
      </Hero>
      <div className="pg-main">
        <Sec title="Ways to work together" i={1}>
          <ul className="pg-doors">
            {DOORS.map((d, i) => (
              <li key={d.id} className="rv" style={vars({ '--c': d.color, '--i': i + 2 })}>
                <a className="pg-card" href={d.href} target="_blank" rel="noopener noreferrer">
                  <span className="pg-door-n" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <b>{d.label}</b>
                  <span className="pg-door-l">{d.line}</span>
                  <span className="pg-door-go">
                    Start a conversation <span aria-hidden>↗</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Sec>

        <section className="pg-sec rv" style={vars({ '--i': 7 })} id="pg-channels" ref={channels}>
          <div className="pg-sec-h">
            <h2>Find {SITE.first} here</h2>
          </div>
          <ul className="pg-chan">
            {CHANNELS.map((c) => (
              <li key={c.id}>
                <a href={c.href} target={c.href.startsWith('tel:') ? undefined : '_blank'} rel="noopener noreferrer">
                  <span className="pg-chan-ic" aria-hidden>
                    <ChannelIcon id={c.id} />
                  </span>
                  <span className="pg-chan-t">
                    <b>{c.label}</b>
                    <small>{c.value}</small>
                  </span>
                  <span className="go" aria-hidden>
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
        <NextUp id="hire" />
      </div>
    </>
  )
}
