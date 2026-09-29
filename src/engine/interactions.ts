// Per-frame interaction logic: nearest interactable -> prompt, use key, pointer hover/click on things and buildings.
import { PerspectiveCamera, Vector3 } from 'three'
import { bus } from './bus'
import { game } from './game'
import { input } from './input'
import { findNearest, Interactable, registry } from './interact'
import { pickPlaceAt } from './pick'
import { closePage, openPage } from './places'
import { player } from './state'
import { store } from './store'

const _p = new Vector3()

export const hover = { item: null as Interactable | null, x: 0, y: 0 }
export const current = { item: null as Interactable | null, dist: 0 }

/** Screen-space pick against interactable anchors (cheap and forgiving). Doors are handled by the building itself. */
function pick(camera: PerspectiveCamera, sx: number, sy: number): Interactable | null {
  const w = window.innerWidth
  const h = window.innerHeight
  let best: Interactable | null = null
  let bestD = 56
  for (const i of registry) {
    if (i.kind === 'door') continue
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

let lastPlacePick = -1

export function updateInteractions(dt: number, camera: PerspectiveCamera) {
  const st = store.getState()
  const playing = st.phase === 'playing' && !st.page && input.enabled

  // nearest usable
  const found = playing && !player.frozen ? findNearest(player.pos, player.up) : null
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

  // pointer hover: small things first, then buildings (with a page open only the *other* buildings answer)
  const paged = st.phase === 'playing' && !!st.page
  if (input.hoverX >= 0 && (playing || paged)) {
    const h = playing ? pick(camera, input.hoverX, input.hoverY) : null
    hover.item = h
    let place = st.hoverPlace
    if (h) place = null
    else if (game.time - lastPlacePick > 0.07 || lastPlacePick < 0) {
      lastPlacePick = game.time
      place = pickPlaceAt(camera, input.hoverX, input.hoverY)
      if (place && place === st.page) place = null
    }
    if (place !== st.hoverPlace) store.getState().set({ hoverPlace: place })
    document.body.style.cursor = h || place ? 'pointer' : ''
  } else {
    hover.item = null
    if (st.hoverPlace) store.getState().set({ hoverPlace: null })
    if (document.body.style.cursor === 'pointer') document.body.style.cursor = ''
  }

  // click / tap
  if (input.clickX >= 0) {
    const cx = input.clickX
    const cy = input.clickY
    input.clickX = -1
    input.clickY = -1
    if (playing) {
      const c = pick(camera, cx, cy)
      if (c) {
        if (current.item === c) use(c)
        else {
          // too far to use: walk over there
          player.autoTarget = c.anchor.clone()
          bus.emit('walk-to', c)
        }
      } else {
        const id = pickPlaceAt(camera, cx, cy)
        if (id) openPage(id)
      }
    } else if (paged) {
      // a page is open: clicking another building hops to it, clicking the open air puts the page away
      const id = pickPlaceAt(camera, cx, cy)
      if (!id) closePage()
      else if (id !== st.page) openPage(id)
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
