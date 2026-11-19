import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const outputRoot = 'out'
if (!existsSync(outputRoot)) throw new Error('Production output is missing. Run npm run build first.')

const files = []
const visit = (directory) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) visit(path)
    else files.push(path)
  }
}
visit(outputRoot)
const output = files.map((path) => readFileSync(path)).map((value) => value.toString('utf8')).join('\n')

const forbidden = ['VITE_SMARTSPECTRA_API_KEY']
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?(?:VITE_)?SMARTSPECTRA_API_KEY\s*=\s*(.+?)\s*$/)
    if (!match) continue
    const value = match[1].replace(/^(['"])(.*)\1$/, '$2').trim()
    if (value) forbidden.push(value)
  }
}

if (forbidden.some((value) => output.includes(value))) throw new Error('Production output contains a forbidden SmartSpectra credential reference or value.')
console.log(`Verified ${files.length} production output files: no SmartSpectra build-time credential found.`)
