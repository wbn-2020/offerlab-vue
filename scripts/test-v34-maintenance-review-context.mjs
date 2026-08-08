import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const packageJson = JSON.parse(read('package.json'))
const api = read('src/api/contentMaintenance.ts')
const panel = read('src/components/maintenance/MaintenanceTaskReviewContextPanel.vue')
const mineView = read('src/views/MaintenanceTasksView.vue')
const queueView = read('src/views/AdminMaintenanceTasksView.vue')

expect(
  packageJson.scripts['test:v34-maintenance-review-context'] === 'node scripts/test-v34-maintenance-review-context.mjs',
  'V34 maintenance review-context guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes('test:v34-maintenance-review-context'),
  'V34 maintenance review-context guard must run before the full guard suite.',
)

for (const token of [
  'ContentMaintenanceRevisionEvidenceState',
  'NON_POST_DELIVERY',
  'ContentMaintenanceTaskReviewContext',
  'adaptContentMaintenanceTaskReviewContext',
  'reviewContext:',
  '/review-context',
  'signal: options.signal',
  'skipAuthRedirect: options.skipAuthRedirect',
]) {
  expect(api.includes(token), `V34 API contract is missing ${token}.`)
}

expect(api.includes("state: 'EVIDENCE_UNAVAILABLE'"),
  'V34 API must fail closed to EVIDENCE_UNAVAILABLE.')
expect(api.includes('if (!Array.isArray(raw) || raw.length > 3)'),
  'V34 API must reject non-array or overlong updates.')
expect(api.includes("if (!value || !isReviewEvidenceState(state) || !summary || updates.invalid)"),
  'V34 API must reject unknown evidence states and malformed evidence.')
expect(api.includes('isSafeContentMaintenancePostHref'),
  'V34 API must inspect post hrefs through the V34 safe-link adapter.')
expect(api.includes("return /^\\/post\\/[1-9]\\d*$/.test(href)"),
  'V34 API must only trust /post/<positive-integer> hrefs.')
expect(api.includes('postType: number | null') && api.includes('const postType = safePositiveInteger(value.postType)'),
  'V34 API must adapt LinkedPublicPostDTO.postType as a positive integer.')
expect(api.includes("return /^[1-9]\\d*$/.test(idValue) ? idValue : null"),
  'V34 API must reject malformed string identifiers.')
expect(api.includes('const domain = safeDomain(value.domain)'),
  'V34 API must restrict linked-post domains to the supported range.')
expect(api.includes('if (rawHref != null && !postHref)'),
  'V34 API must fail closed for unsafe public post hrefs.')
expect(api.includes('source.invalid') && api.includes('delivery.invalid') && api.includes('evidence.invalid'),
  'V34 API must fail closed when any review-context block is invalid.')

for (const forbidden of [
  'readerUid',
  'distinctReaderCount',
  'editorUid',
  'revisionToken',
  '正文',
  '自动通过',
  '质量认证',
]) {
  expect(!api.includes(forbidden), `V34 API must not expose or describe ${forbidden}.`)
  expect(!panel.includes(forbidden), `V34 panel must not expose or describe ${forbidden}.`)
}

expect(panel.includes('首次展开') === false,
  'V34 panel should express on-demand behavior through the toggle and load implementation, not user-facing instructions.')
expect(panel.includes('if (!context.value) void load()'),
  'V34 panel must load review context only after first expansion.')
expect(panel.includes('new AbortController()') && panel.includes('controller?.abort()'),
  'V34 panel must cancel superseded review-context requests.')
expect(panel.includes('requestId === requestId') && panel.includes('accountGeneration === accountGeneration'),
  'V34 panel must reject stale requests from prior task or account state.')
expect(panel.includes('复核依据暂不可读取') && panel.includes('@click="load"'),
  'V34 panel must render an unavailable state with retry.')
expect(panel.includes('已提交非帖子交付，当前无帖子修订依据'),
  'V34 panel must render NON_POST_DELIVERY with neutral factual copy.')
expect(panel.includes('isSafeContentMaintenancePostHref(post.postHref)'),
  'V34 panel must re-check public post hrefs before rendering links.')

for (const [source, label] of [[mineView, 'personal maintenance view'], [queueView, 'governance maintenance view']]) {
  expect(source.includes('MaintenanceTaskReviewContextPanel'),
    `${label} must reuse the V34 review-context panel.`)
  expect(source.includes(':context-key='),
    `${label} must refresh review context when task state changes.`)
}

for (const [source, label] of [[mineView, 'personal maintenance view'], [queueView, 'governance maintenance view']]) {
  expect(source.includes('contentMaintenanceApi.claim(task.id)') || label === 'governance maintenance view',
    `${label} must preserve existing claim behavior where applicable.`)
}
expect(mineView.includes('contentMaintenanceApi.submit(task.id'),
  'Personal maintenance view must preserve submit behavior.')
expect(queueView.includes('contentMaintenanceApi.review(task.id'),
  'Governance maintenance view must preserve review behavior.')
expect(queueView.includes('contentMaintenanceApi.reassign(task.id'),
  'Governance maintenance view must preserve reassign behavior.')
expect(queueView.includes('contentMaintenanceApi.close(task.id'),
  'Governance maintenance view must preserve close behavior.')

console.log('V34 maintenance review-context guard passed.')
