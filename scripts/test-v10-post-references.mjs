import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(new URL('../../offerlab-java/db/migration/20260720_knowledge_lifecycle.sql', import.meta.url), 'utf8')
const api = readFileSync(new URL('../src/api/postReferences.ts', import.meta.url), 'utf8')
const editor = readFileSync(new URL('../src/views/EditorView.vue', import.meta.url), 'utf8')
const panel = readFileSync(new URL('../src/components/post/PostReferencePanel.vue', import.meta.url), 'utf8')
for (const token of ['t_post_reference', 'normalized_url', 'active_guard', 'revision', 'broken_reason']) {
  assert.match(migration, new RegExp(token))
}
assert.match(api, /client\.put\(`\/api\/v1\/posts\/\$\{postId\}\/references\/reorder`, \{ items \}\)/)
assert.match(editor, /movePostReference\(item\.id, -1\)/)
assert.match(editor, /movePostReference\(item\.id, 1\)/)
assert.match(editor, /referenceId: item\.id[\s\S]*expectedRevision: item\.revision/)
assert.match(panel, /不构成投资建议、专业结论/)
assert.doesNotMatch(panel, /fetch\(item\.url|client\.(get|post)\(item\.url/)
console.log('V10 post reference guard passed.')
