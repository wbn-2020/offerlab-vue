import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

export function useAuth() {
  const authStore = useAuthStore()

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    const token = result.data?.token
    if (!token) {
      throw new Error('登录响应缺少 token')
    }
    authStore.setToken(token)
    try {
      const me = await authApi.fetchMe()
      if (me.data) {
        authStore.setUser(me.data)
      }
    } catch (error) {
      authStore.logout()
      throw error
    }
  }

  const register = async (email: string, password: string, nickname: string) => {
    await authApi.register({ email, password, nickname })
    await login(email, password)
  }

  const logout = async () => {
    await authApi.logout()
    authStore.logout()
  }

  return {
    user: authStore.user,
    isLoggedIn: authStore.isLoggedIn,
    login,
    register,
    logout,
  }
}
