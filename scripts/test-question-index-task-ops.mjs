import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')

assert.match(opsApi, /export interface QuestionIndexTask/, 'ops API must expose the question index task type')
assert.match(opsApi, /rebuildQuestionIndexTask/, 'ops API must submit async question index rebuild tasks')
assert.match(opsApi, /getQuestionIndexTask/, 'ops API must fetch a question index task by id')
assert.match(opsApi, /listQuestionIndexTasks/, 'ops API must list recent question index tasks')

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

console.log('question index task ops guard passed')
