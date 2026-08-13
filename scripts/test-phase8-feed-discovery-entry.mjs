import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

const files = {
  home: read('src/views/HomeView.vue'),
  explore: read('src/views/ExploreView.vue'),
  postCard: read('src/components/post/PostCard.vue'),
  governance: read('src/utils/recommendationGovernance.ts'),
}

const failures = []
const assert = (condition, message) => {
  if (!condition) failures.push(message)
}

assert(files.home.includes("const feedTabs: FeedType[] = ['following', 'recommend', 'latest', 'hot', 'featured']"), 'HomeView must expose the latest and hot first-screen feed entries.')
assert(files.home.includes('setHomeFeed') && files.home.includes("hot: '热门'"), 'HomeView hot entry must switch through the existing feed control.')
assert(files.home.includes('setHomeFeed') && files.home.includes("latest: '最新'"), 'HomeView latest entry must switch through the existing feed control.')
assert(files.home.includes('feedDescriptions') && files.home.includes('推荐理由会结合兴趣设置'), 'HomeView must explain its feed ranking and recommendation reasons.')
assert(files.home.includes('filterVisiblePosts(filterPublicContent'), 'HomeView feed entries must reuse public visibility filtering.')

assert(files.explore.includes('channelFeaturedDirections'), 'ExploreView must expose channel featured directions.')
assert(files.explore.includes('channel-featured-direction'), 'ExploreView must render channel featured direction cards.')
assert(files.explore.includes('精选方向'), 'ExploreView must label channel featured direction in user-facing copy.')
assert(files.explore.includes('riskNote'), 'ExploreView channel direction must surface risk notes when available.')

assert(files.postCard.includes('recommendationReasonDetails'), 'PostCard must expose server-provided explanation details.')
assert(files.postCard.includes('findHighRiskContentWarning'), 'PostCard must surface existing high-risk content warnings.')
assert(files.postCard.includes('normalizeRecommendationReason'), 'PostCard recommendation reasons must reuse recommendation reason governance.')
assert(files.governance.includes('findHighRiskContentWarning'), 'Recommendation governance must provide high-risk warning detection.')

const forbiddenHomeMainline = ['AI 教练', '训练计划', '刷题', '模拟面试']
for (const phrase of forbiddenHomeMainline) {
  assert(!files.home.includes(phrase), `HomeView must not bring back private training mainline copy: ${phrase}`)
  assert(!files.explore.includes(phrase), `ExploreView must not bring back private training mainline copy: ${phrase}`)
}

if (failures.length) {
  console.error('Phase 8 feed discovery entry guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Phase 8 feed discovery entry guard passed.')
