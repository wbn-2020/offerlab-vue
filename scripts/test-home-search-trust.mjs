import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(homeView, /sampledFeedContentCount\s*=\s*ref\(0\)/, 'HomeView must keep a sampled feed count for trustworthy metrics')
assert.match(homeView, /readableContentCount\s*=\s*computed\(\(\)\s*=>\s*Math\.max\(visiblePosts\.value\.length,\s*sampledFeedContentCount\.value\)\)/, 'home content metric must fall back to sampled feed counts')
assert.match(homeView, /feedApi\.getLatest\(undefined,\s*6\)/, 'HomeView must sample latest feed for content metric')
assert.match(homeView, /feedApi\.getHot\(undefined,\s*6\)/, 'HomeView must sample hot feed for content metric')
assert.match(homeView, /feedApi\.getRecommend\(undefined,\s*6\)/, 'HomeView must sample recommendation feed for content metric')
assert.match(homeView, /<strong class="metric-value">\{\{ readableContentCount \}\}<\/strong>/, 'hero metric must render the trustworthy content count with a stable contrast class')
assert.match(homeView, /feed-error-actions/, 'HomeView feed load failure must expose fallback actions beyond retry')
assert.match(homeView, /当前频道：\{\{ feedLabels\[activeFeed\] \}\}/, 'HomeView feed errors must show the current feed label')
assert.match(homeView, /switchFeedAfterError\('hot'\)/, 'HomeView feed errors must let users switch to hot feed')
assert.match(homeView, /switchFeedAfterError\('featured'\)/, 'HomeView feed errors must let users switch to featured feed')
assert.match(homeView, /to="\/explore"/, 'HomeView feed errors must route users to discovery')
assert.match(homeView, /path: '\/questions'/, 'HomeView feed errors must route users to questions')
assert.match(homeView, /homeFallbackQuestionQuery/, 'HomeView feed errors must preserve a useful keyword when routing to questions')

assert.match(searchView, /结果可能不完整，排序能力受限/, 'SearchView degraded search copy must explain result completeness and ranking limits')

console.log('home/search trust guard passed')
