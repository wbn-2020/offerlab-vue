<template>
  <div class="app-shell relationship-page">
    <AppHeader />
    <main class="community-page relationship-main">
      <header class="workspace-header">
        <div class="workspace-heading">
          <p class="workspace-kicker">个人工作台 · 关系</p>
          <h1>关系与订阅中心</h1>
          <p>
            集中查看你关注的用户、话题、讨论和共建资源，并调整更新接收方式。
          </p>
        </div>
        <div class="workspace-header-actions">
          <RouterLink to="/me/notifications?view=updates" class="secondary-action">更新收件箱</RouterLink>
          <button
            type="button"
            class="secondary-action"
            :disabled="isLoading || isSummaryLoading"
            @click="reload"
          >
            <RefreshCw class="control-icon" :class="{ 'animate-spin': isLoading || isSummaryLoading }" />
            刷新
          </button>
        </div>
      </header>

      <div class="relationship-layout">
        <section class="workspace-panel" aria-labelledby="relationship-list-title">
          <div class="workspace-toolbar">
            <div class="toolbar-heading">
              <h2 id="relationship-list-title">关系列表</h2>
              <span>{{ displayedItems.length ? `当前已加载 ${displayedItems.length} 项` : '按状态和类型筛选' }}</span>
            </div>
            <label class="filter-field">
              <span>关系类型</span>
              <select :value="sourceType ?? ''" class="filter-select" aria-label="按关系类型筛选" @change="setSourceType">
                <option value="">全部类型</option>
                <option v-for="option in sourceTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>

          <div class="mode-tabs" role="tablist" aria-label="关系状态">
            <button
              v-for="(tab, index) in modeTabs"
              :id="relationshipModeTabId(tab.value)"
              :key="tab.value"
              type="button"
              role="tab"
              :aria-controls="relationshipModePanelId"
              :aria-selected="mode === tab.value"
              :tabindex="mode === tab.value ? 0 : -1"
              class="mode-tab"
              :class="{ active: mode === tab.value }"
              @click="setMode(tab.value)"
              @keydown="handleModeTabKeydown($event, index)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div
            :id="relationshipModePanelId"
            role="tabpanel"
            :aria-labelledby="relationshipModeTabId(mode)"
            tabindex="0"
            :aria-busy="isLoading"
          >
            <p v-if="focusNotice" class="partial-error" data-relationship-state="focus-unavailable">
              <AlertCircle class="control-icon" />
              <span>{{ focusNotice }}</span>
            </p>

            <div v-if="isLoading && !displayedItems.length" class="state-block" data-relationship-state="loading">
              <Loader2 class="state-icon animate-spin" />
              <div>
                <strong>正在加载你的关系</strong>
                <p>正在同步关注状态和更新接收方式。</p>
              </div>
            </div>
            <div v-else-if="loadError && !displayedItems.length" class="state-block state-block-error" data-relationship-state="error">
              <AlertCircle class="state-icon" />
              <div>
                <strong>关系暂时无法读取</strong>
                <p>{{ loadError }}</p>
              </div>
              <button type="button" class="secondary-action" @click="reload">重新加载</button>
            </div>
            <div v-else-if="!displayedItems.length" class="state-block" data-relationship-state="empty">
              <Link2 class="state-icon" />
              <div>
                <strong>当前没有匹配的关系</strong>
                <p>去发现页关注用户、话题或共建资源后，它们会在这里集中出现。</p>
              </div>
              <RouterLink to="/explore" class="primary-action">去发现</RouterLink>
            </div>
            <div v-else class="relationship-list">
              <article
                v-for="item in displayedItems"
                :id="relationshipDomId(item)"
                :key="relationshipKey(item)"
                class="relationship-row"
                :class="{ focused: isSameRelationship(selected, item) }"
              >
                <div class="relationship-content">
                  <div class="relationship-meta">
                    <span class="source-pill">{{ sourceTypeLabel(item.sourceType) }}</span>
                    <span class="status-pill" :class="statusClass(item)">{{ deliveryModeLabel(item.deliveryMode) }}</span>
                    <span v-if="item.unreadCount" class="unread-pill">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }} 条更新</span>
                    <span class="updated-time">更新于 {{ formatTime(item.updatedAt) }}</span>
                  </div>
                  <h3>{{ item.title }}</h3>
                  <p v-if="item.summary" class="relationship-summary">{{ item.summary }}</p>
                </div>
                <div class="relationship-actions">
                  <RouterLink v-if="item.sourceVisible" :to="item.targetPath" class="secondary-action">查看来源</RouterLink>
                  <span v-else class="unavailable-label">来源不可见</span>
                  <button
                    :id="relationshipPreferenceTriggerId(item)"
                    type="button"
                    class="primary-action"
                    @click="openPreference(item)"
                  >
                    {{ item.deliveryPreferenceSupported ? '订阅设置' : '查看接收状态' }}
                  </button>
                </div>
              </article>
            </div>

            <div v-if="loadError && displayedItems.length" class="partial-error" data-relationship-state="partial-error">
              <AlertCircle class="control-icon" />
              <span>{{ loadError }}</span>
              <button type="button" class="text-button" @click="reload">重试</button>
            </div>
            <button
              v-if="hasMore"
              type="button"
              class="load-more"
              :disabled="isLoading"
              @click="loadMore"
            >
              <Loader2 v-if="isLoading" class="control-icon animate-spin" />
              {{ isLoading ? '正在加载...' : '加载更多' }}
            </button>
          </div>
        </section>

        <aside class="relationship-sidebar" aria-label="关系摘要与说明">
          <section class="summary-panel" aria-labelledby="relationship-summary-title">
            <div class="side-heading">
              <div>
                <p>关系概览</p>
                <h2 id="relationship-summary-title">接收状态</h2>
              </div>
              <Loader2 v-if="isSummaryLoading" class="control-icon animate-spin" aria-label="正在加载关系摘要" />
            </div>
            <dl class="summary-list">
              <div v-for="stat in summaryStats" :key="stat.key" class="summary-row">
                <dt>{{ stat.label }}</dt>
                <dd v-if="!isSummaryLoading">{{ stat.value }}</dd>
                <dd v-else><span class="summary-skeleton" aria-hidden="true" /></dd>
              </div>
            </dl>
            <p v-if="summaryError" class="summary-error">{{ summaryError }}</p>
          </section>

          <section class="guidance-panel">
            <p class="guidance-kicker">接收规则</p>
            <h2>关系和通知各自独立</h2>
            <p>这里管理来源级更新，不影响直接回复、@ 提及和与你提交事项相关的结果通知。</p>
            <RouterLink to="/me/notifications" class="workspace-link">管理通知</RouterLink>
          </section>
        </aside>
      </div>
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
        <div class="modal-heading">
          <div class="modal-title">
            <span class="source-pill">{{ sourceTypeLabel(selected.sourceType) }}</span>
            <h2
              id="relationship-preference-title"
              ref="preferenceDialogTitle"
              tabindex="-1"
            >
              {{ selected.title }}
            </h2>
            <p id="relationship-preference-description">
              只调整后续来源更新的接收方式，不会替代原资源页面上的关注或取消关注动作。
            </p>
            <p class="modal-note">
              不影响直接回复、@ 提及及与你提交事项相关的结果通知。
            </p>
          </div>
          <button type="button" class="icon-button" aria-label="关闭订阅设置" title="关闭" @click="closePreference">
            <X class="h-5 w-5" />
          </button>
        </div>

        <div v-if="isPreferenceLoading" class="state-inline" aria-live="polite">
          <Loader2 class="h-4 w-4 animate-spin" /> 正在读取偏好...
        </div>
        <div v-else class="preference-content">
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
              <p class="field-help">留空表示持续静音。</p>
            </div>
            <p v-if="preferenceError" class="form-message form-message-error">{{ preferenceError }}</p>
            <p v-if="preferenceNotice" class="form-message form-message-success">{{ preferenceNotice }}</p>
            <div class="modal-actions">
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
.relationship-page {
  background: var(--surface-2);
}

.relationship-main {
  padding-top: 1.5rem;
  padding-bottom: 4rem;
}

.workspace-header,
.workspace-header-actions,
.workspace-toolbar,
.toolbar-heading,
.mode-tabs,
.relationship-meta,
.relationship-actions,
.side-heading,
.partial-error,
.state-inline,
.modal-heading,
.modal-actions,
.preference-unsupported {
  display: flex;
  align-items: center;
}

.workspace-header {
  justify-content: space-between;
  gap: 2rem;
  padding: 0.25rem 0 1.25rem;
  border-bottom: 1px solid var(--border-subtle);
}

.workspace-heading {
  min-width: 0;
}

.workspace-kicker,
.side-heading p,
.guidance-kicker {
  margin: 0 0 0.25rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.workspace-heading h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 850;
}

.workspace-heading > p:last-child {
  max-width: 64ch;
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.workspace-header-actions {
  flex: none;
  gap: 0.5rem;
}

.secondary-action,
.primary-action,
.icon-button,
.load-more,
.mode-tab,
.filter-select {
  min-height: 2.75rem;
  border-radius: var(--radius-control);
}

.control-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.relationship-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16.5rem;
  gap: 1.25rem;
  align-items: start;
  padding-top: 1.25rem;
}

.workspace-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.workspace-toolbar {
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.1rem;
}

.toolbar-heading {
  min-width: 0;
  align-items: baseline;
  gap: 0.75rem;
}

.toolbar-heading h2,
.side-heading h2,
.guidance-panel h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.toolbar-heading span {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.filter-field {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.55rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 750;
}

.filter-select,
.field-input {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.filter-select {
  min-width: 8rem;
  padding: 0.55rem 2rem 0.55rem 0.7rem;
  font-size: 0.8125rem;
  font-weight: 650;
}

.mode-tabs {
  gap: 1.25rem;
  overflow-x: auto;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1.1rem;
  scrollbar-width: none;
}

.mode-tabs::-webkit-scrollbar {
  display: none;
}

.mode-tab {
  flex: none;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  padding: 0 0.1rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 750;
}

.mode-tab:hover,
.mode-tab.active {
  border-bottom-color: var(--primary-600);
  color: var(--primary-700);
}

.relationship-list {
  min-width: 0;
}

.relationship-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.1rem;
  border-bottom: 1px solid var(--border-subtle);
  scroll-margin-top: 5rem;
}

.relationship-row:last-child {
  border-bottom: 0;
}

.relationship-row.focused {
  background: var(--primary-50);
  box-shadow: inset 3px 0 0 var(--primary-600);
}

.relationship-content {
  min-width: 0;
}

.relationship-meta {
  min-width: 0;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.relationship-content h3 {
  margin: 0.55rem 0 0;
  color: var(--text-strong);
  font-size: 0.9375rem;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.relationship-summary {
  display: -webkit-box;
  margin: 0.3rem 0 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.updated-time {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.relationship-actions {
  flex: none;
  gap: 0.5rem;
}

.relationship-actions .secondary-action,
.relationship-actions .primary-action {
  min-width: 5.5rem;
  padding-right: 0.75rem;
  padding-left: 0.75rem;
  font-size: 0.78rem;
}

.source-pill,
.status-pill,
.unread-pill {
  display: inline-flex;
  min-height: 1.5rem;
  align-items: center;
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 800;
}

.source-pill,
.status-pill.muted {
  background: var(--surface-3);
  color: var(--text-muted);
}

.status-pill.active {
  background: color-mix(in srgb, var(--success) 12%, var(--surface));
  color: var(--success);
}

.unread-pill {
  background: color-mix(in srgb, var(--warning) 12%, var(--surface));
  color: var(--warning);
}

.unavailable-label {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.relationship-sidebar {
  display: grid;
  gap: 1.25rem;
}

.summary-panel,
.guidance-panel {
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
}

.side-heading {
  justify-content: space-between;
  gap: 0.75rem;
}

.summary-list {
  margin: 0.8rem 0 0;
}

.summary-row {
  display: flex;
  min-height: 2.6rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.summary-row:last-child {
  border-bottom: 0;
}

.summary-row dt {
  color: var(--text-muted);
  font-size: 0.78rem;
}

.summary-row dd {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 850;
}

.summary-skeleton {
  display: block;
  width: 2rem;
  height: 0.8rem;
  border-radius: 3px;
  background: var(--surface-3);
}

.summary-error,
.guidance-panel > p:last-of-type {
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.55;
}

.summary-error {
  margin: 0.75rem 0 0;
  color: var(--warning);
}

.guidance-panel > p:last-of-type {
  margin: 0.5rem 0 0;
}

.workspace-link {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  margin-top: 0.75rem;
  color: var(--primary-700);
  font-size: 0.78rem;
  font-weight: 750;
}

.state-block {
  display: flex;
  min-height: 15rem;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  padding: 2rem;
  color: var(--text-muted);
  text-align: left;
}

.state-block strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.9rem;
}

.state-block p {
  max-width: 34rem;
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.state-block .primary-action,
.state-block .secondary-action {
  flex: none;
}

.state-block-error .state-icon {
  color: var(--danger);
}

.state-icon {
  width: 1.35rem;
  height: 1.35rem;
  flex: none;
  color: var(--primary-600);
}

.partial-error {
  justify-content: flex-start;
  gap: 0.55rem;
  border-top: 1px solid color-mix(in srgb, var(--warning) 28%, var(--border-subtle));
  background: color-mix(in srgb, var(--warning) 7%, var(--surface));
  padding: 0.75rem 1.1rem;
  color: var(--warning);
  font-size: 0.78rem;
}

.partial-error span {
  min-width: 0;
  flex: 1;
}

.text-button {
  min-height: 2.75rem;
  flex: none;
  color: var(--primary-700);
  font-size: 0.78rem;
  font-weight: 750;
}

.load-more {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 0;
  border-top: 1px solid var(--border-subtle);
  border-radius: 0;
  background: var(--surface);
  color: var(--primary-700);
  font-size: 0.8rem;
  font-weight: 750;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(16 24 40 / 0.54);
}

.preference-modal {
  width: min(100%, 34rem);
  max-height: min(90vh, 44rem);
  overflow-y: auto;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.25rem;
  box-shadow: 0 20px 50px rgb(16 24 40 / 0.2);
}

.modal-heading {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.modal-title {
  min-width: 0;
}

.modal-title h2 {
  margin: 0.65rem 0 0;
  color: var(--text-strong);
  font-size: 1.2rem;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.modal-title > p {
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.modal-title .modal-note {
  font-size: 0.72rem;
}

.icon-button {
  display: inline-grid;
  min-width: 2.75rem;
  flex: none;
  place-items: center;
  border: 1px solid transparent;
  color: var(--text-muted);
}

.preference-content {
  display: grid;
  gap: 1.1rem;
  margin-top: 1.25rem;
}

.state-inline {
  gap: 0.5rem;
  padding-top: 1.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.field-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 750;
}

.field-input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.55rem 0.7rem;
  font-size: 0.8125rem;
}

.field-help {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.preference-fieldset {
  min-width: 0;
}

.delivery-mode-group {
  display: grid;
  gap: 0.5rem;
}

.delivery-mode-option {
  display: flex;
  min-height: 4rem;
  cursor: pointer;
  align-items: flex-start;
  gap: 0.7rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.7rem;
  color: var(--text-primary);
}

.delivery-mode-option.active {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.delivery-mode-option input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.1rem;
  accent-color: var(--primary-600);
}

.delivery-mode-option span {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.delivery-mode-option strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
}

.delivery-mode-option small {
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.form-message {
  margin: 0;
  font-size: 0.78rem;
}

.form-message-error {
  color: var(--danger);
}

.form-message-success {
  color: var(--success);
}

.modal-actions {
  justify-content: flex-end;
  gap: 0.6rem;
}

.preference-unsupported {
  align-items: flex-start;
  gap: 0.7rem;
  border: 1px solid color-mix(in srgb, var(--warning) 30%, var(--border-subtle));
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--warning) 7%, var(--surface));
  padding: 0.85rem;
  color: var(--warning);
}

.preference-unsupported h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 800;
}

.preference-unsupported p {
  margin: 0.25rem 0 0;
  font-size: 0.75rem;
  line-height: 1.5;
}

:global(.dark .relationship-row.focused),
:global(.dark .delivery-mode-option.active) {
  background: color-mix(in srgb, var(--primary-600) 13%, var(--surface));
}

@media (max-width: 900px) {
  .relationship-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .relationship-sidebar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .relationship-main {
    padding-top: 1rem;
  }

  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
  }

  .workspace-heading h1 {
    font-size: 1.45rem;
  }

  .workspace-header-actions,
  .workspace-header-actions > * {
    width: 100%;
  }

  .workspace-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-heading {
    display: block;
  }

  .toolbar-heading span {
    display: block;
    margin-top: 0.25rem;
  }

  .filter-field {
    width: 100%;
    justify-content: space-between;
  }

  .filter-select {
    min-width: 0;
    flex: 1;
  }

  .mode-tabs {
    gap: 1rem;
    margin-right: calc(var(--community-page-gutter) * -1);
    margin-left: calc(var(--community-page-gutter) * -1);
    padding-right: var(--community-page-gutter);
    padding-left: var(--community-page-gutter);
  }

  .relationship-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .updated-time {
    width: 100%;
    margin-left: 0;
  }

  .relationship-actions,
  .relationship-actions > * {
    width: 100%;
  }

  .relationship-sidebar {
    grid-template-columns: minmax(0, 1fr);
  }

  .state-block {
    min-height: 13rem;
    align-items: flex-start;
    flex-direction: column;
    padding: 1.25rem;
  }

  .state-block .primary-action,
  .state-block .secondary-action {
    width: 100%;
  }

  .partial-error {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .partial-error .text-button {
    width: 100%;
    justify-content: flex-start;
  }

  .modal-actions {
    align-items: stretch;
    flex-direction: column-reverse;
  }

  .modal-actions > * {
    width: 100%;
  }
}
</style>
