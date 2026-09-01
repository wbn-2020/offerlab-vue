<template>
  <div class="case-workspace">
    <section class="case-panel">
      <div class="panel-heading">
        <div>
          <h2><ShieldAlert class="h-5 w-5" />提交举报或申诉</h2>
          <p>举报用于指出共建对象的问题；申诉仅针对与本人对象匹配且已支持的举报案件。</p>
        </div>
      </div>
      <form class="case-form" @submit.prevent="submitCase">
        <div class="field-grid">
          <label>
            <span>案件类型</span>
            <select v-model="caseForm.caseType" class="field-control">
              <option value="REPORT">举报</option>
              <option value="APPEAL">申诉</option>
            </select>
          </label>
          <label>
            <span>对象类型</span>
            <select v-model="caseForm.targetType" class="field-control">
              <option v-for="item in targetOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
        <div class="field-grid">
          <label>
            <span>对象 ID</span>
            <input v-model.trim="caseForm.targetId" class="field-control" inputmode="numeric" required>
          </label>
          <label v-if="caseForm.caseType === 'APPEAL'">
            <span>原举报案件 ID</span>
            <input v-model.trim="caseForm.parentCaseId" class="field-control" inputmode="numeric" required>
          </label>
          <label v-else>
            <span>原因</span>
            <select v-model="caseForm.reasonCode" class="field-control">
              <option v-for="item in reasonOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
        <label v-if="caseForm.caseType === 'APPEAL'">
          <span>申诉原因</span>
          <select v-model="caseForm.reasonCode" class="field-control">
            <option value="CONFLICT">事实或归属存在争议</option>
            <option value="MISLEADING">原判断基于错误信息</option>
            <option value="OTHER">其他</option>
          </select>
        </label>
        <label>
          <span>详细说明</span>
          <textarea
            v-model.trim="caseForm.detail"
            class="field-control"
            rows="5"
            maxlength="2000"
            required
            placeholder="说明事实、影响和可核验依据。不要提交无关隐私。"
          />
        </label>
        <button type="submit" class="primary-button" :disabled="!canSubmit">
          <Loader2 v-if="pending" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          {{ caseForm.caseType === 'REPORT' ? '提交举报' : '提交申诉' }}
        </button>
      </form>
    </section>

    <section class="case-panel">
      <div class="panel-heading filter-heading">
        <div>
          <h2><ClipboardList class="h-5 w-5" />我的共建案件</h2>
          <p>支持、驳回、关闭和推翻都会保留审核人、理由与时间。</p>
        </div>
        <div class="filters">
          <select v-model="statusFilter" class="field-control compact-control" @change="loadCases">
            <option value="">全部状态</option>
            <option value="PENDING">待审核</option>
            <option value="UPHELD">已支持</option>
            <option value="REJECTED">已驳回</option>
            <option value="CLOSED">已关闭</option>
            <option value="OVERTURNED">已推翻</option>
          </select>
          <button type="button" class="icon-button" title="刷新我的案件" :disabled="loading" @click="loadCases">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>

      <div v-if="loading" class="state-block"><Loader2 class="h-5 w-5 animate-spin" />正在加载案件</div>
      <div v-else-if="error" class="state-block state-error">
        <div><strong>案件加载失败</strong><p>{{ error }}</p></div>
        <button type="button" class="secondary-button compact" @click="loadCases">重试</button>
      </div>
      <div v-else-if="cases.length === 0" class="state-block">
        <Inbox class="h-5 w-5" />
        <div><strong>暂无案件</strong><p>提交举报或申诉后，可在这里查看处理进度。</p></div>
      </div>
      <div v-else class="dense-list">
        <article v-for="item in cases" :key="String(item.id)" class="dense-row">
          <div class="row-main">
            <div class="row-title">
              <span :class="['status-pill', statusClass(item.status)]">{{ statusLabel(item.status) }}</span>
              <span class="meta-chip">{{ item.caseType === 'REPORT' ? '举报' : '申诉' }}</span>
              <strong>{{ targetLabel(item.targetType) }} #{{ item.targetId }}</strong>
            </div>
            <p>{{ item.detail }}</p>
            <small>
              案件 #{{ item.id }} · {{ reasonLabel(item.reasonCode) }} · {{ formatTime(item.createTime) }}
              <template v-if="item.parentCaseId"> · 原案件 #{{ item.parentCaseId }}</template>
            </small>
            <small v-if="item.reviewNote">审核说明：{{ item.reviewNote }}</small>
          </div>
          <button
            v-if="item.caseType === 'REPORT' && item.status === 'UPHELD'"
            type="button"
            class="secondary-button compact"
            @click="startAppeal(item)"
          >
            <Undo2 class="h-4 w-4" />申诉
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  ClipboardList,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  Undo2,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage, type Result } from '@/api/client'
import {
  collaborationApi,
  type GovernanceCase,
  type GovernanceCaseType,
  type GovernanceReasonCode,
  type GovernanceTargetType,
  type PageResult,
} from '@/api/collaboration'
import { useAuthStore } from '@/stores/auth'

const targetOptions: Array<{ value: GovernanceTargetType; label: string }> = [
  { value: 'NEED', label: '内容需求' },
  { value: 'SERIES', label: '协作合集' },
  { value: 'ACTIVITY', label: '共创活动' },
  { value: 'CURATION', label: '策展建议' },
  { value: 'DISCUSSION', label: '结构化讨论' },
  { value: 'OFFICE_HOUR', label: '经验交流时段' },
  { value: 'RESERVATION', label: '经验交流预约' },
  { value: 'FEEDBACK', label: '经验交流反馈' },
]
const reasonOptions: Array<{ value: GovernanceReasonCode; label: string }> = [
  { value: 'ABUSE', label: '滥用或骚扰' },
  { value: 'SPAM', label: '垃圾或引流' },
  { value: 'MISLEADING', label: '误导信息' },
  { value: 'COPYRIGHT', label: '版权问题' },
  { value: 'PRIVACY', label: '隐私泄露' },
  { value: 'CONFLICT', label: '利益冲突' },
  { value: 'OTHER', label: '其他' },
]

const caseForm = reactive<{
  caseType: GovernanceCaseType
  targetType: GovernanceTargetType
  targetId: string
  parentCaseId: string
  reasonCode: GovernanceReasonCode
  detail: string
}>({
  caseType: 'REPORT',
  targetType: 'NEED',
  targetId: '',
  parentCaseId: '',
  reasonCode: 'OTHER',
  detail: '',
})
const cases = ref<GovernanceCase[]>([])
const authStore = useAuthStore()
const statusFilter = ref('')
const loading = ref(false)
const pending = ref(false)
const error = ref('')
const requestId = ref(0)
const isPositiveId = (value: string) => /^[1-9]\d*$/.test(value.trim())
const canSubmit = computed(() => !pending.value
  && isPositiveId(caseForm.targetId)
  && caseForm.detail.length >= 5
  && (caseForm.caseType === 'REPORT' || isPositiveId(caseForm.parentCaseId)))

const CASE_RETENTION_LIMIT = 300
const CASE_PAGE_SIZE = 50
const collectCasePages = async (isCurrent: () => boolean): Promise<GovernanceCase[]> => {
  const items: GovernanceCase[] = []
  let cursor: string | number = 0
  for (let page = 0; page < CASE_RETENTION_LIMIT / CASE_PAGE_SIZE; page += 1) {
    if (!isCurrent()) break
    const response: Result<PageResult<GovernanceCase>> = await collaborationApi.governance.mine({
      status: statusFilter.value || undefined,
      cursor,
      size: CASE_PAGE_SIZE,
    })
    const data = response.data
    if (!data) break
    items.push(...data.items)
    if (!data.hasMore || !data.nextCursor || items.length >= CASE_RETENTION_LIMIT) break
    if (String(data.nextCursor) === String(cursor)) break
    cursor = data.nextCursor
  }
  return items.slice(0, CASE_RETENTION_LIMIT)
}

const loadCases = async () => {
  const currentRequestId = ++requestId.value
  const isCurrent = () => requestId.value === currentRequestId
  loading.value = true
  error.value = ''
  try {
    const items = await collectCasePages(isCurrent)
    if (isCurrent()) cases.value = items
  } catch (loadError) {
    if (isCurrent()) error.value = getErrorMessage(loadError, '我的共建案件加载失败')
  } finally {
    if (isCurrent()) loading.value = false
  }
}

const submitCase = async () => {
  if (!canSubmit.value) return
  pending.value = true
  try {
    await collaborationApi.governance.createCase({
      caseType: caseForm.caseType,
      targetType: caseForm.targetType,
      targetId: caseForm.targetId,
      parentCaseId: caseForm.caseType === 'APPEAL' ? caseForm.parentCaseId : undefined,
      reasonCode: caseForm.reasonCode,
      detail: caseForm.detail,
    })
    toast.success(caseForm.caseType === 'REPORT' ? '举报已提交' : '申诉已提交')
    Object.assign(caseForm, {
      caseType: 'REPORT',
      targetType: 'NEED',
      targetId: '',
      parentCaseId: '',
      reasonCode: 'OTHER',
      detail: '',
    })
    await loadCases()
  } catch (submitError) {
    toast.error(getErrorMessage(submitError, '案件提交失败'))
  } finally {
    pending.value = false
  }
}

const startAppeal = (item: GovernanceCase) => {
  caseForm.caseType = 'APPEAL'
  caseForm.targetType = item.targetType
  caseForm.targetId = String(item.targetId)
  caseForm.parentCaseId = String(item.id)
  caseForm.reasonCode = 'CONFLICT'
  caseForm.detail = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const targetLabel = (value: GovernanceTargetType) => targetOptions.find((item) => item.value === value)?.label || value
const reasonLabel = (value: GovernanceReasonCode) => reasonOptions.find((item) => item.value === value)?.label || value
const statusLabel = (value: string) => ({
  PENDING: '待审核',
  UPHELD: '已支持',
  REJECTED: '已驳回',
  CLOSED: '已关闭',
  OVERTURNED: '已推翻',
}[value] || value)
const statusClass = (value: string) => {
  if (['UPHELD'].includes(value)) return 'status-ok'
  if (['REJECTED'].includes(value)) return 'status-danger'
  if (['PENDING'].includes(value)) return 'status-warn'
  return 'status-muted'
}
const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

const resetPrivateCases = () => {
  requestId.value += 1
  loading.value = false
  error.value = ''
  cases.value = []
}

watch(
  () => authStore.isLoggedIn,
  (isLoggedIn) => {
    if (isLoggedIn) {
      void loadCases()
      return
    }
    resetPrivateCases()
  },
)

onMounted(() => {
  if (authStore.isLoggedIn) void loadCases()
})
</script>

<style scoped>
.case-workspace,
.case-form,
.dense-list {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.case-workspace {
  grid-template-columns: minmax(18rem, 0.75fr) minmax(0, 1.25fr);
}

.case-panel {
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.panel-heading,
.filters,
.row-title {
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
  font-size: 1rem;
  font-weight: 900;
}

.panel-heading h2 svg {
  color: rgb(18 99 74);
}

.panel-heading p {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.case-form label {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 800;
}

.field-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.field-control {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 0.58rem 0.65rem;
  color: var(--text-strong);
  font-size: 0.8rem;
  line-height: 1.45;
  outline: none;
}

.field-control:focus {
  border-color: rgb(26 127 90);
  box-shadow: 0 0 0 3px rgb(169 216 195 / 0.65);
}

.compact-control {
  width: auto;
  min-width: 8.5rem;
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
  font-size: 0.84rem;
  font-weight: 900;
}

.row-main p,
.row-main small {
  display: block;
  margin-top: 0.35rem;
  overflow-wrap: anywhere;
  color: var(--text-muted);
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
  height: 40px;
  width: 40px;
  padding: 0;
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
  border: 1px dashed var(--border-subtle);
  border-radius: 0.625rem;
  background: var(--surface-soft);
  padding: 0.8rem;
  color: var(--text-primary);
  font-size: 0.78rem;
}

.state-block strong {
  color: var(--text-strong);
  font-weight: 900;
}

.state-block p {
  margin-top: 0.2rem;
  line-height: 1.45;
}

.state-error {
  justify-content: space-between;
  border-style: solid;
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(153 27 27);
}

@media (max-width: 900px) {
  .case-workspace {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .filter-heading,
  .dense-row {
    align-items: stretch;
    flex-direction: column;
  }

  .field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .compact-control {
    width: 100%;
  }
}

.dark .case-panel,
.dark .field-control,
.dark .secondary-button,
.dark .icon-button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark .panel-heading h2,
.dark .row-title strong,
.dark .state-block strong {
  color: var(--text-strong);
}

.dark .panel-heading p,
.dark .case-form label {
  color: var(--text-muted);
}

.dark .dense-row {
  border-color: var(--border-subtle);
}

.dark .state-block {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-1) 65%, transparent);
  color: var(--text-muted);
}
</style>
