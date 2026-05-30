import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const card = readFileSync(new URL('../src/components/question/QuestionCard.vue', import.meta.url), 'utf8')
const mockView = readFileSync(new URL('../src/views/MockInterviewView.vue', import.meta.url), 'utf8')
const mockWorkspace = readFileSync(new URL('../src/components/mock-interview/MockInterviewWorkspace.vue', import.meta.url), 'utf8')
const mockStats = readFileSync(new URL('../src/components/mock-interview/MockInterviewStatsPanel.vue', import.meta.url), 'utf8')

assert.match(card, /class="review-action/, 'QuestionCard must expose a review queue action')
assert.match(card, /addToReviewQueue/, 'QuestionCard must implement addToReviewQueue')
assert.match(card, /questionApi\.updateProgress\(props\.question\.id, 'review'\)/, 'QuestionCard must mark the question as review')
assert.match(card, /useLoginRedirect/, 'QuestionCard must reuse login redirect flow')
assert.match(card, /effectiveProgressStatus/, 'QuestionCard must reflect local review status after success')
assert.match(card, /isReviewQueued/, 'QuestionCard must disable duplicate review queue clicks')
assert.match(card, /review-added/, 'QuestionCard must emit review-added for parent refresh hooks')

assert.match(mockWorkspace, /mark-weak-questions-review/, 'Mock workspace must expose weak question review action')
assert.match(mockStats, /mark-weak-answers-review/, 'Mock stats panel must expose weak answer review action')
assert.match(mockView, /questionApi\.updateProgress\(id, 'review'\)/, 'Mock interview weak answers must update question progress to review')
assert.match(mockView, /reviewMarkedQuestionIds/, 'Mock interview must hide weak answers already queued for review')

console.log('question review queue guard passed')
