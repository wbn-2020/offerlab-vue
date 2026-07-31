<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-semibold uppercase text-sky-600 dark:text-sky-400">我的关系</p>
          <h1 class="mt-2 text-3xl font-bold text-slate-950 dark:text-slate-50">关系与订阅中心</h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            集中查看你关注的用户、话题、讨论和共建资源，并调整更新接收方式。
          </p>
        </div>
        <button
          type="button"
          class="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-sky-400 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
          :disabled="isLoading || isSummaryLoading"
          @click="reload"
        >
          <RefreshCw class="mr-2 h-4 w-4" :class="{ 'animate-spin': isLoading || isSummaryLoading }" />
          刷新
        </button>
      </header>

      <section class="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="关系摘要">
        <article v-for="stat in summaryStats" :key="stat.key" class="summary-card">
          <span>{{ stat.label }}</span>
          <strong v-if="!isSummaryLoading">{{ stat.value }}</strong>
          <span v-else class="summary-skeleton" aria-label="正在加载" />
        </article>
      </section>
      <p v-if="summaryError" class="mb-5 text-sm text-amber-700 dark:text-amber-300">{{ summaryError }}</p>

      <section class="workspace-panel">
        <div class="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap gap-2" role="tablist" aria-label="关系状态">
            <button
              v-for="(tab, index) in modeTabs"
              :key="tab.value"
              :id="relationshipModeTabId(tab.value)"
              type="button"
              role="tab"
              :aria-controls="relationshipModePanelId"
              :aria-selected="mode === tab.value"
              :tabindex="mode === tab.value ? 0 : -1"
              class="filter-button"
              :class="{ active: mode === tab.value }"
              @click="setMode(tab.value)"
              @keydown="handleModeTabKeydown($event, index)"
            >
              {{ tab.label }}
            </button>
          </div>
          <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span class="sr-only">关系类型</span>
            <select :value="sourceType ?? ''" class="filter-select" aria-label="按关系类型筛选" @change="setSourceType">
              <option value="">全部类型</option>
              <option v-for="option in sourceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </div>
        <div
          :id="relationshipModePanelId"
          role="tabpanel"
          :aria-labelledby="relationshipModeTabId(mode)"
          tabindex="0"
          :aria-busy="isLoading"
        >
        <p v-if="focusNotice" class="partial-error" data-relationship-state="focus-unavailable">
          {{ focusNotice }}
        </p>

        <div v-if="isLoading && !displayedItems.length" class="state-block" data-relationship-state="loading">
          <Loader2 class="mx-auto h-6 w-6 animate-spin text-sky-600" />
          <p>正在加载你的关系...</p>
        </div>
        <div v-else-if="loadError && !displayedItems.length" class="state-block" data-relationship-state="error">
          <AlertCircle class="mx-auto h-6 w-6 text-rose-500" />
          <p class="font-semibold text-slate-900 dark:text-slate-100">{{ loadError }}</p>
          <button type="button" class="text-button" @click="reload">重新加载</button>
        </div>
        <div v-else-if="!displayedItems.length" class="state-block" data-relationship-state="empty">
          <Link2 class="mx-auto h-7 w-7 text-slate-400" />
          <p class="font-semibold text-slate-900 dark:text-slate-100">当前没有匹配的关系</p>
          <p class="max-w-md text-sm text-slate-500 dark:text-slate-400">去发现页关注用户、话题或共建资源后，它们会在这里集中出现。</p>
          <RouterLink to="/explore" class="primary-link">去发现</RouterLink>
        </div>
        <div v-else class="divide-y divide-slate-200 dark:divide-slate-800">
          <article
            v-for="item in displayedItems"
            :id="relationshipDomId(item)"
            :key="relationshipKey(item)"
            class="relationship-row"
            :class="{ focused: isSameRelationship(selected, item) }"
          >
            <div class="min-w-0 flex-1">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="source-pill">{{ sourceTypeLabel(item.sourceType) }}</span>
                <span class="status-pill" :class="statusClass(item)">{{ deliveryModeLabel(item.deliveryMode) }}</span>
                <span v-if="item.unreadCount" class="unread-pill">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }} 条更新</span>
              </div>
              <h2 class="truncate text-base font-semibold text-slate-950 dark:text-slate-50">{{ item.title }}</h2>
              <p v-if="item.summary" class="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{{ item.summary }}</p>
              <p class="mt-2 text-xs text-slate-400 dark:text-slate-500">最近更新 {{ formatTime(item.updatedAt) }}</p>
            </div>
            <div class="relationship-actions">
              <RouterLink v-if="item.sourceVisible" :to="item.targetPath" class="row-link">查看</RouterLink>
              <span v-else class="unavailable-label">来源不可见</span>
              <button
                :id="relationshipPreferenceTriggerId(item)"
                type="button"
                class="row-button"
                @click="openPreference(item)"
              >
                {{ item.deliveryPreferenceSupported ? '订阅设置' : '接收方式不可用' }}
              </button>
            </div>
          </article>
        </div>

        <div v-if="loadError && displayedItems.length" class="partial-error" data-relationship-state="partial-error">
          {{ loadError }}
          <button type="button" class="text-button" @click="reload">重试</button>
        </div>
        <button
          v-if="hasMore"
          type="button"
          class="load-more"
          :disabled="isLoading"
          @click="loadMore"
        >
          <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
          {{ isLoading ? '正在加载...' : '加载更多' }}
        </button>
        </div>
      </section>
    </main>

    <div v-if="selected" class="modal-backdrop" @click.self="closePreference">
      <section
        ref="preferenceDialog"
        class="preference-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relationship-preference-title"
        aria-describedby="relationship-preference-description"
        tabindex="-1"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <span class="source-pill">{{ sourceTypeLabel(selected.sourceType) }}</span>
            <h2
              id="relationship-preference-title"
              ref="preferenceDialogTitle"
              tabindex="-1"
              class="mt-3 text-xl font-bold text-slate-950 dark:text-slate-50"
            >
              {{ selected.title }}
            </h2>
            <p id="relationship-preference-description" class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              只调整后续来源更新的接收方式，不会替代原资源页面上的关注或取消关注动作。
            </p>
            <p class="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              不影响直接回复、@ 提及及与你提交事项相关的结果通知。
            </p>
          </div>
          <button type="button" class="icon-button" aria-label="关闭订阅设置" title="关闭" @click="closePreference">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="isPreferenceLoading" class="state-inline">
          <Loader2 class="h-4 w-4 animate-spin" /> 正在读取偏好...
        </div>
        <div v-else class="mt-6 space-y-5">
          <template v-if="selected.deliveryPreferenceSupported">
            <fieldset class="preference-fieldset">
              <legend class="field-label">更新接收方式</legend>
              <div class="delivery-mode-group" role="radiogroup" aria-label="更新接收方式">
                <label
                  v-for="option in deliveryModeOptions"
                  :key="option.value"
                  class="delivery-mode-option"
                  :class="{ active: preferenceMode === option.value }"
                >
                  <input
                    v-model="preferenceMode"
                    type="radio"
                    name="delivery-mode"
                    :value="option.value"
                    :disabled="isPreferenceSaving"
                  >
                  <span>
                    <strong>{{ option.label }}</strong>
                    <small>{{ option.description }}</small>
                  </span>
                </label>
              </div>
            </fieldset>
            <div v-if="preferenceMode === 'MUTED'">
              <label for="preference-expires-at" class="field-label">静音至（可选）</label>
              <input id="preference-expires-at" v-model="expiresAt" type="datetime-local" class="field-input">
              <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">留空表示持续静音。</p>
            </div>
            <p v-if="preferenceError" class="text-sm text-rose-600 dark:text-rose-300">{{ preferenceError }}</p>
            <p v-if="preferenceNotice" class="text-sm text-emerald-700 dark:text-emerald-300">{{ preferenceNotice }}</p>
            <div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" class="secondary-action" :disabled="isPreferenceSaving" @click="clearPreference">恢复即时更新</button>
              <button type="button" class="primary-action" :disabled="isPreferenceSaving" @click="savePreference">
                {{ isPreferenceSaving ? '保存中...' : '保存偏好' }}
              </button>
            </div>
          </template>
          <div
            v-else
            class="preference-unsupported"
            data-relationship-preference-state="unsupported"
          >
            <AlertCircle class="h-5 w-5 flex-shrink-0" />
            <div>
              <h3>当前关系暂不支持调整接收方式</h3>
              <p>{{ selected.deliveryPreferenceUnsupportedReason || '该关系暂不支持来源级更新接收设置。' }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { AlertCircle, Link2, Loader2, RefreshCw, X } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'
import { useRelationshipWorkspace } from '@/composables/useRelationshipWorkspace'
import {
  type RelationshipDeliveryMode,
  type RelationshipItem,
  type RelationshipMode,
  type RelationshipSourceType,
} from '@/api/relationships'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const supportedSourceTypeValues: RelationshipSourceType[] = [
  'USER',
  'TOPIC',
  'DISCUSSION',
  'NEED',
  'SERIES',
]
const validSourceTypes = new Set<string>(supportedSourceTypeValues)
const validModes = new Set<RelationshipMode>(['ALL', 'ACTIVE', 'MUTED'])
const asString = (value: unknown) => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
const routeSourceType = () => {
  const value = asString(route.query.sourceType).toUpperCase()
  return validSourceTypes.has(value) ? value as RelationshipSourceType : undefined
}
const routeMode = () => {
  const value = asString(route.query.mode).toUpperCase() as RelationshipMode
  return validModes.has(value) ? value : 'ALL'
}

const accountUid = computed(() => String(authStore.user?.uid ?? ''))
const workspace = useRelationshipWorkspace(accountUid, {
  sourceType: routeSourceType(),
  mode: routeMode(),
  sourceId: asString(route.query.sourceId),
})

const {
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
  savePreference: saveWorkspacePreference,
  clearPreference: clearWorkspacePreference,
} = workspace

const sourceTypeOptions = [
  { value: 'USER' as const, label: '用户' },
  { value: 'TOPIC' as const, label: '话题' },
  { value: 'DISCUSSION' as const, label: '讨论' },
  { value: 'NEED' as const, label: '共建需求' },
  { value: 'SERIES' as const, label: '合集' },
]
const modeTabs = [
  { value: 'ALL' as const, label: '全部关系' },
  { value: 'ACTIVE' as const, label: '正在接收' },
  { value: 'MUTED' as const, label: '已静音' },
]
const relationshipModePanelId = 'relationship-mode-panel'
const relationshipModeTabId = (value: RelationshipMode) => `relationship-mode-tab-${value.toLowerCase()}`

const summaryStats = computed(() => [
  { key: 'total', label: '全部关系', value: summary.value?.total ?? 0 },
  { key: 'active', label: '正在接收', value: summary.value?.active ?? 0 },
  { key: 'muted', label: '已静音', value: summary.value?.muted ?? 0 },
  { key: 'digest', label: '摘要更新', value: summary.value?.digest ?? 0 },
])
const displayedItems = computed(() => items.value.filter((item) => validSourceTypes.has(item.sourceType)))

const preferenceMode = ref<RelationshipDeliveryMode>('IMMEDIATE')
const expiresAt = ref('')
const deliveryModeOptions: Array<{
  value: RelationshipDeliveryMode
  label: string
  description: string
}> = [
  {
    value: 'IMMEDIATE',
    label: '即时更新',
    description: '新的来源更新会及时提醒。',
  },
  {
    value: 'DIGEST',
    label: '摘要更新',
    description: '集中收纳到更新摘要，不发送即时提醒。',
  },
  {
    value: 'MUTED',
    label: '暂不提醒',
    description: '保留关注关系，后续更新暂不投递。',
  },
]
const preferenceDialog = ref<HTMLElement | null>(null)
const preferenceDialogTitle = ref<HTMLElement | null>(null)
const lastPreferenceTriggerId = ref('')

const toLocalDateTimeInput = (value?: number) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16)
}

const toUtcIso = (value: string) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const formatTime = (value: number) => {
  if (!value) return '暂无公开更新时间'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

const sourceTypeLabel = (value: RelationshipSourceType) =>
  sourceTypeOptions.find((option) => option.value === value)?.label ?? '关系'

const deliveryModeLabel = (value: RelationshipDeliveryMode) => {
  if (value === 'MUTED') return '已静音'
  if (value === 'DIGEST') return '摘要更新'
  return '即时更新'
}

const statusClass = (item: RelationshipItem) => item.deliveryMode === 'MUTED' ? 'muted' : 'active'
const relationshipKey = (item: RelationshipItem) => `${item.sourceType}:${item.sourceId}`
const relationshipDomId = (item: RelationshipItem) => `relationship-${item.sourceType.toLowerCase()}-${item.sourceId}`
const relationshipPreferenceTriggerId = (item: RelationshipItem) => (
  `relationship-preference-trigger-${item.sourceType.toLowerCase()}-${item.sourceId}`
)
const isSameRelationship = (left: RelationshipItem | null, right: RelationshipItem) => Boolean(
  left
  && left.sourceType === right.sourceType
  && String(left.sourceId) === String(right.sourceId),
)

const syncQuery = async (patch: Record<string, string | undefined>) => {
  await router.replace({
    path: route.path,
    query: {
      ...route.query,
      ...patch,
    },
  })
}

const setMode = (nextMode: RelationshipMode) => {
  if (mode.value === nextMode) return
  focus(null)
  focusedSourceId.value = ''
  mode.value = nextMode
  void syncQuery({
    mode: nextMode === 'ALL' ? undefined : nextMode,
    sourceId: undefined,
  })
}

const rovingModeTabIndex = (key: string, currentIndex: number) => {
  if (key === 'ArrowLeft') return (currentIndex - 1 + modeTabs.length) % modeTabs.length
  if (key === 'ArrowRight') return (currentIndex + 1) % modeTabs.length
  if (key === 'Home') return 0
  if (key === 'End') return modeTabs.length - 1
  return null
}

const handleModeTabKeydown = (event: KeyboardEvent, currentIndex: number) => {
  const nextIndex = rovingModeTabIndex(event.key, currentIndex)
  if (nextIndex === null) return
  event.preventDefault()
  const nextMode = modeTabs[nextIndex]?.value
  if (!nextMode) return
  setMode(nextMode)
  void nextTick(() => document.getElementById(relationshipModeTabId(nextMode))?.focus())
}

const setSourceType = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value.toUpperCase()
  const nextSourceType = validSourceTypes.has(value) ? value as RelationshipSourceType : undefined
  if (sourceType.value === nextSourceType) return
  focus(null)
  focusedSourceId.value = ''
  sourceType.value = nextSourceType
  void syncQuery({
    sourceType: nextSourceType,
    sourceId: undefined,
  })
}

const openPreference = async (item: RelationshipItem) => {
  lastPreferenceTriggerId.value = relationshipPreferenceTriggerId(item)
  if (sourceType.value !== item.sourceType) {
    focusedSourceId.value = String(item.sourceId)
    sourceType.value = item.sourceType
    await syncQuery({ sourceType: item.sourceType, sourceId: String(item.sourceId) })
    return
  }
  focus(item)
  preferenceMode.value = item.deliveryMode
  expiresAt.value = toLocalDateTimeInput(item.expiresAt)
  await syncQuery({ sourceType: item.sourceType, sourceId: String(item.sourceId) })
  await loadPreference(item)
}

const closePreference = () => {
  const triggerId = lastPreferenceTriggerId.value
  lastPreferenceTriggerId.value = ''
  focus(null)
  void syncQuery({ sourceId: undefined })
  if (triggerId) {
    void nextTick(() => {
      const trigger = document.getElementById(triggerId)
      if (trigger) {
        trigger.focus()
        return
      }
      document.getElementById(relationshipModeTabId(mode.value))?.focus()
    })
  }
}

useAccessibleDialog(() => Boolean(selected.value), {
  close: closePreference,
  dialogRef: preferenceDialog,
  initialFocus: preferenceDialogTitle,
})

const savePreference = async () => {
  const normalizedExpiry = preferenceMode.value === 'MUTED'
    ? toUtcIso(expiresAt.value)
    : null
  const didSave = await saveWorkspacePreference(preferenceMode.value, normalizedExpiry)
  if (didSave && selectedPreference.value) {
    preferenceMode.value = selectedPreference.value.deliveryMode
    expiresAt.value = toLocalDateTimeInput(selectedPreference.value.expiresAt)
    if (
      (mode.value === 'ACTIVE' && preferenceMode.value === 'MUTED')
      || (mode.value === 'MUTED' && preferenceMode.value !== 'MUTED')
    ) {
      closePreference()
    }
  }
}

const clearPreference = async () => {
  const didClear = await clearWorkspacePreference()
  if (didClear) {
    preferenceMode.value = 'IMMEDIATE'
    expiresAt.value = ''
    if (mode.value === 'MUTED') closePreference()
  }
}

watch(selectedPreference, (value) => {
  if (!value) return
  preferenceMode.value = value.deliveryMode
  expiresAt.value = toLocalDateTimeInput(value.expiresAt)
})

watch(
  () => [asString(route.query.sourceType), asString(route.query.mode), asString(route.query.sourceId)] as const,
  ([nextSourceType, nextMode, nextSourceId], [previousSourceType, previousMode]) => {
    const normalizedType = nextSourceType.toUpperCase()
    const nextType = validSourceTypes.has(normalizedType)
      ? normalizedType as RelationshipSourceType
      : undefined
    const normalizedMode = nextMode.toUpperCase() as RelationshipMode
    const nextModeValue = validModes.has(normalizedMode) ? normalizedMode : 'ALL'
    const normalizedPreviousType = previousSourceType.toUpperCase()
    const previousType = validSourceTypes.has(normalizedPreviousType)
      ? normalizedPreviousType as RelationshipSourceType
      : undefined
    const normalizedPreviousMode = previousMode.toUpperCase() as RelationshipMode
    const previousModeValue = validModes.has(normalizedPreviousMode) ? normalizedPreviousMode : 'ALL'
    const filterChanged = nextType !== previousType || nextModeValue !== previousModeValue
    sourceType.value = nextType
    mode.value = nextModeValue
    focusedSourceId.value = nextSourceId
    const selectedMatchesQuery = Boolean(
      nextSourceId
      && selected.value
      && String(selected.value.sourceId) === nextSourceId
      && (!nextType || selected.value.sourceType === nextType),
    )
    if (
      !nextSourceId
      || !selectedMatchesQuery
    ) {
      focus(null)
      focusedSourceId.value = nextSourceId
    }
    if (
      nextSourceId
      && !filterChanged
      && !items.value.some((item) => (
        String(item.sourceId) === nextSourceId
        && (!sourceType.value || item.sourceType === sourceType.value)
      ))
    ) {
      void reload()
    }
  },
)

watch([items, focusedSourceId], () => {
  if (!focusedSourceId.value || selected.value) return
  const item = items.value.find((entry) => (
    String(entry.sourceId) === focusedSourceId.value
    && (!sourceType.value || entry.sourceType === sourceType.value)
  ))
  if (item) void loadPreference(item)
}, { deep: true })
</script>

<style scoped>
.summary-card,
.workspace-panel {
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
}

.summary-card {
  min-height: 6.5rem;
  border-radius: 0.5rem;
  padding: 1rem 1.1rem;
}

.summary-card span:first-child {
  display: block;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
}

.summary-card strong {
  display: block;
  margin-top: 0.65rem;
  color: rgb(15 23 42);
  font-size: 1.65rem;
  line-height: 1;
}

.summary-skeleton {
  width: 2.5rem;
  height: 1.45rem;
  margin-top: 0.65rem;
  border-radius: 0.25rem;
  background: rgb(226 232 240);
}

.workspace-panel {
  overflow: hidden;
  border-radius: 0.5rem;
}

.filter-button,
.filter-select,
.row-button,
.row-link,
.primary-link,
.text-button,
.load-more,
.primary-action,
.secondary-action {
  min-height: 2.75rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.row-button,
.row-link {
  min-height: 2.75rem;
}

.filter-button {
  padding: 0.55rem 0.8rem;
  color: rgb(71 85 105);
}

.filter-button.active {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.filter-select,
.field-select,
.field-input {
  border: 1px solid rgb(203 213 225);
  background: rgb(255 255 255);
  padding: 0.55rem 0.7rem;
  color: rgb(30 41 59);
}

.relationship-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  scroll-margin-top: 5rem;
}

.relationship-row.focused {
  background: rgb(240 249 255);
  box-shadow: inset 3px 0 0 rgb(14 165 233);
}

.relationship-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.75rem;
}

.row-link,
.primary-link,
.primary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgb(2 132 199);
  padding: 0.55rem 0.85rem;
  color: white;
}

.row-button,
.secondary-action {
  border: 1px solid rgb(203 213 225);
  padding: 0.55rem 0.85rem;
  color: rgb(51 65 85);
}

.unavailable-label {
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  font-weight: 700;
}

.source-pill,
.status-pill,
.unread-pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
}

.source-pill {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-pill.active {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-pill.muted {
  background: rgb(241 245 249);
  color: rgb(100 116 139);
}

.unread-pill {
  background: rgb(254 249 195);
  color: rgb(133 77 14);
}

.state-block {
  display: grid;
  justify-items: center;
  gap: 0.7rem;
  padding: 4.5rem 1.5rem;
  text-align: center;
  color: rgb(100 116 139);
}

.state-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 1.5rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.text-button {
  color: rgb(2 132 199);
  text-decoration: underline;
}

.partial-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgb(254 215 170);
  background: rgb(255 251 235);
  padding: 0.8rem 1.25rem;
  color: rgb(146 64 14);
  font-size: 0.875rem;
}

.load-more {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-top: 1px solid rgb(226 232 240);
  color: rgb(2 132 199);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  background: rgb(15 23 42 / 0.5);
  padding: 1rem;
}

.preference-modal {
  width: min(100%, 34rem);
  max-height: min(90vh, 44rem);
  overflow-y: auto;
  border-radius: 0.5rem;
  background: white;
  padding: 1.5rem;
  box-shadow: 0 20px 50px rgb(15 23 42 / 0.2);
}

.icon-button {
  display: inline-grid;
  min-height: 2.75rem;
  min-width: 2.75rem;
  place-items: center;
  border-radius: 0.375rem;
  color: rgb(71 85 105);
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  color: rgb(51 65 85);
  font-size: 0.875rem;
  font-weight: 700;
}

.field-select,
.field-input {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 0.375rem;
}

.preference-fieldset {
  min-width: 0;
}

.delivery-mode-group {
  display: grid;
  gap: 0.65rem;
}

.delivery-mode-option {
  display: flex;
  min-height: 4.25rem;
  cursor: pointer;
  align-items: flex-start;
  gap: 0.7rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.375rem;
  padding: 0.75rem;
  color: rgb(51 65 85);
}

.delivery-mode-option.active {
  border-color: rgb(14 165 233);
  background: rgb(240 249 255);
}

.delivery-mode-option input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.1rem;
  accent-color: rgb(2 132 199);
}

.delivery-mode-option span {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.delivery-mode-option strong {
  color: rgb(15 23 42);
  font-size: 0.875rem;
}

.delivery-mode-option small {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  line-height: 1.4;
}

.preference-unsupported {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  border: 1px solid rgb(254 215 170);
  border-radius: 0.375rem;
  background: rgb(255 251 235);
  padding: 0.9rem;
  color: rgb(146 64 14);
}

.preference-unsupported h3 {
  color: rgb(120 53 15);
  font-size: 0.875rem;
  font-weight: 800;
}

.preference-unsupported p {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.5;
}

.dark .summary-card,
.dark .workspace-panel,
.dark .preference-modal {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .summary-card span:first-child,
.dark .field-label,
.dark .row-button,
.dark .secondary-action {
  color: rgb(203 213 225);
}

.dark .summary-card strong,
.dark .field-select,
.dark .field-input {
  color: rgb(241 245 249);
}

.dark .filter-select,
.dark .field-select,
.dark .field-input,
.dark .row-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .delivery-mode-option {
  border-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .delivery-mode-option.active {
  border-color: rgb(14 116 144);
  background: rgb(8 47 73 / 0.45);
}

.dark .delivery-mode-option strong {
  color: rgb(241 245 249);
}

.dark .delivery-mode-option small {
  color: rgb(148 163 184);
}

.dark .preference-unsupported {
  border-color: rgb(120 53 15);
  background: rgb(69 26 3);
  color: rgb(253 186 116);
}

.dark .preference-unsupported h3 {
  color: rgb(254 215 170);
}

.dark .relationship-row.focused {
  background: rgb(8 47 73 / 0.45);
}

@media (max-width: 640px) {
  .relationship-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .relationship-actions {
    width: 100%;
  }

  .relationship-actions > * {
    flex: 1;
  }
}
</style>
