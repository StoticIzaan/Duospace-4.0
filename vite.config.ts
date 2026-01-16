import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['peerjs']
  },
  build: {
    commonjsOptions: {
      include: [/peerjs/, /node_modules/]
    }
  }
})
