import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Watch the specs directory for YAML changes
      include: ['specs/**']
    },
    proxy: {
      // Proxy API requests to the render server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  assetsInclude: ['**/*.yaml']
})
