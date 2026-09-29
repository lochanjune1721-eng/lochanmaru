import { Sky } from './Sky'
import { LightRig } from './LightRig'
import { Planet } from './Planet'
import { Paths } from './Paths'
import { Plaza } from './Plaza'
import { Scatter } from './Scatter'
import { HorizonCuller } from './cull'
import { Home } from './buildings/Home'
import { Experience } from './buildings/Experience'
import { Work } from './buildings/Work'
import { Results } from './buildings/Results'
import { Hire } from './buildings/Hire'
import { P } from '../gfx/palette'
import { quality } from '../engine/quality'
import { GameLoop } from '../play/GameLoop'
import { Character } from '../play/Character'
import { player } from '../engine/state'

/** Everything you can see on the outside of the planet. */
export function World() {
  return (
    <>
      <fogExp2 attach="fog" args={[P.fog, 0.026]} />
      <Sky />
      <LightRig />
      <Planet detail={quality.planetDetail} />
      <Paths />
      <Plaza />
      <Scatter />
      <HorizonCuller />
      <Home />
      <Experience />
      <Work />
      <Results />
      <Hire />
      <Character state={player} isPlayer />
      <GameLoop />
    </>
  )
}
