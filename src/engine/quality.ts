// Device-aware quality tiers. Everything heavy (shadows, instance counts, lattice density, DPR) reads from here.
export interface Quality {
  tier: 0 | 1 | 2
  dpr: number
  shadowMap: number
  shadows: boolean
  planetDetail: number
  scatter: number
  antialias: boolean
  cloudGroups: number
  birds: number
  butterflies: number
  mobile: boolean
}

const TABLE: Record<0 | 1 | 2, Omit<Quality, 'mobile'>> = {
  0: { tier: 0, dpr: 1.25, shadowMap: 1024, shadows: true, planetDetail: 40, scatter: 0.5, antialias: false, cloudGroups: 2, birds: 12, butterflies: 8 },
  1: { tier: 1, dpr: 1.6, shadowMap: 1536, shadows: true, planetDetail: 52, scatter: 0.8, antialias: true, cloudGroups: 3, birds: 20, butterflies: 14 },
  2: { tier: 2, dpr: 2, shadowMap: 2048, shadows: true, planetDetail: 64, scatter: 1, antialias: true, cloudGroups: 4, birds: 28, butterflies: 20 },
}

export function detectQuality(): Quality {
  const ua = navigator.userAgent
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.matchMedia('(pointer: coarse)').matches
  const mem = (navigator as any).deviceMemory as number | undefined
  const cores = navigator.hardwareConcurrency || 4
  let tier: 0 | 1 | 2 = 2
  if (mobile) tier = (mem !== undefined && mem <= 3) || cores <= 4 ? 0 : 1
  else if (cores <= 2 || (mem !== undefined && mem <= 2)) tier = 1
  const forced = new URLSearchParams(location.search).get('q')
  if (forced === '0' || forced === '1' || forced === '2') tier = Number(forced) as 0 | 1 | 2
  return { ...TABLE[tier], mobile }
}

export const quality: Quality = typeof window !== 'undefined' ? detectQuality() : { ...TABLE[2], mobile: false }

export function setTier(t: 0 | 1 | 2) {
  Object.assign(quality, TABLE[t])
}
