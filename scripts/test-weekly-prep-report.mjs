import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const questionApi = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const mePrep = readFileSync(new URL('../src/views/MePrepView.vue', import.meta.url), 'utf8')
const exportUtil = readFileSync(new URL('../src/utils/prepPackExport.ts', import.meta.url), 'utf8')

assert.match(questionApi, /interface UserWeeklyPrepReport/, 'question API must type weekly prep report')
for (const field of [
  'touchedQuestionCount',
  'masteredQuestionCount',
  'reviewQuestionCount',
  'answerDraftCount',
  'mockSessionCount',
  'mockCompletedCount',
  'mockAverageScorePercent',
  'nextActions',
]) {
  assert.match(questionApi, new RegExp(field), `weekly report must expose ${field}`)
}
assert.match(questionApi, /myWeeklyPrepReport/, 'question API must call weekly report endpoint')
assert.match(questionApi, /\/api\/v1\/me\/prep\/weekly-report/, 'weekly report endpoint path must be stable')
assert.match(questionApi, /adaptUserWeeklyPrepReport/, 'weekly report must be adapted from backend response')

assert.match(exportUtil, /buildWeeklyPrepReportMarkdown/, 'export util must build weekly review markdown')
assert.match(exportUtil, /# OfferLab 本周学习复盘/, 'weekly markdown must have a clear title')
assert.match(exportUtil, /## 下周动作/, 'weekly markdown must include next actions')
assert.match(exportUtil, /mistakeReasonText/, 'weekly markdown must render mistake reasons as user-facing text')
assert.match(exportUtil, /knowledgeReviewCopy/, 'weekly markdown must normalize legacy practice wording into knowledge-review wording')
assert.match(exportUtil, /专项练习\/g,\s*'知识复盘'/, 'weekly markdown must not leak legacy focused-practice wording')

assert.match(mePrep, /me-prep-weekly-report/, 'prep desk must query weekly report data')
assert.match(mePrep, /复制周复盘/, 'prep desk must expose copy weekly report action')
assert.match(mePrep, /本周复盘/, 'prep desk must render the weekly review panel')
assert.match(mePrep, /buildWeeklyPrepReportMarkdown\(weeklyReport\.value\)/, 'copy action must use markdown builder')
assert.match(mePrep, /weeklyNextActions = computed/, 'weekly panel must derive normalized next actions')
assert.match(mePrep, /map\(knowledgeReviewCopy\)/, 'weekly panel must hide legacy practice wording from backend suggestions')

console.log('weekly prep report guard passed')
