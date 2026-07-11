import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createRequire } from 'node:module'

const requireFromProject = createRequire(import.meta.url)
const rootUrl = new URL('../', import.meta.url)

const compileCommonJs = (relativePath, replacements = []) => {
  let source = readFileSync(new URL(relativePath, rootUrl), 'utf8')
  for (const [pattern, replacement] of replacements) {
    source = source.replace(pattern, replacement)
  }
  return ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
}

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
  return { promise, resolve, reject }
}

const wrappedErrorAdapter = (status, data) => async (config) => {
  const error = new Error(`HTTP ${status}`)
  error.config = config
  error.isAxiosError = true
  error.response = {
    config,
    data,
    headers: {},
    status,
    statusText: String(status),
  }
  throw error
}

const clientRedirects = []
let tokenClearCount = 0
let logoutCount = 0
const clientSandbox = {
  AbortController,
  URL,
  crypto: globalThis.crypto,
  exports: {},
  module: { exports: {} },
  Promise,
  require: (name) => {
    if (name === 'axios') return requireFromProject('axios')
    if (name === '@/utils/authTokenStore') {
      return {
        authTokenStore: {
          clear: () => { tokenClearCount += 1 },
          get: () => 'token',
        },
      }
    }
    if (name === '@/stores/auth') {
      return { useAuthStore: () => ({ logout: () => { logoutCount += 1 } }) }
    }
    if (name === '@/utils/navigation') {
      return { safeRedirect: value => value }
    }
    throw new Error(`Unexpected client dependency: ${name}`)
  },
  window: {
    location: {
      assign: target => clientRedirects.push(target),
      hash: '',
      pathname: '/editor',
      search: '?draft=1',
    },
  },
}
clientSandbox.module.exports = clientSandbox.exports

const clientCode = compileCommonJs('src/api/client.ts', [
  [/import\.meta\.env\.VITE_API_BASE_URL/g, "''"],
  [/import\.meta\.env\.DEV/g, 'false'],
])
vm.runInNewContext(clientCode, clientSandbox)

const client = clientSandbox.exports.default
const { BizException } = clientSandbox.exports
const conflictPayload = {
  code: 30001,
  message: 'duplicate report',
  data: { reportId: 'r-1' },
  traceId: 'trace-conflict',
}

await assert.rejects(
  () => client.get('/conflict', { adapter: wrappedErrorAdapter(409, conflictPayload) }),
  error => {
    assert.equal(error instanceof BizException, true)
    assert.equal(error.code, 30001)
    assert.equal(error.status, 409)
    assert.equal(error.traceId, 'trace-conflict')
    assert.deepEqual(error.data, { reportId: 'r-1' })
    return true
  },
)

await assert.rejects(
  () => client.get('/service-error', {
    adapter: wrappedErrorAdapter(503, {
      code: 20500,
      message: 'dependency unavailable',
      traceId: 'trace-service',
    }),
  }),
  error => error instanceof BizException
    && error.code === 20500
    && error.status === 503
    && error.data === undefined,
)

await assert.rejects(
  () => client.get('/background-auth', {
    adapter: wrappedErrorAdapter(401, {
      code: 10401,
      message: 'expired',
      data: null,
      traceId: 'trace-background',
    }),
    skipAuthRedirect: true,
  }),
  error => error instanceof BizException && error.status === 401 && error.traceId === 'trace-background',
)
assert.equal(tokenClearCount, 0, 'silent background 401 must not clear global auth')
assert.equal(logoutCount, 0, 'silent background 401 must not log out the active store')
assert.equal(clientRedirects.length, 0, 'silent background 401 must not redirect')

await assert.rejects(
  () => client.get('/foreground-auth', {
    adapter: wrappedErrorAdapter(401, {
      code: 10401,
      message: 'expired',
      data: null,
      traceId: 'trace-foreground',
    }),
  }),
  error => error instanceof BizException && error.status === 401,
)
assert.equal(tokenClearCount, 1, 'foreground 401 must clear token storage')
assert.equal(logoutCount, 1, 'foreground 401 must log out the auth store')
assert.equal(clientRedirects.length, 1, 'foreground 401 must redirect to login once')

const notificationCalls = []
const notificationClient = {
  get: async (url, config = {}) => {
    notificationCalls.push({ config, url })
    return {
      code: 0,
      data: url.endsWith('realtime-status')
        ? { pollIntervalSeconds: 20, serverTime: 1, unread: {}, websocketEnabled: false }
        : {},
      message: 'ok',
    }
  },
  post: async () => ({ code: 0, data: null, message: 'ok' }),
  put: async () => ({ code: 0, data: null, message: 'ok' }),
}
const notificationSandbox = {
  AbortSignal,
  Date,
  exports: {},
  module: { exports: {} },
  require: (name) => {
    if (name === './client') return { __esModule: true, default: notificationClient }
    if (name === './adapters') {
      return {
        adaptNotification: value => value,
        adaptPage: value => value,
      }
    }
    if (name === './types') return {}
    throw new Error(`Unexpected notification dependency: ${name}`)
  },
}
notificationSandbox.module.exports = notificationSandbox.exports
vm.runInNewContext(compileCommonJs('src/api/notification.ts'), notificationSandbox)

const notificationApi = notificationSandbox.exports.notificationApi
const notificationAbort = new AbortController()
await notificationApi.getRealtimeStatus({ signal: notificationAbort.signal })
await notificationApi.getUnreadCount({ signal: notificationAbort.signal, skipAuthRedirect: true })
await notificationApi.getUnreadCount()
assert.equal(notificationCalls[0].config.skipAuthRedirect, true)
assert.equal(notificationCalls[0].config.signal, notificationAbort.signal)
assert.equal(notificationCalls[1].config.skipAuthRedirect, true)
assert.equal(notificationCalls[2].config.skipAuthRedirect, undefined)

const authStore = { token: 'token-a' }
const realtimeStatusCalls = []
const unreadCalls = []
const statusUpdates = []
const connectionUpdates = []
const scheduledTimeouts = new Map()
const scheduledIntervals = new Map()
const mountedCallbacks = []
const unmountedCallbacks = []
const watchedCallbacks = []
let nextTimerId = 1

const realtimeStore = {
  connected: false,
  lastSyncedAt: 0,
  pollIntervalSeconds: 20,
  reset: () => {},
  setConnected: value => connectionUpdates.push(value),
  setRealtimeStatus: value => {
    statusUpdates.push(value)
    realtimeStore.pollIntervalSeconds = value.pollIntervalSeconds
    realtimeStore.websocketEnabled = value.websocketEnabled
  },
  setUnreadCount: () => {},
  pushNotification: () => {},
  unreadCount: { total: 0 },
  websocketEnabled: false,
}

const realtimeNotificationApi = {
  getRealtimeStatus: (options) => {
    realtimeStatusCalls.push(options)
    return [firstStatus, secondStatus, thirdStatus][realtimeStatusCalls.length - 1].promise
  },
  getUnreadCount: (options) => {
    unreadCalls.push(options)
    return Promise.reject(new Error('fallback should not run in this scenario'))
  },
}
const firstStatus = deferred()
const secondStatus = deferred()
const thirdStatus = deferred()

class FakeWebSocket {
  static instances = []
  constructor(url) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  close() {
    this.closed = true
  }
  send() {}
}

const realtimeSandbox = {
  AbortController,
  ArrayBuffer,
  Date,
  Promise,
  URL,
  WebSocket: FakeWebSocket,
  clearInterval: id => scheduledIntervals.delete(id),
  clearTimeout: id => scheduledTimeouts.delete(id),
  exports: {},
  module: { exports: {} },
  require: (name) => {
    if (name === 'vue') {
      return {
        computed: getter => ({ get value() { return getter() } }),
        onMounted: callback => mountedCallbacks.push(callback),
        onUnmounted: callback => unmountedCallbacks.push(callback),
        ref: value => ({ value }),
        watch: (_source, callback) => watchedCallbacks.push(callback),
      }
    }
    if (name === '@/api/notification') return { notificationApi: realtimeNotificationApi }
    if (name === '@/api/adapters') return { adaptNotification: value => value }
    if (name === '@/stores/auth') return { useAuthStore: () => authStore }
    if (name === '@/stores/realtime') return { useRealtimeStore: () => realtimeStore }
    if (name === '@/lib/packet-codec') {
      return {
        Command: { AUTH_REQ: 1, NOTIF_PUSH: 3, PING: 5, UNREAD_COUNT: 4 },
        decodePacket: value => value,
        encodePacket: () => new ArrayBuffer(0),
      }
    }
    throw new Error(`Unexpected realtime dependency: ${name}`)
  },
  setInterval: callback => {
    const id = nextTimerId++
    scheduledIntervals.set(id, callback)
    return id
  },
  setTimeout: callback => {
    const id = nextTimerId++
    scheduledTimeouts.set(id, callback)
    return id
  },
  window: {
    location: {
      host: 'offerlab.test',
      protocol: 'https:',
    },
  },
}
realtimeSandbox.module.exports = realtimeSandbox.exports
const realtimeCode = compileCommonJs('src/composables/useRealtime.ts', [
  [/import\.meta\.env\.VITE_WS_URL/g, "''"],
])
vm.runInNewContext(realtimeCode, realtimeSandbox)

realtimeSandbox.exports.useRealtime()
mountedCallbacks[0]()
assert.equal(realtimeStatusCalls.length, 1)
assert.equal(realtimeStatusCalls[0].signal.aborted, false)

authStore.token = 'token-b'
watchedCallbacks[0]()
assert.equal(realtimeStatusCalls[0].signal.aborted, true, 'token switch must abort the old request')
assert.equal(realtimeStatusCalls.length, 2, 'token switch must start a fresh generation')

secondStatus.resolve({
  code: 0,
  data: {
    pollIntervalSeconds: 30,
    serverTime: 2,
    unread: { total: 2 },
    websocketEnabled: false,
  },
})
await flushAsync()
assert.equal(statusUpdates.length, 1)
assert.equal(statusUpdates[0].unread.total, 2)
assert.equal(scheduledTimeouts.size, 1, 'current generation must schedule exactly one next poll')

firstStatus.resolve({
  code: 0,
  data: {
    pollIntervalSeconds: 10,
    serverTime: 1,
    unread: { total: 99 },
    websocketEnabled: true,
  },
})
await flushAsync()
assert.equal(statusUpdates.length, 1, 'late response from the previous token must be ignored')
assert.equal(FakeWebSocket.instances.length, 0, 'stale response must not open a WebSocket')
assert.equal(scheduledTimeouts.size, 1, 'stale request completion must not add a poll timer')

const [nextPollTimerId, nextPollCallback] = scheduledTimeouts.entries().next().value
scheduledTimeouts.delete(nextPollTimerId)
nextPollCallback()
assert.equal(realtimeStatusCalls.length, 3, 'scheduled polling must start the next cancellable request')

unmountedCallbacks[0]()
assert.equal(realtimeStatusCalls[2].signal.aborted, true, 'unmount must abort the current generation')
assert.equal(scheduledTimeouts.size, 0, 'unmount must clear scheduled polling')
thirdStatus.reject(new Error('request aborted'))
await flushAsync()
assert.equal(unreadCalls.length, 0, 'an aborted realtime request must not start fallback polling')
assert.equal(scheduledTimeouts.size, 0, 'an aborted request must not re-arm polling after unmount')

const infiniteQueryCalls = []
const infiniteData = {
  value: {
    pages: Array.from({ length: 8 }, (_, index) => ({
      data: { items: [`post-${index}`] },
    })),
  },
}
const infiniteSandbox = {
  exports: {},
  module: { exports: {} },
  require: (name) => {
    if (name === 'vue') {
      return {
        computed: getter => ({ get value() { return getter() } }),
        unref: value => value && typeof value === 'object' && 'value' in value ? value.value : value,
      }
    }
    if (name === '@tanstack/vue-query') {
      return {
        useInfiniteQuery: options => {
          infiniteQueryCalls.push(options)
          return {
            data: infiniteData,
            error: { value: null },
            fetchNextPage: () => {},
            hasNextPage: { value: true },
            isError: { value: false },
            isFetching: { value: false },
            isLoading: { value: false },
            refetch: () => {},
          }
        },
      }
    }
    if (name === '@/api/feed') {
      const getFeed = async (...args) => args
      return {
        feedApi: {
          following: getFeed,
          getFeatured: getFeed,
          getFollowing: getFeed,
          getHot: getFeed,
          getLatest: getFeed,
          getRecommend: getFeed,
          hot: getFeed,
          latest: getFeed,
          recommend: getFeed,
        },
      }
    }
    throw new Error(`Unexpected infinite-feed dependency: ${name}`)
  },
}
infiniteSandbox.module.exports = infiniteSandbox.exports
vm.runInNewContext(compileCommonJs('src/composables/useInfiniteFeed.ts'), infiniteSandbox)

const infiniteFeed = infiniteSandbox.exports.useInfiniteFeed('latest', 7)
assert.equal(infiniteQueryCalls.length, 1)
assert.equal(infiniteQueryCalls[0].maxPages, 6, 'TanStack Query must evict pages beyond the cache cap')
assert.deepEqual(
  Array.from(infiniteFeed.posts.value),
  ['post-2', 'post-3', 'post-4', 'post-5', 'post-6', 'post-7'],
  'rendered posts must retain only the newest capped pages',
)

console.log('core request and lifecycle behavior tests passed')
