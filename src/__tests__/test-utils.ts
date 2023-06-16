import fs from 'node:fs'
import path from 'node:path'

export function loadFixture(pathname = '') {
  return fs.readFileSync(path.join(__dirname, 'fixtures', pathname), 'utf8')
}
