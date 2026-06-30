import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')

assert.match(homeView, /sampledFeedContentCount\s*=\s*ref\(0\)/, 'HomeView must keep a sampled feed count for trustworthy metrics')
assert.match(homeView, /readableContentCount\s*=\s*computed\(\(\)\s*=>\s*Math\.max\(visiblePosts\.value\.length,\s*sampledFeedContentCount\.value\)\)/, 'home content metric must fall back to sampled feed counts')
assert.match(homeView, /feedApi\.getLatest\(undefined,\s*6(?:,\s*activeDomain\.value)?\)/, 'HomeView must sample latest feed for content metric')
assert.match(homeView, /feedApi\.getHot\(undefined,\s*6(?:,\s*activeDomain\.value)?\)/, 'HomeView must sample hot feed for content metric')
assert.match(homeView, /feedApi\.getRecommend\(undefined,\s*6(?:,\s*activeDomain\.value)?\)/, 'HomeView must sample recommendation feed for content metric')
assert.match(homeView, /readableMetricValue\s*=\s*computed/, 'hero metric must expose a cold-start friendly readable value')
assert.match(homeView, /先看精选/, 'hero metric must avoid showing a bare zero when feeds are empty')
assert.match(homeView, /<strong class="metric-value">\{\{ readableMetricValue \}\}<\/strong>/, 'hero metric must render the trustworthy content count with a stable contrast class')
assert.match(homeView, /todayActions\s*=\s*computed/, 'HomeView must expose a lightweight today action model')
assert.match(homeView, /看今日推荐/, 'HomeView must route new users into recommended content')
assert.match(homeView, /继续备考/, 'HomeView must route new users into prep progress')
assert.match(homeView, /发布面试复盘/, 'HomeView must route new users into experience write-up')
assert.match(homeView, /查看成长档案/, 'HomeView must route new users into growth profile')
assert.match(homeView, /feed-error-actions/, 'HomeView feed load failure must expose fallback actions beyond retry')
assert.match(homeView, /当前频道：\{\{ feedLabels\[activeFeed\] \}\}/, 'HomeView feed errors must show the current feed label')
assert.match(homeView, /switchFeedAfterError\('hot'\)/, 'HomeView feed errors must let users switch to hot feed')
assert.match(homeView, /switchFeedAfterError\('featured'\)/, 'HomeView feed errors must let users switch to featured feed')
assert.match(homeView, /to="\/explore"/, 'HomeView feed errors must route users to discovery')
assert.match(homeView, /path: '\/questions'/, 'HomeView feed errors must route users to questions')
assert.match(homeView, /homeFallbackQuestionQuery/, 'HomeView feed errors must preserve a useful keyword when routing to questions')

assert.match(searchView, /结果可能不完整，排序能力受限/, 'SearchView degraded search copy must explain result completeness and ranking limits')

console.log('home/search trust guard passed')
