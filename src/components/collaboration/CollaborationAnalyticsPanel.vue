<template>
  <section class="analytics-panel" data-collaboration-analytics-panel>
    <header class="panel-header">
      <div>
        <p class="eyebrow">运营读侧</p>
        <h2>协作需求漏斗</h2>
        <p>只展示服务端快照中的事实指标，口径和数据状态会随快照一起保留。</p>
      </div>
      <button
        v-if="authStore.isLoggedIn"
        type="button"
        class="icon-button"
        title="刷新协作需求漏斗"
        aria-label="刷新协作需求漏斗"
        :disabled="loading"
        @click="load"
      >
        <RefreshCw class="icon" :class="{ spin: loading }" aria-hidden="true" />
      </button>
    </header>

    <section v-if="!authStore.ready" class="state state-loading" aria-label="正在确认账号状态">
      <Loader2 class="icon spin" aria-hidden="true" />
      <span>正在确认当前账号</span>
    </section>

    <section v-else-if="!authStore.isLoggedIn" class="state state-login" data-analytics-login>
      <LockKeyhole class="icon-large" aria-hidden="true" />
      <div>
        <strong>登录后才能读取运营洞察</strong>
        <p>此面板由服务端权限控制，不在浏览器内猜测账号角色。</p>
      </div>
      <button type="button" class="primary-button" @click="requireLogin()">
        <LogIn class="icon" aria-hidden="true" />
        登录
      </button>
    </section>

    <section v-else class="analytics-body">
      <form class="filters" @submit.prevent="load">
        <label>
          <span>时间窗口</span>
          <select v-model.number="days" aria-label="选择时间窗口">
            <option :value="7">最近 7 天</option>
            <option :value="30">最近 30 天</option>
            <option :value="90">最近 90 天</option>
          </select>
        </label>
        <label>
          <span>领域</span>
          <select v-model="domain" aria-label="选择协作领域">
            <option value="">全部领域</option>
            <option v-for="item in localDomainConfigs" :key="item.domain" :value="String(item.domain)">
              {{ item.domainName }}
            </option>
          </select>
        </label>
        <button type="submit" class="primary-button" :disabled="loading">
          <RefreshCw class="icon" :class="{ spin: loading }" aria-hidden="true" />
          读取快照
        </button>
      </form>

      <section v-if="loading" class="metric-skeleton" aria-label="正在读取协作运营指标">
        <div v-for="item in 6" :key="item" class="skeleton-box" />
      </section>

      <section v-else-if="errorText" class="state state-error" data-analytics-state-error>
        <ShieldAlert class="icon-large" aria-hidden="true" />
        <div>
          <strong>{{ permissionDenied ? '当前账号没有访问权限' : '运营洞察暂时无法读取' }}</strong>
          <p>{{ errorText }}</p>
        </div>
        <button v-if="!permissionDenied" type="button" class="secondary-button" @click="load">
          <RefreshCw class="icon" aria-hidden="true" />
          重试
        </button>
      </section>

      <section v-else-if="!funnel" class="state state-empty" data-analytics-empty>
        <BarChart3 class="icon-large" aria-hidden="true" />
        <strong>当前没有可用的运营快照</strong>
        <p>服务端返回空数据时保留为空态，不用本地估算替代。</p>
      </section>

      <template v-else>
        <div v-if="funnel.degraded" class="notice notice-warning" data-analytics-degraded>
          <AlertTriangle class="icon" aria-hidden="true" />
          <span>{{ funnel.degradationReasons.join('；') || '当前快照不完整，请结合数据状态谨慎解读。' }}</span>
        </div>

        <section class="metric-groups">
          <div class="metric-group">
            <div class="group-heading">
              <h3>需求状态</h3>
              <span>服务端去重后的需求数量</span>
            </div>
            <div class="metric-grid">
              <article v-for="metric in stageMetrics" :key="metric.label" class="metric-item">
                <span>{{ metric.label }}</span>
                <strong>{{ countText(metric.value) }}</strong>
              </article>
            </div>
          </div>

          <div class="metric-group">
            <div class="group-heading">
              <h3>转化事实</h3>
              <span>比例为空时遵循服务端空分母口径</span>
            </div>
            <div class="metric-grid">
              <article v-for="metric in rateMetrics" :key="metric.label" class="metric-item">
                <span>{{ metric.label }}</span>
                <strong>{{ rateText(metric.value) }}</strong>
              </article>
            </div>
          </div>

          <div class="metric-group">
            <div class="group-heading">
              <h3>处理时长</h3>
              <span>已完成阶段的平均耗时</span>
            </div>
            <div class="metric-grid metric-grid-short">
              <article v-for="metric in durationMetrics" :key="metric.label" class="metric-item">
                <span>{{ metric.label }}</span>
                <strong>{{ durationText(metric.value) }}</strong>
              </article>
            </div>
          </div>
        </section>

        <dl class="snapshot-meta">
          <div>
            <dt>窗口</dt>
            <dd>{{ dateText(funnel.windowStart) }} - {{ dateText(funnel.windowEnd) }}</dd>
          </div>
          <div>
            <dt>时区</dt>
            <dd>{{ funnel.timezone || '未提供' }}</dd>
          </div>
          <div>
            <dt>去重口径</dt>
            <dd>{{ funnel.deduplicationPolicy || '未提供' }}</dd>
          </div>
          <div>
            <dt>空分母</dt>
            <dd>{{ funnel.emptyDenominatorPolicy || '未提供' }}</dd>
          </div>
          <div>
            <dt>数据新鲜度</dt>
            <dd>{{ funnel.dataFreshness || '未提供' }}</dd>
          </div>
        </dl>
      </template>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  LockKeyhole,
  LogIn,
  RefreshCw,
  ShieldAlert,
} from 'lucide-vue-next'
import {
  collaborationAnalyticsApi,
  type CollaborationNeedFunnel,
} from '@/api/collaborationAnalytics'
import { BizException, getErrorMessage } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const days = ref(30)
const domain = ref('')
const funnel = ref<CollaborationNeedFunnel | null>(null)
const loading = ref(false)
const errorText = ref('')
const permissionDenied = ref(false)
const accountGeneration = ref(0)
const requestId = ref(0)
let controller: AbortController | null = null
let disposed = false

const currentUid = () => String(authStore.user?.uid ?? '')
const selectedDomain = computed(() => {
  const parsed = Number(domain.value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
})

const stageMetrics = computed(() => [
  { label: '创建需求', value: funnel.value?.createdNeedCount },
  { label: '已认领', value: funnel.value?.claimedNeedCount },
  { label: '已提交', value: funnel.value?.submittedNeedCount },
  { label: '已验收', value: funnel.value?.acceptedNeedCount },
  { label: '被退回', value: funnel.value?.rejectedNeedCount },
  { label: '再次提交', value: funnel.value?.resubmittedNeedCount },
  { label: '已释放', value: funnel.value?.releasedNeedCount },
  { label: '重新认领', value: funnel.value?.reclaimedNeedCount },
  { label: '当前认领中', value: funnel.value?.activeClaimedNeedCount },
  { label: '当前停滞', value: funnel.value?.stalledNeedCount },
  { label: '被关注', value: funnel.value?.followedNeedCount },
  { label: '关注后认领', value: funnel.value?.followedToClaimedNeedCount },
  { label: '维护任务', value: funnel.value?.maintenanceTaskCount },
  { label: '维护完成', value: funnel.value?.completedMaintenanceTaskCount },
])

const rateMetrics = computed(() => [
  { label: '认领率', value: funnel.value?.claimRate },
  { label: '提交率', value: funnel.value?.submitRate },
  { label: '验收率', value: funnel.value?.acceptanceRate },
  { label: '退回后再提交', value: funnel.value?.rejectionResubmissionRate },
  { label: '释放率', value: funnel.value?.releaseRate },
  { label: '重新认领率', value: funnel.value?.reclaimRate },
  { label: '停滞率', value: funnel.value?.stalledRate },
  { label: '关注后认领率', value: funnel.value?.followedToClaimedRate },
  { label: '维护完成率', value: funnel.value?.maintenanceCompletionRate },
])

const durationMetrics = computed(() => [
  { label: '创建到认领', value: funnel.value?.averageCreateToClaimSeconds },
  { label: '认领到提交', value: funnel.value?.averageClaimToSubmitSeconds },
  { label: '提交到验收', value: funnel.value?.averageSubmitToAcceptSeconds },
])

const abortRequest = () => {
  controller?.abort()
  controller = null
}

const clearState = () => {
  funnel.value = null
  errorText.value = ''
  permissionDenied.value = false
  loading.value = false
}

const isCurrent = (generation: number, uid: string, id: number) => (
  !disposed
  && generation === accountGeneration.value
  && id === requestId.value
  && uid === currentUid()
  && authStore.isLoggedIn
)

const load = async () => {
  if (!authStore.isLoggedIn) {
    clearState()
    return
  }

  const generation = accountGeneration.value
  const uid = currentUid()
  const id = requestId.value + 1
  requestId.value = id
  abortRequest()
  const nextController = new AbortController()
  controller = nextController
  loading.value = true
  errorText.value = ''
  permissionDenied.value = false
  funnel.value = null

  try {
    const result = await collaborationAnalyticsApi.analytics.needFunnel(
      { days: days.value, domain: selectedDomain.value },
      { signal: nextController.signal },
    )
    if (!isCurrent(generation, uid, id)) return
    funnel.value = result.data
  } catch (error) {
    if (!isCurrent(generation, uid, id) || nextController.signal.aborted) return
    permissionDenied.value = error instanceof BizException
      ? error.code === 10403
      : Number((error as { response?: { status?: number } })?.response?.status) === 403
    errorText.value = getErrorMessage(error, '协作运营指标暂时无法读取')
    funnel.value = null
  } finally {
    if (isCurrent(generation, uid, id)) loading.value = false
    if (controller === nextController) controller = null
  }
}

const invalidate = () => {
  accountGeneration.value += 1
  requestId.value += 1
  abortRequest()
  clearState()
}

const countText = (value: number | null | undefined) => (
  value == null ? '—' : new Intl.NumberFormat('zh-CN').format(value)
)

const rateText = (value: number | null | undefined) => (
  value == null ? '—' : `${(value * 100).toFixed(1)}%`
)

const durationText = (value: number | null | undefined) => {
  if (value == null) return '—'
  if (value < 60) return `${Math.round(value)} 秒`
  const minutes = Math.round(value / 60)
  if (minutes < 60) return `${minutes} 分钟`
  return `${(minutes / 60).toFixed(1)} 小时`
}

const dateText = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

watch(
  [() => authStore.ready, () => authStore.isLoggedIn, () => authStore.user?.uid, () => authStore.token],
  () => {
    invalidate()
    if (authStore.ready && authStore.isLoggedIn) void load()
  },
  { immediate: true, flush: 'sync' },
)

onUnmounted(() => {
  disposed = true
  invalidate()
})
</script>

<style scoped>
.analytics-panel {
  min-width: 0;
}

.panel-header,
.state,
.notice,
.group-heading {
  display: flex;
  align-items: center;
}

.panel-header {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.eyebrow {
  margin: 0 0 0.15rem;
  color: var(--primary-700);
  font-size: 0.72rem;
  font-weight: 800;
}

.panel-header h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.25rem;
  font-weight: 900;
  text-wrap: balance;
}

.panel-header p:last-child {
  max-width: 68ch;
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.55;
}

.icon {
  width: 1rem;
  height: 1rem;
  flex: none;
}

.icon-large {
  width: 1.35rem;
  height: 1.35rem;
  flex: none;
}

.icon-button,
.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.4rem;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: var(--radius-control);
  padding: 0 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
}

.icon-button {
  width: 2.4rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.primary-button {
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
}

.secondary-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.state {
  min-height: 8rem;
  justify-content: center;
  gap: 0.8rem;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 1.4rem;
  color: var(--text-muted);
  text-align: left;
}

.state strong {
  display: block;
  color: var(--text-strong);
  font-size: 0.92rem;
}

.state p {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.state-login {
  justify-content: flex-start;
}

.state-login > .icon-large {
  color: var(--primary-600);
}

.state-error {
  border-style: solid;
  border-color: rgb(254 202 202);
  color: rgb(185 28 28);
}

.state-error .icon-large {
  color: rgb(220 38 38);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.65rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-2);
  padding: 0.75rem;
}

.filters label {
  display: grid;
  min-width: 9rem;
  gap: 0.3rem;
}

.filters label span {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.filters select {
  min-height: 2.4rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--text-primary);
  padding: 0 0.55rem;
  font-size: 0.78rem;
}

.filters .primary-button {
  margin-left: auto;
}

.metric-skeleton {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

.skeleton-box {
  min-height: 5rem;
  border-radius: 0.55rem;
  background: var(--surface-3);
  animation: pulse 1.4s ease-in-out infinite;
}

.notice {
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.55rem;
  background: rgb(254 252 232);
  padding: 0.7rem 0.8rem;
  color: rgb(133 77 14);
  font-size: 0.76rem;
  line-height: 1.5;
}

.metric-groups {
  display: grid;
  gap: 1rem;
}

.metric-group {
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.9rem;
}

.group-heading {
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.65rem;
}

.group-heading h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.9rem;
  font-weight: 900;
}

.group-heading span {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.metric-grid-short {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-item {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.55rem;
  background: var(--surface);
  padding: 0.7rem;
}

.metric-item span {
  display: block;
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.35;
}

.metric-item strong {
  display: block;
  margin-top: 0.4rem;
  color: var(--text-strong);
  font-size: 1.18rem;
  font-weight: 900;
}

.snapshot-meta {
  display: grid;
  gap: 0.55rem;
  margin: 1rem 0 0;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.9rem;
}

.snapshot-meta div {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 0.7rem;
}

.snapshot-meta dt {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.snapshot-meta dd {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--text-primary);
  font-size: 0.75rem;
  line-height: 1.45;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  50% { opacity: 0.45; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .spin,
  .skeleton-box {
    animation: none;
  }
}

@media (max-width: 820px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .state-login {
    flex-wrap: wrap;
  }

  .state-login > div {
    flex: 1 1 calc(100% - 2.5rem);
  }

  .state-login .primary-button {
    margin-left: 2.15rem;
  }

  .filters label {
    flex: 1 1 8rem;
  }

  .filters .primary-button {
    margin-left: 0;
  }

  .metric-skeleton,
  .metric-grid,
  .metric-grid-short {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .group-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.2rem;
  }
}
</style>
