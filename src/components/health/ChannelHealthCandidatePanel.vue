<template>
  <section class="candidate-panel" aria-labelledby="channel-quality-candidates-heading">
    <header class="panel-header">
      <div>
        <p>内容改进复核</p>
        <h2 id="channel-quality-candidates-heading">修订复核候选</h2>
      </div>
      <div class="panel-controls">
        <label class="domain-picker">
          <span>频道</span>
          <select v-model.number="selectedDomain" :disabled="loading || batchSubmitting || domains.length === 0">
            <option v-for="domain in domains" :key="domain.domain" :value="domain.domain">
              {{ domain.domainName }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="icon-button"
          title="刷新修订复核候选"
          :disabled="loading || loadingMore || batchSubmitting || selectedDomain == null"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </header>

    <p class="panel-caption">仅展示当前可公开复核的内容；选择 1 至 20 条待处理候选后可一次性派发维护批次。</p>

    <div class="panel-filters">
      <label class="lifecycle-picker">
        <span>生命周期</span>
        <select v-model="lifecycleFilter" :disabled="batchSubmitting || (loading && page.items.length === 0)">
          <option v-for="option in lifecycleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <span v-if="page.available" class="filter-summary">
        已选 {{ selectedCandidates.length }} / 20 条 · 当前显示 {{ filteredItems.length }} / {{ page.items.length }} 条
      </span>
    </div>

    <div v-if="domains.length === 0" class="state">当前账户没有可治理的频道。</div>
    <div v-else-if="errorText" class="state state-error">
      <span>{{ errorText }}</span>
      <button type="button" class="retry-button" :disabled="loading || loadingMore" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="state">正在读取修订复核候选</div>
    <div v-else-if="!page.available" class="state state-error">
      <span>候选暂时无法读取，批次派发已关闭。</span>
      <button type="button" class="retry-button" @click="load">重试</button>
    </div>
    <template v-else>
      <section v-if="selectedCandidates.length > 0" class="batch-form" aria-labelledby="channel-quality-batch-form-heading">
        <div class="batch-form-header">
          <div>
            <p>候选批次派发</p>
            <h3 id="channel-quality-batch-form-heading">派发 {{ selectedCandidates.length }} 条维护任务</h3>
          </div>
          <button
            type="button"
            class="text-action"
            :disabled="batchSubmitting"
            @click="clearBatchSelection"
          >
            清空选择
          </button>
        </div>
        <div class="batch-fields">
          <label class="batch-field batch-name-field">
            <span>批次名称</span>
            <input
              v-model="batchName"
              type="text"
              maxlength="120"
              autocomplete="off"
              :disabled="batchSubmitting"
              placeholder="例如：8 月第一周质量回访"
            >
          </label>
          <label class="batch-field">
            <span>负责人 UID</span>
            <input
              v-model="batchAssigneeUid"
              type="text"
              inputmode="numeric"
              pattern="[1-9][0-9]*"
              autocomplete="off"
              :disabled="batchSubmitting"
              placeholder="正整数 UID"
            >
          </label>
          <label class="batch-field">
            <span>优先级</span>
            <select v-model="batchPriority" :disabled="batchSubmitting">
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
          <label class="batch-field">
            <span>完成时限</span>
            <select v-model.number="batchDueInDays" :disabled="batchSubmitting">
              <option v-for="days in dueInDaysOptions" :key="days" :value="days">{{ days }} 天</option>
            </select>
          </label>
        </div>
        <div class="batch-submit-row">
          <span v-if="batchErrorText" class="batch-error">{{ batchErrorText }}</span>
          <button
            type="button"
            class="batch-create-button"
            :disabled="!canSubmitBatch"
            @click="submitBatch"
          >
            {{ batchSubmitting ? '正在派发' : `派发 ${selectedCandidates.length} 条任务` }}
          </button>
        </div>
      </section>

      <p v-if="page.suppressedCount > 0" class="suppressed-notice">
        部分候选因当前不可公开已隐藏（{{ page.suppressedCount }} 条）。
      </p>
      <div v-if="filteredItems.length === 0" class="state">
        {{ page.items.length === 0 ? '当前治理范围没有候选。' : '当前筛选下没有候选。' }}
      </div>
      <div v-else class="candidate-list">
        <article
          v-for="candidate in filteredItems"
          :key="candidateKey(candidate)"
          class="candidate-row"
          :aria-busy="isCandidatePending(candidate)"
        >
          <div class="candidate-main">
            <div class="candidate-title">
              <label
                v-if="canSelectCandidate(candidate)"
                class="candidate-select"
                :title="isSelected(candidate) ? '取消选择候选' : '选择候选加入维护批次'"
              >
                <input
                  type="checkbox"
                  :checked="isSelected(candidate)"
                  :disabled="isCandidatePending(candidate) || (!isSelected(candidate) && selectionLimitReached)"
                  @change="toggleCandidateSelection(candidate)"
                >
                <span>选择</span>
              </label>
              <h3>{{ candidate.title }}</h3>
              <span :class="['candidate-status', candidateStatusClass(candidate)]">
                {{ candidateStatusLabel(candidate) }}
              </span>
            </div>
            <p>{{ candidate.detail }}</p>
            <p v-if="candidate.lifecycleState === 'TASK_EXISTS'" class="candidate-disposition-meta">
              任务状态：{{ maintenanceStatusLabel(candidate.maintenanceStatus) }}
              <template v-if="candidate.maintenancePhase">
                · 维护阶段：{{ maintenancePhaseLabel(candidate.maintenancePhase) }}
              </template>
              <template v-if="candidate.terminalOutcome">
                · 结案结果：{{ terminalOutcomeLabel(candidate.terminalOutcome) }}
              </template>
            </p>
            <p v-else-if="candidate.lifecycleState === 'DISMISSED'" class="candidate-disposition-meta">
              已忽略原因：{{ dispositionReasonLabel(candidate.dispositionReasonCode) }}
            </p>
            <p v-else-if="candidate.lifecycleState === 'SNOOZED'" class="candidate-disposition-meta">
              延后到期：{{ formatSnoozedUntil(candidate.snoozedUntil) }}
            </p>
          </div>
          <div class="candidate-actions">
            <RouterLink :to="candidate.postHref" class="post-link">查看公开内容</RouterLink>
            <template v-if="candidate.lifecycleState === 'READY'">
              <div class="disposition-controls">
                <div class="disposition-fields">
                  <label class="disposition-field">
                    <span>处置原因</span>
                    <select
                      :value="selectedDispositionReason(candidate)"
                      :disabled="isCandidatePending(candidate)"
                      @change="setDispositionReason(candidate, $event)"
                    >
                      <option v-for="option in dispositionReasonOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </label>
                  <label class="disposition-field">
                    <span>延后天数</span>
                    <select
                      :value="selectedSnoozeDays(candidate)"
                      :disabled="isCandidatePending(candidate)"
                      @change="setSnoozeDays(candidate, $event)"
                    >
                      <option v-for="days in snoozeDayOptions" :key="days" :value="days">
                        {{ days }} 天
                      </option>
                    </select>
                  </label>
                </div>
                <div class="disposition-actions">
                  <button
                    type="button"
                    class="secondary-action"
                    :disabled="isCandidatePending(candidate)"
                    @click="disposeCandidate(candidate, 'DISMISS')"
                  >
                    {{ isCandidatePending(candidate) ? '处置中' : '忽略' }}
                  </button>
                  <button
                    type="button"
                    class="secondary-action"
                    :disabled="isCandidatePending(candidate)"
                    @click="disposeCandidate(candidate, 'SNOOZE')"
                  >
                    {{ isCandidatePending(candidate) ? '处置中' : '延后' }}
                  </button>
                </div>
              </div>
            </template>
            <template v-else-if="candidate.lifecycleState === 'TASK_EXISTS'">
              <span class="action-state">该候选已由维护任务接管。</span>
            </template>
            <template v-else-if="candidate.lifecycleState === 'DISMISSED' || candidate.lifecycleState === 'SNOOZED'">
              <button
                type="button"
                class="secondary-action"
                :disabled="isCandidatePending(candidate)"
                @click="disposeCandidate(candidate, 'RESTORE')"
              >
                {{ isCandidatePending(candidate) ? '恢复中' : '恢复' }}
              </button>
            </template>
            <span v-else class="action-state">内容已产生新修订，请重新读取候选。</span>
          </div>
        </article>
      </div>
      <div v-if="loadMoreErrorText" class="load-more-error">
        <span>{{ loadMoreErrorText }}</span>
        <button type="button" class="retry-button" :disabled="loadingMore" @click="loadMore">重试</button>
      </div>
      <button
        v-if="page.nextCursor"
        type="button"
        class="load-more-button"
        :disabled="loading || loadingMore || batchSubmitting"
        @click="loadMore"
      >
        {{ loadingMore ? '正在读取' : '加载更多' }}
      </button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import {
  channelHealthCandidatesApi,
  isChannelHealthCandidateDispositionReasonCode,
  unavailableChannelHealthReviewCandidatePage,
  type ChannelHealthCandidateDispositionReasonCode,
  type ChannelHealthCandidateMaintenancePhase,
  type ChannelHealthCandidateTerminalOutcomeCode,
  type ChannelHealthReviewCandidate,
  type ChannelHealthReviewCandidatePage,
} from '@/api/channelHealthCandidates'
import {
  channelHealthReviewBatchesApi,
  isChannelHealthReviewBatchDueInDays,
  type ChannelHealthReviewBatchDueInDays,
  type ChannelHealthReviewBatchPriority,
} from '@/api/channelHealthReviewBatches'
import type { ChannelHealth } from '@/api/channelHealth'

const MAX_SELECTED_CANDIDATES = 20

const props = defineProps<{
  refreshKey?: number
  channels: ChannelHealth[]
  canCreateGlobally: boolean
  moderatedDomains: number[]
}>()

const emit = defineEmits<{
  'batch-created': []
}>()

type LifecycleFilter = 'ALL' | 'READY' | 'TASK_EXISTS' | 'DISPOSED'
type DispositionAction = 'DISMISS' | 'SNOOZE' | 'RESTORE'

const selectedDomain = ref<number | null>(null)
const page = ref<ChannelHealthReviewCandidatePage>(unavailableChannelHealthReviewCandidatePage())
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')
const lifecycleFilter = ref<LifecycleFilter>('ALL')
const dispositionReasonByCandidate = ref<Record<string, ChannelHealthCandidateDispositionReasonCode>>({})
const snoozeDaysByCandidate = ref<Record<string, number>>({})
const pendingDispositionKeys = ref<Record<string, boolean>>({})
const selectedCandidateKeys = ref<string[]>([])
const batchName = ref('')
const batchAssigneeUid = ref('')
const batchPriority = ref<ChannelHealthReviewBatchPriority>('MEDIUM')
const batchDueInDays = ref<ChannelHealthReviewBatchDueInDays>(7)
const batchSubmitting = ref(false)
const batchErrorText = ref('')
let requestVersion = 0

const lifecycleOptions: Array<{ value: LifecycleFilter; label: string }> = [
  { value: 'ALL', label: '全部' },
  { value: 'READY', label: '待处理' },
  { value: 'TASK_EXISTS', label: '已有任务' },
  { value: 'DISPOSED', label: '已处置' },
]

const dispositionReasonOptions: Array<{
  value: ChannelHealthCandidateDispositionReasonCode
  label: string
}> = [
  { value: 'NOT_ACTIONABLE', label: '暂不具备行动价值' },
  { value: 'OUT_OF_SCOPE', label: '超出治理范围' },
  { value: 'DUPLICATE', label: '重复候选' },
  { value: 'WAIT_FOR_AUTHOR', label: '等待作者处理' },
]

const priorityOptions: Array<{ value: ChannelHealthReviewBatchPriority; label: string }> = [
  { value: 'HIGH', label: '高' },
  { value: 'MEDIUM', label: '中' },
  { value: 'LOW', label: '低' },
]

const snoozeDayOptions = [1, 3, 7, 14, 30]
const dueInDaysOptions: ChannelHealthReviewBatchDueInDays[] = [1, 3, 7, 14, 30]

const domains = computed(() => props.channels
  .filter((channel) => (
    Number.isInteger(channel.domain)
    && channel.domain >= 1
    && channel.domain <= 5
    && (props.canCreateGlobally || props.moderatedDomains.includes(channel.domain))
  ))
  .map((channel) => ({
    domain: channel.domain,
    domainName: channel.domainName,
  })))

const filteredItems = computed(() => page.value.items.filter((candidate) => {
  if (lifecycleFilter.value === 'ALL') return true
  if (lifecycleFilter.value === 'DISPOSED') {
    return candidate.lifecycleState === 'DISMISSED' || candidate.lifecycleState === 'SNOOZED'
  }
  return candidate.lifecycleState === lifecycleFilter.value
}))

const selectedCandidates = computed(() => page.value.items.filter((candidate) => (
  selectedCandidateKeys.value.includes(candidateKey(candidate))
  && canSelectCandidate(candidate)
)))

const selectionLimitReached = computed(() => selectedCandidates.value.length >= MAX_SELECTED_CANDIDATES)

const canSubmitBatch = computed(() => (
  !batchSubmitting.value
  && selectedDomain.value != null
  && selectedCandidates.value.length >= 1
  && selectedCandidates.value.length <= MAX_SELECTED_CANDIDATES
  && selectedCandidates.value.every((candidate) => (
    pendingDispositionKeys.value[candidateKey(candidate)] !== true
  ))
  && batchName.value.trim().length >= 2
  && batchName.value.trim().length <= 120
  && /^[1-9]\d*$/.test(batchAssigneeUid.value.trim())
  && isChannelHealthReviewBatchDueInDays(batchDueInDays.value)
))

const ensureSelectedDomain = () => {
  if (selectedDomain.value != null && domains.value.some((item) => item.domain === selectedDomain.value)) return
  selectedDomain.value = domains.value[0]?.domain ?? null
}

const resetPage = () => {
  page.value = unavailableChannelHealthReviewCandidatePage()
  loadingMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
}

const resetDispositionState = () => {
  dispositionReasonByCandidate.value = {}
  snoozeDaysByCandidate.value = {}
  pendingDispositionKeys.value = {}
}

const resetDispositionDrafts = () => {
  dispositionReasonByCandidate.value = {}
  snoozeDaysByCandidate.value = {}
}

const hasPositiveId = (
  value: ChannelHealthReviewCandidate['sourceRefId'],
): value is Exclude<ChannelHealthReviewCandidate['sourceRefId'], null> => (
  value != null && /^[1-9]\d*$/.test(String(value))
)

const candidateKey = (candidate: ChannelHealthReviewCandidate) => (
  `${String(candidate.sourcePostId)}:${String(candidate.sourceRefId)}`
)

const canSelectCandidate = (candidate: ChannelHealthReviewCandidate) => (
  candidate.lifecycleState === 'READY'
  && candidate.actionable === true
  && hasPositiveId(candidate.sourceRefId)
)

const isSelected = (candidate: ChannelHealthReviewCandidate) => (
  selectedCandidateKeys.value.includes(candidateKey(candidate))
)

const isCandidatePending = (candidate: ChannelHealthReviewCandidate) => (
  pendingDispositionKeys.value[candidateKey(candidate)] === true
  || batchSubmitting.value
)

const canDisposeCandidate = (candidate: ChannelHealthReviewCandidate) => (
  (candidate.lifecycleState === 'READY'
    || candidate.lifecycleState === 'DISMISSED'
    || candidate.lifecycleState === 'SNOOZED')
  && hasPositiveId(candidate.sourceRefId)
)

const clearBatchSelection = () => {
  if (batchSubmitting.value) return
  selectedCandidateKeys.value = []
  batchErrorText.value = ''
}

const reconcileBatchSelection = () => {
  const validKeys = new Set(page.value.items
    .filter(canSelectCandidate)
    .map(candidateKey))
  selectedCandidateKeys.value = selectedCandidateKeys.value
    .filter((key) => validKeys.has(key))
    .slice(0, MAX_SELECTED_CANDIDATES)
}

const toggleCandidateSelection = (candidate: ChannelHealthReviewCandidate) => {
  if (!canSelectCandidate(candidate) || isCandidatePending(candidate)) return
  const key = candidateKey(candidate)
  if (isSelected(candidate)) {
    selectedCandidateKeys.value = selectedCandidateKeys.value.filter((selectedKey) => selectedKey !== key)
    batchErrorText.value = ''
    return
  }
  if (selectionLimitReached.value) {
    toast.error('一个维护批次最多派发 20 条候选')
    return
  }
  selectedCandidateKeys.value = [...selectedCandidateKeys.value, key]
  batchErrorText.value = ''
}

const selectedDispositionReason = (candidate: ChannelHealthReviewCandidate) => (
  dispositionReasonByCandidate.value[candidateKey(candidate)] || dispositionReasonOptions[0].value
)

const selectedSnoozeDays = (candidate: ChannelHealthReviewCandidate) => (
  snoozeDaysByCandidate.value[candidateKey(candidate)] || 7
)

const setDispositionReason = (candidate: ChannelHealthReviewCandidate, event: Event) => {
  const value = (event.target as HTMLSelectElement).value
  if (!isChannelHealthCandidateDispositionReasonCode(value)) return
  dispositionReasonByCandidate.value = {
    ...dispositionReasonByCandidate.value,
    [candidateKey(candidate)]: value,
  }
}

const setSnoozeDays = (candidate: ChannelHealthReviewCandidate, event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value)
  if (!Number.isSafeInteger(value) || value < 1 || value > 30) return
  snoozeDaysByCandidate.value = {
    ...snoozeDaysByCandidate.value,
    [candidateKey(candidate)]: value,
  }
}

const maintenanceStatusLabel = (status: ChannelHealthReviewCandidate['maintenanceStatus']) => {
  const labels: Record<NonNullable<ChannelHealthReviewCandidate['maintenanceStatus']>, string> = {
    OPEN: '开放',
    CLAIMED: '已领取',
    SUBMITTED: '待复核',
    COMPLETED: '已完成',
    CLOSED: '已关闭',
  }
  return status == null ? '状态不可用' : labels[status]
}

const maintenancePhaseLabel = (phase: ChannelHealthCandidateMaintenancePhase) => {
  const labels: Record<ChannelHealthCandidateMaintenancePhase, string> = {
    OPEN: '待领取',
    IN_PROGRESS: '处理中',
    REWORK: '返工中',
    REVIEW_PENDING: '待复核',
    VERIFIED_DELIVERY: '已验证交付',
    CLOSED: '已关闭',
  }
  return labels[phase]
}

const terminalOutcomeLabel = (outcome: ChannelHealthCandidateTerminalOutcomeCode) => (
  outcome === 'VERIFIED_DELIVERY' ? '已验证交付' : outcome
)

const dispositionReasonLabel = (
  reasonCode: ChannelHealthReviewCandidate['dispositionReasonCode'],
) => {
  if (!reasonCode) return '原因不可用'
  return dispositionReasonOptions.find((option) => option.value === reasonCode)?.label || reasonCode
}

const formatSnoozedUntil = (value: string | null) => {
  if (!value) return '到期时间不可用'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-CN', { hour12: false })
}

const candidateStatusLabel = (candidate: ChannelHealthReviewCandidate) => {
  if (candidate.lifecycleState === 'TASK_EXISTS') return '已有维护任务'
  if (candidate.lifecycleState === 'REVISION_STALE') return '修订已变化'
  if (candidate.lifecycleState === 'DISMISSED') return '已忽略'
  if (candidate.lifecycleState === 'SNOOZED') return '已延后'
  return '可派发'
}

const candidateStatusClass = (candidate: ChannelHealthReviewCandidate) => (
  candidate.lifecycleState === 'READY'
    ? 'candidate-status-ready'
    : candidate.lifecycleState === 'TASK_EXISTS'
      ? 'candidate-status-task'
      : candidate.lifecycleState === 'DISMISSED'
        ? 'candidate-status-dismissed'
        : candidate.lifecycleState === 'SNOOZED'
          ? 'candidate-status-snoozed'
          : 'candidate-status-stale'
)

const dispositionSuccessMessage = (action: DispositionAction) => {
  if (action === 'DISMISS') return '候选已忽略'
  if (action === 'SNOOZE') return '候选已延后'
  return '候选已恢复'
}

const dispositionFailureMessage = (action: DispositionAction) => {
  if (action === 'DISMISS') return '忽略候选失败'
  if (action === 'SNOOZE') return '延后候选失败'
  return '恢复候选失败'
}

const clearDispositionStateForKey = (key: string) => {
  const nextReasons = { ...dispositionReasonByCandidate.value }
  const nextSnoozeDays = { ...snoozeDaysByCandidate.value }
  delete nextReasons[key]
  delete nextSnoozeDays[key]
  dispositionReasonByCandidate.value = nextReasons
  snoozeDaysByCandidate.value = nextSnoozeDays
}

const disposeCandidate = async (
  candidate: ChannelHealthReviewCandidate,
  action: DispositionAction,
) => {
  if (!canDisposeCandidate(candidate) || isCandidatePending(candidate)) return
  const sourceRefId = candidate.sourceRefId
  if (!hasPositiveId(sourceRefId)) return
  const key = candidateKey(candidate)
  pendingDispositionKeys.value = {
    ...pendingDispositionKeys.value,
    [key]: true,
  }
  try {
    const response = action === 'DISMISS'
      ? await channelHealthCandidatesApi.dispose({
        domain: candidate.domain,
        sourcePostId: candidate.sourcePostId,
        sourceRefId,
        action,
        reasonCode: selectedDispositionReason(candidate),
        snoozeDays: null,
      })
      : action === 'SNOOZE'
        ? await channelHealthCandidatesApi.dispose({
          domain: candidate.domain,
          sourcePostId: candidate.sourcePostId,
          sourceRefId,
          action,
          reasonCode: selectedDispositionReason(candidate),
          snoozeDays: selectedSnoozeDays(candidate),
        })
        : await channelHealthCandidatesApi.dispose({
          domain: candidate.domain,
          sourcePostId: candidate.sourcePostId,
          sourceRefId,
          action,
        })
    if (!response.data) throw new Error('候选处置结果不可用')
    toast.success(dispositionSuccessMessage(action))
    await load()
    clearDispositionStateForKey(key)
  } catch (error) {
    toast.error(getErrorMessage(error, dispositionFailureMessage(action)))
  } finally {
    const nextPendingKeys = { ...pendingDispositionKeys.value }
    delete nextPendingKeys[key]
    pendingDispositionKeys.value = nextPendingKeys
  }
}

const submitBatch = async () => {
  const domain = selectedDomain.value
  const candidates = selectedCandidates.value
  if (!canSubmitBatch.value || domain == null || batchSubmitting.value) return
  batchSubmitting.value = true
  batchErrorText.value = ''
  try {
    const response = await channelHealthReviewBatchesApi.create({
      domain,
      name: batchName.value.trim(),
      assigneeUid: batchAssigneeUid.value.trim(),
      priority: batchPriority.value,
      dueInDays: batchDueInDays.value,
      candidates: candidates.map((candidate) => ({
        sourcePostId: candidate.sourcePostId,
        sourceRefId: candidate.sourceRefId!,
      })),
    })
    if (!response.data) throw new Error('维护批次结果不可用')
    emit('batch-created')
    selectedCandidateKeys.value = []
    batchErrorText.value = ''
    batchName.value = ''
    toast.success(`已派发 ${response.data.candidateCount} 条维护任务`)
    await load()
  } catch (error) {
    batchErrorText.value = getErrorMessage(error, '维护批次派发失败')
    toast.error(batchErrorText.value)
  } finally {
    batchSubmitting.value = false
  }
}

const load = async () => {
  ensureSelectedDomain()
  const domain = selectedDomain.value
  const version = ++requestVersion
  resetPage()
  resetDispositionDrafts()
  if (domain == null) {
    clearBatchSelection()
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await channelHealthCandidatesApi.list({ domain, size: 10 })
    if (version !== requestVersion) return
    const nextPage = response.data || unavailableChannelHealthReviewCandidatePage()
    page.value = nextPage
    if (nextPage.available) {
      reconcileBatchSelection()
    } else {
      clearBatchSelection()
    }
  } catch (error) {
    if (version !== requestVersion) return
    page.value = unavailableChannelHealthReviewCandidatePage()
    clearBatchSelection()
    errorText.value = getErrorMessage(error, '候选暂时无法读取')
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

const loadMore = async () => {
  const domain = selectedDomain.value
  const cursor = page.value.nextCursor
  if (domain == null || cursor == null || loading.value || loadingMore.value || batchSubmitting.value) return
  const version = ++requestVersion
  loadingMore.value = true
  loadMoreErrorText.value = ''
  try {
    const response = await channelHealthCandidatesApi.list({ domain, cursor, size: 10 })
    if (version !== requestVersion) return
    const nextPage = response.data || unavailableChannelHealthReviewCandidatePage()
    if (!nextPage.available) {
      page.value = unavailableChannelHealthReviewCandidatePage()
      clearBatchSelection()
      return
    }
    const seen = new Set(page.value.items.map((item) => String(item.sourcePostId)))
    const nextItems = nextPage.items.filter((item) => !seen.has(String(item.sourcePostId)))
    if (nextItems.length !== nextPage.items.length) {
      page.value = unavailableChannelHealthReviewCandidatePage()
      clearBatchSelection()
      return
    }
    page.value = {
      available: true,
      items: [...page.value.items, ...nextItems],
      nextCursor: nextPage.nextCursor,
      suppressedCount: page.value.suppressedCount + nextPage.suppressedCount,
    }
    reconcileBatchSelection()
  } catch (error) {
    if (version !== requestVersion) return
    loadMoreErrorText.value = getErrorMessage(error, '候选暂时无法读取')
  } finally {
    if (version === requestVersion) loadingMore.value = false
  }
}

watch(domains, () => {
  ensureSelectedDomain()
}, { immediate: true })

watch(selectedDomain, (domain, previousDomain) => {
  if (domain === previousDomain) return
  resetPage()
  resetDispositionState()
  clearBatchSelection()
  if (domain == null) {
    requestVersion += 1
    loading.value = false
    return
  }
  void load()
}, { immediate: true })

watch(() => props.refreshKey, (value, previousValue) => {
  if (value == null || value === previousValue) return
  if (batchSubmitting.value) return
  void load()
})
</script>

<style scoped>
.candidate-panel { border: 1px solid var(--border-subtle); border-radius: .625rem; background: white; padding: 1.15rem; }
.panel-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.panel-header p, .batch-form-header p { margin: 0; color: rgb(26 127 90); font-size: .75rem; font-weight: 800; }
.panel-header h2, .batch-form-header h3 { margin: .25rem 0 0; color: var(--text-strong); font-size: 1rem; font-weight: 900; }
.panel-controls { display: flex; align-items: flex-end; gap: .5rem; }
.domain-picker, .lifecycle-picker, .batch-field, .disposition-field { display: grid; gap: .25rem; color: var(--text-muted); font-size: .68rem; font-weight: 800; }
.domain-picker select, .lifecycle-picker select, .batch-field input, .batch-field select, .disposition-field select { min-width: 0; border: 1px solid var(--border-subtle); border-radius: .5rem; background: white; color: var(--text-strong); font-size: .75rem; padding: .45rem .55rem; }
.domain-picker select { min-width: 9rem; }
.icon-button { display: inline-flex; height: 2.25rem; width: 2.25rem; align-items: center; justify-content: center; border: 1px solid var(--border-subtle); border-radius: .5rem; background: white; color: var(--text-primary); }
.icon-button:disabled, .load-more-button:disabled, .retry-button:disabled, .secondary-action:disabled, .batch-create-button:disabled, .text-action:disabled { cursor: not-allowed; opacity: .55; }
.panel-caption { margin: .75rem 0 0; color: var(--text-muted); font-size: .75rem; line-height: 1.55; }
.panel-filters { display: flex; align-items: flex-end; justify-content: space-between; gap: .75rem; margin-top: .85rem; }
.lifecycle-picker { min-width: 10rem; }
.filter-summary { color: var(--text-muted); font-size: .7rem; font-weight: 800; }
.state { display: flex; align-items: center; justify-content: center; gap: .75rem; margin-top: .85rem; border: 1px dashed var(--border-subtle); border-radius: .5rem; background: var(--surface-soft); padding: 1.2rem; color: var(--text-muted); font-size: .8rem; text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.batch-form { margin-top: .85rem; border: 1px solid rgb(169 216 195); border-radius: .5rem; background: rgb(232 243 237); padding: .85rem; }
.batch-form-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.text-action { min-height: 28px; border: 0; background: transparent; color: rgb(18 99 74); font-size: .7rem; font-weight: 800; }
.batch-fields { display: grid; grid-template-columns: minmax(12rem, 2fr) repeat(3, minmax(7rem, 1fr)); gap: .6rem; margin-top: .75rem; }
.batch-name-field { min-width: 0; }
.batch-submit-row { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-top: .75rem; }
.batch-error { color: rgb(185 28 28); font-size: .7rem; font-weight: 800; line-height: 1.4; }
.batch-create-button { min-height: 34px; flex: none; border: 1px solid rgb(26 127 90); border-radius: .5rem; background: rgb(26 127 90); padding: .4rem .7rem; color: white; font-size: .72rem; font-weight: 900; }
.suppressed-notice { margin: .85rem 0 0; border: 1px solid var(--border-subtle); border-radius: .5rem; background: var(--surface-soft); padding: .55rem .7rem; color: var(--text-muted); font-size: .72rem; line-height: 1.45; }
.retry-button, .load-more-button, .post-link, .secondary-action { min-height: 32px; border: 1px solid var(--border-subtle); border-radius: .5rem; background: white; padding: .35rem .55rem; color: var(--text-primary); font-size: .72rem; font-weight: 800; }
.candidate-list { display: grid; gap: .65rem; margin-top: .85rem; }
.candidate-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; border-top: 1px solid var(--border-subtle); padding-top: .75rem; }
.candidate-main { min-width: 0; }
.candidate-title { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
.candidate-title h3 { overflow: hidden; margin: 0; color: var(--text-strong); font-size: .85rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.candidate-select { display: inline-flex; align-items: center; gap: .25rem; color: rgb(18 99 74); font-size: .66rem; font-weight: 900; }
.candidate-select input { accent-color: rgb(26 127 90); }
.candidate-status { border-radius: 999px; padding: .18rem .45rem; font-size: .65rem; font-weight: 800; }
.candidate-status-ready { background: rgb(220 252 231); color: rgb(21 128 61); }
.candidate-status-task { background: rgb(224 242 254); color: rgb(3 105 161); }
.candidate-status-stale { background: rgb(254 243 199); color: rgb(146 64 14); }
.candidate-status-dismissed { background: var(--surface-soft); color: var(--text-primary); }
.candidate-status-snoozed { background: rgb(205 232 220); color: rgb(18 99 74); }
.candidate-main p { margin: .35rem 0 0; color: var(--text-muted); font-size: .75rem; line-height: 1.5; }
.candidate-disposition-meta { color: var(--text-primary) !important; font-weight: 800; }
.candidate-actions { display: flex; flex: none; align-items: center; gap: .45rem; }
.action-state { max-width: 15rem; color: var(--text-muted); font-size: .7rem; font-weight: 800; line-height: 1.4; text-align: right; }
.post-link { display: inline-flex; align-items: center; text-decoration: none; }
.secondary-action { display: inline-flex; align-items: center; justify-content: center; }
.disposition-controls { display: grid; gap: .45rem; }
.disposition-fields, .disposition-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: .4rem; }
.disposition-field { font-size: .62rem; }
.disposition-field select { min-height: 30px; border-radius: .45rem; font-size: .68rem; padding: .3rem .4rem; }
.load-more-button { display: block; margin-top: .85rem; }
.load-more-error { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .85rem; color: rgb(185 28 28); font-size: .72rem; }
@media (max-width: 850px) {
  .batch-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .batch-name-field { grid-column: span 2; }
}
@media (max-width: 700px) {
  .panel-header, .candidate-row, .batch-submit-row { align-items: stretch; flex-direction: column; }
  .panel-controls { justify-content: space-between; }
  .panel-filters { align-items: stretch; flex-direction: column; }
  .filter-summary { align-self: flex-start; }
  .batch-fields { grid-template-columns: minmax(0, 1fr); }
  .batch-name-field { grid-column: auto; }
  .candidate-actions { align-items: stretch; flex-direction: column; }
  .disposition-fields, .disposition-actions { justify-content: flex-start; }
  .action-state { max-width: none; text-align: left; }
  .batch-create-button { width: 100%; }
}
.dark .candidate-panel { border-color: var(--border-subtle); background: var(--surface-1); }
.dark .panel-header h2, .dark .batch-form-header h3, .dark .candidate-title h3 { color: var(--text-strong); }
.dark .domain-picker, .dark .panel-caption, .dark .state, .dark .candidate-main p, .dark .lifecycle-picker, .dark .filter-summary, .dark .batch-field, .dark .disposition-field { color: var(--text-muted); }
.dark .domain-picker select, .dark .lifecycle-picker select, .dark .batch-field input, .dark .batch-field select, .dark .icon-button, .dark .retry-button, .dark .load-more-button, .dark .post-link, .dark .secondary-action, .dark .disposition-field select { border-color: var(--border-subtle); background: var(--surface-1); color: var(--text-muted); }
.dark .state { border-color: var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 55%, transparent); }
.dark .state-error { border-color: rgb(127 29 29); color: rgb(252 165 165); }
.dark .batch-form { border-color: rgb(18 99 74); background: rgb(7 31 24); }
.dark .text-action, .dark .candidate-select { color: rgb(124 195 165); }
.dark .batch-error { color: rgb(252 165 165); }
.dark .suppressed-notice { border-color: var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 55%, transparent); color: var(--text-muted); }
.dark .candidate-status-task { background: rgb(7 89 133); color: rgb(186 230 253); }
.dark .candidate-status-stale { background: rgb(120 53 15); color: rgb(253 230 138); }
.dark .candidate-status-dismissed { background: var(--surface-1); color: var(--text-muted); }
.dark .candidate-status-snoozed { background: rgb(10 52 39); color: rgb(205 232 220); }
.dark .candidate-disposition-meta { color: var(--text-muted) !important; }
.dark .action-state { color: var(--text-muted); }
.dark .load-more-error { color: rgb(252 165 165); }
.dark .candidate-row { border-color: var(--border-subtle); }
</style>
