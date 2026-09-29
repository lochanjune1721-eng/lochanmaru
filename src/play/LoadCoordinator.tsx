import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { store } from '../engine/store'
import { showAllCullables } from '../world/cull'

/** Reports real loading milestones: scene mounted -> shaders compiled -> first frames drawn -> intro. */
export function LoadCoordinator() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let cancelled = false
    const st = store.getState()
    st.setProgress(0.45, 'Painting the plaza')
    ;(async () => {
      try {
        showAllCullables()
        await (gl as any).compileAsync?.(scene, camera)
      } catch {
        /* compile is best-effort */
      }
      if (cancelled) return
      store.getState().setProgress(0.9, 'Waking the lighthouse')
      // let a couple of frames render so textures/buffers are on the GPU
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      await new Promise((r) => setTimeout(r, 350))
      if (cancelled) return
      store.getState().setProgress(1)
      if (store.getState().phase === 'loading') store.getState().set({ phase: 'intro' })
    })()
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera])
  return null
}
