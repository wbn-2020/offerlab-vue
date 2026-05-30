import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')

function collectSourceFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    if (!entry.isFile()) return []
    if (!/\.(vue|ts)$/.test(entry.name)) return []
    if (relative(root, fullPath).replace(/\\/g, '/') === 'src/api/client.ts') return []
    return [fullPath]
  })
}

const files = collectSourceFiles(sourceRoot)
const clientSource = readFileSync(resolve(sourceRoot, 'api/client.ts'), 'utf8')

const forbiddenPatterns = [
  {
    label: 'direct optional error.message fallback',
    regex: /error\?\.message\s*\|\|/g,
  },
  {
    label: 'direct Error.message fallback',
    regex: /error\.message\s*\|\|/g,
  },
  {
    label: 'direct API result.message fallback',
    regex: /res\.message\s*\|\|/g,
  },
  {
    label: 'console-only user-facing error handling',
    regex: /console\.error\(/g,
  },
  {
    label: 'blocking alert feedback',
    regex: /alert\(/g,
  },
]

const violations = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const pattern of forbiddenPatterns) {
    for (const match of text.matchAll(pattern.regex)) {
      const line = text.slice(0, match.index).split(/\r?\n/).length
      violations.push(`${relative(root, file)}:${line} ${pattern.label}`)
    }
  }
}

if (violations.length > 0) {
  console.error('error handling guard failed:')
  for (const violation of violations) {
    console.error(`- ${violation}`)
  }
  process.exit(1)
}

if (/window\.location\.href\s*=/.test(clientSource)) {
  console.error('error handling guard failed:')
  console.error('- src/api/client.ts must use redirect helper instead of hard window.location.href assignment')
  process.exit(1)
}

if (!/skipAuthRedirect/.test(clientSource)) {
  console.error('error handling guard failed:')
  console.error('- src/api/client.ts must support skipAuthRedirect for optional auth probes')
  process.exit(1)
}

console.log('error handling guard passed')
