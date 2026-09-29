// Unified input: keyboard, mouse-drag look, touch joystick + touch look. Written to by DOM events,
// read once per frame by the player/camera. Nothing here touches React.
import { Vector2 } from 'three'

export const input = {
  keys: new Set<string>(),
  stick: new Vector2(),
  /** accumulated look drag (px) since last read */
  lookDX: 0,
  lookDY: 0,
  wheel: 0,
  /** one-shot flags, consumed by the game loop */
  interact: false,
  cancel: false,
  clickX: -1,
  clickY: -1,
  /** gameplay input is ignored while false (panels, transitions) */
  enabled: false,
  lastActivity: 0,
  touch: false,
  dragging: false,
  hoverX: -1,
  hoverY: -1,
}

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

export function readMove(out: Vector2) {
  out.set(0, 0)
  if (!input.enabled) return out
  for (const k of input.keys) {
    const m = MOVE_KEYS[k]
    if (m) {
      out.x += m[0]
      out.y += m[1]
    }
  }
  out.add(input.stick)
  const l = out.length()
  if (l > 1) out.multiplyScalar(1 / l)
  return out
}

export const isSprinting = () => input.enabled && (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'))

export function consumeLook(out: Vector2) {
  out.set(input.lookDX, input.lookDY)
  input.lookDX = 0
  input.lookDY = 0
  return out
}

export function consumeWheel() {
  const w = input.wheel
  input.wheel = 0
  return w
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

const isControl = (t: EventTarget | null) => t instanceof HTMLElement && !!t.closest('button, a[href], summary, [role="button"], [role="tab"]')

export function installKeyboard() {
  const down = (e: KeyboardEvent) => {
    if (isTyping(e.target)) return
    input.lastActivity = performance.now()
    if (e.code in MOVE_KEYS || e.code === 'Space') {
      // (but let Space / arrows work normally on a focused button, tab strip or scrolling page)
      if (input.enabled && !isControl(e.target)) e.preventDefault()
    }
    if (!e.repeat) {
      // Enter / Space on a focused button or link activates *that* (a second action must not fire on whatever is near)
      const activating = (e.code === 'Enter' || e.code === 'Space') && isControl(e.target)
      if (e.code === 'KeyE' || ((e.code === 'Enter' || e.code === 'Space') && !activating)) input.interact = true
      if (e.code === 'Escape') input.cancel = true
    }
    input.keys.add(e.code)
  }
  const up = (e: KeyboardEvent) => {
    input.keys.delete(e.code)
  }
  const blur = () => {
    input.keys.clear()
    input.stick.set(0, 0)
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}
