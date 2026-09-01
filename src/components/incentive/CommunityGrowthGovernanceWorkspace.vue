<template>
  <section id="appeals" class="workspace" aria-label="权益与申诉">
    <div class="workspace-header">
      <div>
        <h2><ShieldCheck class="h-5 w-5" />已交付权益与申诉</h2>
        <p>权益不可转移，也不代表身份资质；申诉只恢复被错误冲正或错误处理的贡献记录。</p>
      </div>
      <button type="button" class="icon-button" title="刷新权益与申诉" :disabled="loadingAny" @click="refreshAll">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loadingAny }" />
      </button>
    </div>

    <div class="governance-grid">
      <div class="subsection">
        <div class="subsection-heading"><div><strong>我的权益</strong><span>{{ entitlements.total }} 项</span></div></div>
        <StateBlock :loading="entitlementState.loading" :error="entitlementState.error" :empty="entitlements.items.length === 0" empty-text="暂无已交付权益。" @retry="loadEntitlements" />
        <div v-if="!entitlementState.loading && !entitlementState.error" class="dense-list">
          <article v-for="item in entitlements.items" :key="String(item.id)" class="dense-row">
            <div class="row-main">
              <div class="row-title">
                <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
                <strong>{{ benefitLabel(item.benefitCode) }}</strong>
                <span class="meta-chip">{{ item.entitlementType }}</span>
              </div>
              <p>权益键 {{ item.entitlementKey }} · 剩余 {{ item.quantityRemaining }}/{{ item.quantityTotal }}</p>
              <small>订单 #{{ item.orderId }} · {{ formatTime(item.grantedAt) }}<template v-if="item.reversible"> · 可逆</template><template v-if="item.benefitCode === 'AI_ASSIST_QUOTA'"> · 仅在编辑器主动发起 AI 增强时使用</template></small>
            </div>
            <RouterLink
              v-if="item.benefitCode === 'AI_ASSIST_QUOTA' && item.status === 'ACTIVE' && Number(item.quantityRemaining) > 0"
              to="/editor"
              class="secondary-button compact"
            >
              前往 AI 创作增强
            </RouterLink>
          </article>
        </div>
        <div class="subsection-heading usage-heading"><div><strong>最近使用记录</strong><span>{{ entitlementUsages.total }} 条</span></div></div>
        <StateBlock :loading="usageState.loading" :error="usageState.error" :empty="entitlementUsages.items.length === 0" empty-text="暂无权益使用记录。" @retry="loadEntitlementUsages" />
        <div v-if="!usageState.loading && !usageState.error && entitlementUsages.items.length" class="mini-list">
          <div v-for="item in entitlementUsages.items.slice(0, 8)" :key="String(item.usageId)">
            <span :class="['status-pill', statusClass(item.status)]">{{ usageStatusLabel(item) }}</span>
            <strong>{{ benefitLabel(item.benefitCode) }} · {{ item.amount }} 次</strong>
            <small>{{ usageDetail(item) }}</small>
            <RouterLink
              v-if="item.benefitCode === 'AI_ASSIST_QUOTA' && item.status === 'RESERVED'"
              to="/editor"
              class="secondary-button compact"
            >
              查看 AI 增强
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="subsection">
        <div class="subsection-heading"><div><strong>奖励申诉</strong><span>{{ appeals.total }} 条</span></div></div>
        <form class="form-stack" @submit.prevent="submitAppeal">
          <div class="field-grid">
            <label><span>目标类型</span><select v-model="appealForm.targetType" class="field-control"><option value="LEDGER">原流水</option><option value="REVERSAL">冲正流水</option><option value="FREEZE">冻结记录</option></select></label>
            <label><span>目标 ID</span><input v-model.trim="appealForm.targetId" class="field-control" inputmode="numeric" required></label>
          </div>
          <label><span>申诉说明</span><textarea v-model.trim="appealForm.reason" class="field-control" rows="3" maxlength="1000" required placeholder="说明原贡献、争议点和可核验依据。" /></label>
          <button type="submit" class="secondary-button" :disabled="!canSubmitAppeal"><Send class="h-4 w-4" />提交奖励申诉</button>
        </form>
        <StateBlock :loading="appealState.loading" :error="appealState.error" :empty="appeals.items.length === 0" empty-text="暂无奖励申诉。" @retry="loadAppeals" />
        <div v-if="!appealState.loading && !appealState.error" class="mini-list">
          <div v-for="item in appeals.items" :key="String(item.id)">
            <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
            <strong>{{ item.targetType }} #{{ item.targetId }}</strong>
            <small>{{ item.appealReason }}<template v-if="item.relatedRecoveryDebtId"> · 恢复债务 #{{ item.relatedRecoveryDebtId }}</template><template v-if="item.reviewReason"> · 审核：{{ item.reviewReason }}</template></small>
          </div>
        </div>
      </div>
    </div>

    <div class="section-divider" />

    <div class="subsection">
      <div class="subsection-heading"><div><strong>悬赏申诉</strong><span>{{ bountyAppeals.total }} 条</span></div></div>
      <div class="appeal-layout">
        <form class="form-stack" @submit.prevent="submitBountyAppeal">
          <label><span>悬赏提交 ID</span><input v-model.trim="bountyAppealForm.submissionId" class="field-control" inputmode="numeric" required></label>
          <label><span>申诉说明</span><textarea v-model.trim="bountyAppealForm.reason" class="field-control" rows="3" maxlength="1000" required placeholder="仅提交一次；说明为何原审核结果需要复核。" /></label>
          <button type="submit" class="secondary-button" :disabled="!canSubmitBountyAppeal"><Undo2 class="h-4 w-4" />提交悬赏申诉</button>
        </form>
        <div>
          <StateBlock :loading="bountyAppealState.loading" :error="bountyAppealState.error" :empty="bountyAppeals.items.length === 0" empty-text="暂无悬赏申诉。" @retry="loadBountyAppeals" />
          <div v-if="!bountyAppealState.loading && !bountyAppealState.error" class="mini-list">
            <div v-for="item in bountyAppeals.items" :key="String(item.id)">
              <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
              <strong>提交 #{{ item.submissionId }} · 原结果 {{ statusLabel(item.originalStatus) }}</strong>
              <small>{{ item.appealReason }}<template v-if="item.reviewReason"> · 复核：{{ item.reviewReason }}</template></small>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { Inbox, Loader2, RefreshCw, Send, ShieldCheck, Undo2 } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage, type Result } from '@/api/client'
import {
  incentiveApi,
  type BenefitEntitlement,
  type BenefitEntitlementUsage,
  type BountyAppeal,
  type IncentiveAppeal,
  type PageResult,
} from '@/api/incentives'

type LoadState = { loading: boolean; error: string; requestId: string }
const state = (): LoadState => reactive({ loading: false, error: '', requestId: '' })
const emptyPage = <T,>(): PageResult<T> => ({ items: [], nextCursor: null, hasMore: false, total: 0 })
const StateBlock = defineComponent({
  props: { loading: Boolean, error: { type: String, default: '' }, empty: Boolean, emptyText: { type: String, required: true } },
  emits: ['retry'],
  setup(props, { emit }) {
    return () => {
      if (props.loading) return h('div', { class: 'state-block' }, [h(Loader2, { class: 'h-4 w-4 animate-spin' }), '正在加载'])
      if (props.error) return h('div', { class: 'state-block state-error' }, [
        h('span', props.error),
        h('button', { type: 'button', class: 'secondary-button compact', onClick: () => emit('retry') }, '重试'),
      ])
      if (props.empty) return h('div', { class: 'state-block' }, [h(Inbox, { class: 'h-4 w-4' }), props.emptyText])
      return null
    }
  },
})

const entitlementState = state()
const usageState = state()
const appealState = state()
const bountyAppealState = state()
const entitlements = ref<PageResult<BenefitEntitlement>>(emptyPage())
const entitlementUsages = ref<PageResult<BenefitEntitlementUsage>>(emptyPage())
const appeals = ref<PageResult<IncentiveAppeal>>(emptyPage())
const bountyAppeals = ref<PageResult<BountyAppeal>>(emptyPage())
const pendingAction = ref('')
const busy = computed(() => Boolean(pendingAction.value))
const loadingAny = computed(() => entitlementState.loading || usageState.loading || appealState.loading || bountyAppealState.loading || busy.value)
const RETENTION_LIMIT = 300
const PAGE_SIZE = 50
const appealForm = reactive({ targetType: 'REVERSAL', targetId: '', reason: '' })
const bountyAppealForm = reactive({ submissionId: '', reason: '' })
const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())
const canSubmitAppeal = computed(() => !busy.value && isPositiveId(appealForm.targetId) && appealForm.reason.length >= 5)
const canSubmitBountyAppeal = computed(() => !busy.value && isPositiveId(bountyAppealForm.submissionId) && bountyAppealForm.reason.length >= 5)

const runLoad = async (
  target: LoadState,
  task: (isCurrent: () => boolean) => Promise<void>,
  fallback: string,
) => {
  const requestId = `${Date.now()}-${Math.random()}`
  target.requestId = requestId
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
  if (busy.value) return
  pendingAction.value = key
  try {
    await task()
    toast.success(success)
  } catch (error) {
    toast.error(getErrorMessage(error, '申诉或权益操作失败'))
  } finally {
    pendingAction.value = ''
  }
}
const collectPages = async <T,>(
  request: (page: number) => Promise<Result<PageResult<T>>>,
): Promise<PageResult<T>> => {
  const collected: T[] = []
  let latest = emptyPage<T>()
  for (let page = 1; page <= RETENTION_LIMIT / PAGE_SIZE; page += 1) {
    const response = await request(page)
    latest = response.data || emptyPage<T>()
    collected.push(...latest.items)
    if (!latest.hasMore || latest.items.length === 0 || collected.length >= RETENTION_LIMIT) break
  }
  const items = collected.slice(0, RETENTION_LIMIT)
  return {
    ...latest,
    items,
    total: Math.max(Number(latest.total || 0), collected.length),
    hasMore: items.length < RETENTION_LIMIT && latest.hasMore,
    nextCursor: items.length < RETENTION_LIMIT ? latest.nextCursor : null,
  }
}

const loadEntitlements = () => runLoad(entitlementState, async (isCurrent) => {
  const result = await collectPages((page) => incentiveApi.getMyEntitlements({ page, size: PAGE_SIZE }))
  if (isCurrent()) entitlements.value = result
}, '权益实例加载失败')
const loadEntitlementUsages = () => runLoad(usageState, async (isCurrent) => {
  const result = await collectPages((page) => incentiveApi.getMyEntitlementUsages({ page, size: PAGE_SIZE }))
  if (isCurrent()) entitlementUsages.value = result
}, '权益使用记录加载失败')
const loadAppeals = () => runLoad(appealState, async (isCurrent) => {
  const result = await collectPages((page) => incentiveApi.getMyAppeals({ page, size: PAGE_SIZE }))
  if (isCurrent()) appeals.value = result
}, '奖励申诉加载失败')
const loadBountyAppeals = () => runLoad(bountyAppealState, async (isCurrent) => {
  const result = await collectPages((page) => incentiveApi.getMyBountyAppeals({ page, size: PAGE_SIZE }))
  if (isCurrent()) bountyAppeals.value = result
}, '悬赏申诉加载失败')
const refreshAll = () => Promise.all([loadEntitlements(), loadEntitlementUsages(), loadAppeals(), loadBountyAppeals()])

const submitAppeal = () => runAction('appeal', async () => {
  await incentiveApi.submitAppeal({
    targetType: appealForm.targetType,
    targetId: appealForm.targetId,
    reason: appealForm.reason,
  })
  Object.assign(appealForm, { targetType: 'REVERSAL', targetId: '', reason: '' })
  await loadAppeals()
}, '奖励申诉已提交')
const submitBountyAppeal = () => runAction('bounty-appeal', async () => {
  await incentiveApi.submitBountyAppeal(bountyAppealForm.submissionId, { reason: bountyAppealForm.reason })
  Object.assign(bountyAppealForm, { submissionId: '', reason: '' })
  await loadBountyAppeals()
}, '悬赏申诉已提交')

const statusLabel = (value: string) => ({
  ACTIVE: '生效',
  CONSUMED: '已用尽',
  REVOKED: '已撤销',
  EXPIRED: '已到期',
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
}[value] || value)
const benefitLabel = (value: string) => ({
  AI_ASSIST_QUOTA: 'AI 创作增强额度',
}[value] || value)
const usageStatusLabel = (item: BenefitEntitlementUsage) => ({
  RESERVED: item.benefitCode === 'AI_ASSIST_QUOTA' ? 'AI 增强待确认' : '确认中',
  CONFIRMED: '已使用',
  RELEASED: '未扣除',
}[item.status] || item.status)
const usageDetail = (item: BenefitEntitlementUsage) => {
  const time = formatTime(item.confirmedAt || item.releasedAt || item.expiresAt)
  if (item.status === 'RELEASED') return `${time} · ${item.failureCode || '增强未完成，额度已归还'}`
  if (item.status === 'RESERVED') {
    return item.benefitCode === 'AI_ASSIST_QUOTA'
      ? `${time} · AI 增强待确认，可前往编辑器刷新履约状态`
      : `${time} · 正在确认本次使用结果`
  }
  return `${time} · ${item.consumerCode === 'CONTENT_ASSIST_ENHANCED' ? 'AI 创作增强' : item.consumerCode}`
}
const statusClass = (value: string) => {
  if (['ACTIVE', 'APPROVED'].includes(value)) return 'status-ok'
  if (['REJECTED', 'REVOKED'].includes(value)) return 'status-danger'
  if (['SUBMITTED'].includes(value)) return 'status-warn'
  return 'status-muted'
}
const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

onMounted(refreshAll)

defineExpose({ refreshAll })
</script>

<style scoped>
.workspace {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.workspace-header,
.subsection-heading,
.row-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.workspace-header {
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.workspace-header h2 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 900;
}

.workspace-header h2 svg {
  color: rgb(18 99 74);
}

.workspace-header p {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.governance-grid,
.appeal-layout {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.subsection {
  min-width: 0;
}

.subsection-heading {
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.subsection-heading strong {
  color: var(--text-strong);
  font-size: 0.88rem;
  font-weight: 900;
}

.subsection-heading span {
  margin-left: 0.35rem;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.dense-list,
.mini-list,
.form-stack {
  display: grid;
  min-width: 0;
  gap: 0.75rem;
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

.row-title strong,
.mini-list strong {
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 900;
}

.row-main p,
.row-main small,
.mini-list small {
  display: block;
  margin-top: 0.3rem;
  overflow-wrap: anywhere;
  color: var(--text-muted);
  font-size: 0.71rem;
  line-height: 1.45;
}

.mini-list > div {
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.6rem;
}

.form-stack label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 800;
}

.field-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
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

.section-divider {
  margin: 1rem 0;
  border-top: 1px solid var(--border-subtle);
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
.icon-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  padding: 0.48rem 0.7rem;
  font-size: 0.76rem;
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

@media (min-width: 900px) {
  .governance-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .appeal-layout {
    grid-template-columns: minmax(18rem, 0.7fr) minmax(0, 1.3fr);
  }
}

@media (max-width: 620px) {
  .dense-row {
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.dark .workspace,
.dark .field-control,
.dark .secondary-button,
.dark .icon-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .workspace-header h2,
.dark .subsection-heading strong,
.dark .row-title strong,
.dark .mini-list strong {
  color: var(--text-strong);
}

.dark .workspace-header p,
.dark .form-stack label {
  color: var(--text-muted);
}

.dark .dense-row,
.dark .mini-list > div,
.dark .section-divider {
  border-color: var(--border-subtle);
}
</style>
