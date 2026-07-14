import { existsSync, readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const catalogUrl = new URL('../src/composables/useDomainCatalog.ts', import.meta.url)

assert.equal(existsSync(catalogUrl), true, 'shared domain catalog composable must exist')

const catalog = read('../src/composables/useDomainCatalog.ts')
const editor = read('../src/views/EditorView.vue')
const header = read('../src/components/layout/AppHeader.vue')
const home = read('../src/views/HomeView.vue')

assert.match(catalog, /domainApi\.listPublic\(\)/, 'shared catalog must request the public domain API')
assert.match(catalog, /if\s*\(catalogRequest\)\s*return\s+catalogRequest/, 'shared catalog must deduplicate concurrent requests')
assert.match(catalog, /localDomainConfigs/, 'shared catalog must retain the local availability fallback')
assert.doesNotMatch(catalog, /return\s*\{[\s\S]{0,400}\bsource\b/, 'remote/fallback source must remain internal')

for (const [name, source] of Object.entries({ editor, header, home })) {
  assert.match(source, /useDomainCatalog/, `${name} must consume the shared domain catalog`)
  assert.doesNotMatch(source, /domainApi\.listPublic\(/, `${name} must not issue a duplicate domain request`)
  assert.doesNotMatch(
    source,
    /\/api\/v1\/domains|domainSource|headerDomainSourceSummary|domainSourceSummary|本地 fallback|接口未返回/,
    `${name} must not expose catalog implementation details`,
  )
}

assert.match(editor, /domain-source-note/, 'EditorView must explain why the selected channel matters')
assert.match(editor, /selectedDomainMeta/, 'EditorView must derive selected channel metadata from the shared catalog')
assert.match(home, /homeDomainOptions/, 'HomeView must render shared enabled channels')
assert.match(header, /headerDomainOptions/, 'AppHeader must render shared enabled channels')

console.log('stage3 domain source guard passed')
