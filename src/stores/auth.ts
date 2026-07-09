import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types'
import { authTokenStore } from '@/utils/authTokenStore'

const isAuthExpiredError = (error: unknown) => {
  const candidate = error as { code?: unknown; response?: { status?: unknown } } | null | undefined
  const status = Number(candidate?.response?.status || 0)
  const code = Number(candidate?.code || 0)
  return status === 401 || status === 403 || code === 10401 || code === 10403
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  authTokenStore.clearLegacyLocalToken()
  const token = ref<string | null>(authTokenStore.get())
  const ready = ref(!token.value)
  const loading = ref(false)
  let hydratePromise: Promise<void> | null = null

  const isLoggedIn = computed(() => !!user.value && !!token.value)

  const setUser = (newUser: User | null) => {
    user.value = newUser
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    authTokenStore.set(newToken)
  }

  const logout = () => {
    user.value = null
    token.value = null
    ready.value = true
    loading.value = false
    authTokenStore.clear()
  }

  const hydrate = async () => {
    if (!token.value) {
      ready.value = true
      user.value = null
      return
    }
    if (hydratePromise) return hydratePromise
    loading.value = true
    hydratePromise = import('@/api/auth')
      .then(async ({ authApi }) => {
        const me = await authApi.fetchMe()
        user.value = me.data
      })
      .catch((error) => {
        if (isAuthExpiredError(error)) {
          logout()
        }
      })
      .finally(() => {
        ready.value = true
        loading.value = false
        hydratePromise = null
      })
    return hydratePromise
  }

  return {
    user,
    token,
    ready,
    loading,
    isLoggedIn,
    setUser,
    setToken,
    logout,
    hydrate,
  }
})
