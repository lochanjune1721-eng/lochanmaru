import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Lochan's World — static single-page build. Deployed on Vercel as a plain Vite app.
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // keep three + react-three in their own long-cacheable chunk
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three'
          if (id.includes('node_modules/@react-three/')) return 'r3f'
          if (id.includes('node_modules/react')) return 'react'
        },
      },
    },
  },
  server: { host: true },
})
