import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const has = (source, pattern, message) => assert.match(source, pattern, message)
const missing = (source, pattern, message) => assert.doesNotMatch(source, pattern, message)

const home = read('src/views/HomeView.vue')
const feedApi = read('src/api/feed.ts')
const feedTabs = read('src/components/feed/FeedTabs.vue')
const infiniteFeed = read('src/composables/useInfiniteFeed.ts')
const postCard = read('src/components/post/PostCard.vue')
const governance = read('src/utils/recommendationGovernance.ts')

has(home, /parseFeedType\(route\.query\.feed\)/, 'home feed type must hydrate from the URL')
has(home, /feed:\s*nextFeed/, 'feed tab changes must write the URL')
has(home, /homeDomainLocation[\s\S]*feed:\s*activeFeed\.value[\s\S]*domain/, 'domain links must preserve the active feed type')
has(home, /watch\([\s\S]*route\.query\.feed[\s\S]*activeFeed/, 'back and forward navigation must restore the feed type')

has(home, /feedControlManagerItems/, 'home must expose a personal Feed-control manager')
has(home, /listFeedbackPreferences\([\s\S]*20/, 'Feed-control management must use a paginated page size')
has(home, /feedControlManagerNextCursor[\s\S]*feedControlManagerHasMore/, 'Feed-control management must preserve cursor pagination')
for (const failure of ['缓存服务暂时不可用', '设置未能持久化', '恢复失败']) {
  has(home, new RegExp(failure), `Feed controls must explain ${failure}`)
}

has(feedApi, /explainRecommendationReason/, 'Feed API adaptation must map internal reason codes to readable text')
has(feedApi, /explainFeedControl/, 'Feed preference adaptation must map control explanations')
has(governance, /recommendationReasonCodeText/, 'recommendation reason-code mappings must be centralized')
has(governance, /FEEDBACK_PERSISTENCE_UNAVAILABLE/, 'persistence degradation must have readable copy')
missing(postCard, /原因码：/, 'PostCard must not display an internal reason code')
missing(postCard, /feedReasonCode/, 'PostCard must render mapped explanation text only')
has(postCard, /feedReasonText/, 'PostCard must retain readable Feed explanations')

has(feedTabs, /const activeTab = computed/, 'Feed tabs must remain controlled by route-backed model state')
has(infiniteFeed, /lastPage\.data\?\.hasMore[\s\S]*lastPage\.data\?\.nextCursor/, 'infinite Feed pagination must honor hasMore and cursor together')
has(infiniteFeed, /new Map\(items\.map\(\(post\)/, 'Feed pagination must deduplicate stable post IDs')

console.log('V9 Feed controls guard passed.')
