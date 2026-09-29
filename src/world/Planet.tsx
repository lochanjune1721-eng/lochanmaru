import { useMemo } from 'react'
import { worldMaterial, makeWaterMaterial } from '../gfx/materials'
import { useFrame } from '@react-three/fiber'
import { game } from '../engine/game'
import { buildPlanetGeometries } from './planetMesh'

/** Ground + sea. Built once from a shared lattice; heavy work happens at load, never per frame. */
export function Planet({ detail = 64 }: { detail?: number }) {
  const { ground, sea } = useMemo(() => buildPlanetGeometries(detail), [detail])
  const groundMat = useMemo(() => worldMaterial({ ground: true, rim: false }), [])
  const seaMat = useMemo(() => makeWaterMaterial(), [])

  useFrame(() => {
    seaMat.uniforms.uSunDir.value.copy(game.sunDir)
  })

  return (
    <>
      <mesh geometry={ground} material={groundMat} receiveShadow />
      <mesh geometry={sea} material={seaMat} renderOrder={2} />
    </>
  )
}
