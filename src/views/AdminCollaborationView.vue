<template>
  <div class="admin-collaboration-page min-h-screen">
    <AppHeader />
    <main class="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6 sm:py-8">
      <header class="page-header">
        <div>
          <p>Stage 2 治理</p>
          <h1>公共共建治理</h1>
          <span>审核频道策展结果，处理需求、合集、活动、讨论和经验交流相关举报与申诉。</span>
        </div>
        <button type="button" class="secondary-button" :disabled="loadingAny" @click="refreshAll">
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingAny }" />刷新队列
        </button>
      </header>

      <section class="permission-band" :class="{ danger: permissionError }">
        <ShieldCheck v-if="!permissionError" class="h-5 w-5" />
        <ShieldAlert v-else class="h-5 w-5" />
        <div>
          <strong>{{ permissionError ? '权限核验失败' : permissionLabel }}</strong>
          <p>{{ permissionError || '服务端会按领域审核范围、案件自审限制和状态机再次校验。' }}</p>
        </div>
      </section>

      <section class="reason-band">
        <label>
          <span>本次审核说明</span>
          <textarea v-model.trim="reviewNote" class="field-control" rows="2" maxlength="1000" placeholder="通过或驳回前填写依据；成功后自动清空。" />
        </label>
        <span :class="['status-pill', reviewNote.length >= 2 ? 'status-ok' : 'status-warn']">
          {{ reviewNote.length >= 2 ? '说明已填写' : '说明未填写' }}
        </span>
      </section>

      <nav class="tab-bar" aria-label="共建治理队列">
        <button type="button" :class="{ active: activeTab === 'curation' }" @click="activeTab = 'curation'">
          <ListChecks class="h-4 w-4" />策展审核
        </button>
        <button v-if="canReviewCases" type="button" :class="{ active: activeTab === 'cases' }" @click="activeTab = 'cases'">
          <ShieldAlert class="h-4 w-4" />举报与申诉
        </button>
      </nav>

      <section v-if="activeTab === 'curation'" class="queue-panel">
        <div class="panel-heading">
          <div><h2>策展审核队列</h2><p>通过后会显示实际收录对象或待执行维护任务，不只停留在审核状态。</p></div>
          <div class="filters">
            <select v-model.number="curationFilters.domain" class="field-control compact-control" @change="loadCuration">
              <option v-if="!isDomainOnlyModerator" value="">全部领域</option>
              <option v-for="domain in curationDomains" :key="domain.domain" :value="domain.domain">{{ domain.domainName }}</option>
            </select>
            <select v-model="curationFilters.status" class="field-control compact-control" @change="loadCuration">
              <option value="PENDING">待审核</option><option value="APPROVED">已通过</option><option value="REJECTED">已拒绝</option><option value="">全部</option>
            </select>
          </div>
        </div>
        <QueueState :loading="curationState.loading" :error="curationState.error" :empty="curationItems.length === 0" @retry="loadCuration" />
        <div v-if="!curationState.loading && !curationState.error" class="dense-list">
          <article v-for="item in curationItems" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(item.reviewStatus)]">{{ statusLabel(item.reviewStatus) }}</span>
                <span class="meta-chip">{{ domainLabel(item.domain) }}</span>
                <strong>{{ item.topicName || `话题 #${item.topicId}` }}</strong>
              </div>
              <p>{{ item.rationale }}</p>
              <small>建议 #{{ item.id }} · 帖子 #{{ item.postId }} · 提交人 {{ item.submitterUid }} · {{ item.suggestionType }}</small>
              <small v-if="item.resultType">结果：{{ item.resultType }}<template v-if="item.resultId"> #{{ item.resultId }}</template> · {{ item.resultStatus || '待确认' }}</small>
              <small v-if="item.reviewNote">审核说明：{{ item.reviewNote }}</small>
            </div>
            <div v-if="item.reviewStatus === 'PENDING'" class="row-actions">
              <button type="button" class="primary-button compact" :disabled="!canReview" @click="reviewCuration(item.id, 'APPROVED')"><Check class="h-4 w-4" />通过</button>
              <button type="button" class="danger-button compact" :disabled="!canReview" @click="reviewCuration(item.id, 'REJECTED')"><X class="h-4 w-4" />拒绝</button>
            </div>
          </article>
        </div>
      </section>

      <section v-else class="queue-panel">
        <div class="panel-heading">
          <div><h2>共建案件队列</h2><p>包括经验交流时段、预约与反馈案件。禁止审核自己提交的案件，申诉会校验原案件与对象归属。</p></div>
          <select v-model="caseStatus" class="field-control compact-control" @change="loadCases">
            <option value="PENDING">待审核</option><option value="UPHELD">已支持</option><option value="REJECTED">已驳回</option><option value="CLOSED">已关闭</option><option value="OVERTURNED">已推翻</option><option value="">全部</option>
          </select>
        </div>
        <QueueState :loading="caseState.loading" :error="caseState.error" :empty="caseItems.length === 0" @retry="loadCases" />
        <div v-if="!caseState.loading && !caseState.error" class="dense-list">
          <article v-for="item in caseItems" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
                <span class="meta-chip">{{ item.caseType === 'REPORT' ? '举报' : '申诉' }}</span>
                <strong>{{ targetLabel(item.targetType) }} #{{ item.targetId }}</strong>
              </div>
              <p>{{ item.detail }}</p>
              <small>案件 #{{ item.id }} · 提交人 {{ item.submitterUid }} · 原因 {{ item.reasonCode }}<template v-if="item.parentCaseId"> · 原案件 #{{ item.parentCaseId }}</template></small>
              <small v-if="item.reviewNote">审核说明：{{ item.reviewNote }}</small>
            </div>
            <div v-if="item.status === 'PENDING'" class="row-actions">
              <button type="button" class="primary-button compact" :disabled="!canReview" @click="reviewCase(item.id, 'UPHELD')"><Check class="h-4 w-4" />支持</button>
              <button type="button" class="danger-button compact" :disabled="!canReview" @click="reviewCase(item.id, 'REJECTED')"><X class="h-4 w-4" />驳回</button>
              <button type="button" class="secondary-button compact" :disabled="!canReview" @click="reviewCase(item.id, 'CLOSED')"><Archive class="h-4 w-4" />关闭</button>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import {
  Archive,
  Check,
  Inbox,
  ListChecks,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import { getErrorMessage, type Result } from '@/api/client'
import { localDomainConfigs } from '@/api/domains'
import {
  collaborationApi,
  type CurationSuggestion,
  type GovernanceCase,
  type GovernanceDecision,
  type GovernanceTargetType,
  type PageResult,
  type ReviewDecision,
} from '@/api/collaboration'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import type { ApiId } from '@/api/types'

type LoadState = { loading: boolean; error: string; requestId: number }
const loadState = (): LoadState => reactive({ loading: false, error: '', requestId: 0 })
const QueueState = defineComponent({
  props: { loading: Boolean, error: { type: String, default: '' }, empty: Boolean },
  emits: ['retry'],
  setup(props, { emit }) {
    return () => {
      if (props.loading) return h('div', { class: 'state-block' }, [h(Loader2, { class: 'h-5 w-5 animate-spin' }), '正在加载队列'])
      if (props.error) return h('div', { class: 'state-block state-error' }, [
        h('div', [h('strong', '队列加载失败'), h('p', props.error)]),
        h('button', { type: 'button', class: 'secondary-button compact', onClick: () => emit('retry') }, '重试'),
      ])
      if (props.empty) return h('div', { class: 'state-block' }, [h(Inbox, { class: 'h-5 w-5' }), h('div', [h('strong', '当前队列为空'), h('p', '调整筛选或稍后刷新。')])])
      return null
    }
  },
})

const activeTab = ref<'curation' | 'cases'>('curation')
const permissions = ref<MyAdminPermissions | null>(null)
const permissionError = ref('')
const reviewNote = ref('')
const pendingAction = ref('')
const curationState = loadState()
const caseState = loadState()
const curationItems = ref<CurationSuggestion[]>([])
const caseItems = ref<GovernanceCase[]>([])
const curationFilters = reactive<{ domain: number | ''; status: string }>({ domain: '', status: 'PENDING' })
const caseStatus = ref('PENDING')

const canModerate = computed(() => Boolean(
  permissions.value?.admin || permissions.value?.contentModerator || permissions.value?.domainModerator,
))
const canReviewCases = computed(() => Boolean(
  permissions.value?.admin || permissions.value?.contentModerator,
))
const isDomainOnlyModerator = computed(() => Boolean(
  permissions.value?.domainModerator
    && !permissions.value?.admin
    && !permissions.value?.contentModerator,
))
const curationDomains = computed(() => isDomainOnlyModerator.value
  ? localDomainConfigs.filter((item) => permissions.value?.moderatedDomains.includes(item.domain))
  : localDomainConfigs)
const canReview = computed(() => canModerate.value && reviewNote.value.length >= 2 && !pendingAction.value)
const permissionLabel = computed(() => {
  if (permissions.value?.admin) return '系统管理员'
  if (permissions.value?.contentModerator) return '内容审核员'
  if (permissions.value?.domainModerator) return `领域审核员（${permissions.value.moderatedDomains.join('、') || '范围由服务端判定'}）`
  return '当前账号没有共建治理权限'
})
const loadingAny = computed(() => curationState.loading || caseState.loading || Boolean(pendingAction.value))

const runLoad = async (
  state: LoadState,
  task: (isCurrent: () => boolean) => Promise<void>,
  fallback: string,
) => {
  const requestId = ++state.requestId
  const isCurrent = () => state.requestId === requestId
  state.loading = true
  state.error = ''
  try {
    await task(isCurrent)
  } catch (error) {
    if (isCurrent()) state.error = getErrorMessage(error, fallback)
  } finally {
    if (isCurrent()) state.loading = false
  }
}
const runReview = async (key: string, task: () => Promise<void>, success: string) => {
  if (!canReview.value) return
  pendingAction.value = key
  try {
    await task()
    toast.success(success)
    reviewNote.value = ''
  } catch (error) {
    toast.error(getErrorMessage(error, '审核操作失败'))
  } finally {
    pendingAction.value = ''
  }
}

const loadPermissions = async () => {
  permissionError.value = ''
  try {
    const response = await opsApi.myPermissions()
    permissions.value = response.data
    if (isDomainOnlyModerator.value && !curationFilters.domain) {
      curationFilters.domain = permissions.value?.moderatedDomains[0] || ''
    }
  } catch (error) {
    permissionError.value = getErrorMessage(error, '后台权限核验失败')
  }
}
const QUEUE_RETENTION_LIMIT = 300
const QUEUE_PAGE_SIZE = 50
const collectQueuePages = async <T,>(
  request: (cursor: string | number) => Promise<Result<PageResult<T>>>,
): Promise<T[]> => {
  const items: T[] = []
  let cursor: string | number = 0
  for (let page = 0; page < QUEUE_RETENTION_LIMIT / QUEUE_PAGE_SIZE; page += 1) {
    const response = await request(cursor)
    const data = response.data
    if (!data) break
    items.push(...data.items)
    if (!data.hasMore || !data.nextCursor || items.length >= QUEUE_RETENTION_LIMIT) break
    cursor = data.nextCursor
  }
  return items.slice(0, QUEUE_RETENTION_LIMIT)
}
const loadCuration = () => runLoad(curationState, async (isCurrent) => {
  const items = await collectQueuePages((cursor) => collaborationApi.curation.reviewQueue({
    domain: curationFilters.domain || undefined,
    status: curationFilters.status || undefined,
    cursor,
    size: QUEUE_PAGE_SIZE,
  }))
  if (isCurrent()) curationItems.value = items
}, '策展审核队列加载失败')
const loadCases = () => runLoad(caseState, async (isCurrent) => {
  if (!canReviewCases.value) {
    caseItems.value = []
    return
  }
  const items = await collectQueuePages((cursor) => collaborationApi.governance.reviewQueue({
    status: caseStatus.value || undefined,
    cursor,
    size: QUEUE_PAGE_SIZE,
  }))
  if (isCurrent()) caseItems.value = items
}, '共建案件队列加载失败')
const refreshAll = async () => {
  await loadPermissions()
  if (!canReviewCases.value && activeTab.value === 'cases') activeTab.value = 'curation'
  await Promise.all([
    loadCuration(),
    canReviewCases.value ? loadCases() : Promise.resolve(),
  ])
}

const reviewCuration = (id: ApiId, decision: ReviewDecision) => runReview(`curation:${id}`, async () => {
  await collaborationApi.curation.decide(id, { decision, note: reviewNote.value })
  await loadCuration()
}, decision === 'APPROVED' ? '策展建议已通过并生成结果' : '策展建议已拒绝')
const reviewCase = (id: ApiId, decision: GovernanceDecision) => runReview(`case:${id}`, async () => {
  await collaborationApi.governance.decide(id, { decision, note: reviewNote.value })
  await loadCases()
}, decision === 'UPHELD' ? '案件已支持' : decision === 'REJECTED' ? '案件已驳回' : '案件已关闭')

const domainLabel = (domain: number) => localDomainConfigs.find((item) => item.domain === domain)?.domainName || `领域 ${domain}`
const targetLabel = (value: GovernanceTargetType) => ({
  NEED: '内容需求',
  SERIES: '协作合集',
  ACTIVITY: '共创活动',
  CURATION: '策展建议',
  DISCUSSION: '结构化讨论',
  OFFICE_HOUR: '经验交流时段',
  RESERVATION: '经验交流预约',
  FEEDBACK: '经验交流反馈',
}[value] || value)
const statusLabel = (value: string) => ({
  PENDING: '待审核',
  APPROVED: '已通过',
  UPHELD: '已支持',
  REJECTED: '已驳回',
  CLOSED: '已关闭',
  OVERTURNED: '已推翻',
}[value] || value)
const statusClass = (value: string) => {
  if (['APPROVED', 'UPHELD'].includes(value)) return 'status-ok'
  if (['REJECTED'].includes(value)) return 'status-danger'
  if (['PENDING'].includes(value)) return 'status-warn'
  return 'status-muted'
}

onMounted(refreshAll)
</script>

<style scoped>
.admin-collaboration-page {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
}

.page-header,
.permission-band,
.reason-band,
.panel-heading,
.filters,
.row-title,
.row-actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
}

.page-header {
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.page-header p {
  color: rgb(14 116 144);
  font-size: 0.8rem;
  font-weight: 900;
}

.page-header h1 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 1.5rem;
  font-weight: 900;
}

.page-header span {
  display: block;
  margin-top: 0.45rem;
  max-width: 72ch;
  color: rgb(71 85 105);
  font-size: 0.82rem;
  line-height: 1.55;
}

.permission-band,
.reason-band {
  margin-bottom: 1rem;
  border: 1px solid rgb(186 230 253);
  border-radius: 0.75rem;
  background: rgb(240 249 255);
  padding: 0.85rem 1rem;
  color: rgb(3 105 161);
}

.permission-band > div {
  min-width: 0;
}

.permission-band strong {
  font-size: 0.82rem;
  font-weight: 900;
}

.permission-band p {
  margin-top: 0.2rem;
  font-size: 0.75rem;
  line-height: 1.45;
}

.permission-band.danger {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

.reason-band {
  align-items: flex-end;
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
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

.tab-bar {
  display: flex;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.tab-bar button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  color: rgb(51 65 85);
  font-size: 0.78rem;
  font-weight: 900;
}

.tab-bar button.active {
  border-color: rgb(8 145 178);
  background: rgb(236 254 255);
  color: rgb(14 116 144);
}

.queue-panel {
  min-width: 0;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-heading {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.panel-heading h2 {
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.panel-heading p {
  margin-top: 0.25rem;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  line-height: 1.5;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.5rem;
  background: white;
  padding: 0.58rem 0.65rem;
  color: rgb(15 23 42);
  font-size: 0.8rem;
  line-height: 1.45;
  outline: none;
}

.compact-control {
  width: auto;
  min-width: 9rem;
}

.dense-list {
  display: grid;
  gap: 0.75rem;
}

.dense-row {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 0.8rem;
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
  color: rgb(15 23 42);
  font-size: 0.85rem;
  font-weight: 900;
}

.row-main p,
.row-main small {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  color: rgb(100 116 139);
  font-size: 0.74rem;
  line-height: 1.5;
}

.status-pill,
.meta-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.meta-chip,
.status-muted {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
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
.danger-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.primary-button {
  border: 1px solid rgb(14 116 144);
  background: rgb(14 116 144);
  color: white;
}

.secondary-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
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

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.state-block {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.65rem;
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.8rem;
  color: rgb(71 85 105);
  font-size: 0.78rem;
}

.state-block strong {
  color: rgb(30 41 59);
  font-weight: 900;
}

.state-block p {
  margin-top: 0.2rem;
}

.state-error {
  justify-content: space-between;
  border-style: solid;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

@media (max-width: 760px) {
  .page-header,
  .reason-band,
  .panel-heading,
  .dense-row {
    align-items: stretch;
    flex-direction: column;
  }

  .filters,
  .row-actions {
    justify-content: flex-start;
  }

  .compact-control {
    width: 100%;
  }
}

:global(.dark) .admin-collaboration-page {
  background: rgb(2 6 23);
}

:global(.dark) .queue-panel,
:global(.dark) .tab-bar button,
:global(.dark) .field-control,
:global(.dark) .secondary-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

:global(.dark) .page-header h1,
:global(.dark) .panel-heading h2,
:global(.dark) .row-title strong,
:global(.dark) .state-block strong {
  color: rgb(248 250 252);
}

:global(.dark) .page-header span,
:global(.dark) .panel-heading p {
  color: rgb(148 163 184);
}

:global(.dark) .dense-row {
  border-color: rgb(51 65 85);
}
</style>
