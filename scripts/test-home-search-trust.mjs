import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import ts from 'typescript'

const homeView = readFileSync(new URL('../src/views/HomeView.vue', import.meta.url), 'utf8')
const searchView = readFileSync(new URL('../src/views/SearchView.vue', import.meta.url), 'utf8')
const effectiveReadSource = readFileSync(new URL('../src/composables/useEffectiveRead.ts', import.meta.url), 'utf8')
const growthApiSource = readFileSync(new URL('../src/api/growth.ts', import.meta.url), 'utf8')
const apiTypesSource = readFileSync(new URL('../src/api/types.ts', import.meta.url), 'utf8')
const postDetailSource = readFileSync(new URL('../src/views/PostDetailView.vue', import.meta.url), 'utf8')

assert.match(homeView, /sampledFeedContentCount\s*=\s*ref\(0\)/, 'HomeView must keep a sampled feed count for trustworthy metrics')
assert.match(homeView, /feedApi\.getLatest\(undefined,\s*6,\s*(?:activeDomain\.value|domainSnapshot)\)/, 'HomeView must sample latest feed for content metric')
assert.match(homeView, /feedApi\.getHot\(undefined,\s*6,\s*(?:activeDomain\.value|domainSnapshot)\)/, 'HomeView must sample hot feed for content metric')
assert.match(homeView, /feedApi\.getRecommend\(undefined,\s*6,\s*(?:activeDomain\.value|domainSnapshot)\)/, 'HomeView must sample recommendation feed for content metric')
assert.match(
  homeView,
  /sampledFeedContentCount\.value\s*=\s*Math\.max\(\s*latestItems\.length,\s*hotItems\.length,\s*recommendPreviewPosts\.value\.length,\s*\)/,
  'HomeView must derive the sampled count only from visible public feed results',
)
assert.match(homeView, /emptyFeedTitle\s*=\s*computed/, 'HomeView must expose an honest empty-feed title')
assert.match(homeView, /activeFeed\.value\s*===\s*'latest'\s*&&\s*sampledFeedContentCount\.value\s*>\s*0/, 'latest empty state must distinguish an empty latest feed from an empty community')
assert.match(homeView, /emptyFeedDescription\s*=\s*computed/, 'HomeView must expose a recovery description for empty feeds')
assert.match(homeView, /\u5f53\u524d\u516c\u5f00\u5185\u5bb9\u6b63\u5728\u51c6\u5907\u4e2d\uff0c\u6682\u65f6\u6ca1\u6709\u53ef\u9605\u8bfb\u7684\u5e16\u5b50/, 'empty feeds must describe an actually empty public environment honestly')
assert.match(homeView, /taskSections\s*=\s*computed/, 'HomeView must render server-backed onboarding and daily task sections')
assert.match(homeView, /sections\.push\(onboardingOverview\.value\)/, 'HomeView must include active server onboarding tasks')
assert.match(homeView, /sections\.push\(dailyOverview\.value\)/, 'HomeView must include server daily tasks')
assert.match(homeView, /v-for="section in taskSections"/, 'HomeView must render the server task sections')
assert.match(homeView, /to="\/editor" class="home-channel-publish"/, 'HomeView must route users into general publishing')
assert.match(homeView, /useDomainCatalog\(\)/, 'HomeView must source filters from the shared public domain catalog')
assert.match(homeView, /v-for="d in homeDomainOptions"/, 'HomeView must only render real domain filters from the shared catalog')
assert.match(homeView, /feed-error-actions/, 'HomeView feed load failure must expose fallback actions beyond retry')
assert.match(homeView, /\u6b63\u5728\u6d4f\u89c8\uff1a\{\{ feedLabels\[activeFeed\] \}\}/, 'HomeView feed errors must show the current feed label')
assert.match(homeView, /switchFeedAfterError\('hot'\)/, 'HomeView feed errors must let users switch to hot feed')
assert.match(homeView, /switchFeedAfterError\('featured'\)/, 'HomeView feed errors must let users switch to featured feed')
assert.match(homeView, /to="\/explore"/, 'HomeView feed errors must route users to discovery')
assert.match(homeView, /path: '\/questions'/, 'HomeView feed errors must route users to questions')
assert.match(homeView, /homeFallbackQuestionQuery/, 'HomeView feed errors must preserve a useful keyword when routing to questions')
assert.match(
  homeView,
  /@media \(max-width: 1023px\)[\s\S]*\.community-feed-layout\s*\{[\s\S]*display:\s*block;[\s\S]*\.home-feed-column\s*\{[\s\S]*width:\s*min\(720px,\s*100%\)/,
  'HomeView must collapse to a readable single feed column below desktop widths',
)
assert.match(
  homeView,
  /@media \(min-width: 1024px\) and \(max-width: 1279px\)[\s\S]*grid-template-columns:\s*208px minmax\(0,\s*44rem\)[\s\S]*\.community-feed-layout__right\s*\{[\s\S]*display:\s*none !important;/,
  'HomeView must hide the right rail at mid-width so the feed is not squeezed',
)
assert.match(
  homeView,
  /@media \(min-width: 1440px\)[\s\S]*grid-template-columns:\s*224px minmax\(0,\s*1fr\) 304px;/,
  'HomeView must reserve stable three-column proportions on wide desktops',
)
assert.match(
  homeView,
  /\.home-left-rail,[\s\S]*?\.home-right-rail\s*\{[\s\S]*position:\s*sticky;[\s\S]*max-height:\s*calc\(100vh - var\(--community-header-height, 64px\) - 2rem\)[\s\S]*overflow-y:\s*auto;/,
  'HomeView long-list side rails must stay bounded and independently scrollable',
)

assert.match(
  searchView,
  /暂时无法读取搜索状态，仍可浏览热门内容、作者和发现页。/,
  'SearchView search-status failures must provide public alternatives without exposing infrastructure details',
)

const sourceRegion = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker)
  assert.notEqual(start, -1, `marker not found: ${startMarker}`)
  const end = source.indexOf(endMarker, start + startMarker.length)
  assert.notEqual(end, -1, `marker not found: ${endMarker}`)
  return source.slice(start, end)
}

assert.match(effectiveReadSource, /heartbeatEffectiveRead/, 'effective reads must report server-authoritative heartbeats')
assert.doesNotMatch(effectiveReadSource, /activeSeconds\.value\s*\+=/, 'the browser must not self-assert trusted active seconds')
assert.doesNotMatch(effectiveReadSource, /activeSeconds:\s*activeSeconds\.value/, 'completion must not upload browser-counted active seconds')
assert.match(effectiveReadSource, /qualified/, 'completion must be gated by the server-qualified heartbeat response')
assert.match(effectiveReadSource, /ACTIVITY_ACTIVE|'ACTIVE'/, 'visible focused reading must use ACTIVE heartbeats')
assert.match(effectiveReadSource, /ACTIVITY_PAUSED|'PAUSED'/, 'hidden or blurred reading must use PAUSED heartbeats')
assert.match(effectiveReadSource, /pagehide/, 'pagehide must attempt to close the active server segment')
assert.match(growthApiSource, /\/api\/v1\/growth\/effective-read\/heartbeat/, 'growth API must expose the heartbeat endpoint')
assert.match(growthApiSource, /\/api\/v1\/growth\/effective-read\/abandon/, 'growth API must expose the effective-read abandon endpoint')
assert.match(effectiveReadSource, /abandonEffectiveRead/, 'route cleanup must release unfinished server sessions')
const completeTypeRegion = sourceRegion(
  apiTypesSource,
  'export interface EffectiveReadCompleteReq',
  'export interface EffectiveReadCompleteResult',
)
assert.match(completeTypeRegion, /sessionToken:\s*string/, 'completion requests must retain the server session token')
assert.doesNotMatch(completeTypeRegion, /activeSeconds|scrollPercent/, 'completion request types must not accept client trust claims')
assert.match(postDetailSource, /const loadedEffectiveReadPostId = computed/, 'effective reads must bind to the loaded post, not an ahead-of-data route id')
assert.match(postDetailSource, /useEffectiveRead\(loadedEffectiveReadPostId/, 'post detail must start reads from the loaded post identity')

const flushAsync = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await new Promise(resolve => setImmediate(resolve))
}

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

const compileEffectiveRead = () => ts.transpileModule(effectiveReadSource, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText

const createEffectiveReadHarness = (initialPostId = 'post-a') => {
  const mountedCallbacks = []
  const unmountedCallbacks = []
  const watchedCallbacks = []
  const scheduledIntervals = new Map()
  const scheduledTimeouts = new Map()
  const documentListeners = new Map()
  const windowListeners = new Map()
  const sessionRequests = []
  const heartbeatRequests = []
  const completeRequests = []
  const abandonRequests = []
  const postId = { value: initialPostId }
  let nextTimerId = 1

  const growthApi = {
    abandonEffectiveRead: (payload) => {
      abandonRequests.push({ payload })
      return Promise.resolve({
        code: 0,
        data: { abandoned: true },
        message: 'ok',
      })
    },
    heartbeatEffectiveRead: (payload, signal) => {
      const request = deferred()
      heartbeatRequests.push({ ...request, payload, signal })
      return request.promise
    },
    completeEffectiveRead: (payload, signal) => {
      const request = deferred()
      completeRequests.push({ ...request, payload, signal })
      return request.promise
    },
    startEffectiveReadSession: (targetPostId, signal) => {
      const request = deferred()
      sessionRequests.push({ ...request, postId: targetPostId, signal })
      return request.promise
    },
  }

  const sandbox = {
    AbortController,
    Date,
    Promise,
    clearInterval: id => scheduledIntervals.delete(id),
    clearTimeout: id => scheduledTimeouts.delete(id),
    document: {
      addEventListener: (name, callback) => documentListeners.set(name, callback),
      documentElement: { scrollHeight: 2000 },
      hasFocus: () => true,
      removeEventListener: name => documentListeners.delete(name),
      visibilityState: 'visible',
    },
    exports: {},
    module: { exports: {} },
    require: (name) => {
      if (name === 'vue') {
        return {
          onBeforeUnmount: callback => unmountedCallbacks.push(callback),
          onMounted: callback => mountedCallbacks.push(callback),
          ref: value => ({ value }),
          toValue: value => {
            if (typeof value === 'function') return value()
            if (value && typeof value === 'object' && 'value' in value) return value.value
            return value
          },
          watch: (_source, callback) => watchedCallbacks.push(callback),
        }
      }
      if (name === '@/api/growth') return { growthApi }
      if (name === '@/api/types') return {}
      throw new Error(`Unexpected effective-read dependency: ${name}`)
    },
    setInterval: (callback, delay) => {
      const id = nextTimerId++
      scheduledIntervals.set(id, { callback, delay })
      return id
    },
    setTimeout: (callback, delay) => {
      const id = nextTimerId++
      scheduledTimeouts.set(id, { callback, delay })
      return id
    },
    window: {
      addEventListener: (name, callback) => windowListeners.set(name, callback),
      innerHeight: 1000,
      removeEventListener: name => windowListeners.delete(name),
      scrollY: 0,
    },
  }
  sandbox.module.exports = sandbox.exports
  vm.runInNewContext(compileEffectiveRead(), sandbox)

  const result = sandbox.exports.useEffectiveRead(postId)
  const runOnlyInterval = () => {
    assert.equal(scheduledIntervals.size, 1, 'effective-read harness expects exactly one active interval')
    scheduledIntervals.values().next().value.callback()
  }
  const runOnlyTimeout = () => {
    assert.equal(scheduledTimeouts.size, 1, 'effective-read harness expects exactly one retry timeout')
    const [id, timer] = scheduledTimeouts.entries().next().value
    scheduledTimeouts.delete(id)
    timer.callback()
  }

  return {
    abandonRequests,
    completeRequests,
    heartbeatRequests,
    mount: () => mountedCallbacks[0](),
    postId,
    result,
    runOnlyInterval,
    runOnlyTimeout,
    scheduledIntervals,
    scheduledTimeouts,
    sessionRequests,
    setScrollY: value => {
      sandbox.window.scrollY = value
      windowListeners.get('scroll')?.()
    },
    setVisibility: value => {
      sandbox.document.visibilityState = value
      documentListeners.get('visibilitychange')?.()
    },
    triggerPageHide: () => windowListeners.get('pagehide')?.(),
    triggerWindow: name => windowListeners.get(name)?.(),
    triggerWatch: () => watchedCallbacks[0](),
    unmount: () => unmountedCallbacks[0](),
  }
}

const resolveSession = (request, token, overrides = {}) => {
  request.resolve({
    code: 0,
    data: {
      activeSeconds: 0,
      completed: false,
      heartbeatIntervalSeconds: 5,
      heartbeatTimeoutSeconds: 8,
      maxScrollPercent: 0,
      minimumActiveSeconds: 20,
      minimumScrollPercent: 60,
      nextHeartbeatSeq: 1,
      qualified: false,
      sessionToken: token,
      ...overrides,
    },
    message: 'ok',
  })
}

const resolveHeartbeat = (request, overrides = {}) => {
  request.resolve({
    code: 0,
    data: {
      accepted: true,
      activeSeconds: 5,
      completed: false,
      countingActive: true,
      maxScrollPercent: 10,
      nextHeartbeatSeq: Number(request.payload.heartbeatSeq) + 1,
      qualified: false,
      ...overrides,
    },
    message: 'ok',
  })
}

const transientError = () => {
  const error = new Error('service unavailable')
  error.code = 20500
  error.status = 503
  return error
}

const invalidSessionError = () => {
  const error = new Error('invalid effective-read state')
  error.code = 30002
  error.status = 409
  return error
}

const authorityHarness = createEffectiveReadHarness('post-authority')
authorityHarness.mount()
resolveSession(authorityHarness.sessionRequests[0], '0123456789abcdef0123456789abcdef')
await flushAsync()
assert.equal(authorityHarness.heartbeatRequests.length, 1, 'session start must immediately open an ACTIVE segment')
assert.deepEqual(
  JSON.parse(JSON.stringify(authorityHarness.heartbeatRequests[0].payload)),
  {
    activityState: 'ACTIVE',
    heartbeatSeq: 1,
    scrollPercent: 0,
    sessionToken: '0123456789abcdef0123456789abcdef',
  },
)
assert.equal(authorityHarness.scheduledIntervals.size, 1)
assert.equal(authorityHarness.scheduledIntervals.values().next().value.delay, 5000)
assert.equal(authorityHarness.result.activeSeconds.value, 0)
authorityHarness.runOnlyInterval()
assert.equal(authorityHarness.heartbeatRequests.length, 1, 'only one heartbeat may be in flight')
resolveHeartbeat(authorityHarness.heartbeatRequests[0], {
  activeSeconds: 5,
  maxScrollPercent: 20,
  nextHeartbeatSeq: 2,
})
await flushAsync()
assert.equal(authorityHarness.result.activeSeconds.value, 5, 'trusted active time must come from the server')
assert.equal(authorityHarness.result.scrollPercent.value, 20, 'trusted scroll progress must come from the server')
assert.equal(authorityHarness.completeRequests.length, 0, 'unqualified server progress must never complete')

authorityHarness.runOnlyInterval()
const retryPayload = JSON.parse(JSON.stringify(authorityHarness.heartbeatRequests[1].payload))
authorityHarness.heartbeatRequests[1].reject(transientError())
await flushAsync()
assert.equal(authorityHarness.scheduledTimeouts.size, 1)
authorityHarness.runOnlyTimeout()
assert.deepEqual(
  JSON.parse(JSON.stringify(authorityHarness.heartbeatRequests[2].payload)),
  retryPayload,
  'a failed heartbeat must retry the exact same sequence and payload',
)
resolveHeartbeat(authorityHarness.heartbeatRequests[2], {
  activeSeconds: 20,
  maxScrollPercent: 60,
  nextHeartbeatSeq: 3,
  qualified: true,
})
await flushAsync()
assert.equal(authorityHarness.completeRequests.length, 1, 'only server qualification may trigger completion')
assert.deepEqual(
  JSON.parse(JSON.stringify(authorityHarness.completeRequests[0].payload)),
  { sessionToken: '0123456789abcdef0123456789abcdef' },
  'completion must send only the opaque server session token',
)
authorityHarness.completeRequests[0].resolve({
  code: 0,
  data: { activeSeconds: 20, completed: true, maxScrollPercent: 60, recorded: true },
  message: 'ok',
})
await flushAsync()
assert.equal(authorityHarness.result.completed.value, true)
assert.equal(authorityHarness.scheduledIntervals.size, 0)
authorityHarness.unmount()
await flushAsync()
assert.equal(authorityHarness.abandonRequests.length, 0, 'completed reads must not be abandoned during cleanup')

const lifecycleHarness = createEffectiveReadHarness('post-lifecycle')
lifecycleHarness.mount()
resolveSession(lifecycleHarness.sessionRequests[0], '11111111111111111111111111111111')
await flushAsync()
resolveHeartbeat(lifecycleHarness.heartbeatRequests[0], { nextHeartbeatSeq: 2 })
await flushAsync()
lifecycleHarness.setVisibility('hidden')
assert.equal(lifecycleHarness.scheduledIntervals.size, 0, 'hidden pages must stop periodic ACTIVE heartbeats')
assert.equal(lifecycleHarness.heartbeatRequests.at(-1).payload.activityState, 'PAUSED')
assert.equal(lifecycleHarness.heartbeatRequests.at(-1).payload.heartbeatSeq, 2)
resolveHeartbeat(lifecycleHarness.heartbeatRequests.at(-1), {
  countingActive: false,
  nextHeartbeatSeq: 3,
})
await flushAsync()
lifecycleHarness.setVisibility('visible')
assert.equal(lifecycleHarness.heartbeatRequests.at(-1).payload.activityState, 'ACTIVE')
assert.equal(lifecycleHarness.heartbeatRequests.at(-1).payload.heartbeatSeq, 3)
assert.equal(lifecycleHarness.scheduledIntervals.size, 1, 'visible focused pages must resume the heartbeat timer')
resolveHeartbeat(lifecycleHarness.heartbeatRequests.at(-1), { nextHeartbeatSeq: 4 })
await flushAsync()
lifecycleHarness.triggerWindow('blur')
assert.equal(lifecycleHarness.heartbeatRequests.at(-1).payload.activityState, 'PAUSED', 'blur must close the active segment')
resolveHeartbeat(lifecycleHarness.heartbeatRequests.at(-1), {
  countingActive: false,
  nextHeartbeatSeq: 5,
})
await flushAsync()
lifecycleHarness.triggerWindow('focus')
assert.equal(lifecycleHarness.heartbeatRequests.at(-1).payload.activityState, 'ACTIVE', 'focus must reopen an active segment')
resolveHeartbeat(lifecycleHarness.heartbeatRequests.at(-1), { nextHeartbeatSeq: 6 })
await flushAsync()
lifecycleHarness.triggerPageHide()
assert.deepEqual(
  JSON.parse(JSON.stringify(lifecycleHarness.abandonRequests[0].payload)),
  { sessionToken: '11111111111111111111111111111111' },
  'pagehide must release the server session even when no further heartbeat can finish',
)
assert.equal(lifecycleHarness.scheduledIntervals.size, 0, 'pagehide must stop periodic heartbeats')

const changedStateRetryHarness = createEffectiveReadHarness('post-state-retry')
changedStateRetryHarness.mount()
resolveSession(changedStateRetryHarness.sessionRequests[0], '22222222222222222222222222222222')
await flushAsync()
const originalActivePayload = JSON.parse(JSON.stringify(changedStateRetryHarness.heartbeatRequests[0].payload))
changedStateRetryHarness.heartbeatRequests[0].reject(transientError())
await flushAsync()
changedStateRetryHarness.triggerWindow('blur')
changedStateRetryHarness.runOnlyTimeout()
assert.deepEqual(
  JSON.parse(JSON.stringify(changedStateRetryHarness.heartbeatRequests[1].payload)),
  originalActivePayload,
  'visibility changes must not mutate the payload of an unacknowledged sequence',
)
resolveHeartbeat(changedStateRetryHarness.heartbeatRequests[1], {
  accepted: false,
  countingActive: true,
  nextHeartbeatSeq: 2,
})
await flushAsync()
assert.equal(changedStateRetryHarness.heartbeatRequests[2].payload.activityState, 'PAUSED')
assert.equal(changedStateRetryHarness.heartbeatRequests[2].payload.heartbeatSeq, 2)

const routeHarness = createEffectiveReadHarness('post-route-a')
routeHarness.mount()
resolveSession(routeHarness.sessionRequests[0], '33333333333333333333333333333333')
await flushAsync()
routeHarness.postId.value = 'post-route-b'
routeHarness.triggerWatch()
assert.equal(routeHarness.heartbeatRequests[0].signal.aborted, true, 'route switch must abort the old heartbeat')
assert.deepEqual(
  JSON.parse(JSON.stringify(routeHarness.abandonRequests[0].payload)),
  { sessionToken: '33333333333333333333333333333333' },
  'route switch must release the unfinished server session',
)
assert.equal(routeHarness.sessionRequests.length, 2)
resolveSession(routeHarness.sessionRequests[1], '44444444444444444444444444444444')
await flushAsync()
routeHarness.heartbeatRequests[0].reject(new Error('old heartbeat aborted'))
await flushAsync()
assert.equal(routeHarness.scheduledTimeouts.size, 0, 'old route failures must stay inert')
assert.equal(routeHarness.heartbeatRequests.at(-1).payload.sessionToken, '44444444444444444444444444444444')

const refreshHarness = createEffectiveReadHarness('post-refresh')
refreshHarness.mount()
resolveSession(refreshHarness.sessionRequests[0], '55555555555555555555555555555555')
await flushAsync()
refreshHarness.heartbeatRequests[0].reject(invalidSessionError())
await flushAsync()
assert.equal(refreshHarness.sessionRequests.length, 2, 'invalid server sessions may be reacquired once')
resolveSession(refreshHarness.sessionRequests[1], '66666666666666666666666666666666')
await flushAsync()
refreshHarness.heartbeatRequests.at(-1).reject(invalidSessionError())
await flushAsync()
assert.equal(refreshHarness.sessionRequests.length, 2, 'invalid session replacement must be bounded')
assert.equal(refreshHarness.scheduledIntervals.size, 0)

const unmountHarness = createEffectiveReadHarness('post-unmount')
unmountHarness.mount()
resolveSession(unmountHarness.sessionRequests[0], '77777777777777777777777777777777')
await flushAsync()
unmountHarness.unmount()
assert.equal(unmountHarness.heartbeatRequests[0].signal.aborted, true, 'unmount must abort an in-flight heartbeat')
assert.deepEqual(
  JSON.parse(JSON.stringify(unmountHarness.abandonRequests[0].payload)),
  { sessionToken: '77777777777777777777777777777777' },
  'unmount must release the unfinished server session',
)
assert.equal(unmountHarness.scheduledIntervals.size, 0)
assert.equal(unmountHarness.scheduledTimeouts.size, 0)
unmountHarness.heartbeatRequests[0].reject(new Error('heartbeat aborted'))
await flushAsync()
assert.equal(unmountHarness.scheduledTimeouts.size, 0, 'aborted heartbeat failures must stay silent')

console.log('home/search trust and effective-read lifecycle guard passed')
