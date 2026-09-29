// Every room has its own light and its own sky: the mood is part of the storytelling.
import type { InteriorId } from '../engine/store'

export interface Look {
  sun: string
  sunI: number
  hemiSky: string
  hemiGround: string
  hemiI: number
  /** direction TO the sun */
  dir: [number, number, number]
  skyTop: string
  skyMid: string
  skyHor: string
  fogDensity: number
}

export const LOOK: Record<InteriorId, Look> = {
  home: { sun: '#ffe3bd', sunI: 2.15, hemiSky: '#fff0e0', hemiGround: '#a89ab8', hemiI: 1.75, dir: [0.45, 0.8, 0.62], skyTop: '#9a8fd8', skyMid: '#eeb6cf', skyHor: '#ffd9b0', fogDensity: 0.006 },
  experience: { sun: '#ffe6bd', sunI: 2.3, hemiSky: '#fff0dc', hemiGround: '#9a90ac', hemiI: 1.7, dir: [-0.5, 0.82, 0.55], skyTop: '#8fa8e6', skyMid: '#f2c0cd', skyHor: '#ffdcb4', fogDensity: 0.006 },
  work: { sun: '#fff0d8', sunI: 2.2, hemiSky: '#e6f6f2', hemiGround: '#7f96b0', hemiI: 1.7, dir: [0.3, 0.9, 0.5], skyTop: '#22355f', skyMid: '#5a4f9a', skyHor: '#e08fa6', fogDensity: 0.006 },
  results: { sun: '#ffeccc', sunI: 2.1, hemiSky: '#d9ddff', hemiGround: '#6a6aa8', hemiI: 1.65, dir: [-0.35, 0.85, 0.5], skyTop: '#151338', skyMid: '#3a3a8c', skyHor: '#8a6fc0', fogDensity: 0.006 },
  hire: { sun: '#ffe6bf', sunI: 2.0, hemiSky: '#d0dcff', hemiGround: '#5a68a0', hemiI: 1.6, dir: [0.4, 0.8, 0.45], skyTop: '#0e1030', skyMid: '#26306a', skyHor: '#5a5aa8', fogDensity: 0.006 },
}
