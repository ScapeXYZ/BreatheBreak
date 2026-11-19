import { spawn, spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = 9339
const profile = mkdtempSync(join(tmpdir(), 'reset-receipt-smoke-'))
const executable = process.env.RESET_RECEIPT_EXE || 'release/win-unpacked/Reset Receipt.exe'
const child = spawn(executable, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--enable-logging=stderr'], { stdio: ['ignore','pipe','pipe'], windowsHide: true })
let diagnostic=''
child.stdout.on('data',(value)=>{diagnostic+=String(value)})
child.stderr.on('data',(value)=>{diagnostic+=String(value)})
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function target() {
  for (let attempt=0;attempt<60;attempt+=1) {
    try { const targets=await fetch(`http://127.0.0.1:${port}/json`).then((response)=>response.json()); const page=targets.find((item)=>item.type==='page'&&item.url); if(page)return page } catch {}
    await wait(250)
  }
  throw new Error(`Packaged renderer did not expose a debugging target in time.${diagnostic?` Diagnostic: ${diagnostic.slice(-1500)}`:''}`)
}

async function evaluate(socket, expression) {
  const id=Math.floor(Math.random()*1_000_000_000)
  socket.send(JSON.stringify({id,method:'Runtime.evaluate',params:{expression,awaitPromise:true,returnByValue:true}}))
  return await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('CDP evaluation timed out.')),10_000);const listener=(event)=>{const message=JSON.parse(event.data);if(message.id!==id)return;clearTimeout(timer);socket.removeEventListener('message',listener);if(message.result?.exceptionDetails)reject(new Error(message.result.exceptionDetails.text));else resolve(message.result?.result?.value)};socket.addEventListener('message',listener)})
}

try {
  const page=await target()
  if (!page.url.startsWith('file:') || /localhost|127\.0\.0\.1/.test(page.url)) throw new Error(`Packaged app loaded an unexpected URL: ${page.url}`)
  const socket=new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
  await evaluate(socket, `localStorage.setItem('breathebreak.guideSeen.v1','true');[...document.querySelectorAll('button')].find(node=>node.textContent?.trim()==='Skip guide')?.click();true`)
  await wait(500)
  const evidence=await evaluate(socket, `(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));const button=label=>[...document.querySelectorAll('button')].find(node=>node.textContent?.trim()===label);const opener=button('Start a reset');if(!(opener instanceof HTMLButtonElement))throw Error('Start control unavailable: '+document.body.innerText.slice(0,300));opener.click();await wait(300);const select=document.querySelector('.consent-fields select');if(!(select instanceof HTMLSelectElement))throw Error('Source selector unavailable: '+document.body.innerText.slice(0,500));select.value='simulation';select.dispatchEvent(new Event('change',{bubbles:true}));await wait(200);document.querySelector('.consent-check input')?.click();await wait(100);button('Start session')?.click();await wait(700);const text=document.body.innerText;return{simulation:text.includes('SIMULATION, NOT REAL'),camera:text.includes('Camera: off, simulation'),running:text.includes('Live session'),noCredentialField:!document.querySelector('input[type=password]'),protocol:location.protocol,host:location.host}})()`)
  socket.close()
  if(!evidence.simulation||!evidence.camera||!evidence.running||!evidence.noCredentialField||evidence.protocol!=='file:'||evidence.host!=='')throw new Error(`Packaged simulation smoke failed: ${JSON.stringify(evidence)}`)
  console.log('Packaged smoke passed: file:// launch, no localhost, credential-free simulation running, camera off.')
} finally {
  spawnSync('taskkill',['/pid',String(child.pid),'/t','/f'],{stdio:'ignore',windowsHide:true})
  await wait(500)
  rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200})
}
