import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/api/types'
import { safeStorage } from '@/utils/safeStorage'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(safeStorage.get('token'))

  const isLoggedIn = computed(() => !!user.value && !!token.value)

  const setUser = (newUser: User) => {
    user.value = newUser
  }

  const setToken = (newToken: string) => {
    token.value = newToken
    safeStorage.set('token', newToken)
  }

  const logout = () => {
    user.value = null
    token.value = null
    safeStorage.remove('token')
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
