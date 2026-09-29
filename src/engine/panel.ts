// Opening/closing content panels: the camera eases onto the thing you're reading, movement pauses.
import { Vector3 } from 'three'
import { bus } from './bus'
import { input } from './input'
import { cam } from './state'
import { PanelContent, store } from './store'

let prevEnabled = true

export function showPanel(content: PanelContent, focus?: Vector3, dist = 8.5) {
  const st = store.getState()
  prevEnabled = true
  st.openPanel(content)
  input.enabled = false
  input.keys.clear()
  input.stick.set(0, 0)
  if (focus) {
    cam.focusTarget = focus.clone()
    cam.focusDist = dist
    cam.focusPitch = 0.4
  }
  bus.emit('panel', 'open', content.id)
}

export function hidePanel() {
  const st = store.getState()
  if (!st.panel) return
  st.closePanel()
  cam.focusTarget = null
  input.enabled = prevEnabled
  bus.emit('panel', 'close')
}
