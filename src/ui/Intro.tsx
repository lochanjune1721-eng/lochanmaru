import { useEffect } from 'react'
import { startJourney } from '../engine/journey'
import { audio } from '../engine/audio'
import { useStore } from '../engine/store'
import { SITE } from '../content/site'

/** The first moment: a tiny world, a question, one button. */
export function Intro() {
  const phase = useStore((s) => s.phase)
  const audioOn = useStore((s) => s.audioOn)
  const set = useStore((s) => s.set)

  useEffect(() => {
    if (phase !== 'intro') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        startJourney()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  if (phase === 'loading') return null
  const out = phase !== 'intro'
  return (
    <div className={`intro ${out ? 'out' : ''}`} inert={out || undefined} aria-hidden={out || undefined}>
      <div className="kicker">{SITE.name} · a tiny world</div>
      <h1>
        WHO AM I<em>?</em>
      </h1>
      <div className="roles">
        {SITE.roles[0]}
        <span>·</span>
        {SITE.roles[1]}
        <span>·</span>
        {SITE.roles[2]}
      </div>
      <button className="start" onClick={() => startJourney()} disabled={out}>
        START THE JOURNEY
        <span className="arrow">→</span>
      </button>
      <div className="sub">
        <button
          className={audioOn ? 'on' : ''}
          onClick={() => {
            const on = !audioOn
            set({ audioOn: on })
            audio.setEnabled(on)
            audio.ui('tick')
            try {
              localStorage.setItem('lw:audio', on ? '1' : '0')
            } catch {
              /* ignore */
            }
          }}
          aria-pressed={audioOn}
        >
          {audioOn ? '♪ sound on' : '♪ sound off'}
        </button>
        <span>walk · look · discover</span>
        <button onClick={() => set({ textOpen: true })}>text version</button>
      </div>
    </div>
  )
}
