import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const requireFromProject = createRequire(import.meta.url)
const rootUrl = new URL('../', import.meta.url)
const read = relativePath => readFileSync(new URL(relativePath, rootUrl), 'utf8')

const compileCommonJs = (relativePath, replacements = []) => {
  let source = read(relativePath)
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

const authTokenSource = read('src/utils/authTokenStore.ts')
const clientSource = read('src/api/client.ts')
const authStoreSource = read('src/stores/auth.ts')
const useAuthSource = read('src/composables/useAuth.ts')
const infiniteFeedSource = read('src/composables/useInfiniteFeed.ts')
const postDetailSource = read('src/views/PostDetailView.vue')
const questionDetailSource = read('src/views/QuestionDetailView.vue')

assert.match(authTokenSource, /let sessionVersion = 0/)
assert.match(authTokenSource, /getVersion\(\) \{\s*return sessionVersion\s*\}/)
assert.match(
  authTokenSource,
  /if \(memoryToken !== token\) \{\s*sessionVersion \+= 1\s*\}[\s\S]*memoryToken = token/,
  'setting the same token must not advance the session version',
)
assert.match(
  authTokenSource,
  /if \(memoryToken !== null\) \{\s*sessionVersion \+= 1\s*\}[\s\S]*memoryToken = null/,
  'clearing an already empty store must not advance the session version',
)

assert.match(clientSource, /authSessionVersion\?: number/)
assert.match(
  clientSource,
  /config\.authSessionVersion = currentAuthSessionVersion\(\)/,
  'each request must capture its authentication session version',
)
assert.match(
  clientSource,
  /typeof requestVersion === 'number'[\s\S]*Number\.isSafeInteger\(requestVersion\)[\s\S]*requestVersion >= 0[\s\S]*requestVersion === currentAuthSessionVersion\(\)/,
  '401 ownership must require valid version metadata matching the current session',
)
assert.match(
  clientSource,
  /error\.response\?\.status === 401[\s\S]*!error\.config\?\.skipAuthRedirect[\s\S]*requestBelongsToCurrentAuthSession\(error\.config\?\.authSessionVersion\)/,
  '401 cleanup must require a foreground request owned by the current session',
)
assert.match(authStoreSource, /interface AuthHydrationOwner \{[\s\S]*requestId: number[\s\S]*token: string[\s\S]*sessionVersion: number[\s\S]*sessionGeneration: number/)
assert.match(authStoreSource, /const ownsSession = \([\s\S]*expectedToken: string[\s\S]*expectedVersion: number[\s\S]*expectedGeneration: number/)
assert.match(authStoreSource, /const sessionGeneration = ref\(0\)/)
assert.match(authStoreSource, /const getSessionGeneration = \(\) => sessionGeneration\.value/)
assert.match(
  authStoreSource,
  /const sessionQueryScope = computed\(\(\) => sessionGeneration\.value\)/,
  'session-bound queries must have a reactive logical-session scope',
)
assert.match(
  authStoreSource,
  /authTokenStore\.set\(newToken\)\s*clearSessionExpiredMarker\(\)\s*token\.value = newToken/,
  'installing a fresh session must clear a prior expired-session marker',
)
assert.match(
  authStoreSource,
  /if \(authTokenStore\.get\(\) === newToken\) \{\s*authTokenStore\.clear\(\)\s*\}/,
  'reinstalling the same token must still create a new logical session boundary',
)
assert.match(
  authStoreSource,
  /const hydrationOwnerIsCurrent = \(owner: AuthHydrationOwner\) => \([\s\S]*owner\.requestId === hydrateRequestId[\s\S]*ownsSession\(owner\.token, owner\.sessionVersion, owner\.sessionGeneration\)/,
  'hydrate ownership must bind the request id to the exact token session',
)
assert.match(
  authStoreSource,
  /const me = await authApi\.fetchMe\([^)]*\)\s*if \(!hydrationOwnerIsCurrent\(owner\)\) return/,
  'stale hydrate success must not replace the current user',
)
assert.match(
  authStoreSource,
  /\.catch\(\(error\) => \{\s*if \(!hydrationOwnerIsCurrent\(owner\)\) return/,
  'stale hydrate failure must not expire the current session',
)
assert.match(
  useAuthSource,
  /let authOperationRequestId = 0/,
  'login and logout operations must have a monotonic request owner',
)
assert.match(
  useAuthSource,
  /const result = await authApi\.login\(\{ account, password \}\)\.catch\(/,
  'login response ordering must be checked before installing a token',
)
assert.match(
  useAuthSource,
  /authStore\.setToken\(token\)\s*owner\.sessionGeneration = authStore\.getSessionGeneration\(\)\s*const sessionVersion = authTokenStore\.getVersion\(\)/,
  'login profile hydration must capture the installed logical session and token version',
)
assert.match(
  useAuthSource,
  /authStore\.ownsSession\(token, sessionVersion, owner\.sessionGeneration\)/,
  'login profile responses must belong to the installed logical session',
)
assert.match(
  useAuthSource,
  /if \(!me\.data\) \{\s*authStore\.logout\(\)\s*throw new Error\('账号资料为空，请重新登录。'\)/,
  'an empty login profile must fail closed instead of leaving auth loading forever',
)
assert.match(
  useAuthSource,
  /const owner = beginAuthOperation\(\)\s*const token = authTokenStore\.get\(\)[\s\S]*await authApi\.logout\(\)[\s\S]*requireCurrentAuthOperation\(owner\)[\s\S]*authStore\.logout\(\)/,
  'logout responses must be owned before clearing the local session',
)
assert.match(
  infiniteFeedSource,
  /queryKey: computed\(\(\) => \['feed', currentFeed\.value, currentDomain\.value, authStore\.sessionQueryScope\]\)/,
  'feed queries must not retain another account session as an active observer result',
)
assert.match(
  postDetailSource,
  /queryKey: computed\(\(\) => \['post', postId\.value, authStore\.sessionQueryScope\]\)/,
  'post detail queries must be isolated by logical session',
)
assert.match(
  postDetailSource,
  /queryKey: computed\(\(\) => \['post-publish-status', postId\.value, authStore\.sessionQueryScope\]\)/,
  'post publication state must be isolated by logical session',
)
assert.match(
  questionDetailSource,
  /queryKey: computed\(\(\) => \['question', questionId\.value, authStore\.sessionQueryScope\]\)/,
  'personalized question detail must be isolated by logical session',
)

const sessionStorageValues = new Map()
const authTokenSandbox = {
  exports: {},
  module: { exports: {} },
  window: {
    localStorage: {
      removeItem: () => {},
    },
    sessionStorage: {
      getItem: key => sessionStorageValues.get(key) ?? null,
      removeItem: key => sessionStorageValues.delete(key),
      setItem: (key, value) => sessionStorageValues.set(key, value),
    },
  },
}
authTokenSandbox.module.exports = authTokenSandbox.exports
vm.runInNewContext(compileCommonJs('src/utils/authTokenStore.ts'), authTokenSandbox)

const realStore = authTokenSandbox.exports.authTokenStore
assert.equal(realStore.getVersion(), 0)
realStore.set('session-a')
assert.equal(realStore.getVersion(), 1)
realStore.set('session-a')
assert.equal(realStore.getVersion(), 1, 'repeating the same token must be version-idempotent')
realStore.set('session-b')
assert.equal(realStore.getVersion(), 2)
realStore.clear()
assert.equal(realStore.getVersion(), 3)
realStore.clear()
assert.equal(realStore.getVersion(), 3, 'repeating clear on an empty store must be version-idempotent')

const wrappedErrorAdapter = (beforeThrow = () => {}) => async (config) => {
  beforeThrow(config)
  const error = new Error('HTTP 401')
  error.config = config
  error.isAxiosError = true
  error.response = {
    config,
    data: {
      code: 10401,
      message: 'expired',
      data: null,
    },
    headers: {},
    status: 401,
    statusText: '401',
  }
  throw error
}

let activeToken = 'session-a'
let activeVersion = 1
let tokenChangeCount = 0
let logoutCount = 0
const redirects = []

const authTokenStore = {
  clear: () => {
    if (activeToken !== null) {
      activeToken = null
      activeVersion += 1
      tokenChangeCount += 1
    }
  },
  get: () => activeToken,
  getVersion: () => activeVersion,
}

const clientSandbox = {
  URL,
  crypto: globalThis.crypto,
  exports: {},
  module: { exports: {} },
  Promise,
  require: (name) => {
    if (name === 'axios') return requireFromProject('axios')
    if (name === '@/utils/authTokenStore') return { authTokenStore }
    if (name === '@/stores/auth') {
      return {
        useAuthStore: () => ({
          expireSession: () => {
            logoutCount += 1
            authTokenStore.clear()
          },
        }),
      }
    }
    if (name === '@/utils/navigation') return { safeRedirect: value => value }
    // 会话过期通知桥：沙箱里没有 SPA 路由处理器，返回 false 让 client 走 window.location 硬跳转兜底，
    // 以便下面对 redirects 的断言仍然成立。
    if (name === '@/utils/sessionExpiry') {
      return {
        notifySessionExpired: async () => false,
        registerSessionExpiredHandler: () => {},
      }
    }
    throw new Error(`Unexpected client dependency: ${name}`)
  },
  window: {
    location: {
      assign: target => redirects.push(target),
      hash: '',
      pathname: '/me',
      search: '',
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

const expectUnauthorized = request => assert.rejects(
  request,
  error => error?.status === 401 || error?.response?.status === 401,
)

await expectUnauthorized(() => client.get('/silent', {
  adapter: wrappedErrorAdapter(),
  skipAuthRedirect: true,
}))
assert.equal(tokenChangeCount, 0)
assert.equal(logoutCount, 0)
assert.equal(redirects.length, 0)

await expectUnauthorized(() => client.get('/missing-owner', {
  adapter: wrappedErrorAdapter(config => {
    delete config.authSessionVersion
  }),
}))
assert.equal(tokenChangeCount, 0, 'missing request ownership metadata must not clear the session')
assert.equal(logoutCount, 0)
assert.equal(redirects.length, 0)

await expectUnauthorized(() => client.get('/stale-owner', {
  adapter: wrappedErrorAdapter(() => {
    activeToken = 'session-b'
    activeVersion += 1
  }),
}))
assert.equal(tokenChangeCount, 0, 'an old request must not clear the newer session')
assert.equal(logoutCount, 0)
assert.equal(redirects.length, 0)

const ownedVersion = activeVersion
await expectUnauthorized(() => client.get('/current-owner', {
  adapter: wrappedErrorAdapter(),
}))
assert.equal(tokenChangeCount, 1, 'a current-session 401 must clear its token once')
assert.equal(activeVersion, ownedVersion + 1, 'logout must not advance the version a second time')
assert.equal(logoutCount, 1)
assert.equal(redirects.length, 1)

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const waitFor = async (predicate, message) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (predicate()) return
    await Promise.resolve()
  }
  assert.fail(message)
}

const createAuthStoreRuntime = (initialToken) => {
  let runtimeToken = initialToken
  let runtimeVersion = 0
  let clearCount = 0
  let expiredMarkerCount = 0
  const sessionMarkers = new Map()
  const fetchMeRequests = []
  const runtimeTokenStore = {
    clearLegacyLocalToken: () => {},
    get: () => runtimeToken,
    getVersion: () => runtimeVersion,
    set: value => {
      if (runtimeToken !== value) runtimeVersion += 1
      runtimeToken = value
    },
    clear: () => {
      if (runtimeToken !== null) {
        runtimeVersion += 1
        clearCount += 1
      }
      runtimeToken = null
    },
  }
  const runtimeAuthApi = {
    fetchMe: () => {
      const request = deferred()
      fetchMeRequests.push(request)
      return request.promise
    },
  }
  let storeInstance
  const authStoreSandbox = {
    exports: {},
    module: { exports: {} },
    Promise,
    require: (name) => {
      if (name === 'pinia') {
        return {
          defineStore: (_id, setup) => () => {
            if (!storeInstance) storeInstance = setup()
            return storeInstance
          },
        }
      }
      if (name === 'vue') {
        return {
          computed: getter => ({
            get value() {
              return getter()
            },
          }),
          ref: value => ({ value }),
        }
      }
      if (name === '@/api/auth') return { authApi: runtimeAuthApi }
      if (name === '@/utils/authTokenStore') return { authTokenStore: runtimeTokenStore }
      if (name === '@/utils/pendingInteraction') {
        return {
          claimPendingInteraction: () => {},
          clearPendingInteraction: () => {},
        }
      }
      if (name === '@/utils/welcomeOnboarding') {
        return { clearWelcomeOnboarding: () => {} }
      }
      if (name === '@/lib/queryClient') {
        return { resetSessionQueryState: () => {} }
      }
      if (name === '@/utils/safeStorage') {
        return {
          safeStorage: {
            clearSensitive: () => {},
            sessionGet: key => sessionMarkers.get(key) ?? null,
            sessionRemove: key => {
              sessionMarkers.delete(key)
            },
            sessionSet: (key, value) => {
              expiredMarkerCount += 1
              sessionMarkers.set(key, value)
            },
          },
        }
      }
      throw new Error(`Unexpected auth store dependency: ${name}`)
    },
  }
  authStoreSandbox.module.exports = authStoreSandbox.exports
  vm.runInNewContext(compileCommonJs('src/stores/auth.ts'), authStoreSandbox)
  return {
    store: authStoreSandbox.exports.useAuthStore(),
    fetchMeRequests,
    getClearCount: () => clearCount,
    getToken: () => runtimeToken,
    getVersion: () => runtimeVersion,
    getExpiredMarkerCount: () => expiredMarkerCount,
    hasExpiredMarker: () => sessionMarkers.has('offerlab.auth.session-expired'),
    clearTokenExternally: () => runtimeTokenStore.clear(),
  }
}

const hydrateSuccessRuntime = createAuthStoreRuntime('session-a')
const staleHydrateSuccess = hydrateSuccessRuntime.store.hydrate()
await waitFor(
  () => hydrateSuccessRuntime.fetchMeRequests.length === 1,
  'first hydrate request was not started',
)
hydrateSuccessRuntime.store.setToken('session-b')
const currentHydrateSuccess = hydrateSuccessRuntime.store.hydrate()
await waitFor(
  () => hydrateSuccessRuntime.fetchMeRequests.length === 2,
  'replacement hydrate request was not started',
)
hydrateSuccessRuntime.fetchMeRequests[0].resolve({ data: { uid: 'old-user' } })
await staleHydrateSuccess
assert.equal(hydrateSuccessRuntime.store.user.value, null, 'stale hydrate success must not install an old user')
assert.equal(hydrateSuccessRuntime.store.loading.value, true, 'stale finally must not finish the current hydrate')
assert.equal(hydrateSuccessRuntime.store.ready.value, false)
hydrateSuccessRuntime.fetchMeRequests[1].resolve({ data: { uid: 'current-user' } })
await currentHydrateSuccess
assert.equal(hydrateSuccessRuntime.store.user.value.uid, 'current-user')
assert.equal(hydrateSuccessRuntime.store.loading.value, false)
assert.equal(hydrateSuccessRuntime.store.ready.value, true)

const hydrateFailureRuntime = createAuthStoreRuntime('session-a')
const staleHydrateFailure = hydrateFailureRuntime.store.hydrate()
await waitFor(
  () => hydrateFailureRuntime.fetchMeRequests.length === 1,
  'stale 401 hydrate request was not started',
)
hydrateFailureRuntime.store.setToken('session-b')
const currentHydrateAfterFailure = hydrateFailureRuntime.store.hydrate()
await waitFor(
  () => hydrateFailureRuntime.fetchMeRequests.length === 2,
  'current hydrate after stale 401 was not started',
)
hydrateFailureRuntime.fetchMeRequests[0].reject({
  response: { status: 401, data: { code: 10401 } },
})
await staleHydrateFailure
assert.equal(hydrateFailureRuntime.getToken(), 'session-b', 'stale hydrate 401 must preserve the new token')
assert.equal(hydrateFailureRuntime.getClearCount(), 0)
assert.equal(hydrateFailureRuntime.store.loading.value, true, 'stale 401 finally must not finish the current hydrate')
hydrateFailureRuntime.fetchMeRequests[1].resolve({ data: { uid: 'current-user' } })
await currentHydrateAfterFailure
assert.equal(hydrateFailureRuntime.store.user.value.uid, 'current-user')

const sameTokenRuntime = createAuthStoreRuntime('session-a')
const staleSameTokenHydrate = sameTokenRuntime.store.hydrate()
await waitFor(
  () => sameTokenRuntime.fetchMeRequests.length === 1,
  'same-token hydrate request was not started',
)
const sameTokenVersion = sameTokenRuntime.getVersion()
sameTokenRuntime.store.setToken('session-a')
assert.ok(sameTokenRuntime.getVersion() > sameTokenVersion, 'same-token session replacement must invalidate old request metadata')
const currentSameTokenHydrate = sameTokenRuntime.store.hydrate()
await waitFor(
  () => sameTokenRuntime.fetchMeRequests.length === 2,
  'replacement same-token hydrate request was not started',
)
sameTokenRuntime.fetchMeRequests[0].resolve({ data: { uid: 'old-user' } })
await staleSameTokenHydrate
assert.equal(sameTokenRuntime.store.user.value, null)
sameTokenRuntime.fetchMeRequests[1].resolve({ data: { uid: 'current-user' } })
await currentSameTokenHydrate
assert.equal(sameTokenRuntime.store.user.value.uid, 'current-user')

const interceptor401Runtime = createAuthStoreRuntime('session-a')
const interceptor401Hydrate = interceptor401Runtime.store.hydrate()
await waitFor(
  () => interceptor401Runtime.fetchMeRequests.length === 1,
  'current hydrate request for interceptor 401 was not started',
)
interceptor401Runtime.clearTokenExternally()
interceptor401Runtime.store.logout()
assert.equal(interceptor401Runtime.store.hydrationState.value, 'expired')
assert.equal(interceptor401Runtime.getExpiredMarkerCount(), 1)
assert.equal(interceptor401Runtime.hasExpiredMarker(), true)
interceptor401Runtime.fetchMeRequests[0].reject({
  response: { status: 401, data: { code: 10401 } },
})
await interceptor401Hydrate
assert.equal(interceptor401Runtime.store.hydrationState.value, 'expired')
interceptor401Runtime.store.setToken('session-b')
assert.equal(interceptor401Runtime.hasExpiredMarker(), false, 'a successful new login must clear an old expired-session marker')

const createUseAuthRuntime = ({ deferLogin = false, deferLogout = false } = {}) => {
  let runtimeToken = null
  let runtimeVersion = 0
  let runtimeGeneration = 0
  let logoutCount = 0
  const users = []
  const fetchMeRequests = []
  const loginRequests = []
  const logoutRequests = []
  const runtimeTokenStore = {
    getVersion: () => runtimeVersion,
    get: () => runtimeToken,
  }
  const runtimeStore = {
    token: null,
    getSessionGeneration: () => runtimeGeneration,
    setToken: value => {
      if (runtimeToken !== value) runtimeVersion += 1
      runtimeGeneration += 1
      runtimeToken = value
      runtimeStore.token = value
    },
    ownsSession: (expectedToken, expectedVersion, expectedGeneration) => (
      runtimeToken === expectedToken
      && runtimeVersion === expectedVersion
      && runtimeGeneration === expectedGeneration
    ),
    setUser: value => users.push(value),
    logout: () => {
      logoutCount += 1
      if (runtimeToken !== null) runtimeVersion += 1
      runtimeGeneration += 1
      runtimeToken = null
      runtimeStore.token = null
    },
  }
  const runtimeAuthApi = {
    login: ({ account }) => {
      if (!deferLogin) return Promise.resolve({ data: { token: `token-${account}` } })
      const request = deferred()
      loginRequests.push({ account, ...request })
      return request.promise
    },
    fetchMe: () => {
      const request = deferred()
      fetchMeRequests.push(request)
      return request.promise
    },
    logout: () => {
      if (!deferLogout) return Promise.resolve()
      const request = deferred()
      logoutRequests.push(request)
      return request.promise
    },
    register: () => Promise.resolve(),
  }
  const useAuthSandbox = {
    exports: {},
    module: { exports: {} },
    Promise,
    require: (name) => {
      if (name === '@/stores/auth') return { useAuthStore: () => runtimeStore }
      if (name === '@/api/auth') return { authApi: runtimeAuthApi }
      if (name === '@/utils/authTokenStore') return { authTokenStore: runtimeTokenStore }
      throw new Error(`Unexpected useAuth dependency: ${name}`)
    },
  }
  useAuthSandbox.module.exports = useAuthSandbox.exports
  vm.runInNewContext(compileCommonJs('src/composables/useAuth.ts'), useAuthSandbox)
  return {
    auth: useAuthSandbox.exports.useAuth(),
    fetchMeRequests,
    getLogoutCount: () => logoutCount,
    getToken: () => runtimeToken,
    users,
    loginRequests,
    logoutRequests,
  }
}

const loginSuccessRuntime = createUseAuthRuntime()
const staleLoginSuccess = loginSuccessRuntime.auth.login('old', 'password')
await waitFor(
  () => loginSuccessRuntime.fetchMeRequests.length === 1,
  'first login profile request was not started',
)
const currentLoginSuccess = loginSuccessRuntime.auth.login('current', 'password')
await waitFor(
  () => loginSuccessRuntime.fetchMeRequests.length === 2,
  'replacement login profile request was not started',
)
loginSuccessRuntime.fetchMeRequests[0].resolve({ data: { uid: 'old-user' } })
await assert.rejects(staleLoginSuccess, error => error?.name === 'AuthOperationSupersededError')
assert.equal(loginSuccessRuntime.users.length, 0, 'stale login profile success must not install an old user')
assert.equal(loginSuccessRuntime.getToken(), 'token-current')
loginSuccessRuntime.fetchMeRequests[1].resolve({ data: { uid: 'current-user' } })
await currentLoginSuccess
assert.deepEqual(loginSuccessRuntime.users.map(user => user.uid), ['current-user'])

const loginFailureRuntime = createUseAuthRuntime()
const staleLoginFailure = loginFailureRuntime.auth.login('old', 'password')
await waitFor(
  () => loginFailureRuntime.fetchMeRequests.length === 1,
  'stale login failure request was not started',
)
const currentLoginAfterFailure = loginFailureRuntime.auth.login('current', 'password')
await waitFor(
  () => loginFailureRuntime.fetchMeRequests.length === 2,
  'current login after stale failure was not started',
)
loginFailureRuntime.fetchMeRequests[0].reject(new Error('old profile failed'))
await assert.rejects(staleLoginFailure, error => error?.name === 'AuthOperationSupersededError')
assert.equal(loginFailureRuntime.getLogoutCount(), 0, 'stale login profile failure must not log out the new session')
assert.equal(loginFailureRuntime.getToken(), 'token-current')
loginFailureRuntime.fetchMeRequests[1].resolve({ data: { uid: 'current-user' } })
await currentLoginAfterFailure
assert.deepEqual(loginFailureRuntime.users.map(user => user.uid), ['current-user'])

const loginOrderingRuntime = createUseAuthRuntime({ deferLogin: true })
const oldLogin = loginOrderingRuntime.auth.login('old', 'password')
const currentLogin = loginOrderingRuntime.auth.login('current', 'password')
await waitFor(
  () => loginOrderingRuntime.loginRequests.length === 2,
  'out-of-order login requests were not started',
)
loginOrderingRuntime.loginRequests[1].resolve({ data: { token: 'token-current' } })
await waitFor(
  () => loginOrderingRuntime.fetchMeRequests.length === 1,
  'newer login profile request was not started',
)
loginOrderingRuntime.fetchMeRequests[0].resolve({ data: { uid: 'current-user' } })
await currentLogin
loginOrderingRuntime.loginRequests[0].resolve({ data: { token: 'token-old' } })
await assert.rejects(oldLogin, error => error?.name === 'AuthOperationSupersededError')
assert.equal(loginOrderingRuntime.getToken(), 'token-current')

const currentLoginFailureRuntime = createUseAuthRuntime()
const currentLoginFailure = currentLoginFailureRuntime.auth.login('current', 'password')
await waitFor(
  () => currentLoginFailureRuntime.fetchMeRequests.length === 1,
  'current login failure request was not started',
)
currentLoginFailureRuntime.fetchMeRequests[0].reject({
  response: { status: 401, data: { code: 10401 } },
})
await assert.rejects(
  currentLoginFailure,
  error => error?.response?.status === 401,
)
assert.equal(currentLoginFailureRuntime.getLogoutCount(), 1)
assert.equal(currentLoginFailureRuntime.getToken(), null)

const emptyProfileRuntime = createUseAuthRuntime()
const emptyProfileLogin = emptyProfileRuntime.auth.login('current', 'password')
await waitFor(
  () => emptyProfileRuntime.fetchMeRequests.length === 1,
  'empty profile request was not started',
)
emptyProfileRuntime.fetchMeRequests[0].resolve({ data: null })
await assert.rejects(emptyProfileLogin, /账号资料为空/)
assert.equal(emptyProfileRuntime.getLogoutCount(), 1)
assert.equal(emptyProfileRuntime.getToken(), null)

const logoutOrderingRuntime = createUseAuthRuntime({ deferLogout: true })
const establishedLogin = logoutOrderingRuntime.auth.login('current', 'password')
await waitFor(
  () => logoutOrderingRuntime.fetchMeRequests.length === 1,
  'login before logout ordering test was not started',
)
logoutOrderingRuntime.fetchMeRequests[0].resolve({ data: { uid: 'current-user' } })
await establishedLogin
const oldLogout = logoutOrderingRuntime.auth.logout()
await waitFor(
  () => logoutOrderingRuntime.logoutRequests.length === 1,
  'logout request was not started',
)
const replacementLogin = logoutOrderingRuntime.auth.login('replacement', 'password')
await waitFor(
  () => logoutOrderingRuntime.fetchMeRequests.length === 2,
  'replacement login after logout was not started',
)
logoutOrderingRuntime.fetchMeRequests[1].resolve({ data: { uid: 'replacement-user' } })
await replacementLogin
logoutOrderingRuntime.logoutRequests[0].resolve({ data: null })
await assert.rejects(oldLogout, error => error?.name === 'AuthOperationSupersededError')
assert.equal(logoutOrderingRuntime.getToken(), 'token-replacement')

console.log('V13 authentication request ownership guard passed.')
