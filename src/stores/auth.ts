import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types'
import { authTokenStore } from '@/utils/authTokenStore'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  authTokenStore.clearLegacyLocalToken()
  const token = ref<string | null>(authTokenStore.get())

  const isLoggedIn = computed(() => !!user.value && !!token.value)

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    authTokenStore.set(newToken)
  }

  const logout = () => {
    user.value = null
    token.value = null
    authTokenStore.clear()
  }

  return {
    user,
    token,
    isLoggedIn,
    setUser,
    setToken,
    logout,
  }
})
