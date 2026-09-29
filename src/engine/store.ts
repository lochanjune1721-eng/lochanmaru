// Discrete UI/game state (things React needs to re-render for). Per-frame data lives in `game`/`player`.
import { create } from 'zustand'

export type InteriorId = 'home' | 'experience' | 'work' | 'results' | 'hire'
export type Phase = 'loading' | 'intro' | 'starting' | 'playing'

// ---- panel content model (rendered by ui/Panel.tsx) ----------------------------------------------
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
  interior: InteriorId | null
  prompt: { label: string; title?: string; key: string; kind: string } | null
  panel: PanelContent | null
  visited: Partial<Record<InteriorId, boolean>>
  secrets: string[]
  audioOn: boolean
  touch: boolean
  toast: Toast | null
  hint: string | null
  nearPoi: InteriorId | null
  helpOpen: boolean

  set: (p: Partial<State>) => void
  setProgress: (p: number, label?: string) => void
  markVisited: (id: InteriorId) => void
  addSecret: (id: string) => boolean
  showToast: (text: string, kind?: Toast['kind']) => void
  openPanel: (p: PanelContent) => void
  closePanel: () => void
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

export const useStore = create<State>((set, get) => ({
  phase: 'loading',
  loadProgress: 0,
  loadLabel: 'Warming up the sun',
  interior: null,
  prompt: null,
  panel: null,
  visited: {},
  secrets: [],
  audioOn: savedAudio,
  touch: typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches,
  toast: null,
  hint: null,
  nearPoi: null,
  helpOpen: false,

  set: (p) => set(p),
  setProgress: (p, label) => set({ loadProgress: Math.max(get().loadProgress, p), ...(label ? { loadLabel: label } : {}) }),
  markVisited: (id) => {
    if (!get().visited[id]) set({ visited: { ...get().visited, [id]: true } })
  },
  addSecret: (id) => {
    if (get().secrets.includes(id)) return false
    set({ secrets: [...get().secrets, id] })
    return true
  },
  showToast: (text, kind = 'info') => {
    clearTimeout(toastTimer)
    set({ toast: { id: ++toastId, text, kind } })
    toastTimer = setTimeout(() => set({ toast: null }), 4200)
  },
  openPanel: (p) => set({ panel: p }),
  closePanel: () => set({ panel: null }),
}))

export const store = useStore
