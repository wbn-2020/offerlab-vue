import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')
const allowed = new Set(['src/utils/safeStorage.ts'])
const mePrep = readFileSync(resolve(sourceRoot, 'views/MePrepView.vue'), 'utf8')
const header = readFileSync(resolve(sourceRoot, 'components/layout/AppHeader.vue'), 'utf8')

function collectSourceFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    if (!entry.isFile()) return []
    return /\.(vue|ts)$/.test(entry.name) ? [fullPath] : []
  })
}

const violations = []

for (const file of collectSourceFiles(sourceRoot)) {
  const relativePath = relative(root, file).replace(/\\/g, '/')
  if (allowed.has(relativePath)) continue
  const text = readFileSync(file, 'utf8')
  const executableText = text
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
  for (const match of executableText.matchAll(/\b(?:window\.)?(?:localStorage|sessionStorage)\b/g)) {
    const line = executableText.slice(0, match.index).split(/\r?\n/).length
    violations.push(`${relativePath}:${line} use safeStorage instead of direct ${match[0]} access`)
  }
}

if (violations.length > 0) {
  console.error('storage safety guard failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

if (!/queryKey:\s*computed\(\(\)\s*=>\s*\['me-prep-overview',\s*prepOwner\.value\]\)/.test(mePrep)) {
  console.error('storage safety guard failed:')
  console.error('- src/views/MePrepView.vue must scope prep overview query cache by current user')
  process.exit(1)
}

if (!/queryKey:\s*computed\(\(\)\s*=>\s*\['mock-interview-stats',\s*prepOwner\.value\]\)/.test(mePrep)) {
  console.error('storage safety guard failed:')
  console.error('- src/views/MePrepView.vue must scope mock interview stats query cache by current user')
  process.exit(1)
}

if (!/authApi\.logout\(\)/.test(header)) {
  console.error('storage safety guard failed:')
  console.error('- src/components/layout/AppHeader.vue must call server logout before clearing local auth state')
  process.exit(1)
}

console.log('storage safety guard passed')
