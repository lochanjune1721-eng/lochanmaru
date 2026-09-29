// Where the open page sits on screen. The camera uses this to put the building in the part of the window the page
// leaves free, and the CSS reads the same numbers (as custom properties) so the two can never disagree.

/**
 * The page is a bottom sheet in tall / very narrow windows (phones held upright, portrait tablets) and a side sheet
 * otherwise (landscape phones and everything wider). Keep in step with the media queries in styles/pages.css.
 */
export const sheetBottom = () => window.innerWidth < 560 || window.innerWidth <= window.innerHeight * 1.05

/** Share of the window height a bottom sheet covers. */
export const SHEET_H = 0.62

/** Width of the side sheet in px (the whole window width for a bottom sheet). */
export function sheetWidth() {
  const W = window.innerWidth
  if (sheetBottom()) return W
  return Math.round(window.innerHeight < 520 ? Math.min(560, Math.max(380, 0.48 * W)) : Math.min(720, Math.max(440, 0.46 * W)))
}

/** Horizontal px the side sheet covers, including its margin. */
export const pageCoverPx = () => sheetWidth() + 14

export function syncSheetVars() {
  const s = document.documentElement.style
  s.setProperty('--pgw', `${sheetWidth()}px`)
  s.setProperty('--pgh', `${Math.round(SHEET_H * 100)}dvh`)
}
