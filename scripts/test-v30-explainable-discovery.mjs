import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const expect = (value, message) => {
  if (!value) throw new Error(message)
}

const packageJson = JSON.parse(read('package.json'))
const feedApi = read('src/api/feed.ts')
const postCard = read('src/components/post/PostCard.vue')
const feedList = read('src/components/feed/FeedList.vue')
const home = read('src/views/HomeView.vue')
const operationSlotCard = read('src/components/operations/OperationSlotCard.vue')

expect(packageJson.scripts['test:v30-explainable-discovery'], 'V30 guard must have a package script.')
expect(packageJson.scripts['pretest:guards'].includes('test:v30-explainable-discovery'),
  'V30 guard must run before the full guard suite.')

for (const token of [
  'RecommendationReasonDetail',
  'FeedbackReasonCode',
  'recommendationReasonDetails',
  'getChannelHotBoard',
  '/api/v1/feeds/channels/${encodeURIComponent(String(domain))}/hot-board',
]) {
  expect(feedApi.includes(token), `V30 Feed API is missing ${token}.`)
}
expect(feedApi.includes('reasonCode'), 'V30 feedback must forward a canonical reason code.')

expect(postCard.includes('const feedExplanationDetails'),
  'Post cards must retain a server-provided recommendation-detail projection.')
expect(postCard.includes('feedPost.value.recommendationReasonDetails || []'),
  'Post cards must render recommendation details supplied by the server.')
expect(!postCard.includes('props.post.recommendationReasons'),
  'Post cards must not derive visible recommendation copy from the legacy compatibility field.')
expect(!postCard.includes('formatNumber(commentCount)'),
  'Post cards must not reproduce hot-ranking explanations from client-side interaction counters.')
expect(postCard.includes(':aria-expanded="showFeedExplanation"'),
  'Recommendation disclosures must expose their expanded state.')
expect(postCard.includes(':aria-controls="feedExplanationId"'),
  'Recommendation disclosures must connect their button to disclosed content.')
expect(postCard.includes('showFeedbackReasonDialog'),
  'Post cards must require a bounded feedback-reason selection for negative controls.')
for (const code of ['NOT_RELEVANT', 'TOO_FREQUENT', 'ALREADY_KNOWN', 'QUALITY_NOT_EXPECTED', 'OTHER']) {
  expect(postCard.includes(`code: '${code}'`),
    `Post cards must retain V30 feedback reason ${code}.`)
}
expect(postCard.includes(':aria-expanded="showFeedbackMenu"'),
  'Post feedback menus must expose expanded state.')
expect(postCard.includes('@keydown.esc.stop.prevent="showFeedbackMenu = false"'),
  'Post feedback menus must support Escape dismissal.')
expect(!postCard.includes('role="menu"') && !postCard.includes('role="menuitem"'),
  'Post feedback actions must use native buttons unless full ARIA menu keyboard semantics are implemented.')
expect(!postCard.includes('notInterested:'), 'Post cards must not retain the legacy recommendation-feedback event.')

expect(feedList.includes('reasonCode) => $emit'),
  'FeedList must forward the V30 feedback reason code.')

expect(home.includes('data-v30-feed-control-entry'),
  'Home must expose the V30 link to the unified feed-control manager.')
expect(home.includes("query: { tab: 'feed-controls' }"),
  'Home must link to the V29 settings control manager.')
expect(home.includes('data-v30-channel-hot-board'),
  'Home must render the V30 channel hot-board surface.')
expect(home.includes('feedApi.getChannelHotBoard'),
  'Home hot board must use the server-side hot-board API.')
expect(!home.includes('data-feed-control-state'),
  'Home must not retain the duplicate legacy feed-control manager state.')
expect(!home.includes('handleRecommendFeedback'),
  'Home must not retain the legacy recommendation-feedback handler.')

expect(operationSlotCard.includes('运营整理，不等同于自然排序'),
  'Operation cards must distinguish curation from natural recommendation.')
expect(operationSlotCard.includes('slotUpdatedAt'),
  'Operation cards must disclose the curation update time.')

console.log('V30 explainable discovery guard passed.')
