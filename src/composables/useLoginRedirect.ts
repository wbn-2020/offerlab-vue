import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function useLoginRedirect() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()

  const requireLogin = (redirect = route.fullPath) => {
    if (authStore.isLoggedIn) return true
    router.push({ path: '/login', query: { redirect } })
    return false
  }

  return {
    requireLogin,
  }
}
