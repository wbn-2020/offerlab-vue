import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const home = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')

for (const [name, source] of Object.entries({ editor, header, home })) {
  assert.match(source, /domainApi/, `${name} must import the shared domain API`)
  assert.match(source, /localDomainConfigs/, `${name} must keep the local fallback domain set`)
  assert.match(source, /listPublic\(/, `${name} must request domains via /api/v1/domains`)
  assert.match(source, /domainSource/, `${name} must track whether domains came from remote or fallback`)
}

assert.match(editor, /domain-source-note/, 'EditorView must explain the editor domain source state')
assert.match(editor, /selectedDomainMeta/, 'EditorView must derive the selected domain metadata from the unified source')
assert.match(home, /domainSourceSummary/, 'HomeView must summarize the home domain source state')
assert.match(home, /homeDomainOptions/, 'HomeView must expose a merged domain option list')
assert.match(header, /headerDomainSourceSummary/, 'AppHeader must summarize the header domain source state')
assert.match(header, /headerDomainOptions/, 'AppHeader must expose a merged domain option list')

console.log('stage3 domain source guard passed')
