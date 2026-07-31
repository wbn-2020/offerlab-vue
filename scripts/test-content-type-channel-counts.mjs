import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const exploreView = readFileSync(new URL('../src/views/ExploreView.vue', import.meta.url), 'utf8')

assert.doesNotMatch(exploreView, /contentTypeDistribution|channelContentCount|计数为近 30 天发布分布/, 'ExploreView must not show an unscoped domain distribution as every channel count')
assert.match(exploreView, /contentForms/, 'ExploreView must expose content-form entries separately from channel counts')

console.log('content type channel counts guard passed')
