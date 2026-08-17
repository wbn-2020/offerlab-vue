import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const app = read('src/App.vue')
const routeFallback = read('src/components/layout/RouteLoadingFallback.vue')
const discovery = read('src/composables/useCollaborationDiscoveryQuery.ts')
const hub = read('src/views/CollaborationHubView.vue')

assert.match(app, /<RouteLoadingFallback v-else :collaboration="isCollaborationRoute"/, 'RouterView must render a fallback even before the async route component resolves.')
assert.match(app, /route\.path === '\/collaboration' \|\| route\.path\.startsWith\('\/collaboration\/'\)/, 'collaboration routes must select their dedicated first-frame shell.')
assert.match(routeFallback, /<AppHeader \/>/, 'the collaboration first frame must include the application header.')
assert.match(routeFallback, /<h1>公共共建中心<\/h1>/, 'the collaboration first frame must expose the page title.')
assert.match(routeFallback, /aria-label="公共共建浏览"/, 'the collaboration first frame must expose the public tab navigation.')
assert.match(routeFallback, /collaboration-route-row/, 'the collaboration first frame must include stable content skeletons.')

assert.match(discovery, /const retainCurrentPage = !append && preserveItems && items\.value\.length > 0/, 'need refresh must retain the current page.')
assert.match(discovery, /refresh: \(\) => load\(false, true\)/, 'explicit refresh must use the retained-page path.')
assert.match(discovery, /SLOW_LOAD_NOTICE_MS = 800/, 'initial discovery must use a bounded slow-load notice threshold.')
assert.match(discovery, /slowLoad\.value = true/, 'slow-load state must be tied to the active discovery request.')
assert.match(hub, /needState\.loading && !needState\.items\.length/, 'need skeletons must be limited to initial loading.')
assert.match(hub, /needState\.slowLoad/, 'need loading must explain a request that is slower than normal.')
assert.match(hub, /刷新失败，已保留当前需求/, 'need refresh failure must remain explicit without clearing content.')
assert.match(hub, /seriesState\.loading && !seriesState\.items\.length/, 'series skeletons must be limited to initial loading.')
assert.match(hub, /activityState\.loading && !activityState\.items\.length/, 'activity skeletons must be limited to initial loading.')
assert.match(hub, /discussionState\.loading && !discussionState\.items\.length/, 'discussion skeletons must be limited to initial loading.')

console.log('collaboration cold-entry guard passed')
