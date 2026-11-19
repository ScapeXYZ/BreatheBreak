import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'

export const simulationOnlyForSource = (command: string, value: string | undefined): boolean => command === 'serve' && value === '1'

export default defineConfig(({ command }) => {
 const simulationOnly=simulationOnlyForSource(command,process.env.BREATHEBREAK_SIMULATION_ONLY)
 const disabledSdk=resolve('scripts/simulation/smartspectra-main-disabled.ts')
 return {
  main: { envFile: simulationOnly?false:undefined, plugins: [externalizeDepsPlugin()], define:{__BREATHEBREAK_SIMULATION_ONLY__:JSON.stringify(simulationOnly)}, resolve:{alias:simulationOnly?{'@smartspectra/node-sdk/main':disabledSdk}:undefined} },
  preload: {
    envFile: simulationOnly?false:undefined,
    build: {
      rollupOptions: { input:simulationOnly?resolve('src/preload/simulation.ts'):undefined,
        output: { format: 'cjs', entryFileNames: 'index.cjs' }
      }
    }
  },
  renderer: { envFile: simulationOnly?false:undefined, plugins: [react()], define:{__BREATHEBREAK_SIMULATION_ONLY__:JSON.stringify(simulationOnly)}, resolve:{alias:simulationOnly?{[resolve('src/renderer/src/signals/smartspectra.ts')]:resolve('scripts/simulation/smartspectra-renderer-disabled.ts')}:undefined} }
 }
})
