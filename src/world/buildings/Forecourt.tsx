import { useMemo } from 'react'
import { GeoBuilder } from '../../gfx/geo'
import { glowSpriteMaterial, worldMaterial } from '../../gfx/materials'
import { P } from '../../gfx/palette'
import { Frame3, circleCollider } from '../place'
import { addBench, addLamp, addPlanter, addRug, V3 } from '../props'
import { useEffect } from 'react'

type Kind = 'home' | 'experience' | 'work' | 'results' | 'hire'

/** Everything that dresses the ground in front of a building's door, merged into one mesh. */
export function Forecourt({ frame, z, kind }: { frame: Frame3; z: number; kind: Kind }) {
  const { geo, glows } = useMemo(() => {
    const b = new GeoBuilder(60 + kind.length)
    const glows: V3[] = []
    switch (kind) {
      case 'home':
        addRug(b, 0, z + 3.4, 3.0, [P.terracotta, P.cream, P.marigold])
        glows.push(addLamp(b, -4.4, z + 1.6), addLamp(b, 4.4, z + 1.6))
        addPlanter(b, -3.1, z + 0.4, 1, P.pink)
        addPlanter(b, 3.1, z + 0.4, 1, P.marigold)
        addBench(b, -6.6, z + 4.8, Math.PI / 2 - 0.5)
        addBench(b, 6.6, z + 4.8, -Math.PI / 2 + 0.5)
        break
      default:
        break
    }
    return { geo: b.build(), glows }
  }, [frame, z, kind])
  const mat = useMemo(() => worldMaterial({}), [])
  const halo = useMemo(() => glowSpriteMaterial('#ffbf5a', 0.85), [])

  useEffect(() => {
    // lamp posts + planters are solid
    const offs: (() => void)[] = []
    if (kind === 'home') {
      offs.push(circleCollider(frame, -4.4, z + 1.6, 0.3, 2), circleCollider(frame, 4.4, z + 1.6, 0.3, 2))
      offs.push(circleCollider(frame, -3.1, z + 0.4, 0.5, 2), circleCollider(frame, 3.1, z + 0.4, 0.5, 2))
    }
    return () => offs.forEach((f) => f())
  }, [frame, z, kind])

  return (
    <>
      <mesh geometry={geo} material={mat} castShadow receiveShadow />
      {glows.map((g, i) => (
        <sprite key={i} material={halo} position={g} scale={[2.6, 2.6, 1]} />
      ))}
    </>
  )
}
