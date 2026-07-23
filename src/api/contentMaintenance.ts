import client, { type Result } from './client'
import type { ApiId } from './types'
import type { PageResult } from './collaboration'

const BASE_PATH = '/api/v1/content-maintenance/tasks'

export type MaintenanceSourceType =
  | 'CHANNEL_HEALTH'
  | 'SEARCH_GAP'
  | 'SUGGESTION'
  | 'FRESHNESS'
  | 'PROFILE_CONFIRMATION'
  | 'QUESTION'
  | 'MANUAL'

export type MaintenanceStatus = 'OPEN' | 'CLAIMED' | 'SUBMITTED' | 'COMPLETED' | 'CLOSED'
export type MaintenanceDeliveryType = 'POST' | 'QUESTION' | 'SERIES'

export interface ContentMaintenanceTask {
  id: ApiId
  domain: number
  sourceType: MaintenanceSourceType
  sourceRefId?: ApiId | null
  sourcePostId?: ApiId | null
  createdByUid: ApiId
  assigneeUid?: ApiId | null
  title: string
  detail: string
  status: MaintenanceStatus
  deliveryType?: MaintenanceDeliveryType | null
  deliveryRefId?: ApiId | null
  deliveryPostId?: ApiId | null
  deliveryNote?: string | null
  reviewNote?: string | null
  canClaim: boolean
  canSubmit: boolean
  canReview: boolean
  canClose: boolean
  canReassign: boolean
  claimedAt?: string | null
  submittedAt?: string | null
  reviewedByUid?: ApiId | null
  reviewedAt?: string | null
  closedByUid?: ApiId | null
  closedAt?: string | null
  createTime: string
  updateTime: string
}

export interface MaintenanceListQuery {
  domain?: number
  status?: MaintenanceStatus
  cursor?: string | number
  size?: number
}

export interface ContentMaintenanceRequestOptions {
  signal?: AbortSignal
  skipAuthRedirect?: boolean
}

export interface ContentMaintenanceTaskCreateCmd {
  domain: number
  sourceType: MaintenanceSourceType
  sourceRefId?: ApiId
  sourcePostId?: ApiId
  assigneeUid: ApiId
  title: string
  detail: string
}

export interface ContentMaintenanceTaskSubmitCmd {
  deliveryType: MaintenanceDeliveryType
  deliveryRefId: ApiId
  deliveryPostId?: ApiId
  note: string
}

export interface ContentMaintenanceTaskReviewCmd {
  decision: 'APPROVED' | 'REJECTED'
  note: string
}

export interface ContentMaintenanceTaskReassignCmd {
  replacementUid: ApiId
  reason: string
}

const requestResult = <T>(request: Promise<unknown>) => request as Promise<Result<T>>
const id = (value: ApiId) => encodeURIComponent(String(value))

export const contentMaintenanceApi = {
  create: (cmd: ContentMaintenanceTaskCreateCmd) =>
    requestResult<ContentMaintenanceTask>(client.post(BASE_PATH, cmd)),
  mine: (
    query: Omit<MaintenanceListQuery, 'domain'> = {},
    options: ContentMaintenanceRequestOptions = {},
  ) =>
    requestResult<PageResult<ContentMaintenanceTask>>(client.get(`${BASE_PATH}/mine`, {
      params: query,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    })),
  queue: (
    query: MaintenanceListQuery = {},
    options: ContentMaintenanceRequestOptions = {},
  ) =>
    requestResult<PageResult<ContentMaintenanceTask>>(client.get(`${BASE_PATH}/queue`, {
      params: query,
      signal: options.signal,
      skipAuthRedirect: options.skipAuthRedirect,
    })),
  claim: (taskId: ApiId) =>
    requestResult<ContentMaintenanceTask>(client.post(`${BASE_PATH}/${id(taskId)}/claim`)),
  submit: (taskId: ApiId, cmd: ContentMaintenanceTaskSubmitCmd) =>
    requestResult<ContentMaintenanceTask>(client.post(`${BASE_PATH}/${id(taskId)}/submit`, cmd)),
  review: (taskId: ApiId, cmd: ContentMaintenanceTaskReviewCmd) =>
    requestResult<ContentMaintenanceTask>(client.post(`${BASE_PATH}/${id(taskId)}/review`, cmd)),
  reassign: (taskId: ApiId, cmd: ContentMaintenanceTaskReassignCmd) =>
    requestResult<ContentMaintenanceTask>(client.post(`${BASE_PATH}/${id(taskId)}/reassign`, cmd)),
  close: (taskId: ApiId, note: string) =>
    requestResult<ContentMaintenanceTask>(client.post(`${BASE_PATH}/${id(taskId)}/close`, {
      decision: 'CLOSED',
      note,
    })),
}
