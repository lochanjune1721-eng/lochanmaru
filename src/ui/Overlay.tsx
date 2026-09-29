import { useEffect } from 'react'
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        const st = useStore.getState()
        if (st.textOpen) st.set({ textOpen: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
