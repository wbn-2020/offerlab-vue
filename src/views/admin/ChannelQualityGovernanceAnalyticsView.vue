<template>
  <div class="analytics-page min-h-screen">
    <AppHeader />
    <main class="analytics-main">
      <header class="page-header">
        <div>
          <p>频道质量治理</p>
          <h1>频道质量治理分析</h1>
          <span>仅展示服务端已完成投影的授权范围聚合结果。</span>
        </div>
        <button
          type="button"
          class="icon-button"
          title="刷新频道质量治理分析"
          :disabled="loading"
          @click="load()"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" aria-hidden="true" />
        </button>
      </header>

      <section class="filter-bar" aria-label="频道质量治理分析筛选">
        <label><span>开始日期</span><input v-model="fromDate" type="date" :max="toDate" @change="applyFilters"></label>
        <label><span>结束日期</span><input v-model="toDate" type="date" :min="fromDate" @change="applyFilters"></label>
        <label>
          <span>频道</span>
          <select v-model="domain" @change="applyFilters">
            <option value="">全部授权频道</option>
            <option v-for="item in domainOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <label>
          <span>触发类型</span>
          <select v-model="triggerType" @change="applyFilters">
            <option value="">全部类型</option>
            <option value="RISK_EVENT">风险事件</option>
            <option value="DUE_STATE">时限状态</option>
          </select>
        </label>
        <label>
          <span>风险分类</span>
          <input v-model.trim="riskCategory" maxlength="48" placeholder="例如 CAPACITY_RISK" @change="applyFilters">
        </label>
        <label>
          <span>复发观察期</span>
          <select v-model="recurrenceWindowDays" @change="applyFilters">
            <option :value="7">7 天</option>
            <option :value="30">30 天</option>
            <option :value="90">90 天</option>
          </select>
        </label>
      </section>

      <section v-if="health" :class="['projection-state', `projection-state--${health.status.toLowerCase()}`]">
        <div>
          <strong>{{ projectionStatusLabel(health.status) }}</strong>
          <span>{{ projectionStatusDescription(health.status) }}</span>
        </div>
        <small>
          截止 {{ formatTime(health.asOf) }}
          · 活动代 {{ health.activeGeneration == null ? '无完整代' : `#${health.activeGeneration}` }}
          · 脏桶 {{ health.dirtyBucketCount }}
        </small>
      </section>

      <section v-if="health" class="watermark-strip" aria-label="投影数据水位">
        <div v-for="source in health.sources" :key="source.sourceType" class="watermark-item">
          <strong>{{ sourceLabel(source.sourceType) }}</strong>
          <span>{{ source.available ? formatTime(source.coveredThrough) : '来源不可用' }}</span>
          <small>{{ source.available ? `${source.lagSeconds} 秒延迟 · 积压 ${source.backlogCount}` : '不会以零值替代' }}</small>
        </div>
      </section>

      <div v-if="errorText && !overview" class="state state-error">
        <p>{{ errorText }}</p>
        <button type="button" class="secondary-button" :disabled="loading" @click="load()">重试</button>
      </div>
      <div v-else-if="loading && !overview" class="state" role="status">正在读取频道质量治理分析</div>

      <template v-else-if="overview">
        <section class="section-block" aria-labelledby="funnel-title">
          <div class="section-heading">
            <div><p>治理漏斗</p><h2 id="funnel-title">端到端阶段</h2></div>
            <small>口径 {{ overview.metricDefinitionVersion }} · 截止 {{ formatTime(overview.window.asOf) }}</small>
          </div>
          <div class="funnel-grid">
            <article v-for="step in orderedFunnel" :key="step.stage" class="metric-card">
              <div class="metric-card__head">
                <span>{{ funnelStageLabel(step.stage) }}</span>
                <span :class="availabilityClass(step.availability)">{{ availabilityLabel(step.availability) }}</span>
              </div>
              <strong>{{ formatCount(step.value) }}</strong>
              <small>{{ measureContext(step) }}</small>
            </article>
          </div>
        </section>

        <section class="section-block" aria-labelledby="duration-title">
          <div class="section-heading">
            <div><p>处理时长</p><h2 id="duration-title">关闭样本统计</h2></div>
            <small>仅使用存在完整关闭快照的合格样本</small>
          </div>
          <div class="duration-grid">
            <article v-for="stage in durationStages" :key="stage" class="duration-row">
              <div>
                <strong>{{ durationStageLabel(stage) }}</strong>
                <span :class="availabilityClass(overview.handlingDuration[stage].availability)">
                  {{ availabilityLabel(overview.handlingDuration[stage].availability) }}
                </span>
              </div>
              <dl>
                <div><dt>样本</dt><dd>{{ sampleCountLabel(overview.handlingDuration[stage].sampleCount) }}</dd></div>
                <div><dt>平均</dt><dd>{{ formatDuration(overview.handlingDuration[stage].averageSeconds) }}</dd></div>
                <div><dt>P50</dt><dd>{{ formatDuration(overview.handlingDuration[stage].p50Seconds) }}</dd></div>
                <div><dt>P90</dt><dd>{{ formatDuration(overview.handlingDuration[stage].p90Seconds) }}</dd></div>
              </dl>
              <small>{{ availabilityReason(overview.handlingDuration[stage].availability, overview.handlingDuration[stage].reason) }}</small>
            </article>
          </div>
        </section>

        <section class="section-block" aria-labelledby="rate-title">
          <div class="section-heading">
            <div><p>质量比率</p><h2 id="rate-title">治理与协作信号</h2></div>
            <small>分子和分母由同一投影代计算</small>
          </div>
          <div class="rate-grid">
            <article v-for="key in rateKeys" :key="key" class="metric-card">
              <div class="metric-card__head">
                <span>{{ rateLabel(key) }}</span>
                <span :class="availabilityClass(overview.rates[key].availability)">
                  {{ availabilityLabel(overview.rates[key].availability) }}
                </span>
              </div>
              <strong>{{ formatPercent(overview.rates[key].value) }}</strong>
              <small>{{ measureContext(overview.rates[key]) }}</small>
            </article>
          </div>
        </section>

        <section class="section-block" aria-labelledby="trend-title">
          <div class="section-heading">
            <div><p>风险趋势</p><h2 id="trend-title">时间桶变化</h2></div>
            <div class="inline-controls">
              <label>
                <span>指标</span>
                <select v-model="metricCode" @change="applyFilters">
                  <option v-for="item in metricOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
              <label>
                <span>粒度</span>
                <select v-model="grain" @change="applyFilters">
                  <option value="DAY">按日</option>
                  <option value="WEEK">按周</option>
                </select>
              </label>
            </div>
          </div>
          <div v-if="trends" class="trend-panel">
            <div v-if="trendLineSegments.length" class="trend-chart" aria-label="趋势图">
              <svg viewBox="0 0 100 48" preserveAspectRatio="none" role="img" aria-label="仅连接连续可用时间桶的趋势线">
                <line x1="4" y1="42" x2="96" y2="42" class="trend-axis" />
                <polyline
                  v-for="(segment, index) in trendLineSegments"
                  :key="`segment-${index}`"
                  :points="segment.points"
                  class="trend-line"
                  fill="none"
                />
                <circle
                  v-for="point in trendPoints"
                  :key="point.key"
                  :cx="point.x"
                  :cy="point.y"
                  r="1.35"
                  class="trend-point"
                />
              </svg>
            </div>
            <div v-else class="chart-empty">当前筛选没有可以连续展示的可用趋势数据。</div>
            <ol class="trend-buckets">
              <li v-for="bucket in trends.buckets" :key="`${bucket.bucketStart}-${bucket.bucketEnd}`">
                <strong>{{ formatBucket(bucket.bucketStart) }}</strong>
                <span :class="availabilityClass(bucket.availability)">{{ availabilityLabel(bucket.availability) }}</span>
                <b>{{ formatMetricValue(bucket.value, trends.metricCode) }}</b>
                <small>{{ availabilityReason(bucket.availability, bucket.reason) }}</small>
              </li>
            </ol>
          </div>
          <div v-else class="chart-empty">趋势数据暂时无法读取。</div>
        </section>

        <section class="section-block" aria-labelledby="breakdown-title">
          <div class="section-heading">
            <div><p>分类构成</p><h2 id="breakdown-title">单一安全维度</h2></div>
            <label class="inline-select">
              <span>分类维度</span>
              <select v-model="dimension" @change="applyFilters">
                <option v-for="item in dimensionOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
              </select>
            </label>
          </div>
          <div v-if="breakdown" class="breakdown-table" role="table" aria-label="分类构成">
            <div class="breakdown-table__head" role="row">
              <span role="columnheader">分类</span><span role="columnheader">可用性</span><span role="columnheader">指标值</span><span role="columnheader">样本</span><span role="columnheader">原因</span>
            </div>
            <div v-for="item in breakdown.items" :key="item.dimensionValue" class="breakdown-table__row" role="row">
              <strong role="cell">{{ item.dimensionValue }}</strong>
              <span role="cell" :class="availabilityClass(item.availability)">{{ availabilityLabel(item.availability) }}</span>
              <span role="cell">{{ formatMetricValue(item.value, breakdown.metricCode) }}</span>
              <span role="cell">{{ sampleCountLabel(item.sampleCount) }}</span>
              <small role="cell">{{ availabilityReason(item.availability, item.reason) }}</small>
            </div>
            <div v-if="breakdown.items.length === 0" class="chart-empty">当前筛选没有可展示的分类聚合结果。</div>
          </div>
          <div v-else class="chart-empty">分类构成暂时无法读取。</div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RefreshCw } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage } from '@/api/client'
import {
  channelQualityGovernanceAnalyticsApi,
  type ChannelQualityGovernanceAnalyticsAvailability,
  type ChannelQualityGovernanceAnalyticsBreakdown,
  type ChannelQualityGovernanceAnalyticsDimension,
  type ChannelQualityGovernanceAnalyticsDurationStage,
  type ChannelQualityGovernanceAnalyticsFunnelStage,
  type ChannelQualityGovernanceAnalyticsGrain,
  type ChannelQualityGovernanceAnalyticsMeasure,
  type ChannelQualityGovernanceAnalyticsMetricCode,
  type ChannelQualityGovernanceAnalyticsOverview,
  type ChannelQualityGovernanceAnalyticsProjectionHealth,
  type ChannelQualityGovernanceAnalyticsProjectionStatus,
  type ChannelQualityGovernanceAnalyticsRateKey,
  type ChannelQualityGovernanceAnalyticsSourceType,
  type ChannelQualityGovernanceAnalyticsTrends,
} from '@/api/channelQualityGovernanceAnalytics'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const domainOptions = [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: `频道 ${value}` }))
const rateKeys: ChannelQualityGovernanceAnalyticsRateKey[] = [
  'governanceOverdueRate',
  'reminderCoverageRate',
  'postReminderCompletionRate',
  'taskReworkRate',
  'batchWithdrawalRate',
  'riskRecurrenceRate',
]
const durationStages: ChannelQualityGovernanceAnalyticsDurationStage[] = [
  'END_TO_END',
  'ACKNOWLEDGEMENT',
  'PLANNING',
  'RESOLUTION_SUBMISSION',
  'GOVERNANCE_REVIEW',
]
const metricOptions: Array<{ value: ChannelQualityGovernanceAnalyticsMetricCode; label: string }> = [
  { value: 'CASE_OPENED_COUNT', label: '风险治理创建数' },
  { value: 'CASE_CLOSED_COUNT', label: '治理关闭数' },
  { value: 'GOVERNANCE_OVERDUE_RATE', label: '治理逾期率' },
  { value: 'REMINDER_COVERAGE_RATE', label: '提醒覆盖率' },
  { value: 'POST_REMINDER_COMPLETION_RATE', label: '提醒后完成率' },
  { value: 'TASK_REWORK_RATE', label: '任务返工率' },
  { value: 'BATCH_WITHDRAW_RATE', label: '批次撤回率' },
  { value: 'RISK_RECURRENCE_RATE', label: '风险复发率' },
]
const dimensionOptions: Array<{ value: ChannelQualityGovernanceAnalyticsDimension; label: string }> = [
  { value: 'ROOT_CAUSE_CATEGORY', label: '根因分类' },
  { value: 'RISK_CATEGORY', label: '风险分类' },
  { value: 'TRIGGER_TYPE', label: '触发类型' },
  { value: 'RESOLUTION_OUTCOME', label: '处置结果' },
  { value: 'RECOVERY_VERIFICATION_STATUS', label: '恢复验证' },
  { value: 'TODO_TYPE', label: '待办类型' },
]

const defaultDate = (offsetDays: number) => {
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

const fromDate = ref(defaultDate(-29))
const toDate = ref(defaultDate(1))
const domain = ref('')
const triggerType = ref<'RISK_EVENT' | 'DUE_STATE' | ''>('')
const riskCategory = ref('')
const recurrenceWindowDays = ref<7 | 30 | 90>(30)
const metricCode = ref<ChannelQualityGovernanceAnalyticsMetricCode>('RISK_RECURRENCE_RATE')
const grain = ref<ChannelQualityGovernanceAnalyticsGrain>('WEEK')
const dimension = ref<ChannelQualityGovernanceAnalyticsDimension>('ROOT_CAUSE_CATEGORY')
const overview = ref<ChannelQualityGovernanceAnalyticsOverview | null>(null)
const trends = ref<ChannelQualityGovernanceAnalyticsTrends | null>(null)
const breakdown = ref<ChannelQualityGovernanceAnalyticsBreakdown | null>(null)
const health = ref<ChannelQualityGovernanceAnalyticsProjectionHealth | null>(null)
const loading = ref(false)
const errorText = ref('')

let accountGeneration = 0
let loadRequestId = 0
let loadController: AbortController | null = null

const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const routeValue = (name: string) => String(firstQueryValue(route.query[name]) || '').trim()
const currentAccountKey = () => String(authStore.token || '')
const currentFilterKey = () => [
  fromDate.value,
  toDate.value,
  domain.value,
  triggerType.value,
  riskCategory.value,
  recurrenceWindowDays.value,
  metricCode.value,
  grain.value,
  dimension.value,
].join('|')

const dateBoundary = (value: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date.toISOString()
    : null
}

const isStructuredCode = (value: string) => /^[A-Z][A-Z0-9_]{1,47}$/.test(value)

const syncFiltersFromRoute = () => {
  const nextFrom = routeValue('from')
  const nextTo = routeValue('to')
  const nextRecurrenceWindowDays = routeValue('recurrenceWindowDays')
  const nextMetricCode = routeValue('metricCode') as ChannelQualityGovernanceAnalyticsMetricCode
  const nextDimension = routeValue('dimension') as ChannelQualityGovernanceAnalyticsDimension
  fromDate.value = dateBoundary(nextFrom) ? nextFrom : defaultDate(-29)
  toDate.value = dateBoundary(nextTo) ? nextTo : defaultDate(1)
  domain.value = /^[1-5]$/.test(routeValue('domain')) ? routeValue('domain') : ''
  triggerType.value = routeValue('triggerType') === 'RISK_EVENT' || routeValue('triggerType') === 'DUE_STATE'
    ? routeValue('triggerType') as 'RISK_EVENT' | 'DUE_STATE'
    : ''
  riskCategory.value = isStructuredCode(routeValue('riskCategory')) ? routeValue('riskCategory') : ''
  recurrenceWindowDays.value = nextRecurrenceWindowDays === '7' ? 7 : nextRecurrenceWindowDays === '90' ? 90 : 30
  metricCode.value = metricOptions.some((item) => item.value === nextMetricCode) ? nextMetricCode : 'RISK_RECURRENCE_RATE'
  grain.value = routeValue('grain') === 'DAY' ? 'DAY' : 'WEEK'
  dimension.value = dimensionOptions.some((item) => item.value === nextDimension) ? nextDimension : 'ROOT_CAUSE_CATEGORY'
}

const clearState = () => {
  loadRequestId += 1
  loadController?.abort()
  loadController = null
  overview.value = null
  trends.value = null
  breakdown.value = null
  health.value = null
  loading.value = false
  errorText.value = ''
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

const requestWindow = () => {
  const from = dateBoundary(fromDate.value)
  const to = dateBoundary(toDate.value)
  const selectedDomain = domain.value ? Number.parseInt(domain.value, 10) : undefined
  const selectedRiskCategory = riskCategory.value.trim()
  if (
    !from
    || !to
    || Date.parse(to) <= Date.parse(from)
    || (selectedDomain != null && (!Number.isSafeInteger(selectedDomain) || selectedDomain < 1 || selectedDomain > 5))
    || (selectedRiskCategory && !isStructuredCode(selectedRiskCategory))
  ) return null
  return {
    from,
    to,
    domain: selectedDomain,
    triggerType: triggerType.value || undefined,
    riskCategory: selectedRiskCategory || undefined,
    recurrenceWindowDays: recurrenceWindowDays.value,
  }
}

const load = async () => {
  if (!authStore.isLoggedIn || !authStore.token) return
  const window = requestWindow()
  if (!window) {
    errorText.value = '筛选条件无效：结束日期必须晚于开始日期，风险分类必须是结构化代码。'
    return
  }
  const requestId = ++loadRequestId
  const requestAccountGeneration = accountGeneration
  const requestAccountKey = currentAccountKey()
  const filterKey = currentFilterKey()
  loadController?.abort()
  const controller = new AbortController()
  loadController = controller
  loading.value = true
  errorText.value = ''
  try {
    const [overviewResponse, trendsResponse, breakdownResponse, healthResponse] = await Promise.all([
      channelQualityGovernanceAnalyticsApi.overview(window, { signal: controller.signal }),
      channelQualityGovernanceAnalyticsApi.trends({ ...window, metricCode: metricCode.value, grain: grain.value }, { signal: controller.signal }),
      channelQualityGovernanceAnalyticsApi.breakdown({ ...window, metricCode: metricCode.value, dimension: dimension.value }, { signal: controller.signal }),
      channelQualityGovernanceAnalyticsApi.projectionHealth({ signal: controller.signal }),
    ])
    if (!requestIsCurrent(requestId, requestAccountGeneration, requestAccountKey, filterKey, controller)) return
    if (!overviewResponse.data || !trendsResponse.data || !breakdownResponse.data || !healthResponse.data) {
      throw new Error('频道质量治理分析响应为空')
    }
    overview.value = overviewResponse.data
    trends.value = trendsResponse.data
    breakdown.value = breakdownResponse.data
    health.value = healthResponse.data
  } catch (error) {
    if (!requestIsCurrent(requestId, requestAccountGeneration, requestAccountKey, filterKey, controller)) return
    if (isCanceledRequest(error, controller.signal)) return
    errorText.value = getErrorMessage(error, '频道质量治理分析暂时无法读取')
  } finally {
    if (loadController === controller && requestId === loadRequestId) {
      loading.value = false
      loadController = null
    }
  }
}

const applyFilters = () => {
  const query = {
    from: fromDate.value,
    to: toDate.value,
    ...(domain.value ? { domain: domain.value } : {}),
    ...(triggerType.value ? { triggerType: triggerType.value } : {}),
    ...(riskCategory.value.trim() ? { riskCategory: riskCategory.value.trim() } : {}),
    recurrenceWindowDays: String(recurrenceWindowDays.value),
    metricCode: metricCode.value,
    grain: grain.value,
    dimension: dimension.value,
  }
  if (JSON.stringify(query) === JSON.stringify(route.query)) {
    void load()
    return
  }
  void router.replace({ path: '/admin/community-health/quality-governance-analytics', query })
}

const orderedFunnel = computed(() => {
  const current = overview.value?.funnel || []
  return (['OPENED', 'ACKNOWLEDGED', 'PLANNED', 'RESOLUTION_SUBMITTED', 'GOVERNANCE_CLOSED', 'RECOVERY_VERIFIED'] as const)
    .flatMap((stage) => current.filter((item) => item.stage === stage))
})

const trendPoints = computed(() => {
  const buckets = trends.value?.buckets || []
  const available = buckets.reduce<Array<{
    bucketStart: string
    bucketEnd: string
    value: number
    index: number
  }>>((items, bucket, index) => {
    if (bucket.availability === 'AVAILABLE' && bucket.value != null) {
      items.push({ bucketStart: bucket.bucketStart, bucketEnd: bucket.bucketEnd, value: bucket.value, index })
    }
    return items
  }, [])
  if (available.length === 0) return []
  const values = available.map((item) => item.value)
  const maximum = Math.max(...values)
  const minimum = Math.min(...values)
  const range = maximum - minimum || 1
  const width = buckets.length > 1 ? 92 / (buckets.length - 1) : 46
  return available.map((item) => ({
    key: `${item.bucketStart}-${item.bucketEnd}`,
    index: item.index,
    x: buckets.length > 1 ? 4 + item.index * width : 50,
    y: 6 + ((maximum - item.value) / range) * 32,
  }))
})

const trendLineSegments = computed(() => {
  const pointByIndex = new Map(trendPoints.value.map((point) => [point.index, point]))
  const groups: Array<Array<{ x: number; y: number }>> = []
  let current: Array<{ x: number; y: number }> = []
  ;(trends.value?.buckets || []).forEach((bucket, index) => {
    const point = pointByIndex.get(index)
    if (bucket.availability === 'AVAILABLE' && point) {
      current.push(point)
      return
    }
    if (current.length > 0) groups.push(current)
    current = []
  })
  if (current.length > 0) groups.push(current)
  return groups
    .filter((group) => group.length > 1)
    .map((group) => ({ points: group.map((point) => `${point.x},${point.y}`).join(' ') }))
})

const projectionStatusLabel = (value: ChannelQualityGovernanceAnalyticsProjectionStatus) => ({
  READY: '投影已就绪',
  DEGRADED: '投影部分降级',
  STALE: '投影数据已陈旧',
  REBUILDING: '历史数据正在重算',
  FAILED: '投影构建失败',
  UNAVAILABLE: '投影暂不可用',
}[value])

const projectionStatusDescription = (value: ChannelQualityGovernanceAnalyticsProjectionStatus) => ({
  READY: '当前分析使用服务端已验证的活动投影代。',
  DEGRADED: '核心分析仍可阅读，局部能力会明确显示不可用。',
  STALE: '显示的是最近完整代，不能将其理解为实时数据。',
  REBUILDING: '服务端继续读取上一完整代，历史桶正在安全重算。',
  FAILED: '服务端没有可接受的完整结果，不能推断指标状态。',
  UNAVAILABLE: '依赖或投影契约不可用，页面不会以默认值替代。',
}[value])

const availabilityLabel = (value: ChannelQualityGovernanceAnalyticsAvailability) => ({
  AVAILABLE: '可用',
  UNAVAILABLE: '不可用',
  SUPPRESSED: '已抑制',
  NO_ELIGIBLE_SAMPLE: '无合格样本',
}[value])

const availabilityClass = (value: ChannelQualityGovernanceAnalyticsAvailability) => `availability availability--${value.toLowerCase()}`
const availabilityReason = (availability: ChannelQualityGovernanceAnalyticsAvailability, reason: string | null) => (
  availability === 'AVAILABLE' ? '服务端已验证该聚合结果' : (reason || availabilityLabel(availability))
)
const sourceLabel = (value: ChannelQualityGovernanceAnalyticsSourceType) => ({
  V38_BATCH: '批次派发',
  V38_ATTEMPT: '审核回合',
  V39_EVENT: '批次事件',
  V40_CASE_EVENT: '风险治理',
  V41_CLOSE_SNAPSHOT: '关闭快照',
  V41_RECURRENCE: '复发关联',
  V42_TODO: '治理待办',
  V42_REMINDER: '提醒投递',
}[value])
const funnelStageLabel = (value: ChannelQualityGovernanceAnalyticsFunnelStage) => ({
  OPENED: '已创建',
  ACKNOWLEDGED: '已确认',
  PLANNED: '已计划',
  RESOLUTION_SUBMITTED: '已提交恢复',
  GOVERNANCE_CLOSED: '治理已关闭',
  RECOVERY_VERIFIED: '恢复已验证',
}[value])
const durationStageLabel = (value: ChannelQualityGovernanceAnalyticsDurationStage) => ({
  END_TO_END: '端到端关闭',
  ACKNOWLEDGEMENT: '确认时长',
  PLANNING: '计划时长',
  RESOLUTION_SUBMISSION: '恢复提交时长',
  GOVERNANCE_REVIEW: '治理复核时长',
}[value])
const rateLabel = (value: ChannelQualityGovernanceAnalyticsRateKey) => ({
  governanceOverdueRate: '治理逾期率',
  reminderCoverageRate: '提醒覆盖率',
  postReminderCompletionRate: '提醒后完成率',
  taskReworkRate: '任务返工率',
  batchWithdrawalRate: '批次撤回率',
  riskRecurrenceRate: '风险复发率',
}[value])
const formatCount = (value: number | null) => value == null ? '--' : Math.round(value).toLocaleString('zh-CN')
const formatPercent = (value: number | null) => value == null ? '--' : new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
}).format(value)
const formatMetricValue = (value: number | null, metric: ChannelQualityGovernanceAnalyticsMetricCode) => (
  metric.endsWith('_RATE') ? formatPercent(value) : formatCount(value)
)
const sampleCountLabel = (value: number | null) => value == null ? '--' : value.toLocaleString('zh-CN')
const measureContext = (measure: ChannelQualityGovernanceAnalyticsMeasure) => {
  if (measure.availability !== 'AVAILABLE') return availabilityReason(measure.availability, measure.reason)
  return measure.numerator == null || measure.denominator == null
    ? '服务端未使用分子/分母口径'
    : `分子 ${measure.numerator.toLocaleString('zh-CN')} · 分母 ${measure.denominator.toLocaleString('zh-CN')}`
}
const formatDuration = (seconds: number | null) => {
  if (seconds == null) return '--'
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  if (seconds < 3_600) return `${Math.round(seconds / 60)} 分`
  if (seconds < 86_400) return `${(seconds / 3_600).toFixed(1)} 小时`
  return `${(seconds / 86_400).toFixed(1)} 天`
}
const formatTime = (value: string | null) => {
  if (!value) return '--'
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(timestamp)
    : '--'
}
const formatBucket = (value: string) => {
  const timestamp = Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(timestamp)
    : '--'
}

watch(
  () => ['from', 'to', 'domain', 'triggerType', 'riskCategory', 'recurrenceWindowDays', 'metricCode', 'grain', 'dimension']
    .map(routeValue)
    .join('|'),
  () => {
    syncFiltersFromRoute()
    void load()
  },
)
watch(
  () => authStore.token,
  (token, previousToken) => {
    if (token === previousToken) return
    accountGeneration += 1
    clearState()
    if (token) void load()
  },
)
onMounted(() => {
  syncFiltersFromRoute()
  void load()
})
onBeforeUnmount(clearState)
</script>

<style scoped>
.analytics-page { background: rgb(248 250 252); }
.analytics-main { width: min(1180px, 100%); margin: 0 auto; padding: 2rem 1rem 3rem; }
.page-header, .section-heading, .metric-card__head, .duration-row > div, .projection-state { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.page-header { margin-bottom: 1.25rem; }.page-header p, .section-heading p { margin: 0; color: rgb(8 145 178); font-size: .72rem; font-weight: 900; }.page-header h1 { margin: .2rem 0; color: rgb(15 23 42); font-size: 1.5rem; font-weight: 900; }.page-header span { color: rgb(100 116 139); font-size: .82rem; }.icon-button { display: inline-flex; width: 2.5rem; height: 2.5rem; align-items: center; justify-content: center; border: 1px solid rgb(203 213 225); border-radius: .5rem; background: white; color: rgb(51 65 85); }.icon-button:disabled,.secondary-button:disabled { cursor: not-allowed; opacity: .55; }
.filter-bar { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .7rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgb(226 232 240); }.filter-bar label,.inline-controls label,.inline-select { display: grid; min-width: 0; gap: .3rem; color: rgb(71 85 105); font-size: .68rem; font-weight: 850; }.filter-bar input,.filter-bar select,.inline-controls select,.inline-select select { width: 100%; min-width: 0; height: 2.25rem; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: 0 .55rem; color: rgb(15 23 42); font-size: .76rem; }
.projection-state { margin-bottom: 1rem; border: 1px solid rgb(186 230 253); border-radius: .55rem; background: rgb(240 249 255); padding: .75rem .85rem; color: rgb(12 74 110); }.projection-state div { display: grid; gap: .15rem; }.projection-state strong { font-size: .82rem; }.projection-state span,.projection-state small { font-size: .72rem; line-height: 1.5; }.projection-state small { white-space: nowrap; }.projection-state--degraded,.projection-state--stale,.projection-state--rebuilding { border-color: rgb(253 230 138); background: rgb(255 251 235); color: rgb(146 64 14); }.projection-state--failed,.projection-state--unavailable { border-color: rgb(254 202 202); background: rgb(254 242 242); color: rgb(185 28 28); }
.watermark-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .6rem; margin-bottom: 1.3rem; }.watermark-item { display: grid; min-width: 0; gap: .18rem; border-top: 2px solid rgb(14 165 233); padding: .5rem 0; }.watermark-item strong { color: rgb(30 41 59); font-size: .72rem; }.watermark-item span { overflow: hidden; color: rgb(71 85 105); font-size: .72rem; text-overflow: ellipsis; white-space: nowrap; }.watermark-item small { color: rgb(100 116 139); font-size: .65rem; line-height: 1.45; }
.state { display: grid; justify-items: center; gap: .65rem; border: 1px dashed rgb(203 213 225); border-radius: .55rem; background: white; padding: 2rem 1rem; color: rgb(100 116 139); font-size: .82rem; text-align: center; }.state p { margin: 0; }.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }.secondary-button { min-height: 2rem; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: 0 .65rem; color: rgb(51 65 85); font-size: .72rem; font-weight: 850; }
.section-block { margin-top: 1.7rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }.section-heading { align-items: end; margin-bottom: .75rem; }.section-heading h2 { margin: .18rem 0 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }.section-heading > small { color: rgb(100 116 139); font-size: .68rem; text-align: right; }.funnel-grid,.rate-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .6rem; }.metric-card { display: grid; min-width: 0; gap: .55rem; border: 1px solid rgb(226 232 240); border-radius: .5rem; background: white; padding: .75rem; }.metric-card__head { gap: .45rem; color: rgb(71 85 105); font-size: .69rem; font-weight: 850; }.metric-card > strong { overflow: hidden; color: rgb(15 23 42); font-size: 1.1rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }.metric-card > small { min-height: 2.8em; color: rgb(100 116 139); font-size: .64rem; line-height: 1.45; }
.availability { display: inline-flex; width: fit-content; border-radius: 999px; padding: .14rem .4rem; font-size: .6rem; font-weight: 900; white-space: nowrap; }.availability--available { background: rgb(220 252 231); color: rgb(22 101 52); }.availability--unavailable { background: rgb(254 226 226); color: rgb(185 28 28); }.availability--suppressed { background: rgb(237 233 254); color: rgb(109 40 217); }.availability--no_eligible_sample { background: rgb(241 245 249); color: rgb(71 85 105); }
.duration-grid { display: grid; gap: .55rem; }.duration-row { display: grid; grid-template-columns: minmax(10rem, .7fr) minmax(0, 2fr) minmax(12rem, .8fr); align-items: center; gap: 1rem; border-bottom: 1px solid rgb(226 232 240); padding: .7rem .1rem; }.duration-row > div { align-items: center; }.duration-row > div strong { color: rgb(30 41 59); font-size: .75rem; }.duration-row dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .5rem; margin: 0; }.duration-row dt { color: rgb(100 116 139); font-size: .62rem; }.duration-row dd { overflow: hidden; margin: .16rem 0 0; color: rgb(30 41 59); font-size: .74rem; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }.duration-row > small { color: rgb(100 116 139); font-size: .64rem; line-height: 1.45; }.rate-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.inline-controls { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .55rem; }.inline-controls label { width: 10rem; }.inline-select { width: 10.5rem; }.trend-panel { border: 1px solid rgb(226 232 240); border-radius: .5rem; background: white; padding: .8rem; }.trend-chart { height: 12rem; }.trend-chart svg { width: 100%; height: 100%; overflow: visible; }.trend-axis { stroke: rgb(203 213 225); stroke-width: .55; }.trend-line { stroke: rgb(8 145 178); stroke-width: 1.25; vector-effect: non-scaling-stroke; }.trend-point { fill: rgb(8 145 178); }.trend-buckets { display: grid; grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); gap: .45rem; margin: .7rem 0 0; padding: 0; list-style: none; }.trend-buckets li { display: grid; min-width: 0; gap: .25rem; border-top: 1px solid rgb(226 232 240); padding-top: .45rem; }.trend-buckets strong { color: rgb(71 85 105); font-size: .67rem; }.trend-buckets b { color: rgb(30 41 59); font-size: .76rem; }.trend-buckets small { color: rgb(100 116 139); font-size: .62rem; line-height: 1.4; }.chart-empty { border: 1px dashed rgb(203 213 225); border-radius: .45rem; padding: 1rem; color: rgb(100 116 139); font-size: .74rem; text-align: center; }
.breakdown-table { border: 1px solid rgb(226 232 240); border-radius: .5rem; overflow: hidden; }.breakdown-table__head,.breakdown-table__row { display: grid; grid-template-columns: minmax(9rem, 1.2fr) minmax(6rem, .8fr) minmax(6rem, .65fr) minmax(5rem, .55fr) minmax(10rem, 1.2fr); gap: .75rem; align-items: center; padding: .6rem .75rem; }.breakdown-table__head { background: rgb(248 250 252); color: rgb(100 116 139); font-size: .65rem; font-weight: 850; }.breakdown-table__row { border-top: 1px solid rgb(226 232 240); color: rgb(71 85 105); font-size: .71rem; }.breakdown-table__row strong { overflow: hidden; color: rgb(30 41 59); text-overflow: ellipsis; white-space: nowrap; }.breakdown-table__row small { color: rgb(100 116 139); font-size: .64rem; line-height: 1.4; }
@media (max-width: 960px) { .filter-bar { grid-template-columns: repeat(3, minmax(0, 1fr)); }.watermark-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }.funnel-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }.duration-row { grid-template-columns: 1fr; gap: .55rem; }.duration-row dl { max-width: 38rem; }.rate-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .analytics-main { padding-top: 1.25rem; }.page-header,.section-heading,.projection-state { flex-direction: column; }.filter-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }.filter-bar label:nth-child(5),.filter-bar label:nth-child(6) { grid-column: span 2; }.projection-state small,.section-heading > small { white-space: normal; text-align: left; }.watermark-strip,.funnel-grid,.rate-grid { grid-template-columns: 1fr; }.duration-row dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }.inline-controls { width: 100%; justify-content: stretch; }.inline-controls label,.inline-select { flex: 1; width: auto; }.breakdown-table { overflow-x: auto; }.breakdown-table__head,.breakdown-table__row { min-width: 44rem; } }
.dark .analytics-page { background: rgb(2 6 23); }.dark .page-header h1,.dark .section-heading h2,.dark .metric-card > strong,.dark .duration-row > div strong,.dark .duration-row dd,.dark .trend-buckets b,.dark .breakdown-table__row strong { color: rgb(248 250 252); }.dark .page-header span,.dark .watermark-item small,.dark .metric-card > small,.dark .duration-row > small,.dark .trend-buckets small,.dark .breakdown-table__row small { color: rgb(148 163 184); }.dark .filter-bar,.dark .section-block,.dark .duration-row,.dark .trend-buckets li,.dark .breakdown-table__row { border-color: rgb(30 41 59); }.dark .filter-bar input,.dark .filter-bar select,.dark .inline-controls select,.dark .inline-select select,.dark .icon-button,.dark .secondary-button,.dark .metric-card,.dark .trend-panel,.dark .breakdown-table { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }.dark .watermark-item strong,.dark .watermark-item span,.dark .metric-card__head,.dark .duration-row dt,.dark .trend-buckets strong,.dark .breakdown-table__row { color: rgb(203 213 225); }.dark .breakdown-table__head { background: rgb(15 23 42); color: rgb(148 163 184); }.dark .chart-empty,.dark .state { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(148 163 184); }.dark .trend-axis { stroke: rgb(51 65 85); }
</style>
