import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { bindSmartSpectraIpc } from '@smartspectra/node-sdk/main'
import { isLiveTestEnabled, LIVE_TEST_DIAGNOSTIC_INTERVAL_MS, LIVE_TEST_DIAGNOSTIC_RELATIVE_PATH, liveTestDiagnosticRecord, type LiveTestCounters, validLiveTestCounters } from '../shared/liveTest'

const liveTestEnabled = isLiveTestEnabled(process.env.BREATHEBREAK_LIVE_TEST)
const diagnosticPath = resolve(process.cwd(), LIVE_TEST_DIAGNOSTIC_RELATIVE_PATH)
let liveTestCounters: LiveTestCounters = { deliveredFrames: 0, sentFrames: 0 }
let diagnosticTimer: ReturnType<typeof setInterval> | undefined

function startLiveTestDiagnostics(): void {
  if (!liveTestEnabled || diagnosticTimer) return
  mkdirSync(dirname(diagnosticPath), { recursive: true })
  diagnosticTimer = setInterval(() => {
    const cpuPercent = app.getAppMetrics().reduce((total, metric) => total + metric.cpu.percentCPUUsage, 0)
    appendFileSync(diagnosticPath, JSON.stringify(liveTestDiagnosticRecord(new Date(), liveTestCounters, cpuPercent)) + '\n', { encoding: 'utf8' })
  }, LIVE_TEST_DIAGNOSTIC_INTERVAL_MS)
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 900,
    minHeight: 680,
    backgroundColor: '#08111d',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })
  bindSmartSpectraIpc(window, { logger: () => { /* Avoid forwarding SDK diagnostics. */ } })
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  ipcMain.handle('app:get-runtime-info', () => ({ platform: process.platform, version: app.getVersion() }))
  ipcMain.handle('app:get-live-test-config', () => ({ enabled: liveTestEnabled }))
  ipcMain.on('app:update-live-test-counters', (_event, counters: unknown) => {
    if (liveTestEnabled && validLiveTestCounters(counters)) liveTestCounters = counters
  })
  startLiveTestDiagnostics()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => { if (diagnosticTimer) clearInterval(diagnosticTimer) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
