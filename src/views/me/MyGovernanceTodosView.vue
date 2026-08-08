<template>
  <div class="governance-todos-page min-h-screen">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <header class="page-header">
        <div>
          <p>频道质量治理</p>
          <h1>我的治理待办</h1>
          <span>这里只读取当前分配给你的待办；完成和改派仍需在对应治理工作区执行。</span>
        </div>
        <button
          type="button"
          class="icon-button"
          title="刷新治理待办"
          :disabled="loading"
          @click="load()"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        </button>
      </header>

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

      <section class="filter-bar" aria-label="治理待办筛选">
        <label>
          <span>任务类型</span>
          <select v-model="taskType" class="field-control" @change="applyFilters">
            <option value="">全部类型</option>
            <option v-for="item in taskTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>
          <span>时限状态</span>
          <select v-model="dueState" class="field-control" @change="applyFilters">
            <option value="">全部时限</option>
            <option v-for="item in dueStateOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </section>

      <section v-if="page" :class="['projection-state', `projection-state--${page.dependencyStatus.toLowerCase()}`]">
        <div>
          <strong>{{ dependencyStatusLabel(page.dependencyStatus) }}</strong>
          <span>{{ dependencyStatusDescription(page.dependencyStatus) }}</span>
        </div>
        <small>评估于 {{ formatTime(page.evaluationTime) }} · 数据水位 {{ formatTime(page.freshThrough) }}</small>
      </section>

      <div v-if="errorText && items.length === 0" class="state state-error">
        <p>{{ errorText }}</p>
        <button type="button" class="secondary-button" :disabled="loading" @click="load()">重试</button>
      </div>
      <div v-else-if="loading" class="state" role="status">正在读取治理待办</div>
      <div v-else-if="items.length === 0" class="state">当前没有符合筛选条件的治理待办。</div>

      <section v-else class="todo-list" aria-label="治理待办列表">
        <article v-for="todo in items" :key="String(todo.todoId)" class="todo-row">
          <div class="todo-head">
            <div>
              <div class="badge-line">
                <span :class="['status', `status--${todo.status.toLowerCase()}`]">{{ statusLabel(todo.status) }}</span>
                <span :class="['due-state', `due-state--${todo.dueState.toLowerCase()}`]">{{ dueStateLabel(todo.dueState) }}</span>
                <span v-if="todo.escalationLevel !== 'NONE'" class="escalation">{{ escalationLabel(todo.escalationLevel) }}</span>
              </div>
              <h2>{{ taskTypeLabel(todo.taskType) }}</h2>
            </div>
            <RouterLink
              v-if="todo.canOpenSource && todo.actionPath"
              :to="todo.actionPath"
              class="open-link"
            >
              打开治理工作区
            </RouterLink>
          </div>

          <p class="meta">
            频道 {{ todo.domain }} · 待办 #{{ todo.todoId }} · 风险处置 #{{ todo.caseId }}
            <template v-if="todo.retrospectiveId"> · 复盘 #{{ todo.retrospectiveId }}</template>
          </p>
          <dl class="todo-facts">
            <div>
              <dt>时限起点</dt>
              <dd>{{ formatTime(todo.anchorAt) }}</dd>
            </div>
            <div>
              <dt>截止时间</dt>
              <dd :class="{ 'is-overdue': todo.isOverdue }">{{ formatTime(todo.dueAt) }}</dd>
            </div>
            <div>
              <dt>当前可执行性</dt>
              <dd>{{ actionabilityLabel(todo.actionability) }}</dd>
            </div>
            <div>
              <dt>处理结果</dt>
              <dd>{{ resultLabel(todo) }}</dd>
            </div>
          </dl>

          <p v-if="todo.status === 'OPEN' && !todo.canOpenSource" class="availability-note">
            {{ unavailableActionText(todo.actionability) }}
          </p>
        </article>
      </section>

      <div v-if="loadMoreErrorText && items.length > 0" class="state state-error load-more-error">
        <p>{{ loadMoreErrorText }}</p>
        <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">重试加载更多</button>
      </div>
      <div v-else-if="hasMore && !loading" class="load-more-row">
        <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">
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
import { getErrorMessage } from '@/api/client'
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
    const response = await channelQualityGovernanceTodosApi.mine({
      status: status.value || undefined,
      taskType: taskType.value || undefined,
      dueState: dueState.value || undefined,
      cursor: cursor || undefined,
      size: PAGE_SIZE,
    }, { signal: controller.signal })
    if (!requestIsCurrent(requestId, requestAccountGeneration, requestAccountKey, filterKey, controller)) return
    const data = response.data
    if (!data) throw new Error('治理待办响应为空')
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
    const message = getErrorMessage(error, append ? '加载更多治理待办失败' : '治理待办暂时无法读取')
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
  READY: '当前列表依据服务端评估结果展示。',
  READ_ONLY_STALE: '保留已投影的待办供查看，新的来源事实暂未推进。',
  DELIVERY_DEGRADED: '待办状态仍以服务端为准，提醒投递会在依赖恢复后继续处理。',
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
.governance-todos-page { background: rgb(248 250 252); }
.page-header,.todo-head { display:flex;align-items:flex-start;justify-content:space-between;gap:1rem; }
.page-header { margin-bottom:1.25rem; }
.page-header p { margin:0;color:rgb(8 145 178);font-size:.75rem;font-weight:900; }
.page-header h1 { margin:.2rem 0;color:rgb(15 23 42);font-size:1.5rem;font-weight:900; }
.page-header span { color:rgb(100 116 139);font-size:.85rem;line-height:1.55; }
.icon-button { display:inline-flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;color:rgb(51 65 85); }
.icon-button:disabled,.secondary-button:disabled { cursor:not-allowed;opacity:.55; }
.status-tabs { display:flex;flex-wrap:wrap;gap:.35rem;margin-bottom:1rem;border-bottom:1px solid rgb(226 232 240); }
.status-tabs button { min-height:2.4rem;border:0;border-bottom:2px solid transparent;background:transparent;padding:0 .7rem;color:rgb(100 116 139);font-size:.8rem;font-weight:850; }
.status-tabs button:hover,.status-tabs button.is-active { border-bottom-color:rgb(8 145 178);color:rgb(8 145 178); }
.filter-bar { display:grid;grid-template-columns:repeat(2,minmax(0,14rem));gap:.75rem;margin-bottom:1rem; }
.filter-bar label { display:grid;gap:.32rem;color:rgb(71 85 105);font-size:.72rem;font-weight:850; }
.field-control { width:100%;min-width:0;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.6rem .7rem;color:rgb(15 23 42);font-size:.8rem; }
.projection-state { display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1rem;border:1px solid rgb(186 230 253);border-radius:.625rem;background:rgb(240 249 255);padding:.75rem .85rem;color:rgb(12 74 110); }
.projection-state div { display:grid;gap:.16rem; }.projection-state strong { font-size:.8rem; }.projection-state span,.projection-state small { font-size:.72rem;line-height:1.5; }.projection-state small { color:rgb(14 116 144);white-space:nowrap; }
.projection-state--read_only_stale,.projection-state--delivery_degraded { border-color:rgb(253 230 138);background:rgb(255 251 235);color:rgb(146 64 14); }.projection-state--read_only_stale small,.projection-state--delivery_degraded small { color:rgb(161 98 7); }
.projection-state--blocked { border-color:rgb(254 202 202);background:rgb(254 242 242);color:rgb(185 28 28); }.projection-state--blocked small { color:rgb(220 38 38); }
.todo-list { display:grid;gap:.85rem; }
.todo-row { border:1px solid rgb(226 232 240);border-radius:.625rem;background:white;padding:1rem; }
.badge-line { display:flex;flex-wrap:wrap;gap:.4rem; }
.status,.due-state,.escalation { display:inline-flex;border-radius:999px;padding:.2rem .5rem;font-size:.68rem;font-weight:900; }
.status--open { background:rgb(224 231 255);color:rgb(67 56 202); }.status--completed { background:rgb(220 252 231);color:rgb(21 128 61); }.status--closed { background:rgb(241 245 249);color:rgb(71 85 105); }
.due-state--on_track,.due-state--not_applicable { background:rgb(240 253 244);color:rgb(22 101 52); }.due-state--due_soon { background:rgb(254 243 199);color:rgb(146 64 14); }.due-state--overdue,.escalation { background:rgb(254 226 226);color:rgb(185 28 28); }
.todo-head h2 { margin:.55rem 0 0;color:rgb(15 23 42);font-size:1rem;font-weight:900; }.open-link { color:rgb(8 145 178);font-size:.76rem;font-weight:850;white-space:nowrap; }
.meta,.availability-note { margin:.75rem 0 0;color:rgb(100 116 139);font-size:.72rem;line-height:1.55; }
.todo-facts { display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.65rem;margin:1rem 0 0; }.todo-facts div { min-width:0;border-left:2px solid rgb(186 230 253);padding-left:.55rem; }.todo-facts dt { color:rgb(100 116 139);font-size:.68rem;font-weight:800; }.todo-facts dd { margin:.18rem 0 0;color:rgb(51 65 85);font-size:.76rem;font-weight:750;line-height:1.45; }.todo-facts dd.is-overdue { color:rgb(185 28 28); }
.availability-note { border-left:2px solid rgb(251 191 36);padding-left:.65rem;color:rgb(146 64 14); }
.state { border:1px dashed rgb(203 213 225);border-radius:.625rem;background:white;padding:2rem;color:rgb(100 116 139);text-align:center; }.state p { margin:0; }.state .secondary-button { margin-top:.75rem; }.state-error { border-style:solid;border-color:rgb(254 202 202);color:rgb(185 28 28); }.load-more-error { margin-top:1rem;padding:1rem; }
.load-more-row { display:flex;justify-content:center;margin-top:1rem; }.secondary-button { display:inline-flex;min-height:38px;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.5rem .85rem;color:rgb(51 65 85);font-size:.78rem;font-weight:900; }
@media (max-width:720px) { .page-header,.todo-head,.projection-state { flex-direction:column; }.filter-bar { grid-template-columns:1fr; }.projection-state small { white-space:normal; }.todo-facts { grid-template-columns:repeat(2,minmax(0,1fr)); } }
.dark .governance-todos-page { background:rgb(2 6 23); }.dark .todo-row,.dark .field-control,.dark .icon-button,.dark .secondary-button,.dark .state { border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(203 213 225); }.dark .page-header h1,.dark .todo-head h2 { color:rgb(248 250 252); }.dark .page-header span,.dark .meta,.dark .todo-facts dt { color:rgb(148 163 184); }.dark .todo-facts dd { color:rgb(226 232 240); }.dark .status-tabs { border-color:rgb(51 65 85); }.dark .projection-state { border-color:rgb(12 74 110);background:rgb(8 47 73 / .55);color:rgb(186 230 253); }
</style>
