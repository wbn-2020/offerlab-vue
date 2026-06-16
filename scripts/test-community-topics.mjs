import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const router = read('../src/router/index.ts')
const api = read('../src/api/post.ts')
const types = read('../src/api/types.ts')
const adapters = read('../src/api/adapters.ts')
const homeView = read('../src/views/HomeView.vue')
const exploreView = read('../src/views/ExploreView.vue')
const topicDetailView = read('../src/views/TopicDetailView.vue')
const governanceView = read('../src/views/AdminGovernanceView.vue')
const meProfileView = read('../src/views/MeProfileView.vue')

assert.match(router, /path:\s*['"]\/topics\/:slug['"]/, 'router must expose the public topic detail route')
assert.match(router, /TopicDetailView\.vue/, 'topic route must lazy-load TopicDetailView')

assert.match(types, /export\s+interface\s+CommunityTopic/, 'types must define CommunityTopic')
assert.match(types, /virtualTopic\?:\s*boolean/, 'CommunityTopic must expose virtual topic marker')
assert.match(adapters, /adaptCommunityTopic/, 'API adapters must normalize CommunityTopic responses')
assert.match(adapters, /virtualTopic:\s*Boolean\(raw\?\.virtualTopic\)/, 'topic adapter must preserve virtual topic marker')

assert.match(api, /export\s+interface\s+CommunityTopicReq/, 'post API must define the admin topic command shape')
assert.match(api, /listTopics:\s*async[\s\S]*\/api\/v1\/topics/, 'post API must expose public topic listing')
assert.match(api, /getTopic:\s*async[\s\S]*\/api\/v1\/topics\/\$\{encodeURIComponent\(slug\)\}/, 'post API must expose topic detail loading')
assert.match(api, /getTopicPosts:\s*async[\s\S]*\/api\/v1\/topics\/\$\{encodeURIComponent\(slug\)\}\/posts/, 'post API must expose topic post pagination')
assert.match(api, /getTopicFollowStatus:\s*async[\s\S]*\/api\/v1\/topics\/\$\{encodeURIComponent\(slug\)\}\/follow-status/, 'post API must expose topic follow status')
assert.match(api, /followTopic:\s*async[\s\S]*\/api\/v1\/topics\/\$\{encodeURIComponent\(slug\)\}\/follow/, 'post API must expose topic follow')
assert.match(api, /unfollowTopic:\s*async[\s\S]*client\.delete\(`\/api\/v1\/topics\/\$\{encodeURIComponent\(slug\)\}\/follow`/, 'post API must expose topic unfollow')
assert.match(api, /listFollowingTopics:\s*async[\s\S]*\/api\/v1\/topics\/me\/following/, 'post API must expose current user followed topics')
assert.match(api, /listAdminTopics:\s*async[\s\S]*\/api\/v1\/topics\/admin/, 'post API must expose admin topic listing')
assert.match(api, /createTopic:\s*async[\s\S]*client\.post\('\/api\/v1\/topics\/admin'/, 'post API must expose admin topic creation')
assert.match(api, /updateTopic:\s*async[\s\S]*client\.put\(`\/api\/v1\/topics\/admin\/\$\{topicId\}`/, 'post API must expose admin topic update')
assert.match(api, /updateTopicStatus:\s*async[\s\S]*\/api\/v1\/topics\/admin\/\$\{topicId\}\/status/, 'post API must expose admin topic status changes')

for (const [name, source] of Object.entries({ homeView, exploreView })) {
  assert.match(source, /postApi\.listTopics/, `${name} must prefer real community topics over local aggregates`)
  assert.match(source, /\/topics\/\$\{topic\.slug\}/, `${name} topic links must navigate to topic detail pages`)
}

assert.match(topicDetailView, /postApi\.getTopic\(slug\)/, 'topic detail page must load topic metadata from backend')
assert.match(topicDetailView, /postApi\.getTopicPosts\(slug/, 'topic detail page must page topic posts from backend')
assert.match(topicDetailView, /postApi\.getTopicFollowStatus\(slug\)/, 'topic detail page must load authenticated follow state without breaking public browsing')
assert.match(topicDetailView, /topicLoadFailed/, 'topic detail page must separate topic load failure from empty content')
assert.match(topicDetailView, /postErrorMessage/, 'topic detail page must separate post list failures from missing topic failures')
assert.match(topicDetailView, /canFollowTopic/, 'topic detail page must hide follow controls for read-only aggregate topics')
assert.match(topicDetailView, /postApi\.followTopic\(slug\)/, 'topic detail page must let users follow a topic')
assert.match(topicDetailView, /postApi\.unfollowTopic\(slug\)/, 'topic detail page must let users unfollow a topic')
assert.match(topicDetailView, /router\.push\(\{ path: '\/login'/, 'anonymous topic follow must redirect to login')
assert.match(topicDetailView, /featuredOnly/, 'topic detail page must support featured-only filtering')
assert.match(topicDetailView, /activeType/, 'topic detail page must support content type filtering')
assert.match(topicDetailView, /PostCard/, 'topic detail page must render interactive PostCard items')

assert.match(governanceView, /label:\s*['"]专题管理['"],\s*value:\s*['"]topics['"]/, 'governance center must include the Topic Management tab')
assert.match(governanceView, /postApi\.listAdminTopics/, 'governance topic tab must load admin topic records')
assert.match(governanceView, /postApi\.createTopic/, 'governance topic tab must create topics')
assert.match(governanceView, /postApi\.updateTopic\(/, 'governance topic tab must update topics')
assert.match(governanceView, /postApi\.updateTopicStatus/, 'governance topic tab must change topic status')
assert.match(governanceView, /requireRiskConfirm/, 'topic status changes must use the shared risk confirmation dialog')

assert.match(meProfileView, /value:\s*'topics'/, 'my profile must include followed topics tab')
assert.match(meProfileView, /postApi\.listFollowingTopics/, 'my profile must load followed community topics')
assert.match(meProfileView, /\/topics\/\$\{topic\.slug\}/, 'followed topic cards must link back to topic detail pages')

console.log('Community topic frontend guards passed')
