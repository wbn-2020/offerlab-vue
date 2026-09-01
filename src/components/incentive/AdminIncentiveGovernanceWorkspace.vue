<template>
  <div class="governance-workspace">
    <section class="reason-band">
      <label>
        <span>治理操作理由</span>
        <textarea v-model.trim="reason" class="field-control" rows="2" maxlength="500" placeholder="审核、扫描和处置均需填写可审计理由。" />
      </label>
      <span :class="['status-pill', reasonReady ? 'status-ok' : 'status-warn']">{{ reasonReady ? '理由已填写' : '理由未填写' }}</span>
    </section>

    <div class="governance-grid">
      <section class="governance-panel">
        <div class="panel-heading">
          <div><h2><Undo2 class="h-5 w-5" />奖励申诉</h2><p>通过后生成恢复流水，不修改历史流水。</p></div>
          <select v-model="appealStatus" class="field-control compact-control" @change="loadAppeals">
            <option value="SUBMITTED">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已拒绝</option><option value="">全部</option>
          </select>
        </div>
        <StateBlock :loading="appealState.loading" :error="appealState.error" :empty="appeals.items.length === 0" @retry="loadAppeals" />
        <div v-if="!appealState.loading && !appealState.error" class="dense-list">
          <article v-for="item in appeals.items" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title"><span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span><strong>{{ item.targetType }} #{{ item.targetId }}</strong></div>
              <p>{{ item.appealReason }}</p>
              <small>申诉人 {{ item.appellantUid }}<template v-if="item.relatedLedgerId"> · 关联流水 #{{ item.relatedLedgerId }}</template><template v-if="item.relatedRecoveryDebtId"> · 关联恢复债务 #{{ item.relatedRecoveryDebtId }}</template><template v-if="item.restoreEntryId"> · 恢复流水 #{{ item.restoreEntryId }}</template></small>
              <small v-if="item.reviewReason">审核说明：{{ item.reviewReason }}</small>
            </div>
            <div v-if="item.status === 'SUBMITTED'" class="row-actions">
              <button type="button" class="primary-button compact" :disabled="!canMutate" @click="reviewAppeal(item.id, true)"><Check class="h-4 w-4" />通过</button>
              <button type="button" class="danger-button compact" :disabled="!canMutate" @click="reviewAppeal(item.id, false)"><X class="h-4 w-4" />拒绝</button>
            </div>
          </article>
        </div>
      </section>

      <section class="governance-panel">
        <div class="panel-heading">
          <div><h2><Scale class="h-5 w-5" />悬赏申诉复核</h2><p>原审核人禁止复核自己的结果，服务端会强制校验并执行预算补偿。</p></div>
          <select v-model="bountyAppealStatus" class="field-control compact-control" @change="loadBountyAppeals">
            <option value="SUBMITTED">待复核</option><option value="APPROVED">已推翻</option><option value="REJECTED">维持原判</option><option value="">全部</option>
          </select>
        </div>
        <StateBlock :loading="bountyAppealState.loading" :error="bountyAppealState.error" :empty="bountyAppeals.items.length === 0" @retry="loadBountyAppeals" />
        <div v-if="!bountyAppealState.loading && !bountyAppealState.error" class="dense-list">
          <article v-for="item in bountyAppeals.items" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title"><span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span><strong>提交 #{{ item.submissionId }}</strong><span class="meta-chip">原结果 {{ statusLabel(item.originalStatus) }}</span></div>
              <p>{{ item.appealReason }}</p>
              <small>申请人 {{ item.applicantUid }} · 原审核人 {{ item.originalReviewerUid || '--' }}<template v-if="item.compensationEntryId"> · 补偿流水 #{{ item.compensationEntryId }}</template></small>
              <small v-if="item.reviewReason">复核说明：{{ item.reviewReason }}</small>
            </div>
            <div v-if="item.status === 'SUBMITTED'" class="row-actions">
              <button type="button" class="primary-button compact" :disabled="!canMutate" @click="reviewBountyAppeal(item.id, true)"><Check class="h-4 w-4" />推翻原结果</button>
              <button type="button" class="danger-button compact" :disabled="!canMutate" @click="reviewBountyAppeal(item.id, false)"><X class="h-4 w-4" />维持原结果</button>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section class="governance-panel">
      <div class="panel-heading">
        <div><h2><ScanSearch class="h-5 w-5" />异常贡献风险</h2><p>扫描互惠互动、固定对象重复、小时突增、头部集中和频道偏差；命中只进入人工处置，不自动处罚。</p></div>
        <div class="filters">
          <select v-model="findingStatus" class="field-control compact-control" @change="loadFindings">
            <option value="OPEN">待处置</option><option value="RESOLVED">已解决</option><option value="IGNORED">已忽略</option><option value="">全部</option>
          </select>
          <button type="button" class="icon-button" title="刷新风险发现" :disabled="riskState.loading" @click="loadFindings"><RefreshCw class="h-4 w-4" :class="{ 'animate-spin': riskState.loading }" /></button>
        </div>
      </div>

      <form class="scan-form" @submit.prevent="runRiskScan">
        <label><span>扫描类型</span><select v-model="scanForm.scanType" class="field-control">
          <option value="RECIPROCITY">互惠互动数据缺失</option><option value="DUPLICATE_REFERENCE">重复引用</option><option value="HOURLY_REWARD_SPIKE">小时奖励突增</option><option value="TOP_USER_CONCENTRATION">头部用户集中度</option><option value="DOMAIN_REWARD_CONTRIBUTION_RATIO">频道奖励贡献比例</option>
        </select></label>
        <label><span>扫描上限</span><input v-model.number="scanForm.limit" class="field-control" type="number" min="1" max="500"></label>
        <button type="submit" class="primary-button" :disabled="!canMutate"><ScanSearch class="h-4 w-4" />执行扫描</button>
        <span v-if="lastScan" class="scan-result">运行 #{{ lastScan.runId }} · 扫描 {{ lastScan.scannedCount }} · 发现 {{ lastScan.findingCount }} · {{ lastScan.coverageComplete ? '本周期完成' : `下个游标 ${lastScan.nextCursor || '--'}` }}</span>
      </form>

      <StateBlock :loading="riskState.loading" :error="riskState.error" :empty="findings.items.length === 0" @retry="loadFindings" />
      <div v-if="!riskState.loading && !riskState.error" class="dense-list">
        <article v-for="item in findings.items" :key="String(item.id)" class="dense-row">
          <div class="row-main">
            <div class="row-title">
              <span :class="['status-pill', severityClass(item.severity)]">{{ item.severity }}</span>
              <span :class="['status-pill', statusClass(item.findingStatus)]">{{ item.findingStatus }}</span>
              <strong>{{ item.findingType }}</strong>
              <span v-if="item.domainCode" class="meta-chip">{{ item.domainCode }}</span>
            </div>
            <p>{{ item.subjectType }} {{ item.subjectId }} · 指标 {{ item.metricValue }} / 阈值 {{ item.thresholdValue }}</p>
            <small>评估 {{ item.evaluationStatus }} · 扫描 #{{ item.scanRunId }}<template v-if="item.evidenceJson"> · 证据 {{ item.evidenceJson }}</template></small>
            <small v-if="item.resolvedBy || item.resolutionReason">
              处置人 {{ item.resolvedBy || '--' }}<template v-if="item.resolutionReason"> · {{ item.resolutionReason }}</template>
            </small>
          </div>
          <div v-if="item.findingStatus === 'OPEN'" class="row-actions">
            <button type="button" class="primary-button compact" :disabled="!canMutate" @click="actOnFinding(item.id, 'resolve')"><Check class="h-4 w-4" />解决</button>
            <button type="button" class="secondary-button compact" :disabled="!canMutate" @click="actOnFinding(item.id, 'ignore')"><X class="h-4 w-4" />忽略</button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { Check, Inbox, Loader2, RefreshCw, Scale, ScanSearch, Undo2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import {
  incentiveAdminApi,
  type BountyAppeal,
  type IncentiveAppeal,
  type PageResult,
  type RiskFinding,
  type RiskScanResult,
} from '@/api/incentives'
import type { ApiId } from '@/api/types'

type LoadState = { loading: boolean; error: string; requestId: number }
const state = (): LoadState => reactive({ loading: false, error: '', requestId: 0 })
const emptyPage = <T,>(): PageResult<T> => ({ items: [], nextCursor: null, hasMore: false, total: 0 })
const StateBlock = defineComponent({
  props: { loading: Boolean, error: { type: String, default: '' }, empty: Boolean },
  emits: ['retry'],
  setup(props, { emit }) {
    return () => {
      if (props.loading) return h('div', { class: 'state-block' }, [h(Loader2, { class: 'h-4 w-4 animate-spin' }), '正在加载'])
      if (props.error) return h('div', { class: 'state-block state-error' }, [
        h('span', props.error),
        h('button', { type: 'button', class: 'secondary-button compact', onClick: () => emit('retry') }, '重试'),
      ])
      if (props.empty) return h('div', { class: 'state-block' }, [h(Inbox, { class: 'h-4 w-4' }), '当前队列为空'])
      return null
    }
  },
})

const reason = ref('')
const appealStatus = ref('SUBMITTED')
const bountyAppealStatus = ref('SUBMITTED')
const findingStatus = ref('OPEN')
const appealState = state()
const bountyAppealState = state()
const riskState = state()
const appeals = ref<PageResult<IncentiveAppeal>>(emptyPage())
const bountyAppeals = ref<PageResult<BountyAppeal>>(emptyPage())
const findings = ref<PageResult<RiskFinding>>(emptyPage())
const pendingAction = ref('')
const lastScan = ref<RiskScanResult | null>(null)
const scanForm = reactive({ scanType: 'HOURLY_REWARD_SPIKE', limit: 200 })
const RISK_FINDING_RETENTION_LIMIT = 300
const RISK_FINDING_PAGE_SIZE = 100
const RISK_FINDING_PAGE_COUNT = RISK_FINDING_RETENTION_LIMIT / RISK_FINDING_PAGE_SIZE
const QUEUE_RETENTION_LIMIT = 300
const QUEUE_PAGE_SIZE = 50
const reasonReady = computed(() => reason.value.length >= 2)
const canMutate = computed(() => reasonReady.value && !pendingAction.value)

const runLoad = async (
  target: LoadState,
  task: (isCurrent: () => boolean) => Promise<void>,
  fallback: string,
) => {
  const requestId = ++target.requestId
  const isCurrent = () => target.requestId === requestId
  target.loading = true
  target.error = ''
  try {
    await task(isCurrent)
  } catch (error) {
    if (isCurrent()) target.error = getErrorMessage(error, fallback)
  } finally {
    if (isCurrent()) target.loading = false
  }
}
const runAction = async (key: string, task: () => Promise<void>, success: string) => {
  if (!canMutate.value) return
  pendingAction.value = key
  try {
    await task()
    toast.success(success)
    reason.value = ''
  } catch (error) {
    toast.error(getErrorMessage(error, '激励治理操作失败'))
  } finally {
    pendingAction.value = ''
  }
}
const collectPages = async <T,>(
  request: (page: number) => Promise<{ data: PageResult<T> | null }>,
): Promise<PageResult<T>> => {
  const collected: T[] = []
  let latest = emptyPage<T>()
  for (let page = 1; page <= QUEUE_RETENTION_LIMIT / QUEUE_PAGE_SIZE; page += 1) {
    const response = await request(page)
    latest = response.data || emptyPage<T>()
    collected.push(...latest.items)
    if (!latest.hasMore || latest.items.length === 0 || collected.length >= QUEUE_RETENTION_LIMIT) break
  }
  const items = collected.slice(0, QUEUE_RETENTION_LIMIT)
  return {
    ...latest,
    items,
    total: Math.max(Number(latest.total || 0), collected.length),
    hasMore: items.length < QUEUE_RETENTION_LIMIT && latest.hasMore,
    nextCursor: items.length < QUEUE_RETENTION_LIMIT ? latest.nextCursor : null,
  }
}

const loadAppeals = () => runLoad(appealState, async (isCurrent) => {
  const result = await collectPages((page) => incentiveAdminApi.listAppeals({
    status: appealStatus.value || undefined, page, size: QUEUE_PAGE_SIZE,
  }))
  if (isCurrent()) appeals.value = result
}, '奖励申诉队列加载失败')
const loadBountyAppeals = () => runLoad(bountyAppealState, async (isCurrent) => {
  const result = await collectPages((page) => incentiveAdminApi.listBountyAppeals({
    status: bountyAppealStatus.value || undefined, page, size: QUEUE_PAGE_SIZE,
  }))
  if (isCurrent()) bountyAppeals.value = result
}, '悬赏申诉队列加载失败')
const loadFindings = () => runLoad(riskState, async (isCurrent) => {
  const retained: RiskFinding[] = []
  const seenIds = new Set<string>()
  let latestPage = emptyPage<RiskFinding>()

  for (let page = 1; page <= RISK_FINDING_PAGE_COUNT; page += 1) {
    if (!isCurrent()) return
    const response = await incentiveAdminApi.listRiskFindings({
      status: findingStatus.value || undefined,
      page,
      size: RISK_FINDING_PAGE_SIZE,
    })
    latestPage = response.data || emptyPage()
    for (const item of latestPage.items) {
      const key = String(item.id)
      if (!seenIds.has(key)) {
        seenIds.add(key)
        retained.push(item)
      }
    }
    if (!latestPage.hasMore || retained.length >= RISK_FINDING_RETENTION_LIMIT) break
  }

  if (!isCurrent()) return
  findings.value = {
    ...latestPage,
    items: retained.slice(0, RISK_FINDING_RETENTION_LIMIT),
    total: Math.max(Number(latestPage.total), retained.length),
    hasMore: latestPage.hasMore || Number(latestPage.total) > RISK_FINDING_RETENTION_LIMIT,
  }
}, '风险发现队列加载失败')
const reviewAppeal = (id: ApiId, approved: boolean) => runAction(`appeal:${id}`, async () => {
  await incentiveAdminApi.reviewAppeal(id, { approved, reason: reason.value })
  await loadAppeals()
}, approved ? '奖励申诉已通过' : '奖励申诉已拒绝')
const reviewBountyAppeal = (id: ApiId, approved: boolean) => runAction(`bounty-appeal:${id}`, async () => {
  await incentiveAdminApi.reviewBountyAppeal(id, { approved, reason: reason.value })
  await loadBountyAppeals()
}, approved ? '悬赏原结果已推翻' : '悬赏原结果已维持')
const runRiskScan = () => runAction('risk-scan', async () => {
  const response = await incentiveAdminApi.scanRisk({ scanType: scanForm.scanType, limit: scanForm.limit, reason: reason.value })
  lastScan.value = response.data || null
  await loadFindings()
}, '风险扫描已完成')
const actOnFinding = (id: ApiId, action: 'resolve' | 'ignore') => runAction(`finding:${id}:${action}`, async () => {
  if (action === 'resolve') {
    await incentiveAdminApi.resolveRiskFinding(id, { reason: reason.value })
  } else {
    await incentiveAdminApi.ignoreRiskFinding(id, { reason: reason.value })
  }
  await loadFindings()
}, action === 'resolve' ? '风险发现已解决' : '风险发现已忽略')

const statusLabel = (value: string) => ({
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  OPEN: '待处置',
  RESOLVED: '已解决',
  IGNORED: '已忽略',
}[value] || value)
const statusClass = (value: string) => {
  if (['APPROVED', 'RESOLVED'].includes(value)) return 'status-ok'
  if (['REJECTED'].includes(value)) return 'status-danger'
  if (['SUBMITTED', 'OPEN'].includes(value)) return 'status-warn'
  return 'status-muted'
}
const severityClass = (value: string) => value === 'HIGH' ? 'status-danger' : value === 'MEDIUM' ? 'status-warn' : 'status-muted'

onMounted(() => {
  void Promise.all([loadAppeals(), loadBountyAppeals(), loadFindings()])
})
</script>

<style scoped>
.governance-workspace,
.dense-list {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.reason-band {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  gap: 1rem;
  border: 1px solid rgb(253 230 138);
  border-radius: 0.75rem;
  background: rgb(255 251 235);
  padding: 0.9rem;
}

.reason-band label {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 0.35rem;
  color: rgb(120 53 15);
  font-size: 0.76rem;
  font-weight: 800;
}

.governance-grid {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.governance-panel {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-heading,
.filters,
.row-title,
.row-actions,
.scan-form {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.panel-heading {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 900;
}

.panel-heading h2 svg {
  color: rgb(18 99 74);
}

.panel-heading p {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.76rem;
  line-height: 1.45;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.55rem 0.65rem;
  color: var(--text-strong);
  font-size: 0.78rem;
  outline: none;
}

.compact-control {
  width: auto;
  min-width: 9rem;
}

.dense-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.75rem;
}

.dense-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-title {
  flex-wrap: wrap;
}

.row-title strong {
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.82rem;
  font-weight: 900;
}

.row-main p,
.row-main small {
  display: block;
  margin-top: 0.32rem;
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.scan-form {
  flex-wrap: wrap;
  align-items: flex-end;
  margin-bottom: 1rem;
}

.scan-form label {
  display: grid;
  min-width: 10rem;
  flex: 1;
  gap: 0.35rem;
  color: var(--text-primary);
  font-size: 0.74rem;
  font-weight: 800;
}

.scan-result {
  flex: 1 1 100%;
  color: var(--text-primary);
  font-size: 0.72rem;
}

.status-pill,
.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.66rem;
  font-weight: 900;
}

.meta-chip,
.status-muted {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.primary-button,
.secondary-button,
.danger-button,
.icon-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.48rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.primary-button {
  border: 1px solid rgb(18 99 74);
  background: rgb(18 99 74);
  color: white;
}

.secondary-button,
.icon-button {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.danger-button {
  border: 1px solid rgb(220 38 38);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.compact {
  min-height: 34px;
  padding: 0.35rem 0.55rem;
}

.icon-button {
  height: 38px;
  width: 38px;
  padding: 0;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.state-block {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border: 1px dashed var(--border-subtle);
  border-radius: 0.5rem;
  background: var(--surface-soft);
  padding: 0.7rem;
  color: var(--text-primary);
  font-size: 0.74rem;
}

.state-error {
  border-style: solid;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

@media (min-width: 960px) {
  .governance-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .reason-band,
  .panel-heading,
  .dense-row {
    align-items: stretch;
    flex-direction: column;
  }

  .compact-control {
    width: 100%;
  }

  .row-actions {
    justify-content: flex-start;
  }
}

.dark .governance-panel,
.dark .field-control,
.dark .secondary-button,
.dark .icon-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .panel-heading h2,
.dark .row-title strong {
  color: var(--text-strong);
}

.dark .panel-heading p,
.dark .scan-form label {
  color: var(--text-muted);
}

.dark .dense-row {
  border-color: var(--border-subtle);
}
</style>
