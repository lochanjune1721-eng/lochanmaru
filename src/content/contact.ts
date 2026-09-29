// HIRE LOCHAN — the four doors named in the brief, plus every contact link that exists on the current site.
import { LINKS, mailFor } from './site'

export interface Door {
  id: string
  label: string
  line: string
  href: string
  color: string
}

// One-liners describe the service *category* the owner named; no client claims are made here.
export const DOORS: Door[] = [
  { id: 'direction', label: 'CREATIVE DIRECTION', line: 'A point of view, a voice, and scripts that carry both.', href: mailFor('Creative direction — let’s talk'), color: '#d9744f' },
  { id: 'launch', label: 'LAUNCH STRATEGY', line: 'How a brand shows up, day one and beyond.', href: mailFor('Launch strategy — let’s talk'), color: '#2f9591' },
  { id: 'content', label: 'CONTENT', line: 'Hooks, stories and formats that stop the scroll.', href: mailFor('Content — let’s talk'), color: '#f2a33c' },
  { id: 'distribution', label: 'DISTRIBUTION', line: 'Getting the right people to actually see it.', href: mailFor('Distribution — let’s talk'), color: '#3e4392' },
]

export interface Channel {
  id: string
  label: string
  value: string
  href: string
}

export const CHANNELS: Channel[] = [
  { id: 'email', label: 'Email', value: LINKS.email, href: LINKS.emailCompose },
  ...(LINKS.x ? [{ id: 'x', label: 'X', value: 'X', href: LINKS.x }] : []),
  { id: 'linkedin', label: 'LinkedIn', value: 'lochan-maru', href: LINKS.linkedin },
  { id: 'instagram', label: 'Instagram', value: LINKS.instagramHandle, href: LINKS.instagram },
  { id: 'phone', label: 'Phone', value: LINKS.phone, href: LINKS.phoneHref },
  { id: 'resume', label: 'Resume', value: 'View résumé', href: LINKS.resume },
]

export const CLOSER = 'Let’s build something people can’t ignore.'
