<template>
  <div class="app-shell governance-todos-page">
    <AppHeader />

    <main class="community-page governance-main">
      <header class="page-header">
        <div>
          <p class="page-kicker">频道质量治理</p>
          <h1>我的治理待办</h1>
          <span>这里只读取当前分配给你的待办；完成和改派仍需在对应治理工作区执行。</span>
        </div>
        <button type="button" class="secondary-action icon-button" title="刷新治理待办" :disabled="loading" @click="load()">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
          <span>刷新</span>
        </button>
      </header>

      <section class="todo-controls surface-panel">
        <div class="status-tabs" role="tablist" aria-label="按状态筛选治理待办">
          <button
            v-for="item in statusOptions"
            :key="item.value || 'ALL'"
            type="button"
            role="tab"
            :aria-selected="status === item.value"
            :class="{ 'is-active': status === item.value }"
            @click="selectStatus(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="filter-bar" aria-label="治理待办筛选">
          <label class="field-label">
            <span>任务类型</span>
            <select v-model="taskType" class="field-control" @change="applyFilters">
              <option value="">全部类型</option>
              <option v-for="item in taskTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
          <label class="field-label">
            <span>时限状态</span>
            <select v-model="dueState" class="field-control" @change="applyFilters">
              <option value="">全部时限</option>
              <option v-for="item in dueStateOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
      </section>

      <section v-if="page" :class="['projection-state', `projection-state--${page.dependencyStatus.toLowerCase()}`]" role="status">
        <div>
          <strong>{{ dependencyStatusLabel(page.dependencyStatus) }}</strong>
          <span>{{ dependencyStatusDescription(page.dependencyStatus) }}</span>
        </div>
        <small>评估于 {{ formatTime(page.evaluationTime) }} · 数据水位 {{ formatTime(page.freshThrough) }}</small>
      </section>

      <div v-if="errorText && items.length === 0" class="state state-error surface-panel" role="alert">
        <div><strong>治理待办暂时无法读取</strong><p>{{ errorText }}</p></div>
        <div class="state-actions">
          <button type="button" class="secondary-action secondary-button" :disabled="loading" @click="load()">重试</button>
          <RouterLink to="/me" class="secondary-action secondary-button">返回个人空间</RouterLink>
        </div>
      </div>
      <div v-else-if="loading" class="state surface-panel" role="status">
        <strong>正在读取治理待办</strong>
        <p>正在同步状态、时限和当前治理资格。</p>
      </div>
      <div v-else-if="items.length === 0" class="state surface-panel">
        <strong>当前没有符合筛选条件的治理待办</strong>
        <p>可以调整筛选条件，或稍后刷新查看新分配的事项。</p>
      </div>

      <section v-else class="todo-list" aria-label="治理待办列表">
        <article v-for="todo in items" :key="String(todo.todoId)" class="todo-row surface-panel">
          <header class="todo-head">
            <div class="todo-title-group">
              <div class="badge-line">
                <span :class="['status', `status--${todo.status.toLowerCase()}`]">{{ statusLabel(todo.status) }}</span>
                <span :class="['due-state', `due-state--${todo.dueState.toLowerCase()}`]">{{ dueStateLabel(todo.dueState) }}</span>
                <span v-if="todo.escalationLevel !== 'NONE'" class="escalation">{{ escalationLabel(todo.escalationLevel) }}</span>
              </div>
              <h2>{{ taskTypeLabel(todo.taskType) }}</h2>
            </div>
            <RouterLink v-if="todo.canOpenSource && todo.actionPath" :to="todo.actionPath" class="primary-action open-link">
              打开治理工作区
            </RouterLink>
          </header>

          <p class="meta">
            频道 {{ todo.domain }} · 待办 #{{ todo.todoId }} · 风险处置 #{{ todo.caseId }}
            <template v-if="todo.retrospectiveId"> · 复盘 #{{ todo.retrospectiveId }}</template>
          </p>
          <dl class="todo-facts">
            <div><dt>时限起点</dt><dd>{{ formatTime(todo.anchorAt) }}</dd></div>
            <div><dt>截止时间</dt><dd :class="{ 'is-overdue': todo.isOverdue }">{{ formatTime(todo.dueAt) }}</dd></div>
            <div><dt>当前可执行性</dt><dd>{{ actionabilityLabel(todo.actionability) }}</dd></div>
            <div><dt>处理结果</dt><dd>{{ resultLabel(todo) }}</dd></div>
          </dl>

          <p v-if="todo.status === 'OPEN' && !todo.canOpenSource" class="availability-note">
            {{ unavailableActionText(todo.actionability) }}
          </p>
        </article>
      </section>

      <div v-if="loadMoreErrorText && items.length > 0" class="state state-error load-more-error surface-panel">
        <div><strong>后续待办加载失败</strong><p>{{ loadMoreErrorText }}</p></div>
        <button type="button" class="secondary-action secondary-button" :disabled="loadingMore" @click="load(true)">重试加载更多</button>
      </div>
      <div v-else-if="hasMore && !loading" class="load-more-row">
        <button type="button" class="secondary-action secondary-button" :disabled="loadingMore" @click="load(true)">
          {{ loadingMore ? '正在加载' : '加载更多' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import {
  channelQualityGovernanceTodosApi,
  type ChannelQualityGovernanceTodo,
  type ChannelQualityGovernanceTodoActionability,
  type ChannelQualityGovernanceTodoDependencyStatus,
  type ChannelQualityGovernanceTodoDueState,
  type ChannelQualityGovernanceTodoEscalationLevel,
  type ChannelQualityGovernanceTodoQueryDueState,
  type ChannelQualityGovernanceTodoStatus,
  type ChannelQualityGovernanceTodoTaskType,
} from '@/api/channelQualityGovernanceTodos'
import type { ApiId } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

const PAGE_SIZE = 20
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const statuses: ChannelQualityGovernanceTodoStatus[] = ['OPEN', 'COMPLETED', 'CLOSED']
const taskTypes: ChannelQualityGovernanceTodoTaskType[] = [
  'ACKNOWLEDGE_CASE',
  'RECORD_PLAN',
  'COMPLETE_RETROSPECTIVE',
]
const queryDueStates: ChannelQualityGovernanceTodoQueryDueState[] = ['ON_TRACK', 'DUE_SOON', 'OVERDUE']
const dueStates: ChannelQualityGovernanceTodoDueState[] = ['ON_TRACK', 'DUE_SOON', 'OVERDUE', 'NOT_APPLICABLE']
const escalationLevels: ChannelQualityGovernanceTodoEscalationLevel[] = ['NONE', 'CHANNEL_ATTENTION', 'GOVERNANCE_ATTENTION']
const actionabilityStates: ChannelQualityGovernanceTodoActionability[] = ['ACTIONABLE', 'ASSIGNEE_INELIGIBLE', 'SOURCE_STALE', 'SOURCE_TERMINAL']
const dependencyStatuses: ChannelQualityGovernanceTodoDependencyStatus[] = ['READY', 'READ_ONLY_STALE', 'DELIVERY_DEGRADED', 'BLOCKED']
const slaOutcomes = new Set(['ON_TIME', 'OVERDUE_COMPLETED', 'EXCLUDED_REASSIGNED', 'EXCLUDED_SOURCE_TERMINATED', 'EXCLUDED_RECONCILIATION'])
const completionReasons = new Set(['OWNER_ACKNOWLEDGED', 'PLAN_RECORDED', 'RETROSPECTIVE_COMPLETED'])
const closeReasons = new Set(['ASSIGNEE_CHANGED', 'SOURCE_TERMINATED', 'RECONCILIATION_OBSOLETE'])
const taskTypeLabels: Record<ChannelQualityGovernanceTodoTaskType, string> = {
  ACKNOWLEDGE_CASE: '确认接手风险处置',
  RECORD_PLAN: '记录风险处置计划',
  COMPLETE_RETROSPECTIVE: '完成风险复盘',
}
const dueStateLabels: Record<ChannelQualityGovernanceTodoDueState | 'ALL', string> = {
  ALL: '全部时限',
  ON_TRACK: '正常',
  DUE_SOON: '临期',
  OVERDUE: '已逾期',
  NOT_APPLICABLE: '不适用',
}

const statusOptions: Array<{ value: ChannelQualityGovernanceTodoStatus | ''; label: string }> = [
  { value: '', label: '全部' },
  { value: 'OPEN', label: '待处理' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CLOSED', label: '已关闭' },
]
const taskTypeOptions = taskTypes.map((value) => ({ value, label: taskTypeLabels[value] }))
const dueStateOptions = queryDueStates.map((value) => ({ value, label: dueStateLabels[value] }))

const status = ref<ChannelQualityGovernanceTodoStatus | ''>('')
const taskType = ref<ChannelQualityGovernanceTodoTaskType | ''>('')
const dueState = ref<ChannelQualityGovernanceTodoQueryDueState | ''>('')
const items = ref<ChannelQualityGovernanceTodo[]>([])
const page = ref<{
  dependencyStatus: ChannelQualityGovernanceTodoDependencyStatus
  evaluationTime: string
  freshThrough: string
} | null>(null)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')

let accountGeneration = 0
let loadRequestId = 0
let loadController: AbortController | null = null

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
)
const normalizeApiId = (value: unknown): ApiId | null => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}
const normalizeTime = (value: unknown) => (
  typeof value === 'string' && value.trim() && Number.isFinite(Date.parse(value))
    ? value.trim()
    : null
)
const normalizeActionPath = (value: unknown) => (
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : null
)
const optionalEnum = <T extends string>(value: unknown, allowed: Set<string>): T | null => (
  value == null || value === '' ? null : allowed.has(String(value)) ? String(value) as T : null
)
const normalizeGovernanceTodo = (raw: unknown): ChannelQualityGovernanceTodo | null => {
  if (!isRecord(raw)) return null
  const todoId = normalizeApiId(raw.todoId)
  const caseId = normalizeApiId(raw.caseId)
  const retrospectiveId = raw.retrospectiveId == null ? null : normalizeApiId(raw.retrospectiveId)
  const domain = Number(raw.domain)
  const taskType = String(raw.taskType || '') as ChannelQualityGovernanceTodoTaskType
  const todoStatus = String(raw.status || '') as ChannelQualityGovernanceTodoStatus
  const todoDueState = String(raw.dueState || '') as ChannelQualityGovernanceTodoDueState
  const escalationLevel = String(raw.escalationLevel || '') as ChannelQualityGovernanceTodoEscalationLevel
  const actionability = String(raw.actionability || '') as ChannelQualityGovernanceTodoActionability
  const anchorAt = normalizeTime(raw.anchorAt)
  const dueAt = normalizeTime(raw.dueAt)
  if (
    todoId === null
    || caseId === null
    || (raw.retrospectiveId != null && retrospectiveId === null)
    || !Number.isSafeInteger(domain)
    || !taskTypes.includes(taskType)
    || !statuses.includes(todoStatus)
    || !dueStates.includes(todoDueState)
    || !escalationLevels.includes(escalationLevel)
    || !actionabilityStates.includes(actionability)
    || !anchorAt
    || !dueAt
  ) return null
  const actionPath = normalizeActionPath(raw.actionPath)
  return {
    todoId,
    caseId,
    retrospectiveId,
    domain,
    taskType,
    status: todoStatus,
    anchorAt,
    dueAt,
    dueState: todoDueState,
    isOverdue: raw.isOverdue === true,
    slaOutcome: optionalEnum<ChannelQualityGovernanceTodo['slaOutcome'] & string>(raw.slaOutcome, slaOutcomes),
    completionReason: optionalEnum<ChannelQualityGovernanceTodo['completionReason'] & string>(raw.completionReason, completionReasons),
    closeReason: optionalEnum<ChannelQualityGovernanceTodo['closeReason'] & string>(raw.closeReason, closeReasons),
    escalationLevel,
    actionability,
    canOpenSource: raw.canOpenSource === true && Boolean(actionPath),
    actionPath,
    todoVersion: Number.isSafeInteger(Number(raw.todoVersion)) ? Number(raw.todoVersion) : 0,
  }
}
const normalizeGovernancePage = (raw: unknown) => {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return null
  const dependencyStatus = String(raw.dependencyStatus || '') as ChannelQualityGovernanceTodoDependencyStatus
  const evaluationTime = normalizeTime(raw.evaluationTime)
  const freshThrough = normalizeTime(raw.freshThrough)
  if (!dependencyStatuses.includes(dependencyStatus) || !evaluationTime || !freshThrough) return null
  const normalizedItems = raw.items
    .map(normalizeGovernanceTodo)
    .filter((item): item is ChannelQualityGovernanceTodo => item !== null)
  if (raw.items.length > 0 && normalizedItems.length === 0) return null
  const normalizedCursor = typeof raw.nextCursor === 'string' && raw.nextCursor.trim()
    ? raw.nextCursor.trim()
    : null
  return {
    dependencyStatus,
    evaluationTime,
    freshThrough,
    nextCursor: normalizedCursor,
    items: normalizedItems,
  }
}

const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const routeValue = (name: 'status' | 'taskType' | 'dueState') => String(firstQueryValue(route.query[name]) || '').toUpperCase()
const currentAccountKey = () => `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
const currentFilterKey = () => `${status.value}|${taskType.value}|${dueState.value}`

const syncFiltersFromRoute = () => {
  const routeStatus = routeValue('status') as ChannelQualityGovernanceTodoStatus
  const routeTaskType = routeValue('taskType') as ChannelQualityGovernanceTodoTaskType
  const routeDueState = routeValue('dueState') as ChannelQualityGovernanceTodoQueryDueState
  status.value = statuses.includes(routeStatus) ? routeStatus : ''
  taskType.value = taskTypes.includes(routeTaskType) ? routeTaskType : ''
  dueState.value = queryDueStates.includes(routeDueState) ? routeDueState : ''
}

const clearState = () => {
  loadRequestId += 1
  loadController?.abort()
  loadController = null
  items.value = []
  page.value = null
  nextCursor.value = null
  hasMore.value = false
  loading.value = false
  loadingMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
}

const requestIsCurrent = (
  requestId: number,
  requestAccountGeneration: number,
  requestAccountKey: string,
  filterKey: string,
  controller: AbortController,
) => (
  requestId === loadRequestId
  && requestAccountGeneration === accountGeneration
  && requestAccountKey === currentAccountKey()
  && filterKey === currentFilterKey()
  && loadController === controller
  && !controller.signal.aborted
)

const isCanceledRequest = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) return true
  const candidate = error as { name?: unknown; code?: unknown } | null | undefined
  return candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const load = async (append = false) => {
  if (!authStore.isLoggedIn || !authStore.token) return
  if (append && (!hasMore.value || loadingMore.value || !nextCursor.value)) return

  const requestId = ++loadRequestId
  const requestAccountGeneration = accountGeneration
  const requestAccountKey = currentAccountKey()
  const filterKey = currentFilterKey()
  const cursor = append ? nextCursor.value : null
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller

  if (append) {
    loadingMore.value = true
    loadMoreErrorText.value = ''
  } else {
    loading.value = true
    loadingMore.value = false
    items.value = []
    page.value = null
    nextCursor.value = null
    hasMore.value = false
    errorText.value = ''
    loadMoreErrorText.value = ''
  }

  try {
    const response = await channelQualityGovernanceTodosApi.mineForDisplay({
      status: status.value || undefined,
      taskType: taskType.value || undefined,
      dueState: dueState.value || undefined,
      cursor: cursor || undefined,
      size: PAGE_SIZE,
    }, { signal: controller.signal })
    if (!requestIsCurrent(requestId, requestAccountGeneration, requestAccountKey, filterKey, controller)) return
    const data = normalizeGovernancePage(response.data)
    if (!data) throw new Error('invalid-governance-page')
    items.value = append ? [...items.value, ...data.items] : data.items
    page.value = {
      dependencyStatus: data.dependencyStatus,
      evaluationTime: data.evaluationTime,
      freshThrough: data.freshThrough,
    }
    nextCursor.value = data.nextCursor
    hasMore.value = data.nextCursor != null
  } catch (error) {
    if (!requestIsCurrent(requestId, requestAccountGeneration, requestAccountKey, filterKey, controller)) return
    if (isCanceledRequest(error, controller.signal)) return
    const message = append
      ? '后续治理待办暂时无法读取，请稍后重试。'
      : '治理待办暂时无法读取，请稍后重试。'
    if (append) loadMoreErrorText.value = message
    else errorText.value = message
  } finally {
    if (loadController === controller && requestId === loadRequestId) {
      if (append) loadingMore.value = false
      else loading.value = false
      loadController = null
    }
  }
}

const applyFilters = () => {
  const query = {
    ...(status.value ? { status: status.value } : {}),
    ...(taskType.value ? { taskType: taskType.value } : {}),
    ...(dueState.value ? { dueState: dueState.value } : {}),
  }
  const nextSignature = JSON.stringify(query)
  const currentSignature = JSON.stringify({
    ...(routeValue('status') ? { status: routeValue('status') } : {}),
    ...(routeValue('taskType') ? { taskType: routeValue('taskType') } : {}),
    ...(routeValue('dueState') ? { dueState: routeValue('dueState') } : {}),
  })
  if (nextSignature === currentSignature) {
    void load()
    return
  }
  void router.replace({ path: '/me/governance-todos', query })
}

const selectStatus = (value: ChannelQualityGovernanceTodoStatus | '') => {
  status.value = value
  applyFilters()
}

const taskTypeLabel = (value: ChannelQualityGovernanceTodoTaskType) => taskTypeLabels[value]

const statusLabel = (value: ChannelQualityGovernanceTodoStatus) => ({
  OPEN: '待处理',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
}[value])

const dueStateLabel = (value: ChannelQualityGovernanceTodoDueState | ChannelQualityGovernanceTodoQueryDueState) => (
  dueStateLabels[value]
)

const escalationLabel = (value: ChannelQualityGovernanceTodoEscalationLevel) => ({
  NONE: '未升级',
  CHANNEL_ATTENTION: '频道关注',
  GOVERNANCE_ATTENTION: '治理关注',
}[value])

const actionabilityLabel = (value: ChannelQualityGovernanceTodoActionability) => ({
  ACTIONABLE: '可在治理工作区处理',
  ASSIGNEE_INELIGIBLE: '当前治理资格已变化',
  SOURCE_STALE: '来源数据待刷新',
  SOURCE_TERMINAL: '来源已进入终态',
}[value])

const dependencyStatusLabel = (value: ChannelQualityGovernanceTodoDependencyStatus) => ({
  READY: '数据已就绪',
  READ_ONLY_STALE: '数据只读且可能陈旧',
  DELIVERY_DEGRADED: '提醒投递存在降级',
  BLOCKED: '依赖暂时阻塞',
}[value])

const dependencyStatusDescription = (value: ChannelQualityGovernanceTodoDependencyStatus) => ({
  READY: '当前列表依据最新评估结果展示。',
  READ_ONLY_STALE: '保留已投影的待办供查看，新的来源事实暂未推进。',
  DELIVERY_DEGRADED: '待办状态仍以系统记录为准，提醒投递会在依赖恢复后继续处理。',
  BLOCKED: '当前不能据此推断待办已完成或无需处理。',
}[value])

const resultLabel = (todo: ChannelQualityGovernanceTodo) => {
  if (todo.slaOutcome === 'ON_TIME') return '已按时完成'
  if (todo.slaOutcome === 'OVERDUE_COMPLETED') return '逾期后完成'
  if (todo.slaOutcome === 'EXCLUDED_REASSIGNED') return '已因负责人变更关闭'
  if (todo.slaOutcome === 'EXCLUDED_SOURCE_TERMINATED') return '已因来源终态关闭'
  if (todo.slaOutcome === 'EXCLUDED_RECONCILIATION') return '已在对账中关闭'
  if (todo.isOverdue) return '已逾期，等待权威治理动作'
  return '等待权威治理动作'
}

const unavailableActionText = (value: ChannelQualityGovernanceTodoActionability) => ({
  ACTIONABLE: '当前暂未提供可打开的治理入口。',
  ASSIGNEE_INELIGIBLE: '当前治理资格已变化，请联系频道治理人员处理。',
  SOURCE_STALE: '来源数据待刷新，当前不提供操作入口。',
  SOURCE_TERMINAL: '来源已进入终态，当前不提供操作入口。',
}[value])

const formatTime = (value: string) => {
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`
  const timestamp = Date.parse(normalized)
  if (!Number.isFinite(timestamp)) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}

watch(
  () => `${routeValue('status')}|${routeValue('taskType')}|${routeValue('dueState')}`,
  () => {
    syncFiltersFromRoute()
    void load()
  },
)

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    accountGeneration += 1
    clearState()
    if (uid && token) void load()
  },
)

onMounted(() => {
  syncFiltersFromRoute()
  void load()
})

onBeforeUnmount(() => {
  clearState()
})
</script>

<style scoped>
.governance-todos-page {
  min-width: 0;
}

.governance-main {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.page-header,
.todo-head,
.projection-state,
.state {
  display: flex;
}

.page-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.page-kicker {
  margin: 0;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.page-header h1 {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0;
  text-wrap: balance;
}

.page-header > div > span {
  display: block;
  max-width: 68ch;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.icon-button {
  flex: none;
}

.todo-controls {
  margin-bottom: 1rem;
  padding: 0 1rem 1rem;
}

.status-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
}

.status-tabs button {
  flex: none;
  min-height: 2.85rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0 0.8rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
  transition: color 180ms ease, border-color 180ms ease;
}

.status-tabs button:hover,
.status-tabs button.is-active {
  border-bottom-color: var(--primary-600);
  color: var(--primary-700);
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 15rem));
  gap: 0.75rem;
  padding-top: 1rem;
}

.field-label {
  display: grid;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.62rem 0.72rem;
  color: var(--text-primary);
  font-size: 0.82rem;
}

.field-control:focus {
  border-color: var(--primary-500);
}

.projection-state {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #b2ddff;
  border-radius: var(--radius-surface);
  background: #eff8ff;
  padding: 0.8rem 0.9rem;
  color: #175cd3;
}

.projection-state div {
  display: grid;
  gap: 0.18rem;
}

.projection-state strong {
  font-size: 0.8rem;
}

.projection-state span,
.projection-state small {
  font-size: 0.72rem;
  line-height: 1.5;
}

.projection-state small {
  color: #026aa2;
  white-space: nowrap;
}

.projection-state--read_only_stale,
.projection-state--delivery_degraded {
  border-color: #fedf89;
  background: #fffaeb;
  color: #93370d;
}

.projection-state--read_only_stale small,
.projection-state--delivery_degraded small {
  color: #b54708;
}

.projection-state--blocked {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.projection-state--blocked small {
  color: #d92d20;
}

.todo-list {
  display: grid;
  gap: 0.85rem;
}

.todo-row {
  min-width: 0;
  padding: 1.1rem;
}

.todo-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.todo-title-group {
  min-width: 0;
}

.badge-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.status,
.due-state,
.escalation {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 800;
}

.status--open {
  background: var(--primary-50);
  color: var(--primary-700);
}

.status--completed,
.due-state--on_track,
.due-state--not_applicable {
  background: #ecfdf3;
  color: #027a48;
}

.status--closed {
  background: var(--surface-3);
  color: var(--text-muted);
}

.due-state--due_soon {
  background: #fffaeb;
  color: #93370d;
}

.due-state--overdue,
.escalation {
  background: #fef3f2;
  color: #b42318;
}

.todo-head h2 {
  max-width: 48rem;
  margin: 0.55rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.45;
  text-wrap: pretty;
}

.open-link {
  flex: none;
  min-height: 2.25rem;
  padding: 0.45rem 0.75rem;
  white-space: nowrap;
}

.meta {
  margin: 0.75rem 0 0;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.55;
}

.todo-facts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 1rem 0 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-2);
}

.todo-facts div {
  min-width: 0;
  padding: 0.75rem;
}

.todo-facts div + div {
  border-left: 1px solid var(--border-subtle);
}

.todo-facts dt {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
}

.todo-facts dd {
  margin: 0.2rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.5;
}

.todo-facts dd.is-overdue {
  color: var(--danger);
}

.availability-note {
  margin: 0.85rem 0 0;
  border: 1px solid #fedf89;
  border-radius: var(--radius-control);
  background: #fffaeb;
  padding: 0.65rem 0.75rem;
  color: #93370d;
  font-size: 0.76rem;
  line-height: 1.55;
}

.state {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 7rem;
  padding: 1.25rem;
  color: var(--text-muted);
}

.state > div {
  text-align: left;
}

.state-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.state strong {
  color: var(--text-strong);
  font-size: 0.9rem;
}

.state p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
}

.state-error {
  border-color: #fecdca;
  background: #fffbfa;
  color: #b42318;
}

.load-more-error {
  min-height: 0;
  margin-top: 1rem;
}

.load-more-row {
  display: flex;
  justify-content: center;
  margin-top: 1rem;
}

:global(html.dark) .status--open {
  background: rgba(30, 64, 175, 0.34);
  color: #bfdbfe;
}

:global(html.dark) .status--completed,
:global(html.dark) .due-state--on_track,
:global(html.dark) .due-state--not_applicable {
  background: rgba(6, 78, 59, 0.42);
  color: #a7f3d0;
}

:global(html.dark) .due-state--due_soon,
:global(html.dark) .availability-note {
  border-color: #92400e;
  background: rgba(120, 53, 15, 0.32);
  color: #fdba74;
}

:global(html.dark) .due-state--overdue,
:global(html.dark) .escalation {
  background: rgba(127, 29, 29, 0.36);
  color: #fecaca;
}

:global(html.dark) .projection-state {
  border-color: #1e3a8a;
  background: rgba(30, 58, 138, 0.22);
  color: #bfdbfe;
}

:global(html.dark) .projection-state--read_only_stale,
:global(html.dark) .projection-state--delivery_degraded {
  border-color: #92400e;
  background: rgba(120, 53, 15, 0.3);
  color: #fdba74;
}

:global(html.dark) .projection-state--blocked,
:global(html.dark) .state-error {
  border-color: #7f1d1d;
  background: rgba(69, 10, 10, 0.3);
  color: #fecaca;
}

@media (max-width: 760px) {
  .governance-main {
    padding-top: 1.25rem;
  }

  .page-header,
  .todo-head,
  .projection-state,
  .state {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header .secondary-action,
  .todo-head .primary-action,
  .state .secondary-action {
    width: 100%;
  }

  .state-actions {
    width: 100%;
  }

  .filter-bar {
    grid-template-columns: 1fr;
  }

  .projection-state small {
    white-space: normal;
  }

  .todo-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .todo-facts div + div {
    border-left: 0;
  }

  .todo-facts div:nth-child(even) {
    border-left: 1px solid var(--border-subtle);
  }

  .todo-facts div:nth-child(n + 3) {
    border-top: 1px solid var(--border-subtle);
  }
}

@media (max-width: 420px) {
  .todo-facts {
    grid-template-columns: 1fr;
  }

  .todo-facts div:nth-child(even) {
    border-left: 0;
  }

  .todo-facts div:nth-child(n + 2) {
    border-top: 1px solid var(--border-subtle);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
}
</style>
