'use strict'

const { app, BrowserWindow, session } = require('electron')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')

if (process.env.BREATHEBREAK_DEV_SIMULATION !== '1') {
  console.error('Refusing screenshot capture: DEV SIMULATION was not explicitly enabled.')
  process.exit(1)
}

const ROOT = path.resolve(__dirname, '../..')
const OUTPUT = path.join(ROOT, process.env.BREATHEBREAK_SCREENSHOT_SET === 'after' ? 'screenshots/after' : 'screenshots/baseline')
const DISCLOSURE = 'DEV SIMULATION · SYNTHETIC DATA · NOT DEMO EVIDENCE'
const VIEWPORTS = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(window, predicate, timeoutMs = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await window.webContents.executeJavaScript(predicate, true)) return
    await wait(100)
  }
  const visibleText = await window.webContents.executeJavaScript(`document.body.innerText.slice(0, 1200)`, true)
  throw new Error(`Timed out waiting for renderer condition: ${predicate}\nVisible text:\n${visibleText}`)
}

async function capture(window, name) {
  await wait(200)
  const image = await window.webContents.capturePage()
  await writeFile(path.join(OUTPUT, name), image.toPNG())
}

async function runViewport({ width, height }) {
  const window = new BrowserWindow({
    width, height, x: -20_000, y: -20_000, useContentSize: true, frame: false, show: true,
    skipTaskbar: true, focusable: false, backgroundColor: '#08111d',
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, devTools: false, backgroundThrottling: false }
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  await window.loadFile(path.join(ROOT, '.screenshot-build/index.html'))
  await waitFor(window, `document.body.innerText.includes('Welcome / Consent')`)
  await window.webContents.executeJavaScript(`(() => {
    const banner = [...document.querySelectorAll('div')].find((node) => node.childElementCount === 0 && node.textContent?.includes('DEV SIMULATION'))
    if (!banner) throw new Error('Synthetic-data disclosure is missing')
    banner.textContent = ${JSON.stringify(DISCLOSURE)}
    document.documentElement.dataset.screenshotHarness = 'simulation-only'
    return true
  })()`, true)
  await capture(window, `welcome-${width}x${height}.png`)

  await window.webContents.executeJavaScript(`(() => {
    const checkbox = document.querySelector('input[type="checkbox"]')
    if (!(checkbox instanceof HTMLInputElement)) throw new Error('Consent checkbox not found')
    checkbox.click()
    return true
  })()`, true)
  await waitFor(window, `[...document.querySelectorAll('button')].some((button) => button.textContent?.includes('Start session') && !button.disabled)`)
  await window.webContents.executeJavaScript(`(() => {
    const start = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Start session'))
    if (!(start instanceof HTMLButtonElement) || start.disabled) throw new Error('Simulation Start is unavailable')
    start.click()
    return true
  })()`, true)
  await waitFor(window, `document.body.innerText.toLowerCase().includes('live session')`)
  await waitFor(window, `[...document.querySelectorAll('dd')].some((node) => node.textContent?.trim() === 'ok')`, 12_000)
  await capture(window, `session-${width}x${height}.png`)

  await window.webContents.executeJavaScript(`(() => {
    const stop = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('Stop session'))
    if (!(stop instanceof HTMLButtonElement)) throw new Error('Stop button not found')
    stop.click()
    return true
  })()`, true)
  await waitFor(window, `document.body.innerText.toLowerCase().includes('session recap')`)
  await capture(window, `recap-${width}x${height}.png`)
  return window
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  await mkdir(OUTPUT, { recursive: true })
  const windows = []
  for (const viewport of VIEWPORTS) windows.push(await runViewport(viewport))
  for (const window of windows) window.destroy()
  app.quit()
}).catch((error) => { console.error(error); process.exitCode = 1; app.exit(1) })
