import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { PerspectiveCamera } from 'three'
import { updateCamera } from '../engine/camera'
import { game } from '../engine/game'
import { updateInteractions } from '../engine/interactions'
import { updatePlayer } from '../engine/player'
import { player } from '../engine/state'
import { installDebug } from '../engine/debug'
import { stage } from '../engine/scenes'
import { U } from '../gfx/materials'

/** One ordered simulation step per frame: player -> interactions -> camera. */
export function GameLoop() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  useEffect(() => {
    stage.camera = camera
    if (location.search.includes('debug')) installDebug(camera)
  }, [camera])
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    game.time += dt
    game.dt = dt
    U.uTime.value = game.time
    if (player.drop >= 0 && player.drop < 1) player.drop = Math.min(1, player.drop + dt / 1.35)
    updatePlayer(dt)
    updateInteractions(dt, camera)
    updateCamera(camera, dt)
  }, -10)
  return null
}
