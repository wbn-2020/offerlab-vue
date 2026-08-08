import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const vueRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.resolve(vueRoot, '..')
const read = (relative) => fs.readFileSync(path.join(vueRoot, relative), 'utf8')
const readRepo = (relative) => fs.readFileSync(path.join(repoRoot, relative), 'utf8')
const expect = (value, message) => assert.ok(value, message)

const packageJson = JSON.parse(read('package.json'))
const api = read('src/api/channelHealthCandidates.ts')
const panel = read('src/components/health/ChannelHealthCandidatePanel.vue')
const navigation = read('src/utils/maintenanceNavigation.ts')
const healthView = read('src/views/AdminChannelHealthView.vue')
const facade = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/ContentMaintenanceTaskReadFacade.java',
)
const revisionKey = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/api/ContentMaintenanceTaskRevisionKey.java',
)
const taskReadService = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/application/PostContentMaintenanceTaskReadService.java',
)
const taskMapper = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/collaboration/infrastructure/persistence/ContentMaintenanceTaskMapper.java',
)
const candidateService = readRepo(
  'offerlab-java/community-domain-analytics/src/main/java/com/offerlab/community/analytics/application/ChannelQualityReviewCandidateService.java',
)
const maintenanceService = readRepo(
  'offerlab-java/community-domain-post/src/main/java/com/offerlab/community/post/collaboration/application/ContentMaintenanceTaskService.java',
)

expect(
  packageJson.scripts['test:v36-channel-quality-candidates']
    === 'node scripts/test-v36-channel-quality-candidates.mjs',
  'V36 candidate guard must have a package script.',
)
expect(
  packageJson.scripts['pretest:guards'].includes('test:v36-channel-quality-candidates'),
  'V36 candidate guard must run before the full guard suite.',
)

for (const token of [
  'safeNonNegativeInteger',
  'const suppressedCount = safeNonNegativeInteger',
  'CANDIDATE_LIFECYCLE_STATES',
  'TASK_EXISTS',
  'REVISION_STALE',
  'sourceRefId',
  'postHref.trim() !== `/post/${sourcePostId}`',
]) {
  expect(api.includes(token), `V36 candidate adapter is missing ${token}.`)
}

for (const token of [
  'refreshKey',
  'suppressedCount > 0',
  'candidate.lifecycleState === \'READY\'',
  'candidate.lifecycleState === \'TASK_EXISTS\'',
  'candidate.lifecycleState === \'REVISION_STALE\'',
  'requestVersion',
  'loadMore',
  'page.value.suppressedCount + nextPage.suppressedCount',
  '}, { immediate: true })',
]) {
  expect(panel.includes(token), `V36 candidate panel is missing ${token}.`)
}

for (const token of [
  'candidate.lifecycleState !== \'READY\'',
  'candidate.actionable !== true',
  'const sourceRefId = normalizePositiveLongId(candidate.sourceRefId)',
]) {
  expect(navigation.includes(token), `V36 navigation is missing ${token}.`)
}

for (const token of [
  'canCreateMaintenanceGlobally',
  'moderatedMaintenanceDomains',
  ':refresh-key="channelHealthRefreshKey"',
  'channelHealthRefreshKey.value += 1',
]) {
  expect(healthView.includes(token), `V36 health view is missing ${token}.`)
}

expect(facade.includes('findTaskStatusesBySourceRevision'), 'V36 facade must expose exact revision status lookup.')
expect(facade.includes('Map<ContentMaintenanceTaskRevisionKey, String>'),
  'V36 facade must return only source keys and statuses.')
expect(revisionKey.includes('sourcePostId') && revisionKey.includes('sourceRefId'),
  'V36 revision key must contain only post and revision references.')
for (const token of [
  'MAX_REVISION_KEYS',
  'TASK_STATUSES',
  '"CHANNEL_HEALTH".equals(sourceType)',
  'findTaskStatusesBySourceRevision',
]) {
  expect(taskReadService.includes(token), `V36 task read service is missing ${token}.`)
}
expect(taskMapper.includes('collection="keys"') && taskMapper.includes('key.sourcePostId')
  && taskMapper.includes('key.sourceRefId'),
  'V36 mapper must query exact source revision keys.')
for (const token of [
  'suppressedCount',
  '"REVISION_STALE"',
  '"TASK_EXISTS"',
  '"READY"',
  'maintenanceTaskReadFacade',
]) {
  expect(candidateService.includes(token), `V36 candidate service is missing ${token}.`)
}
expect(
  maintenanceService.includes('catch (DuplicateKeyException ignored)')
    && maintenanceService.includes('ErrorCode.DUPLICATE_OPERATION'),
  'V36 task creation must map the source-revision unique conflict to a business error.',
)

for (const forbidden of [
  'revisionToken',
  'readerUid',
  'distinctReader',
  'authorId',
  'feedbackReason',
  'taskId',
  'createdByUid',
  'contentMaintenanceApi.create',
  '质量认证',
  '自动通过',
]) {
  expect(!api.includes(forbidden), `V36 candidate API must not expose ${forbidden}.`)
  expect(!panel.includes(forbidden), `V36 candidate panel must not expose ${forbidden}.`)
}

console.log('V36 channel quality candidate guard passed.')
