import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = path.join(root, 'dist', 'assets')

assert.ok(fs.existsSync(assetsDir), 'dist/assets is missing; run vite build before the budget check')

const files = fs.readdirSync(assetsDir)
  .map((name) => {
    const absolutePath = path.join(assetsDir, name)
    return { name, size: fs.statSync(absolutePath).size }
  })
  .filter((item) => item.name.endsWith('.js') || item.name.endsWith('.css'))

const jsFiles = files.filter((item) => item.name.endsWith('.js'))
const cssFiles = files.filter((item) => item.name.endsWith('.css'))
const entry = jsFiles.find((item) => /^index-.*\.js$/.test(item.name))
const largestRouteChunk = jsFiles
  .filter((item) => item !== entry)
  .sort((a, b) => b.size - a.size)[0]
const largestCss = cssFiles.sort((a, b) => b.size - a.size)[0]

const budgets = {
  entryJs: 320 * 1024,
  routeJs: 600 * 1024,
  css: 180 * 1024,
}

assert.ok(entry, 'main index JavaScript asset was not found')
assert.ok(entry.size <= budgets.entryJs, `${entry.name} exceeds the ${budgets.entryJs} byte entry budget: ${entry.size}`)
assert.ok(
  !largestRouteChunk || largestRouteChunk.size <= budgets.routeJs,
  `${largestRouteChunk?.name} exceeds the ${budgets.routeJs} byte route budget: ${largestRouteChunk?.size}`,
)
assert.ok(
  !largestCss || largestCss.size <= budgets.css,
  `${largestCss?.name} exceeds the ${budgets.css} byte CSS budget: ${largestCss?.size}`,
)

console.log(JSON.stringify({
  entry,
  largestRouteChunk,
  largestCss,
  budgets,
}, null, 2))
