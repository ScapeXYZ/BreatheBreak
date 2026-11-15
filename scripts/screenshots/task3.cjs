'use strict'
const { app, BrowserWindow, session } = require('electron')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')

if (process.env.BREATHEBREAK_DEV_SIMULATION !== '1') { console.error('Refusing Task 3 capture: DEV SIMULATION was not explicitly enabled.'); process.exit(1) }
const ROOT = path.resolve(__dirname, '../..')
const OUTPUT = path.join(ROOT, 'screenshots/task3')
const EXPORTS = path.join(OUTPUT, 'exports')
const VIEWPORTS = [{ width: 1280, height: 720 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }]
const FIXTURES = ['onboarding', 'welcome', 'live', 'full', 'partial', 'insufficient', 'interrupted']
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
app.on('window-all-closed', () => {})

async function openFixture(fixture, viewport) {
  await session.defaultSession.clearStorageData({ storages: ['localstorage'] })
  const window = new BrowserWindow({ ...viewport, x: -20_000, y: -20_000, useContentSize: true, frame: false, show: true, skipTaskbar: true, focusable: false, backgroundColor: '#08111d', webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, devTools: false, backgroundThrottling: false } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event) => event.preventDefault())
  await window.loadFile(path.join(ROOT, '.screenshot-build/index.html'), { hash: fixture })
  await wait(350)
  return window
}

async function captureFixture(fixture, viewport) {
  const window = await openFixture(fixture, viewport)
  const evidence = await window.webContents.executeJavaScript(`({fixture:${JSON.stringify(fixture)},text:document.body.innerText,scrollWidth:document.documentElement.scrollWidth,innerWidth,source:document.body.innerText.includes('SIMULATION, NOT REAL')?'simulation':'offline fixture'})`, true)
  if (evidence.scrollWidth > evidence.innerWidth + 1) throw new Error(`Horizontal overflow in ${fixture} at ${viewport.width}x${viewport.height}`)
  const image = await window.webContents.capturePage()
  const filename = `${fixture}-${viewport.width}x${viewport.height}.png`
  await writeFile(path.join(OUTPUT, filename), image.toPNG())
  window.destroy()
  return { fixture, viewport, filename, horizontalOverflow: false }
}

async function exportFixture(fixture) {
  const window = await openFixture(fixture, { width: 1280, height: 800 })
  const download = new Promise((resolve, reject) => {
    session.defaultSession.once('will-download', (_event, item) => {
      const filename = fixture === 'full-real' ? 'reset-receipt-REAL-example.png' : 'reset-receipt-SIMULATION-example.png'
      const destination = path.join(EXPORTS, filename)
      item.setSavePath(destination)
      item.once('done', (_doneEvent, state) => state === 'completed' ? resolve({ fixture, filename, originalFilename: item.getFilename() }) : reject(new Error(`Export ${fixture} ended ${state}`)))
    })
  })
  await window.webContents.executeJavaScript(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent==='Export PNG');if(!(button instanceof HTMLButtonElement))throw Error('Export unavailable');button.click();return true})()`, true)
  const result = await download
  window.destroy()
  return result
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  await mkdir(EXPORTS, { recursive: true })
  const captures = []
  for (const viewport of VIEWPORTS) for (const fixture of FIXTURES) captures.push(await captureFixture(fixture, viewport))
  const exports = [await exportFixture('full-real'), await exportFixture('partial')]
  await writeFile(path.join(OUTPUT, 'verification.json'), JSON.stringify({ methodology: 'Offline fixture bundle with SmartSpectra replaced by a throwing safe stub; all Electron camera permissions denied.', captures, exports }, null, 2))
  app.quit()
}).catch((error) => { console.error(error); process.exitCode = 1; app.exit(1) })
