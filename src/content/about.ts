// WHO AM I — verbatim from the existing site's hero + About sections.
import { PROOF } from './results'

export const HERO = {
  lead: "I don't just create content; I engineer impact.",
  body:
    "As a Creative Director who has scaled narratives for 30+ brands across AI, FinTech, EdTech, and Politics, I turn complex visions into viral realities. From zero to Million+ followers, I build media engines that drive influence and revenue. Whether it's crafting high-stakes political campaigns or decoding deep tech, I deliver stories that stop the scroll and own the moment.",
}

export const STORY = {
  origin:
    "I’m Lochan. I grew up in a small town in Rajasthan, India, and did what I was supposed to do next - studied engineering.",
  turn:
    "Somewhere along the way, I realized I was more interested in how ideas spread than just how systems work. I started experimenting with content on the internet, teaching myself how stories travel, why certain ideas stick, and how attention actually works online. What began as curiosity slowly turned into a craft.",
  craft:
    "Over the years, that curiosity helped me scale brands from 0 to over a million followers. I’ve worked across AI, edtech, fintech, politics using strategic storytelling, creative direction, and data-driven experimentation to turn complex ideas into content that people actually care about.",
  both:
    "I still think like an engineer, but I create like a storyteller. My work sits at the intersection of logic and creativity, and what drives me most is seeing ideas move from a blank page to something that creates real-world impact.",
}

export const SKILLS = ['Creative Writing', 'Copywriting', 'Creative Strategy', 'Direction', 'Team Management'] as const

export const EDUCATION = {
  place: 'National Institute of Technology, Karnataka',
  note: 'During the pandemic, college went online - I saw an opportunity to connect people. Created NIT Mechanics.',
}

/** Industries named in the hero copy: "AI, FinTech, EdTech, and Politics". */
export const INDUSTRIES = ['AI', 'FinTech', 'EdTech', 'Politics'] as const

/** "At a glance" tiles on the Who-am-I page — each figure is lifted from the hero / About copy above, nothing new. */
export const GLANCE = [
  { v: PROOF.find((p) => p.id === 'p-brands')?.value ?? '30+', l: 'Brands scaled' }, // "scaled narratives for 30+ brands"
  { v: '0 → 1M+', l: 'Followers' }, // "From zero to Million+ followers"
  { v: String(INDUSTRIES.length), l: `Industries: ${INDUSTRIES.join(' · ')}` },
]
