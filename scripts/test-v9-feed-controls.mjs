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
const settings = read('src/views/SettingsView.vue')
const governance = read('src/utils/recommendationGovernance.ts')

has(home, /parseFeedType\(route\.query\.feed\)/, 'home feed type must hydrate from the URL')
has(home, /feed:\s*nextFeed/, 'feed tab changes must write the URL')
has(home, /homeDomainLocation[\s\S]*feed:\s*activeFeed\.value[\s\S]*domain/, 'domain links must preserve the active feed type')
has(home, /watch\([\s\S]*route\.query\.feed[\s\S]*activeFeed/, 'back and forward navigation must restore the feed type')

has(home, /data-v30-feed-control-entry/, 'home must expose the unified Feed-control settings entry')
has(home, /query:\s*\{\s*tab:\s*'feed-controls'\s*\}/, 'home must link Feed controls to the settings tab')
missing(home, /feedControlManagerItems/, 'home must not retain a duplicate Feed-control manager')
has(home, /listFeedbackPreferences\([\s\S]*100/, 'home may load a compact preference snapshot for current-card state')
has(settings, /data-v29-feed-control-manager/, 'settings must own the personal Feed-control manager')
has(settings, /feedApi\.listControls\([\s\S]*30/, 'settings Feed-control management must use bounded pagination')
has(settings, /feedControlsError[\s\S]*信息流控制暂时无法读取/, 'settings Feed controls must expose a readable loading failure')

has(feedApi, /explainRecommendationReason/, 'Feed API adaptation must map internal reason codes to readable text')
has(feedApi, /explainFeedControl/, 'Feed preference adaptation must map control explanations')
has(governance, /recommendationReasonCodeText/, 'recommendation reason-code mappings must be centralized')
has(governance, /FEEDBACK_PERSISTENCE_UNAVAILABLE/, 'persistence degradation must have readable copy')
missing(postCard, /原因码：/, 'PostCard must not display an internal reason code')
missing(postCard, /feedReasonCode/, 'PostCard must render mapped explanation text only')
has(postCard, /feedExplanationDetails[\s\S]*detail\.text/, 'PostCard must retain readable server-provided Feed explanations')

has(feedTabs, /const activeTab = computed/, 'Feed tabs must remain controlled by route-backed model state')
has(infiniteFeed, /lastPage\.data\?\.hasMore[\s\S]*lastPage\.data\?\.nextCursor/, 'infinite Feed pagination must honor hasMore and cursor together')
has(infiniteFeed, /new Map\(items\.map\(\(post\)/, 'Feed pagination must deduplicate stable post IDs')

console.log('V9 Feed controls guard passed.')
