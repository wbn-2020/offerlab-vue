<template>
  <div class="app-shell maintenance-page">
    <AppHeader />
    <main class="community-page maintenance-main">
      <header class="page-header">
        <div>
          <p class="page-kicker">内容维护</p>
          <h1>我的维护任务</h1>
          <span>领取任务、选择一份你有权提交的公开内容，交付后等待治理审核。</span>
        </div>
        <button type="button" class="secondary-action icon-button" title="刷新维护任务" :disabled="loading" @click="load()">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
          <span>刷新</span>
        </button>
      </header>

      <section class="filter-bar surface-panel" aria-label="维护任务筛选">
        <div class="filter-copy">
          <strong>任务队列</strong>
          <span>{{ items.length ? `当前已加载 ${items.length} 项` : '只展示分配给当前账号的任务' }}，状态由服务端治理流程决定。</span>
        </div>
        <label class="field-label">
          <span>任务状态</span>
          <select v-model="status" class="field-control" aria-label="按状态筛选维护任务" @change="changeStatus">
            <option value="">全部状态</option>
            <option v-for="item in statuses" :key="item" :value="item">{{ statusLabel(item) }}</option>
          </select>
        </label>
      </section>

      <div v-if="errorText && items.length === 0" class="state state-error surface-panel" role="alert">
        <div>
          <strong>{{ maintenanceErrorTitle }}</strong>
          <p>{{ maintenanceErrorDescription }}</p>
          <small v-if="maintenanceErrorKind === 'permission'">如果你需要处理其他账号的任务，请切换到有权限的账号。</small>
        </div>
        <div class="state-actions">
          <RouterLink v-if="maintenanceErrorKind === 'permission'" :to="switchAccountLocation" class="secondary-action secondary-button">切换账号</RouterLink>
          <button type="button" class="secondary-action secondary-button" :disabled="loading" @click="load()">重试</button>
        </div>
      </div>
      <div v-else-if="loading" class="state surface-panel" role="status">
        <strong>正在读取维护任务</strong>
        <p>正在同步当前账号的任务状态与交付权限。</p>
      </div>
      <div v-else-if="items.length === 0" class="state surface-panel">
        <strong>当前没有分配给你的维护任务</strong>
        <p>这里不会要求你记住任务编号。新任务被分配或已有任务状态更新后，会出现在这里。</p>
        <div class="state-actions">
          <RouterLink to="/me/knowledge" class="secondary-action secondary-button">查看知识维护</RouterLink>
          <RouterLink to="/explore" class="primary-action primary-button">去发现公开内容</RouterLink>
        </div>
      </div>

      <section v-else class="task-list" aria-label="维护任务列表">
        <article v-for="task in items" :key="String(task.id)" class="task-row surface-panel">
          <header class="task-head">
            <div class="task-title-group">
              <div class="badge-line">
                <span :class="['status', statusClass(task.status)]">{{ statusLabel(task.status) }}</span>
                <span :class="['priority', priorityClass(task.priority)]">{{ priorityLabel(task.priority) }}</span>
                <span class="source">{{ phaseLabel(task.maintenancePhase) }}</span>
                <span class="source">{{ sourceLabel(task.sourceType) }}</span>
              </div>
              <h2>{{ task.title }}</h2>
            </div>
            <RouterLink v-if="task.sourcePostId" :to="`/post/${task.sourcePostId}`" class="open-link">查看原内容</RouterLink>
          </header>

          <p class="detail">{{ task.detail }}</p>

          <dl class="task-facts">
            <div><dt>领域</dt><dd>{{ task.domain }}</dd></div>
            <div><dt>处理回合</dt><dd>第 {{ task.currentAttemptNo }} 回合</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatTime(task.updateTime) }}</dd></div>
            <div>
              <dt>截止时间</dt>
              <dd :class="dueClass(task.dueAt)">{{ task.dueAt ? formatTime(task.dueAt) : '未设置' }}</dd>
            </div>
          </dl>

          <div v-if="task.terminalOutcomeCode || task.closeReasonCode || task.reviewNote || task.deliveryNote" class="task-notes">
            <p v-if="task.terminalOutcomeCode"><strong>结案结果</strong>{{ terminalOutcomeLabel(task.terminalOutcomeCode) }}</p>
            <p v-if="task.closeReasonCode"><strong>关闭原因</strong>{{ closeReasonLabel(task.closeReasonCode) }}</p>
            <p v-if="task.reviewNote"><strong>治理说明</strong>{{ task.reviewNote }}</p>
            <p v-if="task.deliveryNote"><strong>交付说明</strong>{{ task.deliveryNote }}</p>
          </div>

          <div class="task-context">
            <MaintenanceTaskReviewContextPanel
              :task-id="task.id"
              :context-key="`${task.status}:${task.updateTime}:${task.deliveryType || ''}:${task.deliveryRefId || ''}:${task.deliveryPostId || ''}`"
            />
            <MaintenanceTaskAttemptTimeline
              :task-id="task.id"
              :timeline-key="`${task.currentAttemptNo}:${task.status}:${task.updateTime}`"
            />
          </div>

          <div v-if="task.canClaim" class="action-row">
            <div>
              <strong>下一步：领取任务</strong>
              <p>领取后才可提交公开内容交付。</p>
            </div>
            <button type="button" class="primary-action primary-button" :disabled="isTaskMutationPending(task)" @click="claim(task)">
              {{ isTaskActionPending(task, 'claim') ? '领取中' : '领取任务' }}
            </button>
          </div>

          <form v-if="task.canSubmit" class="submit-form" @submit.prevent="submit(task)">
            <div class="submit-form-heading">
              <strong>提交维护交付</strong>
              <p>优先选择你的公开内容；收藏内容只作为参考，不能代替你的交付。服务端会再次校验归属、公开状态和领域。</p>
            </div>
            <fieldset class="submit-form-fields" :disabled="isTaskMutationPending(task)">
              <div v-if="candidateLoading && !deliveryCandidates(task).length" class="candidate-state" role="status">
                <strong>正在整理可用资源</strong>
                <p>正在从你的公开内容和收藏中寻找可选择的交付资源。</p>
              </div>
              <div v-else-if="candidateError && !deliveryCandidates(task).length" class="candidate-state candidate-state-error" role="alert">
                <strong>候选资源暂时无法读取</strong>
                <p>{{ candidateError }}</p>
                <button type="button" class="secondary-action secondary-button" :disabled="candidateLoading" @click="loadCandidateResources()">重试</button>
              </div>
              <CollaborationDeliverySelector
                v-else
                class="maintenance-delivery-selector"
                :model-value="selectedDeliveryCandidate(task)"
                :candidates="deliveryCandidates(task)"
                :preferred-candidate-id="suggestedDelivery(task)?.deliveryRefId"
                :initial-resolution-type="draft(task).deliveryType"
                title="先选择公开交付资源"
                description="关联资源、我的公开内容和收藏参考会集中显示在这里。"
                empty-description="当前没有可直接选择的资源。你可以先创建新的公开内容，再回来提交；不会要求你手填编号。"
                create-action-label="新建公开内容"
                :create-href="createDeliveryHref(task)"
                :show-filters="true"
                :show-create-action="true"
                @select="applyDeliveryCandidate(task, $event)"
              />
              <p v-if="candidateError && deliveryCandidates(task).length" class="candidate-partial-error" role="status">
                部分候选来源暂不可用，当前仍可使用已列出的资源。
              </p>
              <details class="manual-delivery-fallback">
                <summary>高级：使用精确资源 ID</summary>
                <div class="manual-delivery-fields">
                  <select v-model="draft(task).deliveryType" class="field-control">
                    <option value="POST">公开帖子</option>
                    <option value="QUESTION">公开问题</option>
                    <option value="SERIES">协作合集</option>
                  </select>
                  <input v-model.trim="draft(task).deliveryRefId" class="field-control" inputmode="numeric" placeholder="仅在你确认资源编号时填写">
                </div>
                <p class="field-help">只接受你有权提交的公开资源编号。服务端会校验归属、公开状态和领域。</p>
              </details>
              <label class="note-field">
                <span>交付说明</span>
                <textarea v-model.trim="draft(task).note" class="field-control note-input" rows="3" maxlength="1000" placeholder="说明本次更新解决了什么、还有哪些边界。" />
              </label>
              <button type="submit" class="primary-action primary-button" :disabled="isTaskMutationPending(task) || !canSubmit(task)">
                {{ isTaskActionPending(task, 'submit') ? '提交中' : '提交治理审核' }}
              </button>
            </fieldset>
          </form>
        </article>
      </section>

      <div v-if="loadMoreErrorText && items.length > 0" class="state state-error load-more-error surface-panel">
        <div><strong>后续任务加载失败</strong><p>{{ loadMoreErrorText }}</p></div>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationDeliverySelector from '@/components/collaboration/CollaborationDeliverySelector.vue'
import MaintenanceTaskReviewContextPanel from '@/components/maintenance/MaintenanceTaskReviewContextPanel.vue'
import MaintenanceTaskAttemptTimeline from '@/components/maintenance/MaintenanceTaskAttemptTimeline.vue'
import type { NeedDeliveryCandidate } from '@/api/collaboration'
import { BizException, getErrorMessage } from '@/api/client'
import { postApi } from '@/api/post'
import type { Post } from '@/api/types'
import { useAuthStore } from '@/stores/auth'
import {
  contentMaintenanceApi,
  ContentMaintenanceContractError,
  type ContentMaintenanceCloseReasonCode,
  type MaintenancePriority,
  type ContentMaintenanceTask,
  type ContentMaintenanceTerminalOutcomeCode,
  type MaintenanceDeliveryType,
  type MaintenancePhase,
  type MaintenanceStatus,
} from '@/api/contentMaintenance'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const statuses: MaintenanceStatus[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED']
const statusSet = new Set(statuses)
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const readRouteStatus = () => {
  const value = String(firstQueryValue(route.query.status) || '').toUpperCase() as MaintenanceStatus
  return statusSet.has(value) ? value : ''
}
const status = ref<MaintenanceStatus | ''>(readRouteStatus())
const items = ref<ContentMaintenanceTask[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const drafts = reactive<Record<string, { deliveryType: MaintenanceDeliveryType; deliveryRefId: string; note: string }>>({})
const pendingActions = reactive<Record<string, number>>({})
const ownedPublicPosts = ref<Post[]>([])
const favoritePosts = ref<Post[]>([])
const candidateLoading = ref(false)
const candidateError = ref('')
const candidateLoadGeneration = ref(0)
const maintenanceErrorKind = ref<'error' | 'permission'>('error')
let maintenanceLoadRequestId = 0
let maintenanceAccountGeneration = 0
let maintenanceLoadController: AbortController | null = null
let maintenanceWriteRequestId = 0

interface MaintenanceLoadSnapshot {
  requestId: number
  requestedStatus: MaintenanceStatus | ''
  cursor: string | null
  append: boolean
  accountKey: string
  accountGeneration: number
  controller: AbortController
}

interface MaintenanceWriteSnapshot {
  requestId: number
  actionKey: string
  accountKey: string
  accountGeneration: number
}

const currentMaintenanceAccountKey = () => (
  `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
)

const switchAccountLocation = computed(() => ({
  path: '/login',
  query: {
    redirect: route.fullPath,
    switchAccount: '1',
  },
}))

const isPermissionError = (error: unknown) => {
  const status = Number((error as { response?: { status?: unknown } } | null)?.response?.status)
  const code = error instanceof BizException ? error.code : Number((error as { code?: unknown } | null)?.code)
  return status === 401 || status === 403 || code === 10401 || code === 10403
}

const maintenanceErrorTitle = computed(() => (
  maintenanceErrorKind.value === 'permission' ? '当前账号没有查看维护任务的权限' : '维护任务暂时无法读取'
))

const maintenanceErrorDescription = computed(() => (
  maintenanceErrorKind.value === 'permission'
    ? '服务端拒绝了当前账号的任务读取请求。请切换账号或稍后重试。'
    : errorText.value
))

const maintenanceRequestIsCurrent = (
  requestId: number,
  requestedStatus: MaintenanceStatus | '',
  accountKey: string,
  accountGeneration: number,
) => (
  requestId === maintenanceLoadRequestId
  && requestedStatus === status.value
  && accountGeneration === maintenanceAccountGeneration
  && accountKey === currentMaintenanceAccountKey()
  && authStore.isLoggedIn
)

const maintenanceRequestSnapshotIsCurrent = (snapshot: MaintenanceLoadSnapshot) => (
  maintenanceRequestIsCurrent(
    snapshot.requestId,
    snapshot.requestedStatus,
    snapshot.accountKey,
    snapshot.accountGeneration,
  )
  && snapshot.cursor === (snapshot.append ? nextCursor.value : null)
  && maintenanceLoadController === snapshot.controller
  && !snapshot.controller.signal.aborted
)

const abortMaintenanceLoad = () => {
  maintenanceLoadController?.abort()
  maintenanceLoadController = null
}

const clearMaintenanceState = () => {
  maintenanceLoadRequestId += 1
  maintenanceWriteRequestId += 1
  abortMaintenanceLoad()
  loading.value = false
  loadingMore.value = false
  items.value = []
  nextCursor.value = null
  hasMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
  for (const key of Object.keys(drafts)) delete drafts[key]
  for (const key of Object.keys(pendingActions)) delete pendingActions[key]
}

const clearCandidateState = () => {
  candidateLoadGeneration.value += 1
  ownedPublicPosts.value = []
  favoritePosts.value = []
  candidateLoading.value = false
  candidateError.value = ''
}

const candidatePostType = (post: Post): 'POST' | 'QUESTION' => (
  Number(post.postType) === 13 ? 'QUESTION' : 'POST'
)

const postCandidate = (
  post: Post,
  task: ContentMaintenanceTask,
  origin: 'owned' | 'favorite',
): NeedDeliveryCandidate => {
  const deliveryType = candidatePostType(post)
  const id = String(post.postId)
  const isPublic = post.visibility == null || String(post.visibility).toUpperCase() === 'PUBLIC' || Number(post.visibility) === 1
  const isOwned = origin === 'owned'
  const sameDomain = post.domain == null || Number(post.domain) === Number(task.domain)
  const eligible = isOwned && isPublic && !post.deleted && !post.restricted && sameDomain
  let ineligibleReason = ''
  if (!isOwned) ineligibleReason = '收藏内容属于其他作者，只能作为参考；请新建或选择自己的公开内容。'
  else if (!isPublic || post.deleted || post.restricted) ineligibleReason = '该内容当前不是可提交的公开内容。'
  else if (!sameDomain) ineligibleReason = '该内容所属领域与当前维护任务不一致。'
  return {
    id,
    resolutionType: deliveryType,
    title: `${isOwned ? '我的公开内容' : '我的收藏'} · ${post.title || '未命名内容'}`,
    domain: Number(post.domain ?? task.domain),
    postType: post.postType,
    publicPath: `/post/${encodeURIComponent(id)}`,
    eligible,
    ineligibleReason: ineligibleReason || null,
    createTime: new Date(post.createdAt || Date.now()).toISOString(),
    updateTime: new Date(post.updatedAt || post.createdAt || Date.now()).toISOString(),
  }
}

const loadCandidateResources = async () => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) return
  const generation = ++candidateLoadGeneration.value
  const uid = String(authStore.user.uid)
  candidateLoading.value = true
  candidateError.value = ''
  try {
    const [ownedResult, favoriteResult] = await Promise.allSettled([
      postApi.list({ authorId: uid, size: 12 }),
      postApi.getMyFavorites(undefined, 12),
    ])
    if (generation !== candidateLoadGeneration.value || uid !== String(authStore.user?.uid ?? '')) return
    const failures = [ownedResult, favoriteResult].filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (ownedResult.status === 'fulfilled') ownedPublicPosts.value = ownedResult.value.data?.items || []
    if (favoriteResult.status === 'fulfilled') favoritePosts.value = favoriteResult.value.data?.items || []
    if (failures.length === 2) {
      const permissionFailure = failures.some((result) => isPermissionError(result.reason))
      candidateError.value = permissionFailure
        ? '当前账号没有权限读取候选资源，请切换账号或稍后重试。'
        : '公开内容和收藏暂时都无法读取，请稍后重试。'
    } else if (failures.length) {
      candidateError.value = '部分候选来源暂不可用，已保留仍可读取的资源。'
    }
  } finally {
    if (generation === candidateLoadGeneration.value) candidateLoading.value = false
  }
}

const isCanceledRequest = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) return true
  const candidate = error as { name?: unknown; code?: unknown } | null | undefined
  return candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const suggestedDelivery = (task: ContentMaintenanceTask) => {
  if (task.sourcePostId) {
    return {
      deliveryType: task.sourceType === 'QUESTION' ? 'QUESTION' as const : 'POST' as const,
      deliveryRefId: String(task.sourcePostId),
    }
  }
  if (task.sourceType === 'QUESTION' && task.sourceRefId) {
    return { deliveryType: 'QUESTION' as const, deliveryRefId: String(task.sourceRefId) }
  }
  return null
}
const taskActionKey = (task: ContentMaintenanceTask, action: string) => `${String(task.id)}:${action}`
const isTaskActionPending = (task: ContentMaintenanceTask, action: string) => (
  pendingActions[taskActionKey(task, action)] != null
)
const isTaskMutationPending = (task: ContentMaintenanceTask) => (
  Object.keys(pendingActions).some((key) => key.startsWith(`${String(task.id)}:`))
)
const beginMaintenanceWrite = (actionKey: string): MaintenanceWriteSnapshot | null => {
  const separatorIndex = actionKey.indexOf(':')
  const taskId = separatorIndex > 0 ? actionKey.slice(0, separatorIndex) : null
  if (
    pendingActions[actionKey] != null
    || (taskId != null && Object.keys(pendingActions).some((key) => key.startsWith(`${taskId}:`)))
    || !authStore.isLoggedIn
    || !authStore.user?.uid
  ) return null
  const snapshot: MaintenanceWriteSnapshot = {
    requestId: ++maintenanceWriteRequestId,
    actionKey,
    accountKey: currentMaintenanceAccountKey(),
    accountGeneration: maintenanceAccountGeneration,
  }
  pendingActions[actionKey] = snapshot.requestId
  return snapshot
}
const maintenanceWriteIsCurrent = (snapshot: MaintenanceWriteSnapshot) => (
  pendingActions[snapshot.actionKey] === snapshot.requestId
  && snapshot.accountGeneration === maintenanceAccountGeneration
  && snapshot.accountKey === currentMaintenanceAccountKey()
  && authStore.isLoggedIn
  && Boolean(authStore.user?.uid)
)
const finishMaintenanceWrite = (snapshot: MaintenanceWriteSnapshot) => {
  if (pendingActions[snapshot.actionKey] === snapshot.requestId) {
    delete pendingActions[snapshot.actionKey]
  }
}
const draft = (task: ContentMaintenanceTask) => {
  const suggestion = suggestedDelivery(task)
  return drafts[String(task.id)] ||= {
    deliveryType: suggestion?.deliveryType || 'POST',
    deliveryRefId: suggestion?.deliveryRefId || '',
    note: '',
  }
}
const deliveryCandidates = (task: ContentMaintenanceTask): NeedDeliveryCandidate[] => {
  const candidates: NeedDeliveryCandidate[] = []
  const suggestion = suggestedDelivery(task)
  if (suggestion) {
    candidates.push({
      id: suggestion.deliveryRefId,
      resolutionType: suggestion.deliveryType,
      title: `${task.title}（关联资源）`,
      domain: task.domain,
      publicPath: `/post/${encodeURIComponent(suggestion.deliveryRefId)}`,
      eligible: true,
      createTime: task.createTime,
      updateTime: task.updateTime,
    })
  }
  if (task.deliveryRefId && task.deliveryType) {
    const previousId = String(task.deliveryRefId)
    if (!candidates.some((candidate) => (
      String(candidate.id) === previousId && candidate.resolutionType === task.deliveryType
    ))) {
      candidates.push({
        id: previousId,
        resolutionType: task.deliveryType,
        title: `${task.title}（上次提交）`,
        domain: task.domain,
        publicPath: task.deliveryType === 'SERIES'
          ? `/collaboration/series/${encodeURIComponent(previousId)}`
          : `/post/${encodeURIComponent(previousId)}`,
        eligible: true,
        createTime: task.createTime,
        updateTime: task.updateTime,
      })
    }
  }
  for (const post of ownedPublicPosts.value) {
    const candidate = postCandidate(post, task, 'owned')
    if (!candidates.some((item) => `${item.resolutionType}:${String(item.id)}` === `${candidate.resolutionType}:${String(candidate.id)}`)) {
      candidates.push(candidate)
    }
  }
  for (const post of favoritePosts.value) {
    const candidate = postCandidate(post, task, 'favorite')
    if (!candidates.some((item) => `${item.resolutionType}:${String(item.id)}` === `${candidate.resolutionType}:${String(candidate.id)}`)) {
      candidates.push(candidate)
    }
  }
  return candidates
}
const selectedDeliveryCandidate = (task: ContentMaintenanceTask) => {
  const value = draft(task)
  return deliveryCandidates(task).find((candidate) => (
    String(candidate.id) === value.deliveryRefId && candidate.resolutionType === value.deliveryType
  )) || null
}
const applyDeliveryCandidate = (task: ContentMaintenanceTask, candidate: NeedDeliveryCandidate) => {
  if (isTaskMutationPending(task)) return
  Object.assign(draft(task), {
    deliveryType: candidate.resolutionType,
    deliveryRefId: String(candidate.id),
  })
}

const createDeliveryHref = (task: ContentMaintenanceTask) => {
  const query = new URLSearchParams({
    source: 'maintenance_task',
    taskId: String(task.id),
    domain: String(task.domain),
    returnHref: route.fullPath,
  })
  if (task.sourcePostId) query.set('sourcePostId', String(task.sourcePostId))
  return `/editor?${query.toString()}`
}
const load = async (append = false) => {
  if (!authStore.isLoggedIn || !authStore.user?.uid) return
  if (append && (!hasMore.value || loadingMore.value)) return
  const requestedStatus = status.value
  const cursor = append ? nextCursor.value : null
  if (append && !cursor) return
  const accountKey = currentMaintenanceAccountKey()
  const accountGeneration = maintenanceAccountGeneration
  abortMaintenanceLoad()
  const controller = new AbortController()
  const requestId = ++maintenanceLoadRequestId
  const snapshot: MaintenanceLoadSnapshot = {
    requestId,
    requestedStatus,
    cursor,
    append,
    accountKey,
    accountGeneration,
    controller,
  }
  const identityIsCurrent = () => maintenanceRequestIsCurrent(requestId, requestedStatus, accountKey, accountGeneration)
  maintenanceLoadController = controller
  if (append) {
    loadingMore.value = true
    loadMoreErrorText.value = ''
  } else {
    loading.value = true
    loadingMore.value = false
    items.value = []
    nextCursor.value = null
    hasMore.value = false
    errorText.value = ''
    loadMoreErrorText.value = ''
  }
  try {
    const res = await contentMaintenanceApi.mine({
      status: requestedStatus || undefined,
      cursor: cursor || 0,
      size: 50,
    }, {
      signal: controller.signal,
    })
    if (!identityIsCurrent() || !maintenanceRequestSnapshotIsCurrent(snapshot)) return
    if (!res.data) throw new ContentMaintenanceContractError()
    const incoming = res.data.items
    items.value = append ? [...items.value, ...incoming] : incoming
    nextCursor.value = res.data.nextCursor
    hasMore.value = res.data.hasMore
  } catch (error) {
    if (
      isCanceledRequest(error, controller.signal)
      || !identityIsCurrent()
      || !maintenanceRequestSnapshotIsCurrent(snapshot)
    ) return
    const message = getErrorMessage(error, append ? '加载更多维护任务失败' : '维护任务暂时无法读取')
    if (append) loadMoreErrorText.value = message
    else {
      errorText.value = message
      maintenanceErrorKind.value = isPermissionError(error) ? 'permission' : 'error'
    }
  } finally {
    if (maintenanceLoadController === controller && requestId === maintenanceLoadRequestId) {
      if (append) loadingMore.value = false
      else loading.value = false
      maintenanceLoadController = null
    }
  }
}
const claim = async (task: ContentMaintenanceTask) => {
  const snapshot = beginMaintenanceWrite(taskActionKey(task, 'claim'))
  if (!snapshot) return
  try {
    await contentMaintenanceApi.claim(task.id)
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.success('任务已领取')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '领取任务失败'))
  } finally {
    finishMaintenanceWrite(snapshot)
  }
}
const changeStatus = () => {
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      status: status.value || undefined,
    },
  })
}
const canSubmit = (task: ContentMaintenanceTask) => {
  const value = draft(task)
  return /^[1-9]\d*$/.test(value.deliveryRefId) && value.note.length >= 5
}
const submit = async (task: ContentMaintenanceTask) => {
  if (!canSubmit(task)) return
  const snapshot = beginMaintenanceWrite(taskActionKey(task, 'submit'))
  if (!snapshot) return
  try {
    const value = draft(task)
    await contentMaintenanceApi.submit(task.id, {
      deliveryType: value.deliveryType,
      deliveryRefId: value.deliveryRefId,
      deliveryPostId: value.deliveryType === 'SERIES' ? undefined : value.deliveryRefId,
      note: value.note,
    })
    if (!maintenanceWriteIsCurrent(snapshot)) return
    delete drafts[String(task.id)]
    toast.success('交付已提交，等待治理审核')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '提交交付失败'))
  } finally {
    finishMaintenanceWrite(snapshot)
  }
}
const statusLabel = (value: MaintenanceStatus) => ({
  OPEN: '待领取', CLAIMED: '处理中', SUBMITTED: '待审核', COMPLETED: '已完成', CLOSED: '已关闭',
}[value])
const priorityLabel = (value: MaintenancePriority) => ({
  LOW: '低优先级',
  MEDIUM: '中优先级',
  HIGH: '高优先级',
}[value])
const priorityClass = (value: MaintenancePriority) => (
  value === 'HIGH' ? 'priority-high' : value === 'LOW' ? 'priority-low' : 'priority-medium'
)
const phaseLabel = (value: MaintenancePhase) => ({
  OPEN: '待领取',
  IN_PROGRESS: '处理中',
  REWORK: '返工中',
  REVIEW_PENDING: '待审核',
  VERIFIED_DELIVERY: '已核验',
  CLOSED: '已关闭',
}[value])
const terminalOutcomeLabel = (value: ContentMaintenanceTerminalOutcomeCode) => ({
  VERIFIED_DELIVERY: '交付已核验',
}[value])
const closeReasonLabel = (value: ContentMaintenanceCloseReasonCode) => ({
  OUT_OF_SCOPE: '不在维护范围内',
  DUPLICATE: '重复维护',
  NO_LONGER_RELEVANT: '不再相关',
  AUTHOR_UNRESPONSIVE: '维护者未响应',
  OTHER: '其他',
}[value])
const sourceLabel = (value: string) => ({
  CHANNEL_HEALTH: '频道健康', SEARCH_GAP: '搜索缺口', SUGGESTION: '补充纠错',
  FRESHNESS: '时效确认', PROFILE_CONFIRMATION: '经验背景', QUESTION: '问题闭环', MANUAL: '人工创建',
}[value] || value)
const statusClass = (value: MaintenanceStatus) => (
  value === 'COMPLETED' ? 'status-ok' : value === 'SUBMITTED' ? 'status-warn' : value === 'CLOSED' ? 'status-muted' : 'status-active'
)
const formatTime = (value: string) => value?.replace('T', ' ').slice(0, 16) || '--'
const parseUtcDeadline = (value: string) => {
  const timestamp = value.trim()
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) ? timestamp : `${timestamp}Z`
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
const dueClass = (dueAt: string | null) => {
  if (!dueAt) return 'due-neutral'
  const deadline = parseUtcDeadline(dueAt)
  return deadline != null && deadline < Date.now() ? 'due-overdue' : 'due-neutral'
}

watch(
  () => firstQueryValue(route.query.status),
  () => {
    const nextStatus = readRouteStatus()
    status.value = nextStatus
    void load()
  },
)

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    maintenanceAccountGeneration += 1
    clearMaintenanceState()
    clearCandidateState()
    if (uid && token) void load()
    if (uid && token) void loadCandidateResources()
  },
)

onMounted(() => {
  void load()
  void loadCandidateResources()
})

onBeforeUnmount(() => {
  clearMaintenanceState()
  clearCandidateState()
})
</script>

<style scoped>
.maintenance-page {
  min-width: 0;
}

.maintenance-main {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.page-header,
.task-head,
.action-row,
.filter-bar,
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

.filter-bar {
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem 1.1rem;
}

.filter-copy {
  display: grid;
  gap: 0.2rem;
}

.filter-copy strong {
  color: var(--text-strong);
  font-size: 0.92rem;
}

.filter-copy span {
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.field-label,
.note-field {
  display: grid;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.field-label {
  width: min(14rem, 100%);
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
  line-height: 1.4;
}

.field-control:focus {
  border-color: var(--primary-500);
}

.task-list {
  display: grid;
  gap: 0.85rem;
}

.task-row {
  min-width: 0;
  padding: 1.1rem;
}

.task-head {
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.task-title-group {
  min-width: 0;
}

.badge-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.status,
.source,
.priority {
  display: inline-flex;
  align-items: center;
  min-height: 1.5rem;
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.55rem;
  font-size: 0.68rem;
  font-weight: 800;
}

.status-active {
  background: var(--primary-50);
  color: var(--primary-700);
}

.status-warn,
.priority-medium {
  background: #fffaeb;
  color: #93370d;
}

.status-ok,
.priority-low {
  background: #ecfdf3;
  color: #027a48;
}

.status-muted,
.source {
  background: var(--surface-3);
  color: var(--text-muted);
}

.priority-high {
  background: #fef3f2;
  color: #b42318;
}

.task-head h2 {
  max-width: 44rem;
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
  color: var(--primary-700);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.open-link:hover {
  text-decoration: underline;
}

.detail {
  max-width: 72ch;
  margin: 0.75rem 0 0;
  color: var(--text-primary);
  font-size: 0.84rem;
  line-height: 1.7;
  text-wrap: pretty;
}

.task-facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 1rem 0 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-2);
}

.task-facts div {
  min-width: 0;
  padding: 0.7rem 0.8rem;
}

.task-facts div:not(:nth-child(3n + 1)) {
  border-left: 1px solid var(--border-subtle);
}

.task-facts div:nth-child(n + 4) {
  border-top: 1px solid var(--border-subtle);
}

.task-facts dt {
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 700;
}

.task-facts dd {
  margin: 0.2rem 0 0;
  overflow-wrap: anywhere;
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
}

.due-overdue {
  color: var(--danger) !important;
}

.task-notes {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.task-notes p {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.75rem;
  margin: 0;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.65rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  line-height: 1.55;
}

.task-notes strong {
  color: var(--text-muted);
}

.task-context {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.9rem;
}

.action-row {
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  border: 1px solid #b2ddff;
  border-radius: var(--radius-surface);
  background: #eff8ff;
  padding: 0.8rem;
}

.action-row strong,
.submit-form-heading strong {
  color: var(--text-strong);
  font-size: 0.84rem;
}

.action-row p,
.submit-form-heading p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.74rem;
  line-height: 1.5;
}

.submit-form {
  margin-top: 1rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
}

.submit-form-heading {
  margin-bottom: 0.75rem;
}

.submit-form-fields {
  display: grid;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  gap: 0.75rem;
}

.maintenance-delivery-selector {
  min-width: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.candidate-state {
  display: grid;
  gap: 0.3rem;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0;
  color: var(--text-muted);
}

.candidate-state strong {
  color: var(--text-strong);
  font-size: 0.84rem;
}

.candidate-state p,
.candidate-partial-error,
.field-help {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.55;
}

.candidate-state-error,
.candidate-partial-error {
  color: var(--warning);
}

.candidate-state .secondary-action {
  justify-self: start;
  margin-top: 0.35rem;
}

.candidate-partial-error {
  border-left: 2px solid currentColor;
  padding-left: 0.65rem;
}

.manual-delivery-fallback {
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.7rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.manual-delivery-fallback summary {
  cursor: pointer;
}

.manual-delivery-fields {
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  gap: 0.65rem;
  margin-top: 0.65rem;
}

.field-help {
  margin-top: 0.45rem;
  color: var(--text-muted);
  font-weight: 500;
}

.note-input {
  resize: vertical;
}

.primary-button {
  justify-self: start;
}

.primary-button:disabled,
.icon-button:disabled,
.submit-form-fields:disabled {
  cursor: not-allowed;
  opacity: 0.55;
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

.state strong {
  color: var(--text-strong);
  font-size: 0.9rem;
}

.state p {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.55;
}

.state small {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  line-height: 1.5;
}

.state-actions {
  display: flex;
  flex: none;
  align-items: center;
  gap: 0.55rem;
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

:global(html.dark) .status-active {
  background: rgba(14, 74, 55, 0.34);
  color: #a9d8c3;
}

:global(html.dark) .status-warn,
:global(html.dark) .priority-medium {
  background: rgba(120, 53, 15, 0.34);
  color: #fdba74;
}

:global(html.dark) .status-ok,
:global(html.dark) .priority-low {
  background: rgba(6, 78, 59, 0.42);
  color: #a7f3d0;
}

:global(html.dark) .priority-high {
  background: rgba(127, 29, 29, 0.36);
  color: #fecaca;
}

:global(html.dark) .action-row {
  border-color: #0a3427;
  background: rgba(10, 52, 39, 0.2);
}

:global(html.dark) .state-error {
  border-color: #7f1d1d;
  background: rgba(69, 10, 10, 0.28);
  color: #fecaca;
}

@media (max-width: 760px) {
  .maintenance-main {
    padding-top: 1.25rem;
  }

  .page-header,
  .task-head,
  .filter-bar,
  .state,
  .action-row {
    align-items: stretch;
    flex-direction: column;
  }

  .page-header .secondary-action,
  .action-row .primary-action,
  .state .secondary-action,
  .state .primary-action,
  .state-actions {
    width: 100%;
  }

  .state-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .field-label {
    width: 100%;
  }

  .task-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-facts div:not(:nth-child(3n + 1)) {
    border-left: 0;
  }

  .task-facts div:nth-child(n + 4) {
    border-top: 0;
  }

  .task-facts div:nth-child(even) {
    border-left: 1px solid var(--border-subtle);
  }

  .task-facts div:nth-child(n + 3) {
    border-top: 1px solid var(--border-subtle);
  }

  .manual-delivery-fields {
    grid-template-columns: 1fr;
  }

  .task-notes p {
    grid-template-columns: 1fr;
    gap: 0.2rem;
  }
}

@media (max-width: 420px) {
  .task-facts {
    grid-template-columns: 1fr;
  }

  .task-facts div:nth-child(even) {
    border-left: 0;
  }

  .task-facts div:nth-child(n + 2) {
    border-top: 1px solid var(--border-subtle);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }
}
</style>
