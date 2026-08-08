import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => {
  if (!value) throw new Error(message)
}

const api = read('src/api/creatorChallenges.ts')
const userWorkspace = read('src/components/creator/CreatorChallengeWorkspace.vue')
const adminWorkspace = read('src/components/creator/CreatorChallengeAdminWorkspace.vue')
const profile = read('src/views/MeProfileView.vue')
const adminView = read('src/views/AdminCommunityGrowthView.vue')
const types = read('src/api/types.ts')
const editorContext = read('src/utils/editorAssistContext.ts')

for (const endpoint of [
  "'/api/v1/creator-growth/challenges/workspace'",
  '/api/v1/creator-growth/challenges/${challengeId}/join',
  '/api/v1/creator-growth/challenges/${challengeId}/withdraw',
  '/api/v1/creator-growth/challenges/${challengeId}/complete',
  "'/api/v1/creator-growth/admin/challenges'",
  '/api/v1/creator-growth/admin/challenges/${challengeId}/publish',
  '/api/v1/creator-growth/admin/challenges/${challengeId}/offline',
]) {
  expect(api.includes(endpoint), `V28 creator challenge API is missing ${endpoint}`)
}

expect(profile.includes('<CreatorChallengeWorkspace class="mt-6" />'), 'V28 user challenge workspace is missing from the creator profile')
expect(adminView.includes("key: 'creator-challenges'"), 'V28 challenge operations tab is missing')
expect(adminView.includes('<CreatorChallengeAdminWorkspace'), 'V28 admin challenge workspace is missing')
expect(userWorkspace.includes('creatorChallengesApi.getWorkspace()'), 'user workspace must load the server-owned challenge workspace')
expect(userWorkspace.includes('creatorChallengesApi.complete(challenge.id, postId)'), 'completion must use the explicit user-selected post')
expect(userWorkspace.includes('challenge.eligiblePosts'), 'completion choices must come from server-provided eligible posts')
expect(userWorkspace.includes("source: 'creator_challenge'"), 'writing entry must preserve the creator challenge source')
expect(userWorkspace.includes("returnHref: '/me#creator-challenges'"), 'writing entry must return to the challenge workspace')
expect(adminWorkspace.includes('creatorChallengesApi.upsert(command())'), 'admin workspace must create or update drafts through the V28 API')
expect(adminWorkspace.includes('creatorChallengesApi.publish(challenge.id'), 'admin workspace must publish through the V28 API')
expect(adminWorkspace.includes('creatorChallengesApi.offline(challenge.id'), 'admin workspace must offline through the V28 API')
expect(adminWorkspace.includes('challenge.status === \'DRAFT\''), 'admin workspace must restrict editing controls to draft challenges')
expect(adminWorkspace.includes('challenge.status === \'PUBLISHED\''), 'admin workspace must restrict offline controls to published challenges')
expect(types.includes("| 'creator_challenge'"), 'editor source type must include creator_challenge')
expect(editorContext.includes("'creator_challenge'"), 'editor context parser must accept creator challenge entry')
expect(editorContext.includes("creator_challenge: '创作者挑战'"), 'editor source label must identify creator challenges')

for (const [name, content] of [
  ['creator challenge API', api],
  ['user challenge workspace', userWorkspace],
  ['admin challenge workspace', adminWorkspace],
]) {
  expect(!content.includes('localStorage'), `${name} must not persist challenge state in localStorage`)
  expect(!content.includes('sessionStorage'), `${name} must not persist challenge state in sessionStorage`)
}

expect(!api.includes('/award'), 'V28 must not expose a manual badge award API')
expect(!api.includes('/manual-complete'), 'V28 must not expose a manual challenge completion API')
expect(!adminWorkspace.includes('participation list'), 'V28 operations workspace must not expose a participant roster')
expect(!adminWorkspace.includes('发放徽章'), 'V28 operations workspace must not offer manual badge issuance')
expect(userWorkspace.includes('workspace?.boundaryCopy'), 'V28 user workspace must render the server-owned challenge boundary copy')
expect(!userWorkspace.includes('积分累计'), 'V28 user workspace must not introduce point accumulation mechanics')
expect(!userWorkspace.includes('每日打卡'), 'V28 user workspace must not introduce daily check-in mechanics')
expect(!userWorkspace.includes('排行榜'), 'V28 user workspace must not introduce rankings')

console.log('V28 creator challenge guard passed.')
