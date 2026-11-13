'use strict'
const { app, BrowserWindow, session } = require('electron')
const { writeFile } = require('node:fs/promises')
const path = require('node:path')
if (process.env.BREATHEBREAK_DEV_SIMULATION !== '1') process.exit(1)
const ROOT = path.resolve(__dirname, '../..')
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const viewports = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }]
async function until(window, expression, timeout = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (await window.webContents.executeJavaScript(expression, true)) return
    await wait(100)
  }
  throw new Error('Timed out: ' + expression)
}
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]
}
async function run(viewport) {
  console.log('viewport', viewport.width, 'start')
  const window = new BrowserWindow({
    ...viewport, x: -20000, y: -20000, useContentSize: true, frame: false, show: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true, devTools: false, backgroundThrottling: false }
  })
  await window.loadFile(path.join(ROOT, '.screenshot-build/index.html'))
  await until(window, "document.body.innerText.includes('Welcome / Consent')")
  console.log('welcome ready')
  await window.webContents.executeJavaScript("document.documentElement.dataset.screenshotHarness='simulation-only'; window.__frames=[]; window.addEventListener('breathebreak:garden-frame', (event) => window.__frames.push(event.detail)); true", true)
  const welcome = await window.webContents.executeJavaScript(`(() => {
    const input=document.querySelector('input[type=checkbox]'); input.focus()
    const style=getComputedStyle(input)
    window.scrollTo(0,100); return { noScroll: scrollY === 0, scrollHeight: document.documentElement.scrollHeight, innerHeight, focusWidth: style.outlineWidth, disclosure: document.body.innerText.includes('DEV SIMULATION · SYNTHETIC DATA · NOT DEMO EVIDENCE') }
  })()`, true)
  await window.webContents.executeJavaScript("document.querySelector('input[type=checkbox]').click(); [...document.querySelectorAll('button')].find((b)=>b.textContent.includes('Start session')).click(); true", true)
  await until(window, "[...document.querySelectorAll('dd')].some((node)=>node.textContent.trim()==='ok')")
  console.log('session warm')
  app.getAppMetrics()
  await wait(2500)
  const cpu = app.getAppMetrics().reduce((sum, metric) => sum + metric.cpu.percentCPUUsage, 0)
  const sessionState = await window.webContents.executeJavaScript(`(() => {
    const frames=window.__frames.slice()
    const durations=frames.map((frame)=>frame.durationMs)
    const intervals=frames.slice(1).map((frame,index)=>frame.timestamp-frames[index].timestamp)
    window.scrollTo(0,100); return { frames: frames.length, durations, intervals, noScroll: scrollY === 0, scrollHeight: document.documentElement.scrollHeight, innerHeight }
  })()`, true)
  console.log('metrics sampled')
  window.hide()
  await wait(200)
  const beforeHidden = await window.webContents.executeJavaScript("window.__frames.length", true)
  await wait(1200)
  const afterHidden = await window.webContents.executeJavaScript("window.__frames.length", true)
  console.log('hidden sampled')
  window.showInactive()
  await wait(200)
  await window.webContents.executeJavaScript("[...document.querySelectorAll('button')].find((b)=>b.textContent.includes('Stop session')).click(); true", true)
  await until(window, "document.body.innerText.toLowerCase().includes('session recap')")
  const beforeRecap = await window.webContents.executeJavaScript("window.__frames.length", true)
  await wait(1200)
  const afterRecap = await window.webContents.executeJavaScript("window.__frames.length", true)
  const contrast = await window.webContents.executeJavaScript(`(() => {
    const rgb=(value)=>{ const c=document.createElement('canvas').getContext('2d'); c.canvas.width=c.canvas.height=1; c.fillStyle=value; c.fillRect(0,0,1,1); return [...c.getImageData(0,0,1,1).data].slice(0,3) }
    const lum=(v)=>{ const a=v.map((x)=>x/255<=.04045?x/3294.6:Math.pow((x/255+.055)/1.055,2.4)); return .2126*a[0]+.7152*a[1]+.0722*a[2] }
    const ratio=(a,b)=>{ const x=lum(rgb(a)),y=lum(rgb(b)); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05) }
    const root=getComputedStyle(document.documentElement)
    return { body: ratio(root.getPropertyValue('--color-ink'),root.getPropertyValue('--color-paper')), muted: ratio(root.getPropertyValue('--color-muted'),root.getPropertyValue('--color-paper')), primary: ratio(root.getPropertyValue('--color-accent-ink'),root.getPropertyValue('--color-accent')), focus: ratio(root.getPropertyValue('--color-focus'),root.getPropertyValue('--color-paper')) }
  })()`, true)
  console.log('recap sampled')
  window.destroy()
  const durations = sessionState.durations
  const intervals = sessionState.intervals
  return {
    viewport, welcome, sessionNoScroll: sessionState.noScroll, cpuPercent: cpu,
    renderFrameMs: { median: percentile(durations, .5), p95: percentile(durations, .95) },
    achievedFps: intervals.length ? 1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length) : 0,
    maxFps: intervals.length ? 1000 / Math.min(...intervals) : 0,
    hiddenFrames: afterHidden - beforeHidden, recapFrames: afterRecap - beforeRecap, contrast
  }
}
app.on('window-all-closed', () => {})
app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  const results = []
  for (const viewport of viewports) { results.push(await run(viewport)); await wait(500) }
  await writeFile(path.join(ROOT, 'screenshots/after/verification.json'), JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2))
  console.log(JSON.stringify(results, null, 2))
  app.quit()
}).catch((error) => { console.error(error); app.exit(1) })







