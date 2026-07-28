import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const typescript = require('typescript')
const { parse: parseVueSfc } = require('vue/compiler-sfc')
const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')
// Stable compiler-core NodeTypes used by the template AST returned from compiler-sfc.
const ELEMENT_NODE = 1
const TEXT_NODE = 2
const INTERPOLATION_NODE = 5
const DIRECTIVE_NODE = 7
const HONEST_BOUNDARY_COPY = '来源状态由作者自行维护，平台不代为验证链接是否可访问。'

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
const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim()
const parseVueTemplate = (source, relativePath) => {
  const { descriptor, errors } = parseVueSfc(source, { filename: relativePath })
  const errorText = errors
    .map((error) => (typeof error === 'string' ? error : error.message))
    .join('; ')
  assert(errors.length === 0, `${relativePath} must be valid Vue SFC syntax: ${errorText}`)
  assert(descriptor.template?.ast, `${relativePath} must contain a parseable template`)
  return descriptor.template.ast
}
const directive = (element, name) =>
  element?.props?.find((prop) => prop.type === DIRECTIVE_NODE && prop.name === name)
const directiveExpression = (element, name) =>
  normalizeWhitespace(directive(element, name)?.exp?.content || '')
const conditionalDirective = (element) =>
  ['if', 'else-if', 'else', 'show']
    .map((name) => directive(element, name))
    .find(Boolean)
const describeElement = (element, relativePath) => {
  const condition = conditionalDirective(element)
  const expression = normalizeWhitespace(condition?.exp?.content || '')
  const directiveText = condition
    ? ` v-${condition.name}${expression ? `="${expression}"` : ''}`
    : ''
  return `<${element.tag}${directiveText}> at ${relativePath}:${element.loc.start.line}`
}
const collectElements = (node, ancestors = [], results = []) => {
  if (node.type === ELEMENT_NODE) {
    results.push({ node, ancestors })
    ancestors = [...ancestors, node]
  }
  for (const child of node.children || []) {
    collectElements(child, ancestors, results)
  }
  return results
}
const directStaticText = (element) =>
  normalizeWhitespace(
    (element.children || [])
      .filter((child) => child.type === TEXT_NODE)
      .map((child) => child.content)
      .join(' '),
  )
const collectInterpolations = (node, ancestors = [], results = []) => {
  if (node.type === ELEMENT_NODE) {
    ancestors = [...ancestors, node]
  }
  if (node.type === INTERPOLATION_NODE) {
    results.push({ node, ancestors })
  }
  for (const child of node.children || []) {
    collectInterpolations(child, ancestors, results)
  }
  return results
}
const previousElementSibling = (element, parent) => {
  const siblings = (parent?.children || []).filter((child) => child.type === ELEMENT_NODE)
  const index = siblings.indexOf(element)
  return index > 0 ? siblings[index - 1] : undefined
}
const expressionGuaranteesNonEmptyItems = (expression) => {
  const compact = expression.replace(/\s+/g, '')
  return (
    compact === 'items.length'
    || compact.includes('items.length>0')
    || compact.includes('items.length!==0')
    || compact.includes('items.length!=0')
  )
}
const isNonEmptyStateBranch = (element, parent) => {
  const ifExpression = directiveExpression(element, 'if')
  const elseIfExpression = directiveExpression(element, 'else-if')
  if (
    expressionGuaranteesNonEmptyItems(ifExpression)
    || expressionGuaranteesNonEmptyItems(elseIfExpression)
  ) {
    return true
  }
  if (!directive(element, 'else')) return false
  const previous = previousElementSibling(element, parent)
  const previousExpression = previous
    ? directiveExpression(previous, 'else-if') || directiveExpression(previous, 'if')
    : ''
  return previousExpression.replace(/\s+/g, '') === '!items.length'
}
const assertHonestBoundaryIsUnconditional = (templateAst, relativePath) => {
  const matches = collectElements(templateAst).filter(
    ({ node }) => directStaticText(node) === HONEST_BOUNDARY_COPY,
  )
  assert(
    matches.length === 1,
    `${relativePath} must render the exact honest-boundary copy once; found ${matches.length}`,
  )
  const { node, ancestors } = matches[0]
  const conditionalOwner = [...ancestors, node].find((element) => conditionalDirective(element))
  if (conditionalOwner) {
    throw new Error(
      `${relativePath} honest-boundary copy must stay outside loading/error/empty/non-empty branches; found inside ${describeElement(conditionalOwner, relativePath)}`,
    )
  }
}
const assertReferenceCountsRequireItems = (templateAst, relativePath) => {
  const totalInterpolations = collectInterpolations(templateAst).filter(
    ({ node }) => normalizeWhitespace(node.content.content) === 'health.total',
  )
  assert(
    totalInterpolations.length > 0,
    `${relativePath} must keep the non-empty reference count summaries`,
  )
  for (const interpolation of totalInterpolations) {
    const guarded = interpolation.ancestors.some((element, index, ancestors) =>
      isNonEmptyStateBranch(element, ancestors[index - 1]),
    )
    assert(
      guarded,
      `${relativePath}:${interpolation.node.loc.start.line} health.total must stay inside the non-empty branch so an empty post never shows a fabricated 0 count`,
    )
  }
}
const assertPostDetailMountsReferencePanel = (templateAst, source, relativePath) => {
  includes(
    source,
    "import PostReferencePanel from '@/components/post/PostReferencePanel.vue'",
    `${relativePath} reference panel import`,
  )
  const mounts = collectElements(templateAst).filter(
    ({ node }) => node.tag === 'PostReferencePanel',
  )
  assert(
    mounts.length > 0,
    `${relativePath} must mount <PostReferencePanel>; removing it hides the V17 honesty boundary from post detail`,
  )
}
const assertGuardRejects = (operation, expectedMessage, label) => {
  let failure
  try {
    operation()
  } catch (error) {
    failure = error
  }
  assert(failure, `${label} must be rejected by the V17 guard`)
  includes(String(failure.message), expectedMessage, `${label} failure message`)
}

const [util, panel, postDetail, packageJson] = await Promise.all([
  read('src/utils/referenceHealth.ts'),
  read('src/components/post/PostReferencePanel.vue'),
  read('src/views/PostDetailView.vue'),
  read('package.json'),
])
const pkg = JSON.parse(packageJson)
const panelTemplate = parseVueTemplate(
  panel,
  'src/components/post/PostReferencePanel.vue',
)
const postDetailTemplate = parseVueTemplate(postDetail, 'src/views/PostDetailView.vue')

// --- util: broken 计数来源 + 无自动探活 ---
includes(util, 'summarizeReferenceHealth', 'reference health util')
includes(util, "=== 'BROKEN'", 'reference health broken count source')
excludes(util, 'fetch(', 'reference health util (no active probing)')
excludes(util, 'XMLHttpRequest', 'reference health util (no active probing)')
excludes(util, 'setInterval', 'reference health util (no active probing)')

// --- 面板：非颜色区分 BROKEN + 诚实边界文案 + 无过度声称 + 无探活 ---
includes(panel, 'referenceStatusLabel', 'reference panel status label')
includes(panel, 'aria-label', 'reference panel accessible broken distinction')
includes(panel, '该来源已被作者标记为失效', 'reference panel accessible broken label')
includes(panel, '该来源由作者维护为有效', 'reference panel accessible active label')
includes(panel, HONEST_BOUNDARY_COPY, 'reference panel honest boundary copy')
includes(panel, '当前有效来源中，作者最早确认于', 'reference panel oldest confirmation copy')
includes(panel, '不构成投资建议、专业结论或平台认证', 'reference panel investment-risk boundary')
assertHonestBoundaryIsUnconditional(
  panelTemplate,
  'src/components/post/PostReferencePanel.vue',
)
assertReferenceCountsRequireItems(panelTemplate, 'src/components/post/PostReferencePanel.vue')
assertPostDetailMountsReferencePanel(
  postDetailTemplate,
  postDetail,
  'src/views/PostDetailView.vue',
)
const conditionalBoundaryFixture = `
<template>
  <section>
    <p v-if="loading">${HONEST_BOUNDARY_COPY}</p>
  </section>
</template>
`
assertGuardRejects(
  () => assertHonestBoundaryIsUnconditional(
    parseVueTemplate(conditionalBoundaryFixture, 'guard-fixture/conditional-boundary.vue'),
    'guard-fixture/conditional-boundary.vue',
  ),
  'must stay outside loading/error/empty/non-empty branches',
  'conditional honest-boundary regression',
)
const detachedPanelFixture = `
<template><main /></template>
<script setup>
import PostReferencePanel from '@/components/post/PostReferencePanel.vue'
</script>
`
assertGuardRejects(
  () => assertPostDetailMountsReferencePanel(
    parseVueTemplate(detachedPanelFixture, 'guard-fixture/detached-panel.vue'),
    detachedPanelFixture,
    'guard-fixture/detached-panel.vue',
  ),
  'must mount <PostReferencePanel>',
  'PostDetailView detached-panel regression',
)
for (const overclaim of ['已验证', '已核实', '平台验证', '可信来源', '链接有效']) {
  excludes(panel, overclaim, 'reference panel (no platform-verification overclaim)')
}
for (const misleadingTimeCopy of ['最近确认', '平台检查时间', '链接新鲜度']) {
  excludes(panel, misleadingTimeCopy, 'reference panel (earliest author confirmation only)')
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
assert(
  none.active === 0 && none.broken === 0 && none.oldestConfirmedAt === null,
  'empty list must not invent counts or an earliest confirmation',
)

const maintained = summarizeReferenceHealth([
  { referenceStatus: 'ACTIVE', lastConfirmedAt: '2026-07-20T10:00:00' },
  { referenceStatus: 'ACTIVE', lastConfirmedAt: '2026-07-10T10:00:00' },
])
assert(maintained.tone === 'maintained', 'all-active list must be tone=maintained')
assert(maintained.total === 2 && maintained.active === 2 && maintained.broken === 0, 'maintained counts must be exact')
assert(maintained.oldestConfirmedAt === '2026-07-10T10:00:00', 'oldestConfirmedAt must be the earliest active confirmation')

const attention = summarizeReferenceHealth([
  { referenceStatus: 'ACTIVE', lastConfirmedAt: '2026-07-20T10:00:00' },
  {
    referenceStatus: 'BROKEN',
    lastConfirmedAt: '2026-07-01T10:00:00',
    brokenReason: '链接 404',
  },
  { referenceStatus: 'BROKEN' },
])
assert(attention.tone === 'attention', 'any broken must be tone=attention')
assert(attention.total === 3 && attention.active === 1 && attention.broken === 2, 'attention counts must be exact')
assert(
  attention.oldestConfirmedAt === '2026-07-20T10:00:00',
  'BROKEN confirmation timestamps must not affect the earliest ACTIVE confirmation',
)

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
