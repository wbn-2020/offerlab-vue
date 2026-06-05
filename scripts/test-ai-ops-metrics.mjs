import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const opsView = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')

for (const field of [
  'provider',
  'fallbackUsed',
  'durationMs',
  'promptTokens',
  'completionTokens',
  'totalTokens',
  'estimatedCostMicros',
  'errorCode',
]) {
  assert.match(opsApi, new RegExp(`${field}\\??:`), `AiExtractTask must expose ${field}`)
}

assert.match(opsApi, /export interface AiTaskMetrics/, 'ops API must expose AI task metrics type')
assert.match(opsApi, /providerStats:\s*AiTaskMetricBucket\[\]/, 'AI task metrics must include provider buckets')
assert.match(opsApi, /errorStats:\s*AiTaskMetricBucket\[\]/, 'AI task metrics must include error buckets')
assert.match(opsApi, /p95DurationMs:\s*number/, 'AI task metrics must include P95 duration')
assert.match(opsApi, /fallbackRate:\s*number/, 'AI task metrics must include fallback rate')
assert.match(opsApi, /getAiTaskMetrics/, 'ops API must expose AI task metrics request')
assert.match(opsApi, /\/api\/v1\/admin\/ai-tasks\/metrics/, 'AI metrics request must use the admin metrics endpoint')

assert.match(opsView, /aiTaskMetrics = ref<AiTaskMetrics \| null>\(null\)/, 'OpsView must keep AI task metrics state')
assert.match(opsView, /isAiTaskMetricsLoading = ref\(false\)/, 'OpsView must track AI metrics loading state')
assert.match(opsView, /loadAiTaskMetrics/, 'OpsView must load AI metrics')
assert.match(opsView, /opsApi\.getAiTaskMetrics\(100\)/, 'OpsView must call AI metrics API with bounded history')
assert.match(opsView, /loadAiOps/, 'OpsView must refresh AI task list and metrics together')
assert.match(opsView, /if \(canQuestion\.value\) loaders\.push\(loadAiOps\(\), loadQuestionIndexTasks\(\)\)/, 'refreshAll must load AI metrics for question operators')

assert.match(opsView, /Provider/, 'OpsView must render provider summary')
assert.match(opsView, /Fallback/, 'OpsView must render fallback summary')
assert.match(opsView, /P95 耗时/, 'OpsView must render P95 latency')
assert.match(opsView, /估算成本/, 'OpsView must render estimated cost')
assert.match(opsView, /formatTokens\(aiTaskMetrics\?\.totalTokens\)/, 'OpsView must render token totals')
assert.match(opsView, /aiTaskMetrics\.providerStats/, 'OpsView must render provider bucket rows')
assert.match(opsView, /selectedAiTaskDetail\.task\.errorCode/, 'AI task detail must show error code')
assert.match(opsView, /selectedAiTaskDetail\.task\.estimatedCostMicros/, 'AI task detail must show estimated cost')
assert.match(opsView, /aiProviderText\(item\.provider\)/, 'AI task rows must show provider')
assert.match(opsView, /aiFallbackText\(item\.fallbackUsed\)/, 'AI task rows must show fallback state')
assert.match(opsView, /\.ai-metrics-grid/, 'AI metrics grid must have dedicated responsive styling')

console.log('ai ops metrics guard passed')
