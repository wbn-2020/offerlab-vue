import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const health = readFileSync(new URL('../src/views/AdminChannelHealthView.vue', import.meta.url), 'utf8')
const projectionApi = readFileSync(new URL('../src/api/projectionHealth.ts', import.meta.url), 'utf8')
assert.match(health, /projection/i)
assert.match(projectionApi, /KNOWLEDGE_LIFECYCLE|reconciliationSupported/)
assert.match(projectionApi, /reconciliationSupported/)
console.log('V10 knowledge health surface guard passed.')
