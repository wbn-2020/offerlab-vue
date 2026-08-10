<template>
  <div
    class="app-shell knowledge-workspace"
    data-v10-knowledge-workspace
    :data-workspace-state="workspaceState"
  >
    <AppHeader />

    <main class="community-page knowledge-page">
      <header class="page-intro">
        <div class="page-intro-copy">
          <div class="page-kicker">
            <BookCheck class="h-4 w-4" aria-hidden="true" />
            长期维护
          </div>
          <h1>我的知识维护</h1>
          <p>集中查看需要回应、复核或回访的公共知识事项，按优先级推进下一步。</p>
        </div>
        <div class="page-intro-actions">
          <RouterLink
            v-if="authStore.isLoggedIn"
            :to="switchAccountLocation"
            class="secondary-action"
          >
            <UserRoundCog class="h-4 w-4" aria-hidden="true" />
            切换账号
          </RouterLink>
          <button
            v-if="authStore.isLoggedIn"
            type="button"
            class="secondary-action"
            :disabled="refreshing"
            @click="refreshWorkspace"
          >
            <RefreshCw class="h-4 w-4" :class="{ spin: refreshing }" aria-hidden="true" />
            刷新
          </button>
        </div>
      </header>

      <section v-if="!authStore.ready" class="workspace-state surface-panel" role="status">
        <Loader2 class="h-5 w-5 spin" aria-hidden="true" />
        <div>
          <strong>正在确认当前账号</strong>
          <p>账号状态确认后再读取个人维护事项。</p>
        </div>
      </section>

      <section v-else-if="!authStore.isLoggedIn" class="workspace-state surface-panel" role="alert">
        <LogIn class="h-5 w-5" aria-hidden="true" />
        <div>
          <strong>{{ authStore.sessionExpired ? '登录会话已失效' : '登录后查看知识维护事项' }}</strong>
          <p>{{ authStore.sessionExpired ? '请重新登录，系统会返回当前维护工作台。' : '这里的数据按账号隔离，不向匿名访问者展示。' }}</p>
        </div>
        <RouterLink :to="loginLocation" class="primary-action">重新登录</RouterLink>
      </section>

      <section v-else class="knowledge-shell surface-panel">
        <div class="workspace-summary">
          <div>
            <span class="summary-label">当前工作区</span>
            <strong>{{ activeTab === 'queue' ? '待办队列' : '类型概览' }}</strong>
            <p>{{ queueSummaryText }}</p>
          </div>
          <div class="summary-metrics" aria-label="维护概览">
            <span v-if="summary" class="metric-chip"><strong>{{ summary.total }}</strong>项待维护</span>
            <span v-if="hasActiveFilters" class="metric-chip metric-chip-active">已启用筛选</span>
            <span v-if="summary?.generatedAt" class="summary-updated">
              更新于 {{ formatDateTime(summary.generatedAt) }}
            </span>
          </div>
        </div>

        <nav class="workspace-tabs" role="tablist" aria-label="知识维护视图">
          <button
            v-for="tab in tabs"
            :id="`knowledge-tab-${tab.value}`"
            :key="tab.value"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.value"
            :aria-controls="`knowledge-panel-${tab.value}`"
            :class="['workspace-tab', { 'workspace-tab-active': activeTab === tab.value }]"
            @click="setTab(tab.value)"
          >
            <component :is="tab.icon" class="h-4 w-4" aria-hidden="true" />
            {{ tab.label }}
            <span v-if="tab.value === 'queue' && summary">{{ summary.total }}</span>
          </button>
        </nav>

        <div v-if="summaryError" class="workspace-notice workspace-notice-error" role="status">
          <AlertCircle class="h-4 w-4" aria-hidden="true" />
          <span>类型摘要暂时无法读取：{{ summaryError }}</span>
          <button type="button" :disabled="summaryLoading" @click="loadSummary()">重试摘要</button>
        </div>

        <div v-if="partialSourceErrors.length || loadMoreError" class="workspace-notice workspace-notice-partial" data-partial-failure role="status">
          <AlertTriangle class="h-4 w-4" aria-hidden="true" />
          <div>
            <strong>部分来源暂时不可用，已保留当前可读结果。</strong>
            <p v-if="partialSourceErrors.length">{{ partialSourceErrors.join('；') }}</p>
            <p v-if="loadMoreError">后续页面加载失败：{{ loadMoreError }}</p>
          </div>
        </div>

        <section
          v-if="activeTab === 'overview'"
          id="knowledge-panel-overview"
          role="tabpanel"
          aria-labelledby="knowledge-tab-overview"
          class="overview-panel"
        >
          <div class="section-heading">
            <div>
              <h2>维护类型概览</h2>
              <p>选择一种行动类型，直接回到对应队列。</p>
            </div>
            <span class="section-count">{{ actionTypeOptions.length }} 类</span>
          </div>

          <div v-if="summaryLoading && !summary" class="summary-skeleton" role="status">
            <span class="sr-only">正在加载知识维护摘要</span>
            <div v-for="index in 7" :key="index" class="summary-skeleton-row" aria-hidden="true">
              <span />
              <span />
            </div>
          </div>

          <div v-else-if="summary" class="summary-list">
            <button v-for="item in actionTypeOptions" :key="item.value" type="button" class="summary-row" @click="openTypeQueue(item.value)">
              <span class="summary-row-icon" aria-hidden="true">
                <component :is="item.icon" class="h-4 w-4" />
              </span>
              <span class="summary-row-copy">
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
              <span class="summary-row-count">{{ countFor(item.value) }}</span>
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div v-else class="panel-state panel-state-error" role="alert">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>维护概览暂时不可用</strong>
              <p>{{ summaryError || '服务没有返回可用摘要。' }}</p>
            </div>
            <button type="button" class="secondary-action" @click="loadSummary()">重试</button>
          </div>
        </section>

        <section
          v-else
          id="knowledge-panel-queue"
          role="tabpanel"
          aria-labelledby="knowledge-tab-queue"
          class="queue-panel"
        >
          <div class="queue-toolbar">
            <div class="section-heading">
              <div>
                <h2>当前维护队列</h2>
                <p>先处理高优先级事项，再回到常规维护。</p>
              </div>
            </div>
            <div class="queue-filters" aria-label="知识维护筛选">
              <label class="field-label">
                <span>事项类型</span>
                <select :value="typeFilter" class="field-control" @change="setTypeFromEvent">
                  <option value="">全部类型</option>
                  <option v-for="item in actionTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
              <label class="field-label">
                <span>当前状态</span>
                <select :value="statusFilter" class="field-control" @change="setStatusFromEvent">
                  <option value="">全部状态</option>
                  <option v-if="statusFilter && !knownStatusSet.has(statusFilter)" :value="statusFilter">{{ statusLabel(statusFilter) }}</option>
                  <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
              <button type="button" class="secondary-action clear-filter-button" :disabled="!typeFilter && !statusFilter" @click="clearFilters">
                <FilterX class="h-4 w-4" aria-hidden="true" />
                清除筛选
              </button>
            </div>
          </div>

          <div v-if="listLoading && items.length === 0" class="queue-skeleton" role="status">
            <span class="sr-only">正在加载知识维护事项</span>
            <article v-for="index in 4" :key="index" class="queue-skeleton-row" aria-hidden="true">
              <span class="queue-skeleton-icon" />
              <div><span /><span /><span /></div>
            </article>
          </div>

          <div v-else-if="listError && items.length === 0" class="panel-state panel-state-error" role="alert">
            <AlertCircle class="h-5 w-5" aria-hidden="true" />
            <div><strong>知识维护事项暂时无法读取</strong><p>{{ listError }}</p></div>
            <button type="button" class="secondary-action" @click="retryList">重试</button>
          </div>

          <div v-else-if="items.length === 0" class="panel-state panel-state-empty">
            <CheckCircle2 class="h-5 w-5" aria-hidden="true" />
            <div>
              <strong>{{ hasActiveFilters ? '没有符合筛选条件的事项' : '当前维护队列已清空' }}</strong>
              <p>{{ emptyStateText }}</p>
            </div>
            <button v-if="hasActiveFilters" type="button" class="secondary-action" @click="clearFilters">查看全部</button>
          </div>

          <div v-else class="action-list">
            <article v-for="item in items" :key="item.id" class="action-row">
              <span class="action-icon" aria-hidden="true"><component :is="typeIcon(item.type)" class="h-4 w-4" /></span>
              <div class="action-main">
                <div class="action-title-line">
                  <div>
                    <span class="action-type">{{ typeLabel(item.type) }}</span>
                    <h3>{{ item.title || typeLabel(item.type) }}</h3>
                  </div>
                  <span :class="['priority-badge', priorityClass(item.priority)]">{{ priorityLabel(item.priority) }}</span>
                </div>
                <p class="action-reason">{{ reasonLabel(item.reason) }}</p>
                <div class="action-meta">
                  <span>{{ statusLabel(item.status) }}</span>
                  <span v-if="item.postId">内容 #{{ item.postId }}</span>
                  <time v-if="item.updatedAt" :datetime="item.updatedAt">{{ formatDateTime(item.updatedAt) }}</time>
                </div>
              </div>
              <RouterLink
                v-if="item.canonicalRoute"
                :to="item.canonicalRoute"
                :class="['canonical-action', { 'canonical-action-context': item.type === 'UNKNOWN' }]"
                data-canonical-action
              >
                {{ item.type === 'UNKNOWN' ? '查看上下文' : '前往处理' }}
                <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
              </RouterLink>
              <span v-else class="canonical-action-unavailable">暂不可跳转</span>
            </article>
          </div>

          <div v-if="items.length && (hasMore || loadMoreError)" class="pagination-row" data-pagination>
            <button v-if="loadMoreError" type="button" class="secondary-action" @click="retryLoadMore">重试加载更多</button>
            <button v-else-if="hasMore" type="button" class="secondary-action" :disabled="listLoadingMore" @click="loadMore">
              <Loader2 v-if="listLoadingMore" class="h-4 w-4 spin" aria-hidden="true" />
              <ChevronDown v-else class="h-4 w-4" aria-hidden="true" />
              {{ listLoadingMore ? '正在加载' : '加载更多' }}
            </button>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BookCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileClock,
  FileQuestion,
  FilterX,
  GitPullRequest,
  History,
  Link2Off,
  ListChecks,
  Loader2,
  LogIn,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  UserRoundCog,
} from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import {
  knowledgeMaintenanceApi,
  type KnowledgeActionItem,
  type KnowledgeActionItemType,
  type KnowledgeActionSummary,
  type KnowledgeActionType,
} from '@/api/knowledgeMaintenance'
import { useAuthStore } from '@/stores/auth'

type WorkspaceTab = 'queue' | 'overview'

const PAGE_SIZE = 20
const tabs: Array<{ value: WorkspaceTab; label: string; icon: typeof ListChecks }> = [
  { value: 'queue', label: '待办队列', icon: ListChecks },
  { value: 'overview', label: '类型概览', icon: BookCheck },
]
const tabSet = new Set<WorkspaceTab>(tabs.map((item) => item.value))
const actionTypeOptions: Array<{
  value: KnowledgeActionType
  label: string
  description: string
  icon: typeof ListChecks
}> = [
  { value: 'SUGGESTION_RESPONSE', label: '建议回应', description: '处理仍在等待作者回应的内容建议。', icon: MessageSquare },
  { value: 'STALE_SUGGESTION', label: '旧版本建议', description: '复核基于旧版本但仍未关闭的建议。', icon: History },
  { value: 'FRESHNESS_CONFIRMATION', label: '时效确认', description: '确认公开内容是否仍然有效。', icon: Clock3 },
  { value: 'REFERENCE_REVIEW', label: '来源复核', description: '修复或更新已经失效的内容来源。', icon: Link2Off },
  { value: 'RELATION_REVIEW', label: '关系审核', description: '查看关系候选、审核结果或待审事项。', icon: GitPullRequest },
  { value: 'OUTCOME_REVISIT', label: '实践回访', description: '回访已经到期的个人实践结果。', icon: RotateCcw },
  { value: 'MAINTENANCE_TASK', label: '维护任务', description: '继续处理已分配的内容维护任务。', icon: ClipboardCheck },
]
const actionTypeSet = new Set<KnowledgeActionType>(actionTypeOptions.map((item) => item.value))
const actionTypeMap = new Map(actionTypeOptions.map((item) => [item.value, item]))
const statusOptions = [
  { value: 'PENDING', label: '待处理' },
  { value: 'AWAITING_AUTHOR_CONFIRMATION', label: '待作者确认' },
  { value: 'BROKEN', label: '来源失效' },
  { value: 'REJECTED', label: '审核未通过' },
  { value: 'OPEN', label: '待处理 / 待回访' },
  { value: 'CLAIMED', label: '处理中' },
  { value: 'SUBMITTED', label: '待审核' },
  { value: 'SNOOZED', label: '已延后' },
]
const knownStatusSet = new Set(statusOptions.map((item) => item.value))
const statusLabelMap = new Map(statusOptions.map((item) => [item.value, item.label]))
const reasonLabels: Record<string, string> = {
  SUGGESTION_RESPONSE_REQUIRED: '有内容建议等待你的回应。',
  STALE_SUGGESTION_REQUIRES_RESPONSE: '这条建议基于旧版本，仍需要确认是否处理。',
  FRESHNESS_CONFIRMATION_REQUIRED: '这篇内容需要确认是否仍然有效。',
  BROKEN_REFERENCE_REQUIRES_REVIEW: '内容来源已经失效，需要修复或替换。',
  RELATION_REVIEW_PENDING: '你提交的知识关系正在等待审核。',
  RELATION_REVIEW_REJECTED: '知识关系审核未通过，需要查看原因。',
  RELATION_REVIEW_REQUIRED: '有知识关系候选等待你审核。',
  OUTCOME_FOLLOW_UP_DUE: '实践结果已经到达回访时间。',
  CONTENT_MAINTENANCE_TASK_ACTIVE: '内容维护任务仍在进行中。',
}
const sourceErrorLabels: Record<string, string> = {
  SUGGESTION_ACTION_SOURCE_UNAVAILABLE: '内容建议来源暂时不可用',
  STALE_SUGGESTION_ACTION_SOURCE_UNAVAILABLE: '旧版本建议来源暂时不可用',
  FRESHNESS_ACTION_SOURCE_UNAVAILABLE: '时效确认来源暂时不可用',
  OUTCOME_REVISIT_SOURCE_UNAVAILABLE: '实践回访来源暂时不可用',
  POST_KNOWLEDGE_ACTION_SOURCE_UNAVAILABLE: '来源、关系或维护任务来源暂时不可用',
}

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const summary = ref<KnowledgeActionSummary | null>(null)
const items = ref<KnowledgeActionItem[]>([])
const summaryLoading = ref(false)
const listLoading = ref(false)
const listLoadingMore = ref(false)
const summaryError = ref('')
const listError = ref('')
const loadMoreError = ref('')
const pageSourceErrors = ref<string[]>([])
const nextCursor = ref('')
const hasMore = ref(false)
let accountGeneration = 0
let summaryRequestId = 0
let listRequestId = 0
let summaryController: AbortController | null = null
let listController: AbortController | null = null
let disposed = false
let previousAccountKey = ''
let pendingAppendCursor = ''
let pendingAppendFilterKey = ''
let lastFailedCursor = ''

const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const rawTab = computed(() => String(firstQueryValue(route.query.tab) || '').toLowerCase())
const activeTab = computed<WorkspaceTab>(() => (
  tabSet.has(rawTab.value as WorkspaceTab) ? rawTab.value as WorkspaceTab : 'queue'
))
const rawType = computed(() => String(firstQueryValue(route.query.type) || '').toUpperCase())
const typeFilter = computed<KnowledgeActionType | ''>(() => (
  actionTypeSet.has(rawType.value as KnowledgeActionType)
    ? rawType.value as KnowledgeActionType
    : ''
))
const rawStatus = computed(() => String(firstQueryValue(route.query.status) || '').toUpperCase())
const statusFilter = computed(() => (
  /^[A-Z_]{2,32}$/.test(rawStatus.value) ? rawStatus.value : ''
))
const rawCursor = computed(() => String(firstQueryValue(route.query.cursor) || '').trim())
const routeCursor = computed(() => (
  /^[A-Za-z0-9_-]{1,512}$/.test(rawCursor.value) ? rawCursor.value : ''
))
const accountKey = computed(() => `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`)
const filterKey = computed(() => `${activeTab.value}:${typeFilter.value || 'ALL'}:${statusFilter.value || 'ALL'}`)
const hasActiveFilters = computed(() => Boolean(typeFilter.value || statusFilter.value))
const refreshing = computed(() => summaryLoading.value || listLoading.value || listLoadingMore.value)
const workspaceState = computed(() => {
  if (!authStore.ready) return 'auth-loading'
  if (!authStore.isLoggedIn) return authStore.sessionExpired ? 'session-expired' : 'anonymous'
  if (activeTab.value === 'overview') {
    if (summaryLoading.value && !summary.value) return 'loading'
    if (summaryError.value && !summary.value) return 'error'
    return summary.value ? 'ready' : 'empty'
  }
  if (listLoading.value && items.value.length === 0) return 'loading'
  if (listError.value && items.value.length === 0) return 'error'
  return items.value.length ? 'ready' : 'empty'
})
const queueSummaryText = computed(() => {
  const total = summary.value?.total ?? items.value.length
  if (hasActiveFilters.value) return `当前筛选已加载 ${items.value.length} 项，全局待维护 ${total} 项。`
  return `当前账号共有 ${total} 项待维护事项。`
})
const emptyStateText = computed(() => {
  if (pageSourceErrors.value.length) return '当前可用来源没有返回事项，另有部分来源暂时不可用。'
  if (hasActiveFilters.value) return '尝试清除类型或状态筛选，查看其他维护事项。'
  return '新的建议、来源复核、关系审核或回访到期后会出现在这里。'
})
const partialSourceErrors = computed(() => {
  const values = [
    ...pageSourceErrors.value,
    ...Object.values(summary.value?.sourceErrors || {}),
  ]
  return [...new Set(values.filter(Boolean).map(sourceErrorLabel))]
})
const loginLocation = computed(() => ({
  path: '/login',
  query: {
    redirect: route.fullPath,
    ...(authStore.sessionExpired ? { reason: 'session_expired' } : {}),
  },
}))
const switchAccountLocation = computed(() => ({
  path: '/login',
  query: {
    redirect: route.fullPath,
    switchAccount: '1',
  },
}))

const currentUid = () => String(authStore.user?.uid ?? '')
const currentToken = () => String(authStore.token ?? '')
const requestIsCurrent = (
  generation: number,
  uid: string,
  token: string,
  requestId: number,
  expectedRequestId: number,
) => (
  !disposed
  && authStore.isLoggedIn
  && generation === accountGeneration
  && requestId === expectedRequestId
  && uid === currentUid()
  && token === currentToken()
)

const resetSummary = () => {
  summary.value = null
  summaryLoading.value = false
  summaryError.value = ''
}

const resetList = () => {
  items.value = []
  listLoading.value = false
  listLoadingMore.value = false
  listError.value = ''
  loadMoreError.value = ''
  pageSourceErrors.value = []
  nextCursor.value = ''
  hasMore.value = false
  lastFailedCursor = ''
}

const invalidateRequests = () => {
  accountGeneration += 1
  summaryRequestId += 1
  listRequestId += 1
  summaryController?.abort()
  listController?.abort()
  summaryController = null
  listController = null
  pendingAppendCursor = ''
  pendingAppendFilterKey = ''
  resetSummary()
  resetList()
}

const normalizeRouteState = () => {
  const invalidTab = Boolean(rawTab.value) && !tabSet.has(rawTab.value as WorkspaceTab)
  const invalidType = Boolean(rawType.value) && !actionTypeSet.has(rawType.value as KnowledgeActionType)
  const invalidStatus = Boolean(rawStatus.value) && !/^[A-Z_]{2,32}$/.test(rawStatus.value)
  const invalidCursor = Boolean(rawCursor.value) && !/^[A-Za-z0-9_-]{1,512}$/.test(rawCursor.value)
  if (!invalidTab && !invalidType && !invalidStatus && !invalidCursor) return false
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      tab: invalidTab ? 'queue' : route.query.tab,
      type: invalidType ? undefined : route.query.type,
      status: invalidStatus ? undefined : route.query.status,
      cursor: invalidCursor ? undefined : route.query.cursor,
    },
  })
  return true
}

const mergeItems = (current: KnowledgeActionItem[], incoming: KnowledgeActionItem[]) => {
  const merged = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) merged.set(item.id, item)
  return [...merged.values()]
}

const loadSummary = async (
  generation = accountGeneration,
  uid = currentUid(),
  token = currentToken(),
) => {
  if (!authStore.isLoggedIn) return
  const requestId = ++summaryRequestId
  summaryController?.abort()
  const controller = new AbortController()
  summaryController = controller
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const result = await knowledgeMaintenanceApi.summary({ signal: controller.signal })
    if (!requestIsCurrent(generation, uid, token, requestId, summaryRequestId)) return
    summary.value = result.data
  } catch (cause) {
    if (!requestIsCurrent(generation, uid, token, requestId, summaryRequestId) || controller.signal.aborted) return
    summary.value = null
    summaryError.value = getErrorMessage(cause, '知识维护摘要暂时不可用。')
  } finally {
    if (requestIsCurrent(generation, uid, token, requestId, summaryRequestId)) {
      summaryLoading.value = false
    }
    if (summaryController === controller) summaryController = null
  }
}

const loadList = async (
  append = false,
  cursor = '',
  generation = accountGeneration,
  uid = currentUid(),
  token = currentToken(),
) => {
  if (!authStore.isLoggedIn || (append && listLoadingMore.value)) return
  const requestId = ++listRequestId
  listController?.abort()
  const controller = new AbortController()
  listController = controller
  if (append) {
    listLoadingMore.value = true
    loadMoreError.value = ''
  } else {
    resetList()
    listLoading.value = true
  }

  try {
    const result = await knowledgeMaintenanceApi.actions({
      cursor: cursor || undefined,
      size: PAGE_SIZE,
      type: typeFilter.value || undefined,
      status: statusFilter.value || undefined,
    }, { signal: controller.signal })
    if (!requestIsCurrent(generation, uid, token, requestId, listRequestId)) return
    const page = result.data
    const incoming = page?.items || []
    items.value = append ? mergeItems(items.value, incoming) : incoming
    nextCursor.value = page?.nextCursor || ''
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
    const incomingSourceErrors = page?.sourceErrors || []
    pageSourceErrors.value = append
      ? [...new Set([...pageSourceErrors.value, ...incomingSourceErrors])]
      : incomingSourceErrors
    lastFailedCursor = ''
  } catch (cause) {
    if (!requestIsCurrent(generation, uid, token, requestId, listRequestId) || controller.signal.aborted) return
    const message = getErrorMessage(cause, '知识维护事项暂时不可用。')
    if (append) {
      loadMoreError.value = message
      lastFailedCursor = cursor
    } else {
      listError.value = message
      items.value = []
      nextCursor.value = ''
      hasMore.value = false
    }
  } finally {
    if (requestIsCurrent(generation, uid, token, requestId, listRequestId)) {
      listLoading.value = false
      listLoadingMore.value = false
    }
    if (listController === controller) listController = null
  }
}

const replaceQuery = (patch: Record<string, string | undefined>, push = true) => {
  const location = {
    path: route.path,
    query: {
      ...route.query,
      ...patch,
    },
  }
  return push ? router.push(location) : router.replace(location)
}

const setTab = (tab: WorkspaceTab) => {
  if (tab === activeTab.value) return
  void replaceQuery({ tab, cursor: undefined })
}

const setTypeFromEvent = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as KnowledgeActionType | ''
  void replaceQuery({ tab: 'queue', type: value || undefined, cursor: undefined })
}

const setStatusFromEvent = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value.toUpperCase()
  void replaceQuery({
    tab: 'queue',
    status: /^[A-Z_]{2,32}$/.test(value) ? value : undefined,
    cursor: undefined,
  })
}

const clearFilters = () => {
  void replaceQuery({ tab: 'queue', type: undefined, status: undefined, cursor: undefined })
}

const openTypeQueue = (type: KnowledgeActionType) => {
  void replaceQuery({ tab: 'queue', type, status: undefined, cursor: undefined })
}

const loadMore = () => {
  if (!hasMore.value || !nextCursor.value || listLoadingMore.value) return
  pendingAppendCursor = nextCursor.value
  pendingAppendFilterKey = filterKey.value
  void replaceQuery({ cursor: nextCursor.value })
}

const retryLoadMore = () => {
  if (!lastFailedCursor) return
  void loadList(true, lastFailedCursor)
}

const retryList = () => {
  void loadList(false, routeCursor.value)
}

const refreshWorkspace = () => {
  if (!authStore.isLoggedIn) return
  const generation = accountGeneration
  const uid = currentUid()
  const token = currentToken()
  void loadSummary(generation, uid, token)
  if (activeTab.value === 'queue') void loadList(false, routeCursor.value, generation, uid, token)
}

const countFor = (type: KnowledgeActionType) => String(summary.value?.counts[type] ?? '0')
const typeLabel = (type: KnowledgeActionItemType) => (
  type === 'UNKNOWN' ? '未知行动' : actionTypeMap.get(type)?.label || type
)
const typeIcon = (type: KnowledgeActionItemType) => (
  type === 'UNKNOWN' ? FileQuestion : actionTypeMap.get(type)?.icon || FileClock
)
const statusLabel = (status: string) => {
  const normalized = String(status || '').toUpperCase()
  return statusLabelMap.get(normalized) || normalized.replace(/_/g, ' ') || '状态未知'
}
const reasonLabel = (reason: string) => reasonLabels[reason] || reason.replace(/_/g, ' ') || '需要查看当前事项。'
const priorityLabel = (priority: string) => {
  const normalized = String(priority || '').toUpperCase()
  if (normalized === 'CRITICAL') return '紧急'
  if (normalized === 'HIGH') return '高优先'
  if (normalized === 'MEDIUM') return '中优先'
  if (normalized === 'LOW') return '低优先'
  return normalized || '常规'
}
const priorityClass = (priority: string) => {
  const normalized = String(priority || '').toUpperCase()
  if (normalized === 'CRITICAL' || normalized === 'HIGH') return 'priority-high'
  if (normalized === 'MEDIUM') return 'priority-medium'
  return 'priority-low'
}
const sourceErrorLabel = (value: string) => sourceErrorLabels[value] || value.replace(/_/g, ' ')
const formatDateTime = (value: string) => {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}

watch(
  [() => authStore.ready, () => authStore.isLoggedIn, () => authStore.user?.uid, () => authStore.token],
  ([ready, loggedIn]) => {
    const nextAccountKey = accountKey.value
    const accountChanged = Boolean(previousAccountKey && previousAccountKey !== nextAccountKey)
    previousAccountKey = nextAccountKey
    invalidateRequests()
    if (!ready || !loggedIn) return
    const generation = accountGeneration
    const uid = currentUid()
    const token = currentToken()
    void loadSummary(generation, uid, token)
    if (accountChanged && routeCursor.value) {
      void replaceQuery({ cursor: undefined }, false)
      return
    }
    if (normalizeRouteState()) return
    if (activeTab.value === 'queue') {
      void loadList(false, routeCursor.value, generation, uid, token)
    }
  },
  { immediate: true, flush: 'sync' },
)

watch(
  () => [
    firstQueryValue(route.query.tab),
    firstQueryValue(route.query.type),
    firstQueryValue(route.query.status),
    firstQueryValue(route.query.cursor),
  ] as const,
  () => {
    if (!authStore.ready || !authStore.isLoggedIn || normalizeRouteState()) return
    listRequestId += 1
    listController?.abort()
    listController = null
    if (activeTab.value === 'overview') {
      resetList()
      return
    }
    const append = Boolean(
      routeCursor.value
      && routeCursor.value === pendingAppendCursor
      && filterKey.value === pendingAppendFilterKey,
    )
    pendingAppendCursor = ''
    pendingAppendFilterKey = ''
    void loadList(append, routeCursor.value)
  },
)

onUnmounted(() => {
  disposed = true
  invalidateRequests()
})
</script>

<style scoped>
.knowledge-workspace {
  min-width: 0;
}

.workspace-heading,
.workspace-title,
.workspace-heading-actions,
.workspace-auth-state,
.workspace-tabs,
.workspace-tab,
.workspace-notice,
.panel-heading,
.queue-toolbar,
.queue-filters,
.action-row,
.action-title-line,
.action-meta,
.canonical-action,
.pagination-row,
.summary-row {
  display: flex;
}

.workspace-heading {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.workspace-title {
  min-width: 0;
  align-items: flex-start;
  gap: 0.8rem;
}

.workspace-title-icon {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: var(--primary-50);
  color: var(--primary-700);
}

.workspace-title p {
  margin: 0;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.workspace-title h1 {
  margin: 0.15rem 0 0;
  color: var(--text-strong);
  font-size: 1.65rem;
  font-weight: 900;
  letter-spacing: 0;
  text-wrap: balance;
}

.workspace-title span {
  display: block;
  max-width: 62ch;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

.workspace-heading-actions {
  flex: none;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.workspace-heading-actions .secondary-action {
  min-height: 2.5rem;
}

.workspace-auth-state {
  min-height: 9rem;
  align-items: center;
  gap: 0.8rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.3rem;
  color: var(--text-muted);
}

.workspace-auth-state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.95rem;
}

.workspace-auth-state p {
  margin: 0.25rem 0 0;
  font-size: 0.82rem;
  line-height: 1.55;
}

.workspace-auth-state .primary-action {
  margin-left: auto;
}

.workspace-surface {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.workspace-tabs {
  align-items: center;
  gap: 0.25rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.65rem;
}

.workspace-tab {
  min-height: 2.4rem;
  flex: none;
  align-items: center;
  gap: 0.45rem;
  border-radius: var(--radius-control);
  padding: 0.5rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 800;
  transition: background-color 160ms ease, color 160ms ease;
}

.workspace-tab:hover {
  background: var(--surface-muted);
  color: var(--text-primary);
}

.workspace-tab-active {
  background: var(--primary-50);
  color: var(--primary-700);
}

.workspace-tab span {
  display: inline-flex;
  min-width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--surface);
  padding: 0 0.35rem;
  font-size: 0.68rem;
}

.workspace-notice {
  align-items: flex-start;
  gap: 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.75rem 1rem;
  font-size: 0.78rem;
  line-height: 1.55;
}

.workspace-notice > svg {
  flex: none;
  margin-top: 0.1rem;
}

.workspace-notice strong {
  display: block;
}

.workspace-notice p {
  margin: 0.15rem 0 0;
}

.workspace-notice button {
  margin-left: auto;
  flex: none;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.workspace-notice-error {
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.workspace-notice-partial {
  background: rgb(255 251 235);
  color: rgb(146 64 14);
}

.overview-panel,
.queue-panel {
  min-width: 0;
}

.panel-heading,
.queue-toolbar {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
}

.panel-heading,
.queue-toolbar {
  border-bottom: 1px solid var(--border-subtle);
}

.panel-heading h2,
.queue-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.panel-heading p,
.queue-heading p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.generated-time {
  flex: none;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.summary-list,
.action-list,
.summary-skeleton,
.queue-skeleton {
  display: grid;
}

.summary-row {
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.9rem 1.25rem;
  text-align: left;
  transition: background-color 160ms ease;
}

.summary-row:last-child {
  border-bottom: 0;
}

.summary-row:hover {
  background: var(--surface-muted);
}

.summary-row-icon,
.action-icon {
  display: inline-flex;
  width: 2.1rem;
  height: 2.1rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: var(--primary-50);
  color: var(--primary-700);
}

.summary-row-copy {
  min-width: 0;
  flex: 1;
}

.summary-row-copy strong,
.summary-row-copy small {
  display: block;
}

.summary-row-copy strong {
  color: var(--text-strong);
  font-size: 0.86rem;
  font-weight: 850;
}

.summary-row-copy small {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.45;
}

.summary-row-count {
  min-width: 3rem;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
  text-align: right;
}

.queue-toolbar {
  align-items: end;
}

.queue-heading {
  min-width: 12rem;
}

.queue-filters {
  min-width: 0;
  align-items: end;
  justify-content: flex-end;
  gap: 0.6rem;
}

.queue-filters label {
  display: grid;
  min-width: 10rem;
  gap: 0.3rem;
}

.queue-filters label > span {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.queue-filters select {
  min-height: 2.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface);
  padding: 0 2rem 0 0.65rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  outline: none;
}

.clear-filter-button {
  display: inline-flex;
  min-height: 2.35rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface);
  padding: 0.45rem 0.65rem;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 800;
}

.clear-filter-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.action-row {
  min-width: 0;
  align-items: flex-start;
  gap: 0.8rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 1.25rem;
}

.action-row:last-child {
  border-bottom: 0;
}

.action-main {
  min-width: 0;
  flex: 1;
}

.action-title-line {
  min-width: 0;
  align-items: flex-start;
  gap: 0.55rem;
}

.action-title-line h3 {
  min-width: 0;
  margin: 0;
  color: var(--text-strong);
  font-size: 0.9rem;
  font-weight: 900;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.priority-badge {
  display: inline-flex;
  min-height: 1.35rem;
  flex: none;
  align-items: center;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.66rem;
  font-weight: 900;
}

.priority-high {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.priority-medium {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.priority-low {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.action-main > p {
  margin: 0.35rem 0 0;
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.55;
}

.action-meta {
  flex-wrap: wrap;
  gap: 0.3rem 0.75rem;
  margin-top: 0.45rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.canonical-action {
  min-height: 2.25rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.4rem 0.65rem;
  color: var(--primary-700);
  font-size: 0.76rem;
  font-weight: 850;
}

.canonical-action:hover {
  border-color: var(--primary-300);
  background: var(--primary-50);
}

.canonical-action-unavailable {
  flex: none;
  padding: 0.45rem 0;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.panel-state {
  display: flex;
  min-height: 10rem;
  align-items: center;
  gap: 0.75rem;
  padding: 1.4rem;
  color: var(--text-muted);
}

.panel-state > svg {
  flex: none;
}

.panel-state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.92rem;
}

.panel-state p {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.panel-state .secondary-action {
  margin-left: auto;
  flex: none;
}

.panel-state-error {
  color: rgb(185 28 28);
}

.panel-state-empty > svg {
  color: rgb(22 163 74);
}

.pagination-row {
  justify-content: center;
  border-top: 1px solid var(--border-subtle);
  padding: 0.85rem;
}

.summary-skeleton,
.queue-skeleton {
  gap: 0;
}

.summary-skeleton-row,
.queue-skeleton-row {
  border-bottom: 1px solid var(--border-subtle);
}

.summary-skeleton-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
}

.summary-skeleton-row span,
.queue-skeleton-row span {
  display: block;
  border-radius: 0.35rem;
  background: rgb(226 232 240);
  animation: workspace-pulse 1.4s ease-in-out infinite;
}

.summary-skeleton-row span:first-child {
  width: min(60%, 24rem);
  height: 0.85rem;
}

.summary-skeleton-row span:last-child {
  width: 2.5rem;
  height: 0.85rem;
}

.queue-skeleton-row {
  display: grid;
  grid-template-columns: 2.1rem minmax(0, 1fr);
  gap: 0.8rem;
  padding: 1rem 1.25rem;
}

.queue-skeleton-icon {
  width: 2.1rem;
  height: 2.1rem;
}

.queue-skeleton-row div {
  display: grid;
  gap: 0.45rem;
}

.queue-skeleton-row div span:nth-child(1) {
  width: min(70%, 30rem);
  height: 0.85rem;
}

.queue-skeleton-row div span:nth-child(2) {
  width: min(90%, 42rem);
  height: 0.7rem;
}

.queue-skeleton-row div span:nth-child(3) {
  width: min(45%, 18rem);
  height: 0.65rem;
}

.spin {
  animation: workspace-spin 0.9s linear infinite;
}

@keyframes workspace-spin {
  to { transform: rotate(360deg); }
}

@keyframes workspace-pulse {
  50% { opacity: 0.45; }
}

@media (max-width: 820px) {
  .workspace-heading,
  .queue-toolbar {
    flex-direction: column;
  }

  .workspace-heading-actions,
  .queue-filters {
    width: 100%;
    justify-content: flex-start;
  }

  .queue-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .queue-filters label {
    min-width: 0;
  }

  .clear-filter-button {
    grid-column: 1 / -1;
  }
}

@media (max-width: 620px) {
  main {
    padding-top: 1.25rem;
  }

  .workspace-heading-actions .secondary-action {
    flex: 1;
  }

  .workspace-auth-state {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .workspace-auth-state .primary-action {
    width: 100%;
    margin-left: 0;
  }

  .queue-filters {
    grid-template-columns: 1fr;
  }

  .clear-filter-button {
    grid-column: auto;
  }

  .action-row {
    display: grid;
    grid-template-columns: 2.1rem minmax(0, 1fr);
  }

  .canonical-action,
  .canonical-action-unavailable {
    grid-column: 1 / -1;
    width: 100%;
  }

  .action-title-line {
    flex-direction: column;
  }

  .summary-row {
    gap: 0.6rem;
    padding-inline: 1rem;
  }

  .summary-row-copy small {
    display: none;
  }

  .summary-row-count {
    min-width: 2rem;
  }

  .panel-state {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .panel-state .secondary-action {
    width: 100%;
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spin,
  .summary-skeleton-row span,
  .queue-skeleton-row span {
    animation: none;
  }
}

.dark .workspace-title-icon,
.dark .workspace-tab-active,
.dark .summary-row-icon,
.dark .action-icon {
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}

.dark .workspace-tab span {
  background: rgb(15 23 42);
}

.dark .workspace-notice-error {
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

.dark .workspace-notice-partial {
  background: rgb(69 26 3);
  color: rgb(253 186 116);
}

.dark .priority-high {
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

.dark .priority-medium {
  background: rgb(69 26 3);
  color: rgb(253 186 116);
}

.dark .priority-low {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .summary-skeleton-row span,
.dark .queue-skeleton-row span {
  background: rgb(51 65 85);
}

/* Current community workspace baseline. */
.knowledge-workspace {
  min-width: 0;
}

.knowledge-page {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.page-intro,
.workspace-state,
.workspace-summary,
.workspace-tabs,
.workspace-tab,
.workspace-notice,
.section-heading,
.queue-toolbar,
.queue-filters,
.action-row,
.action-title-line,
.action-meta,
.canonical-action,
.pagination-row,
.summary-row {
  display: flex;
}

.page-intro {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 1.25rem;
}

.page-intro-copy {
  min-width: 0;
}

.page-kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.page-intro h1 {
  margin: 0.2rem 0 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: 0;
  text-wrap: balance;
}

.page-intro p {
  max-width: 68ch;
  margin: 0.35rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.page-intro-actions {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.workspace-state {
  align-items: center;
  gap: 0.8rem;
  min-height: 7rem;
  padding: 1.1rem;
}

.workspace-state > div {
  min-width: 0;
  flex: 1;
}

.workspace-state strong {
  color: var(--text-strong);
  font-size: 0.9rem;
}

.workspace-state p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.55;
}

.knowledge-shell {
  overflow: hidden;
}

.workspace-summary {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem;
}

.workspace-summary > div:first-child {
  display: grid;
  gap: 0.15rem;
}

.summary-label {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
}

.workspace-summary strong {
  color: var(--text-strong);
  font-size: 0.92rem;
}

.workspace-summary p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.76rem;
}

.summary-metrics {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.metric-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-height: 1.65rem;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0.25rem 0.6rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.metric-chip strong {
  color: var(--text-strong);
  font-size: inherit;
}

.metric-chip-active {
  background: var(--primary-50);
  color: var(--primary-700);
}

.summary-updated {
  color: var(--text-muted);
  font-size: 0.7rem;
  white-space: nowrap;
}

.workspace-tabs {
  gap: 0.25rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 1rem;
}

.workspace-tab {
  flex: none;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.85rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: 0 0.75rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
  transition: color 180ms ease, border-color 180ms ease;
}

.workspace-tab:hover,
.workspace-tab-active {
  border-bottom-color: var(--primary-600);
  background: transparent;
  color: var(--primary-700);
}

.workspace-tab > span {
  display: inline-flex;
  min-width: 1.35rem;
  height: 1.35rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0 0.35rem;
  color: var(--text-muted);
  font-size: 0.65rem;
}

.workspace-notice {
  align-items: flex-start;
  gap: 0.65rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.75rem 1rem;
  font-size: 0.76rem;
  line-height: 1.55;
}

.workspace-notice > div {
  min-width: 0;
  flex: 1;
}

.workspace-notice p {
  margin: 0.18rem 0 0;
}

.workspace-notice button {
  margin-left: auto;
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: 800;
}

.workspace-notice-error {
  background: #fffbfa;
  color: #b42318;
}

.workspace-notice-partial {
  background: #fffaeb;
  color: #93370d;
}

.overview-panel,
.queue-panel {
  padding: 1rem;
}

.section-heading {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.section-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.92rem;
  font-weight: 800;
}

.section-heading p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.section-count {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.summary-list {
  margin-top: 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  overflow: hidden;
}

.summary-row {
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-1);
  padding: 0.75rem;
  text-align: left;
  transition: background-color 180ms ease;
}

.summary-row:last-child {
  border-bottom: 0;
}

.summary-row:hover {
  background: var(--surface-2);
}

.summary-row-icon,
.action-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--primary-50);
  color: var(--primary-700);
}

.summary-row-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.1rem;
}

.summary-row-copy strong {
  color: var(--text-strong);
  font-size: 0.8rem;
}

.summary-row-copy small {
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

.summary-row-count {
  min-width: 2rem;
  color: var(--text-strong);
  font-size: 0.85rem;
  font-weight: 800;
  text-align: right;
}

.queue-toolbar {
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.85rem;
}

.queue-filters {
  align-items: flex-end;
  justify-content: flex-end;
  gap: 0.6rem;
}

.field-label {
  display: grid;
  min-width: 10.5rem;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.58rem 0.7rem;
  color: var(--text-primary);
  font-size: 0.78rem;
}

.field-control:focus {
  border-color: var(--primary-500);
}

.clear-filter-button {
  min-height: 2.35rem;
  padding: 0.5rem 0.7rem;
}

.action-list {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  overflow: hidden;
}

.action-row {
  align-items: center;
  gap: 0.8rem;
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: var(--surface-1);
  padding: 0.9rem;
}

.action-row:last-child {
  border-bottom: 0;
}

.action-main {
  min-width: 0;
  flex: 1;
}

.action-title-line {
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.action-title-line > div {
  min-width: 0;
}

.action-type {
  color: var(--primary-700);
  font-size: 0.68rem;
  font-weight: 800;
}

.action-title-line h3 {
  max-width: 50rem;
  margin: 0.18rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1.45;
  text-wrap: pretty;
}

.priority-badge {
  display: inline-flex;
  flex: none;
  align-items: center;
  min-height: 1.5rem;
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.55rem;
  font-size: 0.66rem;
  font-weight: 800;
}

.priority-high {
  background: #fef3f2;
  color: #b42318;
}

.priority-medium {
  background: #fffaeb;
  color: #93370d;
}

.priority-low {
  background: var(--surface-3);
  color: var(--text-muted);
}

.action-reason {
  max-width: 72ch;
  margin: 0.45rem 0 0;
  color: var(--text-primary);
  font-size: 0.78rem;
  line-height: 1.55;
  text-wrap: pretty;
}

.action-meta {
  flex-wrap: wrap;
  gap: 0.35rem 0.7rem;
  margin-top: 0.45rem;
  color: var(--text-muted);
  font-size: 0.68rem;
}

.action-meta > span:first-child {
  color: var(--primary-700);
  font-weight: 700;
}

.canonical-action {
  flex: none;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.25rem;
  border-radius: var(--radius-control);
  background: var(--primary-600);
  padding: 0.45rem 0.7rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
}

.canonical-action:hover {
  background: var(--primary-700);
}

.canonical-action-context {
  border: 1px solid var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.canonical-action-unavailable {
  flex: none;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.panel-state {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 8rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  padding: 1rem;
}

.panel-state > div {
  min-width: 0;
  flex: 1;
}

.panel-state strong {
  color: var(--text-strong);
  font-size: 0.86rem;
}

.panel-state p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.55;
}

.panel-state-error {
  border-color: #fecdca;
  background: #fffbfa;
  color: #b42318;
}

.panel-state-empty {
  background: var(--surface-2);
  color: var(--success);
}

.pagination-row {
  justify-content: center;
  margin-top: 1rem;
}

.summary-skeleton,
.queue-skeleton {
  margin-top: 0.85rem;
}

.summary-skeleton-row,
.queue-skeleton-row {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

:global(html.dark) .metric-chip-active,
:global(html.dark) .summary-row-icon,
:global(html.dark) .action-icon {
  background: rgba(30, 64, 175, 0.34);
  color: #bfdbfe;
}

:global(html.dark) .priority-high {
  background: rgba(127, 29, 29, 0.36);
  color: #fecaca;
}

:global(html.dark) .priority-medium,
:global(html.dark) .workspace-notice-partial {
  background: rgba(120, 53, 15, 0.32);
  color: #fdba74;
}

:global(html.dark) .workspace-notice-error,
:global(html.dark) .panel-state-error {
  border-color: #7f1d1d;
  background: rgba(69, 10, 10, 0.28);
  color: #fecaca;
}

@media (max-width: 860px) {
  .queue-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .queue-filters {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 700px) {
  .knowledge-page {
    padding-top: 1.25rem;
  }

  .page-intro,
  .workspace-state,
  .workspace-summary,
  .action-row,
  .panel-state {
    align-items: stretch;
    flex-direction: column;
  }

  .page-intro-actions {
    width: 100%;
  }

  .page-intro-actions .secondary-action,
  .workspace-state .primary-action,
  .canonical-action,
  .panel-state .secondary-action {
    width: 100%;
  }

  .summary-metrics {
    justify-content: flex-start;
  }

  .queue-filters {
    display: grid;
    grid-template-columns: 1fr;
    width: 100%;
  }

  .field-label {
    min-width: 0;
  }

  .clear-filter-button {
    width: 100%;
  }

  .action-title-line {
    gap: 0.5rem;
  }

  .action-icon {
    display: none;
  }

  .canonical-action-unavailable {
    align-self: flex-start;
  }
}

@media (max-width: 420px) {
  .page-intro-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .action-title-line {
    flex-direction: column;
  }

  .priority-badge {
    align-self: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-tab,
  .summary-row {
    transition: none;
  }
}
</style>
