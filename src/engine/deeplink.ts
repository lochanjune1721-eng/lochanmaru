// Shareable links: the address bar mirrors the open page (#/work, #/work/gfg, #/hire/contact) and opening the site with
// one of those addresses lands on that page once the intro is over. Uses replaceState, so Back still leaves the site.
import { closePage, openPage, PLACE_ORDER } from './places'
import { PlaceId, store } from './store'

export function parseHash(h = location.hash): { id: PlaceId; section?: string } | null {
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (!parts.length || !PLACE_ORDER.includes(parts[0] as PlaceId)) return null
  let section: string | undefined
  try {
    section = parts[1] ? decodeURIComponent(parts[1]) : undefined
  } catch {
    section = undefined
  }
  return { id: parts[0] as PlaceId, section }
}

/** Open whatever the address asks for (called when the visitor is dropped into the world). */
export function openFromHash() {
  const d = parseHash()
  if (d) openPage(d.id, d.section)
}

export function installDeepLinks() {
  const unsub = store.subscribe((s, p) => {
    if (s.page === p.page && s.pageSection === p.pageSection) return
    try {
      const hash = s.page ? `#/${s.page}${s.pageSection ? `/${encodeURIComponent(s.pageSection)}` : ''}` : ''
      history.replaceState(null, '', location.pathname + location.search + hash)
    } catch {
      /* sandboxed frames etc. */
    }
  })
  const onHash = () => {
    if (store.getState().phase !== 'playing') return
    const d = parseHash()
    if (d) openPage(d.id, d.section)
    else if (store.getState().page) closePage()
  }
  window.addEventListener('hashchange', onHash)
  return () => {
    unsub()
    window.removeEventListener('hashchange', onHash)
  }
}
