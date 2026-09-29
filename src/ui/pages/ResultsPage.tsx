import { BIG, PROOF } from '../../content/results'
import { openPage } from '../../engine/places'
import { CountUp, Go, Hero, NextUp, Sec, rv, vars } from './parts'

/** RESULTS — the big numbers, then the figures each case study stands behind. */
export function ResultsPage() {
  return (
    <>
      <Hero id="results" kicker="Results" title="The scale of the work" />
      <div className="pg-main">
        <ul className="pg-wall">
          {BIG.map((b, i) => (
            <li key={b.id} className={`rv ${i === 0 ? 'hero' : i < 3 ? 'mid' : ''}`} style={vars({ '--i': i + 1 })}>
              <b>
                <CountUp to={b.num} suffix={b.suffix} delay={i * 110} />
              </b>
              <span>{b.label}</span>
            </li>
          ))}
        </ul>

        <Sec title="Behind the numbers" aside="tap one for the story" i={9}>
          <ul className="pg-proof">
            {PROOF.map((p) => {
              const inner = (
                <>
                  <b>{p.value}</b>
                  <span>
                    <em>{p.label}</em>
                    <small>{p.who}</small>
                  </span>
                  {p.projectId && (
                    <span className="go" aria-hidden>
                      →
                    </span>
                  )}
                </>
              )
              return (
                <li key={p.id}>
                  {p.projectId ? (
                    <button onClick={() => openPage('work', p.projectId)}>{inner}</button>
                  ) : (
                    <div>{inner}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </Sec>

        <div className="pg-cta rv" style={rv(11).style}>
          <Go to="hire">Want numbers like these? →</Go>
          <Go to="work" tone="soft">
            All case studies
          </Go>
        </div>
        <NextUp id="results" />
      </div>
    </>
  )
}
