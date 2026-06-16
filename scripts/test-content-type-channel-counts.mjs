import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const exploreView = readFileSync(new URL('../src/views/ExploreView.vue', import.meta.url), 'utf8')

assert.match(exploreView, /dashboardApi, type RankedMetric/, 'ExploreView must import dashboard trend metrics')
assert.match(exploreView, /contentTypeDistribution\s*=\s*ref<RankedMetric\[\]>\(\[\]\)/, 'ExploreView must store content type distribution')
assert.match(exploreView, /dashboardApi\.getTrendDashboard\('30d'\)/, 'ExploreView must load 30-day trend dashboard data')
assert.match(exploreView, /contentTypeDistribution\.value\.find\(\(item\) => item\.name === option\?\.label\)\?\.count/, 'ExploreView channel counts must prefer dashboard content type distribution')
assert.match(exploreView, /计数为近 30 天发布分布/, 'ExploreView must label the count time window')
assert.doesNotMatch(exploreView, /const contentTypeCount = \(type: number\) => cleanLatestPosts\.value\.filter/, 'ExploreView must not use only the current latest-post sample for channel totals')

console.log('content type channel counts guard passed')
