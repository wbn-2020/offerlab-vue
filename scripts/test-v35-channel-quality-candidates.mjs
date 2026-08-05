import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const packageJson = JSON.parse(read('package.json'))
const api = read('src/api/channelHealthCandidates.ts')
const panel = read('src/components/health/ChannelHealthCandidatePanel.vue')
const navigation = read('src/utils/maintenanceNavigation.ts')
const healthView = read('src/views/AdminChannelHealthView.vue')

expect(
  packageJson.scripts['test:v35-channel-quality-candidates']
  === 'node scripts/test-v35-channel-quality-candidates.mjs',
  'V35 candidate guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes('test:v35-channel-quality-candidates'),
  'V35 candidate guard must run before the full guard suite.',
)

for (const token of [
  '/api/v1/community-health/quality-review-candidates',
  'ChannelHealthReviewCandidate',
  'adaptChannelHealthReviewCandidatePage',
  'unavailableChannelHealthReviewCandidatePage',
  "value.sourceType !== CANDIDATE_SOURCE_TYPE",
  'postHref.trim() !== `/post/${sourcePostId}`',
  'value.actionable !== true',
  'items.length > MAX_PAGE_SIZE',
]) {
  expect(api.includes(token), `V35 candidate adapter is missing ${token}.`)
}

for (const forbidden of [
  'revisionToken',
  'readerUid',
  'distinctReader',
  'authorId',
  'feedbackReason',
  'contentMaintenanceApi.create',
  '质量认证',
  '自动通过',
]) {
  expect(!api.includes(forbidden), `V35 candidate API must not expose ${forbidden}.`)
  expect(!panel.includes(forbidden), `V35 candidate panel must not expose ${forbidden}.`)
}

expect(panel.includes('channelHealthCandidatesApi.list'),
  'V35 candidate panel must request the dedicated candidate endpoint.')
expect(panel.includes('channelHealthReviewBatchesApi.create'),
  'V35 candidate panel must hand READY candidates to the governed batch-dispatch endpoint.')
expect(panel.includes('候选暂时无法读取') && panel.includes('@click="load"'),
  'V35 candidate panel must render an unavailable state with retry.')
expect(panel.includes('当前治理范围没有候选'),
  'V35 candidate panel must distinguish a valid empty page from an unavailable source.')

expect(navigation.includes('buildMaintenanceTaskFromChannelHealthCandidateTarget'),
  'V35 must centralize candidate-to-task navigation.')
expect(navigation.includes('sourcePostId') && navigation.includes('sourceRefId'),
  'V35 navigation must preserve the post and revision references.')
expect(!navigation.includes('assigneeUid: candidate'),
  'V35 navigation must not prefill the assignee.')
expect(navigation.includes('return null'),
  'V35 direct candidate-to-task navigation must be disabled once V38 batch dispatch is enabled.')

expect(healthView.includes('ChannelHealthCandidatePanel'),
  'V35 channel health view must mount the candidate panel.')
expect(healthView.includes('@batch-created'),
  'V35 channel health view must refresh governed batch state after candidate dispatch.')

console.log('V35 channel quality candidate guard passed.')
