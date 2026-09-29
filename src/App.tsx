import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { NoToneMapping, PCFShadowMap } from 'three'
import { installKeyboard } from './engine/input'
import { skipIntro } from './engine/journey'
import { quality } from './engine/quality'
import { store } from './engine/store'
import { P } from './gfx/palette'
import { loadFonts } from './gfx/text'
import { LoadCoordinator } from './play/LoadCoordinator'
import { PerfGovernor } from './play/PerfGovernor'
import { Controls } from './ui/Controls'
import { Fallback } from './ui/Fallback'
import { Overlay } from './ui/Overlay'
import { World } from './world/World'

const params = new URLSearchParams(location.search)

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const WEBGL = hasWebGL()

export default function App() {
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => installKeyboard(), [])
  useEffect(() => {
    store.getState().setProgress(0.08, 'Warming up the sun')
    loadFonts().then(() => {
      store.getState().setProgress(0.2, 'Planting the trees')
      // give the loader a paint before the (synchronous) world build blocks the main thread
      requestAnimationFrame(() => requestAnimationFrame(() => setFontsReady(true)))
    })
  }, [])

  useEffect(() => {
    if (params.get('autostart') === '1' && fontsReady) skipIntro()
  }, [fontsReady])

  if (!WEBGL) return <Fallback force />

  return (
    <div className="stage">
      <Canvas
        shadows={quality.shadows ? { type: PCFShadowMap } : false}
        dpr={[1, quality.dpr]}
        camera={{ fov: 38, near: 0.2, far: 800, position: [0, 0, 110] }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance', toneMapping: NoToneMapping }}
        onCreated={({ gl }) => gl.setClearColor(P.fog)}
      >
        {fontsReady && (
          <>
            <World />
            <LoadCoordinator />
            <PerfGovernor />
          </>
        )}
      </Canvas>
      <Controls />
      <Overlay />
    </div>
  )
}
