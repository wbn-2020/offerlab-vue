import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(homeView, /sampledFeedContentCount\s*=\s*ref\(0\)/, 'HomeView must keep a sampled feed count for trustworthy metrics')
assert.match(homeView, /readableContentCount\s*=\s*computed\(\(\)\s*=>\s*Math\.max\(visiblePosts\.value\.length,\s*sampledFeedContentCount\.value\)\)/, 'home content metric must fall back to sampled feed counts')
assert.match(homeView, /feedApi\.getLatest\(undefined,\s*6\)/, 'HomeView must sample latest feed for content metric')
assert.match(homeView, /feedApi\.getHot\(undefined,\s*6\)/, 'HomeView must sample hot feed for content metric')
assert.match(homeView, /feedApi\.getRecommend\(undefined,\s*6\)/, 'HomeView must sample recommendation feed for content metric')
assert.match(homeView, /<strong>\{\{ readableContentCount \}\}<\/strong>/, 'hero metric must render the trustworthy content count')

assert.match(searchView, /结果可能不完整，排序能力受限/, 'SearchView degraded search copy must explain result completeness and ranking limits')

console.log('home/search trust guard passed')
