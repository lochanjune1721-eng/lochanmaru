// One coherent palette for the whole world: golden hour over a warm, dry, sea-lined planet.
// "Maru" is Sanskrit for desert — hence terracotta, saffron and sand, cooled by teal water and lilac shade.
export const P = {
  // atmosphere
  skyZenith: '#8c9fe6',
  skyMid: '#e8b6d8',
  skyHorizon: '#ffd8a6',
  fog: '#f8d3b1',
  sun: '#ffd6a0',
  hemiSky: '#ffd2b0',
  hemiGround: '#4c8794',

  // ground
  grassA: '#7fd08a',
  grassB: '#5fba88',
  grassC: '#a6e08c',
  grassDry: '#d3dc98',
  grassDark: '#4a9c7a',
  sand: '#f3e0b2',
  sandDark: '#e6c98f',
  sandWet: '#cfb583',
  seabed: '#7fb7a6',
  pathA: '#f5e8c9',
  pathB: '#e6d0a2',

  // water
  waterShallow: '#8fe0d0',
  waterMid: '#45b6be',
  waterDeep: '#2b6fa6',
  foam: '#fff8ea',

  // materials
  cream: '#f8ecd5',
  white: '#fffaf0',
  terracotta: '#d9744f',
  terracottaDeep: '#b85a3e',
  saffron: '#f2a33c',
  marigold: '#f7c04a',
  teal: '#2f9591',
  tealDeep: '#1f6c74',
  indigo: '#3e4392',
  indigoDeep: '#262a66',
  coral: '#f0705a',
  blush: '#f7bab0',
  pink: '#f48fb1',
  lilac: '#b9a6ec',
  olive: '#7f9450',
  leaf: '#4fae72',
  leafDark: '#3a8a6e',
  leafLight: '#9dd684',
  wood: '#a9684a',
  woodDark: '#7a4a38',
  ink: '#2b2438',
  stone: '#c9b8a6',
  stoneDark: '#9a8a86',
  gold: '#e9b04c',
  red: '#e2493f',
} as const

export type PaletteKey = keyof typeof P
