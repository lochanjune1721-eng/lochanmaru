import { useState } from 'react'
import type { Block } from '../engine/store'

export function Embeds({ title, urls }: { title?: string; urls: string[] }) {
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

export function BlockView({ b }: { b: Block }) {
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
