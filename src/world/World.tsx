import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { FogExp2, Group } from 'three'
import { game } from '../engine/game'
import { smoothstep } from '../engine/math'
import { R } from '../engine/planet'
import { quality } from '../engine/quality'
import { P } from '../gfx/palette'
import { LOOK } from '../interiors/presets'
import { store } from '../engine/store'
import { stage } from '../engine/scenes'
import { Character } from '../play/Character'
import { GameLoop } from '../play/GameLoop'
import { player } from '../engine/state'
import { Experience } from './buildings/Experience'
import { Hire } from './buildings/Hire'
import { Home } from './buildings/Home'
import { Results } from './buildings/Results'
import { Work } from './buildings/Work'
import { HorizonCuller } from './cull'
import { LightRig } from './LightRig'
import { Paths } from './Paths'
import { Planet } from './Planet'
import { Plaza } from './Plaza'
import { Scatter } from './Scatter'
import { Sky } from './Sky'
import { HomeRoom } from '../interiors/HomeRoom'
import { ExperienceRoom } from '../interiors/ExperienceRoom'
import { WorkRoom } from '../interiors/WorkRoom'
import { ResultsRoom } from '../interiors/ResultsRoom'
import { HireRoom } from '../interiors/HireRoom'

const FOG_NEAR = 0.026

/** Fog that melts the horizon when you are on the ground, and clears when you are high above the planet. */
function FogRig() {
  const ref = useRef<FogExp2>(null)
  useFrame(() => {
    const f = ref.current
    if (!f) return
    if (game.mode === 'interior') {
      const k = LOOK[store.getState().interior!]
      f.color.set(k.skyHor)
      f.density = k.fogDensity
      return
    }
    f.color.set(P.fog)
    const alt = game.camPos.length() - R
    f.density = FOG_NEAR * (1 - smoothstep(18, 46, alt)) + 0.0009 * smoothstep(18, 46, alt)
  })
  return <fogExp2 ref={ref} attach="fog" args={[P.fog, FOG_NEAR]} />
}

/** Everything you can see on the outside of the planet. */
export function World() {
  const outside = useRef<Group>(null)
  useEffect(() => {
    stage.world = outside.current
    return () => {
      stage.world = null
    }
  }, [])
  return (
    <>
      <FogRig />
      <Sky />
      <LightRig />
      <group ref={outside}>
        <Planet detail={quality.planetDetail} />
        <Paths />
        <Plaza />
        <Scatter />
        <Home />
        <Experience />
        <Work />
        <Results />
        <Hire />
      </group>
      <HorizonCuller />
      <HomeRoom />
      <ExperienceRoom />
      <WorkRoom />
      <ResultsRoom />
      <HireRoom />
      <Character state={player} isPlayer />
      <GameLoop />
    </>
  )
}
