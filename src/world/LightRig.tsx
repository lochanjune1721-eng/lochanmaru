import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { DirectionalLight, HemisphereLight, Vector3 } from 'three'
import { DEG, smoothstep } from '../engine/math'
import { game } from '../engine/game'
import { mapBasisAt, mapToN, surfaceDistance } from '../engine/planet'
import { P } from '../gfx/palette'
import { POIS } from './layout'

const _north = new Vector3()
const _east = new Vector3()
const _right = new Vector3()
const _up = new Vector3()
const _f = new Vector3()
const _snap = new Vector3()

// Sun compass bearing (towards the sun) per district, so every building front catches warm light.
const DISTRICTS = [
  { n: mapToN(POIS.experience.x, POIS.experience.z), az: 128 * DEG },
  { n: mapToN(POIS.work.x, POIS.work.z), az: 228 * DEG },
  { n: mapToN(POIS.results.x, POIS.results.z), az: 176 * DEG },
  { n: mapToN(POIS.hire.x, POIS.hire.z), az: 190 * DEG },
]
const BASE_AZ = 206 * DEG
const SUN_EL = 31 * DEG

export function sunAzimuthAt(n: Vector3) {
  let x = Math.sin(BASE_AZ) * 0.35
  let z = Math.cos(BASE_AZ) * 0.35
  for (const d of DISTRICTS) {
    const w = 1 - smoothstep(6, 34, surfaceDistance(n, d.n))
    x += Math.sin(d.az) * w * 2.2
    z += Math.cos(d.az) * w * 2.2
  }
  return Math.atan2(x, z)
}

export function LightRig() {
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)

  useEffect(() => {
    const l = sun.current
    if (!l) return
    l.target.position.set(0, 0, 45)
    l.parent?.add(l.target)
  }, [])

  useFrame(() => {
    const l = sun.current
    const h = hemi.current
    if (!l || !h) return
    const n = game.focusN
    mapBasisAt(n, _north, _east)
    const az = sunAzimuthAt(n)
    const cosE = Math.cos(SUN_EL)
    game.sunDir
      .copy(n)
      .multiplyScalar(Math.sin(SUN_EL))
      .addScaledVector(_north, Math.cos(az) * cosE)
      .addScaledVector(_east, Math.sin(az) * cosE)
      .normalize()

    // hemisphere "up" follows the local surface normal
    h.position.copy(game.up).multiplyScalar(10)

    // directional light with a texel-snapped shadow frustum that trails the focus point
    _f.copy(game.sunDir).negate()
    _up.copy(game.up)
    _right.crossVectors(_f, _up).normalize()
    _up.crossVectors(_right, _f).normalize()
    const size = (l.shadow.camera as any).right * 2
    const texel = size / l.shadow.mapSize.x
    const fx = game.focus.dot(_right)
    const fy = game.focus.dot(_up)
    const fz = game.focus.dot(_f)
    _snap
      .set(0, 0, 0)
      .addScaledVector(_right, Math.round(fx / texel) * texel)
      .addScaledVector(_up, Math.round(fy / texel) * texel)
      .addScaledVector(_f, fz)
    l.target.position.copy(_snap)
    l.position.copy(_snap).addScaledVector(game.sunDir, 70)
    l.shadow.camera.up.copy(game.up)
  })

  return (
    <>
      <hemisphereLight ref={hemi} args={[P.hemiSky, P.hemiGround, 1.25]} />
      <directionalLight
        ref={sun}
        color={P.sun}
        intensity={3.4}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={2}
        shadow-camera-far={150}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      />
    </>
  )
}
