import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const apiSource = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const cardSource = readFileSync(new URL('../src/components/question/QuestionCard.vue', import.meta.url), 'utf8')

assert.match(apiSource, /highlightQuestionText\?:\s*string/, 'Question type must expose highlighted question text')
assert.match(apiSource, /highlightAnswerHint\?:\s*string/, 'Question type must expose highlighted answer hint')
assert.match(apiSource, /highlightExamPoint\?:\s*string/, 'Question type must expose highlighted exam point')
assert.match(apiSource, /highlightQuestionText:\s*raw\?\.highlightQuestionText \|\| undefined/, 'Question adapter must map highlighted question text')
assert.match(apiSource, /highlightAnswerHint:\s*raw\?\.highlightAnswerHint \|\| undefined/, 'Question adapter must map highlighted answer hint')
assert.match(apiSource, /highlightExamPoint:\s*raw\?\.highlightExamPoint \|\| undefined/, 'Question adapter must map highlighted exam point')

assert.match(cardSource, /v-html="displayQuestionText"/, 'QuestionCard must render highlighted question text')
assert.match(cardSource, /v-html="displayAnswerHint"/, 'QuestionCard must render highlighted answer hints')
assert.match(cardSource, /v-html="displayExamPoint"/, 'QuestionCard must render highlighted exam points')
assert.match(cardSource, /const escapeHtml\s*=\s*\(value:\s*string\)/, 'QuestionCard must escape highlight HTML before rendering')
assert.match(cardSource, /replace\(\/&lt;em&gt;\/g, '<mark class="question-search-highlight">'\)/, 'QuestionCard must only convert ES em tags to mark tags')
assert.match(cardSource, /replace\(\/&lt;\\\/em&gt;\/g, '<\/mark>'\)/, 'QuestionCard must close converted mark tags safely')
assert.match(cardSource, /question-search-highlight/, 'QuestionCard must style question search highlights')

console.log('question search highlight guard passed')
