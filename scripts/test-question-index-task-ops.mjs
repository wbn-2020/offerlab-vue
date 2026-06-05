import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')
const adminQuestionsView = readFileSync(new URL('../src/views/AdminQuestionsView.vue', import.meta.url), 'utf8')

assert.match(opsApi, /export interface QuestionIndexTask/, 'ops API must expose the question index task type')
assert.match(opsApi, /rebuildQuestionIndexTask/, 'ops API must submit async question index rebuild tasks')
assert.match(opsApi, /getQuestionIndexTask/, 'ops API must fetch a question index task by id')
assert.match(opsApi, /listQuestionIndexTasks/, 'ops API must list recent question index tasks')
assert.match(opsApi, /retryQuestionIndexTask/, 'ops API must retry failed question index tasks')
assert.match(opsApi, /retryable\?:\s*boolean/, 'ops API must expose question index task retryability')

assert.match(view, /题库索引任务/, 'OpsView must render a dedicated question index task panel')
assert.match(view, /questionIndexTask = ref<QuestionIndexTask \| null>\(null\)/, 'OpsView must keep the active question index task')
assert.match(view, /recentQuestionIndexTasks = ref<QuestionIndexTask\[\]>\(\[\]\)/, 'OpsView must keep recent question index tasks')
assert.match(view, /isQuestionIndexTaskActive/, 'OpsView must track active question index rebuild state')
assert.match(view, /loadQuestionIndexTasks/, 'OpsView must load question index task history')
assert.match(view, /opsApi\.listQuestionIndexTasks\(10\)/, 'OpsView must call the question index task list API')
assert.match(view, /pollQuestionIndexTask/, 'OpsView must poll submitted question index tasks')
assert.match(view, /opsApi\.getQuestionIndexTask\(taskId\)/, 'OpsView polling must use the question index task detail API')
assert.match(view, /questionIndexTaskProgress/, 'OpsView must show question index task progress')
assert.match(view, /questionIndexTask\.indexed/, 'OpsView must show indexed count')
assert.match(view, /questionIndexTask\.failed/, 'OpsView must show failed count')
assert.match(view, /questionIndexTask\.total/, 'OpsView must show total count')
assert.match(view, /stopQuestionIndexPolling\(\)/, 'OpsView must stop question index polling on completion and unmount')

assert.match(adminQuestionsView, /题库索引任务/, 'AdminQuestionsView must render question index task status')
assert.match(adminQuestionsView, /questionIndexTasks = ref<QuestionIndexTask\[\]>\(\[\]\)/, 'AdminQuestionsView must keep question index task history')
assert.match(adminQuestionsView, /loadQuestionIndexTasks/, 'AdminQuestionsView must load question index tasks')
assert.match(adminQuestionsView, /opsApi\.listQuestionIndexTasks\(10\)/, 'AdminQuestionsView must call the question index task list API')
assert.match(adminQuestionsView, /submitQuestionIndexTask/, 'AdminQuestionsView must submit rebuild tasks')
assert.match(adminQuestionsView, /opsApi\.rebuildQuestionIndexTask\([^)]*\)/, 'AdminQuestionsView must call the rebuild task API')
assert.match(adminQuestionsView, /retryQuestionIndexTask/, 'AdminQuestionsView must expose retry action for failed tasks')
assert.match(adminQuestionsView, /opsApi\.retryQuestionIndexTask\(taskId[^)]*\)/, 'AdminQuestionsView retry must call the retry API')
assert.match(adminQuestionsView, /task\.message/, 'AdminQuestionsView must show failure reasons')

console.log('question index task ops guard passed')
