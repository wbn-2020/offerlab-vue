import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const api = readFileSync(new URL('../src/api/question.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/CompanyPrepView.vue', import.meta.url), 'utf8')
const exporter = readFileSync(new URL('../src/utils/prepPackExport.ts', import.meta.url), 'utf8')

assert.match(api, /recommendedQuestions:\s*Question\[\]/, 'CompanyPrep type must expose personalized recommended questions')
assert.match(api, /raw\?\.recommendedQuestions[\s\S]*map\(adaptQuestion\)/, 'CompanyPrep adapter must map recommended questions')

assert.match(view, /优先学习这些/, 'CompanyPrepView must render a personal recommendation section')
assert.match(view, /authStore\.isLoggedIn/, 'CompanyPrepView must show personal recommendations only for logged-in users')
assert.match(view, /prep\.recommendedQuestions/, 'CompanyPrepView must render recommended questions from the API')
assert.match(view, /结合你的掌握状态/, 'CompanyPrepView must explain the recommendation basis')
assert.match(view, /排除已掌握内容/, 'CompanyPrepView must make the mastered-question exclusion visible')
assert.match(view, /暂无待推荐知识卡/, 'CompanyPrepView must include an empty state for fully learned topics')

assert.match(exporter, /data\.recommendedQuestions\.length/, 'Company prep Markdown export must include recommendations only when present')
assert.match(exporter, /## 优先学习这些/, 'Company prep Markdown export must include a personal recommendation section')
assert.match(exporter, /appendQuestionList\(lines, data\.recommendedQuestions\)/, 'Company prep Markdown export must list recommended questions')

console.log('company prep personalized recommendations guard passed')
