// Identity + links. Source of truth: the existing portfolio (repo `index.html`) and the owner's brief.
//
// Provenance tags used across /content:
//   'site'  = text/numbers carried over from the existing portfolio site
//   'brief' = names/metrics the owner typed in the redesign brief (details not on hand — kept name-only)

export type Source = 'site' | 'brief'

export const SITE = {
  name: 'Lochan Maheshwari',
  first: 'Lochan',
  roles: ['Creative Director', 'Strategist', 'Builder'],
  tagline: 'I turn ideas into stories that make an impact.',
  description:
    "Lochan Maheshwari's portfolio, as a tiny explorable world. Creative Director, Strategist and Builder — scaling brands across AI, FinTech, EdTech and Politics.",
} as const

export const LINKS = {
  email: 'lochanmaheshwari23@gmail.com',
  emailCompose: 'https://mail.google.com/mail/?view=cm&fs=1&to=lochanmaheshwari23@gmail.com',
  mailto: 'mailto:lochanmaheshwari23@gmail.com',
  phone: '+91 70623 39465',
  phoneHref: 'tel:+917062339465',
  linkedin: 'https://www.linkedin.com/in/lochan-maru/',
  instagram: 'https://www.instagram.com/juneandlochan/',
  instagramHandle: '@juneandlochan',
  resume: 'https://drive.google.com/file/d/1FsxVUclnouJlpw6jxQ5xdgmTo2bZs3ag/view?usp=sharing',
  /** X / Twitter: listed in the brief but the handle isn't in the repo — fill in `content/site.ts` to enable the X door. */
  x: '' as string,
} as const

/** Compose-mail link with a pre-filled subject, so each "door" starts the right conversation. */
export const mailFor = (subject: string) =>
  `${LINKS.emailCompose}&su=${encodeURIComponent(subject)}`
