import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/views/TopicDetailView.vue', import.meta.url), 'utf8')

assert.match(source, /let loadGeneration = 0/, 'topic route loads must have a generation')
assert.match(source, /let postRequestGeneration = 0/, 'topic post filters must have an independent generation')
assert.match(source, /isCurrentLoad\(targetGeneration, slug\)/, 'async topic responses must verify route freshness')
assert.match(source, /targetPostGeneration === postRequestGeneration/, 'post responses must verify filter freshness')
assert.match(source, /onUnmounted\(\(\) => \{[\s\S]*?loadGeneration \+= 1/, 'unmount must invalidate pending topic requests')

console.log('topic request freshness guard passed')
