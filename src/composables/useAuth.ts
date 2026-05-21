import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

export function useAuth() {
  const authStore = useAuthStore()

  const login = async (email: string, password: string) => {
    const result = await authApi.login({ email, password })
    authStore.setToken(result.data!.token)
    authStore.setUser(result.data!.user)
  }

  const register = async (email: string, password: string, nickname: string) => {
    const result = await authApi.register({ email, password, nickname })
    authStore.setToken(result.data!.token)
    authStore.setUser(result.data!.user)
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
