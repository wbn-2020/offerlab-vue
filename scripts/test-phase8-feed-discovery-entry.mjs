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

assert(files.home.includes('hotRisingEntries'), 'HomeView must expose a first-screen hot/rising entry model.')
assert(files.home.includes('setHomeFeed') && files.home.includes("feed: 'hot'"), 'HomeView hot entry must switch to the existing hot feed.')
assert(files.home.includes('setHomeFeed') && files.home.includes("feed: 'latest'"), 'HomeView rising entry must switch to the existing latest/rising feed.')
assert(files.home.includes('explainHotReason'), 'HomeView must render explainable hot/rising reasons.')
assert(files.home.includes('filterVisiblePosts(filterPublicContent'), 'HomeView hot/rising entries must reuse public visibility filtering.')
assert(files.home.includes('findHighRiskContentWarning'), 'HomeView hot/rising entries must surface high-risk warnings when detected.')
assert(files.home.includes('normalizeRecommendationReason'), 'HomeView hot/rising reasons must reuse recommendation reason governance.')

assert(files.explore.includes('channelFeaturedDirections'), 'ExploreView must expose channel featured directions.')
assert(files.explore.includes('channel-featured-direction'), 'ExploreView must render channel featured direction cards.')
assert(files.explore.includes('精选方向'), 'ExploreView must label channel featured direction in user-facing copy.')
assert(files.explore.includes('riskNote'), 'ExploreView channel direction must surface risk notes when available.')

assert(files.postCard.includes('recommendationReasonDetails'), 'PostCard must expose server-provided explanation details.')
assert(files.postCard.includes('findHighRiskContentWarning'), 'PostCard must surface existing high-risk content warnings.')
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
