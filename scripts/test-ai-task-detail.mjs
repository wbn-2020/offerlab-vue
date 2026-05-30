import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')

assert.match(opsApi, /export interface AiExtractTaskDetail/, 'ops API must expose AI task detail type')
assert.match(opsApi, /sourcePostTitle\?: string/, 'AI task detail must carry source post title')
assert.match(opsApi, /sourcePostSummary\?: string/, 'AI task detail must carry source post summary')
assert.match(opsApi, /retryRecords: AiExtractTask\[\]/, 'AI task detail must carry retry records')
assert.match(opsApi, /getAiTaskDetail/, 'ops API must fetch AI task detail')
assert.match(opsApi, /\/api\/v1\/admin\/ai-tasks\/\$\{id\}/, 'AI task detail endpoint must use the task id path')

assert.match(view, /selectedAiTaskDetail = ref<AiExtractTaskDetail \| null>\(null\)/, 'OpsView must keep selected AI task detail')
assert.match(view, /openAiTaskDetail/, 'OpsView must open AI task detail')
assert.match(view, /opsApi\.getAiTaskDetail\(task\.id\)/, 'OpsView must call the detail API')
assert.match(view, /提题任务详情/, 'OpsView must render an AI task detail dialog')
assert.match(view, /sourcePostTitle/, 'detail dialog must show source post title')
assert.match(view, /sourcePostSummary/, 'detail dialog must show source post summary')
assert.match(view, /retryRecords/, 'detail dialog must show retry records')
assert.match(view, /role="dialog" aria-modal="true" aria-labelledby="ai-task-detail-title"/, 'AI task detail must expose dialog semantics')
assert.match(view, /useAccessibleDialog\(\(\) => Boolean\(selectedAiTaskDetail\.value\)/, 'AI task detail must support Escape/focus behavior')

console.log('ai task detail guard passed')
