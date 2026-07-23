import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types'
import { authTokenStore } from '@/utils/authTokenStore'
import { safeStorage } from '@/utils/safeStorage'

export type AuthHydrationState =
  | 'anonymous'
  | 'hydrating'
  | 'authenticated'
  | 'expired'
  | 'failed'

const SESSION_EXPIRED_KEY = 'offerlab.auth.session-expired'

interface AuthHydrationOwner {
  requestId: number
  token: string
  sessionVersion: number
  sessionGeneration: number
}

const isAuthExpiredError = (error: unknown) => {
  const candidate = error as {
    code?: unknown
    status?: unknown
    response?: { status?: unknown; data?: { code?: unknown } }
  } | null | undefined
  const status = Number(candidate?.response?.status || 0)
  const code = Number(candidate?.code || candidate?.response?.data?.code || 0)
  return status === 401 || Number(candidate?.status || 0) === 401 || code === 10401
}

const readSessionExpiredMarker = () => {
  const expired = safeStorage.sessionGet(SESSION_EXPIRED_KEY) === '1'
  if (expired) safeStorage.sessionRemove(SESSION_EXPIRED_KEY)
  return expired
}

const writeSessionExpiredMarker = () => {
  safeStorage.sessionSet(SESSION_EXPIRED_KEY, '1', {
    ttlMs: 5 * 60 * 1000,
    sensitive: true,
    namespace: 'auth-recovery',
  })
}

const clearSessionExpiredMarker = () => {
  safeStorage.sessionRemove(SESSION_EXPIRED_KEY)
}

const hydrateFailureText = (error: unknown) => {
  const candidate = error as { message?: unknown; response?: { status?: unknown } } | null | undefined
  if (Number(candidate?.response?.status || 0) >= 500) return '账号服务暂时不可用，请重试。'
  const message = String(candidate?.message || '').trim()
  return message && message.length <= 120 ? message : '暂时无法确认当前登录状态，请重试。'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  authTokenStore.clearLegacyLocalToken()
  const token = ref<string | null>(authTokenStore.get())
  const startedFromExpiredSession = !token.value && readSessionExpiredMarker()
  const ready = ref(!token.value)
  const loading = ref(false)
  const hydrationState = ref<AuthHydrationState>(
    token.value ? 'hydrating' : startedFromExpiredSession ? 'expired' : 'anonymous',
  )
  const hydrationError = ref('')
  let hydratePromise: Promise<void> | null = null
  let hydratePromiseOwner: AuthHydrationOwner | null = null
  let hydrateRequestId = 0
  let sessionGeneration = 0

  const isLoggedIn = computed(() => !!user.value && !!token.value)
  const sessionExpired = computed(() => hydrationState.value === 'expired')
  const hydrateFailed = computed(() => hydrationState.value === 'failed')

  const getSessionGeneration = () => sessionGeneration

  const ownsSession = (
    expectedToken: string,
    expectedVersion: number,
    expectedGeneration: number,
  ) => (
    token.value === expectedToken
    && authTokenStore.get() === expectedToken
    && authTokenStore.getVersion() === expectedVersion
    && sessionGeneration === expectedGeneration
  )

  const hydrationOwnerIsCurrent = (owner: AuthHydrationOwner) => (
    owner.requestId === hydrateRequestId
    && ownsSession(owner.token, owner.sessionVersion, owner.sessionGeneration)
  )

  const invalidateHydration = () => {
    hydrateRequestId += 1
    hydratePromise = null
    hydratePromiseOwner = null
  }

  const advanceSessionGeneration = () => {
    sessionGeneration += 1
    invalidateHydration()
  }

  const setUser = (newUser: User | null) => {
    user.value = newUser
    if (newUser && token.value) {
      hydrationState.value = 'authenticated'
      hydrationError.value = ''
      ready.value = true
    }
  }

  const setToken = (newToken: string) => {
    advanceSessionGeneration()
    if (authTokenStore.get() === newToken) {
      authTokenStore.clear()
    }
    authTokenStore.set(newToken)
    clearSessionExpiredMarker()
    token.value = newToken
    user.value = null
    ready.value = false
    loading.value = false
    hydrationState.value = 'hydrating'
    hydrationError.value = ''
  }

  const logout = () => {
    const expiredByResponseInterceptor = Boolean(token.value) && authTokenStore.get() === null
    advanceSessionGeneration()
    const owner = user.value?.uid == null ? undefined : String(user.value.uid)
    if (owner) safeStorage.clearSensitive(owner)
    user.value = null
    token.value = null
    ready.value = true
    loading.value = false
    hydrationState.value = expiredByResponseInterceptor ? 'expired' : 'anonymous'
    hydrationError.value = ''
    authTokenStore.clear()
    if (expiredByResponseInterceptor) writeSessionExpiredMarker()
  }

  const expireSession = () => {
    advanceSessionGeneration()
    const owner = user.value?.uid == null ? undefined : String(user.value.uid)
    if (owner) safeStorage.clearSensitive(owner)
    user.value = null
    token.value = null
    ready.value = true
    loading.value = false
    hydrationState.value = 'expired'
    hydrationError.value = ''
    authTokenStore.clear()
    writeSessionExpiredMarker()
  }

  const hydrate = async () => {
    if (!token.value) {
      invalidateHydration()
      ready.value = true
      user.value = null
      if (hydrationState.value !== 'expired') hydrationState.value = 'anonymous'
      return
    }
    const sessionToken = token.value
    const sessionVersion = authTokenStore.getVersion()
    if (
      hydratePromise
      && hydratePromiseOwner
      && hydrationOwnerIsCurrent(hydratePromiseOwner)
    ) {
      return hydratePromise
    }
    const owner: AuthHydrationOwner = {
      requestId: ++hydrateRequestId,
      token: sessionToken,
      sessionVersion,
      sessionGeneration,
    }
    loading.value = true
    ready.value = false
    hydrationState.value = 'hydrating'
    hydrationError.value = ''
    const request = import('@/api/auth')
      .then(async ({ authApi }) => {
        const me = await authApi.fetchMe()
        if (!hydrationOwnerIsCurrent(owner)) return
        if (!me.data) throw new Error('账号资料为空，请重新登录。')
        user.value = me.data
        hydrationState.value = 'authenticated'
      })
      .catch((error) => {
        if (!hydrationOwnerIsCurrent(owner)) return
        if (isAuthExpiredError(error)) {
          expireSession()
          return
        }
        user.value = null
        hydrationState.value = 'failed'
        hydrationError.value = hydrateFailureText(error)
      })
      .finally(() => {
        const ownerIsCurrent = hydrationOwnerIsCurrent(owner)
        if (hydratePromiseOwner === owner) {
          hydratePromise = null
          hydratePromiseOwner = null
        }
        if (!ownerIsCurrent) return
        ready.value = true
        loading.value = false
      })
    hydratePromiseOwner = owner
    hydratePromise = request
    return hydratePromise
  }

  return {
    user,
    token,
    ready,
    loading,
    hydrationState,
    hydrationError,
    isLoggedIn,
    sessionExpired,
    hydrateFailed,
    getSessionGeneration,
    ownsSession,
    setUser,
    setToken,
    logout,
    expireSession,
    hydrate,
  }
})
