import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Texture, Vector3 } from 'three'
import { damp } from '../../engine/math'
import { game } from '../../engine/game'
import { register } from '../../engine/interact'
import { toTangent } from '../../engine/planet'
import { buildings, enterBuilding, getDoor } from '../../engine/scenes'
import { player } from '../../engine/state'
import { InteriorId } from '../../engine/store'
import { GeoBuilder } from '../../gfx/geo'
import { worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { Frame3 } from '../place'

// ---- painted boards & screens -----------------------------------------------------------------
export function SignBoard({
  map,
  w,
  h,
  position,
  rotation,
  lit = true,
  castShadow = false,
  transparent = true,
}: {
  map: Texture
  w: number
  h: number
  position: [number, number, number]
  rotation?: [number, number, number]
  lit?: boolean
  castShadow?: boolean
  transparent?: boolean
}) {
  const geo = useMemo(() => new PlaneGeometry(w, h), [w, h])
  const mat = useMemo(
    () => (lit ? worldMaterial({ map, transparent, rim: false }) : new MeshBasicMaterial({ map, transparent, toneMapped: false })),
    [map, lit, transparent],
  )
  return <mesh geometry={geo} material={mat} position={position} rotation={rotation} castShadow={castShadow} />
}

// ---- door -------------------------------------------------------------------------------------------
function buildLeaf(w: number, h: number, color: string, dark: string) {
  const b = new GeoBuilder(31)
  b.ao = 0
  b.put(w / 2, 0, 0, (b) => b.arch(w, h, 0.16, color))
  // planks + studs + handle
  for (let i = 1; i < 4; i++) b.put((i * w) / 4, 0.15, 0.085, (b) => b.box(0.045, h - 0.6, 0.02, dark))
  b.put(w * 0.5, h * 0.62, 0.09, (b) => b.box(w * 0.94, 0.09, 0.03, dark))
  b.put(w * 0.5, h * 0.3, 0.09, (b) => b.box(w * 0.94, 0.09, 0.03, dark))
  b.put(w * 0.84, h * 0.42, 0.14, (b) => b.sphere(0.1, P.gold, {}, 8, 6))
  return b.build()
}

function buildFrame(w: number, h: number, trim: string) {
  const b = new GeoBuilder(32)
  b.ao = 0.2
  // thick arch surround + a dark warm recess behind the leaf
  b.put(0, 0, -0.32, (b) => b.arch(w + 0.02, h + 0.02, 0.4, '#2a1b33', { glow: 0.42 }))
  b.put(0, 0, 0.0, (b) => b.arch(w + 0.9, h + 0.55, 0.36, trim))
  b.put(0, 0, 0.19, (b) => b.arch(w + 0.42, h + 0.16, 0.06, '#2a1b33', { glow: 0.0 }))
  // recess again on top so the surround reads as a frame
  b.put(0, 0, 0.185, (b) => b.arch(w + 0.02, h + 0.02, 0.09, '#2a1b33', { glow: 0.42 }))
  return b.build()
}

export function Door({
  id,
  width = 2.5,
  height = 3.6,
  color = P.teal,
  dark = P.tealDeep,
  trim = P.cream,
  position,
  frame,
  localZ,
}: {
  id: string
  width?: number
  height?: number
  color?: string
  dark?: string
  trim?: string
  position: [number, number, number]
  frame: Frame3
  localZ: number
}) {
  const leaf = useMemo(() => buildLeaf(width, height, color, dark), [width, height, color, dark])
  const fr = useMemo(() => buildFrame(width, height, trim), [width, height, trim])
  const mat = useMemo(() => worldMaterial({}), [])
  const hinge = useRef<Group>(null)
  const spill = useRef<Mesh>(null)
  const spillMat = useMemo(() => new MeshBasicMaterial({ color: new Color('#ffcf8a'), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }), [])
  const spillGeo = useMemo(() => new PlaneGeometry(width * 1.3, 4.2).rotateX(-Math.PI / 2), [width])
  const st = getDoor(id)
  const world = useMemo(() => frame.toWorld(position[0], 0, position[2]), [frame, position])

  useFrame((_, dt) => {
    let target = 0
    if (game.mode === 'world') {
      const d = player.pos.distanceTo(world)
      if (d < 7.5) target = 1
    }
    if (st.force) target = 1
    st.open = damp(st.open, target, target > st.open ? 5.5 : 3.2, Math.min(dt, 0.05))
    if (hinge.current) hinge.current.rotation.y = st.open * 1.72
    spillMat.opacity = st.open * 0.55
    if (spill.current) spill.current.visible = st.open > 0.02
  })

  return (
    <group position={position}>
      <mesh geometry={fr} material={mat} castShadow receiveShadow />
      <group ref={hinge} position={[-width / 2, 0, 0.1]}>
        <mesh geometry={leaf} material={mat} castShadow />
      </group>
      <mesh ref={spill} geometry={spillGeo} material={spillMat} position={[0, 0.07, 2.4]} renderOrder={4} />
    </group>
  )
}

// ---- register the building's door with the engine ------------------------------------------------------
export function useBuildingDoor(opts: {
  id: InteriorId
  label: string
  color: string
  frame: Frame3
  /** local z of the door plane (front wall surface) */
  doorZ: number
  doorX?: number
  /** local height to aim the camera / glance at */
  lookY?: number
  radius?: number
}) {
  const { id, label, color, frame, doorZ, doorX = 0, lookY = 1.9, radius = 5.4 } = opts
  useEffect(() => {
    const out = frame.dir(0, 1)
    const door = frame.toWorld(doorX, 0, doorZ)
    const outN = frame.unit(doorX, doorZ + 6.2)
    const outDir = toTangent(out.clone(), outN)
    const rt = {
      id,
      label,
      color,
      door,
      insideN: frame.unit(doorX, doorZ - 3.2),
      outN,
      outDir,
      doorLook: frame.toWorld(doorX, lookY, doorZ),
    }
    buildings[id] = rt
    const anchor = frame.toWorld(doorX, lookY + 0.6, doorZ + 0.8)
    const off = register({
      id: `enter-${id}`,
      anchor,
      radius,
      label: 'ENTER',
      title: label,
      kind: 'door',
      scope: 'world',
      dir: out.clone(),
      dirCos: 0.42,
      look: rt.doorLook,
      priority: 2,
      onUse: () => enterBuilding(id),
    })
    return () => {
      off()
      delete buildings[id]
    }
  }, [id, label, color, frame, doorZ, doorX, lookY, radius])
}

// ---- a few reusable bits -----------------------------------------------------------------------------------
export function geoMesh(geo: BufferGeometry, mat = worldMaterial({}), cast = true) {
  return <mesh geometry={geo} material={mat} castShadow={cast} receiveShadow />
}

void Vector3
