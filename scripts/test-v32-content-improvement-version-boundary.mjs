import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => {
  if (!value) throw new Error(message)
}

const packageJson = JSON.parse(read('package.json'))
const creatorApi = read('src/api/creatorFeedback.ts')
const creatorTypes = read('src/api/types.ts')
const profile = read('src/views/MeProfileView.vue')
const channelHealthApi = read('src/api/channelHealth.ts')
const channelHealthView = read('src/views/AdminChannelHealthView.vue')
const router = read('src/router/index.ts')
const improvementStart = profile.indexOf('data-content-improvement-source="server-aggregate-only"')
const improvementEnd = profile.indexOf('<div class="mt-5 grid gap-3 sm:grid-cols-5">', improvementStart)
const improvementSection = improvementStart >= 0 && improvementEnd > improvementStart
  ? profile.slice(improvementStart, improvementEnd)
  : ''

expect(packageJson.scripts['test:v32-content-improvement-version-boundary'],
  'V32 content-improvement version-boundary guard must have a package script.')
expect(packageJson.scripts['pretest:guards'].includes('test:v32-content-improvement-version-boundary'),
  'V32 version-boundary guard must run before the full guard suite.')

expect(creatorTypes.includes("'UPDATED_AWAITING_ANONYMOUS_FEEDBACK'"),
  'V32 must model the updated-awaiting-anonymous-feedback state.')
expect(creatorApi.includes('safeCreatorContentImprovementEditorHref'),
  'V32 must validate creator workbench edit links independently.')
expect(creatorApi.includes('safeCreatorContentImprovementPostHref'),
  'V32 must validate the matching public post link independently.')
expect(creatorApi.includes('`/editor/${postId}?source=${CREATOR_WORKBENCH_EDITOR_SOURCE}`'),
  'V32 edit links must use the /editor/{postId}?source=creator_workbench contract.')
expect(!creatorApi.includes('editPostId'),
  'V32 must reject the legacy editor query route.')
expect(creatorApi.includes("items.some((item) => item == null)"),
  'V32 must degrade the full block when any server item is invalid.')
expect(creatorApi.includes('content_improvement_contract_invalid'),
  'V32 invalid contracts must be surfaced as unavailable, not an empty result.')
expect(creatorApi.includes('getContentImprovementSignals: async (cursor?: string)'),
  'V32 must support cursor-based retrieval.')

expect(improvementSection.includes('loadMoreContentImprovementSignals'),
  'V32 creator workbench must expose a guarded load-more action.')
expect(improvementSection.includes('contentImprovementSignalsLoadingMore'),
  'V32 creator workbench must prevent overlapping page requests.')
expect(improvementSection.includes('UPDATED_AWAITING_ANONYMOUS_FEEDBACK'),
  'V32 creator workbench must render the new state explicitly.')
expect(improvementSection.includes('查看当前版本'),
  'V32 updated content must use neutral current-version copy.')
expect(improvementSection.includes('is-awaiting-feedback'),
  'V32 updated content must use a neutral presentation state.')
for (const forbidden of ['distinctReaderCount', 'readerUid', 'feedbackReason', 'reasonCode', 'revisionToken', 'effectiveRevisionAt']) {
  expect(!improvementSection.includes(forbidden),
    `V32 creator UI must not disclose ${forbidden}.`)
}

expect(channelHealthApi.includes("'DEGRADED'"),
  'V32 channel health must preserve a degraded aggregate state.')
expect(channelHealthView.includes('匿名质量信号暂不可用'),
  'V32 channel health must label unavailable quality signals instead of rendering zero.')
expect(!channelHealthView.includes("item.qualitySignalAvailable ? (item.qualityReviewPostCount ?? 0) : '0'"),
  'V32 channel health must not coerce unavailable quality signals to zero.')

const healthRoute = router.match(/path: '\/admin\/community-health',[\s\S]*?adminPermission: \[([^\]]+)\]/)
expect(healthRoute && !healthRoute[1].includes("'ops'"),
  'V32 channel-health route must not grant ops-only access when the API does not.')

console.log('V32 content improvement version-boundary guard passed.')
