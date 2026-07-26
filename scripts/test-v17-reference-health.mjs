import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')

const read = (relativePath) => readFile(resolve(root, relativePath), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
const includes = (text, fragment, label) => {
  assert(text.includes(fragment), `${label} must contain ${fragment}`)
}
const excludes = (text, fragment, label) => {
  assert(!text.includes(fragment), `${label} must not contain ${fragment}`)
}

const [util, panel, packageJson] = await Promise.all([
  read('src/utils/referenceHealth.ts'),
  read('src/components/post/PostReferencePanel.vue'),
  read('package.json'),
])
const pkg = JSON.parse(packageJson)

// --- util: broken 计数来源 + 无自动探活 ---
includes(util, 'summarizeReferenceHealth', 'reference health util')
includes(util, "=== 'BROKEN'", 'reference health broken count source')
excludes(util, 'fetch(', 'reference health util (no active probing)')
excludes(util, 'XMLHttpRequest', 'reference health util (no active probing)')
excludes(util, 'setInterval', 'reference health util (no active probing)')

// --- 面板：非颜色区分 BROKEN + 诚实边界文案 + 无过度声称 + 无探活 ---
includes(panel, 'referenceStatusLabel', 'reference panel status label')
includes(panel, 'aria-label', 'reference panel accessible broken distinction')
includes(panel, '平台不代为验证', 'reference panel honest boundary copy')
includes(panel, '其中最早确认于', 'reference panel oldest confirmation copy')
for (const overclaim of ['已验证', '已核实', '平台验证', '可信来源', '链接有效']) {
  excludes(panel, overclaim, 'reference panel (no platform-verification overclaim)')
}
excludes(panel, 'fetch(', 'reference panel (no active probing)')
excludes(panel, 'XMLHttpRequest', 'reference panel (no active probing)')
excludes(panel, 'setInterval', 'reference panel (no active probing)')

// --- 转译执行纯函数，断言三态与计数正确 ---
const transpiled = typescript.transpileModule(util, {
  compilerOptions: {
    module: typescript.ModuleKind.ESNext,
    target: typescript.ScriptTarget.ES2022,
  },
}).outputText
const utilModule = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`,
)
const { summarizeReferenceHealth, referenceStatusLabel } = utilModule

const none = summarizeReferenceHealth([])
assert(none.tone === 'none' && none.total === 0, 'empty list must be tone=none')

const maintained = summarizeReferenceHealth([
  { referenceStatus: 'ACTIVE', lastConfirmedAt: '2026-07-20T10:00:00' },
  { referenceStatus: 'ACTIVE', lastConfirmedAt: '2026-07-10T10:00:00' },
])
assert(maintained.tone === 'maintained', 'all-active list must be tone=maintained')
assert(maintained.total === 2 && maintained.active === 2 && maintained.broken === 0, 'maintained counts must be exact')
assert(maintained.oldestConfirmedAt === '2026-07-10T10:00:00', 'oldestConfirmedAt must be the earliest active confirmation')

const attention = summarizeReferenceHealth([
  { referenceStatus: 'ACTIVE', lastConfirmedAt: '2026-07-20T10:00:00' },
  { referenceStatus: 'BROKEN', brokenReason: '链接 404' },
  { referenceStatus: 'BROKEN' },
])
assert(attention.tone === 'attention', 'any broken must be tone=attention')
assert(attention.total === 3 && attention.active === 1 && attention.broken === 2, 'attention counts must be exact')

assert(referenceStatusLabel('BROKEN') === '已标记失效', 'broken status label')
assert(referenceStatusLabel('ACTIVE') === '有效（作者维护）', 'active status label')
assert(referenceStatusLabel(undefined) === '有效（作者维护）', 'undefined status defaults to active label')

// --- 挂载进 guard 链 ---
assert(
  pkg.scripts?.['test:v17-reference-health'] === 'node scripts/test-v17-reference-health.mjs',
  'package.json must expose test:v17-reference-health',
)
includes(pkg.scripts?.['pretest:guards'] || '', 'npm run test:v17-reference-health', 'pretest:guards')
includes(pkg.scripts?.verify || '', 'npm run test:guards', 'verify')

console.log('V17 reference health guard passed')
