// WORK — the screening rotunda. Every case study is a small exhibit you can walk up to; the four wings
// (AI & Tech, Creators, Money, Learning & Own Media) each have their own kind of exhibit, so you always
// know which part of the room you are in. Exhibits wake up when you get close and light a beam on the floor.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, CircleGeometry, Color, Group, MeshBasicMaterial, PlaneGeometry, RingGeometry, Vector3, AdditiveBlending, DoubleSide } from 'three'
import { projectPanel } from '../content/panels'
import { PROJECTS, WINGS, Project, Wing } from '../content/projects'
import { game } from '../engine/game'
import { clamp, damp, smoothstep } from '../engine/math'
import { player } from '../engine/state'
import { store } from '../engine/store'
import { GeoBuilder } from '../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'
import { FONT, makeCanvas, roundRect, signTexture, toTexture, wrapLines } from '../gfx/text'
import { Bulbs } from '../world/buildings/led'
import { SignBoard } from '../world/buildings/parts'
import { beamGeometry, makeBeamMaterial, Motes, roundRoom, useImage, useRingWall } from './fx'
import { Hotspot, Interior, interiorOrigin, useBox, useCircle, useOpen } from './kit'
import { plant } from './parts'

const R = 13
const DEG = Math.PI / 180
const RA = 10.7
const RB = 6.5

type Style = 'ai' | 'creators' | 'money' | 'learning'

// ---- layout ---------------------------------------------------------------------------------------------
interface Pod {
  i: number
  p: Project
  wing: Wing
  color: string
  style: Style
  x: number
  z: number
  rot: number
  row: 'A' | 'B'
  base: number
  /** point in front of the exhibit where the visitor stands */
  fx: number
  fz: number
}

/** Screen size / placement (pod-local) for each exhibit style. */
const SCREEN: Record<Style, { w: number; h: number; cy: number; tilt: number; depth: number }> = {
  ai: { w: 2.4, h: 1.5, cy: 2.05, tilt: -0.14, depth: 0.16 },
  creators: { w: 1.3, h: 2.08, cy: 2.5, tilt: -0.1, depth: 0.12 },
  money: { w: 2.6, h: 1.4, cy: 1.95, tilt: -0.2, depth: 0.14 },
  learning: { w: 2.2, h: 1.5, cy: 2.2, tilt: -0.16, depth: 0.12 },
}
const TEX: Record<Style, [number, number]> = { ai: [512, 320], creators: [320, 512], money: [512, 276], learning: [512, 350] }

function layoutPods(): Pod[] {
  const slots: { x: number; z: number; rot: number; row: 'A' | 'B' }[] = []
  const NA = 11
  for (let i = 0; i < NA; i++) {
    const phi = (-70 + (140 * i) / (NA - 1)) * DEG
    slots.push({ row: 'A', x: RA * Math.sin(phi), z: -RA * Math.cos(phi), rot: -phi * 0.55 })
  }
  const NB = 5
  for (let i = 0; i < NB; i++) {
    const phi = (-56 + (112 * i) / (NB - 1)) * DEG
    slots.push({ row: 'B', x: RB * Math.sin(phi), z: -RB * Math.cos(phi), rot: -phi * 0.5 })
  }
  slots.sort((a, b) => a.x - b.x || (a.row === 'A' ? -1 : 1))
  const pods: Pod[] = []
  let k = 0
  for (const w of WINGS) {
    const style = w.id as Style
    for (const p of PROJECTS.filter((q) => q.wing === w.id)) {
      const s = slots[k]
      const base = s.row === 'A' ? 0.5 : 0
      const off = 1.9
      pods.push({ i: k++, p, wing: w.id, color: w.color, style, base, fx: s.x + Math.sin(s.rot) * off, fz: s.z + Math.cos(s.rot) * off, ...s })
    }
  }
  return pods
}

// ---- static geometry ----------------------------------------------------------------------------------------
function shade(hex: string, k: number) {
  const c = new Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}

function frameBox(b: GeoBuilder, cy: number, w: number, h: number, depth: number, tilt: number, color: string) {
  b.push().at(0, cy, 0).rotX(tilt)
  b.put(0, -h / 2, -depth / 2, (b) => b.box(w, h, depth, color, { ao: 0 }))
  b.pop()
}

function buildPod(b: GeoBuilder, pod: Pod) {
  const { style, color, base } = pod
  const sc = SCREEN[style]
  b.push().at(pod.x, 0, pod.z).rotY(pod.rot)
  // plinth + wing-coloured ring
  b.cyl(1.72, 1.86, base + 0.16, 20, '#efe3d0', { top: '#fff6e6' })
  b.put(0, base + 0.16, 0, (b) => b.cyl(1.5, 1.6, 0.07, 20, color, { ao: 0, glow: 0.2 }))
  const y0 = base + 0.23
  if (style === 'ai') {
    // console + keyboard + antenna
    b.put(0, y0, 0, (b) => b.box(2.3, 0.85, 1.05, '#2e2a4a'))
    b.put(0, y0 + 0.85, 0.1, (b) => b.box(2.3, 0.05, 0.85, '#3a3660'))
    for (let i = 0; i < 9; i++) b.put(-0.85 + i * 0.21, y0 + 0.9, 0.34, (b) => b.box(0.14, 0.04, 0.12, i % 3 === 0 ? color : '#9a95c9', { ao: 0, glow: i % 3 === 0 ? 0.7 : 0.1 }))
    for (let i = 0; i < 6; i++) b.put(-1.02 + i * 0.4, y0 + 0.3, 0.535, (b) => b.box(0.22, 0.06, 0.04, i % 2 ? '#ff7ab0' : color, { ao: 0, glow: 0.9 }))
    b.put(0, y0 + 0.85, -0.25, (b) => b.box(0.34, 0.5, 0.2, '#1f1c36'))
    frameBox(b, sc.cy + base, sc.w + 0.18, sc.h + 0.18, sc.depth, sc.tilt, '#1f1c36')
    b.put(1.05, y0 + 0.85, -0.3, (b) => b.cyl(0.03, 0.03, 1.05, 5, P.ink))
    b.put(1.05, y0 + 1.9, -0.3, (b) => b.sphere(0.07, '#ff7ab0', { glow: 1 }, 6, 5))
  } else if (style === 'creators') {
    // tripod + phone + ring light + little mic
    for (const a of [0, 2.1, 4.2]) b.push().at(0, y0 + 0.12, 0).rotY(a).at(0.62, 0, 0).rotZ(0.3).cyl(0.045, 0.06, 1.75, 5, P.ink).pop()
    b.put(0, y0 + 1.25, 0, (b) => b.cyl(0.14, 0.14, 0.32, 8, '#3a3660'))
    b.put(0, sc.cy + base - 1.2, -0.02, (b) => b.box(0.16, 1.15, 0.12, P.ink))
    frameBox(b, sc.cy + base, sc.w + 0.16, sc.h + 0.16, sc.depth, sc.tilt, '#1f1c36')
    b.push().at(0, sc.cy + base, -0.12).rotX(sc.tilt)
    b.torus(1.3, 0.055, '#fff2d0', { glow: 0.8, ao: 0 }, Math.PI * 2, 8, 32)
    b.pop()
    b.put(-1.25, y0, 0.55, (b) => b.cyl(0.04, 0.04, 1.3, 5, P.ink))
    b.put(-1.25, y0 + 1.3, 0.55, (b) => b.cyl(0.1, 0.1, 0.34, 8, '#8a86b8'))
    b.put(-1.25, y0 + 1.64, 0.55, (b) => b.sphere(0.11, '#cfcbf0', {}, 8, 6))
    b.put(-1.25, y0 + 1.2, 0.55, (b) => b.sphere(0.06, '#ff6a5a', { glow: 1 }, 6, 5))
  } else if (style === 'money') {
    // trading desk + ticker strip + a candlestick sculpture
    b.put(0, y0, 0, (b) => b.box(2.7, 0.9, 1.0, '#26275c'))
    b.put(0, y0 + 0.9, 0, (b) => b.box(2.76, 0.07, 1.06, '#dcd3ff'))
    b.put(0, y0 + 0.55, 0.505, (b) => b.box(2.2, 0.2, 0.04, '#0e0f2b', { ao: 0 }))
    for (let i = 0; i < 11; i++) b.put(-1.0 + i * 0.2, y0 + 0.6, 0.53, (b) => b.box(0.11, 0.08, 0.02, i % 3 === 1 ? '#ff6a5a' : '#6ee7a8', { ao: 0, glow: 0.9 }))
    frameBox(b, sc.cy + base, sc.w + 0.18, sc.h + 0.18, sc.depth, sc.tilt, '#15163a')
    b.put(0, y0 + 0.97, -0.05, (b) => b.box(0.3, 0.5, 0.22, '#15163a'))
    const hs = [0.3, 0.45, 0.36, 0.62, 0.55, 0.8, 1.0]
    hs.forEach((h, i) => {
      const up = i % 3 !== 2
      const c = up ? '#6ee7a8' : '#ff6a5a'
      const x = -1.06 + i * 0.35
      b.put(x, y0 + 1.0, 0.72, (b) => b.box(0.17, h * 0.55, 0.13, c, { glow: 0.55, ao: 0 }))
      b.put(x + 0.075, y0 + 1.0 + h * 0.55, 0.77, (b) => b.box(0.02, 0.22, 0.02, c, { ao: 0 }))
    })
  } else {
    // easel + books + graduation cap
    b.put(0, y0, 0.15, (b) => b.box(2.4, 0.5, 1.0, P.wood, { top: '#c98763' }))
    b.put(-0.7, y0 + 0.5, 0.2, (b) => b.box(0.9, 0.16, 0.6, P.terracotta))
    b.put(-0.68, y0 + 0.66, 0.2, (b) => b.box(0.82, 0.14, 0.56, P.teal))
    b.put(-0.72, y0 + 0.8, 0.2, (b) => b.box(0.74, 0.12, 0.5, P.marigold))
    b.put(-0.72, y0 + 0.92, 0.2, (b) => b.box(0.9, 0.05, 0.9, '#2b2438'))
    b.put(-0.72, y0 + 0.97, 0.2, (b) => b.rotY(0.4).box(0.9, 0.05, 0.9, '#2b2438'))
    b.put(-0.72, y0 + 0.85, 0.2, (b) => b.cyl(0.2, 0.22, 0.14, 10, '#2b2438'))
    b.put(-0.35, y0 + 0.97, 0.55, (b) => b.cyl(0.015, 0.015, 0.5, 4, P.gold))
    b.put(-0.35, y0 + 0.5, 0.55, (b) => b.sphere(0.06, P.gold, {}, 6, 5))
    // easel legs + board
    for (const sx of [-1, 1]) b.push().at(sx * 1.0, y0 + 0.5, -0.1).rotZ(-sx * 0.06).rotX(-0.1).cyl(0.05, 0.06, 1.7, 5, P.woodDark).pop()
    b.put(0, y0 + 0.62, -0.5, (b) => b.rotX(0.28).cyl(0.045, 0.06, 1.85, 5, P.woodDark))
    frameBox(b, sc.cy + base, sc.w + 0.24, sc.h + 0.24, sc.depth, sc.tilt, P.wood)
    b.put(0.85, y0 + 0.5, 0.4, (b) => b.box(0.6, 0.06, 0.16, P.woodDark))
    b.put(0.65, y0 + 0.56, 0.4, (b) => b.box(0.18, 0.05, 0.05, '#fff8ea'))
    b.put(0.92, y0 + 0.56, 0.4, (b) => b.box(0.14, 0.05, 0.05, P.pink))
  }
  // beacon in the wing colour
  b.put(0, sc.cy + base + sc.h / 2 + 0.34, 0, (b) => b.sphere(0.09, color, { glow: 1 }, 6, 5))
  b.pop()
}

function buildRoomGeo(pods: Pod[]) {
  const b = new GeoBuilder(202)
  b.aoHeight = 2.4
  b.ao = 0.26
  roundRoom(b, { r: R, wallH: 10, lowH: 1.05, floorTop: '#e9d9c3', floorSide: '#8a6a86', wall: '#6d5b93', wallTop: '#7d6ba3', trim: '#f0c46a', segs: 44 })

  // floor rings + a wing-coloured stripe under each wing
  const ring = (r0: number, r1: number, col: string, y = 0.075, glow = 0) => {
    const g = new RingGeometry(r0, r1, 72).rotateX(-Math.PI / 2)
    g.translate(0, y, 0)
    b.custom(g, col, { ao: 0, glow })
  }
  ring(4.4, 4.62, P.gold, 0.08, 0.25)
  ring(3.2, 3.32, '#c8b7a0', 0.078)
  ring(13.6, 13.86, P.gold, 0.08, 0.2)
  for (const w of WINGS) {
    const ps = pods.filter((p) => p.wing === w.id)
    const phis = ps.map((p) => Math.atan2(p.x, -p.z))
    const a0 = Math.min(...phis) - 8 * DEG
    const a1 = Math.max(...phis) + 8 * DEG
    const g = new RingGeometry(9.15, 9.6, 40, 1, Math.PI / 2 - a1, a1 - a0).rotateX(-Math.PI / 2)
    g.translate(0, 0.082, 0)
    b.custom(g, w.color, { ao: 0, glow: 0.18 })
  }

  // hub: low round stage + a projector-like stand for the reel
  b.put(0, 0, 1.6, (b) => {
    b.cyl(3.0, 3.2, 0.3, 32, '#f7ecd8', { top: '#fff7e8' })
    b.put(0, 0.3, 0, (b) => b.cyl(2.7, 2.8, 0.06, 32, P.gold, { ao: 0, glow: 0.2 }))
    b.put(0, 0.36, 0, (b) => b.cyl(2.5, 2.6, 0.05, 32, '#fff3d6', { ao: 0 }))
    b.put(0, 0.4, 0, (b) => b.cyl(0.55, 0.85, 1.05, 12, '#2f2a52'))
    b.put(0, 1.45, 0, (b) => b.cyl(0.4, 0.55, 0.2, 12, P.gold))
    b.put(0, 1.63, 0, (b) => b.cyl(0.13, 0.13, 0.5, 8, P.ink))
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      b.put(Math.sin(a) * 2.92, 0.3, Math.cos(a) * 2.92, (b) => b.sphere(0.13, i % 2 ? P.marigold : '#fff2d0', { glow: 0.9, ao: 0 }, 6, 5))
    }
  })

  // red carpet from the door to the stage, with gold posts and velvet rope
  b.put(0, 0.07, 7.8, (b) => b.box(2.7, 0.04, 6.4, '#c4423b', { ao: 0 }))
  for (const sx of [-1, 1]) b.put(sx * 1.28, 0.1, 7.8, (b) => b.box(0.14, 0.03, 6.4, P.gold, { ao: 0, glow: 0.15 }))
  for (const sx of [-1, 1]) {
    const zs = [5.1, 7.1, 9.1]
    zs.forEach((z, i) => {
      b.put(sx * 1.75, 0, z, (b) => {
        b.cyl(0.16, 0.2, 0.08, 8, P.gold)
        b.put(0, 0.08, 0, (b) => b.cyl(0.05, 0.05, 0.86, 6, P.gold))
        b.put(0, 0.94, 0, (b) => b.sphere(0.1, P.gold, {}, 8, 6))
      })
      if (i < zs.length - 1) b.bar([sx * 1.75, 0.86, z], [sx * 1.75, 0.78, zs[i + 1]], 0.028, 5, '#c4423b', { ao: 0 })
    })
  }
  // sunburst inlay fanning out towards the door
  for (let i = 0; i < 9; i++) {
    const phi = (98 + i * 20.5) * DEG
    const g = new RingGeometry(4.9, 8.4, 1, 1, Math.PI / 2 - phi - 10.2 * DEG, 10.2 * DEG).rotateX(-Math.PI / 2)
    g.translate(0, 0.076, 0)
    b.custom(g, i % 2 ? '#f2e2c8' : '#e3cfb0', { ao: 0 })
  }
  // benches + planters flanking the carpet so the foreground is never empty
  for (const sx of [-1, 1]) {
    b.push().at(sx * 4.6, 0, 8.4).rotY(-sx * Math.PI * 0.5)
    b.put(0, 0.5, 0, (b) => b.box(2.4, 0.12, 0.62, P.wood, { top: '#c98763' }))
    b.put(0, 0.5, -0.3, (b) => b.box(2.4, 0.62, 0.1, P.wood))
    for (const lx of [-1.0, 1.0]) b.put(lx, 0, 0, (b) => b.box(0.12, 0.5, 0.5, P.ink))
    b.pop()
    plant(b, sx * 6.8, 9.6, 1.3, sx > 0 ? P.pink : P.marigold)
  }
  // a film camera on a tripod (the room's little joke about who is watching whom)
  b.push().at(6.9, 0, 3.6)
  for (const a of [0, 2.1, 4.2]) b.push().rotY(a).at(0.55, 0, 0).rotZ(0.28).cyl(0.05, 0.05, 2.5, 5, P.ink).pop()
  b.put(0, 2.3, 0, (b) => b.box(1.0, 0.66, 0.8, '#3b3660'))
  b.put(0, 2.34, 0.5, (b) => b.cyl(0.3, 0.3, 0.46, 12, P.ink))
  b.put(0, 2.34, 0.76, (b) => b.cyl(0.22, 0.22, 0.05, 12, '#8fd4ff', { glow: 0.5 }))
  b.put(-0.15, 2.96, -0.05, (b) => b.rotZ(Math.PI / 2).cyl(0.34, 0.34, 0.1, 14, '#2b2438'))
  b.put(0.25, 2.96, -0.05, (b) => b.rotZ(Math.PI / 2).cyl(0.34, 0.34, 0.1, 14, '#2b2438'))
  b.pop()

  // pods
  for (const p of pods) buildPod(b, p)

  // a director's chair + clapper stool near the hub
  b.push().at(-6.6, 0, 4.6).rotY(0.5)
  for (const sx of [-0.5, 0.5]) for (const sz of [-0.4, 0.4]) b.put(sx, 0, sz, (b) => b.cyl(0.05, 0.05, 1.05, 5, P.woodDark))
  b.put(0, 1.0, 0, (b) => b.box(1.15, 0.08, 0.95, P.terracotta))
  b.put(0, 1.0, -0.46, (b) => b.box(1.15, 0.9, 0.06, P.terracotta))
  for (const sx of [-0.58, 0.58]) b.put(sx, 1.0, 0, (b) => b.box(0.08, 0.06, 1.0, P.woodDark))
  b.put(0, 1.5, -0.46, (b) => b.box(0.85, 0.24, 0.05, P.cream))
  b.pop()
  b.push().at(-8.6, 0, 3.0)
  b.cyl(0.42, 0.5, 0.95, 10, P.woodDark, { top: P.wood })
  b.put(0, 0.95, 0, (b) => b.box(1.1, 0.16, 0.62, '#2b2438'))
  b.pop()

  // wall lamps between the wings so the room reads as four zones
  for (const w of WINGS) {
    const ps = pods.filter((p) => p.wing === w.id)
    const phis = ps.map((p) => Math.atan2(p.x, -p.z))
    for (const phi of [Math.min(...phis) - 12 * DEG, Math.max(...phis) + 12 * DEG]) {
      const [x, z] = [Math.sin(phi) * (R - 0.9), -Math.cos(phi) * (R - 0.9)]
      b.push().at(x, 0, z).rotY(-phi)
      b.cyl(0.14, 0.2, 3.4, 6, P.ink)
      b.put(0, 3.4, 0, (b) => b.cyl(0.36, 0.26, 0.6, 8, w.color, { glow: 0.85, ao: 0 }))
      b.put(0, 4.0, 0, (b) => b.cone(0.4, 0.34, 8, P.ink))
      b.pop()
    }
  }
  return b.build()
}

// ---- screens ---------------------------------------------------------------------------------------------------
function drawScreen(
  g: CanvasRenderingContext2D,
  W: number,
  H: number,
  o: { pod: Pod; wake: number; t: number; img: HTMLImageElement | null; touch: boolean },
) {
  const { pod, wake, t, img } = o
  const p = pod.p
  const stub = p.source === 'brief'
  const port = H > W
  const wing = WINGS.find((w) => w.id === pod.wing)!
  g.clearRect(0, 0, W, H)
  g.fillStyle = '#16142c'
  g.fillRect(0, 0, W, H)
  // wing glow, stronger when awake
  const gr = g.createLinearGradient(0, 0, W, H)
  gr.addColorStop(0, shade(pod.color, 0.55 + 0.45 * wake))
  gr.addColorStop(1, shade(pod.color, 0.18 + 0.2 * wake))
  g.globalAlpha = 0.5 + 0.5 * wake
  g.fillStyle = gr
  g.fillRect(0, 0, W, H)
  g.globalAlpha = 1
  // scanlines
  g.fillStyle = 'rgba(0,0,0,0.10)'
  for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2)

  const pad = Math.round(W * 0.055)
  g.textBaseline = 'alphabetic'
  // top strip
  g.fillStyle = 'rgba(255,248,234,0.78)'
  g.font = `500 ${port ? 17 : 18}px ${FONT.mono}`
  g.textAlign = 'left'
  ;(g as any).letterSpacing = '3px'
  g.fillText(wing.name, pad, 30)
  g.textAlign = 'right'
  g.fillText(`${String(pod.i + 1).padStart(2, '0')}/16`, W - pad, 30)
  ;(g as any).letterSpacing = '0px'
  g.fillStyle = 'rgba(255,248,234,0.25)'
  g.fillRect(pad, 42, W - pad * 2, 2)

  // logo tile
  const tile = port ? 132 : 126
  const tx = port ? (W - tile) / 2 : pad
  const ty = port ? 64 : 62
  g.fillStyle = '#fff8ea'
  roundRect(g, tx, ty, tile, tile, 18)
  g.fill()
  if (img) {
    const r = Math.min((tile - 24) / img.naturalWidth, (tile - 24) / img.naturalHeight)
    const iw = img.naturalWidth * r
    const ih = img.naturalHeight * r
    g.drawImage(img, tx + (tile - iw) / 2, ty + (tile - ih) / 2, iw, ih)
  } else {
    g.fillStyle = pod.color
    g.font = `900 ${tile * 0.56}px ${FONT.display}`
    g.textAlign = 'center'
    g.fillText(p.name.trim()[0].toUpperCase(), tx + tile / 2, ty + tile * 0.7)
  }

  // name (+ role)
  g.fillStyle = '#fff8ea'
  g.textAlign = port ? 'center' : 'left'
  const nx = port ? W / 2 : tx + tile + 26
  const nw = port ? W - pad * 2 : W - nx - pad
  const size = port ? 42 : stub ? 50 : 44
  g.font = `900 ${size}px ${FONT.display}`
  const lines = wrapLines(g, p.name, nw).slice(0, 3)
  const ny = port ? ty + tile + 52 : ty + 44
  lines.forEach((ln, i) => g.fillText(ln, nx, ny + i * (size + 4)))
  let cy = ny + lines.length * (size + 4)
  if (p.role) {
    g.font = `500 ${port ? 19 : 20}px ${FONT.mono}`
    g.fillStyle = 'rgba(255,248,234,0.78)'
    g.fillText(p.role.toUpperCase(), nx, cy - 4)
    cy += 22
  }

  // headline metric + growth line
  if (p.headline) {
    const hy = port ? H - 138 : H - 92
    const prog = clamp(wake * 1.15, 0, 1)
    // little growth curve that draws itself
    const cx0 = pad
    const cx1 = W - pad
    const cyb = hy - 18
    g.strokeStyle = `rgba(255,248,234,${0.25 + 0.5 * wake})`
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    const steps = 24
    const stop = Math.floor(steps * (0.15 + 0.85 * prog))
    for (let i = 0; i <= stop; i++) {
      const f = i / steps
      const x = cx0 + (cx1 - cx0) * f
      const y = cyb - (port ? 36 : 40) * (f * f * 0.9 + 0.1 * f) - Math.sin(f * 9 + 1) * 3
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.stroke()
    g.textAlign = port ? 'center' : 'left'
    g.fillStyle = '#ffe9a8'
    const hs = fitFont(g, p.headline, W - pad * 2, port ? 46 : 54, 900, FONT.display)
    g.font = `900 ${hs}px ${FONT.display}`
    g.fillText(p.headline, port ? W / 2 : pad, hy + hs * 0.8)
  } else if (stub) {
    g.textAlign = port ? 'center' : 'left'
    g.font = `500 ${port ? 18 : 20}px ${FONT.mono}`
    g.fillStyle = 'rgba(255,248,234,0.7)'
    g.fillText('DETAILS ON REQUEST', port ? W / 2 : nx, H - (port ? 96 : 84))
  }

  // bottom bar
  const by = H - 34
  g.fillStyle = 'rgba(0,0,0,0.35)'
  g.fillRect(0, by, W, 34)
  g.textAlign = 'center'
  g.font = `500 ${port ? 16 : 17}px ${FONT.mono}`
  ;(g as any).letterSpacing = '2px'
  if (wake > 0.55) {
    const pulse = 0.65 + 0.35 * Math.sin(t * 5)
    g.fillStyle = `rgba(255,233,168,${pulse})`
    g.fillText(stub ? `${o.touch ? 'TAP' : 'E'} · ASK ABOUT IT →` : `${o.touch ? 'TAP' : 'E'} · EXPLORE PROJECT →`, W / 2, by + 23)
  } else {
    g.fillStyle = 'rgba(255,248,234,0.4)'
    g.fillText(Math.floor(t * 1.2) % 2 ? '● STANDBY' : '○ STANDBY', W / 2, by + 23)
  }
  ;(g as any).letterSpacing = '0px'
}

function fitFont(g: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: number, family: string) {
  let s = size
  g.font = `${weight} ${s}px ${family}`
  while (g.measureText(text).width > maxW && s > 18) {
    s -= 2
    g.font = `${weight} ${s}px ${family}`
  }
  return s
}

function ExhibitScreen({ pod, wakes }: { pod: Pod; wakes: Float32Array }) {
  const img = useImage(pod.p.logo)
  const [tw, th] = TEX[pod.style]
  const sc = SCREEN[pod.style]
  const { g, tex } = useMemo(() => {
    const { c, g } = makeCanvas(tw, th)
    return { g, tex: toTexture(c, 4) as CanvasTexture }
  }, [tw, th])
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  const geo = useMemo(() => new PlaneGeometry(sc.w, sc.h), [sc.w, sc.h])
  const last = useRef({ w: -9, t: -9 })
  const touch = store.getState().touch
  useEffect(() => {
    drawScreen(g, tw, th, { pod, wake: wakes[pod.i], t: 0, img, touch })
    tex.needsUpdate = true
    last.current.w = wakes[pod.i]
  }, [g, tex, tw, th, pod, img, wakes, touch])
  useFrame(() => {
    if (game.mode !== 'interior') return
    const w = wakes[pod.i]
    const t = game.time
    const moving = Math.abs(w - last.current.w) > 0.012
    const alive = w > 0.5 && t - last.current.t > 0.11
    const idle = w < 0.02 && t - last.current.t > 0.85
    if (!moving && !alive && !idle) return
    last.current.w = w
    last.current.t = t
    drawScreen(g, tw, th, { pod, wake: w, t, img, touch })
    tex.needsUpdate = true
  })
  return (
    <group position={[0, sc.cy + pod.base, 0]} rotation={[sc.tilt, 0, 0]}>
      <mesh geometry={geo} material={mat} position={[0, 0, sc.depth / 2 + 0.012]} />
    </group>
  )
}

function PodBits({ pod, wakes }: { pod: Pod; wakes: Float32Array }) {
  const open = useOpen()
  const sc = SCREEN[pod.style]
  const hw = pod.style === 'creators' ? 1.1 : 1.35
  useBox(pod.x, pod.z, hw, 0.85, 2.6, pod.rot)
  const cy = sc.cy + pod.base
  return (
    <>
      <group position={[pod.x, 0, pod.z]} rotation={[0, pod.rot, 0]}>
        <ExhibitScreen pod={pod} wakes={wakes} />
      </group>
      <Hotspot
        id={pod.p.id}
        x={pod.fx}
        y={1.0}
        z={pod.fz}
        radius={3.1}
        markAt={[pod.x, cy + sc.h / 2 + 0.85, pod.z]}
        label="EXPLORE PROJECT"
        title={pod.p.name}
        look={[pod.x, cy, pod.z]}
        onUse={() => open(projectPanel(pod.p), pod.x, cy, pod.z, 8.6)}
      />
    </>
  )
}

// ---- hub: the spinning reel ---------------------------------------------------------------------------------------
function buildReel() {
  const b = new GeoBuilder(303)
  b.ao = 0
  b.push().rotX(Math.PI / 2)
  for (const s of [-1, 1]) {
    b.put(0, s * 0.16, 0, (b) => b.cyl(1.3, 1.3, 0.08, 28, '#fff3d6'))
    b.put(0, s * 0.16 + (s > 0 ? 0.08 : -0.02), 0, (b) => b.cyl(0.96, 0.96, 0.02, 28, '#e7d3ae', { ao: 0 }))
  }
  b.put(0, -0.12, 0, (b) => b.cyl(0.98, 0.98, 0.24, 28, '#2b2438'))
  b.put(0, -0.2, 0, (b) => b.cyl(0.16, 0.16, 0.4, 10, P.gold, { glow: 0.5 }))
  b.pop()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    b.put(Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0.27, (b) => b.rotX(Math.PI / 2).cyl(0.19, 0.19, 0.04, 14, '#3c3560', { ao: 0 }))
    b.put(Math.cos(a) * 0.62, Math.sin(a) * 0.62, -0.27, (b) => b.rotX(Math.PI / 2).cyl(0.19, 0.19, 0.04, 14, '#3c3560', { ao: 0 }))
  }
  b.push().at(0, 0, 0.32).torus(1.3, 0.05, P.terracotta, { ao: 0 }, Math.PI * 2, 6, 32).pop()
  return b.build()
}

function Hub() {
  const geo = useMemo(buildReel, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const ref = useRef<Group>(null)
  const halo = useMemo(() => glowSpriteMaterial('#ffd98a', 0.65), [])
  useFrame((_, dt) => {
    if (game.mode !== 'interior' || !ref.current) return
    ref.current.rotation.z -= dt * 0.32
  })
  return (
    <group position={[0, 2.5, 1.6]}>
      <group ref={ref}>
        <mesh geometry={geo} material={mat} castShadow />
      </group>
      <sprite material={halo} scale={[4.6, 4.6, 1]} position={[0, 0, -0.3]} />
    </group>
  )
}

// ---- floor beam that follows the nearest awake exhibit ------------------------------------------------------------
const tmpV = new Vector3()

function Spot({ pods, wakes }: { pods: Pod[]; wakes: Float32Array }) {
  const beamG = useMemo(() => beamGeometry(2.4, 11, 28), [])
  const beamM = useMemo(() => makeBeamMaterial('#ffe6b0', 0.0), [])
  const padG = useMemo(() => new CircleGeometry(2.1, 40).rotateX(-Math.PI / 2), [])
  const padM = useMemo(() => new MeshBasicMaterial({ color: new Color('#ffe6b0'), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, side: DoubleSide }), [])
  const g = useRef<Group>(null)
  const cur = useRef(new Vector3(0, 0, 0))
  useFrame((_, dt) => {
    if (!g.current) return
    let best = -1
    let bw = 0.04
    for (const p of pods) if (wakes[p.i] > bw) { bw = wakes[p.i]; best = p.i }
    const on = best >= 0
    if (on) {
      const p = pods[best]
      tmpV.set(p.fx, 0, p.fz)
      if (beamM.uniforms.uOpacity.value < 0.02) cur.current.copy(tmpV)
      cur.current.x = damp(cur.current.x, tmpV.x, 9, dt)
      cur.current.z = damp(cur.current.z, tmpV.z, 9, dt)
    }
    const tgt = on ? 0.36 * smoothstep(0.04, 0.8, bw) : 0
    beamM.uniforms.uOpacity.value = damp(beamM.uniforms.uOpacity.value, tgt, 8, dt)
    padM.opacity = beamM.uniforms.uOpacity.value * 0.8
    g.current.position.set(cur.current.x, 0, cur.current.z)
    g.current.visible = beamM.uniforms.uOpacity.value > 0.006
  })
  return (
    <group ref={g}>
      <mesh geometry={beamG} material={beamM} position={[0, 11, 0]} renderOrder={5} />
      <mesh geometry={padG} material={padM} position={[0, 0.1, 0]} renderOrder={4} />
    </group>
  )
}

// ---- the room ------------------------------------------------------------------------------------------------------
function WorkContent() {
  const pods = useMemo(layoutPods, [])
  const geo = useMemo(() => buildRoomGeo(pods), [pods])
  const mat = useMemo(() => worldMaterial({}), [])
  const wakes = useMemo(() => new Float32Array(pods.length), [pods])
  const X0 = interiorOrigin('work')
  const halo = useMemo(() => glowSpriteMaterial('#ffbf6a', 0.7), [])

  useRingWall(R, 36, 3.2)
  useCircle(0, 1.6, 0.95, 2.5) // reel stand
  useBox(-6.6, 4.6, 0.7, 0.6, 1.6, 0.5) // director's chair
  useCircle(-8.6, 3.0, 0.5, 1.2) // stool
  useCircle(6.9, 3.6, 0.8, 3) // camera tripod
  useBox(-4.6, 8.4, 0.35, 1.2, 1.2, 0)
  useBox(4.6, 8.4, 0.35, 1.2, 1.2, 0)
  useCircle(-6.8, 9.6, 0.6, 2)
  useCircle(6.8, 9.6, 0.6, 2)

  useFrame((_, dt) => {
    if (game.mode !== 'interior') return
    const px = player.pos.x - X0
    const pz = player.pos.z
    for (const p of pods) {
      const d = Math.hypot(px - p.fx, pz - p.fz)
      const target = 1 - smoothstep(2.6, 5.4, d)
      wakes[p.i] = damp(wakes[p.i], target, 6, Math.min(dt, 0.05))
    }
  })

  const banners = useMemo(() => {
    const rr = R - 0.5
    const items = WINGS.map((w) => {
      const ps = pods.filter((p) => p.wing === w.id)
      const phis = ps.map((p) => Math.atan2(p.x, -p.z))
      const lo = Math.min(...phis)
      const hi = Math.max(...phis)
      const width = clamp((hi - lo + 0.3) * rr, 4.4, 6.2)
      return { w, phi: (lo + hi) / 2, width }
    })
    // push neighbours apart until no two banners overlap
    for (let it = 0; it < 24; it++) {
      for (let i = 0; i < items.length - 1; i++) {
        const a = items[i]
        const b = items[i + 1]
        const gap = (b.phi - a.phi) * rr - (a.width + b.width) / 2 - 0.25
        if (gap < 0) {
          a.phi += gap / 2 / rr
          b.phi -= gap / 2 / rr
        }
      }
    }
    return items.map((it) => ({
      ...it,
      tex: signTexture({ text: it.w.name, sub: it.w.sub.toUpperCase(), color: '#fff8ea', bg: it.w.color, border: '#fff3d6', w: 1024, h: 256, letterSpacing: 1 }),
    }))
  }, [pods])
  const bulbs = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let a = -84; a <= 84; a += 4) {
      const phi = a * DEG
      pts.push([Math.sin(phi) * (R - 0.4), 4.5, -Math.cos(phi) * (R - 0.4)])
    }
    return pts
  }, [])

  return (
    <>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {pods.map((p) => (
        <PodBits key={p.p.id} pod={p} wakes={wakes} />
      ))}
      <Hub />
      <Spot pods={pods} wakes={wakes} />
      {banners.map(({ w, phi, tex, width }) => (
        <SignBoard key={w.id} map={tex} w={width} h={width / 4} position={[Math.sin(phi) * (R - 0.5), 5.6, -Math.cos(phi) * (R - 0.5)]} rotation={[0, -phi, 0]} lit={false} />
      ))}
      <Bulbs points={bulbs} size={0.1} speed={5} group={3} colorA="#ffe3a1" colorB="#7a5a90" />
      <Motes count={70} box={[24, 8, 20]} position={[0, 0, -1]} color="#ffe9c0" size={3} />
      <sprite material={halo} position={[0, 2.5, 1.2]} scale={[6, 6, 1]} />

      <Hotspot
        id="director"
        x={-6.6}
        y={1.5}
        z={5.7}
        radius={2.6}
        label="SIT"
        title="Director’s chair"
        kind="secret"
        look={[-6.6, 1.3, 4.6]}
        onUse={() => {
          const st = store.getState()
          st.showToast('Director’s chair. Comfortable until the notes arrive.', st.addSecret('director') ? 'secret' : 'info')
        }}
      />
      <Hotspot
        id="clapper"
        x={-8.6}
        y={1.5}
        z={3.9}
        radius={2.4}
        label="CLAP"
        title="Clapperboard"
        kind="secret"
        look={[-8.6, 1.2, 3.0]}
        onUse={() => {
          const st = store.getState()
          st.showToast('And… action!', st.addSecret('clapper') ? 'secret' : 'info')
        }}
      />
    </>
  )
}

export function WorkRoom() {
  return (
    <Interior id="work" w={R * 2} d={R * 2} floor="tile">
      <WorkContent />
    </Interior>
  )
}

