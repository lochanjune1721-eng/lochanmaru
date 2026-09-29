import { useEffect } from 'react'
import { SECRETS } from '../content/secrets'
import { audio } from '../engine/audio'
import { openPage } from '../engine/places'
import { useStore } from '../engine/store'
import { input } from '../engine/input'
import { PAGES, PageGlyph } from './pages/meta'
import { vars } from './pages/parts'

export function toggleSound() {
  const st = useStore.getState()
  const on = !st.audioOn
  st.set({ audioOn: on })
  audio.setEnabled(on)
  audio.ui('tick')
  try {
    localStorage.setItem('lw:audio', on ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Minimal in-game HUD: five dots for the places, sound, help, hint and toast. */
export function Hud() {
  const phase = useStore((s) => s.phase)
  const visited = useStore((s) => s.visited)
  const secrets = useStore((s) => s.secrets)
  const audioOn = useStore((s) => s.audioOn)
  const hint = useStore((s) => s.hint)
  const toast = useStore((s) => s.toast)
  const touch = useStore((s) => s.touch)
  const page = useStore((s) => s.page)
  const set = useStore((s) => s.set)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' && !e.repeat) toggleSound()
      if ((e.code === 'KeyH' || e.key === '?') && !e.repeat) set({ helpOpen: !useStore.getState().helpOpen })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [set])

  // dismiss the controls hint on first real movement
  useEffect(() => {
    if (hint !== 'controls') return
    const t = setInterval(() => {
      if (input.keys.size > 2 || input.stick.lengthSq() > 0.2) set({ hint: null })
    }, 800)
    return () => clearInterval(t)
  }, [hint, set])

  if (phase === 'loading' || phase === 'starting') return null
  const n = PAGES.filter((p) => visited[p.id]).length
  return (
    <>
      {phase === 'playing' && (
        <>
          <div className="hud-tl">
            <div className="wordmark">Lochan’s World</div>
            <nav className="dots" aria-label={`Places — ${n} of 5 visited`}>
              {PAGES.map((p) => (
                <button
                  key={p.id}
                  className={`${visited[p.id] ? 'seen' : ''} ${page === p.id ? 'on' : ''}`}
                  style={vars({ '--c': p.color, '--on': p.on })}
                  title={p.label}
                  aria-label={`Open ${p.name}`}
                  onClick={() => openPage(p.id)}
                >
                  <PageGlyph id={p.id} size={14} />
                </button>
              ))}
              {secrets.length > 0 && (
                <b title="Little secrets found">
                  ✦ {secrets.length}/{SECRETS.length}
                </b>
              )}
            </nav>
          </div>
          {hint === 'controls' && !page && (
            <div className="hint">
              {touch ? (
                <>Left thumb to walk · right to look · tap a building to open it</>
              ) : (
                <>
                  <kbd>W</kbd>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd> walk · drag to look · click a building to open it
                </>
              )}
            </div>
          )}
        </>
      )}
      <div className="hud-tr">
        <button className={`chip ${audioOn ? 'on' : ''}`} onClick={toggleSound} aria-label={audioOn ? 'Mute sound' : 'Turn sound on'} aria-pressed={audioOn} title="Sound (M)">
          <svg viewBox="0 0 24 24">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            {audioOn ? <path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
          </svg>
        </button>
        {phase === 'playing' && (
          <button className="chip" onClick={() => set({ helpOpen: true })} aria-label="Help and controls" title="Help (H)">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.6 2.6 0 015 .9c0 1.7-2.5 2-2.5 3.6M12 17h.01" />
            </svg>
          </button>
        )}
      </div>
      {toast && (
        <div className="toast" key={toast.id} role="status">
          {toast.kind === 'secret' && <span className="star">✦</span>}
          <div>
            {toast.kind === 'secret' && <small>Secret found · {secrets.length}/{SECRETS.length}</small>}
            {toast.text}
          </div>
        </div>
      )}
    </>
  )
}
