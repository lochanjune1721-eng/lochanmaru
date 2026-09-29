// Small colour helpers so text on a coloured chip always reads (WCAG AA, 4.5:1).
export const INK = '#2b2438'
export const CREAM = '#fff8ea'

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (c: number[]) => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`

/** WCAG relative luminance, 0 (black) … 1 (white) */
export function luminance(hex: string) {
  const [r, g, b] = parse(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const mix = (a: string, b: string, t: number) => {
  const [x, y] = [parse(a), parse(b)]
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}

/**
 * A background and text colour, as close to `hex` as possible, that pass 4.5:1: cream text on a slightly deepened
 * colour, or ink text on a slightly lightened one (whichever changes the colour least, favouring cream on darker hues).
 */
export function readable(hex: string): { bg: string; fg: string } {
  const attempt = (fg: string, toward: string) => {
    let t = 0
    let bg = hex
    while (contrast(bg, fg) < 4.5 && t < 1) {
      t += 0.04
      bg = mix(hex, toward, t)
    }
    return { bg, fg, t }
  }
  const a = attempt(CREAM, INK)
  const b = attempt(INK, '#ffffff')
  return a.t <= b.t + 0.12 ? { bg: a.bg, fg: a.fg } : { bg: b.bg, fg: b.fg }
}
