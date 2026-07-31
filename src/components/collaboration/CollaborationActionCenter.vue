<template>
  <section class="action-center" data-collaboration-action-center>
    <header class="action-center-header">
      <div class="title-block">
        <span class="title-mark" aria-hidden="true">
          <ListChecks class="icon-large" />
        </span>
        <div>
          <p class="eyebrow">我的协作</p>
          <h1>行动中心</h1>
          <p>只呈现服务端确认过、现在需要你处理的协作事项。</p>
        </div>
      </div>
      <button
        v-if="authStore.isLoggedIn"
        type="button"
        class="refresh-button"
        :disabled="isLoading"
        title="刷新行动中心"
        aria-label="刷新行动中心"
        @click="loadInitial"
      >
        <RefreshCw class="icon" :class="{ spin: isLoading }" aria-hidden="true" />
        刷新
      </button>
    </header>

    <section v-if="!authStore.ready" class="login-state action-center-loading" aria-label="账号状态加载中">
      <Loader2 class="icon spin" aria-hidden="true" />
      <span>正在确认当前账号…</span>
    </section>

    <section v-else-if="!authStore.isLoggedIn" class="login-state" data-action-center-login>
      <LogIn class="icon" aria-hidden="true" />
      <div>
        <strong>登录后查看你的协作行动</strong>
        <p>未读通知不会自动变成待办，这里只显示当前账号可处理的协作事项。</p>
      </div>
      <button type="button" class="primary-action" @click="requireLogin()">
        <LogIn class="icon" aria-hidden="true" />
        登录
      </button>
    </section>

    <div v-else class="action-center-surface">
      <nav class="action-center-links" aria-label="协作档案入口">
        <RouterLink to="/collaboration?tab=my-collaborations">我的共建</RouterLink>
        <RouterLink to="/me/collaboration/contributions">公开贡献档案</RouterLink>
      </nav>
      <CollaborationActionSummary
        :summary="summary"
        :loading="summaryLoading"
        :error="summaryError"
        :active-type="actionTypeFilter"
        @select="selectActionType"
      />
      <CollaborationActionList
        :items="items"
        :loading="listLoading"
        :loading-more="listLoadingMore"
        :error="listError"
        :load-more-error="loadMoreError"
        :has-more="hasMore"
        :active-type="actionTypeFilter"
        @retry="loadInitial"
        @retry-more="loadMore"
        @load-more="loadMore"
        @clear-filter="clearActionType"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { ListChecks, Loader2, LogIn, RefreshCw } from 'lucide-vue-next'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { collaborationApi, type CollaborationActionItem, type CollaborationActionSummary as ActionSummary, type CollaborationActionType } from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { useAuthStore } from '@/stores/auth'
import { collaborationActionKey } from '@/utils/collaborationNeedPresentation'
import CollaborationActionList from './CollaborationActionList.vue'
import CollaborationActionSummary from './CollaborationActionSummary.vue'

const PAGE_SIZE = 20
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { requireLogin } = useLoginRedirect()
const summary = ref<ActionSummary | null>(null)
const items = ref<CollaborationActionItem[]>([])
const summaryLoading = ref(false)
const listLoading = ref(false)
const listLoadingMore = ref(false)
const summaryError = ref('')
const listError = ref('')
const loadMoreError = ref('')
const nextCursor = ref('')
const hasMore = ref(false)
const actionTypes: CollaborationActionType[] = [
  'NEED_SUBMIT',
  'NEED_REVISE',
  'NEED_REVIEW',
  'NEED_STALLED',
  'OFFICE_HOUR_REVIEW',
  'CURATION_REVIEW',
  'GOVERNANCE_REVIEW',
]
const actionTypeSet = new Set(actionTypes)
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const routeActionType = () => {
  const value = String(firstQueryValue(route.query.actionType) || '').toUpperCase() as CollaborationActionType
  return actionTypeSet.has(value) ? value : ''
}
const actionTypeFilter = ref<CollaborationActionType | ''>(routeActionType())
const accountGeneration = ref(0)
let summaryRequestId = 0
let listRequestId = 0
let summaryController: AbortController | null = null
let listController: AbortController | null = null
let disposed = false

const currentUid = () => String(authStore.user?.uid ?? '')
const currentToken = () => String(authStore.token ?? '')
const isLoading = computed(() => summaryLoading.value || listLoading.value || listLoadingMore.value)

const abortSummary = () => {
  summaryController?.abort()
  summaryController = null
}

const abortList = () => {
  listController?.abort()
  listController = null
}

const clearSummary = () => {
  summary.value = null
  summaryError.value = ''
  summaryLoading.value = false
}

const clearList = () => {
  items.value = []
  listError.value = ''
  loadMoreError.value = ''
  nextCursor.value = ''
  hasMore.value = false
  listLoading.value = false
  listLoadingMore.value = false
}

const invalidateRequests = () => {
  accountGeneration.value += 1
  summaryRequestId += 1
  listRequestId += 1
  abortSummary()
  abortList()
  clearSummary()
  clearList()
}

const summaryIsCurrent = (generation: number, uid: string, token: string, requestId: number) => (
  !disposed
  && generation === accountGeneration.value
  && requestId === summaryRequestId
  && uid === currentUid()
  && token === currentToken()
  && authStore.isLoggedIn
)

const listIsCurrent = (generation: number, uid: string, token: string, requestId: number) => (
  !disposed
  && generation === accountGeneration.value
  && requestId === listRequestId
  && uid === currentUid()
  && token === currentToken()
  && authStore.isLoggedIn
)

const loadSummary = async (
  generation = accountGeneration.value,
  uid = currentUid(),
  token = currentToken(),
) => {
  if (!authStore.isLoggedIn) return
  const requestId = ++summaryRequestId
  abortSummary()
  const controller = new AbortController()
  summaryController = controller
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const result = await collaborationApi.actions.summary({ signal: controller.signal })
    if (!summaryIsCurrent(generation, uid, token, requestId)) return
    summary.value = result.data || null
  } catch (error) {
    if (!summaryIsCurrent(generation, uid, token, requestId) || controller.signal.aborted) return
    summary.value = null
    summaryError.value = getErrorMessage(error, '行动摘要暂时无法读取')
  } finally {
    if (summaryIsCurrent(generation, uid, token, requestId)) summaryLoading.value = false
    if (summaryController === controller) summaryController = null
  }
}

const loadList = async (
  append = false,
  generation = accountGeneration.value,
  uid = currentUid(),
  token = currentToken(),
) => {
  if (!authStore.isLoggedIn || (append && (!hasMore.value || listLoadingMore.value))) return
  const requestId = ++listRequestId
  abortList()
  const controller = new AbortController()
  listController = controller
  if (append) {
    listLoadingMore.value = true
    loadMoreError.value = ''
  } else {
    listLoading.value = true
    listError.value = ''
    loadMoreError.value = ''
    items.value = []
    nextCursor.value = ''
    hasMore.value = false
  }

  try {
    const result = await collaborationApi.actions.list({
      actionType: actionTypeFilter.value || undefined,
      cursor: append ? nextCursor.value || undefined : undefined,
      size: PAGE_SIZE,
    }, { signal: controller.signal })
    if (!listIsCurrent(generation, uid, token, requestId)) return
    const incoming = result.data?.items || []
    const merged = append ? [...items.value, ...incoming] : incoming
    items.value = Array.from(new Map(merged.map((item) => [collaborationActionKey(item), item])).values())
    nextCursor.value = result.data?.nextCursor ? String(result.data.nextCursor) : ''
    hasMore.value = Boolean(result.data?.hasMore && nextCursor.value)
  } catch (error) {
    if (!listIsCurrent(generation, uid, token, requestId) || controller.signal.aborted) return
    const message = getErrorMessage(error, '待办列表暂时无法读取')
    if (append) loadMoreError.value = message
    else {
      listError.value = message
      items.value = []
      nextCursor.value = ''
      hasMore.value = false
    }
  } finally {
    if (listIsCurrent(generation, uid, token, requestId)) {
      if (append) listLoadingMore.value = false
      else listLoading.value = false
    }
    if (listController === controller) listController = null
  }
}

const loadInitial = async () => {
  if (!authStore.isLoggedIn) {
    invalidateRequests()
    return
  }
  invalidateRequests()
  const generation = accountGeneration.value
  const uid = currentUid()
  const token = currentToken()
  void loadSummary(generation, uid, token)
  void loadList(false, generation, uid, token)
}

const loadMore = () => loadList(true)

const selectActionType = (type: CollaborationActionType) => {
  const nextType = actionTypeFilter.value === type ? '' : type
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      actionType: nextType || undefined,
    },
  })
}

const clearActionType = () => {
  if (!actionTypeFilter.value) return
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      actionType: undefined,
    },
  })
}

watch(
  () => firstQueryValue(route.query.actionType),
  () => {
    const nextType = routeActionType()
    if (nextType === actionTypeFilter.value) return
    actionTypeFilter.value = nextType
    if (authStore.isLoggedIn) void loadList()
  },
)

watch(
  [() => authStore.isLoggedIn, () => authStore.user?.uid, () => authStore.token],
  () => {
    void loadInitial()
  },
  { immediate: true, flush: 'sync' },
)

onUnmounted(() => {
  disposed = true
  invalidateRequests()
})
</script>

<style scoped>
.action-center {
  min-width: 0;
}

.action-center-header,
.title-block,
.login-state {
  display: flex;
  align-items: center;
}

.action-center-header {
  justify-content: space-between;
  gap: 1rem;
  padding: 0.25rem 0 1.25rem;
}

.action-center-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.85rem 1.4rem;
}

.action-center-links a {
  display: inline-flex;
  min-height: 2.2rem;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.35rem 0.65rem;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 750;
}

.title-block {
  min-width: 0;
  align-items: flex-start;
  gap: 0.85rem;
}

.title-mark {
  display: inline-flex;
  width: 2.8rem;
  height: 2.8rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: var(--primary-50);
  color: var(--primary-700);
}

.eyebrow {
  margin: 0 0 0.15rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.title-block h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.7rem;
  font-weight: 900;
  text-wrap: balance;
}

.title-block p:last-child {
  max-width: 60ch;
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}

.refresh-button,
.primary-action {
  display: inline-flex;
  min-height: 2.5rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: var(--radius-control);
  padding: 0.55rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 800;
}

.refresh-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.refresh-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.primary-action {
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.action-center-surface {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.login-state {
  min-height: 8rem;
  gap: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.25rem 1.4rem;
  color: var(--text-muted);
}

.login-state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.95rem;
}

.login-state p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
}

.login-state .primary-action {
  margin-left: auto;
}

.action-center-loading {
  justify-content: center;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.icon-large {
  width: 1.35rem;
  height: 1.35rem;
}

.spin {
  animation: action-center-spin 0.9s linear infinite;
}

@keyframes action-center-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin { animation: none; }
}

@media (max-width: 560px) {
  .action-center-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .refresh-button {
    width: 100%;
  }

  .login-state {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .login-state .primary-action {
    width: 100%;
    margin-left: 0;
  }
}
</style>
