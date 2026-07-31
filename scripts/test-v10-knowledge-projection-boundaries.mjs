import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const api = readFileSync(new URL('../src/api/knowledge.ts', import.meta.url), 'utf8')
const relationApi = readFileSync(new URL('../src/api/knowledgeRelations.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/KnowledgeExploreView.vue', import.meta.url), 'utf8')
for (const token of ['ConfirmedKnowledgeRelationDTO', 'DynamicKnowledgeSuggestionDTO', 'CONFIRMED', 'SUGGESTED', 'DEGRADED']) {
  assert.match(api, new RegExp(token))
}
assert.match(api, /isConfirmedKnowledgeRelation[\s\S]*reviewStatus === 'APPROVED'[\s\S]*visibilityStatus === 'VISIBLE'/)
assert.match(api, /visibilityStatus: raw\?\.visibilityStatus === 'VISIBLE' \? 'VISIBLE' : 'HIDDEN'/)
assert.match(relationApi, /item\.reviewStatus === 'APPROVED' && item\.visibilityStatus === 'VISIBLE'/)
assert.match(view, /confirmedRelations/)
assert.match(view, /dynamicSuggestions/)
assert.doesNotMatch(view, /v-for="edge in graph\.edges"/)
console.log('V10 knowledge projection boundary guard passed.')
