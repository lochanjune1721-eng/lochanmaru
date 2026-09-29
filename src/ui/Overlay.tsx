import { useEffect } from 'react'
import { closePage, setSection } from '../engine/places'
import { useStore } from '../engine/store'
import { Fallback } from './Fallback'
import { Help } from './Help'
import { Hud } from './Hud'
import { Intro } from './Intro'
import { Loader } from './Loader'
import { Pages } from './Pages'
import { PlaceTags } from './PlaceTags'
import { ActionButton, Prompt } from './Prompt'
import { Radar } from './Radar'

/** Everything that floats above the 3D world. */
export function Overlay() {
  const phase = useStore((s) => s.phase)
  const page = useStore((s) => s.page)
  const textOpen = useStore((s) => s.textOpen)

  // Escape puts away one thing at a time, topmost first: the text version, the help card, a case study / chapter, the page.
  // (capture phase, so nothing else reacts to the same key press)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Escape') return
      const st = useStore.getState()
      if (st.textOpen) st.set({ textOpen: false })
      else if (st.helpOpen) st.set({ helpOpen: false })
      else if (st.page && !e.repeat) {
        if (st.pageSection && (st.page === 'work' || st.page === 'experience')) setSection(null)
        else closePage()
      } else return
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <>
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      <div className={`ui ${page ? 'paged' : ''}`}>
        <Hud />
        <PlaceTags />
        <Prompt />
        {phase === 'playing' && <ActionButton />}
        {phase === 'playing' && !page && <Radar />}
        <Intro />
        <Pages />
        <Help />
      </div>
      <Loader />
      {textOpen && <Fallback />}
      <a
        className="skip"
        href="#text"
        onClick={(e) => {
          e.preventDefault()
          useStore.getState().set({ textOpen: true })
        }}
      >
        Read the text version
      </a>
    </>
  )
}
