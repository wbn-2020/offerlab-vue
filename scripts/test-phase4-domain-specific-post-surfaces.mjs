import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import * as ts from 'typescript'

const root = new URL('../', import.meta.url)
const readSource = (path) => readFileSync(new URL(path, root), 'utf8')

const helperUrl = new URL('src/utils/domainPostSurfaces.ts', root)
assert.ok(existsSync(helperUrl), 'Phase 4 must provide src/utils/domainPostSurfaces.ts for shared domain display mapping.')

const helper = readSource('src/utils/domainPostSurfaces.ts')
const card = readSource('src/components/post/PostCard.vue')
const detail = readSource('src/views/PostDetailView.vue')

const requiredHelperNeedles = [
  'buildDomainCardSurface',
  'buildDomainDetailSurface',
  'DOMAIN.TECH',
  'DOMAIN.CAREER',
  'DOMAIN.READING',
  'DOMAIN.LIFESTYLE',
  'DOMAIN.INVESTMENT',
  'techStacks',
  'companySize',
  'bookName',
  'readingTime',
  'investmentType',
  'riskLevel',
  'riskNotice',
]

for (const needle of requiredHelperNeedles) {
  assert.ok(helper.includes(needle), `domainPostSurfaces.ts must include ${needle}.`)
}

assert.match(
  helper,
  /const\s+firstText\s*=/,
  'domainPostSurfaces.ts must use tolerant alias extraction instead of one hard-coded field name.',
)
assert.match(
  helper,
  /const\s+listFrom\s*=/,
  'domainPostSurfaces.ts must normalize list-like image/tag fields.',
)
assert.doesNotMatch(
  helper,
  /firstList\(ext,\s*\['techStacks',\s*'stacks',\s*'tools',\s*'tooling'\]\)/,
  'TECH card must not treat generic tools/tooling as a tech stack chip.',
)
assert.match(
  helper,
  /export\s+const\s+buildDomainDetailSurface\s*=\s*\(post:\s*Post\):\s*DomainDetailSurface\s*\|\s*null\s*=>/,
  'buildDomainDetailSurface should return null for empty surfaces.',
)

assert.match(
  card,
  /import\s+\{[^}]*buildDomainCardSurface[^}]*\}\s+from\s+['"]@\/utils\/domainPostSurfaces['"]/,
  'PostCard.vue must import buildDomainCardSurface.',
)
assert.match(card, /domainCardSurface/, 'PostCard.vue must compute domainCardSurface.')
assert.match(card, /domain-card-chip/, 'PostCard.vue must render domain-card-chip elements.')
assert.match(card, /domain-card-media/, 'PostCard.vue must render a LIFESTYLE-friendly domain-card-media preview.')

assert.match(
  detail,
  /import\s+\{[^}]*buildDomainDetailSurface[^}]*\}\s+from\s+['"]@\/utils\/domainPostSurfaces['"]/,
  'PostDetailView.vue must import buildDomainDetailSurface.',
)
assert.match(detail, /domainDetailSurface/, 'PostDetailView.vue must compute domainDetailSurface.')
assert.match(detail, /domain-detail-panel/, 'PostDetailView.vue must render a domain-detail-panel.')
assert.match(detail, /domain-detail-grid/, 'PostDetailView.vue must render a domain-detail-grid.')
assert.match(detail, /domain-detail-gallery/, 'PostDetailView.vue must render lifestyle gallery images when present.')
assert.match(detail, /riskNotice/, 'PostDetailView.vue must include investment riskNotice rendering.')

const nodeRequire = createRequire(import.meta.url)
const runtimeHelper = ts.transpileModule(helper, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
  fileName: 'domainPostSurfaces.ts',
}).outputText

const sandbox = {
  module: { exports: {} },
  exports: {},
  require: (specifier) => {
    if (specifier === '@/utils/domains') {
      return { DOMAIN: { TECH: 1, CAREER: 2, READING: 3, LIFESTYLE: 4, INVESTMENT: 5 } }
    }
    return nodeRequire(specifier)
  },
  console,
}
sandbox.exports = sandbox.module.exports
vm.runInNewContext(runtimeHelper, sandbox, { filename: 'domainPostSurfaces.js' })
const { buildDomainCardSurface, buildDomainDetailSurface } = sandbox.module.exports

const techSurface = buildDomainCardSurface({
  postId: 1,
  postType: 17,
  title: 'x',
  content: 'x',
  tags: [],
  author: { uid: 1, nickname: 'a', avatar: '', signature: '', createdAt: 0 },
  counter: { view: 0, like: 0, comment: 0, favorite: 0 },
  extension: { techStacks: ['Redis'], tools: ['Kafka'] },
  domain: 1,
  createdAt: 0,
  updatedAt: 0,
})
assert.equal(techSurface.chips.some((chip) => chip.label === 'Kafka'), false, 'tools must not leak into tech stack chips.')

const emptySurface = buildDomainDetailSurface({
  postId: 2,
  postType: 17,
  title: 'x',
  content: 'x',
  tags: [],
  author: { uid: 1, nickname: 'a', avatar: '', signature: '', createdAt: 0 },
  counter: { view: 0, like: 0, comment: 0, favorite: 0 },
  extension: {},
  domain: 1,
  createdAt: 0,
  updatedAt: 0,
})
assert.equal(emptySurface, null, 'Empty metadata should not render a default domain detail panel.')

console.log('Phase 4 domain-specific post surfaces guard passed.')
