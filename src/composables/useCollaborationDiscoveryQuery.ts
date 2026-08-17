import { computed, onUnmounted, reactive, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  collaborationApi,
  type CollaborationListQuery,
  type CollaborationNeedDiscoverySort,
  type NeedContentFormat,
  type NeedDiscoveryItem,
  type NeedSourceType,
  type NeedStatus,
} from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const PAGE_SIZE = 20
const SLOW_LOAD_NOTICE_MS = 800
const VALID_SORTS: CollaborationNeedDiscoverySort[] = ['LATEST', 'UPDATED', 'STALLED_FIRST']
const VALID_FORMATS: NeedContentFormat[] = ['ARTICLE', 'QUESTION', 'GUIDE', 'CHECKLIST', 'RESOURCE']
const VALID_SOURCES: NeedSourceType[] = ['COMMUNITY', 'POST', 'TOPIC', 'ACTIVITY', 'EXTERNAL', 'SEARCH_GAP']
const VALID_STATUSES: NeedStatus[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED', 'MERGED']

export interface CollaborationNeedDiscoveryFilters {
  domain: number | ''
  status: NeedStatus | ''
  keyword: string
  contentFormat: NeedContentFormat | ''
  sourceType: NeedSourceType | ''
  sort: CollaborationNeedDiscoverySort
}

export interface UseCollaborationDiscoveryQueryOptions {
  syncUrl?: boolean
  pageSize?: number
  debounceMs?: number
  enabled?: MaybeRefOrGetter<boolean>
}

const asText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const asNumberOrEmpty = (value: unknown) => {
  const number = Number(firstQueryValue(value))
  return Number.isInteger(number) && number > 0 ? number : ''
}
const asEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T | '') => {
  const normalized = asText(firstQueryValue(value)).toUpperCase() as T
  return allowed.includes(normalized) ? normalized : fallback
}

export function useCollaborationDiscoveryQuery(
  options: UseCollaborationDiscoveryQueryOptions = {},
) {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const pageSize = options.pageSize || PAGE_SIZE
  const syncUrl = options.syncUrl !== false
  const enabled = computed(() => {
    const value = toValue(options.enabled)
    return value !== false
  })
  const filters = reactive<CollaborationNeedDiscoveryFilters>({
    domain: '',
    status: '',
    keyword: '',
    contentFormat: '',
    sourceType: '',
    sort: 'LATEST',
  })
  const items = ref<NeedDiscoveryItem[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const slowLoad = ref(false)
  const initialError = ref('')
  const loadMoreError = ref('')
  const nextCursor = ref('')
  const hasMore = ref(false)
  const initialized = ref(false)
  const requestId = ref(0)
  const appliedQueryKey = ref('')
  let activeController: AbortController | null = null
  let disposed = false
  let keywordTimer: ReturnType<typeof setTimeout> | null = null
  let slowLoadTimer: ReturnType<typeof setTimeout> | null = null
  let routeSyncing = false

  const currentUid = () => String(authStore.user?.uid ?? '')
  const currentToken = () => String(authStore.token ?? '')
  const filterKey = () => JSON.stringify(filters)
  const queryFromFilters = (): CollaborationListQuery => ({
    domain: filters.domain === '' ? undefined : filters.domain,
    status: filters.status || undefined,
    keyword: filters.keyword.trim() || undefined,
    contentFormat: filters.contentFormat || undefined,
    sourceType: filters.sourceType || undefined,
    sort: filters.sort,
  })

  const abortActiveRequest = () => {
    activeController?.abort()
    activeController = null
  }

  const clearSlowLoadNotice = () => {
    if (slowLoadTimer) {
      clearTimeout(slowLoadTimer)
      slowLoadTimer = null
    }
    slowLoad.value = false
  }

  const clearResults = () => {
    requestId.value += 1
    abortActiveRequest()
    items.value = []
    nextCursor.value = ''
    hasMore.value = false
    loading.value = false
    loadingMore.value = false
    clearSlowLoadNotice()
    initialError.value = ''
    loadMoreError.value = ''
    initialized.value = false
    appliedQueryKey.value = ''
  }

  const readRouteFilters = () => {
    const query = route.query
    filters.domain = asNumberOrEmpty(query.domain)
    filters.status = asEnum(query.status, VALID_STATUSES, '')
    filters.keyword = asText(firstQueryValue(query.keyword))
    filters.contentFormat = asEnum(query.contentFormat, VALID_FORMATS, '')
    filters.sourceType = asEnum(query.sourceType, VALID_SOURCES, '')
    filters.sort = asEnum(query.sort, VALID_SORTS, 'LATEST') as CollaborationNeedDiscoverySort
  }

  const writeRouteFilters = async () => {
    if (!syncUrl || routeSyncing || disposed) return
    const query = { ...route.query } as Record<string, string | string[] | undefined>
    const values: Record<string, string | undefined> = {
      domain: filters.domain === '' ? undefined : String(filters.domain),
      status: filters.status || undefined,
      keyword: filters.keyword.trim() || undefined,
      contentFormat: filters.contentFormat || undefined,
      sourceType: filters.sourceType || undefined,
      sort: filters.sort === 'LATEST' ? undefined : filters.sort,
    }
    for (const [key, value] of Object.entries(values)) {
      if (value) query[key] = value
      else delete query[key]
    }
    routeSyncing = true
    try {
      await router.replace({ query })
    } finally {
      routeSyncing = false
    }
  }

  const isCurrent = (id: number, uid: string, token: string, queryKey: string) => (
    !disposed
    && enabled.value
    && requestId.value === id
    && uid === currentUid()
    && token === currentToken()
    && queryKey === filterKey()
  )

  const load = async (append = false, preserveItems = false) => {
    if (!enabled.value) {
      clearResults()
      initialized.value = true
      return
    }
    if (append && (!hasMore.value || loadingMore.value)) return
    const queryKey = filterKey()
    const uid = currentUid()
    const token = currentToken()
    const id = ++requestId.value
    abortActiveRequest()
    const controller = new AbortController()
    activeController = controller
    const retainCurrentPage = !append && preserveItems && items.value.length > 0
    if (append) {
      loadingMore.value = true
      loadMoreError.value = ''
    } else {
      loading.value = true
      initialError.value = ''
      loadMoreError.value = ''
      if (!retainCurrentPage) {
        items.value = []
        nextCursor.value = ''
        hasMore.value = false
      }
      clearSlowLoadNotice()
      slowLoadTimer = setTimeout(() => {
        if (isCurrent(id, uid, token, queryKey)) slowLoad.value = true
      }, SLOW_LOAD_NOTICE_MS)
    }

    try {
      const result = await collaborationApi.needs.discovery({
        ...queryFromFilters(),
        cursor: append ? nextCursor.value || undefined : undefined,
        size: pageSize,
      }, { signal: controller.signal })
      if (!isCurrent(id, uid, token, queryKey)) return
      const incoming = result.data?.items || []
      const merged = append ? [...items.value, ...incoming] : incoming
      items.value = Array.from(new Map(merged.map((item) => [String(item.id), item])).values())
      nextCursor.value = result.data?.nextCursor ? String(result.data.nextCursor) : ''
      hasMore.value = Boolean(result.data?.hasMore && nextCursor.value)
      initialized.value = true
      appliedQueryKey.value = queryKey
    } catch (error) {
      if (!isCurrent(id, uid, token, queryKey) || controller.signal.aborted) return
      const message = getErrorMessage(error, '公开需求暂时无法读取')
      if (append) loadMoreError.value = message
      else {
        initialError.value = message
        if (!retainCurrentPage) {
          items.value = []
          nextCursor.value = ''
          hasMore.value = false
        }
        initialized.value = true
      }
    } finally {
      if (isCurrent(id, uid, token, queryKey)) {
        if (append) loadingMore.value = false
        else loading.value = false
      }
      if (activeController === controller) activeController = null
      if (!append && isCurrent(id, uid, token, queryKey)) clearSlowLoadNotice()
    }
  }

  const scheduleLoad = () => {
    if (keywordTimer) clearTimeout(keywordTimer)
    clearSlowLoadNotice()
    clearResults()
    void writeRouteFilters()
    keywordTimer = setTimeout(() => {
      keywordTimer = null
      void load()
    }, Math.max(0, options.debounceMs ?? 260))
  }

  const setFilters = (next: Partial<CollaborationNeedDiscoveryFilters>) => {
    Object.assign(filters, next)
    scheduleLoad()
  }

  const resetFilters = () => {
    Object.assign(filters, {
      domain: '',
      status: '',
      keyword: '',
      contentFormat: '',
      sourceType: '',
      sort: 'LATEST',
    })
    scheduleLoad()
  }

  readRouteFilters()
  watch(
    () => route.query,
    () => {
      if (routeSyncing || !enabled.value) return
      const previous = filterKey()
      readRouteFilters()
      if (previous !== filterKey()) scheduleLoad()
    },
  )
  watch(
    () => [authStore.isLoggedIn, authStore.user?.uid, authStore.token, enabled.value],
    () => {
      if (keywordTimer) {
        clearTimeout(keywordTimer)
        keywordTimer = null
      }
      clearResults()
      if (enabled.value) {
        readRouteFilters()
        void load()
      } else {
        initialized.value = true
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    disposed = true
    requestId.value += 1
    abortActiveRequest()
    if (keywordTimer) clearTimeout(keywordTimer)
  })

  return {
    filters,
    items,
    loading,
    loadingMore,
    slowLoad,
    initialError,
    loadMoreError,
    nextCursor,
    hasMore,
    initialized,
    appliedQueryKey,
    setFilters,
    resetFilters,
    load,
    refresh: () => load(false, true),
    loadMore: () => load(true),
    clearResults,
  }
}
