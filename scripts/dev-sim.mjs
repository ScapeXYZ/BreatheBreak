import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const child=spawn(process.execPath,[resolve('node_modules/electron-vite/bin/electron-vite.js'),'dev'],{
  stdio:'inherit',
  env:{...process.env,BREATHEBREAK_SIMULATION_ONLY:'1',BREATHEBREAK_LIVE_TEST:'0'}
})
child.once('exit',(code,signal)=>signal?process.kill(process.pid,signal):process.exit(code??1))
