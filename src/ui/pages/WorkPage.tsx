import { useState } from 'react'
import { projectPanel } from '../../content/panels'
import { PROJECTS, Project, WINGS, Wing, projectById } from '../../content/projects'
import { setSection } from '../../engine/places'
import { useStore } from '../../engine/store'
import { BlockView } from '../Blocks'
import { BackBar, Hero, NextUp, PrevNext, isLight, rv, vars } from './parts'

type Filter = Wing | 'all'
/** the filter survives opening a case study and coming back */
let lastFilter: Filter = 'all'

const wingOf = (p: Project) => WINGS.find((w) => w.id === p.wing)!
const initials = (name: string) =>
  name
    .replace(/[^A-Za-z0-9& ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

/** case studies with a write-up first, then the names I only have a line on */
const ordered = (f: Filter) => {
  const list = PROJECTS.filter((p) => f === 'all' || p.wing === f)
  return [...list.filter((p) => p.source === 'site'), ...list.filter((p) => p.source !== 'site')]
}

/** WORK — a filterable wall of case studies; each one opens as a proper write-up. */
export function WorkPage() {
  const section = useStore((s) => s.pageSection)
  const project = section ? projectById(section) : undefined
  return project ? <CaseStudy p={project} /> : <Wall />
}

function Logo({ p }: { p: Project }) {
  return p.logo ? <img src={p.logo} alt="" width={56} height={56} loading="lazy" decoding="async" /> : <span>{initials(p.name)}</span>
}

function Wall() {
  const [f, setF] = useState<Filter>(lastFilter)
  const pick = (v: Filter) => {
    lastFilter = v
    setF(v)
  }
  const list = ordered(f)
  const stories = list.filter((p) => p.source === 'site')
  const stubs = list.filter((p) => p.source !== 'site')
  const count = (w: Filter) => PROJECTS.filter((p) => w === 'all' || p.wing === w).length
  return (
    <>
      <Hero id="work" kicker="Work" title="Case studies" sub={`${PROJECTS.filter((p) => p.source === 'site').length} write-ups · ${PROJECTS.filter((p) => p.source !== 'site').length} more on request`} />
      <div className="pg-main">
        <div className="pg-filters rv" style={rv(1).style} role="tablist" aria-label="Filter the work">
          {([{ id: 'all', name: 'All', color: '#2b2438' }, ...WINGS] as { id: Filter; name: string; color: string }[]).map((w) => (
            <button key={w.id} role="tab" aria-selected={f === w.id} className={f === w.id ? 'on' : ''} style={vars({ '--c': w.color, '--on': isLight(w.color) ? '#2b2438' : '#fff8ea' })} onClick={() => pick(w.id)}>
              {w.name}
              <em>{count(w.id)}</em>
            </button>
          ))}
        </div>

        <div className="pg-grid" key={f}>
          {stories.map((p, i) => {
            const w = wingOf(p)
            return (
              <button key={p.id} className="pg-card pg-proj rv" style={vars({ '--c': w.color, '--i': i + 2 })} onClick={() => setSection(p.id)}>
                <span className="pg-proj-logo">
                  <Logo p={p} />
                </span>
                <span className="pg-proj-body">
                  <small>{w.name}</small>
                  <b>{p.name}</b>
                  {p.headline && <span className="pg-proj-head">{p.headline}</span>}
                  {p.hook && <span className="pg-proj-hook">{p.hook}</span>}
                </span>
                <span className="pg-proj-go" aria-hidden>
                  →
                </span>
              </button>
            )
          })}
        </div>

        {stubs.length > 0 && (
          <div className="pg-more rv" style={vars({ '--i': stories.length + 3 })}>
            <h3>More brands · details on request</h3>
            <div>
              {stubs.map((p) => (
                <button key={p.id} style={vars({ '--c': wingOf(p).color })} onClick={() => setSection(p.id)}>
                  <i aria-hidden />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <NextUp id="work" />
      </div>
    </>
  )
}

function CaseStudy({ p }: { p: Project }) {
  const w = wingOf(p)
  const panel = projectPanel(p)
  let list = ordered(lastFilter)
  if (!list.some((x) => x.id === p.id)) list = ordered('all')
  const i = list.findIndex((x) => x.id === p.id)
  const prev = list[i - 1]
  const next = list[i + 1]
  return (
    <>
      <BackBar label="All work" pos={`${i + 1} / ${list.length}`} />
      <Hero
        id="work"
        accent={w.color}
        kicker={panel.kicker}
        title={p.name}
        sub={p.headline ? <span className="pg-headline">{p.headline}</span> : panel.subtitle}
        orb={
          <span className="pg-logo">
            <Logo p={p} />
          </span>
        }
        small
      />
      <div className="pg-main pg-detail" style={vars({ '--accent': w.color })}>
        {panel.blocks.map((b, k) => (
          <div key={k} className="rv" style={rv(k + 1).style}>
            <BlockView b={b} />
          </div>
        ))}
        <PrevNext prev={prev && { id: prev.id, name: prev.name }} next={next && { id: next.id, name: next.name }} />
      </div>
    </>
  )
}
