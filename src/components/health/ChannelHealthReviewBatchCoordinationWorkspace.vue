<template>
  <section class="coordination-workspace" aria-labelledby="channel-quality-batch-coordination-heading">
    <header class="workspace-header">
      <div>
        <p>批次协调</p>
        <h4 id="channel-quality-batch-coordination-heading">执行处置</h4>
      </div>
      <button type="button" class="refresh-button" :disabled="loading || pendingAction != null" @click="reloadRemoteState">
        {{ loading ? '读取中' : '刷新' }}
      </button>
    </header>

    <div v-if="errorText" class="workspace-state workspace-state-error">
      <span>{{ errorText }}</span>
      <button type="button" class="retry-button" :disabled="loading || pendingAction != null" @click="reloadRemoteState">
        重试
      </button>
    </div>
    <div v-else-if="loading" class="workspace-state">正在读取批次协调状态</div>
    <template v-else-if="coordination">
      <div class="coordination-summary">
        <span>原始截止 {{ formatTime(coordination.dueAt) }}</span>
        <span>有效截止 {{ formatTime(coordination.effectiveDueAt) }}</span>
        <span>开放 {{ coordination.openTaskCount }}</span>
        <span>活动 {{ coordination.activeTaskCount }}</span>
        <span>可改派 {{ coordination.reassignableTaskCount }}</span>
        <span>协调版本 {{ coordination.coordinationVersion }}</span>
      </div>

      <section class="coordination-tasks" aria-labelledby="channel-quality-batch-current-tasks-heading">
        <div class="task-section-header">
          <div>
            <p>当前任务</p>
            <h5 id="channel-quality-batch-current-tasks-heading">任务负责人</h5>
          </div>
        </div>
        <div class="coordination-task-list">
          <article v-for="task in coordination.tasks" :key="task.taskId" class="coordination-task-row">
            <div>
              <div class="task-title">
                <strong>{{ task.title }}</strong>
                <span :class="['task-status', `task-status-${task.status.toLowerCase()}`]">
                  {{ taskStatusLabel(task.status) }}
                </span>
              </div>
              <p>
                任务 #{{ task.taskId }} · 当前负责人 UID：{{ task.assigneeUid }} · 截止 {{ formatTime(task.dueAt) }}
              </p>
            </div>
            <span class="task-capability">
              {{ task.canWithdraw ? '可撤回' : task.canReassign ? '可改派' : '保持原状态' }}
            </span>
          </article>
        </div>
      </section>

      <p v-if="actionSuccessText" class="action-feedback action-feedback-success">{{ actionSuccessText }}</p>
      <p v-if="actionErrorText" class="action-feedback action-feedback-error">{{ actionErrorText }}</p>

      <div class="action-grid">
        <form class="action-form" @submit.prevent="extendDeadline">
          <div class="action-form-header">
            <h5>延长有效截止</h5>
            <span v-if="!coordination.canExtendDueAt">当前没有可延期的截止时间</span>
          </div>
          <label>
            <span>延长天数</span>
            <select v-model.number="extendByDays" :disabled="pendingAction != null || !coordination.canExtendDueAt">
              <option v-for="days in extendByDaysOptions" :key="days" :value="days">延长 {{ days }} 天</option>
            </select>
          </label>
          <label>
            <span>协调说明</span>
            <textarea
              v-model="extendNote"
              rows="3"
              maxlength="500"
              :disabled="pendingAction != null || !coordination.canExtendDueAt"
              required
            ></textarea>
          </label>
          <button type="submit" :disabled="pendingAction != null || !coordination.canExtendDueAt">
            {{ pendingAction === 'extend' ? '提交中' : '确认延期' }}
          </button>
        </form>

        <form class="action-form" @submit.prevent="reassignActiveTasks">
          <div class="action-form-header">
            <h5>批量改派活动任务</h5>
            <span v-if="!coordination.canBulkReassign">当前没有可改派任务</span>
          </div>
          <label>
            <span>新负责人 UID</span>
            <input
              v-model.trim="replacementUid"
              inputmode="numeric"
              maxlength="19"
              pattern="[1-9][0-9]*"
              :disabled="pendingAction != null || !coordination.canBulkReassign"
              required
            />
          </label>
          <label>
            <span>协调说明</span>
            <textarea
              v-model="reassignNote"
              rows="3"
              maxlength="500"
              :disabled="pendingAction != null || !coordination.canBulkReassign"
              required
            ></textarea>
          </label>
          <button type="submit" :disabled="pendingAction != null || !coordination.canBulkReassign">
            {{ pendingAction === 'reassign' ? '提交中' : '确认批量改派' }}
          </button>
        </form>

        <form class="action-form" @submit.prevent="addRiskNote">
          <div class="action-form-header">
            <h5>记录风险说明</h5>
            <span v-if="!coordination.canAddRiskNote">当前不可记录</span>
          </div>
          <label>
            <span>风险类型</span>
            <select v-model="riskCode" :disabled="pendingAction != null || !coordination.canAddRiskNote">
              <option v-for="option in riskOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label>
            <span>风险说明</span>
            <textarea
              v-model="riskNote"
              rows="3"
              maxlength="500"
              :disabled="pendingAction != null || !coordination.canAddRiskNote"
              required
            ></textarea>
          </label>
          <button type="submit" :disabled="pendingAction != null || !coordination.canAddRiskNote">
            {{ pendingAction === 'risk' ? '提交中' : '确认记录' }}
          </button>
        </form>

        <form class="action-form action-form-withdraw" @submit.prevent="withdrawOpenTasks">
          <div class="action-form-header">
            <h5>撤回开放任务</h5>
            <span v-if="!coordination.canWithdrawOpenTasks">当前没有开放任务</span>
          </div>
          <label>
            <span>撤回原因</span>
            <select v-model="withdrawReasonCode" :disabled="pendingAction != null || !coordination.canWithdrawOpenTasks">
              <option v-for="option in withdrawReasonOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label>
            <span>协调说明</span>
            <textarea
              v-model="withdrawNote"
              rows="3"
              maxlength="500"
              :disabled="pendingAction != null || !coordination.canWithdrawOpenTasks"
              required
            ></textarea>
          </label>
          <label class="confirm-check">
            <input
              v-model="withdrawConfirmed"
              type="checkbox"
              :disabled="pendingAction != null || !coordination.canWithdrawOpenTasks"
            />
            <span>确认撤回 {{ coordination.openTaskCount }} 条开放任务</span>
          </label>
          <button
            type="submit"
            :disabled="pendingAction != null || !coordination.canWithdrawOpenTasks || !withdrawConfirmed"
          >
            {{ pendingAction === 'withdraw' ? '提交中' : '确认撤回开放任务' }}
          </button>
        </form>
      </div>

      <ChannelHealthReviewBatchEventTimeline ref="eventTimeline" :batch-id="batchId" />
    </template>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { getErrorMessage } from '@/api/client'
import {
  channelHealthReviewBatchesApi,
  type ChannelHealthReviewBatchCoordination,
  type ChannelHealthReviewBatchExtendByDays,
  type ChannelHealthReviewBatchRiskCode,
  type ChannelHealthReviewBatchTaskStatus,
  type ChannelHealthReviewBatchWithdrawReasonCode,
} from '@/api/channelHealthReviewBatches'
import type { ApiId } from '@/api/types'
import ChannelHealthReviewBatchEventTimeline from './ChannelHealthReviewBatchEventTimeline.vue'

type PendingAction = 'extend' | 'reassign' | 'risk' | 'withdraw'

type EventTimelineExposed = {
  reloadFirstPage: () => Promise<void>
}

const props = defineProps<{
  batchId: ApiId
}>()

const emit = defineEmits<{
  coordinated: [batchId: ApiId]
}>()

const extendByDaysOptions: ChannelHealthReviewBatchExtendByDays[] = [1, 3, 7, 14, 30]
const riskOptions: Array<{ value: ChannelHealthReviewBatchRiskCode; label: string }> = [
  { value: 'BLOCKER', label: '阻塞问题' },
  { value: 'CAPACITY_RISK', label: '容量风险' },
  { value: 'REVIEW_DELAY', label: '复核延迟' },
  { value: 'OVERDUE_ESCALATION', label: '逾期升级' },
]
const withdrawReasonOptions: Array<{ value: ChannelHealthReviewBatchWithdrawReasonCode; label: string }> = [
  { value: 'SCOPE_INVALID', label: '范围无效' },
  { value: 'DUPLICATE_SCOPE', label: '范围重复' },
  { value: 'PRIORITY_REPLACED', label: '优先级调整' },
  { value: 'OTHER', label: '其他原因' },
]

const coordination = ref<ChannelHealthReviewBatchCoordination | null>(null)
const loading = ref(false)
const errorText = ref('')
const pendingAction = ref<PendingAction | null>(null)
const actionErrorText = ref('')
const actionSuccessText = ref('')
const eventTimeline = ref<EventTimelineExposed | null>(null)
const extendByDays = ref<ChannelHealthReviewBatchExtendByDays>(3)
const extendNote = ref('')
const replacementUid = ref('')
const reassignNote = ref('')
const riskCode = ref<ChannelHealthReviewBatchRiskCode>('BLOCKER')
const riskNote = ref('')
const withdrawReasonCode = ref<ChannelHealthReviewBatchWithdrawReasonCode>('SCOPE_INVALID')
const withdrawNote = ref('')
const withdrawConfirmed = ref(false)
let coordinationRequestVersion = 0

const formatTime = (value: string | null) => {
  if (value == null) return '未设置'
  if (value.endsWith('Z')) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN', { hour12: false })
  }
  return value.replace('T', ' ').replace(/(\.\d{1,9})?Z?$/, '')
}

const taskStatusLabel = (status: ChannelHealthReviewBatchTaskStatus) => ({
  OPEN: '开放',
  CLAIMED: '已领取',
  SUBMITTED: '待复核',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
})[status]

const loadCoordination = async () => {
  const version = ++coordinationRequestVersion
  loading.value = true
  errorText.value = ''
  try {
    const response = await channelHealthReviewBatchesApi.coordination(props.batchId)
    if (version !== coordinationRequestVersion) return
    coordination.value = response.data
  } catch (error) {
    if (version !== coordinationRequestVersion) return
    coordination.value = null
    errorText.value = getErrorMessage(error, '批次协调状态暂时无法读取')
  } finally {
    if (version === coordinationRequestVersion) loading.value = false
  }
}

const reloadRemoteState = async () => {
  await loadCoordination()
  await nextTick()
  await eventTimeline.value?.reloadFirstPage()
}

const resetActionFeedback = () => {
  actionErrorText.value = ''
  actionSuccessText.value = ''
}

const executeWrite = async (
  action: PendingAction,
  successText: string,
  request: () => Promise<unknown>,
) => {
  if (pendingAction.value != null || !coordination.value) return
  pendingAction.value = action
  resetActionFeedback()
  try {
    const result = await request() as { data?: unknown }
    if (result.data == null) throw new Error('批次协调写入未返回可信远端状态')
    await reloadRemoteState()
    actionSuccessText.value = successText
    emit('coordinated', props.batchId)
  } catch (error) {
    actionErrorText.value = getErrorMessage(error, '批次协调操作未完成，请刷新后重试')
  } finally {
    pendingAction.value = null
  }
}

const extendDeadline = async () => {
  const current = coordination.value
  if (!current || !current.canExtendDueAt) return
  await executeWrite('extend', '有效截止时间已按服务端状态刷新', () => (
    channelHealthReviewBatchesApi.extendDeadline(props.batchId, {
      expectedCoordinationVersion: current.coordinationVersion,
      extendByDays: extendByDays.value,
      note: extendNote.value,
    })
  ))
}

const reassignActiveTasks = async () => {
  const current = coordination.value
  if (!current || !current.canBulkReassign) return
  await executeWrite('reassign', '活动任务改派结果已按服务端状态刷新', () => (
    channelHealthReviewBatchesApi.reassignActiveTasks(props.batchId, {
      expectedCoordinationVersion: current.coordinationVersion,
      replacementUid: replacementUid.value,
      note: reassignNote.value,
    })
  ))
}

const addRiskNote = async () => {
  const current = coordination.value
  if (!current || !current.canAddRiskNote) return
  await executeWrite('risk', '风险说明已按服务端状态刷新', () => (
    channelHealthReviewBatchesApi.addRiskNote(props.batchId, {
      expectedCoordinationVersion: current.coordinationVersion,
      riskCode: riskCode.value,
      note: riskNote.value,
    })
  ))
}

const withdrawOpenTasks = async () => {
  const current = coordination.value
  if (!current || !current.canWithdrawOpenTasks || !withdrawConfirmed.value) return
  await executeWrite('withdraw', '开放任务撤回结果已按服务端状态刷新', () => (
    channelHealthReviewBatchesApi.withdrawOpenTasks(props.batchId, {
      expectedCoordinationVersion: current.coordinationVersion,
      expectedOpenTaskCount: current.openTaskCount,
      expectedActiveTaskCount: current.activeTaskCount,
      reasonCode: withdrawReasonCode.value,
      note: withdrawNote.value,
    })
  ))
}

watch(() => String(props.batchId), () => {
  resetActionFeedback()
  withdrawConfirmed.value = false
  void reloadRemoteState()
}, { immediate: true })

defineExpose({
  reloadRemoteState,
})
</script>

<style scoped>
.coordination-workspace { margin-top: 1rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.workspace-header, .task-section-header, .action-form-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.workspace-header p, .task-section-header p { margin: 0; color: rgb(8 145 178); font-size: .7rem; font-weight: 800; }
.workspace-header h4, .task-section-header h5, .action-form-header h5 { margin: .2rem 0 0; color: rgb(15 23 42); font-size: .86rem; font-weight: 900; }
.refresh-button, .retry-button, .action-form button { min-height: 30px; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .3rem .55rem; color: rgb(51 65 85); font-size: .7rem; font-weight: 800; }
.refresh-button:disabled, .retry-button:disabled, .action-form button:disabled { cursor: not-allowed; opacity: .55; }
.workspace-state { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .75rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; background: rgb(248 250 252); padding: .95rem; color: rgb(100 116 139); font-size: .74rem; text-align: center; }
.workspace-state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.coordination-summary { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .75rem; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: rgb(248 250 252); padding: .65rem; }
.coordination-summary span { color: rgb(71 85 105); font-size: .67rem; font-weight: 800; }
.coordination-tasks { margin-top: .9rem; }
.coordination-task-list { display: grid; gap: .5rem; margin-top: .6rem; }
.coordination-task-row { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; border-top: 1px solid rgb(241 245 249); padding-top: .6rem; }
.task-title { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; }
.task-title strong { color: rgb(15 23 42); font-size: .75rem; font-weight: 900; }
.coordination-task-row p { margin: .28rem 0 0; color: rgb(100 116 139); font-size: .69rem; line-height: 1.5; }
.task-status, .task-capability { border-radius: 999px; padding: .18rem .42rem; font-size: .62rem; font-weight: 900; }
.task-status-open { background: rgb(254 243 199); color: rgb(146 64 14); }
.task-status-claimed { background: rgb(224 242 254); color: rgb(3 105 161); }
.task-status-submitted { background: rgb(224 231 255); color: rgb(67 56 202); }
.task-status-completed { background: rgb(220 252 231); color: rgb(21 128 61); }
.task-status-closed, .task-capability { background: rgb(241 245 249); color: rgb(71 85 105); }
.action-feedback { margin: .85rem 0 0; border-radius: .5rem; padding: .55rem .65rem; font-size: .72rem; font-weight: 700; }
.action-feedback-success { background: rgb(220 252 231); color: rgb(21 128 61); }
.action-feedback-error { background: rgb(254 226 226); color: rgb(185 28 28); }
.action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; margin-top: .9rem; }
.action-form { display: grid; gap: .55rem; border-top: 1px solid rgb(226 232 240); padding-top: .75rem; }
.action-form-header span { color: rgb(146 64 14); font-size: .66rem; font-weight: 700; text-align: right; }
.action-form label { display: grid; gap: .28rem; color: rgb(71 85 105); font-size: .67rem; font-weight: 800; }
.action-form select, .action-form input, .action-form textarea { width: 100%; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; padding: .42rem .5rem; color: rgb(15 23 42); font-size: .72rem; line-height: 1.45; }
.action-form textarea { resize: vertical; }
.action-form button { justify-self: start; border-color: rgb(8 145 178); color: rgb(14 116 144); }
.action-form-withdraw button { border-color: rgb(185 28 28); color: rgb(185 28 28); }
.confirm-check { display: flex !important; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: .45rem !important; }
.confirm-check input { width: auto; }
@media (max-width: 760px) {
  .action-grid { grid-template-columns: 1fr; }
  .coordination-task-row { flex-direction: column; }
}
.dark .coordination-workspace, .dark .coordination-task-row, .dark .action-form { border-color: rgb(30 41 59); }
.dark .workspace-header h4, .dark .task-section-header h5, .dark .action-form-header h5, .dark .task-title strong { color: rgb(248 250 252); }
.dark .refresh-button, .dark .retry-button, .dark .action-form select, .dark .action-form input, .dark .action-form textarea { border-color: rgb(51 65 85); background: rgb(2 6 23); color: rgb(203 213 225); }
.dark .workspace-state, .dark .coordination-summary { border-color: rgb(51 65 85); background: rgb(2 6 23 / .55); color: rgb(148 163 184); }
.dark .workspace-state-error { border-color: rgb(127 29 29); color: rgb(252 165 165); }
.dark .coordination-summary span, .dark .coordination-task-row p, .dark .action-form label { color: rgb(148 163 184); }
.dark .task-capability { background: rgb(30 41 59); color: rgb(203 213 225); }
.dark .action-form-header span { color: rgb(253 230 138); }
.dark .action-feedback-success { background: rgb(20 83 45); color: rgb(187 247 208); }
.dark .action-feedback-error { background: rgb(127 29 29); color: rgb(254 202 202); }
.dark .action-form button { color: rgb(103 232 249); }
.dark .action-form-withdraw button { color: rgb(252 165 165); }
</style>
