import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')
const allowed = new Set(['src/utils/safeStorage.ts', 'src/utils/authTokenStore.ts'])
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

const authStore = readFileSync(resolve(sourceRoot, 'utils/authTokenStore.ts'), 'utf8')
const authPiniaStore = readFileSync(resolve(sourceRoot, 'stores/auth.ts'), 'utf8')
const apiClient = readFileSync(resolve(sourceRoot, 'api/client.ts'), 'utf8')

if (!/sessionStorage\.setItem\(STORAGE_KEY, token\)/.test(authStore) || /localStorage\.setItem\(['"]token['"]/.test(authStore)) {
  console.error('storage safety guard failed:')
  console.error('- auth tokens must use session storage or memory, not persistent localStorage writes')
  process.exit(1)
}

if (!/authTokenStore\.clearLegacyLocalToken\(\)/.test(authPiniaStore)) {
  console.error('storage safety guard failed:')
  console.error('- auth store must clear the old persistent localStorage token key')
  process.exit(1)
}

if (!/authTokenStore\.get\(\)/.test(apiClient) || /safeStorage\.get\(['"]token['"]\)/.test(apiClient)) {
  console.error('storage safety guard failed:')
  console.error('- API client must read auth token from authTokenStore')
  process.exit(1)
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
