import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // use relative paths for assets
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // ensure relative paths work with file:// protocol
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
