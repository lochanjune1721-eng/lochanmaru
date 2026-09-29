// EXPERIENCE — the existing site's timeline (cards + detail modals), in chronological order.
// Social Capital comes from the owner's brief; no role/date/scope is invented for it.
import type { Source } from './site'

export interface Chapter {
  id: string
  name: string
  /** display label for the era, exactly as on the site */
  period: string
  role?: string
  /** big headline of the chapter */
  title?: string
  blurb?: string
  story?: string[]
  facts?: { k: string; v: string }[]
  /** work done in this chapter: [name, detail, growth] */
  work?: { name: string; growth?: string; note?: string; projectId?: string }[]
  samples?: string[]
  source: Source
  color: string
  /** the little emoji-ish mark on the door plaque (kept as plain text) */
  mark: string
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'nit',
    name: 'NIT Mechanics',
    period: '2021',
    role: 'National Institute of Technology, Karnataka',
    title: 'The Beginning',
    blurb: 'Started my journey by building a college community from scratch.',
    story: ['During the pandemic, college went online - I saw an opportunity to connect people. Created NIT Mechanics.'],
    samples: ['https://www.youtube.com/embed/8uRB1bVhKJQ'],
    source: 'site',
    color: '#3e4392',
    mark: '01',
  },
  {
    id: 'fixhealth',
    name: 'Fix Health',
    period: '2023',
    role: 'Product Manager & Content Writer',
    title: 'Learning to sell through content',
    blurb: 'Learned the art of selling through content. Mastered engagement.',
    story: ['First exposure to conversion-focused content and community management.'],
    samples: ['https://www.youtube.com/embed/O_h6jEXRtUY'],
    source: 'site',
    color: '#808a99',
    mark: '02',
  },
  {
    id: 'brandflow',
    name: 'Brand Flow Media',
    period: '2023-24',
    role: 'Content Strategist',
    title: 'Scaling EdTech brands',
    blurb: 'Led content initiatives for major EdTech brands. Drove viral growth.',
    story: ["Worked with India's biggest EdTech names: GeeksforGeeks, Sahil Gogna, Kodnest, Coding Ninjas, PhysicsWallah"],
    work: [
      { name: 'GeeksforGeeks', growth: '400K → 1.1 Million', note: 'Problems: weak hooks, no trends, no personality. Solutions: trend analysis, script hooks, storytelling.', projectId: 'gfg' },
      { name: 'Sahil Gogna', growth: '480 → 150K followers', projectId: 'sahil' },
    ],
    source: 'site',
    color: '#d9744f',
    mark: '03',
  },
  {
    id: 'yaas',
    name: 'Yaas (Varun Mayya)',
    period: '2024',
    role: 'Content Strategist',
    title: 'Breaking into FinTech',
    blurb: 'Strategized content for high-stakes FinTech and AI domains.',
    story: ['Turning complex finance into simple stories.'],
    work: [
      { name: 'Markets by Zerodha', growth: '30K → 100K subscribers', note: 'Simplify trading for beginners', projectId: 'zerodha' },
      { name: 'Binge Wealth', growth: '20K → 150K followers', note: 'Financial storytelling meets lifestyle', projectId: 'binge' },
    ],
    source: 'site',
    color: '#f0b93a',
    mark: '04',
  },
  {
    id: 'beyond',
    name: 'Beyond Degree',
    period: 'Building Now',
    role: 'EdTech Media',
    title: 'Redefining education narratives',
    blurb: 'Redefining education narratives.',
    story: [
      'This project mattered because it aligned with my own beliefs. Marwadi University wanted an education page. I didn’t want to build another “degree = success” account. Instead, I positioned Beyond Degree around everything formal education doesn’t teach - skills, curiosity, and learning through real-world exposure.',
      'I took inspiration from pages like Sei Com Sei, but added humor and cultural context. The very first video crossed ~1.5 million views, instantly validating the positioning.',
    ],
    facts: [{ k: 'First video', v: '~1.5M views' }],
    work: [{ name: 'Beyond Degree', projectId: 'beyond' }],
    source: 'site',
    color: '#2f9591',
    mark: '05',
  },
  {
    id: 'survivingai',
    name: 'Surviving AI',
    period: 'Building Now',
    role: 'AI Media',
    title: 'Decoding the future of AI',
    blurb: 'Decoding the future of AI for the masses.',
    story: ['Decoding the future of Artificial Intelligence for the masses. Making complex tech accessible.'],
    samples: ['https://www.instagram.com/reel/DSNVudxj3uF/embed', 'https://www.instagram.com/p/DQ62JwGj6Gr/embed'],
    source: 'site',
    color: '#3e6fd0',
    mark: '06',
  },
  {
    id: 'june',
    name: 'June & Lochan',
    period: 'Building Now',
    role: 'Creator & Builder',
    title: 'A cult community',
    blurb: 'From 0 to 300K in 4 month. Building a cult community.',
    work: [{ name: 'June & Lochan', growth: '0 → 300K', projectId: 'june' }],
    source: 'site',
    color: '#e2493f',
    mark: '07',
  },
  {
    id: 'saasflash',
    name: 'SaaSFlash',
    period: 'Present',
    role: 'Creative Director',
    title: 'Commanding creative vision',
    blurb: 'Commanding creative vision for Greg Isenberg, Perplexity, Kalshi & RPN. Leading teams to scale brands to Million+.',
    work: [
      { name: 'SaaSFlash', growth: '30K → 115K', projectId: 'saasflash' },
      { name: 'Greg Isenberg', growth: '15K → 78K', note: 'Startup strategy', projectId: 'greg' },
      { name: 'Den Donovan', growth: '20 Million+ Views', note: 'Creator economy', projectId: 'den' },
      { name: 'Perplexity', note: 'AI search content' },
    ],
    samples: [
      'https://www.instagram.com/reel/DS5Aq6NDIIS/embed',
      'https://www.instagram.com/reel/DSuwrrKDLmw/embed',
      'https://www.instagram.com/reel/DPHjYATEp1t/embed',
    ],
    source: 'site',
    color: '#7b5fd6',
    mark: '08',
  },
  {
    id: 'socialcapital',
    name: 'Social Capital',
    period: '',
    source: 'brief',
    color: '#1f6c74',
    mark: '09',
  },
]

export const chapterById = (id: string) => CHAPTERS.find((c) => c.id === id)
