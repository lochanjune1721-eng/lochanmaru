import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Mesh, SphereGeometry, Vector3 } from 'three'
import { game } from '../engine/game'
import { R, mapBasisAt } from '../engine/planet'
import { makeSkyMaterial } from '../gfx/materials'
import { DEG } from '../engine/math'
import { LOOK } from '../interiors/presets'
import { store } from '../engine/store'
import { P } from '../gfx/palette'

const _n = new Vector3()
const _north = new Vector3()
const _east = new Vector3()
const _moon = new Vector3()

/** Sky dome oriented to the *local* surface normal, so it turns as you travel around the planet. */
export function Sky() {
  const mat = useMemo(() => makeSkyMaterial(), [])
  const geo = useMemo(() => new SphereGeometry(300, 32, 20), [])
  const ref = useRef<Mesh>(null)
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    mesh.position.copy(camera.position)
    const u = mat.uniforms
    if (game.mode === 'interior') {
      const k = LOOK[store.getState().interior!]
      u.cZenith.value.set(k.skyTop)
      u.cMid.value.set(k.skyMid)
      u.cHorizon.value.set(k.skyHor)
      u.uUp.value.set(0, 1, 0)
      u.uHorizon.value = -0.35
      u.uSunDir.value.set(0, -1, 0)
      u.uMoonDir.value.set(0, -1, 0)
      return
    }
    u.cZenith.value.set(P.skyZenith)
    u.cMid.value.set(P.skyMid)
    u.cHorizon.value.set(P.fog)
    u.uUp.value.copy(game.up)
    u.uSunDir.value.copy(game.sunDir)
    // camera altitude -> how far below eye level the planet's horizon sits
    const H = Math.max(0.5, camera.position.length() - R)
    const cosDip = R / (R + H)
    u.uHorizon.value = -Math.sqrt(Math.max(0, 1 - cosDip * cosDip))
    // moon: fixed compass direction relative to local map frame, low above the horizon
    _n.copy(game.up)
    mapBasisAt(_n, _north, _east)
    const az = 62 * DEG
    const el = 17 * DEG
    _moon
      .copy(_n)
      .multiplyScalar(Math.sin(el))
      .addScaledVector(_north, Math.cos(az) * Math.cos(el))
      .addScaledVector(_east, Math.sin(az) * Math.cos(el))
      .normalize()
    u.uMoonDir.value.copy(_moon)
  })

  return <mesh ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={-100} />
}
