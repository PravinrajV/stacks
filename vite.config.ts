import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  define: {
    HAUNTED_HOUSE_STACK: JSON.stringify(readFileSync(resolve(__dirname, 'examples/haunted-house.json'), 'utf-8'))
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
