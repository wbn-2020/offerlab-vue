import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const eslintBin = resolve(root, 'node_modules/eslint/bin/eslint.js')
const baselineWarnings = 3644
const criticalWarningBaseline = new Map([
  ['src/api/client.ts', 3],
  ['src/stores/auth.ts', 0],
  ['src/views/KnowledgeExploreView.vue', 52],
  ['src/views/GrowthReportView.vue', 0],
  ['src/views/CertificationApplyView.vue', 0],
  ['src/views/LoginView.vue', 1],
])

const result = spawnSync(process.execPath, [
  eslintBin,
  'src',
  'scripts',
  'vite.config.ts',
  'postcss.config.js',
  'eslint.config.js',
  '--no-cache',
  '--format',
  'json',
], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  windowsHide: true,
})

if (result.error) throw result.error
let reports
try {
  reports = JSON.parse(result.stdout)
} catch {
  process.stderr.write(result.stderr || result.stdout || 'ESLint did not return JSON output.\n')
  process.exit(result.status || 1)
}

const warningCount = reports.reduce((sum, file) => sum + file.warningCount, 0)
const errorCount = reports.reduce((sum, file) => sum + file.errorCount, 0)
const currentWarnings = new Map(
  reports.map((file) => [
    file.filePath.replace(`${root}\\`, '').replace(/\\/g, '/'),
    file.warningCount,
  ]),
)

const failures = []
if (errorCount > 0) failures.push(`ESLint errors: ${errorCount}`)
if (warningCount > baselineWarnings) {
  failures.push(`warning baseline exceeded: ${warningCount} > ${baselineWarnings}`)
}
for (const [file, baseline] of criticalWarningBaseline) {
  const current = currentWarnings.get(file) || 0
  if (current > baseline) failures.push(`${file} warnings increased: ${current} > ${baseline}`)
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`lint baseline passed: ${warningCount} warnings, ${errorCount} errors`)
