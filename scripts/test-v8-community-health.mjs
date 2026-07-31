import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)

const api = read('src/api/projectionHealth.ts')
const table = read('src/components/health/ProjectionHealthTable.vue')
const reconcile = read('src/components/health/ReconciliationRunPanel.vue')
const view = read('src/views/AdminChannelHealthView.vue')
const router = read('src/router/index.ts')

has(api, /\/api\/v1\/admin\/community-health\/projections/, 'projection health API must use the admin endpoint')
has(api, /projectionPath\(projectionType\).*\/issues/s, 'projection issue paths must encode the projection type')
has(api, /projectionPath\(projectionType\).*\/reconcile/s, 'projection reconcile paths must encode the projection type')
has(api, /requestResult/, 'projection health calls must preserve the Result contract')

for (const field of ['dryRun', 'limit', 'reason', 'idempotencyKey']) {
  has(api, new RegExp(`${field}:`), `reconciliation command must include ${field}`)
}
for (const field of ['processedCount', 'issueCount', 'changedCount', 'coverageComplete', 'replayed', 'requestFingerprint']) {
  has(api, new RegExp(`${field}:`), `reconciliation result must preserve ${field}`)
}

has(table, /data-projection-permission="loading"/, 'projection table must expose permission loading state')
has(table, /data-projection-permission="denied"/, 'projection table must hide diagnostics without permission')
has(table, /projectionHealthApi\.summary/, 'projection table must load server health summaries')
has(table, /projectionHealthApi\.issues/, 'projection table must load server issue details')
has(table, /issueHasMore/, 'projection issues must support keyset pagination')
has(table, /reconciliationSupported/, 'projection table must display server repair support')

has(reconcile, /v-model="form\.dryRun"/, 'reconciliation panel must expose a dry-run control')
has(reconcile, /form\.limit >= 1[\s\S]*form\.limit <= 100/, 'reconciliation panel must enforce the server batch limit')
has(reconcile, /form\.reason\.trim\(\)\.length/, 'reconciliation panel must require an auditable reason')
has(reconcile, /idempotencyKey/, 'reconciliation panel must carry an idempotency key')
has(reconcile, /projection\.reconciliationSupported/, 'reconciliation must follow the server capability flag')
has(reconcile, /projectionHealthApi\.reconcile/, 'reconciliation must use the dedicated server command')
has(reconcile, /current.*key|幂等键已保留/, 'failed batches must preserve their idempotency key for retry')
has(reconcile, /result\.replayed/, 'batch results must display idempotent replay')
has(reconcile, /result\.processedCount/, 'batch results must display processed count')
has(reconcile, /result\.changedCount/, 'batch results must display changed count')
has(reconcile, /result\.requestFingerprint/, 'batch results must display the audit fingerprint')
has(reconcile, /requestGeneration/, 'stale reconciliation responses must not overwrite a newly selected projection')
has(reconcile, /const generation = \+\+requestGeneration/, 'each reconciliation run must capture a fresh request generation')
has(reconcile, /generation !== requestGeneration \|\| props\.projection\?\.projectionType !== projectionType/, 'reconciliation responses must match both generation and projection type')
has(reconcile, /generation === requestGeneration && props\.projection\?\.projectionType === projectionType/, 'only the current projection request may clear running state')
has(reconcile, /props\.projection\?\.projectionType[\s\S]*prepareNewBatch\(\)/, 'switching projections must invalidate the previous reconciliation batch')
has(reconcile, /\['SUCCESS', 'COMPLETED', 'DRY_RUN', 'DRY_RUN_COMPLETED'\]\.includes\(value\)\) return 'status-ok'/, 'completed dry-runs must use the success result style')

has(view, /<ProjectionHealthTable/, 'admin channel health view must mount projection diagnostics')
has(view, /<ReconciliationRunPanel/, 'admin channel health view must mount reconciliation controls')
has(view, /opsApi\.myPermissions/, 'projection diagnostics must wait for the existing permission endpoint')
has(view, /projectionPermissions\.value\?\.ops/, 'OPS permission must be recognized for projection diagnostics')
has(view, /@reconciled="projectionRefreshKey \+= 1"/, 'successful batches must refresh projection health')

const routeStart = router.indexOf("path: '/admin/community-health'")
assert.notEqual(routeStart, -1, 'community health route must be registered')
const routeBlock = router.slice(routeStart, router.indexOf('\n  {', routeStart + 10))
has(routeBlock, /adminPermission:\s*\[[^\]]*'ops'/, 'OPS accounts must be allowed to enter projection diagnostics')

console.log('V8 community health guard passed.')
