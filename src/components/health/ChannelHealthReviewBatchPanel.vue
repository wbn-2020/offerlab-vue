<template>
  <section class="batch-panel" aria-labelledby="channel-quality-batches-heading">
    <header class="panel-header">
      <div>
        <p>维护执行</p>
        <h2 id="channel-quality-batches-heading">已派发批次</h2>
      </div>
      <div class="panel-controls">
        <label class="domain-picker">
          <span>频道</span>
          <select v-model.number="selectedDomain" :disabled="loading || domains.length === 0">
            <option v-for="domain in domains" :key="domain.domain" :value="domain.domain">
              {{ domain.domainName }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="icon-button"
          title="刷新维护批次"
          :disabled="loading || loadingMore || selectedDomain == null"
          @click="load"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </header>

    <p class="panel-caption">批次状态按关联维护任务实时聚合；截止风险只用于人工排程，不触发自动改派或关闭。</p>

    <div v-if="domains.length === 0" class="state">当前账户没有可读取维护批次的频道。</div>
    <div v-else-if="errorText" class="state state-error">
      <span>{{ errorText }}</span>
      <button type="button" class="retry-button" :disabled="loading || loadingMore" @click="load">重试</button>
    </div>
    <div v-else-if="loading" class="state">正在读取维护批次</div>
    <div v-else-if="!page.available" class="state state-error">
      <span>维护批次暂时不可用，详情交互已关闭。</span>
      <button type="button" class="retry-button" @click="load">重试</button>
    </div>
    <template v-else>
      <div v-if="page.items.length === 0" class="state">当前频道还没有已派发的维护批次。</div>
      <div v-else class="batch-list">
        <article
          v-for="batch in page.items"
          :key="batch.id"
          :class="['batch-row', { 'batch-row-selected': selectedBatchId === String(batch.id) }]"
        >
          <button
            type="button"
            class="batch-main"
            :disabled="detailLoading && selectedBatchId === String(batch.id)"
            @click="loadDetail(batch.id)"
          >
            <div class="batch-title">
              <h3>{{ batch.name }}</h3>
              <span :class="['priority', `priority-${batch.priority.toLowerCase()}`]">
                {{ priorityLabel(batch.priority) }}优先级
              </span>
            </div>
            <p>派发负责人 UID：{{ batch.assigneeUid }} · {{ batch.candidateCount }} 条任务 · 截止 {{ formatDueAt(batch.dueAt) }}</p>
            <div class="batch-meta">
              <span :class="['progress-state', `progress-${batch.progressState.toLowerCase()}`]">
                {{ progressStateLabel(batch.progressState) }}
              </span>
              <span :class="['due-state', `due-${batch.dueState.toLowerCase()}`]">
                {{ dueStateLabel(batch.dueState) }}
              </span>
            </div>
            <div class="status-counts" aria-label="任务状态分布">
              <span>开放 {{ taskStatusCounts(batch).OPEN }}</span>
              <span>已领取 {{ taskStatusCounts(batch).CLAIMED }}</span>
              <span>待复核 {{ taskStatusCounts(batch).SUBMITTED }}</span>
              <span>完成 {{ taskStatusCounts(batch).COMPLETED }}</span>
              <span>关闭 {{ taskStatusCounts(batch).CLOSED }}</span>
            </div>
          </button>
          <button
            type="button"
            class="detail-button"
            :disabled="detailLoading && selectedBatchId === String(batch.id)"
            @click="loadDetail(batch.id)"
          >
            {{ detailLoading && selectedBatchId === String(batch.id) ? '读取中' : '查看任务' }}
          </button>
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
        :disabled="loading || loadingMore || detailLoading"
        @click="loadMore"
      >
        {{ loadingMore ? '正在读取' : '加载更多' }}
      </button>

      <section v-if="selectedBatchId" class="batch-detail" aria-labelledby="channel-quality-batch-detail-heading">
        <div class="detail-header">
          <div>
            <p>批次详情</p>
            <h3 id="channel-quality-batch-detail-heading">{{ detail?.name || '维护批次' }}</h3>
          </div>
          <button type="button" class="text-action" :disabled="detailLoading" @click="closeDetail">关闭详情</button>
        </div>
        <div v-if="detailLoading" class="detail-state">正在读取关联任务</div>
        <div v-else-if="detailErrorText" class="detail-state detail-state-error">
          <span>{{ detailErrorText }}</span>
          <button type="button" class="retry-button" @click="retryDetail">重试</button>
        </div>
        <template v-else-if="detail">
          <div class="detail-summary">
            <span>{{ progressStateLabel(detail.progressState) }}</span>
            <span>{{ dueStateLabel(detail.dueState) }}</span>
            <span>{{ priorityLabel(detail.priority) }}优先级</span>
            <span>截止 {{ formatDueAt(detail.dueAt) }}</span>
          </div>
          <div class="task-list">
            <article v-for="item in detail.tasks" :key="item.taskId" class="task-row">
              <div class="task-main">
                <div class="task-title">
                  <h4>{{ item.title }}</h4>
                  <span :class="['task-status', `task-status-${item.status.toLowerCase()}`]">
                    {{ taskStatusLabel(item.status) }}
                  </span>
                </div>
                <p>
                  任务 #{{ item.taskId }} · 维护阶段 {{ maintenancePhaseLabel(item.maintenancePhase) }}
                  <template v-if="item.terminalOutcome"> · 结案结果 {{ terminalOutcomeLabel(item.terminalOutcome) }}</template>
                </p>
              </div>
              <RouterLink :to="item.postHref" class="post-link">查看公开内容</RouterLink>
            </article>
          </div>
          <ChannelHealthReviewBatchCoordinationWorkspace
            :batch-id="detail.id"
            @coordinated="handleCoordinationChanged"
          />
        </template>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  channelHealthReviewBatchesApi,
  unavailableChannelHealthReviewBatchPage,
  type ChannelHealthReviewBatchDetail,
  type ChannelHealthReviewBatchDueState,
  type ChannelHealthReviewBatchMaintenancePhase,
  type ChannelHealthReviewBatchPriority,
  type ChannelHealthReviewBatchProgressState,
  type ChannelHealthReviewBatchTerminalOutcomeCode,
  type ChannelHealthReviewBatchTaskStatus,
  type ChannelHealthReviewBatchPage,
} from '@/api/channelHealthReviewBatches'
import type { ApiId } from '@/api/types'
import type { ChannelHealth } from '@/api/channelHealth'
import ChannelHealthReviewBatchCoordinationWorkspace from './ChannelHealthReviewBatchCoordinationWorkspace.vue'

const props = defineProps<{
  refreshKey?: number
  channels: ChannelHealth[]
  canCreateGlobally: boolean
  moderatedDomains: number[]
}>()

const emit = defineEmits<{
  'batch-coordinated': [batchId: ApiId]
}>()

const selectedDomain = ref<number | null>(null)
const page = ref<ChannelHealthReviewBatchPage>(unavailableChannelHealthReviewBatchPage())
const loading = ref(false)
const loadingMore = ref(false)
const errorText = ref('')
const loadMoreErrorText = ref('')
const selectedBatchId = ref<string | null>(null)
const detail = ref<ChannelHealthReviewBatchDetail | null>(null)
const detailLoading = ref(false)
const detailErrorText = ref('')
let listRequestVersion = 0
let detailRequestVersion = 0

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

const ensureSelectedDomain = () => {
  if (selectedDomain.value != null && domains.value.some((item) => item.domain === selectedDomain.value)) return
  selectedDomain.value = domains.value[0]?.domain ?? null
}

const resetDetail = () => {
  detailRequestVersion += 1
  selectedBatchId.value = null
  detail.value = null
  detailLoading.value = false
  detailErrorText.value = ''
}

const closeDetail = () => {
  if (detailLoading.value) return
  resetDetail()
}

const resetPage = () => {
  page.value = unavailableChannelHealthReviewBatchPage()
  loadingMore.value = false
  errorText.value = ''
  loadMoreErrorText.value = ''
}

const priorityLabel = (priority: ChannelHealthReviewBatchPriority) => ({
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
})[priority]

const progressStateLabel = (state: ChannelHealthReviewBatchProgressState) => ({
  ACTION_REQUIRED: '待领取',
  IN_PROGRESS: '处理中',
  REVIEW_PENDING: '待复核',
  COMPLETED: '全部完成',
  CLOSED: '全部关闭',
  PARTIALLY_CLOSED: '部分结案',
})[state]

const dueStateLabel = (state: ChannelHealthReviewBatchDueState) => ({
  NOT_APPLICABLE: '无需时限跟踪',
  ON_TRACK: '进度正常',
  DUE_SOON: '临近截止',
  OVERDUE: '已逾期',
})[state]

const taskStatusLabel = (status: ChannelHealthReviewBatchTaskStatus) => ({
  OPEN: '开放',
  CLAIMED: '已领取',
  SUBMITTED: '待复核',
  COMPLETED: '已完成',
  CLOSED: '已关闭',
})[status]

const taskStatusCounts = (batch: ChannelHealthReviewBatchPage['items'][number]) => batch.taskStatusCounts

const maintenancePhaseLabel = (phase: ChannelHealthReviewBatchMaintenancePhase) => ({
  OPEN: '待领取',
  IN_PROGRESS: '处理中',
  REWORK: '返工中',
  REVIEW_PENDING: '待复核',
  VERIFIED_DELIVERY: '已验证交付',
  CLOSED: '已关闭',
})[phase]

const terminalOutcomeLabel = (outcome: ChannelHealthReviewBatchTerminalOutcomeCode) => (
  outcome === 'VERIFIED_DELIVERY' ? '已验证交付' : outcome
)

const formatDueAt = (value: string | null) => {
  if (value == null) return '未设置'
  if (value.endsWith('Z')) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString('zh-CN', { hour12: false })
  }
  return value.replace('T', ' ').replace(/(\.\d{1,9})?Z?$/, '')
}

const load = async () => {
  ensureSelectedDomain()
  const domain = selectedDomain.value
  const version = ++listRequestVersion
  resetPage()
  if (domain == null) {
    resetDetail()
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await channelHealthReviewBatchesApi.list({ domain, size: 10 })
    if (version !== listRequestVersion) return
    const nextPage = response.data || unavailableChannelHealthReviewBatchPage()
    page.value = nextPage
    if (!nextPage.available) resetDetail()
    else if (
      selectedBatchId.value != null
      && !nextPage.items.some((batch) => String(batch.id) === selectedBatchId.value)
    ) resetDetail()
  } catch (error) {
    if (version !== listRequestVersion) return
    page.value = unavailableChannelHealthReviewBatchPage()
    resetDetail()
    errorText.value = getErrorMessage(error, '维护批次暂时无法读取')
  } finally {
    if (version === listRequestVersion) loading.value = false
  }
}

const loadMore = async () => {
  const domain = selectedDomain.value
  const cursor = page.value.nextCursor
  if (domain == null || cursor == null || loading.value || loadingMore.value || detailLoading.value) return
  const version = ++listRequestVersion
  loadingMore.value = true
  loadMoreErrorText.value = ''
  try {
    const response = await channelHealthReviewBatchesApi.list({ domain, cursor, size: 10 })
    if (version !== listRequestVersion) return
    const nextPage = response.data || unavailableChannelHealthReviewBatchPage()
    if (!nextPage.available) {
      page.value = unavailableChannelHealthReviewBatchPage()
      resetDetail()
      return
    }
    const seenIds = new Set(page.value.items.map((batch) => String(batch.id)))
    const nextItems = nextPage.items.filter((batch) => !seenIds.has(String(batch.id)))
    if (nextItems.length !== nextPage.items.length) {
      page.value = unavailableChannelHealthReviewBatchPage()
      resetDetail()
      return
    }
    page.value = {
      available: true,
      items: [...page.value.items, ...nextItems],
      nextCursor: nextPage.nextCursor,
    }
  } catch (error) {
    if (version !== listRequestVersion) return
    loadMoreErrorText.value = getErrorMessage(error, '维护批次暂时无法读取')
  } finally {
    if (version === listRequestVersion) loadingMore.value = false
  }
}

const loadDetail = async (batchId: ApiId) => {
  if (detailLoading.value) return
  const normalizedId = String(batchId)
  const version = ++detailRequestVersion
  selectedBatchId.value = normalizedId
  detail.value = null
  detailErrorText.value = ''
  detailLoading.value = true
  try {
    const response = await channelHealthReviewBatchesApi.detail(batchId)
    if (version !== detailRequestVersion) return
    if (!response.data || String(response.data.id) !== normalizedId) {
      throw new Error('维护批次详情不可用')
    }
    detail.value = response.data
  } catch (error) {
    if (version !== detailRequestVersion) return
    detail.value = null
    detailErrorText.value = getErrorMessage(error, '维护批次详情暂时无法读取')
  } finally {
    if (version === detailRequestVersion) detailLoading.value = false
  }
}

const retryDetail = () => {
  if (!selectedBatchId.value || detailLoading.value) return
  void loadDetail(selectedBatchId.value)
}

const openBatch = async (batchId: ApiId) => {
  if (detailLoading.value) return
  await loadDetail(batchId)
}

const handleCoordinationChanged = (batchId: ApiId) => {
  void Promise.all([loadDetail(batchId), load()])
  emit('batch-coordinated', batchId)
}

watch(domains, () => {
  ensureSelectedDomain()
}, { immediate: true })

watch(selectedDomain, (domain, previousDomain) => {
  if (domain === previousDomain) return
  resetPage()
  resetDetail()
  if (domain == null) {
    listRequestVersion += 1
    loading.value = false
    return
  }
  void load()
}, { immediate: true })

watch(() => props.refreshKey, (value, previousValue) => {
  if (value == null || value === previousValue) return
  void load()
})

defineExpose({
  openBatch,
})
</script>

<style scoped>
.batch-panel { border: 1px solid var(--border-subtle); border-radius: .625rem; background: white; padding: 1.15rem; }
.panel-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.panel-header p, .detail-header p { margin: 0; color: rgb(26 127 90); font-size: .75rem; font-weight: 800; }
.panel-header h2, .detail-header h3 { margin: .25rem 0 0; color: var(--text-strong); font-size: 1rem; font-weight: 900; }
.panel-controls { display: flex; align-items: flex-end; gap: .5rem; }
.domain-picker { display: grid; gap: .25rem; color: var(--text-muted); font-size: .68rem; font-weight: 800; }
.domain-picker select { min-width: 9rem; border: 1px solid var(--border-subtle); border-radius: .5rem; background: white; color: var(--text-strong); font-size: .75rem; padding: .45rem .55rem; }
.icon-button { display: inline-flex; height: 2.25rem; width: 2.25rem; align-items: center; justify-content: center; border: 1px solid var(--border-subtle); border-radius: .5rem; background: white; color: var(--text-primary); }
.icon-button:disabled, .retry-button:disabled, .load-more-button:disabled, .batch-main:disabled, .detail-button:disabled, .text-action:disabled { cursor: not-allowed; opacity: .55; }
.panel-caption { margin: .75rem 0 0; color: var(--text-muted); font-size: .75rem; line-height: 1.55; }
.state, .detail-state { display: flex; align-items: center; justify-content: center; gap: .75rem; margin-top: .85rem; border: 1px dashed var(--border-subtle); border-radius: .5rem; background: var(--surface-soft); padding: 1.2rem; color: var(--text-muted); font-size: .8rem; text-align: center; }
.state-error, .detail-state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.retry-button, .load-more-button, .detail-button, .post-link { min-height: 32px; border: 1px solid var(--border-subtle); border-radius: .5rem; background: white; padding: .35rem .55rem; color: var(--text-primary); font-size: .72rem; font-weight: 800; }
.batch-list { display: grid; gap: .65rem; margin-top: .85rem; }
.batch-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .65rem; border: 1px solid var(--border-subtle); border-radius: .5rem; background: var(--surface-soft); padding: .75rem; }
.batch-row-selected { border-color: rgb(26 127 90); }
.batch-main { min-width: 0; border: 0; background: transparent; padding: 0; color: inherit; text-align: left; }
.batch-title, .task-title { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; }
.batch-title h3, .task-title h4 { overflow: hidden; margin: 0; color: var(--text-strong); font-size: .82rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.priority, .progress-state, .due-state, .task-status { border-radius: 999px; padding: .18rem .42rem; font-size: .64rem; font-weight: 900; }
.priority-high { background: rgb(254 226 226); color: rgb(185 28 28); }
.priority-medium { background: rgb(254 243 199); color: rgb(146 64 14); }
.priority-low { background: rgb(220 252 231); color: rgb(21 128 61); }
.batch-main p, .task-main p { margin: .35rem 0 0; color: var(--text-muted); font-size: .72rem; line-height: 1.5; }
.batch-meta, .status-counts, .detail-summary { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .55rem; }
.progress-action_required, .task-status-open { background: rgb(254 243 199); color: rgb(146 64 14); }
.progress-in_progress, .task-status-claimed { background: rgb(224 242 254); color: rgb(3 105 161); }
.progress-review_pending, .task-status-submitted { background: rgb(205 232 220); color: rgb(18 99 74); }
.progress-completed, .task-status-completed { background: rgb(220 252 231); color: rgb(21 128 61); }
.progress-closed, .task-status-closed, .progress-partially_closed { background: var(--surface-soft); color: var(--text-primary); }
.due-on_track { background: rgb(220 252 231); color: rgb(21 128 61); }
.due-due_soon { background: rgb(254 243 199); color: rgb(146 64 14); }
.due-overdue { background: rgb(254 226 226); color: rgb(185 28 28); }
.due-not_applicable { background: var(--surface-soft); color: var(--text-primary); }
.status-counts span, .detail-summary span { color: var(--text-primary); font-size: .66rem; font-weight: 800; }
.detail-button { align-self: start; }
.load-more-button { display: block; margin-top: .85rem; }
.load-more-error { display: flex; align-items: center; justify-content: center; gap: .65rem; margin-top: .85rem; color: rgb(185 28 28); font-size: .72rem; }
.batch-detail { margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 1rem; }
.detail-header { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.text-action { min-height: 28px; border: 0; background: transparent; color: rgb(18 99 74); font-size: .7rem; font-weight: 800; }
.detail-summary { border: 1px solid var(--border-subtle); border-radius: .5rem; background: var(--surface-soft); padding: .6rem; }
.task-list { display: grid; gap: .55rem; margin-top: .75rem; }
.task-row { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; border-top: 1px solid var(--border-subtle); padding-top: .65rem; }
.task-main { min-width: 0; }
.post-link { display: inline-flex; flex: none; align-items: center; text-decoration: none; }
@media (max-width: 700px) {
  .panel-header, .batch-row, .task-row { align-items: stretch; flex-direction: column; }
  .batch-row { display: flex; }
  .panel-controls { justify-content: space-between; }
  .detail-button, .post-link { align-self: stretch; justify-content: center; }
}
.dark .batch-panel { border-color: var(--border-subtle); background: var(--surface-1); }
.dark .panel-header h2, .dark .detail-header h3, .dark .batch-title h3, .dark .task-title h4 { color: var(--text-strong); }
.dark .domain-picker, .dark .panel-caption, .dark .state, .dark .detail-state, .dark .batch-main p, .dark .task-main p { color: var(--text-muted); }
.dark .domain-picker select, .dark .icon-button, .dark .retry-button, .dark .load-more-button, .dark .detail-button, .dark .post-link { border-color: var(--border-subtle); background: var(--surface-1); color: var(--text-muted); }
.dark .state, .dark .detail-state { border-color: var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 55%, transparent); }
.dark .state-error, .dark .detail-state-error { border-color: rgb(127 29 29); color: rgb(252 165 165); }
.dark .batch-row, .dark .detail-summary { border-color: var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 45%, transparent); }
.dark .batch-row-selected { border-color: rgb(70 172 134); }
.dark .status-counts span, .dark .detail-summary span { color: var(--text-muted); }
.dark .batch-detail, .dark .task-row { border-color: var(--border-subtle); }
.dark .text-action { color: rgb(124 195 165); }
.dark .load-more-error { color: rgb(252 165 165); }
</style>
