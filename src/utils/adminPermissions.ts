import type { MyAdminPermissions } from '@/api/ops'

export type AdminPermissionKey = keyof Pick<MyAdminPermissions, 'admin' | 'ops' | 'contentModerator' | 'questionOperator'>

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
  return '知识库运营员'
}

export const adminPermissionRequirementText = (required?: AdminPermissionKey | AdminPermissionKey[]) => {
  if (!required) return '管理权限'
  const requiredList = Array.isArray(required) ? required : [required]
  return requiredList.map(adminPermissionLabel).join(' / ')
}
