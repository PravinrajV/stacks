import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  define: {
    HAUNTED_COUNTER_STACK: JSON.stringify(readFileSync(resolve(__dirname, 'examples/haunted-counter.json'), 'utf-8'))
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
