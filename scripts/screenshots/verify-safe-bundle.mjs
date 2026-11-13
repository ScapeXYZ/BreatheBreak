import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const buildRoot = resolve('.screenshot-build')
const forbidden = ['@smartspectra/node-sdk', 'SmartSpectraSDK', 'bindSmartSpectraIpc', 'getUserMedia']

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  }))
  return nested.flat()
}

for (const file of await filesUnder(buildRoot)) {
  if (!file.endsWith('.js')) continue
  const source = await readFile(file, 'utf8')
  const match = forbidden.find((token) => source.includes(token))
  if (match) throw new Error('Unsafe screenshot bundle: ' + match + ' found in ' + file)
}
console.log('Screenshot bundle audit passed: production SDK and camera APIs are absent.')
