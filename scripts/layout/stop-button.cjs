'use strict'
const { createServer } = require('node:http')
const { readFile, mkdtemp, rm } = require('node:fs/promises')
const { spawn, execFileSync } = require('node:child_process')
const { tmpdir } = require('node:os')
const path = require('node:path')

if (process.env.BREATHEBREAK_DEV_SIMULATION !== '1') {
  console.error('Refusing layout test: set BREATHEBREAK_DEV_SIMULATION=1 explicitly.')
  process.exit(1)
}

const ROOT = path.resolve(__dirname, '../..')
const BUILD = path.join(ROOT, '.screenshot-build')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const VIEWPORTS = [[1280, 720], [1280, 800], [1440, 900], [1920, 1080]]
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function eventually(operation, timeout = 15_000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeout) {
    try { const value = await operation(); if (value) return value } catch (error) { lastError = error }
    await wait(50)
  }
  throw lastError || new Error('Timed out waiting for browser state')
}

class Cdp {
  constructor(url) {
    this.nextId = 1
    this.pending = new Map()
    this.socket = new WebSocket(url)
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true })
      this.socket.addEventListener('error', reject, { once: true })
    })
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data)
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
    })
  }
  async send(method, params = {}) {
    await this.ready
    const id = this.nextId++
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }))
    this.socket.send(JSON.stringify({ id, method, params }))
    return result
  }
  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  close() { this.socket.close() }
}

async function main() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
      const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1))
      const file = path.resolve(BUILD, relative)
      if (!file.startsWith(BUILD + path.sep)) throw new Error('Invalid path')
      const body = await readFile(file)
      response.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8')
      response.end(body)
    } catch {
      response.statusCode = 404
      response.end('Not found')
    }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Layout server did not bind')
  const origin = `http://127.0.0.1:${address.port}/`
  const profile = await mkdtemp(path.join(tmpdir(), 'breathebreak-layout-'))
  const debugPort = 9339
  const browser = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, '--remote-allow-origins=*', origin], { stdio: 'ignore', windowsHide: true })
  let cdp
  try {
    const page = await eventually(async () => {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`)
      const targets = await response.json()
      return targets.find((target) => target.type === 'page' && target.url.startsWith(origin))
    })
    cdp = new Cdp(page.webSocketDebuggerUrl)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    const results = []
    for (const [width, height] of VIEWPORTS) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
      await cdp.send('Page.reload', { ignoreCache: true })
      await eventually(async () => cdp.evaluate("document.body?.innerText.includes('Welcome / Consent')"))
      await cdp.evaluate("document.querySelector('input[type=checkbox]').click();[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Start session')).click();true")
      await eventually(async () => cdp.evaluate("document.body?.innerText.includes('Stop session')"))
      const evidence = await cdp.evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(node=>node.textContent?.trim()==='Stop session'),footer=document.querySelector('.session-footer'),panel=document.querySelector('.session-panel');if(!button||!footer||!panel)throw Error('Missing Stop footer');const inspect=()=>{const rect=button.getBoundingClientRect(),center=document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2);return{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height,withinViewport:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,operable:center===button||button.contains(center)}};panel.scrollTop=0;const top=inspect();panel.scrollTop=panel.scrollHeight;const bottom=inspect();return{viewport:{width:innerWidth,height:innerHeight},position:getComputedStyle(footer).position,top,bottom,cameraStatus:document.querySelector('.camera-status')?.textContent,simulationBanner:!!document.querySelector('.simulation-disclosure')}})()")
      if (evidence.position !== 'sticky' || !evidence.top.withinViewport || !evidence.bottom.withinViewport || !evidence.top.operable || !evidence.bottom.operable) throw new Error('Stop button failed viewport gate: ' + JSON.stringify(evidence))
      if (evidence.cameraStatus !== 'Camera: off, simulation' || !evidence.simulationBanner) throw new Error('Simulation disclosure/status failed: ' + JSON.stringify(evidence))
      results.push(evidence)
    }
    console.log(JSON.stringify({ methodology: 'Simulation-only Microsoft Edge/Chromium CDP; audited bundle excludes camera and production SDK.', results }, null, 2))
  } finally {
    cdp?.close()
    browser.kill()
    await new Promise((resolve) => server.close(resolve))
    const resolvedProfile = path.resolve(profile)
    if (!resolvedProfile.startsWith(path.resolve(tmpdir()) + path.sep)) throw new Error('Refusing to remove unexpected profile path')
    await rm(resolvedProfile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })