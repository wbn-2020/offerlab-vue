<template>
  <section
    class="update-digest-panel"
    data-v8-update-digest
    :data-update-digest-state="state"
  >
    <div class="digest-head">
      <div class="min-w-0">
        <p class="digest-eyebrow">我的更新摘要</p>
        <h2>{{ title || `${sourceLabel}的近期进展` }}</h2>
        <p>
          只展示当前账号仍可见的公开更新；读取摘要不会改变摘要或回访状态。
        </p>
      </div>
      <RouterLink
        :to="authStore.isLoggedIn ? '/notifications' : loginPath"
        class="digest-link"
      >
        {{ authStore.isLoggedIn ? '通知中心' : '登录查看' }}
      </RouterLink>
    </div>

    <div v-if="routeState" class="digest-filters" aria-label="更新摘要筛选">
      <label>
        <span>订阅来源</span>
        <select :value="effectiveSubscriptionSourceType || ''" @change="setRouteSubscriptionSourceType">
          <option value="">全部订阅来源</option>
          <option v-for="option in subscriptionSourceTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        <span>订阅来源 ID</span>
        <input
          :value="effectiveSubscriptionSourceId == null ? '' : String(effectiveSubscriptionSourceId)"
          inputmode="numeric"
          placeholder="可选"
          @change="setRouteSubscriptionSourceId"
        >
      </label>
      <label>
        <span>关联资源</span>
        <select :value="effectiveResourceType || ''" @change="setRouteResourceType">
          <option value="">全部资源</option>
          <option v-for="option in resourceTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        <span>资源 ID</span>
        <input
          :value="effectiveResourceId == null ? '' : String(effectiveResourceId)"
          inputmode="numeric"
          placeholder="可选"
          @change="setRouteResourceId"
        >
      </label>
    </div>

    <div v-if="!authStore.isLoggedIn" class="digest-state" data-update-digest-state="empty">
      <LogIn class="h-4 w-4" />
      <div>
        <strong>登录后查看与你有关的公开更新</strong>
        <p>摘要按账号隔离，不会向匿名访问者展示任何个人关系或通知状态。</p>
      </div>
    </div>

    <div v-else-if="loading && items.length === 0" class="digest-state" data-update-digest-state="loading" role="status">
      <RefreshCcw class="h-4 w-4 animate-spin" />
      <span>正在读取更新摘要...</span>
    </div>

    <div v-else-if="errorText && items.length === 0" class="digest-state digest-state-error" data-update-digest-state="error">
      <AlertCircle class="h-4 w-4" />
      <div>
        <strong>更新摘要暂时无法读取</strong>
        <p>{{ errorText }}</p>
      </div>
      <button type="button" class="digest-button" @click="retry">重试</button>
    </div>

    <template v-else>
      <div v-if="partialNotice" class="digest-notice" role="status">
        <AlertCircle class="h-4 w-4 flex-shrink-0" />
        <span>{{ partialNotice }}</span>
      </div>

      <div v-if="items.length" class="digest-list">
        <article v-for="item in items" :key="item.digestKey" class="digest-item">
          <div class="digest-item-icon">
            <component :is="sourceIcon(item.subscriptionSourceType ?? item.resourceType)" class="h-4 w-4" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="digest-item-title">
              <h3>{{ item.title }}</h3>
              <span v-if="item.occurrenceCount > 1" class="digest-count">{{ item.occurrenceCount }} 条合并</span>
            </div>
            <p>{{ item.summary || eventLabel(item.eventType) }}</p>
            <div class="digest-meta">
              <span>{{ subscriptionSourceLabel(item) }}</span>
              <span>{{ resourceTypeLabel(item.resourceType) }}</span>
              <span v-if="item.occurredAt">{{ formatOptionalTime(item.occurredAt) }}</span>
              <span v-if="item.revisit">回访状态：{{ revisitStatusLabel(item.revisit.status) }}</span>
            </div>
          </div>
          <RouterLink v-if="item.targetPath" :to="item.targetPath" class="digest-button">
            查看
          </RouterLink>
          <span v-else class="digest-disabled">当前不可跳转</span>
        </article>
      </div>

      <div v-else class="digest-state" data-update-digest-state="empty">
        <BellRing class="h-4 w-4" />
        <div>
          <strong>暂时没有新的公开更新</strong>
          <p>没有符合当前筛选条件和账号可见性的更新摘要。</p>
        </div>
      </div>

      <div v-if="hasMore" class="digest-more">
        <button type="button" class="digest-button" :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多摘要' }}
        </button>
        <span v-if="loadMoreError" class="digest-more-error">{{ loadMoreError }}</span>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertCircle, BellRing, BookOpen, Layers3, Lightbulb, LogIn, RefreshCcw } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import {
  updateDigestApi,
  type UpdateDigestItem,
  type UpdateDigestResourceType,
  type UpdateDigestSourceType,
  type UpdateDigestSubscriptionSourceType,
} from '@/api/updateDigest'
import { formatTime } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{
  subscriptionSourceType?: UpdateDigestSubscriptionSourceType
  subscriptionSourceId?: string | number
  resourceType?: UpdateDigestResourceType
  resourceId?: string | number
  /** @deprecated Use subscriptionSourceType or resourceType. */
  sourceType?: UpdateDigestSourceType
  /** @deprecated Use subscriptionSourceId or resourceId. */
  sourceId?: string | number
  title?: string
  routeState?: boolean
}>(), {
  subscriptionSourceType: undefined,
  subscriptionSourceId: undefined,
  resourceType: undefined,
  resourceId: undefined,
  sourceType: undefined,
  sourceId: undefined,
  title: '',
  routeState: false,
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const items = ref<UpdateDigestItem[]>([])
const nextCursor = ref<string | undefined>()
const hasMore = ref(false)
const diagnostics = ref<Record<string, unknown>>({})
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreError = ref('')
let requestGeneration = 0

const subscriptionSourceTypeOptions: Array<{
  value: UpdateDigestSubscriptionSourceType
  label: string
}> = [
  { value: 'TOPIC', label: '主题' },
  { value: 'DISCUSSION', label: '讨论' },
  { value: 'NEED', label: '共建需求' },
]
const resourceTypeOptions: Array<{ value: UpdateDigestResourceType; label: string }> = [
  { value: 'POST', label: '公开内容' },
  { value: 'TOPIC', label: '主题' },
  { value: 'NEED', label: '共建需求' },
  { value: 'COLLECTION', label: '合集' },
  { value: 'SERIES', label: '协作系列' },
]
const validSubscriptionSourceTypes = new Set(
  subscriptionSourceTypeOptions.map((option) => option.value),
)
const validResourceTypes = new Set(resourceTypeOptions.map((option) => option.value))
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const validCanonicalIdentifier = (value: string) => /^[1-9][0-9]{0,79}$/.test(value)
const routeValue = (name: string) => String(firstQueryValue(route.query[name]) || '').trim()
const routeSubscriptionSourceType = computed(() => {
  if (!props.routeState) return undefined
  const value = routeValue('subscriptionSourceType').toUpperCase()
  return validSubscriptionSourceTypes.has(value as UpdateDigestSubscriptionSourceType)
    ? value as UpdateDigestSubscriptionSourceType
    : undefined
})
const routeSubscriptionSourceId = computed(() => {
  if (!props.routeState) return undefined
  const value = routeValue('subscriptionSourceId')
  return validCanonicalIdentifier(value) ? value : undefined
})
const routeResourceType = computed(() => {
  if (!props.routeState) return undefined
  const value = routeValue('resourceType').toUpperCase()
  return validResourceTypes.has(value as UpdateDigestResourceType)
    ? value as UpdateDigestResourceType
    : undefined
})
const routeResourceId = computed(() => {
  if (!props.routeState) return undefined
  const value = routeValue('resourceId')
  return validCanonicalIdentifier(value) ? value : undefined
})
const routeLegacySourceType = computed(() => {
  if (!props.routeState) return undefined
  const value = routeValue('sourceType').toUpperCase()
  return validResourceTypes.has(value as UpdateDigestSourceType)
    ? value as UpdateDigestSourceType
    : undefined
})
const routeLegacySourceId = computed(() => {
  if (!props.routeState) return undefined
  const value = routeValue('sourceId')
  return validCanonicalIdentifier(value) ? value : undefined
})
const effectiveSubscriptionSourceType = computed(
  () => props.subscriptionSourceType ?? routeSubscriptionSourceType.value,
)
const effectiveSubscriptionSourceId = computed(
  () => props.subscriptionSourceId ?? routeSubscriptionSourceId.value,
)
const effectiveResourceType = computed(() => (
  props.resourceType
  ?? routeResourceType.value
  ?? props.sourceType
  ?? routeLegacySourceType.value
))
const effectiveResourceId = computed(() => (
  props.resourceId
  ?? routeResourceId.value
  ?? props.sourceId
  ?? routeLegacySourceId.value
))
const accountKey = computed(() => `${String(authStore.user?.uid ?? 'anonymous')}:${authStore.token ? 'authenticated' : 'anonymous'}`)
const requestKey = computed(() => JSON.stringify([
  accountKey.value,
  effectiveSubscriptionSourceType.value,
  effectiveSubscriptionSourceId.value,
  effectiveResourceType.value,
  effectiveResourceId.value,
]))
const loginPath = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))
const sourceLabel = computed(() => {
  if (effectiveSubscriptionSourceType.value) {
    return `关注${subscriptionSourceTypeLabel(effectiveSubscriptionSourceType.value)}`
  }
  if (effectiveResourceType.value) return resourceTypeLabel(effectiveResourceType.value)
  return '关注内容'
})
const state = computed(() => {
  if (!authStore.isLoggedIn) return 'empty'
  if (loading.value && items.value.length === 0) return 'loading'
  if (errorText.value && items.value.length === 0) return 'error'
  return items.value.length ? 'ready' : 'empty'
})
const partialNotice = computed(() => {
  if (loadMoreError.value) return `部分摘要加载失败：${loadMoreError.value}，已保留当前结果。`
  if (
    diagnostics.value.digestSourceUnavailable === true
  ) {
    return '更新摘要暂时不可用，当前没有补造本地更新。'
  }
  if (
    diagnostics.value.resourceVerificationDegraded === true
    || diagnostics.value.resourceVisibilityCheckDegraded === true
  ) {
    return '部分更新的公开性暂时无法确认，相关内容已保守隐藏。'
  }
  return ''
})

const reset = () => {
  requestGeneration += 1
  items.value = []
  nextCursor.value = undefined
  hasMore.value = false
  diagnostics.value = {}
  loading.value = false
  loadingMore.value = false
  errorText.value = ''
  loadMoreError.value = ''
}

const mergeItems = (current: UpdateDigestItem[], incoming: UpdateDigestItem[]) => {
  const values = new Map(current.map((item) => [item.digestKey, item]))
  for (const item of incoming) values.set(item.digestKey, item)
  return [...values.values()]
}

const load = async (append = false) => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) {
    reset()
    return
  }
  if (append) {
    if (!hasMore.value || !nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    loadMoreError.value = ''
  } else {
    requestGeneration += 1
    items.value = []
    nextCursor.value = undefined
    hasMore.value = false
    diagnostics.value = {}
    errorText.value = ''
    loadMoreError.value = ''
    loading.value = true
  }

  const generation = requestGeneration
  const account = requestKey.value
  try {
    const res = await updateDigestApi.list({
      subscriptionSourceType: effectiveSubscriptionSourceType.value,
      subscriptionSourceId: effectiveSubscriptionSourceId.value,
      resourceType: effectiveResourceType.value,
      resourceId: effectiveResourceId.value,
      cursor: append ? nextCursor.value : undefined,
      size: 10,
    })
    if (generation !== requestGeneration || account !== requestKey.value) return
    const page = res.data
    const incoming = page?.items || []
    items.value = append ? mergeItems(items.value, incoming) : incoming
    nextCursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
    diagnostics.value = page?.diagnostics || {}
  } catch (error) {
    if (generation !== requestGeneration || account !== requestKey.value) return
    const message = getErrorMessage(error, '更新摘要加载失败')
    if (append) loadMoreError.value = message
    else errorText.value = message
  } finally {
    if (generation === requestGeneration && account === requestKey.value) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

const loadMore = () => {
  void load(true)
}

const retry = () => {
  void load()
}

const replaceRouteFilters = (patch: Record<string, string | undefined>) => {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      ...patch,
    },
  })
}

const setRouteSubscriptionSourceType = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value.toUpperCase()
  replaceRouteFilters({
    subscriptionSourceType: validSubscriptionSourceTypes.has(value as UpdateDigestSubscriptionSourceType)
      ? value
      : undefined,
    subscriptionSourceId: undefined,
    sourceType: undefined,
    sourceId: undefined,
  })
}

const setRouteSubscriptionSourceId = (event: Event) => {
  const value = (event.target as HTMLInputElement).value.trim()
  replaceRouteFilters({
    subscriptionSourceId: validCanonicalIdentifier(value) ? value : undefined,
    sourceType: undefined,
    sourceId: undefined,
  })
}

const setRouteResourceType = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value.toUpperCase()
  replaceRouteFilters({
    resourceType: validResourceTypes.has(value as UpdateDigestResourceType) ? value : undefined,
    resourceId: undefined,
    sourceType: undefined,
    sourceId: undefined,
  })
}

const setRouteResourceId = (event: Event) => {
  const value = (event.target as HTMLInputElement).value.trim()
  replaceRouteFilters({
    resourceId: validCanonicalIdentifier(value) ? value : undefined,
    sourceType: undefined,
    sourceId: undefined,
  })
}

const sourceIcon = (
  sourceType: UpdateDigestSubscriptionSourceType | UpdateDigestResourceType | undefined,
) => {
  if (sourceType === 'TOPIC') return Lightbulb
  if (sourceType === 'COLLECTION') return Layers3
  if (sourceType === 'SERIES') return Layers3
  if (sourceType === 'NEED') return BellRing
  return BookOpen
}

const subscriptionSourceTypeLabel = (sourceType: UpdateDigestSubscriptionSourceType) => {
  if (sourceType === 'TOPIC') return '主题'
  if (sourceType === 'DISCUSSION') return '讨论'
  return '共建需求'
}

const resourceTypeLabel = (sourceType: UpdateDigestResourceType) => {
  if (sourceType === 'TOPIC') return '关联主题'
  if (sourceType === 'NEED') return '共建需求'
  if (sourceType === 'COLLECTION') return '关联合集'
  if (sourceType === 'SERIES') return '关联协作系列'
  return '关联公开内容'
}

const subscriptionSourceLabel = (item: UpdateDigestItem) => (
  item.subscriptionSourceType
    ? `因关注${subscriptionSourceTypeLabel(item.subscriptionSourceType)}`
    : '来自已关注内容'
)

const revisitStatusLabel = (status: string) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'OPEN') return '待回访'
  if (normalized === 'SNOOZED') return '已延后'
  if (normalized === 'COMPLETED') return '已完成'
  if (normalized === 'IGNORED') return '已忽略'
  return '状态未知'
}

const eventLabel = (eventType: string) => {
  const normalized = String(eventType || '').toUpperCase()
  if (normalized.includes('PUBLISHED')) return '有新的公开内容发布。'
  if (normalized.includes('MAINTENANCE')) return '公开内容维护已经完成。'
  if (normalized.includes('FRESHNESS')) return '公开内容的时效状态发生变化。'
  if (normalized.includes('COMMENT') || normalized.includes('REPLY')) return '公开讨论有新的回应。'
  return '相关公开内容有新的可见进展。'
}

const formatOptionalTime = (value: string) => {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && timestamp > 0 ? formatTime(timestamp) : value
}

watch(
  requestKey,
  () => {
    reset()
    if (authStore.isLoggedIn) void load()
  },
  { immediate: true },
)
</script>

<style scoped>
.update-digest-panel {
  margin-top: 1rem;
  border: 1px solid rgb(169 216 195);
  border-radius: 0.75rem;
  background: rgb(232 243 237);
  padding: 1rem;
}

.digest-head,
.digest-state,
.digest-notice,
.digest-item,
.digest-item-title,
.digest-meta {
  display: flex;
  gap: 0.7rem;
}

.digest-head {
  align-items: flex-start;
  justify-content: space-between;
}

.digest-eyebrow {
  color: rgb(26 127 90);
  font-size: 0.75rem;
  font-weight: 900;
}

.digest-head h2 {
  margin-top: 0.15rem;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.digest-head p,
.digest-state p,
.digest-item p,
.digest-meta,
.digest-more-error {
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.55;
}

.digest-head p {
  margin-top: 0.35rem;
  max-width: 58rem;
}

.digest-link,
.digest-button {
  display: inline-flex;
  min-height: 2.15rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
}

.digest-link {
  background: white;
  color: rgb(18 99 74);
}

.digest-button {
  border: 1px solid rgb(169 216 195);
  background: white;
  color: rgb(18 99 74);
}

.digest-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.digest-state {
  margin-top: 0.9rem;
  min-height: 3.5rem;
  align-items: center;
  border-radius: 0.6rem;
  background: white;
  padding: 0.85rem;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 700;
}

.digest-state strong {
  color: var(--text-strong);
  font-weight: 900;
}

.digest-state p {
  margin-top: 0.2rem;
  font-weight: 500;
}

.digest-state-error {
  border: 1px solid rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.digest-state-error strong {
  color: rgb(153 27 27);
}

.digest-state-error .digest-button {
  margin-left: auto;
}

.digest-notice {
  margin-top: 0.9rem;
  align-items: flex-start;
  border-radius: 0.6rem;
  background: rgb(255 251 235);
  padding: 0.7rem 0.8rem;
  color: rgb(146 64 14);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.5;
}

.digest-list {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.55rem;
}

.digest-item {
  align-items: flex-start;
  border-radius: 0.6rem;
  background: white;
  padding: 0.75rem;
}

.digest-item-icon {
  display: flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  background: rgb(205 232 220);
  color: rgb(18 99 74);
}

.digest-item-title {
  flex-wrap: wrap;
  align-items: center;
}

.digest-item h3 {
  min-width: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 0.86rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.digest-item p {
  margin-top: 0.25rem;
}

.digest-count {
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.digest-count {
  background: rgb(205 232 220);
  color: rgb(18 99 74);
}

.digest-meta {
  margin-top: 0.35rem;
  flex-wrap: wrap;
  gap: 0.35rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.digest-disabled {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.digest-more {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.85rem;
}

@media (max-width: 720px) {
  .digest-head {
    flex-direction: column;
  }

  .digest-link {
    width: 100%;
  }

  .digest-item {
    display: grid;
    grid-template-columns: 2rem minmax(0, 1fr);
  }

  .digest-item > .digest-button,
  .digest-item > .digest-disabled {
    grid-column: 1 / -1;
    width: 100%;
  }
}

.dark .update-digest-panel {
  border-color: rgb(10 52 39);
  background: var(--surface-1);
}

.dark .digest-head h2,
.dark .digest-state strong,
.dark .digest-item h3 {
  color: var(--text-strong);
}

.dark .digest-head p,
.dark .digest-state p,
.dark .digest-item p,
.dark .digest-meta,
.dark .digest-more-error {
  color: var(--text-muted);
}

.dark .digest-link,
.dark .digest-button,
.dark .digest-state,
.dark .digest-item {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .digest-link,
.dark .digest-button {
  color: rgb(169 216 195);
}

.dark .digest-item-icon,
.dark .digest-count {
  background: rgb(10 52 39);
  color: rgb(169 216 195);
}

.dark .digest-notice {
  background: rgb(69 26 3);
  color: rgb(253 186 116);
}

.dark .digest-state-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

.dark .digest-state-error strong {
  color: rgb(254 202 202);
}

.digest-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(9rem, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.digest-filters label,
.digest-filters span {
  display: block;
}

.digest-filters span {
  margin-bottom: 0.35rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.digest-filters select,
.digest-filters input {
  width: 100%;
  min-height: 2.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0 0.7rem;
  color: var(--text-strong);
  font-size: 0.8rem;
}

.dark .digest-filters select,
.dark .digest-filters input {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

@media (max-width: 960px) {
  .digest-filters {
    grid-template-columns: repeat(2, minmax(10rem, 1fr));
  }
}

@media (max-width: 640px) {
  .digest-filters {
    grid-template-columns: 1fr;
  }
}
</style>
