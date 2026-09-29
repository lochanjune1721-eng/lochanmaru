import type { PlaceId } from '../../engine/store'

export interface PageMeta {
  id: PlaceId
  /** the sign on the building */
  label: string
  /** how it reads in running text */
  name: string
  color: string
  /** text colour that reads on `color` */
  on: string
  /** pastel wash behind the page's hero */
  tint: string
}

export const PAGES: PageMeta[] = [
  { id: 'home', label: 'WHO AM I', name: 'Who am I', color: '#f2a33c', on: '#2b2438', tint: '#f6d9a2' },
  { id: 'experience', label: 'EXPERIENCE', name: 'Experience', color: '#2f9591', on: '#fff8ea', tint: '#bfe2d9' },
  { id: 'work', label: 'WORK', name: 'Work', color: '#e2493f', on: '#fff8ea', tint: '#f6c3b4' },
  { id: 'results', label: 'RESULTS', name: 'Results', color: '#3e4392', on: '#fff8ea', tint: '#cbd0f2' },
  { id: 'hire', label: 'HIRE LOCHAN', name: 'Hire Lochan', color: '#e2493f', on: '#fff8ea', tint: '#f6c3b4' },
]

export const pageMeta = (id: PlaceId) => PAGES.find((p) => p.id === id)!

/** One simple line icon per building. */
export function PageGlyph({ id, size = 20 }: { id: PlaceId; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  switch (id) {
    case 'home':
      return (
        <svg {...p}>
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6 10.5V19h12v-8.5" />
          <path d="M10 19v-4.5h4V19" />
        </svg>
      )
    case 'experience':
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      )
    case 'work':
      return (
        <svg {...p}>
          <rect x="3.5" y="9" width="17" height="10.5" rx="2" />
          <path d="m4 9 1.8-4.6 3 .9L7 9.6M10.2 9l1.8-4.6 3 .9L13.2 9.6M16.4 9l1.8-4.6 2.8.8" />
        </svg>
      )
    case 'results':
      return (
        <svg {...p}>
          <path d="M5 19v-6M12 19V6M19 19v-9" />
          <path d="M3 19.5h18" />
        </svg>
      )
    case 'hire':
      return (
        <svg {...p}>
          <rect x="3.5" y="6" width="17" height="12.5" rx="2" />
          <path d="m4 8 8 5.5L20 8" />
        </svg>
      )
  }
}
