// A minimal event bus so audio, particles and UI can react to gameplay without importing each other.
type Handler = (...args: any[]) => void
const map = new Map<string, Set<Handler>>()

export const bus = {
  on(evt: string, h: Handler) {
    let s = map.get(evt)
    if (!s) map.set(evt, (s = new Set()))
    s.add(h)
    return () => {
      s!.delete(h)
    }
  },
  emit(evt: string, ...args: any[]) {
    const s = map.get(evt)
    if (s) for (const h of s) h(...args)
  },
}
