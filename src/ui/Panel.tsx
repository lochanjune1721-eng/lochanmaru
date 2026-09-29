import { useEffect, useRef, useState } from 'react'
import { hidePanel } from '../engine/panel'
import { Block, PanelContent, useStore } from '../engine/store'

function Embeds({ title, urls }: { title?: string; urls: string[] }) {
  const [on, setOn] = useState(false)
  return (
    <div className="b-emb">
      {title && <h4>{title}</h4>}
      {!on ? (
        <button className="load" onClick={() => setOn(true)}>
          ▶ Load {urls.length} sample{urls.length > 1 ? 's' : ''}
        </button>
      ) : (
        <div className="grid">
          {urls.map((u) => (
            <iframe
              key={u}
              src={u}
              title="Work sample"
              className={u.includes('youtube') ? 'yt' : ''}
              loading="lazy"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'lead':
      return <p className="b-lead">{b.text}</p>
    case 'p':
      return <p className="b-p">{b.text}</p>
    case 'list':
      return (
        <div className="b-list">
          {b.title && <h4>{b.title}</h4>}
          <ul>
            {b.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      )
    case 'metrics':
      return (
        <div className="b-metrics">
          {b.items
            .filter((m) => m.value)
            .map((m) => (
              <div key={m.value + m.label}>
                <b>{m.value}</b>
                <span>{m.label}</span>
              </div>
            ))}
        </div>
      )
    case 'facts':
      return (
        <dl className="b-facts">
          {b.items.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
      )
    case 'quote':
      return (
        <blockquote className="b-quote">
          {b.text}
          {b.by && <footer>— {b.by}</footer>}
        </blockquote>
      )
    case 'links':
      return (
        <div className="b-links">
          {b.items.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer">
              <span>
                {l.label}
                {l.note && <small>{l.note}</small>}
              </span>
              <span className="go">↗</span>
            </a>
          ))}
        </div>
      )
    case 'embeds':
      return <Embeds title={b.title} urls={b.urls} />
    case 'image':
      return <img src={b.src} alt={b.alt} style={{ width: '100%', borderRadius: b.round ? '50%' : 14 }} />
    case 'tags':
      return (
        <div className="b-tags">
          {b.items.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      )
  }
}

/** The content card. Slides in beside the thing you're looking at; the world stays visible behind it. */
export function Panel() {
  const panel = useStore((s) => s.panel)
  const touch = useStore((s) => s.touch)
  const [shown, setShown] = useState<PanelContent | null>(null)
  const [open, setOpen] = useState(false)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (panel) {
      setShown(panel)
      const r = requestAnimationFrame(() => setOpen(true))
      if (body.current) body.current.scrollTop = 0
      return () => cancelAnimationFrame(r)
    }
    setOpen(false)
    const t = setTimeout(() => setShown(null), 650)
    return () => clearTimeout(t)
  }, [panel])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') hidePanel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!shown) return null
  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={hidePanel} />
      <aside className={`panel ${open ? 'show' : ''}`} style={{ ['--accent' as string]: shown.accent ?? '#f2a33c' }} role="dialog" aria-modal="false" aria-label={shown.title}>
        <header className="panel-head">
          {shown.kicker && <div className="kick">{shown.kicker}</div>}
          <h2>{shown.title}</h2>
          {shown.subtitle && <div className="subt">{shown.subtitle}</div>}
          {shown.image && <img className="logo" src={shown.image.src} alt={shown.image.alt} />}
          <button className="panel-x" onClick={hidePanel} aria-label="Close">
            <svg viewBox="0 0 16 16">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </header>
        <div className="panel-body" ref={body}>
          {shown.blocks.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </div>
        <footer className="panel-foot">
          <span>{touch ? 'Tap × to go back' : 'Esc — back to the world'}</span>
          <span>Lochan’s World</span>
        </footer>
      </aside>
    </>
  )
}
