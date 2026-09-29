import { EDUCATION, GLANCE, HERO, SKILLS, STORY } from '../../content/about'
import { SITE } from '../../content/site'
import { Go, Hero, NextUp, Sec, rv } from './parts'

const STEPS = [
  { k: 'Where I’m from', t: STORY.origin },
  { k: 'The turn', t: STORY.turn },
  { k: 'The craft', t: STORY.craft },
  { k: 'Engineer × storyteller', t: STORY.both },
]


/** WHO AM I — the hero line, the story in four beats, where it started, the toolkit. */
export function AboutPage() {
  return (
    <>
      <Hero id="home" kicker="Who am I?" title={SITE.name}>
        <ul className="pg-roles">
          {SITE.roles.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </Hero>
      <div className="pg-main">
        <blockquote className="pg-quote rv" style={rv(1).style}>
          {HERO.lead}
        </blockquote>
        <p className="pg-p big rv" style={rv(2).style}>
          {HERO.body}
        </p>
        <ul className="pg-glance rv" style={rv(3).style}>
          {GLANCE.map((g) => (
            <li key={g.v}>
              <b>{g.v}</b>
              <span>{g.l}</span>
            </li>
          ))}
        </ul>

        <Sec title="The story" i={4}>
          <ol className="pg-steps">
            {STEPS.map((s, i) => (
              <li key={s.k}>
                <span className="pg-step-n">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{s.k}</h3>
                  <p>{s.t}</p>
                </div>
              </li>
            ))}
          </ol>
        </Sec>

        <Sec title="Where it started" i={5}>
          <div className="pg-card pg-edu">
            <b>{EDUCATION.place}</b>
            <p>{EDUCATION.note}</p>
            <Go to="experience" section="nit" tone="soft">
              NIT Mechanics →
            </Go>
          </div>
        </Sec>

        <Sec title="Skills" i={6}>
          <ul className="pg-tags">
            {SKILLS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Sec>

        <div className="pg-cta rv" style={rv(7).style}>
          <Go to="work">See the work →</Go>
          <Go to="hire" tone="soft">
            Say hello
          </Go>
        </div>
        <NextUp id="home" />
      </div>
    </>
  )
}
