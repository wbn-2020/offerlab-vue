import type { MyAdminPermissions } from '@/api/ops'

export type AdminPermissionKey = keyof Pick<MyAdminPermissions, 'admin' | 'ops' | 'contentModerator' | 'domainModerator' | 'questionOperator'>

export const ADMIN_PERMISSION_CACHE_TTL_MS = 10_000

export const isPermissionDeniedError = (error: unknown) => {
  const status = (error as { response?: { status?: number } } | null)?.response?.status
  const code = (error as { code?: number; response?: { data?: { code?: number } } } | null)?.code
    ?? (error as { response?: { data?: { code?: number } } } | null)?.response?.data?.code
  return status === 403 || code === 10403
}

export const createAdminPermissionCache = (
  fetchPermissions: () => Promise<MyAdminPermissions | null>,
  options: { ttlMs?: number; now?: () => number } = {},
) => {
  let cachedAdminPermissions: MyAdminPermissions | null = null
  let cachedToken: string | null = null
  let cachedAt = 0
  const ttlMs = options.ttlMs ?? ADMIN_PERMISSION_CACHE_TTL_MS
  const now = options.now ?? (() => Date.now())

  const invalidateAdminPermissions = (token?: string | null) => {
    if (token && token !== cachedToken) return
    cachedAdminPermissions = null
    cachedToken = null
    cachedAt = 0
  }

  const getAdminPermissions = async (token: string | null, requestOptions: { force?: boolean } = {}) => {
    if (!token) return null
    if (
      !requestOptions.force
      && cachedToken === token
      && cachedAdminPermissions
      && now() - cachedAt < ttlMs
    ) {
      return cachedAdminPermissions
    }

    try {
      const permissions = await fetchPermissions()
      cachedToken = token
      cachedAdminPermissions = permissions
      cachedAt = now()
      return cachedAdminPermissions
    } catch (error) {
      if (isPermissionDeniedError(error)) invalidateAdminPermissions(token)
      throw error
    }
  }

  return {
    getAdminPermissions,
    invalidateAdminPermissions,
  }
}

export const hasAdminPermission = (
  permissions: MyAdminPermissions | null | undefined,
  required?: AdminPermissionKey | AdminPermissionKey[],
) => {
  if (!required) return true
  if (!permissions) return false
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.some((key) => Boolean(permissions[key]))
}

export const adminPermissionLabel = (key: AdminPermissionKey) => {
  if (key === 'admin') return '系统管理员'
  if (key === 'ops') return '运维管理员'
  if (key === 'contentModerator') return '内容审核员'
  if (key === 'domainModerator') return '领域版主'
  return '知识库运营员'
}

export const adminPermissionRequirementText = (required?: AdminPermissionKey | AdminPermissionKey[]) => {
  if (!required) return '管理权限'
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.map(adminPermissionLabel).join(' / ')
}
