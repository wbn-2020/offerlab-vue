import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types'
import { authTokenStore } from '@/utils/authTokenStore'

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
      .catch(() => {
        logout()
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
