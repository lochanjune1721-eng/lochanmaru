// RESULTS — the scale of the work.
// `BIG` are the headline numbers exactly as the owner listed them in the redesign brief (label + figure).
// `PROOF` are figures carried over verbatim from the existing site's case studies (with their attribution).
import type { Source } from './site'

export interface Big {
  id: string
  value: string
  num: number
  suffix: string
  label: string
  source: Source
}

export const BIG: Big[] = [
  { id: 'views300', value: '300M+', num: 300, suffix: 'M+', label: 'VIEWS', source: 'brief' },
  { id: 'reach1b', value: '1B+', num: 1, suffix: 'B+', label: 'ACCOUNTS REACHED', source: 'brief' },
  { id: 'community5', value: '5M+', num: 5, suffix: 'M+', label: 'COMMUNITY', source: 'brief' },
  { id: 'imp27', value: '2.7M+', num: 2.7, suffix: 'M+', label: 'IMPRESSIONS', source: 'brief' },
  { id: 'imp34', value: '3.4M+', num: 3.4, suffix: 'M+', label: 'IMPRESSIONS', source: 'brief' },
  { id: 'imp5', value: '5M+', num: 5, suffix: 'M+', label: 'IMPRESSIONS', source: 'brief' },
  { id: 'views10', value: '10M+', num: 10, suffix: 'M+', label: 'VIEWS', source: 'brief' },
]

export interface Proof {
  id: string
  value: string
  label: string
  who: string
  projectId?: string
}

export const PROOF: Proof[] = [
  { id: 'p-saas', value: '10M+', label: 'Views from 12 videos', who: 'SaaSFlash', projectId: 'saasflash' },
  { id: 'p-den', value: '20M+', label: 'Views', who: 'Den Donovan', projectId: 'den' },
  { id: 'p-evolving', value: '5M+', label: 'Views from 8 videos', who: 'Evolving AI', projectId: 'evolving' },
  { id: 'p-gfg', value: '1.1M', label: 'Subscribers (from 400K)', who: 'GeeksforGeeks', projectId: 'gfg' },
  { id: 'p-june', value: '300K', label: 'Followers in 4 months', who: 'June & Lochan', projectId: 'june' },
  { id: 'p-keshav', value: '142K', label: 'Followers (from 15K)', who: 'Keshav Grower', projectId: 'keshav' },
  { id: 'p-sahil', value: '150K', label: 'Followers (from 480)', who: 'Sahil Gogna', projectId: 'sahil' },
  { id: 'p-binge', value: '150K', label: 'Followers (from 20K)', who: 'Binge Wealth', projectId: 'binge' },
  { id: 'p-zerodha', value: '100K', label: 'Subscribers (from 30K)', who: 'Markets by Zerodha', projectId: 'zerodha' },
  { id: 'p-beyond', value: '1.5M', label: 'Views on the first video', who: 'Beyond Degree', projectId: 'beyond' },
  { id: 'p-brands', value: '30+', label: 'Brands scaled', who: 'AI · FinTech · EdTech · Politics' },
  { id: 'p-team', value: '8 + 20', label: 'Writers & editors led', who: 'SaaSFlash' },
]
