// Per-frame interaction logic: nearest interactable -> prompt, use key, pointer hover/click, glance.
import { PerspectiveCamera, Vector3 } from 'three'
import { bus } from './bus'
import { game } from './game'
import { input } from './input'
import { findNearest, Interactable } from './interact'
import { player } from './state'
import { store } from './store'

const _p = new Vector3()

export const hover = { item: null as Interactable | null, x: 0, y: 0 }
export const current = { item: null as Interactable | null, dist: 0 }

function scope() {
  return game.mode === 'world' ? 'world' : store.getState().interior ?? 'world'
}

/** Screen-space pick against interactable anchors (cheap and forgiving). */
function pick(camera: PerspectiveCamera, sx: number, sy: number): Interactable | null {
  const w = window.innerWidth
  const h = window.innerHeight
  let best: Interactable | null = null
  let bestD = 56
  const sc = scope()
  for (const i of currentPool) {
    if (i.scope !== sc) continue
    if (i.active && !i.active()) continue
    _p.copy(i.anchor).project(camera)
    if (_p.z > 1) continue
    const px = (_p.x * 0.5 + 0.5) * w
    const py = (-_p.y * 0.5 + 0.5) * h
    const d = Math.hypot(px - sx, py - sy)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

import { registry } from './interact'
const currentPool = registry

export function updateInteractions(dt: number, camera: PerspectiveCamera) {
  const st = store.getState()
  const playing = st.phase === 'playing' && !st.panel && input.enabled
  const sc = scope()

  // nearest usable
  let found = playing && !player.frozen ? findNearest(player.pos, sc, player.up) : null
  const prev = current.item
  current.item = found ? found.item : null
  current.dist = found ? found.dist : 0
  if (found) found.item.onNear?.(found.dist)
  if (prev !== current.item) {
    if (current.item) {
      const it = current.item
      store.getState().set({ prompt: { label: it.label, title: it.title, key: st.touch ? 'TAP' : 'E', kind: it.kind } })
      player.glance = it.look ?? it.anchor
      bus.emit('prompt', it)
    } else {
      store.getState().set({ prompt: null })
      player.glance = null
    }
  }

  // pointer hover + click
  if (input.hoverX >= 0 && playing) {
    const h = pick(camera, input.hoverX, input.hoverY)
    hover.item = h
    document.body.style.cursor = h ? 'pointer' : ''
  } else {
    hover.item = null
    if (document.body.style.cursor === 'pointer') document.body.style.cursor = ''
  }
  if (input.clickX >= 0) {
    const cx = input.clickX
    const cy = input.clickY
    input.clickX = -1
    input.clickY = -1
    if (playing) {
      const c = pick(camera, cx, cy)
      if (c) {
        if (current.item === c) {
          use(c)
        } else {
          // too far: walk there
          _p.copy(c.anchor)
          player.autoTarget = _p.clone()
          bus.emit('walk-to', c)
        }
      }
    }
  }

  // use key
  if (input.interact) {
    input.interact = false
    if (playing && current.item) use(current.item)
  }
}

export function use(i: Interactable) {
  player.autoTarget = null
  bus.emit('use', i)
  i.onUse()
}
