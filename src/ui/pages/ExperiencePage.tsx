import { CHAPTERS, Chapter, chapterById } from '../../content/experience'
import { chapterPanel } from '../../content/panels'
import { projectById } from '../../content/projects'
import { openPage, setSection } from '../../engine/places'
import { useStore } from '../../engine/store'
import { BlockView } from '../Blocks'
import { readable } from './color'
import { BackBar, Hero, NextUp, PrevNext, Sec, rv, vars } from './parts'

/** EXPERIENCE — the timeline, then one chapter at a time. */
export function ExperiencePage() {
  const section = useStore((s) => s.pageSection)
  const chapter = section ? chapterById(section) : undefined
  return chapter ? <ChapterDetail key={chapter.id} c={chapter} /> : <Timeline />
}

const growthChips = (c: Chapter) => {
  const out: string[] = []
  for (const w of c.work ?? []) if (w.growth) out.push(`${w.name} · ${w.growth}`)
  for (const f of c.facts ?? []) out.push(`${f.k} · ${f.v}`)
  return out.slice(0, 2)
}

function Timeline() {
  return (
    <>
      <Hero id="experience" kicker="Experience" title="Chapter by chapter" sub={`${CHAPTERS.length} chapters · ${CHAPTERS[0].period} → present`} />
      <div className="pg-main">
        <ol className="pg-tl">
          {CHAPTERS.map((c, i) => (
            <li key={c.id} className="rv" style={vars({ '--c': readable(c.color).bg, '--on': readable(c.color).fg, '--i': i + 1 })}>
              <span className="pg-tl-dot" aria-hidden>
                {c.mark}
              </span>
              <button className="pg-card pg-ch" onClick={() => setSection(c.id)}>
                <span className="pg-ch-top">
                  <span className="pg-ch-period">{c.period || 'Chapter'}</span>
                  {c.source === 'brief' && <span className="pg-ch-note">Ask about it</span>}
                </span>
                <b className="pg-ch-name">{c.name}</b>
                {c.role && <span className="pg-ch-role">{c.role}</span>}
                {c.title && <i className="pg-ch-title">{c.title}</i>}
                {c.blurb && <span className="pg-ch-blurb">{c.blurb}</span>}
                {growthChips(c).length > 0 && (
                  <span className="pg-ch-chips">
                    {growthChips(c).map((g) => (
                      <em key={g}>{g}</em>
                    ))}
                  </span>
                )}
                <span className="pg-ch-go">
                  Read the chapter <span aria-hidden>→</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <NextUp id="experience" />
      </div>
    </>
  )
}

function ChapterDetail({ c }: { c: Chapter }) {
  const i = CHAPTERS.findIndex((x) => x.id === c.id)
  const panel = chapterPanel(c)
  const blocks = panel.blocks.filter((b) => b.t !== 'tags')
  const studies = (c.work ?? []).map((w) => (w.projectId ? projectById(w.projectId) : undefined)).filter((p): p is NonNullable<typeof p> => !!p)
  const prev = CHAPTERS[i - 1]
  const next = CHAPTERS[i + 1]
  return (
    <>
      <BackBar label="All chapters" pos={`${i + 1} / ${CHAPTERS.length}`} />
      <Hero id="experience" accent={c.color} kicker={panel.kicker} title={c.name} sub={c.title} orb={<span className="pg-mark">{c.mark}</span>} small />
      <div className="pg-main pg-detail" style={vars({ '--accent': c.color })}>
        {blocks.map((b, k) => (
          <div key={k} className="rv" style={rv(k + 1).style}>
            <BlockView b={b} />
          </div>
        ))}
        {studies.length > 0 && (
          <Sec title="Case studies" i={blocks.length + 1}>
            <div className="pg-links">
              {studies.map((p) => (
                <button key={p.id} onClick={() => openPage('work', p.id)}>
                  <span>
                    <b>{p.name}</b>
                    {p.headline && <small>{p.headline}</small>}
                  </span>
                  <span className="go" aria-hidden>
                    →
                  </span>
                </button>
              ))}
            </div>
          </Sec>
        )}
        <PrevNext prev={prev && { id: prev.id, name: prev.name }} next={next && { id: next.id, name: next.name }} />
      </div>
    </>
  )
}
