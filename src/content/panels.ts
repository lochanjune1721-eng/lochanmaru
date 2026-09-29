// Content -> panel blocks. The Panel UI only knows about blocks, so every interior reuses one system.
import type { Block, PanelContent } from '../engine/store'
import { HERO, SKILLS, STORY } from './about'
import { CHANNELS, CLOSER, DOORS } from './contact'
import type { Chapter } from './experience'
import { CHAPTERS } from './experience'
import { PROJECTS, WINGS, projectById } from './projects'
import type { Project } from './projects'
import { LINKS, SITE, mailFor } from './site'

const wingName = (id: string) => WINGS.find((w) => w.id === id)?.name ?? ''

export function projectPanel(p: Project): PanelContent {
  const blocks: Block[] = []
  const accent = WINGS.find((w) => w.id === p.wing)?.color

  if (p.source === 'brief') {
    // Named in the brief, but the write-up isn't on hand — never invent one.
    blocks.push({ t: 'lead', text: `Want the story behind ${p.name}?` })
    blocks.push({ t: 'p', text: 'This one is best told in conversation — ask, and you’ll get the real numbers and the thinking behind them.' })
    blocks.push({
      t: 'links',
      items: [
        { label: `Ask about ${p.name}`, href: mailFor(`${p.name} — tell me more`), note: LINKS.email },
        { label: 'LinkedIn', href: LINKS.linkedin },
      ],
    })
    return { id: p.id, kicker: `Case study · ${wingName(p.wing)}`, title: p.name, subtitle: 'Details on request', accent, blocks }
  }

  if (p.hook) blocks.push({ t: 'lead', text: p.hook })
  if (p.metrics?.length) blocks.push({ t: 'metrics', items: p.metrics.slice(0, 3).map(splitMetric) })
  if (p.facts?.length) blocks.push({ t: 'facts', items: p.facts })
  p.story?.forEach((para, i) => {
    blocks.push({ t: 'p', text: para })
    const list = p.lists?.[i]
    if (list) blocks.push({ t: 'list', items: list })
  })
  if (p.metrics?.length) blocks.push({ t: 'list', title: 'Impact & metrics', items: p.metrics })
  if (p.link) blocks.push({ t: 'links', items: [{ label: `${p.link.label} →`, href: p.link.href }] })
  if (p.samples?.length) blocks.push({ t: 'embeds', title: 'Work samples', urls: p.samples })
  return {
    id: p.id,
    kicker: [p.role, wingName(p.wing)].filter(Boolean).join(' · '),
    title: p.name,
    subtitle: p.headline,
    accent,
    image: p.logo ? { src: p.logo, alt: `${p.name} logo` } : undefined,
    blocks,
  }
}

/** turn "10M+ Views from 12 Videos" into a big value + label where it reads naturally */
function splitMetric(m: string): { value: string; label: string } {
  const hit = m.match(/^(\d[\d.,]*\s?[KMB]?\+?)\s+(.*)$/i)
  if (hit) return { value: hit[1].replace(/\s/g, ''), label: hit[2] }
  const grew = m.match(/^Grew from (.+?) to (.+?)(?: followers| subscribers| in just.*)?$/i)
  if (grew) return { value: `${grew[1]} → ${grew[2]}`, label: m.includes('subscribers') ? 'subscribers' : 'followers' }
  return { value: '', label: m }
}

export function chapterPanel(c: Chapter): PanelContent {
  const blocks: Block[] = []
  if (c.source === 'brief') {
    blocks.push({ t: 'lead', text: 'One of the rooms on this street.' })
    blocks.push({ t: 'p', text: 'Ask me about it — the story is better in person.' })
    blocks.push({
      t: 'links',
      items: [
        { label: 'Ask about Social Capital', href: mailFor('Social Capital — tell me more'), note: LINKS.email },
        { label: 'LinkedIn', href: LINKS.linkedin },
      ],
    })
    return { id: c.id, kicker: 'Experience', title: c.name, accent: c.color, blocks }
  }
  if (c.blurb) blocks.push({ t: 'lead', text: c.blurb })
  c.story?.forEach((s) => blocks.push({ t: 'p', text: s }))
  if (c.facts?.length) blocks.push({ t: 'facts', items: c.facts })
  if (c.work?.length) {
    blocks.push({
      t: 'list',
      title: 'What I worked on',
      items: c.work.map((w) => [w.name, w.growth, w.note].filter(Boolean).join(' — ')),
    })
    const linked = c.work.filter((w) => w.projectId).map((w) => projectById(w.projectId!)).filter(Boolean) as Project[]
    if (linked.length) blocks.push({ t: 'tags', items: linked.map((p) => `Case study: ${p.name}`) })
  }
  if (c.samples?.length) blocks.push({ t: 'embeds', title: 'Samples', urls: c.samples })
  return {
    id: c.id,
    kicker: [c.period, c.role].filter(Boolean).join(' · '),
    title: c.name,
    subtitle: c.title,
    accent: c.color,
    blocks,
  }
}

export type AboutPart = 'hello' | 'origin' | 'turn' | 'craft' | 'both' | 'skills'

export function aboutPanel(part: AboutPart): PanelContent {
  switch (part) {
    case 'hello':
      return {
        id: 'about-hello',
        kicker: SITE.roles.join(' · '),
        title: SITE.name,
        subtitle: HERO.lead,
        accent: '#f2a33c',
        blocks: [
          { t: 'lead', text: HERO.lead },
          { t: 'p', text: HERO.body },
          { t: 'tags', items: [...SITE.roles] },
        ],
      }
    case 'origin':
      return {
        id: 'about-origin',
        kicker: 'Where I’m from',
        title: 'A small town in Rajasthan',
        accent: '#d9744f',
        blocks: [
          { t: 'lead', text: STORY.origin },
          { t: 'p', text: 'National Institute of Technology, Karnataka.' },
        ],
      }
    case 'turn':
      return {
        id: 'about-turn',
        kicker: 'The turn',
        title: 'How ideas spread',
        accent: '#2f9591',
        blocks: [{ t: 'lead', text: STORY.turn }],
      }
    case 'craft':
      return {
        id: 'about-craft',
        kicker: 'The craft',
        title: 'From curiosity to craft',
        accent: '#3e4392',
        blocks: [{ t: 'lead', text: STORY.craft }],
      }
    case 'both':
      return {
        id: 'about-both',
        kicker: 'Engineer × storyteller',
        title: 'Logic meets creativity',
        accent: '#e2493f',
        blocks: [{ t: 'lead', text: STORY.both }],
      }
    case 'skills':
      return {
        id: 'about-skills',
        kicker: 'Toolkit',
        title: 'Skills',
        accent: '#f2a33c',
        blocks: [{ t: 'tags', items: [...SKILLS] }],
      }
  }
}

export function doorPanel(id: string): PanelContent | null {
  const d = DOORS.find((x) => x.id === id)
  if (!d) return null
  return {
    id: `door-${d.id}`,
    kicker: 'Hire Lochan',
    title: d.label,
    accent: d.color,
    blocks: [
      { t: 'lead', text: d.line },
      { t: 'links', items: [{ label: `Start a conversation →`, href: d.href, note: LINKS.email }] },
    ],
  }
}

export function contactPanel(): PanelContent {
  return {
    id: 'contact',
    kicker: 'Hire Lochan',
    title: CLOSER,
    accent: '#e2493f',
    blocks: [
      { t: 'links', items: CHANNELS.map((c) => ({ label: c.label, href: c.href, note: c.value })) },
    ],
  }
}

export { PROJECTS, CHAPTERS }
