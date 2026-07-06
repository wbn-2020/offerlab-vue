import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const opsApi = read('../src/api/ops.ts')
const opsView = read('../src/views/OpsView.vue')
const governanceView = read('../src/views/AdminGovernanceView.vue')
const packageJson = read('../package.json')

assert.match(
  opsApi,
  /const normalizePageItems\s*=\s*<T>\(raw:\s*unknown\):\s*T\[\]\s*=>[\s\S]*Array\.isArray\(raw\)[\s\S]*Array\.isArray\(source\.items\)[\s\S]*Array\.isArray\(source\.content\)[\s\S]*Array\.isArray\(source\.records\)[\s\S]*Array\.isArray\(source\.list\)/,
  'ops API must normalize paged list payloads from items, content, array, or empty data.',
)
assert.match(
  opsApi,
  /const normalizePageHasMore[\s\S]*raw\?\.hasMore[\s\S]*raw\?\.last[\s\S]*raw\?\.pages \?\? raw\?\.totalPages/,
  'ops API must preserve hasMore semantics from cursor, Spring content, and records page contracts.',
)
assert.match(
  opsApi,
  /total:\s*finiteNumber\(raw\?\.total \?\? raw\?\.totalElements \?\? raw\?\.totalCount \?\? raw\?\.count\) \?\? items\.length/,
  'ops API must preserve total metadata from common backend page contracts.',
)

for (const pageMethod of ['pageOutbox', 'pageSearchIndexRetryTasks', 'pageNotificationRetryTasks']) {
  assert.match(
    opsApi,
    new RegExp(`${pageMethod}:[\\s\\S]*normalizePage(?:<[^>]+>)?\\(res\\.data\\)`),
    `${pageMethod} must normalize backend page payloads before exposing items.`,
  )
}

assert.match(
  opsView,
  /const safeOpsItems\s*=\s*<T,>\(items:\s*T\[\]\):\s*T\[\]\s*=>\s*Array\.isArray\(items\)\s*\?\s*items\s*:\s*\[\]/,
  'OpsView must keep a pageItems guard so unexpected non-array state cannot reach slice.',
)
assert.match(
  opsView,
  /const pageItems[\s\S]*const safeItems = safeOpsItems\(items\)[\s\S]*safeItems\.slice\(start, start \+ OPS_PAGE_SIZE\)/,
  'OpsView pageItems must slice only normalized arrays.',
)

assert.match(
  opsApi,
  /const normalizeReviewQueueItems\s*=\s*\(raw:\s*unknown\):\s*ReviewQueueItem\[\]\s*=>[\s\S]*normalizePageItems<ReviewQueueItem>\(raw\)/,
  'review queue API must normalize array, paged, and empty payloads at the API boundary.',
)
assert.match(
  opsApi,
  /listReviewQueue:[\s\S]*const res = await client\.get\('\/api\/v1\/admin\/review-queue'[\s\S]*return \{ \.\.\.res, data: normalizeReviewQueueItems\(res\.data\) \}/,
  'listReviewQueue must return a normalized ReviewQueueItem array.',
)
assert.match(
  governanceView,
  /const safeBackendReviewQueueItems\s*=\s*computed<BackendReviewQueueItem\[\]>\(\(\) => Array\.isArray\(backendReviewQueueItems\.value\) \? backendReviewQueueItems\.value : \[\]\)/,
  'AdminGovernanceView must guard backendReviewQueueItems before mapping.',
)
assert.match(
  governanceView,
  /backendReviewQueueViewItems[\s\S]*safeBackendReviewQueueItems\.value[\s\S]*\.map\(toReviewQueueItem\)/,
  'backendReviewQueueViewItems must map only normalized backend queue arrays.',
)
assert.match(
  governanceView,
  /backendReviewQueueItems\.value\s*=\s*Array\.isArray\(res\.data\) \? res\.data : \[\]/,
  'loadBackendReviewQueue must keep a page-level array fallback for unexpected API contracts.',
)

assert.match(packageJson, /"test:admin-data-contracts":\s*"node scripts\/test-admin-data-contracts\.mjs"/, 'package scripts must expose admin data contract guard.')
assert.match(packageJson, /npm run test:admin-data-contracts/, 'test:guards must include the admin data contract guard.')

console.log('admin data contract guards passed')
