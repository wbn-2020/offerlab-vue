<template>
  <div class="admin-maintenance-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <header class="page-header">
        <div><p>频道维护</p><h1>维护任务治理</h1><span>将频道健康和内容问题协调为可审核的公开交付，不自动改变内容排序或作者身份。</span></div>
        <button type="button" class="icon-button" title="刷新维护任务队列" :disabled="loading" @click="load()"><RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" /></button>
      </header>
      <section class="layout">
        <aside class="create-panel">
          <h2>创建维护任务</h2>
          <form class="form-stack" @submit.prevent="create">
            <div class="field-group">
              <label class="field-label" for="maintenance-domain">领域</label>
              <select id="maintenance-domain" v-model="form.domain" class="field-control" required><option value="" disabled>请选择领域</option><option v-for="domain in domains" :key="domain.value" :value="domain.value">{{ domain.label }}</option></select>
            </div>
            <div class="field-group">
              <label class="field-label" for="maintenance-source-type">问题来源</label>
              <select id="maintenance-source-type" v-model="form.sourceType" class="field-control" required><option v-for="source in sources" :key="source" :value="source">{{ sourceLabel(source) }}</option></select>
            </div>
            <div class="field-group">
              <label class="field-label" for="maintenance-assignee">负责人 UID</label>
              <input id="maintenance-assignee" v-model.trim="form.assigneeUid" class="field-control" inputmode="numeric" maxlength="19" pattern="[1-9][0-9]*" required placeholder="负责人 UID">
            </div>
            <div class="field-group">
              <label class="field-label" for="maintenance-source-post">关联原帖子 ID（可选）</label>
              <input id="maintenance-source-post" v-model.trim="form.sourcePostId" class="field-control" inputmode="numeric" maxlength="19" pattern="[1-9][0-9]*" placeholder="关联原帖子 ID">
            </div>
            <div class="field-group">
              <label class="field-label" for="maintenance-source-ref">来源记录 ID（可选）</label>
              <input id="maintenance-source-ref" v-model.trim="form.sourceRefId" class="field-control" inputmode="numeric" maxlength="19" pattern="[1-9][0-9]*" placeholder="来源记录 ID">
            </div>
            <div class="field-group">
              <label class="field-label" for="maintenance-title">任务标题</label>
              <input id="maintenance-title" v-model="form.title" class="field-control" maxlength="160" required placeholder="任务标题">
            </div>
            <div class="field-group">
              <label class="field-label" for="maintenance-detail">任务说明</label>
              <textarea id="maintenance-detail" v-model="form.detail" class="field-control" rows="5" maxlength="2000" required placeholder="说明维护目标、公开边界与验收依据。"></textarea>
            </div>
            <button type="submit" class="primary-button" :disabled="isPending('create') || !canCreate">创建并分派</button>
          </form>
        </aside>
        <section class="queue-panel">
          <div class="queue-head">
            <div><h2>维护队列</h2><p>提交交付后由同一领域的治理人员审核；驳回会退回负责人继续处理。</p></div>
            <div class="filters"><select v-model.number="filterDomain" class="field-control compact" @change="load()"><option value="">全部领域</option><option v-for="domain in domains" :key="domain.value" :value="domain.value">{{ domain.label }}</option></select><select v-model="filterStatus" class="field-control compact" @change="load()"><option value="">全部状态</option><option v-for="item in statuses" :key="item" :value="item">{{ statusLabel(item) }}</option></select></div>
          </div>
          <div v-if="errorText && items.length === 0" class="state state-error">
            <p>{{ errorText }}</p>
            <button type="button" class="secondary-button" :disabled="loading" @click="load()">重试</button>
          </div>
          <div v-else-if="loading" class="state">正在读取维护队列</div>
          <div v-else-if="items.length === 0" class="state">当前筛选下没有维护任务。</div>
          <div v-else class="task-list">
            <article v-for="task in items" :key="String(task.id)" class="task-row">
              <div class="task-head"><div><div class="badge-line"><span :class="['status', statusClass(task.status)]">{{ statusLabel(task.status) }}</span><span :class="['priority', priorityClass(task.priority)]">{{ priorityLabel(task.priority) }}</span><span class="source">{{ phaseLabel(task.maintenancePhase) }}</span><span class="source">{{ sourceLabel(task.sourceType) }}</span><span class="source">领域 {{ task.domain }}</span></div><h3>{{ task.title }}</h3></div><RouterLink v-if="task.sourcePostId" :to="`/post/${task.sourcePostId}`" class="open-link">查看原内容</RouterLink></div>
              <p>{{ task.detail }}</p><small>任务 #{{ task.id }} · 负责人 {{ task.assigneeUid || '--' }} · 批次 {{ task.dispatchBatchId || '--' }} · 第 {{ task.currentAttemptNo }} 回合 · 更新于 {{ formatTime(task.updateTime) }}</small>
              <p :class="['due-meta', dueClass(task.dueAt)]">截止时间：{{ task.dueAt ? formatTime(task.dueAt) : '未设置' }}</p>
              <p v-if="task.terminalOutcomeCode" class="note">结案结果：{{ terminalOutcomeLabel(task.terminalOutcomeCode) }}</p>
              <p v-if="task.closeReasonCode" class="note">关闭原因：{{ closeReasonLabel(task.closeReasonCode) }}</p>
              <p v-if="task.deliveryNote" class="note">交付：{{ task.deliveryType }} #{{ task.deliveryRefId }} · {{ task.deliveryNote }}</p>
              <p v-if="task.reviewNote" class="note">治理说明：{{ task.reviewNote }}</p>
              <MaintenanceTaskReviewContextPanel :task-id="task.id" :context-key="`${task.status}:${task.updateTime}:${task.deliveryType || ''}:${task.deliveryRefId || ''}:${task.deliveryPostId || ''}`" />
              <MaintenanceTaskAttemptTimeline :task-id="task.id" :timeline-key="`${task.currentAttemptNo}:${task.status}:${task.updateTime}`" />
              <div v-if="task.canReassign" class="reassign-bar">
                <input v-model.trim="reassignDraft(task).replacementUid" class="field-control compact" inputmode="numeric" placeholder="接替者 UID" :disabled="isTaskMutationPending(task)">
                <input v-model.trim="reassignDraft(task).reason" class="field-control" maxlength="500" placeholder="说明转派原因" :disabled="isTaskMutationPending(task)">
                <button type="button" class="secondary-button compact-button" :disabled="isTaskMutationPending(task) || !canReassign(task)" @click="reassign(task)">{{ isTaskActionPending(task, 'reassign') ? '转派中' : '转派' }}</button>
              </div>
              <div v-if="task.canReview || task.canClose" class="review-bar">
                <textarea v-model.trim="reviewDraft(task).note" class="field-control review-note" rows="2" maxlength="1000" placeholder="审核或关闭说明" :disabled="isTaskMutationPending(task)"></textarea>
                <div v-if="task.canReview" class="decision-actions">
                  <select v-model="reviewDraft(task).approvalReasonCode" class="field-control compact" :disabled="isTaskMutationPending(task)"><option value="QUALITY_VERIFIED">质量已核验</option><option value="EVIDENCE_SUFFICIENT">公开依据充分</option></select>
                  <button type="button" class="primary-button compact-button" :disabled="isTaskMutationPending(task) || !canReview(task)" @click="review(task, 'APPROVED')">{{ isTaskActionPending(task, 'review-approved') ? '处理中' : '通过' }}</button>
                </div>
                <div v-if="task.canReview" class="decision-actions">
                  <select v-model="reviewDraft(task).rejectionReasonCode" class="field-control compact" :disabled="isTaskMutationPending(task)"><option value="CONTENT_INCOMPLETE">交付内容不完整</option><option value="PUBLIC_EVIDENCE_MISSING">缺少公开依据</option><option value="SCOPE_MISMATCH">交付范围不匹配</option><option value="OTHER">其他</option></select>
                  <button type="button" class="secondary-button compact-button" :disabled="isTaskMutationPending(task) || !canReview(task)" @click="review(task, 'REJECTED')">{{ isTaskActionPending(task, 'review-rejected') ? '处理中' : '退回' }}</button>
                </div>
                <div v-if="task.canClose" class="decision-actions">
                  <select v-model="reviewDraft(task).closeReasonCode" class="field-control compact" :disabled="isTaskMutationPending(task)"><option value="OUT_OF_SCOPE">不在维护范围内</option><option value="DUPLICATE">重复维护</option><option value="NO_LONGER_RELEVANT">不再相关</option><option value="AUTHOR_UNRESPONSIVE">维护者未响应</option><option value="OTHER">其他</option></select>
                  <button type="button" class="danger-button compact-button" :disabled="isTaskMutationPending(task) || !canClose(task)" @click="close(task)">{{ isTaskActionPending(task, 'close') ? '处理中' : '关闭' }}</button>
                </div>
              </div>
            </article>
          </div>
          <div v-if="loadMoreErrorText && items.length > 0" class="state state-error load-more-error">
            <p>{{ loadMoreErrorText }}</p>
            <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">重试加载更多</button>
          </div>
          <div v-else-if="hasMore && !loading" class="load-more-row">
            <button type="button" class="secondary-button" :disabled="loadingMore" @click="load(true)">
              {{ loadingMore ? '正在加载' : '加载更多' }}
            </button>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import MaintenanceTaskReviewContextPanel from '@/components/maintenance/MaintenanceTaskReviewContextPanel.vue'
import MaintenanceTaskAttemptTimeline from '@/components/maintenance/MaintenanceTaskAttemptTimeline.vue'
import { BizException, getErrorMessage } from '@/api/client'
import {
  contentMaintenanceApi,
  type ContentMaintenanceApprovalReasonCode,
  type ContentMaintenanceCloseReasonCode,
  ContentMaintenanceContractError,
  type ContentMaintenancePriority,
  type ContentMaintenanceRejectionReasonCode,
  type ContentMaintenanceTask,
  type ContentMaintenanceTerminalOutcomeCode,
  type MaintenancePhase,
  type MaintenanceStatus,
} from '@/api/contentMaintenance'
import { useAuthStore } from '@/stores/auth'
import {
  buildMaintenanceCreateCommand,
  MANUAL_MAINTENANCE_SOURCE_TYPES,
  normalizeMaintenanceTaskPrefill,
  normalizePositiveLongId,
  type MaintenanceTaskFormDraft,
} from '@/utils/maintenanceNavigation'

const domains = [{ value: 1, label: '科技数码' }, { value: 2, label: '职场经验' }, { value: 3, label: '阅读成长' }, { value: 4, label: '生活方式' }, { value: 5, label: '投资理财' }]
const sources = MANUAL_MAINTENANCE_SOURCE_TYPES
const statuses: MaintenanceStatus[] = ['OPEN', 'CLAIMED', 'SUBMITTED', 'COMPLETED', 'CLOSED']
const route = useRoute()
const authStore = useAuthStore()
const positive = (value: string) => Boolean(normalizePositiveLongId(value))
const prefill = normalizeMaintenanceTaskPrefill(route.query as Record<string, unknown>)
const form = reactive<MaintenanceTaskFormDraft>({
  ...prefill,
  assigneeUid: '',
})
const filterDomain = ref<number | ''>('')
const filterStatus = ref<MaintenanceStatus | ''>('')
const items = ref<ContentMaintenanceTask[]>([])
const reviewDrafts = reactive<Record<string, {
  note: string
  approvalReasonCode: ContentMaintenanceApprovalReasonCode
  rejectionReasonCode: ContentMaintenanceRejectionReasonCode
  closeReasonCode: ContentMaintenanceCloseReasonCode
}>>({})
const reassignments = reactive<Record<string, { replacementUid: string; reason: string }>>({})
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const pendingActions = reactive<Record<string, number>>({})
let maintenanceQueueRequestId = 0
let maintenanceAccountGeneration = 0
let maintenanceQueueController: AbortController | null = null
let maintenanceWriteRequestId = 0

interface MaintenanceQueueSnapshot {
  requestId: number
  requestedDomain: number | ''
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
const maintenanceAccountIsReady = () => authStore.isLoggedIn && Boolean(authStore.user?.uid)

const abortMaintenanceQueueLoad = () => {
  maintenanceQueueController?.abort()
  maintenanceQueueController = null
}

const clearRecord = (record: Record<string, unknown>) => {
  for (const key of Object.keys(record)) delete record[key]
}

const resetCreateForm = () => {
  Object.assign(form, {
    domain: '',
    sourceType: 'MANUAL',
    assigneeUid: '',
    sourcePostId: '',
    sourceRefId: '',
    title: '',
    detail: '',
  })
}

const clearMaintenanceQueueState = (clearDrafts = false) => {
  maintenanceQueueRequestId += 1
  maintenanceWriteRequestId += 1
  abortMaintenanceQueueLoad()
  loading.value = false
  loadingMore.value = false
  items.value = []
  nextCursor.value = null
  hasMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
  clearRecord(pendingActions)
  if (clearDrafts) {
    clearRecord(reviewDrafts)
    clearRecord(reassignments)
    resetCreateForm()
  }
}

const maintenanceQueueRequestIsCurrent = (snapshot: MaintenanceQueueSnapshot) => (
  snapshot.requestId === maintenanceQueueRequestId
  && snapshot.requestedDomain === filterDomain.value
  && snapshot.requestedStatus === filterStatus.value
  && snapshot.accountGeneration === maintenanceAccountGeneration
  && snapshot.accountKey === currentMaintenanceAccountKey()
  && snapshot.cursor === (snapshot.append ? nextCursor.value : null)
  && maintenanceQueueController === snapshot.controller
  && !snapshot.controller.signal.aborted
  && maintenanceAccountIsReady()
)

const isPending = (actionKey: string) => pendingActions[actionKey] != null
const taskActionKey = (task: ContentMaintenanceTask, action: string) => `${String(task.id)}:${action}`
const isTaskActionPending = (task: ContentMaintenanceTask, action: string) => (
  isPending(taskActionKey(task, action))
)
const isTaskMutationPending = (task: ContentMaintenanceTask) => (
  Object.keys(pendingActions).some((key) => key.startsWith(`${String(task.id)}:`))
)

const beginMaintenanceWrite = (actionKey: string): MaintenanceWriteSnapshot | null => {
  const separatorIndex = actionKey.indexOf(':')
  const taskId = separatorIndex > 0 ? actionKey.slice(0, separatorIndex) : null
  if (
    isPending(actionKey)
    || (taskId != null && Object.keys(pendingActions).some((key) => key.startsWith(`${taskId}:`)))
    || !maintenanceAccountIsReady()
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
  && maintenanceAccountIsReady()
)

const finishMaintenanceWrite = (snapshot: MaintenanceWriteSnapshot) => {
  if (pendingActions[snapshot.actionKey] === snapshot.requestId) {
    delete pendingActions[snapshot.actionKey]
  }
}

const isCanceledRequest = (error: unknown, signal: AbortSignal) => {
  if (signal.aborted) return true
  const candidate = error as { name?: unknown; code?: unknown } | null | undefined
  return candidate?.name === 'AbortError'
    || candidate?.name === 'CanceledError'
    || candidate?.code === 'ERR_CANCELED'
}

const createCommand = computed(() => buildMaintenanceCreateCommand(form))
const canCreate = computed(() => createCommand.value != null)
const reviewDraft = (task: ContentMaintenanceTask) => {
  const key = String(task.id)
  return reviewDrafts[key] || (reviewDrafts[key] = {
    note: '',
    approvalReasonCode: 'QUALITY_VERIFIED',
    rejectionReasonCode: 'CONTENT_INCOMPLETE',
    closeReasonCode: 'OUT_OF_SCOPE',
  })
}
const reassignDraft = (task: ContentMaintenanceTask) => {
  const key = String(task.id)
  return reassignments[key] || (reassignments[key] = { replacementUid: '', reason: '' })
}
const canReassign = (task: ContentMaintenanceTask) => {
  const draft = reassignDraft(task)
  return positive(draft.replacementUid) && draft.reason.length >= 2
}
const canReview = (task: ContentMaintenanceTask) => reviewDraft(task).note.length >= 2
const canClose = (task: ContentMaintenanceTask) => reviewDraft(task).note.length >= 2
const load = async (append = false) => {
  if (!maintenanceAccountIsReady()) return
  if (append && (!hasMore.value || loadingMore.value)) return
  const requestedDomain = filterDomain.value
  const requestedStatus = filterStatus.value
  const cursor = append ? nextCursor.value : null
  if (append && !cursor) return
  const accountKey = currentMaintenanceAccountKey()
  const accountGeneration = maintenanceAccountGeneration
  abortMaintenanceQueueLoad()
  const controller = new AbortController()
  const requestId = ++maintenanceQueueRequestId
  const snapshot: MaintenanceQueueSnapshot = {
    requestId,
    requestedDomain,
    requestedStatus,
    cursor,
    append,
    accountKey,
    accountGeneration,
    controller,
  }
  maintenanceQueueController = controller
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
    const res = await contentMaintenanceApi.queue({
      domain: requestedDomain || undefined,
      status: requestedStatus || undefined,
      cursor: cursor || 0,
      size: 50,
    }, {
      signal: controller.signal,
    })
    if (!maintenanceQueueRequestIsCurrent(snapshot)) return
    if (!res.data) throw new ContentMaintenanceContractError()
    const incoming = res.data.items
    items.value = append ? [...items.value, ...incoming] : incoming
    nextCursor.value = res.data.nextCursor
    hasMore.value = res.data.hasMore
  } catch (error) {
    if (isCanceledRequest(error, controller.signal) || !maintenanceQueueRequestIsCurrent(snapshot)) return
    const message = getErrorMessage(error, append ? '加载更多维护任务失败' : '维护队列暂时无法读取')
    if (append) loadMoreErrorText.value = message
    else errorText.value = message
  } finally {
    if (maintenanceQueueController === controller && requestId === maintenanceQueueRequestId) {
      if (append) loadingMore.value = false
      else loading.value = false
      maintenanceQueueController = null
    }
  }
}
const create = async () => {
  const command = createCommand.value
  if (!command) return
  const snapshot = beginMaintenanceWrite('create')
  if (!snapshot) return
  try {
    await contentMaintenanceApi.create(command)
    if (!maintenanceWriteIsCurrent(snapshot)) return
    resetCreateForm()
    toast.success('维护任务已创建')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    if (error instanceof BizException && error.code === 30001) {
      toast.error('该修订已有维护任务，请刷新候选')
      await load()
    } else {
      toast.error(getErrorMessage(error, '创建维护任务失败'))
    }
  } finally {
    finishMaintenanceWrite(snapshot)
  }
}
const review = async (task: ContentMaintenanceTask, decision: 'APPROVED' | 'REJECTED') => {
  if (!canReview(task)) return
  const snapshot = beginMaintenanceWrite(taskActionKey(
    task,
    decision === 'APPROVED' ? 'review-approved' : 'review-rejected',
  ))
  if (!snapshot) return
  const draft = reviewDraft(task)
  try {
    if (decision === 'APPROVED') {
      await contentMaintenanceApi.review(task.id, {
        decision: 'APPROVED',
        reasonCode: draft.approvalReasonCode,
        note: draft.note,
      })
    } else {
      await contentMaintenanceApi.review(task.id, {
        decision: 'REJECTED',
        reasonCode: draft.rejectionReasonCode,
        note: draft.note,
      })
    }
    if (!maintenanceWriteIsCurrent(snapshot)) return
    delete reviewDrafts[String(task.id)]
    toast.success(decision === 'APPROVED' ? '任务已完成' : '任务已退回负责人')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '审核维护任务失败'))
  } finally {
    finishMaintenanceWrite(snapshot)
  }
}
const reassign = async (task: ContentMaintenanceTask) => {
  const draft = reassignDraft(task)
  if (!canReassign(task)) return
  const snapshot = beginMaintenanceWrite(taskActionKey(task, 'reassign'))
  if (!snapshot) return
  try {
    await contentMaintenanceApi.reassign(task.id, {
      replacementUid: draft.replacementUid,
      reason: draft.reason,
    })
    if (!maintenanceWriteIsCurrent(snapshot)) return
    delete reassignments[String(task.id)]
    toast.success('维护任务已转派')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '转派维护任务失败'))
  } finally {
    finishMaintenanceWrite(snapshot)
  }
}
const close = async (task: ContentMaintenanceTask) => {
  if (!canClose(task)) return
  const snapshot = beginMaintenanceWrite(taskActionKey(task, 'close'))
  if (!snapshot) return
  const draft = reviewDraft(task)
  try {
    await contentMaintenanceApi.close(task.id, {
      reasonCode: draft.closeReasonCode,
      note: draft.note,
    })
    if (!maintenanceWriteIsCurrent(snapshot)) return
    delete reviewDrafts[String(task.id)]
    toast.success('任务已关闭')
    await load()
  } catch (error) {
    if (!maintenanceWriteIsCurrent(snapshot)) return
    toast.error(getErrorMessage(error, '关闭维护任务失败'))
  } finally {
    finishMaintenanceWrite(snapshot)
  }
}
const statusLabel = (value: MaintenanceStatus) => ({ OPEN: '待领取', CLAIMED: '处理中', SUBMITTED: '待审核', COMPLETED: '已完成', CLOSED: '已关闭' }[value])
const priorityLabel = (value: ContentMaintenancePriority) => ({ LOW: '低优先级', MEDIUM: '中优先级', HIGH: '高优先级' }[value])
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
const sourceLabel = (value: string) => ({ CHANNEL_HEALTH: '频道健康', SEARCH_GAP: '搜索缺口', SUGGESTION: '补充纠错', FRESHNESS: '时效确认', PROFILE_CONFIRMATION: '经验背景', QUESTION: '问题闭环', MANUAL: '人工创建' }[value] || value)
const statusClass = (value: MaintenanceStatus) => value === 'COMPLETED' ? 'status-ok' : value === 'SUBMITTED' ? 'status-warn' : value === 'CLOSED' ? 'status-muted' : 'status-active'
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
  () => form.domain,
  (domain, previousDomain) => {
    if (domain !== previousDomain) form.sourcePostId = ''
  },
)

watch(
  [() => authStore.user?.uid, () => authStore.token],
  ([uid, token], [previousUid, previousToken]) => {
    if (uid === previousUid && token === previousToken) return
    maintenanceAccountGeneration += 1
    clearMaintenanceQueueState(true)
    if (uid && token) void load()
  },
)

void load()

onBeforeUnmount(() => {
  clearMaintenanceQueueState()
})
</script>

<style scoped>
.admin-maintenance-page{background:rgb(248 250 252)}.page-header,.queue-head,.task-head,.review-bar,.reassign-bar{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.page-header{margin-bottom:1.25rem}.page-header p{margin:0;color:rgb(8 145 178);font-size:.75rem;font-weight:900}.page-header h1{margin:.2rem 0;color:rgb(15 23 42);font-size:1.5rem;font-weight:900}.page-header span{color:rgb(100 116 139);font-size:.85rem;line-height:1.55}.icon-button{display:inline-flex;width:2.5rem;height:2.5rem;align-items:center;justify-content:center;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white}.layout{display:grid;grid-template-columns:minmax(17rem,22rem) minmax(0,1fr);gap:1rem;align-items:start}.create-panel,.queue-panel{border:1px solid rgb(226 232 240);border-radius:.625rem;background:white;padding:1rem}.create-panel{position:sticky;top:5rem}.create-panel h2,.queue-head h2,.task-head h3{margin:0;color:rgb(15 23 42);font-size:1rem;font-weight:900}.queue-head p{margin:.3rem 0 0;color:rgb(100 116 139);font-size:.76rem;line-height:1.5}.form-stack{display:grid;gap:.65rem;margin-top:1rem}.field-group{display:grid;gap:.3rem}.field-label{color:rgb(51 65 85);font-size:.72rem;font-weight:800}.field-control{width:100%;min-width:0;border:1px solid rgb(203 213 225);border-radius:.5rem;background:white;padding:.58rem .65rem;color:rgb(15 23 42);font-size:.78rem}.filters{display:flex;flex-wrap:wrap;gap:.5rem}.compact{width:auto;min-width:8rem}.task-list{display:grid;gap:.75rem;margin-top:1rem}.task-row{border-top:1px solid rgb(226 232 240);padding-top:.85rem}.task-row:first-child{border-top:0;padding-top:0}.badge-line{display:flex;flex-wrap:wrap;gap:.4rem}.status,.source,.priority{display:inline-flex;border-radius:999px;padding:.2rem .5rem;font-size:.66rem;font-weight:900}.status-active{background:rgb(224 231 255);color:rgb(67 56 202)}.status-warn{background:rgb(254 243 199);color:rgb(146 64 14)}.status-ok{background:rgb(220 252 231);color:rgb(21 128 61)}.status-muted,.source{background:rgb(241 245 249);color:rgb(71 85 105)}.priority-high{background:rgb(254 226 226);color:rgb(185 28 28)}.priority-medium{background:rgb(254 243 199);color:rgb(146 64 14)}.priority-low{background:rgb(220 252 231);color:rgb(21 128 61)}.task-head h3{margin-top:.5rem}.task-row p,.task-row small{display:block;margin:.55rem 0 0;color:rgb(71 85 105);font-size:.78rem;line-height:1.55}.task-row small{color:rgb(100 116 139);font-size:.7rem}.due-meta{font-size:.72rem!important}.due-neutral{color:rgb(71 85 105)!important}.due-overdue{color:rgb(185 28 28)!important;font-weight:900}.open-link{color:rgb(8 145 178);font-size:.72rem;font-weight:800;white-space:nowrap}.note{border-left:2px solid rgb(125 211 252);padding-left:.6rem}.review-bar,.reassign-bar{align-items:center;margin-top:.75rem}.review-bar{display:grid;grid-template-columns:minmax(13rem,1fr) repeat(3,auto);align-items:end}.review-note{min-height:76px;resize:vertical}.decision-actions{display:flex;align-items:center;gap:.45rem}.review-bar .field-control,.reassign-bar .field-control:not(.compact){flex:1}.load-more-row{display:flex;justify-content:center;margin-top:1rem}.primary-button,.secondary-button,.danger-button{display:inline-flex;min-height:38px;align-items:center;justify-content:center;border-radius:.5rem;padding:.45rem .7rem;font-size:.76rem;font-weight:900}.primary-button{border:1px solid rgb(14 116 144);background:rgb(14 116 144);color:white}.secondary-button{border:1px solid rgb(203 213 225);background:white;color:rgb(51 65 85)}.danger-button{border:1px solid rgb(220 38 38);background:rgb(254 242 242);color:rgb(185 28 28)}button:disabled{cursor:not-allowed;opacity:.5}.state{border:1px dashed rgb(203 213 225);border-radius:.625rem;background:white;padding:2rem;color:rgb(100 116 139);text-align:center}.state p{margin:0}.state .secondary-button{margin-top:.75rem}.state-error{border-style:solid;border-color:rgb(254 202 202);color:rgb(185 28 28)}.load-more-error{margin-top:1rem;padding:1rem}@media(max-width:900px){.layout{grid-template-columns:1fr}.create-panel{position:static}.review-bar{grid-template-columns:1fr}.decision-actions{justify-content:space-between}}@media(max-width:650px){.page-header,.queue-head,.task-head,.reassign-bar{flex-direction:column}.compact{width:100%}.decision-actions{width:100%;flex-direction:column;align-items:stretch}}.dark .admin-maintenance-page{background:rgb(2 6 23)}.dark .create-panel,.dark .queue-panel,.dark .field-control,.dark .secondary-button,.dark .icon-button,.dark .state{border-color:rgb(51 65 85);background:rgb(15 23 42);color:rgb(203 213 225)}.dark .page-header h1,.dark .create-panel h2,.dark .queue-head h2,.dark .task-head h3{color:rgb(248 250 252)}.dark .page-header span,.dark .queue-head p,.dark .task-row p,.dark .task-row small,.dark .field-label{color:rgb(148 163 184)}.dark .task-row{border-color:rgb(51 65 85)}
</style>
