import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { quality } from '../engine/quality'
import { store } from '../engine/store'

const debug = new URLSearchParams(location.search).has('debug')

/**
 * Keeps the frame rate healthy on whatever device this lands on: if a couple of seconds of play average below
 * ~42 fps the resolution steps down a notch; if there is plenty of headroom for a long while it creeps back up.
 */
export function PerfGovernor() {
  const setDpr = useThree((s) => s.setDpr)
  const a = useRef({ t: 0, frames: 0, level: 0, calm: 0, ladder: [] as number[] })
  useFrame((_, dt) => {
    if (debug || store.getState().phase !== 'playing') return
    const s = a.current
    if (!s.ladder.length) {
      const top = Math.min(window.devicePixelRatio || 1, quality.dpr)
      s.ladder = [top, 1.5, 1.25, 1, 0.85].filter((v, i) => i === 0 || v < top)
    }
    if (dt > 0.4) return // tab was hidden / a shader compile hitch: not a real measurement
    s.t += dt
    s.frames++
    if (s.t < 2.2) return
    const fps = s.frames / s.t
    s.t = 0
    s.frames = 0
    if (fps < 42 && s.level < s.ladder.length - 1) {
      s.level++
      s.calm = 0
      setDpr(s.ladder[s.level])
    } else if (fps > 57 && s.level > 0) {
      if (++s.calm >= 6) {
        s.level--
        s.calm = 0
        setDpr(s.ladder[s.level])
      }
    } else s.calm = 0
  })
  return null
}
