// Animated in-world screens (canvas textures redrawn at a low frame rate, only while near) and chase bulbs.
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { CanvasTexture, Color, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry, SphereGeometry, Vector3 } from 'three'
import { game } from '../../engine/game'
import { makeCanvas, toTexture } from '../../gfx/text'

export type DrawFn = (g: CanvasRenderingContext2D, t: number, w: number, h: number) => void

/** A screen showing a canvas that is redrawn `fps` times a second while the visitor is within `range`. */
export function LedScreen({
  w,
  h,
  position,
  rotation,
  draw,
  fps = 10,
  texW = 1024,
  texH = 384,
  range = 70,
  active,
}: {
  w: number
  h: number
  position: [number, number, number]
  rotation?: [number, number, number]
  draw: DrawFn
  fps?: number
  texW?: number
  texH?: number
  range?: number
  /** optional external gate */
  active?: () => boolean
}) {
  const { canvas, ctx, tex } = useMemo(() => {
    const { c, g } = makeCanvas(texW, texH)
    const t = toTexture(c, 4) as CanvasTexture
    return { canvas: c, ctx: g, tex: t }
  }, [texW, texH])
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, toneMapped: false }), [tex])
  const geo = useMemo(() => new PlaneGeometry(w, h), [w, h])
  const ref = useRef<Object3D>(null)
  const last = useRef(-1)
  const wp = useMemo(() => new Vector3(), [])

  useEffect(() => {
    draw(ctx, 0, texW, texH)
    tex.needsUpdate = true
  }, [draw, ctx, tex, texW, texH])

  useFrame(() => {
    const o = ref.current
    if (!o) return
    if (active && !active()) return
    o.getWorldPosition(wp)
    if (wp.distanceTo(game.camPos) > range) return
    const t = game.time
    if (t - last.current < 1 / fps) return
    last.current = t
    draw(ctx, t, texW, texH)
    tex.needsUpdate = true
  })

  void canvas
  return <mesh ref={ref} geometry={geo} material={mat} position={position} rotation={rotation} />
}

/** A string of marquee bulbs that chase. */
export function Bulbs({ points, size = 0.11, speed = 5, colorA = '#ffe3a1', colorB = '#7a4b2a', group = 3 }: { points: [number, number, number][]; size?: number; speed?: number; colorA?: string; colorB?: string; group?: number }) {
  const geo = useMemo(() => new SphereGeometry(size, 8, 6), [size])
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), [])
  const ref = useRef<InstancedMesh>(null)
  const a = useMemo(() => new Color(colorA), [colorA])
  const b = useMemo(() => new Color(colorB), [colorB])
  const c = useMemo(() => new Color(), [])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new Object3D()
    points.forEach((p, i) => {
      o.position.set(p[0], p[1], p[2])
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
      m.setColorAt(i, a)
    })
    m.instanceMatrix.needsUpdate = true
  }, [points, a])
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const t = game.time * speed
    for (let i = 0; i < points.length; i++) {
      const on = (i + Math.floor(t)) % group === 0
      c.copy(on ? a : b).lerp(a, on ? 0 : 0.15)
      m.setColorAt(i, c)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })
  // the bulbs are placed after mount, so a bounding sphere computed earlier would wrongly cull them
  return <instancedMesh ref={ref} args={[geo, mat, points.length]} frustumCulled={false} />
}
