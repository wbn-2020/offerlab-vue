import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../../offerlab-java/db/migration/20260720_knowledge_lifecycle.sql', import.meta.url), 'utf8')
const api = readFileSync(new URL('../src/api/knowledgeRelations.ts', import.meta.url), 'utf8')
for (const token of ['t_post_knowledge_relation', 'source_post_id', 'target_post_id', 'visibility_status', 'effective_guard']) {
  assert.match(migration, new RegExp(token))
}
assert.doesNotMatch(migration, /CREATE TABLE t_knowledge_relation/)
assert.match(api, /visibilityStatus/)
assert.match(api, /reviewStatus === 'APPROVED' && item\.visibilityStatus === 'VISIBLE'/)
console.log('V10 knowledge relation guard passed.')
