// Interior kit: stage registration, colliders, hotspots and a freestanding exit arch.
// Every interior is a small cut-away diorama floating in its own sky, positioned far from the planet.
import { useFrame } from '@react-three/fiber'
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Group, Sprite, SpriteMaterial, Vector3, AdditiveBlending } from 'three'
import { game } from '../engine/game'
import { showPanel } from '../engine/panel'
import type { PanelContent } from '../engine/store'
import { ColliderSet } from '../engine/collision'
import { register } from '../engine/interact'
import { exitBuilding, stage } from '../engine/scenes'
import { InteriorRuntime } from '../engine/state'
import { InteriorId } from '../engine/store'
import { GeoBuilder } from '../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../gfx/materials'
import { P } from '../gfx/palette'

export const INTERIOR_INDEX: Record<InteriorId, number> = { home: 0, experience: 1, work: 2, results: 3, hire: 4 }
export const interiorOrigin = (id: InteriorId) => 2000 + INTERIOR_INDEX[id] * 300

interface Ctx {
  id: InteriorId
  X0: number
  w: number
  d: number
  colliders: ColliderSet
}
const InteriorCtx = createContext<Ctx | null>(null)
export const useInterior = () => {
  const c = useContext(InteriorCtx)
  if (!c) throw new Error('outside <Interior>')
  return c
}

/**
 * Registers a room with the stage. `w` (x) and `d` (z) are the walkable floor size; the entry is at the
 * front (+z), and the camera looks towards -z.
 */
export function Interior({ id, w, d, floor = 'wood', children }: { id: InteriorId; w: number; d: number; floor?: InteriorRuntime['floor']; children?: ReactNode }) {
  const X0 = interiorOrigin(id)
  const ref = useRef<Group>(null)
  const colliders = useMemo(() => new ColliderSet(false), [])
  const ctx = useMemo<Ctx>(() => ({ id, X0, w, d, colliders }), [id, X0, w, d, colliders])

  useEffect(() => {
    const g = ref.current!
    g.visible = false
    const runtime: InteriorRuntime = {
      id,
      colliders,
      bounds: { minX: X0 - w / 2, maxX: X0 + w / 2, minZ: -d / 2, maxZ: d / 2 },
      origin: new Vector3(X0, 0, 0),
      floor,
    }
    stage.interiors[id] = g
    stage.runtime[id] = runtime
    stage.spawn[id] = { pos: new Vector3(X0, 0, d / 2 - 4.8), dir: new Vector3(0, 0, -1) }
    return () => {
      delete stage.interiors[id]
      delete stage.runtime[id]
      delete stage.spawn[id]
    }
  }, [id, X0, w, d, colliders, floor])

  return (
    <InteriorCtx.Provider value={ctx}>
      <group ref={ref} position={[X0, 0, 0]}>
        {children}
        <ExitArch />
      </group>
    </InteriorCtx.Provider>
  )
}

/** Solid box (interior-local x,z). */
export function useBox(x: number, z: number, hx: number, hz: number, h = 3, rot = 0) {
  const { X0, colliders } = useInterior()
  useEffect(() => {
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    const col = colliders.box(new Vector3(X0 + x, 0, z), new Vector3(c, 0, -s), new Vector3(s, 0, c), hx, hz, h)
    return () => {
      const i = colliders.list.indexOf(col)
      if (i >= 0) colliders.list.splice(i, 1)
    }
  }, [X0, colliders, x, z, hx, hz, h, rot])
}

export function useCircle(x: number, z: number, r: number, h = 3) {
  const { X0, colliders } = useInterior()
  useEffect(() => {
    const col = colliders.circle(new Vector3(X0 + x, 0, z), new Vector3(1, 0, 0), new Vector3(0, 0, 1), r, h)
    return () => {
      const i = colliders.list.indexOf(col)
      if (i >= 0) colliders.list.splice(i, 1)
    }
  }, [X0, colliders, x, z, r, h])
}

const seen = new Set<string>()
export const hasSeen = (id: string) => seen.has(id)

let starTex: CanvasTexture | null = null
function starTexture() {
  if (starTex) return starTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 30)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.3, 'rgba(255,236,170,0.75)')
  grd.addColorStop(1, 'rgba(255,220,120,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  g.fillStyle = '#fffbe8'
  g.beginPath()
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 5 : 20
    const a = (i / 8) * Math.PI * 2
    g.lineTo(32 + Math.sin(a) * r, 32 - Math.cos(a) * r)
  }
  g.closePath()
  g.fill()
  starTex = new CanvasTexture(c)
  return starTex
}

/** Opens a content panel and eases the camera onto a point in this room. */
export function useOpen() {
  const { X0 } = useInterior()
  return (panel: PanelContent, x: number, y: number, z: number, dist = 8) => showPanel(panel, new Vector3(X0 + x, y, z), dist)
}

export interface HotspotProps {
  id: string
  x: number
  y?: number
  z: number
  radius?: number
  label: string
  title?: string
  kind?: 'object' | 'secret' | 'link' | 'npc'
  /** where the head/camera should look (interior-local) */
  look?: [number, number, number]
  onUse: () => void
  onNear?: (dist: number) => void
  priority?: number
  active?: () => boolean
  /** show a bobbing sparkle until it's been used (default true) */
  sparkle?: boolean
}

/** A thing in a room you can walk up to and use. */
export function Hotspot({ id, x, y = 1.4, z, radius = 2.8, label, title, kind = 'object', look, onUse, onNear, priority, active, sparkle = true }: HotspotProps) {
  const { id: room, X0 } = useInterior()
  const star = useRef<Sprite>(null)
  const mat = useMemo(() => new SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.95, toneMapped: false }), [])
  const key = `${room}:${id}`
  useFrame(() => {
    const s = star.current
    if (!s) return
    const gone = seen.has(key)
    s.visible = !gone && game.mode === 'interior'
    if (!gone) {
      const t = game.time
      s.position.y = y + 0.85 + Math.sin(t * 2.2 + x) * 0.12
      s.scale.setScalar(0.95 + Math.sin(t * 3.1 + z) * 0.12)
      mat.rotation = t * 0.5
    }
  })
  const use = () => {
    seen.add(key)
    onUse()
  }
  useEffect(() => {
    return register({
      id: `${room}:${id}`,
      anchor: new Vector3(X0 + x, y, z),
      radius,
      label,
      title,
      kind,
      scope: room,
      look: look ? new Vector3(X0 + look[0], look[1], look[2]) : new Vector3(X0 + x, y, z),
      onUse: use,
      onNear,
      priority,
      active,
    })
  }, [room, X0, id, x, y, z, radius, label, title, kind, look, onUse, onNear, priority, active])
  return sparkle && kind !== 'secret' ? <sprite ref={star} material={mat} position={[x, y + 0.85, z]} renderOrder={5} /> : null
}

/** A low glowing threshold at the front edge of the room (nothing tall between camera and visitor). */
function ExitArch() {
  const { d } = useInterior()
  const geo = useMemo(() => {
    const b = new GeoBuilder(91)
    b.ao = 0.1
    b.aoHeight = 1.2
    // door-shaped plate lying on the floor: gold rim, warm glow inside, arrow chevrons
    b.push().at(0, 0.05, 0.6).rotX(-Math.PI / 2)
    b.arch(3.4, 3.8, 0.08, P.gold, { ao: 0 })
    b.put(0, 0.12, 0.05, (b) => b.arch(2.9, 3.4, 0.05, '#fff0c0', { glow: 0.55, ao: 0 }))
    b.pop()
    for (let i = 0; i < 3; i++) b.put(0, 0.12, -0.2 + i * 0.7, (b) => b.rotY(Math.PI / 4).box(0.5, 0.03, 0.5, P.gold, { ao: 0, glow: 0.3 }))
    for (const sx of [-1, 1]) {
      b.put(sx * 2.2, 0, 0.2, (b) => b.cyl(0.09, 0.12, 1.5, 6, P.ink))
      b.put(sx * 2.2, 1.5, 0.2, (b) => b.box(0.34, 0.42, 0.34, P.marigold, { glow: 0.9, ao: 0 }))
      b.put(sx * 2.2, 1.92, 0.2, (b) => b.cone(0.28, 0.26, 4, P.ink))
    }
    return b.build()
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffe6a8', 0.5), [])
  const z = d / 2 - 1.3
  return (
    <>
      <group position={[0, 0, z]}>
        <mesh geometry={geo} material={mat} receiveShadow />
        <sprite material={halo} position={[-2.2, 1.7, 0.2]} scale={[2.4, 2.4, 1]} />
        <sprite material={halo} position={[2.2, 1.7, 0.2]} scale={[2.4, 2.4, 1]} />
      </group>
      <Hotspot id="exit" x={0} y={1.2} z={z + 0.5} radius={2.0} label="EXIT" title="Back outside" kind="object" onUse={() => exitBuilding()} priority={-2} look={[0, 1.4, z]} sparkle={false} />
    </>
  )
}
