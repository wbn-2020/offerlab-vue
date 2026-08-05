<template>
  <div class="maintenance-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-5xl px-4 py-8">
      <header class="page-header">
        <div>
          <p>内容维护</p>
          <h1>我的维护任务</h1>
          <span>领取后提交公开内容交付，审核通过才会完成；这里不把维护行为换算成排名或积分。</span>
        </div>
        <button type="button" class="icon-button" title="刷新维护任务" :disabled="loading" @click="load()">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </header>

      <div class="filter-bar">
        <select v-model="status" class="field-control" aria-label="按状态筛选维护任务" @change="changeStatus">
          <option value="">全部状态</option>
          <option v-for="item in statuses" :key="item" :value="item">{{ statusLabel(item) }}</option>
        </select>
      </div>

      <div v-if="errorText && items.length === 0" class="state state-error">
        <p>{{ errorText }}</p>
        <button type="button" class="secondary-button" :disabled="loading" @click="load()">重试</button>
      </div>
      <div v-else-if="loading" class="state">正在读取维护任务</div>
      <div v-else-if="items.length === 0" class="state">当前没有分配给你的维护任务。</div>
      <section v-else class="task-list">
        <article v-for="task in items" :key="String(task.id)" class="task-row">
          <div class="task-head">
            <div>
              <div class="badge-line">
                <span :class="['status', statusClass(task.status)]">{{ statusLabel(task.status) }}</span>
                <span :class="['priority', priorityClass(task.priority)]">{{ priorityLabel(task.priority) }}</span>
                <span class="source">{{ phaseLabel(task.maintenancePhase) }}</span>
                <span class="source">{{ sourceLabel(task.sourceType) }}</span>
              </div>
              <h2>{{ task.title }}</h2>
            </div>
            <RouterLink v-if="task.sourcePostId" :to="`/post/${task.sourcePostId}`" class="open-link">查看原内容</RouterLink>
          </div>
          <p class="detail">{{ task.detail }}</p>
          <p class="meta">领域 {{ task.domain }} · 任务 #{{ task.id }} · 批次 {{ task.dispatchBatchId || '--' }} · 第 {{ task.currentAttemptNo }} 回合 · 更新于 {{ formatTime(task.updateTime) }}</p>
          <p :class="['due-meta', dueClass(task.dueAt)]">截止时间：{{ task.dueAt ? formatTime(task.dueAt) : '未设置' }}</p>
          <p v-if="task.terminalOutcomeCode" class="note">结案结果：{{ terminalOutcomeLabel(task.terminalOutcomeCode) }}</p>
          <p v-if="task.closeReasonCode" class="note">关闭原因：{{ closeReasonLabel(task.closeReasonCode) }}</p>
          <p v-if="task.reviewNote" class="note">治理说明：{{ task.reviewNote }}</p>
          <p v-if="task.deliveryNote" class="note">交付说明：{{ task.deliveryNote }}</p>
          <MaintenanceTaskReviewContextPanel
            :task-id="task.id"
            :context-key="`${task.status}:${task.updateTime}:${task.deliveryType || ''}:${task.deliveryRefId || ''}:${task.deliveryPostId || ''}`"
          />
          <MaintenanceTaskAttemptTimeline
            :task-id="task.id"
            :timeline-key="`${task.currentAttemptNo}:${task.status}:${task.updateTime}`"
          />

          <div v-if="task.canClaim" class="action-row">
            <button type="button" class="primary-button" :disabled="isTaskMutationPending(task)" @click="claim(task)">{{ isTaskActionPending(task, 'claim') ? '领取中' : '领取任务' }}</button>
          </div>

          <form v-if="task.canSubmit" class="submit-form" @submit.prevent="submit(task)">
            <fieldset class="submit-form-fields" :disabled="isTaskMutationPending(task)">
              <CollaborationDeliverySelector
                class="maintenance-delivery-selector"
                :model-value="selectedDeliveryCandidate(task)"
                :candidates="deliveryCandidates(task)"
                :preferred-candidate-id="suggestedDelivery(task)?.deliveryRefId"
                title="选择维护交付资源"
                description="关联资源会排在首位；提交时服务端仍会校验归属、公开状态和领域。"
                empty-description="当前任务没有可直接带入的关联资源，可在下方手动填写已发布资源 ID。"
                :show-filters="false"
                :show-create-action="false"
                @select="applyDeliveryCandidate(task, $event)"
              />
              <details class="manual-delivery-fallback" :open="!suggestedDelivery(task)">
                <summary>关联资源不适用时手动填写</summary>
                <div class="manual-delivery-fields">
                  <select v-model="draft(task).deliveryType" class="field-control">
                    <option value="POST">公开帖子</option>
                    <option value="QUESTION">公开问题</option>
                    <option value="SERIES">协作合集</option>
                  </select>
                  <input v-model.trim="draft(task).deliveryRefId" class="field-control" inputmode="numeric" placeholder="交付对象 ID">
                </div>
              </details>
              <textarea v-model.trim="draft(task).note" class="field-control note-input" rows="2" maxlength="1000" placeholder="说明本次更新解决了什么、还有哪些边界。" />
              <button type="submit" class="primary-button" :disabled="isTaskMutationPending(task) || !canSubmit(task)">{{ isTaskActionPending(task, 'submit') ? '提交中' : '提交治理审核' }}</button>
            </fieldset>
          </form>
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
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import CollaborationDeliverySelector from '@/components/collaboration/CollaborationDeliverySelector.vue'
import MaintenanceTaskReviewContextPanel from '@/components/maintenance/MaintenanceTaskReviewContextPanel.vue'
import MaintenanceTaskAttemptTimeline from '@/components/maintenance/MaintenanceTaskAttemptTimeline.vue'
import type { NeedDeliveryCandidate } from '@/api/collaboration'
import { getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import {
  contentMaintenanceApi,
  ContentMaintenanceContractError,
  type ContentMaintenanceCloseReasonCode,
  type ContentMaintenancePriority,
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
    else errorText.value = message
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
const priorityLabel = (value: ContentMaintenancePriority) => ({
  LOW: '低优先级',
  MEDIUM: '中优先级',
  HIGH: '高优先级',
}[value])
const priorityClass = (value: ContentMaintenancePriority) => (
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
    if (uid && token) void load()
  },
)

onMounted(() => {
  void load()
})

onBeforeUnmount(() => {
  clearMaintenanceState()
})
</script>

<style scoped>
.maintenance-page { background: rgb(248 250 252); }
.page-header,.task-head,.action-row { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; }
.page-header { margin-bottom:1.25rem; }.page-header p { margin:0;color:rgb(8 145 178);font-size:.75rem;font-weight:900; }
.page-header h1 { margin:.2rem 0;color:rgb(15 23 42);font-size:1.5rem;font-weight:900; }.page-header span { color:rgb(100 116 139);font-size:.85rem;line-height:1.55; }
.icon-button { display:inline-flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;color:rgb(51 65 85); }
.filter-bar { margin-bottom:1rem; }.field-control { width:100%;min-width:0;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.6rem .7rem;color:rgb(15 23 42);font-size:.8rem; }.filter-bar .field-control { width:auto;min-width:10rem; }
.task-list { display:grid;gap:.85rem; }.task-row { border:1px solid rgb(226 232 240);border-radius:.625rem;background:white;padding:1rem; }.badge-line { display:flex;flex-wrap:wrap;gap:.4rem; }.status,.source,.priority { display:inline-flex;border-radius:999px;padding:.2rem .5rem;font-size:.68rem;font-weight:900; }.status-active { background:rgb(224 231 255);color:rgb(67 56 202); }.status-warn { background:rgb(254 243 199);color:rgb(146 64 14); }.status-ok { background:rgb(220 252 231);color:rgb(21 128 61); }.status-muted,.source { background:rgb(241 245 249);color:rgb(71 85 105); }.priority-high { background:rgb(254 226 226);color:rgb(185 28 28); }.priority-medium { background:rgb(254 243 199);color:rgb(146 64 14); }.priority-low { background:rgb(220 252 231);color:rgb(21 128 61); }
.task-head h2 { margin:.55rem 0 0;color:rgb(15 23 42);font-size:1rem;font-weight:900; }.open-link { color:rgb(8 145 178);font-size:.76rem;font-weight:800;white-space:nowrap; }.detail,.note,.meta,.due-meta { margin:.7rem 0 0;color:rgb(71 85 105);font-size:.8rem;line-height:1.6; }.meta,.due-meta { color:rgb(100 116 139);font-size:.72rem; }.due-overdue { color:rgb(185 28 28);font-weight:900; }.note { border-left:2px solid rgb(125 211 252);padding-left:.65rem; }
.action-row { margin-top:.9rem;justify-content:flex-start; }.submit-form { margin-top:1rem;border-top:1px solid rgb(241 245 249);padding-top:1rem; }.submit-form-fields { display:grid;min-width:0;margin:0;padding:0;border:0;grid-template-columns:minmax(0,1fr) auto;gap:.65rem; }.maintenance-delivery-selector { grid-column:1 / -1;border:0;border-radius:0;background:transparent; }.manual-delivery-fallback { grid-column:1 / -1;color:rgb(100 116 139);font-size:.75rem;font-weight:800; }.manual-delivery-fallback summary { cursor:pointer; }.manual-delivery-fields { display:grid;grid-template-columns:10rem minmax(0,1fr);gap:.65rem;margin-top:.65rem; }.note-input { grid-column:1 / -1;resize:vertical; }.primary-button { display:inline-flex;min-height:38px;align-items:center;justify-content:center;border:1px solid rgb(8 145 178);border-radius:.5rem;background:rgb(8 145 178);padding:.5rem .75rem;color:white;font-size:.78rem;font-weight:900; }.primary-button:disabled,.icon-button:disabled,.submit-form-fields:disabled { cursor:not-allowed;opacity:.5; }
.load-more-row { display:flex;justify-content:center;margin-top:1rem; }.secondary-button { display:inline-flex;min-height:38px;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.5rem .85rem;color:rgb(51 65 85);font-size:.78rem;font-weight:900; }.secondary-button:disabled { cursor:not-allowed;opacity:.5; }
.state { border:1px dashed rgb(203 213 225);border-radius:.625rem;background:white;padding:2rem;color:rgb(100 116 139);text-align:center; }.state p { margin:0; }.state .secondary-button { margin-top:.75rem; }.state-error { border-style:solid;border-color:rgb(254 202 202);color:rgb(185 28 28); }.load-more-error { margin-top:1rem;padding:1rem; }
@media (max-width:720px) { .page-header,.task-head { flex-direction:column; }.submit-form,.manual-delivery-fields { grid-template-columns:1fr; }.note-input { grid-column:auto; } }
.dark .maintenance-page { background:rgb(2 6 23); }.dark .task-row,.dark .field-control,.dark .icon-button,.dark .secondary-button,.dark .state { border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(203 213 225); }.dark .page-header h1,.dark .task-head h2 { color:rgb(248 250 252); }.dark .page-header span,.dark .detail,.dark .meta { color:rgb(148 163 184); }.dark .submit-form { border-color:rgb(51 65 85); }
</style>
