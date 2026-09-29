import { useFrame } from '@react-three/fiber'
import { RefObject, useEffect, useMemo, useRef } from 'react'
import { BufferGeometry, Color, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Texture, Vector3 } from 'three'
import { damp } from '../../engine/math'
import { register } from '../../engine/interact'
import { toTangent } from '../../engine/planet'
import { Place, getDoor, openPage, places } from '../../engine/places'
import { player } from '../../engine/state'
import { PlaceId } from '../../engine/store'
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
    let target = player.pos.distanceTo(world) < 7.5 ? 1 : 0
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

// ---- register the building as a place you can open ----------------------------------------------------------
export function usePlace(opts: {
  id: PlaceId
  label: string
  color: string
  frame: Frame3
  /** groups holding the building's meshes (clicking / hovering any of them targets this building) */
  roots: RefObject<Object3D | null>[]
  /** local z of the door plane (front wall surface) */
  doorZ: number
  doorX?: number
  /** local height of the door (for glances) */
  lookY?: number
  /** how close you have to be for the "open" prompt */
  radius?: number
  /** camera framing while the page is open — what it looks at (building space), how far, how high, how far round */
  focus: [number, number, number]
  dist: number
  pitch?: number
  yaw?: number
  /** where the floating name tag hangs (building space) */
  tag: [number, number, number]
}) {
  const { id, label, color, frame, roots, doorZ, doorX = 0, lookY = 1.9, radius = 5.4, focus, dist, pitch = 0.32, yaw = 0.42, tag } = opts
  useEffect(() => {
    const out = frame.dir(0, 1)
    const door = frame.toWorld(doorX, 0, doorZ)
    const outN = frame.unit(doorX, doorZ + 6.2)
    const place: Place = {
      id,
      label,
      color,
      frame,
      door,
      outN,
      outDir: toTangent(out.clone(), outN),
      doorLook: frame.toWorld(doorX, lookY, doorZ),
      focus: frame.toWorld(focus[0], focus[1], focus[2]),
      dist,
      pitch,
      yaw,
      labelAt: frame.toWorld(tag[0], tag[1], tag[2]),
      roots: roots.map((r) => r.current).filter((o): o is Object3D => !!o),
    }
    places[id] = place
    const off = register({
      id: `open-${id}`,
      anchor: frame.toWorld(doorX, lookY + 0.6, doorZ + 0.8),
      radius,
      label: 'OPEN',
      title: label,
      kind: 'door',
      dir: out.clone(),
      dirCos: 0.42,
      look: place.doorLook,
      priority: 2,
      onUse: () => openPage(id),
    })
    return () => {
      off()
      delete places[id]
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, color, frame, doorZ, doorX, lookY, radius, dist, pitch, yaw])
}

// ---- a few reusable bits -----------------------------------------------------------------------------------
export function geoMesh(geo: BufferGeometry, mat = worldMaterial({}), cast = true) {
  return <mesh geometry={geo} material={mat} castShadow={cast} receiveShadow />
}

void Vector3
