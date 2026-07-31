import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../../offerlab-java/db/migration/20260720_knowledge_lifecycle.sql', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../src/components/post/PostOutcomePanel.vue', import.meta.url), 'utf8')
const api = readFileSync(new URL('../src/api/postOutcomes.ts', import.meta.url), 'utf8')
for (const token of ['t_int_post_outcome', 'publication_status', 'PENDING_REVIEW', 'PUBLISHED', 'follow_up_at']) {
  assert.match(migration, new RegExp(token))
}
assert.match(detail, /requires-risk-acknowledgement="post\.domain === 5"/)
assert.match(panel, /requiresRiskAcknowledgement && draft\.visibility !== 'PRIVATE' && !riskAcknowledged\.value/)
assert.doesNotMatch(panel, /riskAcknowledged:\s*true/)
assert.match(panel, /summary\?\.minimumSampleMet && summary\.samples\.length/)
assert.match(panel, /auth\.isLoggedIn && !isOwnPost/)
assert.match(api, /\/outcomes\/summary/)
assert.match(api, /samples: Array\.isArray\(res\.data\.samples\)/)
console.log('V10 outcome and revisit guard passed.')
