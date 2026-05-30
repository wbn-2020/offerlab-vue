import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const mePrep = readFileSync(new URL('../src/views/MePrepView.vue', import.meta.url), 'utf8')
const detail = readFileSync(new URL('../src/views/QuestionDetailView.vue', import.meta.url), 'utf8')

for (const field of ['nextReviewAt', 'lastReviewedAt', 'reviewCount', 'reviewIntervalDays']) {
  assert.match(api, new RegExp(`${field}[:?]`), `Question type must expose ${field}`)
}
assert.match(api, /nextReviewAt:\s*raw\?\.nextReviewAt \? adaptTime\(raw\.nextReviewAt\)/, 'Question adapter must parse nextReviewAt')
assert.match(api, /lastReviewedAt:\s*raw\?\.lastReviewedAt \? adaptTime\(raw\.lastReviewedAt\)/, 'Question adapter must parse lastReviewedAt')
assert.match(api, /reviewCount:\s*Number\(raw\?\.reviewCount \?\? 0\)/, 'Question adapter must normalize reviewCount')
assert.match(api, /reviewIntervalDays:\s*Number\(raw\?\.reviewIntervalDays \?\? 1\)/, 'Question adapter must normalize reviewIntervalDays')

assert.match(mePrep, /reviewScheduleText\(question\)/, 'MePrep today plan must show review schedule text')
assert.match(mePrep, /formatScheduleTime\(question\.lastReviewedAt\)/, 'MePrep weekly activity must show last review time')
assert.match(mePrep, /question\.nextReviewAt/, 'MePrep schedule helper must use nextReviewAt')
assert.match(mePrep, /question\.reviewCount/, 'MePrep schedule helper must use reviewCount')
assert.match(mePrep, new RegExp('\u5230\u671f\u590d\u4e60\u63d0\u9192'), 'MePrep must surface due review reminders near the top')
assert.match(mePrep, /overview\.reviewPlan\.todayQuestions\.slice\(0, 3\)/, 'Due review reminder must render due questions')
assert.match(mePrep, /:to="'\/questions\/' \+ question\.id"/, 'Due review items must deep-link to the question detail page')
assert.match(mePrep, /\/questions\?progressStatus=review&sort=latest/, 'Due review reminder must link to the review queue')

assert.match(detail, /hasReviewSchedule/, 'Question detail must conditionally render review schedule')
assert.match(detail, /下次复习/, 'Question detail schedule card must show next review')
assert.match(detail, /question\.reviewIntervalDays/, 'Question detail schedule card must show interval days')
assert.match(detail, /formatReviewDate/, 'Question detail must format review schedule date')

console.log('question review schedule guard passed')
