import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const projectionApi = read('src/api/projectionHealth.ts')
const projectionTable = read('src/components/health/ProjectionHealthTable.vue')
const loadIssues = projectionTable.slice(
  projectionTable.indexOf('const loadIssues = async'),
  projectionTable.indexOf('const postContextPath'),
)

assert.match(
  projectionApi,
  /export interface ProjectionIssueRequestOptions \{[\s\S]*signal\?: AbortSignal[\s\S]*\}/,
  'projection issue requests must expose AbortSignal support',
)
assert.match(
  projectionApi,
  /issues:\s*\([\s\S]*options: ProjectionIssueRequestOptions = \{\}[\s\S]*signal: options\.signal/,
  'projection issue requests must pass the signal to Axios',
)

assert.match(projectionTable, /有界诊断样本/, 'the UI must describe issue pages as bounded diagnostic samples')
assert.match(
  projectionTable,
  /:key="`\$\{issue\.projectionType\}:\$\{issue\.issueType\}:\$\{String\(issue\.issueId\)\}`"/,
  'projection issue DOM keys must include projection type, issue type, and issue id',
)
assert.match(
  projectionTable,
  /issue\.subjectType === 'POST' && \/\^\[1-9\]\\d\*\$\/\.test\(issue\.subjectId\)/,
  'only POST subjects with positive integer string ids may be linked',
)
assert.match(
  projectionTable,
  /`\/post\/\$\{issue\.subjectId\}#trusted-content`/,
  'POST issue links must target the trusted-content anchor',
)
assert.doesNotMatch(
  projectionTable,
  /(?:Number|parseInt|parseFloat)\(\s*issue\.subjectId/,
  'subject ids must not be converted to JavaScript numbers',
)
assert.match(
  projectionTable,
  /<span v-else class="issue-read-only">只读诊断<\/span>/,
  'unsupported subjects must remain read-only',
)

assert.match(
  projectionTable,
  /const issueInitialError = ref\(''\)[\s\S]*const issueAppendError = ref\(''\)/,
  'initial and append issue errors must use separate state',
)
assert.match(
  projectionTable,
  /interface IssueRequestSnapshot \{[\s\S]*projectionType: string[\s\S]*requestId: number[\s\S]*cursor: string \| null[\s\S]*controller: AbortController/,
  'issue requests must snapshot projection type, request id, cursor, and controller',
)
assert.match(
  projectionTable,
  /snapshot\.requestId === issueRequest[\s\S]*snapshot\.projectionType === selectedType\.value[\s\S]*snapshot\.controller === issueController/,
  'request ownership must reject stale request ids and projection types',
)
assert.match(
  projectionTable,
  /snapshot\.cursor === \(snapshot\.append \? nextCursor\.value : null\)/,
  'request ownership must reject stale cursor responses',
)
assert.match(loadIssues, /const controller = new AbortController\(\)/)
assert.match(loadIssues, /signal: controller\.signal/)
assert.match(loadIssues, /if \(!issueRequestIsCurrent\(snapshot\)\) return/)
assert.match(projectionTable, /issueController\?\.abort\(\)/, 'stale issue requests must be aborted')
assert.match(
  projectionTable,
  /candidate\?\.name === 'AbortError'[\s\S]*candidate\?\.name === 'CanceledError'[\s\S]*candidate\?\.code === 'ERR_CANCELED'/,
  'Axios and platform cancellation must be recognized silently',
)
assert.match(
  loadIssues,
  /const merged = [\s\S]*issues\.value = merged\.items/,
  'successful append requests must preserve existing issues through a merge step',
)
assert.match(
  loadIssues,
  /if \(append\) \{\s*issueAppendError\.value = message\s*\} else \{[\s\S]*issues\.value = \[\]/,
  'append failures must only set append error state while initial failures may clear the list',
)
assert.match(
  projectionTable,
  /issueAppendError[\s\S]*\{\{ issueAppendError \}\}[\s\S]*@click="loadIssues\(true\)">重试追加/,
  'append failures must remain visible and provide an append retry',
)
assert.match(
  projectionTable,
  /const resetIssueState = \(\) => \{[\s\S]*cancelIssueRequest\(\)[\s\S]*issueInitialError\.value = ''[\s\S]*issueAppendError\.value = ''/,
  'projection changes and permission invalidation must clear issue request state',
)

console.log('V13 knowledge health frontend guard passed.')
