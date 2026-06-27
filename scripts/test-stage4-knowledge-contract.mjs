import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const knowledgeApi = readFileSync(new URL('../src/api/knowledge.ts', import.meta.url), 'utf8')
const knowledgeView = readFileSync(new URL('../src/views/KnowledgeExploreView.vue', import.meta.url), 'utf8')

assert.match(knowledgeApi, /export interface KnowledgeExploreQuery/, 'knowledge API must keep an explicit public query contract')
assert.doesNotMatch(knowledgeApi, /\bseriesId\b/, 'knowledge API public query contract must not advertise seriesId')

assert.match(knowledgeView, /knowledgeApi/, 'knowledge explore view must keep using the knowledge API client')
assert.doesNotMatch(knowledgeView, /\bseriesId\b/, 'knowledge explore view must not keep a public seriesId filter or request field')
assert.doesNotMatch(knowledgeView, /series_post/, 'knowledge explore view must not promise a public series_post relation')
assert.doesNotMatch(knowledgeView, /系列 ID/, 'knowledge explore view copy must not advertise series filtering')

console.log('stage4 knowledge public contract guard passed')
