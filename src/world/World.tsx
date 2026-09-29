import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { FogExp2 } from 'three'
import { game } from '../engine/game'
import { smoothstep } from '../engine/math'
import { R } from '../engine/planet'
import { quality } from '../engine/quality'
import { P } from '../gfx/palette'
import { Character } from '../play/Character'
import { GameLoop } from '../play/GameLoop'
import { cam, player } from '../engine/state'
import { Experience } from './buildings/Experience'
import { Hire } from './buildings/Hire'
import { Home } from './buildings/Home'
import { Results } from './buildings/Results'
import { Work } from './buildings/Work'
import { HorizonCuller } from './cull'
import { Dressing } from './Dressing'
import { LightRig } from './LightRig'
import { Life } from './Life'
import { Paths } from './Paths'
import { Planet } from './Planet'
import { Plaza } from './Plaza'
import { Scatter } from './Scatter'
import { Sky } from './Sky'
import { Visitors } from './Visitors'

const FOG_NEAR = 0.026

/** Fog that melts the horizon when you are on the ground, and clears when you are high above the planet (or looking at a building's page). */
function FogRig() {
  const ref = useRef<FogExp2>(null)
  useFrame(() => {
    const f = ref.current
    if (!f) return
    f.color.set(P.fog)
    const alt = game.camPos.length() - R
    const clear = Math.max(smoothstep(18, 46, alt), cam.placeAmt * 0.72)
    f.density = FOG_NEAR * (1 - clear) + 0.0009 * clear
  })
  return <fogExp2 ref={ref} attach="fog" args={[P.fog, FOG_NEAR]} />
}

/** Everything you can see on the planet. */
export function World() {
  return (
    <>
      <FogRig />
      <Sky />
      <LightRig />
      <Planet detail={quality.planetDetail} />
      <Paths />
      <Plaza />
      <Scatter />
      <Dressing />
      <Life />
      <Visitors />
      <Home />
      <Experience />
      <Work />
      <Results />
      <Hire />
      <HorizonCuller />
      <Character state={player} isPlayer />
      <GameLoop />
    </>
  )
}
