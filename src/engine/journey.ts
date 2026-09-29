// The opening moment: click START -> camera swoops down from orbit -> the visitor drops onto the beach.
import { PerspectiveCamera } from 'three'
import { beginFlight } from './camera'
import { bus } from './bus'
import { input } from './input'
import { cam, player } from './state'
import { resetPlayerToSpawn } from './boot'
import { stage } from './scenes'
import { store } from './store'
import { audio } from './audio'
import { after } from './sim'

export function startJourney() {
  const st = store.getState()
  if (st.phase !== 'intro') return
  const camera = stage.camera as PerspectiveCamera
  st.set({ phase: 'starting' })
  audio.ui('whoosh')
  resetPlayerToSpawn()
  player.frozen = true
  player.visible = false
  player.drop = -1
  beginFlight(camera)
  bus.emit('start')
  after(1.7, () => {
    player.visible = true
    player.drop = 0
  })
  after(cam.flightDur + 0.1, () => {
    store.getState().set({ phase: 'playing', hint: 'controls' })
    player.frozen = false
    input.enabled = true
    after(16, () => store.getState().set({ hint: null }))
  })
}

/** Debug/QA: skip the intro entirely. */
export function skipIntro() {
  resetPlayerToSpawn()
  player.frozen = false
  player.visible = true
  player.drop = -1
  cam.mode = 'follow'
  input.enabled = true
  store.getState().set({ phase: 'playing' })
}
