import { HERO, SKILLS, STORY } from '../content/about'
import { CHANNELS, CLOSER, DOORS } from '../content/contact'
import { CHAPTERS } from '../content/experience'
import { PROJECTS, WINGS } from '../content/projects'
import { BIG, PROOF } from '../content/results'
import { LINKS, SITE } from '../content/site'
import { useStore } from '../engine/store'

/** The same portfolio as plain, accessible text. Used when WebGL is unavailable or on request. */
export function Fallback({ force = false }: { force?: boolean }) {
  const open = useStore((s) => s.textOpen)
  const set = useStore((s) => s.set)
  if (!open && !force) return null
  return (
    <div className="fallback" role="document">
      <div className="wrap">
        {!force && (
          <button className="close" onClick={() => set({ textOpen: false })}>
            ← Back to the world
          </button>
        )}
        <div className="kicker">{SITE.roles.join(' · ')}</div>
        <h1>{SITE.name}</h1>
        <p>{HERO.lead} {HERO.body}</p>

        <h2>Who am I</h2>
        <p>{STORY.origin}</p>
        <p>{STORY.turn}</p>
        <p>{STORY.craft}</p>
        <p>{STORY.both}</p>
        <p className="meta">Skills — {SKILLS.join(' · ')}</p>

        <h2>Experience</h2>
        {CHAPTERS.map((c) => (
          <section key={c.id}>
            <h3>
              {c.name}
              {c.role ? ` — ${c.role}` : ''}
            </h3>
            {(c.period || c.title) && <div className="meta">{[c.period, c.title].filter(Boolean).join(' · ')}</div>}
            {c.blurb && <p>{c.blurb}</p>}
            {c.story?.map((s) => <p key={s}>{s}</p>)}
          </section>
        ))}

        <h2>Work</h2>
        {WINGS.map((w) => (
          <section key={w.id}>
            <h3>{w.name}</h3>
            {PROJECTS.filter((p) => p.wing === w.id).map((p) => (
              <article key={p.id}>
                <h3 style={{ fontSize: 19 }}>
                  {p.name}
                  {p.headline ? ` — ${p.headline}` : ''}
                </h3>
                {p.role && <div className="meta">{p.role}</div>}
                {p.story?.map((s) => <p key={s}>{s}</p>)}
                {p.metrics && (
                  <ul>
                    {p.metrics.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                )}
              </article>
            ))}
          </section>
        ))}

        <h2>Results</h2>
        <ul>
          {BIG.map((b) => <li key={b.id}>{b.value} {b.label}</li>)}
          {PROOF.map((p) => <li key={p.id}>{p.value} — {p.label} ({p.who})</li>)}
        </ul>

        <h2>Hire {SITE.first}</h2>
        <p>{CLOSER}</p>
        <ul>
          {DOORS.map((d) => <li key={d.id}><a href={d.href}>{d.label}</a> — {d.line}</li>)}
        </ul>
        <ul>
          {CHANNELS.map((c) => <li key={c.id}><a href={c.href}>{c.label}</a> — {c.value}</li>)}
        </ul>
        <p className="meta">© {new Date().getFullYear()} {SITE.name}. <a href={LINKS.resume}>Résumé</a></p>
      </div>
    </div>
  )
}
