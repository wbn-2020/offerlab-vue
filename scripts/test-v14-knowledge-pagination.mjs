import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = relativePath => readFileSync(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8',
)

const packageJson = JSON.parse(read('package.json'))
const projectionApi = read('src/api/projectionHealth.ts')
const projectionTable = read('src/components/health/ProjectionHealthTable.vue')
const loadIssues = projectionTable.slice(
  projectionTable.indexOf('const loadIssues = async'),
  projectionTable.indexOf('const postContextPath'),
)

assert.equal(
  packageJson.scripts['test:v14-knowledge-pagination'],
  'node scripts/test-v14-knowledge-pagination.mjs',
  'V14 pagination guard must have a stable npm script',
)
assert.match(
  packageJson.scripts['test:v14'],
  /npm run test:v14-knowledge-pagination/,
  'test:v14 must run the pagination guard',
)
assert.match(
  packageJson.scripts['pretest:guards'],
  /npm run test:v14(?:\s|$)/,
  'V14 guards must be part of the pretest:guards chain',
)
assert.match(
  packageJson.scripts.verify,
  /npm run test:guards/,
  'verify must keep the complete guard chain before build',
)

assert.match(
  projectionApi,
  /nextCursor: string \| null/,
  'projection issue pages must expose an opaque string cursor',
)
assert.match(
  projectionApi,
  /cursor\?: string \| number/,
  'legacy numeric cursors may remain accepted at the API boundary',
)
assert.match(
  projectionApi,
  /params: query/,
  'issue query must be passed through unchanged',
)
assert.match(
  projectionTable,
  /const responseCursor = page\?\.nextCursor \? String\(page\.nextCursor\) : null/,
  'the response cursor must be normalized to a string without parsing its content',
)
assert.doesNotMatch(
  loadIssues,
  /(?:Number|parseInt|parseFloat)\(\s*(?:cursorSnapshot|responseCursor|nextCursor|page\?\.nextCursor)/,
  'opaque composite cursors must never be converted to numbers',
)
assert.doesNotMatch(
  projectionApi,
  /(?:Number|parseInt|parseFloat)\(\s*(?:query\.cursor|cursor)/,
  'the API helper must not convert opaque cursors before sending them',
)
assert.match(
  loadIssues,
  /cursor: append \? cursorSnapshot \|\| 0 : 0/,
  'initial and append requests must send the captured cursor',
)

assert.match(
  projectionTable,
  /const issueIdentity = \(issue: ProjectionIssue\) => \([\s\S]*issue\.projectionType[\s\S]*issue\.issueType[\s\S]*String\(issue\.issueId\)/,
  'issue identity must include projection, issue type, and issue id',
)
assert.match(
  loadIssues,
  /const merged = mergeIssuePage\(incoming, append\)[\s\S]*issues\.value = merged\.items/,
  'successful pages must merge through the deduplication helper',
)
assert.match(
  projectionTable,
  /if \(seen\.has\(identity\)\) continue/,
  'duplicate issue identities must be omitted during append',
)

assert.match(
  projectionTable,
  /const consumedIssueCursors = new Set<string>\(\)/,
  'the component must remember consumed cursors',
)
assert.match(
  loadIssues,
  /if \(append && consumedIssueCursors\.has\(requestCursorKey\)\)/,
  'reusing a consumed cursor must stop pagination',
)
assert.match(
  loadIssues,
  /const cursorRepeated = Boolean\([\s\S]*consumedIssueCursors\.has\(responseCursor\)/,
  'a repeated response cursor must stop pagination',
)
assert.match(
  loadIssues,
  /const paginationStalled = pageHasMore && \([\s\S]*!responseCursor[\s\S]*cursorRepeated[\s\S]*merged\.addedCount === 0/,
  'missing cursor, cursor repetition, and no-new-item pages must be treated as stalled',
)
assert.match(
  loadIssues,
  /if \(paginationStalled\) \{[\s\S]*nextCursor\.value = null[\s\S]*issueHasMore\.value = false[\s\S]*issueAppendError\.value/,
  'stalled pagination must stop and expose a retryable diagnostic',
)
assert.match(
  loadIssues,
  /issueHasMore\.value = Boolean\(pageHasMore && responseCursor\)/,
  'hasMore must never remain true without a next cursor',
)
assert.match(
  projectionTable,
  /const issuePaginationStalled = ref\(false\)/,
  'pagination stalls must use state separate from transport failures',
)
assert.match(
  projectionTable,
  /v-if="issuePaginationStalled"[\s\S]*@click="loadIssues\(false\)"[\s\S]*刷新问题列表[\s\S]*v-else[\s\S]*@click="loadIssues\(true\)">重试追加/,
  'stalled pagination must restart from the first page while transport failures retry the captured cursor',
)

assert.match(
  projectionTable,
  /page\?\.degraded[\s\S]*部分问题来源暂时不可用/,
  'source degradation must be visible to operators',
)
assert.match(
  projectionTable,
  /page\.diagnostics\?\.sourceErrors[\s\S]*Object\.entries\(sourceErrors\)/,
  'source degradation should retain an explainable source error summary',
)
assert.match(
  projectionTable,
  /issueAppendError[\s\S]*\{\{ issueAppendError \}\}[\s\S]*@click="loadIssues\(true\)">重试追加/,
  'append failures must remain visible and provide retry',
)
assert.match(
  projectionTable,
  /issueInitialError && issues\.length === 0[\s\S]*@click="loadIssues\(false\)">重试/,
  'initial failures must have an independent retry state',
)

assert.match(
  projectionTable,
  /interface IssueRequestSnapshot \{[\s\S]*projectionType: string[\s\S]*requestId: number[\s\S]*cursor: string \| null[\s\S]*append: boolean[\s\S]*controller: AbortController/,
  'requests must snapshot projection, request id, cursor, append mode, and controller',
)
assert.match(
  projectionTable,
  /snapshot\.requestId === issueRequest[\s\S]*snapshot\.projectionType === selectedType\.value[\s\S]*snapshot\.controller === issueController/,
  'stale projection requests must not update state',
)
assert.match(
  projectionTable,
  /snapshot\.cursor === \(snapshot\.append \? nextCursor\.value : null\)/,
  'stale cursor responses must not update state',
)
assert.match(
  loadIssues,
  /issueController\?\.abort\(\)[\s\S]*const controller = new AbortController\(\)[\s\S]*signal: controller\.signal/,
  'new issue requests must abort and bind the previous request to its signal',
)
assert.match(
  loadIssues,
  /isCanceledRequest\(error, controller\.signal\)/,
  'canceled requests must be ignored rather than shown as errors',
)

console.log('V14 knowledge lifecycle pagination guard passed.')
