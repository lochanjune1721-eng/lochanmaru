// WORK — case studies. Everything below tagged `source: 'site'` is transcribed from the existing
// portfolio (wording + metrics preserved, including its own inconsistencies). Items tagged
// `source: 'brief'` are clients the owner named in the redesign brief; only the name is known, so
// no story, role or metric is invented for them.
import type { Source } from './site'

export type Wing = 'ai' | 'creators' | 'money' | 'learning'

export interface Project {
  id: string
  name: string
  wing: Wing
  source: Source
  logo?: string
  /** headline growth number, as shown on the site's project card */
  headline?: string
  role?: string
  facts?: { k: string; v: string }[]
  /** paragraphs; a paragraph may be followed by a bullet list via `lists[index]` */
  story?: string[]
  lists?: Record<number, string[]>
  metrics?: string[]
  samples?: string[]
  link?: { label: string; href: string }
  /** one-line hook for the in-world screen */
  hook?: string
}

export const WINGS: { id: Wing; name: string; sub: string; color: string }[] = [
  { id: 'ai', name: 'AI & TECH', sub: 'Making complex tech land', color: '#2f9591' },
  { id: 'creators', name: 'CREATORS', sub: 'Stories, positioning, scripts', color: '#d9744f' },
  { id: 'money', name: 'MONEY', sub: 'FinTech, made watchable', color: '#3e4392' },
  { id: 'learning', name: 'LEARNING & OWN MEDIA', sub: 'EdTech and things I built', color: '#f2a33c' },
]

export const PROJECTS: Project[] = [
  // ---------------------------------------------------------------------------------- AI & TECH
  {
    id: 'playerzero',
    name: 'PlayerZero',
    wing: 'ai',
    source: 'brief',
  },
  {
    id: 'polyai',
    name: 'PolyAI',
    wing: 'ai',
    source: 'brief',
  },
  {
    id: 'fish-audio',
    name: 'Fish Audio',
    wing: 'ai',
    source: 'brief',
  },
  {
    id: 'matic',
    name: 'Matic',
    wing: 'ai',
    source: 'brief',
  },
  {
    id: 'wispr-flow',
    name: 'Wispr Flow',
    wing: 'ai',
    source: 'brief',
  },
  {
    id: 'evolving',
    name: 'Evolving AI',
    wing: 'ai',
    source: 'site',
    logo: '/img/work/evolving.webp',
    headline: '5M+ Views',
    role: 'Creative Director',
    hook: 'Already viral — needed depth, not reinvention.',
    facts: [{ k: 'Situation', v: 'Already viral, but shallow' }],
    story: [
      'Evolving AI already had reach. The founder’s feedback was clear: “The content works, but it lacks nuance.”',
      'My job here wasn’t reinvention - it was depth injection.',
      'I kept the same formats and viral mechanics, but rewrote scripts to:',
      'Essentially, I brought the same nuanced thinking I was using at SaaSFlash, but adapted it to an audience that was already paying attention.',
    ],
    lists: { 2: ['Add clearer arguments', 'Avoid hype-only framing', 'Explain tradeoffs instead of promises'] },
    metrics: ['5M+ Views from 8 Videos', 'Making complex tech accessible', 'Viral AI Narratives'],
    samples: ['https://www.instagram.com/p/DNGciXsN3ur/embed', 'https://www.instagram.com/p/DQMcbqik1QX/embed'],
  },
  {
    id: 'saasflash',
    name: 'SaaSFlash',
    wing: 'ai',
    source: 'site',
    logo: '/img/work/saasflash.webp',
    headline: '30K → 115K',
    role: 'Creative Director',
    hook: 'From a good tech page to one with a point of view.',
    facts: [
      { k: 'Starting point', v: '~30,000 followers' },
      { k: 'Ambition', v: 'Become the most premium tech content agency, not just another growth page' },
    ],
    story: [
      'When I joined SaaSFlash, the page was already “good.” Editing quality was high, topics were relevant, and the team clearly cared about the product. But that was also the problem - it looked like every other good tech page.',
      'What was missing was point of view.',
      'The founders didn’t want SaaSFlash to be a meme page or a repurposing machine. They wanted clients to look at the page and think: “These people actually understand tech at a deep level.”',
      'So my role naturally became less about volume and more about raising the intellectual ceiling of the content. I went deep into tech discourse: SaaS, startups, AI, infra, founders, distribution. Instead of summarizing news, I focused on:',
      'Every trending topic had to earn its place. If we covered it, it needed a clear POV, not just information. I wrote nuanced scripts that assumed the audience was smart and curious, not passive.',
      'Several of the videos I wrote became the most viral pieces on the page, but more importantly, they shaped SaaSFlash’s identity. The page started feeling premium, opinionated, and thoughtful.',
      'That positioning paid off beyond views. Clients started coming in because of the page itself. SaaSFlash closed 5–6 high-quality clients using the content as proof that they weren’t just editors - they were thinkers.',
    ],
    lists: { 3: ['Why a trend exists', 'What people are misunderstanding', 'What this says about where tech is headed'] },
    metrics: ['10M+ Views from 12 Videos', 'Managing team of 8 writers & 20 editors', 'Scaled SaasFlash from 30K to 100K'],
    samples: [
      'https://www.instagram.com/p/DPHjYATEp1t/embed',
      'https://www.instagram.com/p/DN6FoIzD8ux/embed',
      'https://www.instagram.com/p/DMQp_KYsVxH/embed',
      'https://www.instagram.com/p/DLsgQ1rMALV/embed',
      'https://www.instagram.com/p/DKAL5w3sD3k/embed',
    ],
  },
  // ------------------------------------------------------------------------------------ CREATORS
  {
    id: 'greg',
    name: 'Greg Isenberg',
    wing: 'creators',
    source: 'site',
    logo: '/img/work/greg.webp',
    headline: '15K → 78K',
    role: 'Writer / Strategist',
    hook: 'Instagram as a systems problem, not a creator problem.',
    facts: [
      { k: 'Starting point', v: '~15,000 Instagram followers' },
      { k: 'Constraint', v: 'Grow Instagram without Greg being involved' },
    ],
    story: [
      'Greg was already massive on Twitter and YouTube. Instagram was the outlier. He wanted growth there, but without recording content, hopping on calls, or managing the page himself.',
      'So I treated Instagram like a systems problem, not a creator problem.',
      'First, I studied his entire body of work: Twitter threads to understand how he frames ideas, YouTube videos to understand pacing and depth, His recurring mental models around startups, community, and leverage.',
      'Then I asked two questions: What already works that we can adapt? What Instagram-native content is missing?',
      'I built a pipeline where ideas were extracted from Twitter and YouTube, rewritten specifically for Instagram behavior, and turned into motion-first videos. For voice, we used 11Labs, so Greg never had to record anything.',
      'I handled scripting end-to-end. I’d send Greg batches of five scripts, he’d leave comments, I’d refine them, move them into production, review edits, and then share v1 cuts for final input.',
      'This wasn’t random experimentation - it was structured iteration. One of the videos I wrote became the most viral video on his Instagram page. Over time, the page grew from ~15K to ~80K followers, and Instagram became a real extension of his brand rather than an afterthought.',
    ],
    metrics: ['10M+ Views from 12 Videos', 'Grew from 15K to 60K followers', 'Viral Instagram reels'],
    samples: [
      'https://www.instagram.com/p/DKx942YJCeN/embed',
      'https://www.instagram.com/p/DNOMZ4pRntv/embed',
      'https://www.instagram.com/p/DMXv8TgME7M/embed',
    ],
  },
  {
    id: 'den',
    name: 'Den Donovan',
    wing: 'creators',
    source: 'site',
    logo: '/img/work/den.webp',
    headline: '20 Million+ Views',
    role: 'Creative Director',
    hook: 'He didn’t need to be a tech creator. He needed to be a Dubai thought leader.',
    facts: [
      { k: 'Initial brief', v: 'Tech content' },
      { k: 'Reality', v: 'Audience mismatch' },
    ],
    story: [
      'Den initially wanted to create tech content. On paper, it made sense. But after publishing a few videos, I noticed something important: his audience didn’t care.',
      'His audience was largely Dubai/UAE-based, and generic tech takes weren’t resonating at all. Instead of forcing the strategy, I paused and re-evaluated the audience itself.',
      'The insight was simple: Den didn’t need to be a tech creator. He needed to be a Dubai thought leader.',
      'We completely shifted positioning. Instead of tech-first content, we focused on:',
      'Once the page had a clear identity, everything changed. Videos started crossing millions of views, with some touching 5 million+. The audience finally felt like the content was speaking to them, not at them.',
      'This project taught me how important audience-context is - even the best ideas fail if they’re aimed at the wrong people.',
    ],
    lists: { 3: ['How Dubai works', 'Politics and governance', 'Why certain systems succeed', 'Cultural and economic insights'] },
    metrics: ['Grew from 70K to 80K followers', 'Creator economy focus', 'Educational content'],
    samples: [
      'https://www.instagram.com/p/DOoFeiUkyzz/embed',
      'https://www.instagram.com/p/DOJGupBkv79/embed',
      'https://www.instagram.com/p/DMxYM4Vx76c/embed',
    ],
  },
  {
    id: 'sahil',
    name: 'Sahil Gogna',
    wing: 'creators',
    source: 'site',
    logo: '/img/work/sahil.webp',
    headline: '0 → 150K',
    role: 'Writer / Director',
    hook: 'Story first, expertise second.',
    facts: [
      { k: 'Starting point', v: 'Very small audience' },
      { k: 'Breakthrough', v: 'First video crossed 1M+ views' },
    ],
    story: [
      'Sahil was one of those rare cases where the raw material was already there - it just hadn’t been framed properly yet.',
      'He had a real story. He had moved from India to Canada, struggled, figured things out, and had genuine insight into data, careers, and learning. The mistake most people make in situations like this is jumping straight into “educational content.” I didn’t do that.',
      'Instead, I leaned into story first, expertise second. For the first few pieces, I focused almost entirely on:',
      'The first video we published crossed 1 million views. That wasn’t because of clever editing - it was because people connected with the narrative. Once the audience cared about him, the educational content started landing much more naturally. From there, the page grew steadily, eventually reaching ~150K followers. Sahil wasn’t just another data guy anymore - he was a person with a journey, and that made all the difference.',
    ],
    lists: {
      2: ['His move from India to Canada', 'The struggle and uncertainty', 'The contrast between expectations and reality', 'What he learned the hard way'],
    },
    metrics: ['Grew from 480 to 150K followers', 'Created viral Instagram reels', 'Produced educational YouTube content'],
    samples: [
      'https://www.instagram.com/p/C4LNOdOOVg4/embed',
      'https://www.instagram.com/p/C3z_rz2rOLr/embed',
      'https://www.instagram.com/p/DCHKFHBxKXt/embed',
      'https://www.youtube.com/embed/V1g3Ms4bRgc',
    ],
  },
  {
    id: 'keshav',
    name: 'Keshav Grower',
    wing: 'creators',
    source: 'site',
    logo: '/img/work/keshav.webp',
    headline: '15K → 142K',
    role: 'Writer',
    hook: 'From company page to personal brand.',
    story: [
      'Keshav initially hired me to grow his company page. Once results came in, he asked me to work on his personal brand as well.',
      'I noticed a gap no one was serving properly:',
      'I positioned Keshav as the face of that gap. We used DM automation, clear CTAs, and consistent framing to turn attention into growth.',
    ],
    lists: { 1: ['Commerce students', 'Remote job seekers', 'People looking for practical guidance, not motivation'] },
    metrics: ['Growing community of MBA aspirants', 'Engaging educational content', 'Brand building strategy'],
    samples: ['https://www.instagram.com/keshavgrower/embed'],
  },
  // --------------------------------------------------------------------------------------- MONEY
  {
    id: 'zerodha',
    name: 'Markets by Zerodha',
    wing: 'money',
    source: 'site',
    logo: '/img/work/zerodha.webp',
    headline: '30K → 100K',
    role: 'Strategist',
    hook: 'Clarity over hype, every single day.',
    facts: [
      { k: 'Note', v: 'My first account for a large company' },
      { k: 'Format', v: 'Daily long-form scripts' },
      { k: 'Focus', v: 'Clarity over hype' },
    ],
    story: [
      'Markets by Zerodha was very different from everything I’d done before. This wasn’t a creator page or a startup experimenting with formats - this was a large, trusted financial brand.',
      'The requirement was intense. Every day, I had to:',
      'The hardest part wasn’t writing - it was responsibility. The content had to be:',
      'This role forced me to go deep into finance, markets, and macro trends. I learned how to explain complex ideas clearly, without drama or shortcuts. It was demanding, repetitive, and honestly exhausting at times - but it sharpened my ability to research and communicate under pressure.',
    ],
    lists: {
      1: ['Track the biggest financial news', 'Identify the most important 2–3 stories', 'Research them properly', 'Write long-form scripts explaining what happened and why it mattered'],
      2: ['Accurate', 'Neutral', 'Easy enough for beginners', 'But not oversimplified'],
    },
    metrics: ['Grew from 30K to 100K subscribers', 'Simplified trading for beginners', 'Created engaging financial content'],
    samples: ['https://www.youtube.com/embed/gLpyaHLuQVo', 'https://www.youtube.com/embed/Kf0SV7aZXfI'],
  },
  {
    id: 'binge',
    name: 'Binge Wealth',
    wing: 'money',
    source: 'site',
    logo: '/img/work/binge.webp',
    headline: '20K → 150K',
    role: 'Strategist',
    hook: 'Finance you can watch without feeling dumb.',
    facts: [
      { k: 'Note', v: 'My first finance-focused page' },
      { k: 'Growth', v: '~20K → ~150K (when I left)' },
    ],
    story: [
      'Finance content is tricky because it can very easily become boring, intimidating, or spammy. When I joined Binge Wealth, my role was to make finance watchable without making it irresponsible.',
      'I spent a lot of time tracking:',
      'My job was essentially translation. Every trend, update, or concept had to be broken down into something:',
      'We leaned heavily into trending topics, but always framed them around everyday impact rather than jargon. Over time, this approach helped the page grow rapidly. By the time I left, Binge Wealth had crossed ~150,000 followers and continued growing after.',
    ],
    lists: {
      1: ['What financial news people were already reacting to', 'Which topics created anxiety or curiosity', 'What formats made people actually stay till the end'],
      2: ['Simple', 'Relatable', 'Slightly entertaining', 'But still accurate'],
    },
    metrics: ['Grew from 20K to 150K followers', 'Financial storytelling meets lifestyle', 'Created engaging Instagram content'],
    samples: ['https://www.instagram.com/p/DFIYngSzJhb/embed', 'https://www.instagram.com/p/DDZiMrJTW-J/embed'],
  },
  // ------------------------------------------------------------------------ LEARNING & OWN MEDIA
  {
    id: 'gfg',
    name: 'GeeksforGeeks',
    wing: 'learning',
    source: 'site',
    logo: '/img/work/gfg.webp',
    headline: '400K → 1.1 Million',
    role: 'Content Strategist',
    hook: 'They were still making content like it was 2017.',
    facts: [
      { k: 'Starting point', v: '~400K subscribers, ~2K views' },
      { k: 'Problem', v: 'Weak hooks, no trends, no personality' },
      { k: 'Solution', v: 'Trend analysis, script hooks, storytelling' },
    ],
    story: [
      'This was my first big brand project - and the most challenging. Despite having a huge subscriber base, GeeksforGeeks couldn’t get views. The problem wasn’t content quality; it was mindset. They were still making content like it was 2017.',
      'I did competitive analysis, identified working formats, and helped build:',
      'Once we doubled down on what worked, growth followed - both in shorts and long-form.',
    ],
    lists: { 1: ['Strong short-form hooks', 'Repeatable IPs', 'Better pacing for modern platforms'] },
    metrics: ['Achieved 1.1M+ subscribers', 'Implemented trend-based content strategy', 'Created viral shorts and long-form content'],
    samples: [
      'https://www.youtube.com/embed/cC8MjoYGedk',
      'https://www.youtube.com/embed/9yBY0BOZhUE',
      'https://www.youtube.com/embed/tiFIf_nUCZc',
      'https://www.youtube.com/embed/wn0btNJ65ws',
      'https://www.youtube.com/embed/EFNScX1e14o',
    ],
  },
  {
    id: 'beyond',
    name: 'Beyond Degree',
    wing: 'learning',
    source: 'site',
    logo: '/img/work/beyond.webp',
    headline: '0 → 30K Views',
    role: 'Creative Strategist',
    hook: 'Everything formal education doesn’t teach.',
    facts: [{ k: 'First video', v: '~1.5M views' }],
    story: [
      'This project mattered because it aligned with my own beliefs. Marwadi University wanted an education page. I didn’t want to build another “degree = success” account. Instead, I positioned Beyond Degree around everything formal education doesn’t teach - skills, curiosity, and learning through real-world exposure.',
      'I took inspiration from pages like Sei Com Sei, but added humor and cultural context. The very first video crossed ~1.5 million views, instantly validating the positioning.',
    ],
    metrics: ['Building an EdTech media brand', 'Focus on student narratives', 'Innovative content formats'],
    samples: [
      'https://www.instagram.com/reel/DMIQRbaMH9b/embed',
      'https://www.instagram.com/reel/DQotgn-gS63/embed',
      'https://www.instagram.com/reel/DSQVeHxk90s/embed',
    ],
    link: { label: 'View on Instagram', href: 'https://www.instagram.com/beyonddegree.ig/' },
  },
  {
    id: 'june',
    name: 'June & Lochan',
    wing: 'learning',
    source: 'site',
    logo: '/img/work/june.webp',
    headline: '0 → 300K',
    role: 'Co-Creator',
    hook: 'A cult community, built from scratch.',
    facts: [{ k: 'Personal project', v: '0 → 50K in under a month' }],
    story: [
      'This was deeply personal. I’d always wanted to talk about India - its politics, systems, contradictions - but I never wanted to be the face of the page. I was already overloaded with work and more comfortable behind the scenes.',
      'So my girlfriend became the face, and I handled everything else: positioning, ideation, scripting.',
      'We focused on topics people were already emotionally invested in, but framed them thoughtfully instead of sensationally. The response was immediate. The page hit 50,000 followers in under a month, proving that the ideas resonated when packaged correctly.',
    ],
    metrics: ['Grew from 0 to 300K in just 4 month', 'Personal brand storytelling', 'Authentic creative content'],
    samples: ['https://www.instagram.com/reel/DTozi9KgVN7/embed', 'https://www.instagram.com/reel/DTqDpAVgX3D/embed'],
    link: { label: 'View on Instagram', href: 'https://www.instagram.com/juneandlochan/' },
  },
]

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)
export const projectsByWing = (w: Wing) => PROJECTS.filter((p) => p.wing === w)
