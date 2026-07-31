import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = readFileSync(new URL('../src/api/contentSuggestions.ts', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../src/components/post/ContentSuggestionPanel.vue', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
for (const token of ['baseVersion', 'targetScope', 'targetLocator', 'expectedChange', 'resolution', 'deliveryStatus', 'PLANNED']) {
  assert.match(api, new RegExp(token))
}
assert.match(api, /resultVersion/)
assert.match(panel, /data-resolution[\s\S]*data-delivery-status/)
assert.match(detail, /decideContentSuggestion\(item, 'PLANNED'\)/)
console.log('V10 suggestion versioning guard passed.')
