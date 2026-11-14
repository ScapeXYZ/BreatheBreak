'use strict'
const { app, BrowserWindow, ipcMain } = require('electron')
const { existsSync } = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '../..')
const PRELOAD = path.join(ROOT, 'out/preload/index.cjs')

async function verifyProductionPreloadContract() {
  if (!existsSync(PRELOAD)) throw new Error('Production preload artifact missing: run npm run build first.')
  ipcMain.handle('app:get-runtime-info', () => ({ platform: process.platform, version: app.getVersion() }))
  ipcMain.handle('app:get-live-test-config', () => ({ enabled: true, writing: true, runId: 'contract-run' }))
  const window = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: PRELOAD,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })
  try {
    await window.loadURL('data:text/html,<main id="ready">preload contract</main>')
    const contract = await window.webContents.executeJavaScript(`({
      breathebreak: {
        runtime: typeof window.breathebreak?.getRuntimeInfo,
        liveTest: typeof window.breathebreak?.getLiveTestConfig,
        beginSession: typeof window.breathebreak?.beginLiveTestSession,
        endSession: typeof window.breathebreak?.endLiveTestSession,
        copyReport: typeof window.breathebreak?.copyLiveTestRunReport,
        counters: typeof window.breathebreak?.updateLiveTestCounters,
        releaseEvent: typeof window.breathebreak?.recordLiveTestEvent
      },
      sdk: {
        attach: typeof window.__smartspectraBridge?.attach,
        postMessage: typeof window.__smartspectraBridge?.postMessage,
        onMessage: typeof window.__smartspectraBridge?.onMessage,
        close: typeof window.__smartspectraBridge?.close
      },
      rendererRequire: typeof window.require,
      rendererProcess: typeof window.process,
      liveTestEnabled: null
    })`, true)
    contract.liveTestEnabled = (await window.webContents.executeJavaScript('window.breathebreak.getLiveTestConfig()', true)).enabled
    const expectedFunctions = ['runtime', 'liveTest', 'beginSession', 'endSession', 'copyReport', 'counters', 'releaseEvent']
    for (const key of expectedFunctions) if (contract.breathebreak[key] !== 'function') throw new Error(`Missing breathebreak.${key} bridge function`)
    for (const [key, value] of Object.entries(contract.sdk)) if (value !== 'function') throw new Error(`Missing SDK preload ${key} bridge function`)
    if (contract.rendererRequire !== 'undefined' || contract.rendererProcess !== 'undefined') throw new Error('Renderer unexpectedly has Node globals')
    if (contract.liveTestEnabled !== true) throw new Error('IPC invocation did not cross the production preload contract')
    console.log('Production preload contract passed: sandboxed, context-isolated bridges and IPC are available.')
  } finally {
    window.destroy()
  }
}

app.whenReady()
  .then(verifyProductionPreloadContract)
  .then(() => app.quit())
  .catch((error) => { console.error(error); app.exit(1) })
