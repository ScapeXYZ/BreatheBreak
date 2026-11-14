'use strict'
const { app, BrowserWindow, session } = require('electron')
const { mkdir, writeFile } = require('node:fs/promises')
const path = require('node:path')
if (process.env.BREATHEBREAK_DEV_SIMULATION !== '1') { console.error('Refusing Task 7 capture: DEV SIMULATION was not explicitly enabled.'); process.exit(1) }
app.on('window-all-closed', () => {})
const ROOT = path.resolve(__dirname, '../..')
const OUTPUT = path.join(ROOT, 'screenshots/task7')
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function until(window, expression, timeout = 15_000) { const started = Date.now(); while (Date.now() - started < timeout) { if (await window.webContents.executeJavaScript(expression, true)) return; await wait(100) } const body = await window.webContents.executeJavaScript('document.body.innerText', true); throw Error('Timed out: ' + expression + '; visible text: ' + body) }
async function click(window, text) { await window.webContents.executeJavaScript(`(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent?.includes(${JSON.stringify(text)}));if(!(button instanceof HTMLButtonElement))throw Error('Missing button: '+${JSON.stringify(text)});button.click();return true})()`, true) }
async function run({ width, height }) {
  const window = new BrowserWindow({ width, height, x: -20_000, y: -20_000, useContentSize: true, frame: false, show: true, skipTaskbar: true, focusable: false, backgroundColor: '#08111d', webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, devTools: false, backgroundThrottling: false } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  await window.loadFile(path.join(ROOT, '.screenshot-build/index.html'), { hash: 'baseline-cap' })
  await until(window, "document.body.innerText.includes('Welcome / Consent')")
  await window.webContents.executeJavaScript("document.querySelector('input[type=checkbox]').click();true", true)
  await until(window, "[...document.querySelectorAll('button')].some(button=>button.textContent?.includes('Start session')&&!button.disabled)")
  await click(window, 'Start session')
  await until(window, "document.body.innerText.includes('Baseline done. Start your guided minute.')")
  const evidence = await window.webContents.executeJavaScript(`(()=>{const prompt=[...document.querySelectorAll('[role=status]')].find(node=>node.textContent?.includes('Baseline done. Start your guided minute.')),button=[...document.querySelectorAll('button')].find(node=>node.textContent?.trim()==='Open guided pacer'),panel=document.querySelector('.session-panel')?.getBoundingClientRect();return{simulation:document.body.innerText.includes('Dev simulation: synthetic data, not demo evidence'),promptVisible:!!prompt&&prompt.getBoundingClientRect().top>=0&&prompt.getBoundingClientRect().bottom<=innerHeight,buttonVisible:button instanceof HTMLButtonElement&&!button.disabled&&button.getBoundingClientRect().top>=0&&button.getBoundingClientRect().bottom<=innerHeight,panelWithinViewport:!!panel&&panel.top>=0&&panel.bottom<=innerHeight,cue:document.body.innerText.includes('Next: open the guided pacer, then press Start guided pacing when you’re ready.')}})()`, true)
  if (!evidence.simulation || !evidence.promptVisible || !evidence.buttonVisible || !evidence.panelWithinViewport || !evidence.cue) throw Error('Task 7 screenshot verification failed: ' + JSON.stringify(evidence))
  const image = await window.webContents.capturePage()
  const filename = `baseline-cap-${width}x${height}.png`
  await writeFile(path.join(OUTPUT, filename), image.toPNG())
  window.destroy()
  return { viewport: { width, height }, filename, ...evidence }
}
app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  await mkdir(OUTPUT, { recursive: true })
  const evidence = []
  for (const viewport of [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]) evidence.push(await run(viewport))
  await writeFile(path.join(OUTPUT, 'verification.json'), JSON.stringify({ measuredAt: new Date().toISOString(), methodology: 'Offline DEV SIMULATION screenshot harness; cap-complete store transition forced after Start; SDK and camera excluded by safe-bundle audit.', evidence }, null, 2))
  app.quit()
}).catch((error) => { console.error(error); app.exit(1) })
