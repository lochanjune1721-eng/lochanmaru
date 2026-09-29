import { useEffect } from 'react'
import { useStore } from '../engine/store'

export function Help() {
  const open = useStore((s) => s.helpOpen)
  const touch = useStore((s) => s.touch)
  const set = useStore((s) => s.set)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') set({ helpOpen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, set])
  return (
    <div className={`help ${open ? 'show' : ''}`} role="dialog" aria-label="Controls" aria-hidden={!open}>
      <h3>How to get around</h3>
      {touch ? (
        <dl>
          <dt>Left thumb</dt>
          <dd>Walk</dd>
          <dt>Right thumb</dt>
          <dd>Look around</dd>
          <dt>Tap a building</dt>
          <dd>Open its page</dd>
          <dt>Round button</dt>
          <dd>Open, read, poke — whatever’s near</dd>
        </dl>
      ) : (
        <dl>
          <dt>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
          </dt>
          <dd>Walk (arrow keys work too)</dd>
          <dt>
            <kbd>Shift</kbd>
          </dt>
          <dd>Hurry up a little</dd>
          <dt>Drag / scroll</dt>
          <dd>Look around / zoom</dd>
          <dt>Click a building</dt>
          <dd>Open its page</dd>
          <dt>
            <kbd>E</kbd>
          </dt>
          <dd>Open, read, poke — whatever’s near</dd>
          <dt>
            <kbd>Esc</kbd>
          </dt>
          <dd>Close the page (← → hop between buildings)</dd>
          <dt>
            <kbd>M</kbd>
          </dt>
          <dd>Sound on / off</dd>
        </dl>
      )}
      <div className="lnk">
        <button onClick={() => set({ helpOpen: false })}>Got it</button>
        <button
          onClick={() => {
            set({ helpOpen: false, textOpen: true })
          }}
        >
          Read the text version
        </button>
      </div>
    </div>
  )
}
