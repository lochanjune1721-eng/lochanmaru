// Discrete UI/game state (things React needs to re-render for). Per-frame data lives in `game`/`player`.
import { create } from 'zustand'

export type PlaceId = 'home' | 'experience' | 'work' | 'results' | 'hire'
export type Phase = 'loading' | 'intro' | 'starting' | 'playing'

// ---- content block model (rendered by ui/Blocks.tsx) ------------------------------------------------
export type Block =
  | { t: 'p'; text: string }
  | { t: 'lead'; text: string }
  | { t: 'list'; title?: string; items: string[] }
  | { t: 'metrics'; items: { value: string; label: string }[] }
  | { t: 'facts'; items: { k: string; v: string }[] }
  | { t: 'quote'; text: string; by?: string }
  | { t: 'links'; items: { label: string; href: string; note?: string }[] }
  | { t: 'embeds'; title?: string; urls: string[] }
  | { t: 'image'; src: string; alt: string; round?: boolean }
  | { t: 'tags'; items: string[] }

export interface PanelContent {
  id: string
  kicker?: string
  title: string
  subtitle?: string
  accent?: string
  image?: { src: string; alt: string }
  blocks: Block[]
}

export interface Toast {
  id: number
  text: string
  kind?: 'secret' | 'info'
}

interface State {
  phase: Phase
  loadProgress: number
  loadLabel: string
  /** the building whose page is open (null = walking around) */
  page: PlaceId | null
  /** optional deep link inside the page (a chapter id, a project id …) */
  pageSection: string | null
  prompt: { label: string; title?: string; key: string; kind: string } | null
  visited: Partial<Record<PlaceId, boolean>>
  secrets: string[]
  audioOn: boolean
  touch: boolean
  toast: Toast | null
  hint: string | null
  /** the building under the pointer */
  hoverPlace: PlaceId | null
  helpOpen: boolean
  textOpen: boolean

  set: (p: Partial<State>) => void
  setProgress: (p: number, label?: string) => void
  markVisited: (id: PlaceId) => void
  addSecret: (id: string) => boolean
  showToast: (text: string, kind?: Toast['kind']) => void
}

let toastId = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

const savedAudio = (() => {
  try {
    return localStorage.getItem('lw:audio') === '1'
  } catch {
    return false
  }
})()

// The little bit of progress worth remembering between visits: which places and secrets have been found.
const saved = (() => {
  try {
    const j = JSON.parse(localStorage.getItem('lw:save') || '{}')
    return {
      visited: (j.visited && typeof j.visited === 'object' ? j.visited : {}) as Partial<Record<PlaceId, boolean>>,
      secrets: (Array.isArray(j.secrets) ? j.secrets.filter((x: unknown) => typeof x === 'string') : []) as string[],
    }
  } catch {
    return { visited: {}, secrets: [] as string[] }
  }
})()
const persist = (visited: State['visited'], secrets: string[]) => {
  try {
    localStorage.setItem('lw:save', JSON.stringify({ visited, secrets }))
  } catch {
    /* private mode etc. */
  }
}

export const useStore = create<State>((set, get) => ({
  phase: 'loading',
  loadProgress: 0,
  loadLabel: 'Warming up the sun',
  page: null,
  pageSection: null,
  prompt: null,
  visited: saved.visited,
  secrets: saved.secrets,
  audioOn: savedAudio,
  touch: typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches,
  toast: null,
  hint: null,
  hoverPlace: null,
  helpOpen: false,
  textOpen: false,

  set: (p) => set(p),
  setProgress: (p, label) => set({ loadProgress: Math.max(get().loadProgress, p), ...(label ? { loadLabel: label } : {}) }),
  markVisited: (id) => {
    if (!get().visited[id]) {
      const visited = { ...get().visited, [id]: true }
      set({ visited })
      persist(visited, get().secrets)
    }
  },
  addSecret: (id) => {
    if (get().secrets.includes(id)) return false
    const secrets = [...get().secrets, id]
    set({ secrets })
    persist(get().visited, secrets)
    return true
  },
  showToast: (text, kind = 'info') => {
    clearTimeout(toastTimer)
    set({ toast: { id: ++toastId, text, kind } })
    toastTimer = setTimeout(() => set({ toast: null }), 4200)
  },
}))

export const store = useStore
