import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const card = readFileSync(new URL('../src/components/question/QuestionCard.vue', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/QuestionDetailView.vue', import.meta.url), 'utf8')
const admin = readFileSync(new URL('../src/views/AdminQuestionsView.vue', import.meta.url), 'utf8')

for (const field of ['examPoint', 'referenceAnswer', 'sourceSnippet', 'qualityReason']) {
  assert.match(api, new RegExp(`${field}\\?: string`), `Question API type must expose ${field}`)
  assert.match(api, new RegExp(`${field}: raw\\?\\.${field}`), `Question adapter must map ${field}`)
  assert.match(admin, new RegExp(`form\\.${field}`), `Admin question editor must bind ${field}`)
}

assert.match(card, /question\.examPoint/, 'QuestionCard must show the structured exam point signal')
assert.match(card, /考察点：/, 'QuestionCard must label exam point clearly')
assert.match(detail, /question\.examPoint/, 'Question detail must render exam point')
assert.match(detail, /question\.referenceAnswer/, 'Question detail must render reference answer')
assert.match(detail, /question\.sourceSnippet/, 'Question detail must render source snippet')
assert.match(detail, /question\.qualityReason/, 'Question detail must render extraction quality reason')
assert.match(admin, /参考答案/, 'Admin editor must expose reference answer editing')
assert.match(admin, /来源片段/, 'Admin editor must expose source snippet editing')
assert.match(admin, /质量说明/, 'Admin editor must expose quality reason editing')

console.log('question structured fields guard passed')
