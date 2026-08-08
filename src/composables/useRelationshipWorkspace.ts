import { ref, watch, type Ref } from 'vue'
import { getErrorMessage } from '@/api/client'
import {
  relationshipsApi,
  type RelationshipDeliveryMode,
  type RelationshipItem,
  type RelationshipListQuery,
  type RelationshipMode,
  type RelationshipPreference,
  type RelationshipSourceType,
  type RelationshipSummary,
} from '@/api/relationships'

const MAX_FOCUS_PAGES = 10

export const useRelationshipWorkspace = (accountUid: Ref<string>, initialQuery?: {
  sourceType?: RelationshipSourceType
  mode?: RelationshipMode
  sourceId?: string
}) => {
  const items = ref<RelationshipItem[]>([])
  const summary = ref<RelationshipSummary | null>(null)
  const selected = ref<RelationshipItem | null>(null)
  const selectedPreference = ref<RelationshipPreference | null>(null)
  const isLoading = ref(false)
  const isSummaryLoading = ref(false)
  const isPreferenceLoading = ref(false)
  const isPreferenceSaving = ref(false)
  const hasMore = ref(false)
  const nextCursor = ref<string>()
  const loadError = ref('')
  const summaryError = ref('')
  const preferenceError = ref('')
  const preferenceNotice = ref('')
  const focusNotice = ref('')
  const generation = ref(0)
  let preferenceRequestId = 0

  const sourceType = ref<RelationshipSourceType | undefined>(initialQuery?.sourceType)
  const mode = ref<RelationshipMode>(initialQuery?.mode ?? 'ALL')
  const focusedSourceId = ref(initialQuery?.sourceId ?? '')

  const reset = () => {
    generation.value += 1
    preferenceRequestId += 1
    isLoading.value = false
    isSummaryLoading.value = false
    isPreferenceLoading.value = false
    isPreferenceSaving.value = false
    items.value = []
    summary.value = null
    selected.value = null
    selectedPreference.value = null
    hasMore.value = false
    nextCursor.value = undefined
    loadError.value = ''
    summaryError.value = ''
    preferenceError.value = ''
    preferenceNotice.value = ''
    focusNotice.value = ''
  }

  const focusedItem = (values = items.value) => focusedSourceId.value
    ? values.find((item) => (
        String(item.sourceId) === focusedSourceId.value
        && (!sourceType.value || item.sourceType === sourceType.value)
      )) || null
    : null

  const preferenceFromItem = (item: RelationshipItem): RelationshipPreference => ({
    deliveryMode: item.deliveryMode,
    expiresAt: item.expiresAt,
    deliveryPreferenceSupported: item.deliveryPreferenceSupported,
    deliveryPreferenceUnsupportedReason: item.deliveryPreferenceUnsupportedReason,
  })

  const updateItemPreference = (
    item: RelationshipItem,
    preference: RelationshipPreference,
  ): RelationshipItem => ({
    ...item,
    deliveryMode: preference.deliveryMode,
    expiresAt: preference.expiresAt,
    deliveryPreferenceSupported: preference.deliveryPreferenceSupported,
    deliveryPreferenceUnsupportedReason: preference.deliveryPreferenceUnsupportedReason,
  })

  const updateItemsForPreference = (
    item: RelationshipItem,
    preference: RelationshipPreference,
  ) => {
    const updatedItem = updateItemPreference(item, preference)
    selected.value = updatedItem
    selectedPreference.value = preference
    items.value = items.value.map((entry) => (
      entry.sourceType === item.sourceType && String(entry.sourceId) === String(item.sourceId)
    ) ? updatedItem : entry).filter((entry) => (
      mode.value === 'ALL'
      || (mode.value === 'MUTED' ? entry.deliveryMode === 'MUTED' : entry.deliveryMode !== 'MUTED')
    ))
  }

  const preferenceExpiryTimestamp = (value?: string | null) => {
    if (!value) return undefined
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? timestamp : undefined
  }

  const applyFocusedItem = () => {
    selected.value = focusedItem()
    if (selected.value) {
      selectedPreference.value = preferenceFromItem(selected.value)
    }
  }

  const loadList = async (append = false) => {
    const uid = accountUid.value
    if (!uid || isLoading.value || (append && !hasMore.value)) return
    const currentGeneration = generation.value
    isLoading.value = true
    loadError.value = ''
    const query: RelationshipListQuery = {
      sourceType: sourceType.value,
      mode: mode.value,
      cursor: append ? nextCursor.value : undefined,
      size: 20,
    }
    try {
      const result = await relationshipsApi.list(query)
      if (currentGeneration !== generation.value || uid !== accountUid.value) return
      let page = result.data
      let incoming = page?.items ?? []
      let cursor = page?.nextCursor
      let more = Boolean(page?.hasMore && cursor)
      let loadedPages = 1
      const seenCursors = new Set<string>()

      while (
        !append
        && focusedSourceId.value
        && !focusedItem(incoming)
        && more
        && cursor
        && loadedPages < MAX_FOCUS_PAGES
        && !seenCursors.has(cursor)
      ) {
        seenCursors.add(cursor)
        const nextResult = await relationshipsApi.list({ ...query, cursor })
        if (currentGeneration !== generation.value || uid !== accountUid.value) return
        page = nextResult.data
        incoming = [...incoming, ...(page?.items ?? [])]
        cursor = page?.nextCursor
        more = Boolean(page?.hasMore && cursor)
        loadedPages += 1
      }

      items.value = append ? [...items.value, ...incoming] : incoming
      nextCursor.value = cursor
      hasMore.value = more
      applyFocusedItem()
      focusNotice.value = focusedSourceId.value && !selected.value
        ? more
          ? '未在前 200 条关系中定位到目标，请缩小关系类型或状态筛选。'
          : '该关系已取消、不可见，或不符合当前筛选条件。'
        : ''
      if (selected.value) void loadPreference(selected.value)
    } catch (error) {
      if (currentGeneration !== generation.value || uid !== accountUid.value) return
      if (!append) {
        items.value = []
        nextCursor.value = undefined
        hasMore.value = false
      }
      loadError.value = getErrorMessage(error, '关系列表暂时不可用，请稍后再试。')
    } finally {
      if (currentGeneration === generation.value) isLoading.value = false
    }
  }

  const loadSummary = async () => {
    const uid = accountUid.value
    if (!uid) return
    const currentGeneration = generation.value
    isSummaryLoading.value = true
    summaryError.value = ''
    try {
      const result = await relationshipsApi.summary()
      if (currentGeneration !== generation.value || uid !== accountUid.value) return
      summary.value = result.data
    } catch (error) {
      if (currentGeneration !== generation.value || uid !== accountUid.value) return
      summary.value = null
      summaryError.value = getErrorMessage(error, '关系摘要暂时不可用。')
    } finally {
      if (currentGeneration === generation.value) isSummaryLoading.value = false
    }
  }

  const reload = async () => {
    reset()
    if (!accountUid.value) return
    await Promise.all([loadList(), loadSummary()])
  }

  const loadMore = () => loadList(true)

  const focus = (item: RelationshipItem | null) => {
    preferenceRequestId += 1
    selected.value = item
    focusedSourceId.value = item ? String(item.sourceId) : ''
    selectedPreference.value = item
      ? preferenceFromItem(item)
      : null
    preferenceError.value = ''
    preferenceNotice.value = ''
    if (!item) isPreferenceLoading.value = false
  }

  const loadPreference = async (item: RelationshipItem) => {
    const uid = accountUid.value
    if (!uid) return
    const currentGeneration = generation.value
    const requestId = ++preferenceRequestId
    selected.value = item
    isPreferenceLoading.value = true
    preferenceError.value = ''
    preferenceNotice.value = ''
    if (!item.deliveryPreferenceSupported) {
      selectedPreference.value = preferenceFromItem(item)
      isPreferenceLoading.value = false
      return
    }
    try {
      const result = await relationshipsApi.getPreference(item.sourceType, item.sourceId)
      if (
        currentGeneration !== generation.value
        || requestId !== preferenceRequestId
        || uid !== accountUid.value
        || selected.value?.sourceType !== item.sourceType
        || String(selected.value?.sourceId) !== String(item.sourceId)
      ) return
      const preference = result.data || {
        deliveryMode: item.deliveryMode,
        expiresAt: item.expiresAt,
        deliveryPreferenceSupported: item.deliveryPreferenceSupported,
        deliveryPreferenceUnsupportedReason: item.deliveryPreferenceUnsupportedReason,
      }
      updateItemsForPreference(item, preference)
    } catch (error) {
      if (
        currentGeneration !== generation.value
        || requestId !== preferenceRequestId
        || uid !== accountUid.value
        || selected.value?.sourceType !== item.sourceType
        || String(selected.value?.sourceId) !== String(item.sourceId)
      ) return
      selectedPreference.value = preferenceFromItem(item)
      preferenceError.value = getErrorMessage(error, '偏好暂时不可用，请稍后再试。')
    } finally {
      if (
        currentGeneration === generation.value
        && requestId === preferenceRequestId
        && selected.value?.sourceType === item.sourceType
        && String(selected.value?.sourceId) === String(item.sourceId)
      ) {
        isPreferenceLoading.value = false
      }
    }
  }

  const savePreference = async (deliveryMode: RelationshipDeliveryMode, expiresAt?: string | null) => {
    const item = selected.value
    const uid = accountUid.value
    if (!uid || !item || isPreferenceSaving.value) return false
    if (!item.deliveryPreferenceSupported) {
      preferenceError.value = item.deliveryPreferenceUnsupportedReason || '当前关系暂不支持调整接收方式。'
      return false
    }
    const currentGeneration = generation.value
    preferenceRequestId += 1
    isPreferenceSaving.value = true
    preferenceError.value = ''
    preferenceNotice.value = ''
    try {
      const result = await relationshipsApi.updatePreference(item.sourceType, item.sourceId, {
        deliveryMode,
        expiresAt: expiresAt || null,
      }, item)
      if (
        currentGeneration !== generation.value
        || uid !== accountUid.value
        || selected.value?.sourceType !== item.sourceType
        || String(selected.value?.sourceId) !== String(item.sourceId)
      ) return false
      const preference = result.data || {
        deliveryMode,
        expiresAt: deliveryMode === 'MUTED' ? preferenceExpiryTimestamp(expiresAt) : undefined,
        deliveryPreferenceSupported: item.deliveryPreferenceSupported,
        deliveryPreferenceUnsupportedReason: item.deliveryPreferenceUnsupportedReason,
      }
      updateItemsForPreference(item, preference)
      preferenceNotice.value = '偏好已更新，仅对后续更新生效。'
      void loadSummary()
      return true
    } catch (error) {
      if (currentGeneration === generation.value && uid === accountUid.value) {
        preferenceError.value = getErrorMessage(error, '偏好更新失败，请稍后再试。')
      }
      return false
    } finally {
      if (currentGeneration === generation.value) isPreferenceSaving.value = false
    }
  }

  const clearPreference = async () => {
    const item = selected.value
    const uid = accountUid.value
    if (!uid || !item || isPreferenceSaving.value) return false
    if (!item.deliveryPreferenceSupported) {
      preferenceError.value = item.deliveryPreferenceUnsupportedReason || '当前关系暂不支持调整接收方式。'
      return false
    }
    const currentGeneration = generation.value
    preferenceRequestId += 1
    isPreferenceSaving.value = true
    preferenceError.value = ''
    preferenceNotice.value = ''
    try {
      await relationshipsApi.deletePreference(item.sourceType, item.sourceId, item)
      if (
        currentGeneration !== generation.value
        || uid !== accountUid.value
        || selected.value?.sourceType !== item.sourceType
        || String(selected.value?.sourceId) !== String(item.sourceId)
      ) return false
      updateItemsForPreference(item, {
        deliveryMode: 'IMMEDIATE',
        deliveryPreferenceSupported: item.deliveryPreferenceSupported,
        deliveryPreferenceUnsupportedReason: item.deliveryPreferenceUnsupportedReason,
      })
      preferenceNotice.value = '已恢复即时更新'
      void loadSummary()
      return true
    } catch (error) {
      if (currentGeneration === generation.value && uid === accountUid.value) {
        preferenceError.value = getErrorMessage(error, '恢复默认偏好失败，请稍后再试。')
      }
      return false
    } finally {
      if (currentGeneration === generation.value) isPreferenceSaving.value = false
    }
  }

  watch(accountUid, async () => {
    reset()
    if (accountUid.value) await Promise.all([loadList(), loadSummary()])
  }, { immediate: true })

  watch([sourceType, mode], async ([nextType, nextMode], [previousType, previousMode]) => {
    if ((nextType === previousType && nextMode === previousMode) || !accountUid.value) return
    reset()
    await Promise.all([loadList(), loadSummary()])
  })

  return {
    items,
    summary,
    selected,
    selectedPreference,
    sourceType,
    mode,
    focusedSourceId,
    isLoading,
    isSummaryLoading,
    isPreferenceLoading,
    isPreferenceSaving,
    hasMore,
    loadError,
    summaryError,
    preferenceError,
    preferenceNotice,
    focusNotice,
    reload,
    loadMore,
    focus,
    loadPreference,
    savePreference,
    clearPreference,
  }
}
