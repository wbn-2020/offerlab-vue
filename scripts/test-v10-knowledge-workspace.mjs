import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = readFileSync(new URL('../src/api/knowledgeMaintenance.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/KnowledgeMaintenanceView.vue', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/components/layout/AppHeader.vue', import.meta.url), 'utf8')
const profile = readFileSync(new URL('../src/views/MeProfileView.vue', import.meta.url), 'utf8')
assert.match(api, /\/api\/v1\/users\/me\/knowledge-actions/)
assert.match(api, /sourceErrors/)
assert.match(route, /path: '\/me\/knowledge'[\s\S]*?requiresAuth: true/)
for (const key of ['tab', 'type', 'status', 'cursor']) {
  assert.match(view, new RegExp(`route\\.query\\.${key}`))
}
assert.match(view, /knowledgeMaintenanceApi\.actions\(\{[\s\S]*cursor:[\s\S]*type:[\s\S]*status:/)
assert.match(view, /replaceQuery\(\{ cursor: nextCursor\.value \}\)/)
assert.match(view, /AbortController/)
assert.match(view, /authStore\.user\?\.uid/)
assert.match(view, /authStore\.token/)
assert.match(view, /loadMoreError[\s\S]*retryLoadMore[\s\S]*v-else-if="hasMore"/)
assert.match(view, /pageSourceErrors\.value[\s\S]*new Set/)
assert.match(view, /role="alert"/)
assert.match(view, /session-expired/)
assert.match(view, /data-canonical-action/)
assert.match(header, /to="\/me\/knowledge"/)
assert.match(profile, /to="\/me\/knowledge"/)
console.log('V10 knowledge workspace guard passed.')
