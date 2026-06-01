import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const opsApi = readFileSync(new URL('../src/api/ops.ts', import.meta.url), 'utf8')
const view = readFileSync(new URL('../src/views/OpsView.vue', import.meta.url), 'utf8')

assert.match(opsApi, /export interface SearchIndexRetryStatus/, 'ops API must expose search index retry status')
assert.match(opsApi, /searchIndexRetry:\s*SearchIndexRetryStatus/, 'ops status must carry search index retry summary')
assert.match(opsApi, /export interface SearchIndexRetryTask/, 'ops API must expose search index retry task type')
assert.match(opsApi, /listSearchIndexRetryTasks/, 'ops API must list search index retry tasks')
assert.match(opsApi, /getSearchIndexRetryTask/, 'ops API must fetch a search index retry task by id')
assert.match(opsApi, /replaySearchIndexRetryTask/, 'ops API must replay a single search index retry task')
assert.match(opsApi, /replaySearchIndexRetryTasks/, 'ops API must replay a batch of search index retry tasks')

assert.match(view, /搜索索引补偿任务/, 'OpsView must render a dedicated search index retry panel')
assert.match(view, /searchIndexRetryTasks = ref<SearchIndexRetryTask\[\]>\(\[\]\)/, 'OpsView must keep search index retry history')
assert.match(view, /isSearchIndexRetryTasksLoading/, 'OpsView must track search index retry loading state')
assert.match(view, /loadSearchIndexRetryTasks/, 'OpsView must load search index retry tasks')
assert.match(view, /opsApi\.listSearchIndexRetryTasks\(\{ limit: 20 \}\)/, 'OpsView must call the search index retry list API')
assert.match(view, /replaySearchIndexRetryTask\(item\)/, 'OpsView must expose a retry button for failed tasks')
assert.match(view, /opsApi\.replaySearchIndexRetryTask\(task\.id\)/, 'OpsView retry must call the replay API')
assert.match(view, /searchIndexRetryTaskClass/, 'OpsView must map retry task status to styles')
assert.match(view, /searchIndexRetryTaskText/, 'OpsView must display retry task status text')
assert.match(view, /status\?\.searchIndexRetry\.byStatus\.failed/, 'OpsView must surface failed retry counts')
assert.match(view, /status\?\.searchIndexRetry\.duePending/, 'OpsView must surface due retry counts')

console.log('search index retry ops guard passed')
