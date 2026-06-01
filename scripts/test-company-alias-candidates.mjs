import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/AdminCompanyAliasesView.vue', import.meta.url), 'utf8')

assert.match(opsApi, /interface CompanyAliasCandidate/, 'ops API must expose company alias candidate type')
for (const field of ['canonicalCompany', 'alias', 'questionSampleCount', 'postSampleCount', 'reason']) {
  assert.match(opsApi, new RegExp(`${field}\\??:`), `CompanyAliasCandidate must expose ${field}`)
}
assert.match(opsApi, /listCompanyAliasCandidates/, 'ops API must expose candidate query')
assert.match(opsApi, /\/api\/v1\/admin\/company-aliases\/candidates/, 'candidate query must call backend endpoint')
assert.doesNotMatch(opsApi, /listCompanyAliasCandidates:[\s\S]*optionalPanelUnavailable/, 'candidate query must not silently swallow backend failures')

assert.match(view, /候选推荐/, 'company alias view must render candidate panel')
assert.match(view, /candidates = ref<CompanyAliasCandidate\[\]>\(\[\]\)/, 'company alias view must keep candidate state')
assert.match(view, /candidateError\s*=\s*ref\(''\)/, 'company alias view must keep an explicit candidate error state')
assert.match(view, /v-else-if="candidateError"/, 'candidate panel must render backend failures separately from an empty candidate list')
assert.match(view, /@click="loadCandidates"/, 'candidate error state must provide a retry action')
assert.match(view, /loadCandidates/, 'company alias view must load candidates')
assert.match(view, /opsApi\.listCompanyAliasCandidates\(\{ limit: 20 \}\)/, 'candidate panel must use candidate API')
assert.match(view, /一键加入/, 'candidate panel must support one-click acceptance')
assert.match(view, /fillCandidate/, 'candidate panel must support filling the edit form')
assert.match(view, /opsApi\.createCompanyAlias\(\{[\s\S]*canonicalCompany: item\.canonicalCompany,[\s\S]*alias: item\.alias,[\s\S]*status: 1/, 'one-click acceptance must create an enabled alias')
assert.match(view, /item\.questionSampleCount/, 'candidate panel must show question sample count')
assert.match(view, /item\.postSampleCount/, 'candidate panel must show post sample count')
assert.match(view, /item\.reason/, 'candidate panel must explain recommendation reason')

console.log('company alias candidate guard passed')
