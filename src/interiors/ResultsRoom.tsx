// Results interior — STUB (to be replaced by the full room)
import { useMemo } from 'react'
import { GeoBuilder } from '../gfx/geo'
import { worldMaterial } from '../gfx/materials'
import { Interior } from './kit'
import { room } from './parts'

const W = 24
const D = 18

function Content() {
  const geo = useMemo(() => {
    const b = new GeoBuilder(1)
    room(b, { w: W, d: D, wallH: 7, floorTop: '#e2c197', wall: '#f5e3c8', trim: '#b98a68' })
    return b.build()
  }, [])
  const mat = useMemo(() => worldMaterial({}), [])
  return <mesh geometry={geo} material={mat} receiveShadow castShadow />
}

export function ResultsRoom() {
  return (
    <Interior id="results" w={W} d={D}>
      <Content />
    </Interior>
  )
}
