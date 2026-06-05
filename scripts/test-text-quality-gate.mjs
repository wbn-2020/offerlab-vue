import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const projectRoot = fileURLToPath(new URL('../..', import.meta.url))

const scanRoots = [
  'src/views',
  'src/components',
  'src/router',
  'src/api',
  'src/composables',
  'src/utils',
  'src/stores',
  '../offerlab-java/community-domain-question/src/main/java',
  '../offerlab-java/community-domain-search/src/main/java',
].map((item) => join(repoRoot, item))

const sourceExts = new Set(['.vue', '.ts', '.java'])
const ignoredDirs = new Set(['node_modules', 'dist', 'target', '.git'])

const suspiciousDecodedBytes = /[\uFFFD\u00C3\u00C2\u00A4\u00A5\u00A7\u00D0\u00D1]/
const questionPlaceholder = /(['"`>][^\n<]{0,80}\?{3,}[^\n<]{0,80}['"`<])/

const mojibakeFragments = [
  '\u6D93',
  '\u9359',
  '\u93C4',
  '\u7455',
  '\u93B4',
  '\u7487',
  '\u9422',
  '\u7F03',
  '\u9A9E',
  '\u6434',
  '\u6924',
  '\u5BEE',
  '\u59DD',
  '\u93C8',
  '\u93C3',
  '\u7EFE',
  '\u951B',
  '\u9286',
  '\u9225',
]

const walk = (dir, files = []) => {
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(fullPath, files)
    } else if (sourceExts.has(extname(entry.name))) {
      files.push(fullPath)
    }
  }
  return files
}

const isSuspiciousLine = (line) => {
  if (suspiciousDecodedBytes.test(line)) return true
  if (questionPlaceholder.test(line)) return true
  return mojibakeFragments.some((fragment) => line.includes(fragment))
}

const hits = []
let scanned = 0

for (const root of scanRoots) {
  for (const file of walk(root)) {
    scanned += 1
    const source = readFileSync(file, 'utf8')
    source.split(/\r?\n/).forEach((line, index) => {
      if (!isSuspiciousLine(line)) return
      hits.push(`${relative(projectRoot, file)}:${index + 1}: ${line.trim().slice(0, 160)}`)
    })
  }
}

assert.equal(hits.length, 0, `visible text quality gate found mojibake-like source:\n${hits.slice(0, 20).join('\n')}`)

console.log(`text quality gate passed (${scanned} files scanned)`)
