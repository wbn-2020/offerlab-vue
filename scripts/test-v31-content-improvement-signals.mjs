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
const improvementStart = profile.indexOf('data-content-improvement-source="server-aggregate-only"')
const improvementEnd = profile.indexOf('<div class="mt-5 grid gap-3 sm:grid-cols-5">', improvementStart)
const improvementSection = improvementStart >= 0 && improvementEnd > improvementStart
  ? profile.slice(improvementStart, improvementEnd)
  : ''

expect(packageJson.scripts['test:v31-content-improvement-signals'],
  'V31 content-improvement signals must have a package script.')
expect(packageJson.scripts['pretest:guards'].includes('test:v31-content-improvement-signals'),
  'V31 content-improvement signals must run before the full guard suite.')

for (const token of [
  'CreatorContentImprovementSignal',
  'CreatorContentImprovementSignals',
  'getContentImprovementSignals',
  '/api/v1/creator-growth/content-improvement-signals',
  'safeCreatorContentImprovementPostHref(value?.postHref, postId)',
  'safeCreatorContentImprovementEditorHref(value?.editHref, postId)',
  'safeSameSitePath(value?.workspaceHref)',
]) {
  expect(creatorApi.includes(token), `V31 creator API adapter is missing ${token}.`)
}
expect(creatorTypes.includes("'MAINTENANCE_EXISTS'"),
  'V31 must model the server-provided existing-maintenance state.')
expect(creatorApi.includes("workspaceHref !== '/me/maintenance'"),
  'V31 must accept only the known safe maintenance workspace route.')
expect(!creatorTypes.includes('distinctReaderCount'),
  'V31 creator types must not expose reader counts.')
expect(!creatorTypes.includes('readerUid') && !creatorTypes.includes('feedbackReason'),
  'V31 creator types must not expose reader identity or feedback reasons.')

expect(improvementSection.includes('content-improvement-workbench-title'),
  'V31 must be placed inside the existing creator workbench.')
expect(improvementSection.includes('server-aggregate-only'),
  'V31 must explicitly document its server aggregate boundary in the view.')
expect(improvementSection.includes('contentImprovementSignals?.degraded'),
  'V31 must preserve a degraded state instead of treating it as zero signals.')
expect(improvementSection.includes('这不代表所有读者都满意'),
  'V31 empty state must not claim universal reader satisfaction.')
expect(improvementSection.includes('item.postHref') && improvementSection.includes('item.editHref'),
  'V31 must route readers to existing post review and editing surfaces.')
expect(improvementSection.includes("item.state === 'MAINTENANCE_EXISTS'")
  && improvementSection.includes('item.workspaceHref'),
  'V31 must route an existing maintenance state to the existing workspace.')
for (const forbidden of ['postFeedbackScore', 'recommendationReasons', 'reasonCode', 'distinctReaderCount', 'uid', 'taskId', 'assigneeUid']) {
  expect(!improvementSection.includes(forbidden),
    `V31 creator UI must not derive or disclose ${forbidden}.`)
}

expect(channelHealthApi.includes('qualityReviewPostCount'),
  'Channel health API must expose the aggregate V31 post count.')
expect(channelHealthApi.includes('qualitySignalAvailable'),
  'Channel health API must distinguish an unavailable source from zero.')
expect(channelHealthView.includes('item.qualitySignalAvailable'),
  'Channel health view must preserve unavailable quality-signal state.')
expect(channelHealthView.includes('item.qualityReviewPostCount'),
  'Channel health view must show only the server aggregate.')

console.log('V31 content improvement signals guard passed.')
