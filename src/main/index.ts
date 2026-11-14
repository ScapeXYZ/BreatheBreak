import { app, BrowserWindow, clipboard, ipcMain, shell } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { bindSmartSpectraIpc } from '@smartspectra/node-sdk/main'
import { EMPTY_LIVE_TEST_COUNTERS, formatLiveTestRunReport, isGoodSignalWindow, isLiveTestEnabled, LIVE_TEST_DIAGNOSTIC_INTERVAL_MS, LIVE_TEST_DIAGNOSTIC_RELATIVE_PATH, liveTestDiagnosticRecord, liveTestEventRecord, liveTestLaunchRecord, LiveTestSessionEvidence, type LiveTestCounters, type LiveTestSessionSummary, validBeginLiveTestSessionRequest, validEndLiveTestSessionRequest, validLiveTestCounters, validLiveTestEvent } from '../shared/liveTest'

const liveTestEnabled = isLiveTestEnabled(process.env.BREATHEBREAK_LIVE_TEST)
const diagnosticPath = resolve(process.cwd(), LIVE_TEST_DIAGNOSTIC_RELATIVE_PATH)
const runId = randomUUID()
let liveTestCounters: LiveTestCounters = EMPTY_LIVE_TEST_COUNTERS
let previousLiveTestCounters: LiveTestCounters = EMPTY_LIVE_TEST_COUNTERS
let goodSignalWindows = 0
let totalSignalWindows = 0
let diagnosticTimer: ReturnType<typeof setInterval> | undefined
let activeEvidence: LiveTestSessionEvidence | undefined
let latestSummary: LiveTestSessionSummary | undefined
const appendDiagnostic = (record: object): void => appendFileSync(diagnosticPath, JSON.stringify(record) + '\n', { encoding: 'utf8' })

function startLiveTestDiagnostics(): void {
  if (!liveTestEnabled || diagnosticTimer) return
  mkdirSync(dirname(diagnosticPath), { recursive: true })
  appendDiagnostic(liveTestLaunchRecord(new Date(), runId))
  diagnosticTimer = setInterval(() => {
    if (!activeEvidence) return
    const cpuPercent = app.getAppMetrics().reduce((total, metric) => total + metric.cpu.percentCPUUsage, 0)
    totalSignalWindows += 1
    if (isGoodSignalWindow(liveTestCounters, previousLiveTestCounters)) goodSignalWindows += 1
    const record = liveTestDiagnosticRecord(new Date(), activeEvidence.identity, liveTestCounters, previousLiveTestCounters, cpuPercent, goodSignalWindows / totalSignalWindows)
    previousLiveTestCounters = liveTestCounters
    appendDiagnostic(record)
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
  ipcMain.handle('app:get-live-test-config', () => ({ enabled: liveTestEnabled, writing: liveTestEnabled, runId: liveTestEnabled ? runId : '' }))
  ipcMain.handle('app:begin-live-test-session', (_event, request: unknown) => {
    if (!liveTestEnabled || !validBeginLiveTestSessionRequest(request)) return undefined
    const now = new Date()
    const identity = { runId, sessionId: randomUUID(), source: request.source }
    activeEvidence = new LiveTestSessionEvidence(identity, now)
    latestSummary = undefined
    liveTestCounters = EMPTY_LIVE_TEST_COUNTERS; previousLiveTestCounters = EMPTY_LIVE_TEST_COUNTERS; goodSignalWindows = 0; totalSignalWindows = 0
    const event = { event: 'session-start' as const, cameraLabel: request.cameraLabel }
    activeEvidence.observeEvent(now, event)
    appendDiagnostic(liveTestEventRecord(now, identity, event))
    return identity.sessionId
  })
  ipcMain.handle('app:end-live-test-session', (_event, request: unknown) => {
    if (!activeEvidence || !validEndLiveTestSessionRequest(request)) return undefined
    const summary = activeEvidence.summary(new Date(), request.reason)
    appendDiagnostic(summary); latestSummary = summary; activeEvidence = undefined
    return summary
  })
  ipcMain.handle('app:copy-live-test-run-report', () => {
    if (!liveTestEnabled || !latestSummary) return false
    clipboard.writeText(formatLiveTestRunReport(latestSummary)); return true
  })
  ipcMain.on('app:update-live-test-counters', (_event, counters: unknown) => {
    if (liveTestEnabled && activeEvidence && validLiveTestCounters(counters)) { liveTestCounters = counters; activeEvidence.updateCounters(counters) }
  })
  ipcMain.on('app:record-live-test-event', (_event, event: unknown) => {
    if (liveTestEnabled && activeEvidence && validLiveTestEvent(event) && event.event !== 'session-start') {
      const now = new Date(); activeEvidence.observeEvent(now, event)
      appendDiagnostic(liveTestEventRecord(now, activeEvidence.identity, event))
    }
  })
  startLiveTestDiagnostics()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('before-quit', () => { if (diagnosticTimer) clearInterval(diagnosticTimer) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
