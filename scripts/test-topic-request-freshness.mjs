import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const [source, homeSource, tagSource] = await Promise.all([
  readFile(new URL('../src/views/TopicDetailView.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8'),
  readFile(new URL('../src/views/TagDetailView.vue', import.meta.url), 'utf8'),
])

assert.match(source, /let loadGeneration = 0/, 'topic route loads must have a generation')
assert.match(source, /let postRequestGeneration = 0/, 'topic post filters must have an independent generation')
assert.match(source, /isCurrentLoad\(targetGeneration, slug\)/, 'async topic responses must verify route freshness')
assert.match(source, /targetPostGeneration === postRequestGeneration/, 'post responses must verify filter freshness')
assert.match(source, /onUnmounted\(\(\) => \{[\s\S]*?loadGeneration \+= 1/, 'unmount must invalidate pending topic requests')

assert.match(homeSource, /const domainSnapshot = activeDomain\.value/, 'home side-feed loads must snapshot the active domain')
assert.match(homeSource, /requestId !== homePreviewRequestId \|\| activeDomain\.value !== domainSnapshot/, 'home side-feed responses must verify request and domain freshness')
assert.match(homeSource, /watch\(\[\(\) => authStore\.isLoggedIn, \(\) => authStore\.user\?\.uid\]/, 'home account-scoped panels must refresh on account switches')

assert.match(tagSource, /let tagLoadGeneration = 0/, 'tag route loads must have a generation')
assert.match(tagSource, /let postRequestGeneration = 0/, 'tag post filters must have an independent generation')
assert.match(tagSource, /isCurrentTagLoad\(targetGeneration, slug\)/, 'async tag responses must verify route freshness')
assert.match(tagSource, /targetPostGeneration === postRequestGeneration/, 'tag post responses must verify filter freshness')
assert.match(tagSource, /activeType\.value === typeSnapshot[\s\S]*featuredOnly\.value === featuredSnapshot/, 'tag post responses must verify filter snapshots')
assert.match(tagSource, /onUnmounted\(\(\) => \{[\s\S]*?tagLoadGeneration \+= 1[\s\S]*?postRequestGeneration \+= 1/, 'unmount must invalidate pending tag requests')

console.log('topic, home, and tag request freshness guard passed')
