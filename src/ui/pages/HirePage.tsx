import { useEffect, useRef } from 'react'
import { CHANNELS, CLOSER, DOORS } from '../../content/contact'
import { LINKS, SITE } from '../../content/site'
import { useStore } from '../../engine/store'
import { Hero, NextUp, Sec, vars } from './parts'

const ICON: Record<string, string> = { email: '@', x: '𝕏', linkedin: 'in', instagram: 'ig', phone: '☎', resume: '↧' }

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
                    {ICON[c.id] ?? '→'}
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
