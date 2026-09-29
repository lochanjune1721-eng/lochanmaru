import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { NoToneMapping, PCFShadowMap } from 'three'
import { installKeyboard, input } from './engine/input'
import { quality } from './engine/quality'
import { cam, player } from './engine/state'
import { store } from './engine/store'
import { resetPlayerToSpawn } from './engine/boot'
import { P } from './gfx/palette'
import { World } from './world/World'
import { Controls } from './ui/Controls'
import { loadFonts } from './gfx/text'

const params = new URLSearchParams(location.search)

export default function App() {
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => installKeyboard(), [])
  useEffect(() => {
    loadFonts().then(() => setFontsReady(true))
  }, [])

  useEffect(() => {
    if (params.get('autostart') === '1') {
      resetPlayerToSpawn()
      player.frozen = false
      player.drop = -1
      cam.mode = 'follow'
      input.enabled = true
      store.getState().set({ phase: 'playing' })
    }
  }, [])

  return (
    <div className="stage">
      <Canvas
        shadows={quality.shadows ? { type: PCFShadowMap } : false}
        dpr={[1, quality.dpr]}
        camera={{ fov: 38, near: 0.2, far: 800, position: [0, 0, 110] }}
        gl={{ antialias: quality.antialias, powerPreference: 'high-performance', toneMapping: NoToneMapping }}
        onCreated={({ gl }) => gl.setClearColor(P.fog)}
      >
        {fontsReady && <World />}
      </Canvas>
      <Controls />
    </div>
  )
}
