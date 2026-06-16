import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import { adminPermissionRequirementText, hasAdminPermission, type AdminPermissionKey } from '@/utils/adminPermissions'

let cachedAdminPermissions: MyAdminPermissions | null = null
let cachedToken: string | null = null
let cachedAt = 0

const getAdminPermissions = async (token: string | null) => {
  if (!token) return null
  if (cachedToken === token && cachedAdminPermissions && Date.now() - cachedAt < 30_000) return cachedAdminPermissions
  const res = await opsApi.myPermissions()
  cachedToken = token
  cachedAdminPermissions = res.data
  cachedAt = Date.now()
  return cachedAdminPermissions
}

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.meta.requiresAuth as boolean
    const adminPermission = to.meta.adminPermission as AdminPermissionKey | AdminPermissionKey[] | undefined

    if (authStore.token && !authStore.ready) {
      await authStore.hydrate()
    } else if (authStore.token && !authStore.user) {
      await authStore.hydrate()
    }

    if (requiresAuth && !authStore.isLoggedIn) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      if (adminPermission) {
        try {
          const permissions = await getAdminPermissions(authStore.token)
          if (!hasAdminPermission(permissions, adminPermission)) {
            next({
              name: 'Forbidden',
              query: {
                from: to.fullPath,
                role: adminPermissionRequirementText(adminPermission),
              },
            })
            return
          }
        } catch {
          next({ name: 'Forbidden', query: { from: to.fullPath, reason: 'permission_check_failed' } })
          return
        }
      }
      next()
    }
  })

  router.afterEach((to) => {
    const title = to.meta.title as string
    document.title = title ? `${title} - OfferLab 技术社区` : 'OfferLab 技术社区'
  })
}
