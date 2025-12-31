import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    watch: {
      // Watch the specs directory for YAML changes
      include: ['specs/**']
    }
  },
  assetsInclude: ['**/*.yaml']
})
