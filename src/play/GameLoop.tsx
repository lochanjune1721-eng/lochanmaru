import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { PerspectiveCamera } from 'three'
import { installDebug } from '../engine/debug'
import { stage } from '../engine/scenes'
import { simStep } from '../engine/sim'

/** One ordered simulation step per frame: player -> interactions -> camera. */
export function GameLoop() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    stage.camera = camera
    if (location.search.includes('debug')) installDebug(camera, gl)
  }, [camera, gl])
  useFrame((_, delta) => simStep(Math.min(delta, 1 / 20), camera), -10)
  return null
}
