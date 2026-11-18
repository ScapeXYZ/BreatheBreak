import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

const installers = readdirSync('release').filter((name) => /^Reset-Receipt-.*-Setup-x64\.exe$/i.test(name))
if (installers.length !== 1) throw new Error(`Expected one Windows installer, found ${installers.length}.`)
const name = installers[0]
const hash = createHash('sha256').update(readFileSync(`release/${name}`)).digest('hex')
writeFileSync('release/SHA256SUMS.txt', `${hash}  ${name}\n`, 'utf8')
console.log('Wrote release/SHA256SUMS.txt')
