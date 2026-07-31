import { computed, onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import {
  collaborationApi,
  type NeedDeliveryCandidate,
  type NeedDeliveryCandidateQuery,
  type NeedResolutionType,
} from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import type { ApiId } from '@/api/types'

const PAGE_SIZE = 20

export interface DeliveryCandidateFilters {
  resolutionType: NeedResolutionType
  keyword: string
}

export interface UseCollaborationDeliveryCandidatesOptions {
  resolutionType?: MaybeRefOrGetter<NeedResolutionType>
  keyword?: MaybeRefOrGetter<string>
  enabled?: MaybeRefOrGetter<boolean>
  pageSize?: number
}

const normalizeCursor = (value: string | number | null | undefined) => (
  value == null || value === '' ? '' : String(value)
)

export function useCollaborationDeliveryCandidates(
  needId: MaybeRefOrGetter<ApiId | null | undefined>,
  options: UseCollaborationDeliveryCandidatesOptions = {},
) {
  const authStore = useAuthStore()
  const items = ref<NeedDeliveryCandidate[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const initialError = ref('')
  const loadMoreError = ref('')
  const nextCursor = ref('')
  const hasMore = ref(false)
  const initialized = ref(false)
  const requestId = ref(0)
  const pageSize = options.pageSize || PAGE_SIZE
  let activeController: AbortController | null = null
  let disposed = false

  const currentNeedId = computed(() => {
    const value = toValue(needId)
    return value == null ? '' : String(value)
  })
  const currentResolutionType = computed(() => toValue(options.resolutionType) || 'POST')
  const currentKeyword = computed(() => toValue(options.keyword) || '')
  const enabled = computed(() => {
    const value = toValue(options.enabled)
    return value !== false
  })
  const currentUid = () => String(authStore.user?.uid ?? '')
  const currentToken = () => String(authStore.token ?? '')

  const abortActiveRequest = () => {
    activeController?.abort()
    activeController = null
  }

  const clear = () => {
    requestId.value += 1
    abortActiveRequest()
    items.value = []
    nextCursor.value = ''
    hasMore.value = false
    loading.value = false
    loadingMore.value = false
    initialError.value = ''
    loadMoreError.value = ''
    initialized.value = false
  }

  const isCurrent = (id: number, uid: string, token: string, targetNeedId: string) => (
    !disposed
    && requestId.value === id
    && uid === currentUid()
    && token === currentToken()
    && targetNeedId === currentNeedId.value
    && enabled.value
  )

  const load = async (append = false) => {
    const targetNeedId = currentNeedId.value
    const uid = currentUid()
    const token = currentToken()
    if (!enabled.value || !targetNeedId || !authStore.isLoggedIn) {
      clear()
      initialized.value = true
      return
    }
    if (append && (!hasMore.value || loadingMore.value)) return

    const id = ++requestId.value
    abortActiveRequest()
    const controller = new AbortController()
    activeController = controller
    if (append) {
      loadingMore.value = true
      loadMoreError.value = ''
    } else {
      loading.value = true
      initialError.value = ''
      loadMoreError.value = ''
      items.value = []
      nextCursor.value = ''
      hasMore.value = false
    }

    const query: NeedDeliveryCandidateQuery = {
      resolutionType: currentResolutionType.value,
      keyword: currentKeyword.value.trim() || undefined,
      cursor: append ? nextCursor.value || undefined : undefined,
      size: pageSize,
    }

    try {
      const result = await collaborationApi.needs.deliveryCandidates(targetNeedId, query, {
        signal: controller.signal,
      })
      if (!isCurrent(id, uid, token, targetNeedId)) return
      const incoming = result.data?.items || []
      const merged = append ? [...items.value, ...incoming] : incoming
      items.value = Array.from(new Map(merged.map((item) => [String(item.id), item])).values())
      nextCursor.value = normalizeCursor(result.data?.nextCursor)
      hasMore.value = Boolean(result.data?.hasMore && nextCursor.value)
      initialized.value = true
    } catch (error) {
      if (!isCurrent(id, uid, token, targetNeedId) || controller.signal.aborted) return
      const message = getErrorMessage(error, '可选交付资源暂时无法读取')
      if (append) loadMoreError.value = message
      else {
        initialError.value = message
        items.value = []
        nextCursor.value = ''
        hasMore.value = false
        initialized.value = true
      }
    } finally {
      if (isCurrent(id, uid, token, targetNeedId)) {
        if (append) loadingMore.value = false
        else loading.value = false
      }
      if (activeController === controller) activeController = null
    }
  }

  watch(
    [
      currentNeedId,
      currentResolutionType,
      currentKeyword,
      () => authStore.isLoggedIn,
      () => authStore.user?.uid,
      () => authStore.token,
      enabled,
    ],
    () => {
      clear()
      if (enabled.value && currentNeedId.value && authStore.isLoggedIn) void load()
      else initialized.value = true
    },
    { immediate: true },
  )

  onUnmounted(() => {
    disposed = true
    requestId.value += 1
    abortActiveRequest()
  })

  return {
    items,
    visibleItems: computed(() => items.value),
    loading,
    loadingMore,
    initialError,
    loadMoreError,
    nextCursor,
    hasMore,
    initialized,
    filters: computed<DeliveryCandidateFilters>(() => ({
      resolutionType: currentResolutionType.value,
      keyword: currentKeyword.value,
    })),
    load,
    refresh: () => load(),
    loadMore: () => load(true),
    clear,
  }
}
