import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const block = readFileSync(new URL('../src/components/question/PostQuestionBlock.vue', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')
const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')

assert.match(detail, /<PostQuestionBlock v-if="post\.postType === 1"/, 'interview post detail must render the question extraction status block')
assert.match(api, /taskStatus: 'none' \| 'pending' \| 'running' \| 'succeeded' \| 'failed'/, 'question API type must expose extraction task status')
assert.match(block, /statusMeta/, 'PostQuestionBlock must derive a visible status label')
assert.match(block, /整理中/, 'PostQuestionBlock must show an in-progress extraction state')
assert.match(block, /题目整理失败/, 'PostQuestionBlock must show a failed extraction state to users')
assert.match(block, /setTimeout\(\(\) => \{[\s\S]*load\(\{ silent: true \}\)/, 'PostQuestionBlock must auto-refresh while extraction is pending or running')
assert.match(block, /onBeforeUnmount\(clearPoll\)/, 'PostQuestionBlock must clean up extraction polling timers')
assert.match(block, /重新提取/, 'admins must keep a manual re-extraction entry')

console.log('post question status guard passed')
