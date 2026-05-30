import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/QuestionDetailView.vue', import.meta.url), 'utf8')
const exporter = readFileSync(new URL('../src/utils/prepPackExport.ts', import.meta.url), 'utf8')

assert.match(api, /answerDraft\?:\s*string/, 'Question type must expose answerDraft')
assert.match(api, /starStory\?:\s*string/, 'Question type must expose starStory')
assert.match(api, /answerDraft:\s*raw\?\.answerDraft/, 'Question adapter must read answerDraft')
assert.match(api, /starStory:\s*raw\?\.starStory/, 'Question adapter must read starStory')
assert.match(api, /updateNote:\s*\(id:\s*ApiId,\s*data:/, 'updateNote must accept structured note payload')

assert.match(detail, /回答草稿/, 'Question detail must render answer draft editor')
assert.match(detail, /STAR 项目映射/, 'Question detail must render STAR story editor')
assert.match(detail, /v-model\.trim="answerDraft"/, 'Answer draft editor must bind state')
assert.match(detail, /v-model\.trim="starStory"/, 'STAR story editor must bind state')
assert.match(detail, /answerDraft:\s*answerDraft\.value/, 'Save payload must include answerDraft')
assert.match(detail, /starStory:\s*starStory\.value/, 'Save payload must include starStory')
assert.match(detail, /safeStorage\.set\(noteDraftKey\.value/, 'Answer draft changes must be locally drafted')
assert.match(detail, /复制回答卡片/, 'Question detail must expose answer card copy action')
assert.match(detail, /buildQuestionAnswerCardMarkdown/, 'Question detail must use shared answer card exporter')
assert.match(detail, /navigator\.clipboard\.writeText/, 'Answer card copy must write Markdown to clipboard')

assert.match(exporter, /buildQuestionAnswerCardMarkdown/, 'Shared exporter must build question answer card Markdown')
assert.match(exporter, /## 回答草稿/, 'Answer card Markdown must include answer draft section')
assert.match(exporter, /## STAR 项目映射/, 'Answer card Markdown must include STAR story section')
assert.match(exporter, /## 复习笔记/, 'Answer card Markdown must include note section')

console.log('question answer draft guard passed')
