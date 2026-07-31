import { computed, onScopeDispose, reactive, watch } from 'vue'
import { getErrorMessage, type Result } from '@/api/client'
import { collaborationApi, type CollaborationActionSummary, type PageResult } from '@/api/collaboration'
import { contentMaintenanceApi, type ContentMaintenanceTask } from '@/api/contentMaintenance'
import { interactionApi } from '@/api/interaction'
import { knowledgeMaintenanceApi, type KnowledgeActionSummary } from '@/api/knowledgeMaintenance'
import { notificationApi } from '@/api/notification'
import { relationshipsApi, type RelationshipSummary } from '@/api/relationships'
import { retentionApi, type RevisitItem } from '@/api/retention'
import { updateDigestApi, type UpdateDigestItem } from '@/api/updateDigest'
import type { NotificationUnreadCount, PaginatedResponse, UserReportReceipt } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const PREVIEW_PAGE_SIZE = 5

export const participationSourceKeys = [
  'collaboration',
  'knowledge',
  'maintenance',
  'notifications',
  'updates',
  'revisits',
  'relationships',
  'reports',
] as const

export type ParticipationSourceKey = typeof participationSourceKeys[number]
export type ParticipationSourceStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'degraded' | 'error'

export interface ParticipationSourceState<T> {
  status: ParticipationSourceStatus
  data: T | null
  error: string
  loadedAt: number | null
}

interface ParticipationSourceData {
  collaboration: CollaborationActionSummary
  knowledge: KnowledgeActionSummary
  maintenance: PageResult<ContentMaintenanceTask>
  notifications: NotificationUnreadCount
  updates: PaginatedResponse<UpdateDigestItem>
  revisits: PaginatedResponse<RevisitItem>
  relationships: RelationshipSummary
  reports: PaginatedResponse<UserReportReceipt>
}

type ParticipationSources = {
  [Key in ParticipationSourceKey]: ParticipationSourceState<ParticipationSourceData[Key]>
}

type SourceLoadConfig<T> = {
  fallbackError: string
  load: (signal: AbortSignal) => Promise<Result<T>>
  isEmpty: (data: T) => boolean
  isDegraded?: (data: T) => boolean
}

const numericValue = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

const createSourceState = <T,>(): ParticipationSourceState<T> => ({
  status: 'idle',
  data: null,
  error: '',
  loadedAt: null,
})

export function useParticipationHub() {
  const authStore = useAuthStore()
  const sources = reactive({
    collaboration: createSourceState<CollaborationActionSummary>(),
    knowledge: createSourceState<KnowledgeActionSummary>(),
    maintenance: createSourceState<PageResult<ContentMaintenanceTask>>(),
    notifications: createSourceState<NotificationUnreadCount>(),
    updates: createSourceState<PaginatedResponse<UpdateDigestItem>>(),
    revisits: createSourceState<PaginatedResponse<RevisitItem>>(),
    relationships: createSourceState<RelationshipSummary>(),
    reports: createSourceState<PaginatedResponse<UserReportReceipt>>(),
  }) as ParticipationSources

  const sourceConfigs = {
    collaboration: {
      fallbackError: '协作行动摘要暂时无法读取。',
      load: (signal) => collaborationApi.actions.summary({ signal }),
      isEmpty: (data) => numericValue(data.total) === 0,
      isDegraded: (data) => data.degraded === true || Object.keys(data.sourceErrors || {}).length > 0,
    },
    knowledge: {
      fallbackError: '知识维护摘要暂时无法读取。',
      load: (signal) => knowledgeMaintenanceApi.summary({ signal }),
      isEmpty: (data) => numericValue(data.total) === 0,
      isDegraded: (data) => data.degraded || Object.keys(data.sourceErrors).length > 0,
    },
    maintenance: {
      fallbackError: '维护任务暂时无法读取。',
      load: (signal) => contentMaintenanceApi.mine(
        { size: PREVIEW_PAGE_SIZE },
        { signal },
      ),
      isEmpty: (data) => data.items.length === 0,
      isDegraded: (data) => data.degraded === true,
    },
    notifications: {
      fallbackError: '未读通知暂时无法读取。',
      load: (signal) => notificationApi.getUnreadCount({ signal }),
      isEmpty: (data) => numericValue(data.total) === 0,
    },
    updates: {
      fallbackError: '更新摘要暂时无法读取。',
      load: () => updateDigestApi.list({ size: PREVIEW_PAGE_SIZE }),
      isEmpty: (data) => data.items.length === 0,
      isDegraded: (data) => data.degraded === true,
    },
    revisits: {
      fallbackError: '回访事项暂时无法读取。',
      load: () => retentionApi.listRevisits({ status: 'OPEN', size: PREVIEW_PAGE_SIZE }),
      isEmpty: (data) => data.items.length === 0,
      isDegraded: (data) => data.degraded === true,
    },
    relationships: {
      fallbackError: '关系摘要暂时无法读取。',
      load: (signal) => relationshipsApi.summary({ signal }),
      isEmpty: (data) => numericValue(data.total) === 0,
    },
    reports: {
      fallbackError: '举报回执暂时无法读取。',
      load: () => interactionApi.listMyReports({ limit: PREVIEW_PAGE_SIZE }),
      isEmpty: (data) => data.items.length === 0,
      isDegraded: (data) => data.degraded === true,
    },
  } satisfies {
    [Key in ParticipationSourceKey]: SourceLoadConfig<ParticipationSourceData[Key]>
  }

  let disposed = false
  let accountGeneration = 0
  const requestIds = Object.fromEntries(
    participationSourceKeys.map((key) => [key, 0]),
  ) as Record<ParticipationSourceKey, number>
  const controllers: Partial<Record<ParticipationSourceKey, AbortController>> = {}

  const currentAccountKey = () => `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
  const accountIsReady = () => authStore.isLoggedIn && Boolean(authStore.user?.uid)

  const abortSource = (source: ParticipationSourceKey) => {
    controllers[source]?.abort()
    delete controllers[source]
  }

  const clearSource = <Key extends ParticipationSourceKey>(source: Key) => {
    const state = sources[source] as ParticipationSourceState<ParticipationSourceData[Key]>
    state.status = 'idle'
    state.data = null
    state.error = ''
    state.loadedAt = null
  }

  const invalidateRequests = () => {
    accountGeneration += 1
    for (const source of participationSourceKeys) {
      requestIds[source] += 1
      abortSource(source)
      clearSource(source)
    }
  }

  const requestIsCurrent = (
    source: ParticipationSourceKey,
    accountKey: string,
    generation: number,
    requestId: number,
  ) => (
    !disposed
    && accountIsReady()
    && accountKey === currentAccountKey()
    && generation === accountGeneration
    && requestId === requestIds[source]
  )

  const loadSource = async <Key extends ParticipationSourceKey>(source: Key): Promise<void> => {
    if (!accountIsReady()) return

    const config = sourceConfigs[source] as unknown as SourceLoadConfig<ParticipationSourceData[Key]>
    const state = sources[source] as ParticipationSourceState<ParticipationSourceData[Key]>
    const accountKey = currentAccountKey()
    const generation = accountGeneration
    const requestId = ++requestIds[source]
    abortSource(source)
    const controller = new AbortController()
    controllers[source] = controller
    state.status = 'loading'
    state.error = ''

    try {
      const result = await config.load(controller.signal)
      if (!requestIsCurrent(source, accountKey, generation, requestId)) return
      if (result.code !== 0) throw new Error(result.message || config.fallbackError)

      const data = result.data
      state.data = data
      state.loadedAt = Date.now()
      if (!data) {
        state.status = 'empty'
      } else if (config.isDegraded?.(data)) {
        state.status = 'degraded'
      } else {
        state.status = config.isEmpty(data) ? 'empty' : 'ready'
      }
    } catch (error) {
      if (!requestIsCurrent(source, accountKey, generation, requestId) || controller.signal.aborted) return
      state.data = null
      state.status = 'error'
      state.error = getErrorMessage(error, config.fallbackError)
      state.loadedAt = null
    } finally {
      if (controllers[source] === controller) delete controllers[source]
    }
  }

  const loadAll = async () => {
    if (!accountIsReady()) return
    await Promise.allSettled(participationSourceKeys.map((source) => loadSource(source)))
  }

  const retrySource = (source: ParticipationSourceKey) => loadSource(source)

  const isRefreshing = computed(() => participationSourceKeys.some(
    (source) => sources[source].status === 'loading',
  ))
  const failedSourceCount = computed(() => participationSourceKeys.filter(
    (source) => sources[source].status === 'error',
  ).length)

  watch(
    [() => authStore.user?.uid, () => authStore.token],
    () => {
      invalidateRequests()
      if (accountIsReady()) void loadAll()
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    disposed = true
    invalidateRequests()
  })

  return {
    sources,
    isRefreshing,
    failedSourceCount,
    loadAll,
    retrySource,
  }
}
