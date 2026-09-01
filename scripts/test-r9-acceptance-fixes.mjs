import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')

const authApi = read('src/api/auth.ts')
const authStore = read('src/stores/auth.ts')
const guards = read('src/router/guards.ts')
const fallback = read('src/components/layout/RouteLoadingFallback.vue')
const home = read('src/views/HomeView.vue')
const discovery = read('src/api/discovery.ts')
const explore = read('src/views/ExploreView.vue')

assert.match(
  authApi,
  /AUTH_ROUTE_HYDRATION_TIMEOUT_MS\s*=\s*3_500/,
  'route-level session recovery must finish before the five-second route budget',
)
assert.match(
  authStore,
  /fetchMe\(AUTH_ROUTE_HYDRATION_TIMEOUT_MS\)/,
  'auth hydration must use the bounded route timeout',
)
assert.match(
  guards,
  /requiresResolvedSession\s*=\s*Boolean\(requiresAuth \|\| guestOnly \|\| adminPermission\)/,
  'only routes whose access decision depends on identity may block on session recovery',
)
assert.match(
  guards,
  /if \(requiresResolvedSession && authStore\.token && !authStore\.ready\)/,
  'public routes must not wait for profile hydration before loading their route chunk',
)

assert.match(fallback, /3_000/, 'slow route feedback must appear after three seconds')
assert.match(fallback, /8_000/, 'a stuck route must expose recovery after eight seconds')
assert.match(fallback, /重新加载/, 'stuck route fallback must offer a visible reload action')
assert.match(fallback, /focus-visible/, 'route recovery action must keep a visible keyboard focus')

assert.match(home, /tagStatus\s*=\s*ref<'idle' \| 'loading' \| 'ready' \| 'error'>/, 'home tags must model explicit request states')
assert.match(home, /const loadHomeTags = async/, 'home tags must expose a reusable loader')
assert.match(home, /@click="loadHomeTags"/, 'home tag failures must provide a local retry')
assert.match(home, /postCount \?\? tag\.count/, 'home tag ranking must use the public post-count contract')
assert.match(home, /暂无有公开内容的热门标签/, 'healthy empty tags must use an explicit empty state')

assert.match(discovery, /declaredEmpty = raw\.status === 'EMPTY' && raw\.degraded !== true/, 'discovery adapter must preserve healthy empty modules')
assert.match(discovery, /degraded: declaredEmpty \? false/, 'empty data must not be converted into a service failure')
assert.match(explore, /props\.module\.status === 'EMPTY' \? '暂无'/, 'discovery module header must distinguish empty from unavailable')
assert.match(explore, /暂无精选专题/, 'featured topics need a healthy empty-state message')
assert.match(explore, /这个模块暂时不可用，请稍后重试/, 'real module failures need a failure-specific message')

console.log('OfferLab R9 acceptance fix guard passed.')
