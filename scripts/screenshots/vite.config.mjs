import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')

export default defineConfig({
  root: here,
  base: './',
  plugins: [react()],
  resolve: { alias: [
    { find: /^\.\/signals\/smartspectra$/, replacement: resolve(here, 'safe-smartspectra.ts') },
    { find: /^\.\/signals\/simulation$/, replacement: resolve(here, 'deterministic-simulation.ts') }
  ] },
  build: { outDir: resolve(root, '.screenshot-build'), emptyOutDir: true, rollupOptions: { input: resolve(here, 'index.html') } }
})
