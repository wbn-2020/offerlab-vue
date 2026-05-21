import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

export function setupRouterGuards(router: Router) {
  router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.meta.requiresAuth as boolean

    if (requiresAuth && !authStore.isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  })

  router.afterEach((to) => {
    const title = to.meta.title as string
    document.title = title ? `${title} - 面试圈` : '面试圈'
  })
}
