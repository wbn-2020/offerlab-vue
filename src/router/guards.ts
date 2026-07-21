import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { opsApi } from '@/api/ops'
import { applyPageSeo } from '@/utils/seo'
import {
  adminPermissionRequirementText,
  createAdminPermissionCache,
  hasAdminPermission,
  isPermissionDeniedError,
  type AdminPermissionKey,
} from '@/utils/adminPermissions'

const adminPermissionCache = createAdminPermissionCache(async () => {
  const res = await opsApi.myPermissions()
  return res.data
})

export const invalidateAdminPermissionCache = adminPermissionCache.invalidateAdminPermissions

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.meta.requiresAuth as boolean
    const adminPermission = to.meta.adminPermission as AdminPermissionKey | AdminPermissionKey[] | undefined

    if (authStore.token && !authStore.ready) {
      await authStore.hydrate()
    } else if (requiresAuth && authStore.token && !authStore.user && !authStore.hydrateFailed) {
      await authStore.hydrate()
    }

    if (requiresAuth && authStore.sessionExpired) {
      next({ name: 'Login', query: { redirect: to.fullPath, reason: 'session_expired' } })
      return
    }
    if (requiresAuth && authStore.hydrateFailed) {
      next({ name: 'Login', query: { redirect: to.fullPath, reason: 'hydrate_failed' } })
      return
    }
    if (requiresAuth && !authStore.isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }

    if (adminPermission) {
      try {
        const permissions = await adminPermissionCache.getAdminPermissions(authStore.token)
        if (!hasAdminPermission(permissions, adminPermission)) {
          next({
            name: 'Forbidden',
            query: {
              from: to.fullPath,
              role: adminPermissionRequirementText(adminPermission),
              reason: 'permission_denied',
            },
          })
          return
        }
      } catch (error) {
        adminPermissionCache.invalidateAdminPermissions(authStore.token)
        next({
          name: 'Forbidden',
          query: {
            from: to.fullPath,
            role: adminPermissionRequirementText(adminPermission),
            reason: isPermissionDeniedError(error) ? 'permission_denied' : 'permission_unavailable',
          },
        })
        return
      }
    }
    next()
  })

  router.afterEach((to) => {
    const title = to.meta.title as string
    const description = to.meta.description as string | undefined
    applyPageSeo({ title, description, canonical: to.path })
  })
}
