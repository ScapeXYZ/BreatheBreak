import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { listPackage } from '@electron/asar'

const unpacked = 'release/win-unpacked'
const asarPath = join(unpacked, 'resources/app.asar')
if (!existsSync(asarPath)) throw new Error('Packaged application is missing. Run npm run pack:win first.')
const paths = listPackage(asarPath)
const forbiddenNames = /(^|[\\/])(\.env(?:\.|$)|\.diagnostics|private-evidence|evidence[\\/]private)|\.(ndjson|log)$/i
if (paths.some((path) => forbiddenNames.test(path))) throw new Error('Packaged application contains a forbidden private or credential-bearing path.')
const textExtensions = /\.(?:js|cjs|mjs|json|html|css|txt|md)$/i
const forbiddenText = ['VITE_SMARTSPECTRA_API_KEY']
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(?:VITE_)?SMARTSPECTRA_API_KEY\s*=\s*(.+?)\s*$/)
    if (match) {
      const value = match[1].replace(/^(['"])(.*)\1$/, '$2').trim()
      if (value) forbiddenText.push(value)
    }
  }
}
const walk = (directory, result = []) => { for (const name of readdirSync(directory)) { const path=join(directory,name); if(statSync(path).isDirectory())walk(path,result); else result.push(path) } return result }
const looseFiles = walk(unpacked).filter((path) => path !== asarPath && textExtensions.test(path))
if (looseFiles.some((path) => forbiddenText.some((value) => readFileSync(path, 'utf8').includes(value)))) throw new Error('Packaged application contains a forbidden credential reference or value.')
console.log(`Inspected app.asar (${paths.length} paths) and ${looseFiles.length} loose text files: no private artifacts or SmartSpectra build-time credential found.`)
