import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Watch the specs directory for YAML changes
      include: ['specs/**']
    }
  },
  assetsInclude: ['**/*.yaml']
})
