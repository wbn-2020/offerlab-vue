<template>
  <section class="reconcile-panel" aria-label="投影对账批次">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">有限批次修复</p>
        <h2><RotateCcw class="h-5 w-5" />投影对账</h2>
        <span>先 dry-run 查看影响，再以同一幂等键重试；服务端记录操作者、理由和批次结果。</span>
      </div>
      <span v-if="projection" class="meta-chip">{{ projection.projectionType }}</span>
    </div>

    <div v-if="permissionLoading" class="state" data-reconcile-permission="loading">
      <Loader2 class="h-5 w-5 animate-spin" />正在核验对账权限
    </div>
    <div v-else-if="permissionError" class="state state-error" role="alert">
      <AlertTriangle class="h-5 w-5" />{{ permissionError }}
    </div>
    <div v-else-if="!canOperate" class="state" data-reconcile-permission="denied">
      <ShieldAlert class="h-5 w-5" />当前账号没有投影对账权限。
    </div>
    <div v-else-if="!projection" class="state">
      <MousePointerClick class="h-5 w-5" />从投影健康表中选择一个投影。
    </div>
    <div v-else-if="!projection.available" class="state">
      <CircleOff class="h-5 w-5" />当前投影依赖不可用，不能执行对账。
    </div>
    <div v-else-if="!projection.reconciliationSupported" class="state">
      <ScanSearch class="h-5 w-5" />该投影仅支持诊断，请使用所属领域的修复入口。
    </div>
    <template v-else>
      <form class="reconcile-form" @submit.prevent="run">
        <label class="toggle-row">
          <input v-model="form.dryRun" type="checkbox">
          <span><strong>Dry-run</strong><small>只生成差异和预估结果，不写入业务事实。</small></span>
        </label>
        <label>
          <span>处理上限</span>
          <input v-model.number="form.limit" class="field-control" type="number" min="1" max="100">
        </label>
        <label class="reason-field">
          <span>操作理由</span>
          <textarea v-model.trim="form.reason" class="field-control" rows="2" maxlength="500" placeholder="说明问题来源、影响范围和预期结果" />
        </label>
        <label class="key-field">
          <span>幂等键</span>
          <input v-model.trim="idempotencyKey" class="field-control code-field" maxlength="96">
        </label>
        <div class="form-actions">
          <button type="submit" class="primary-button" :disabled="!canSubmit">
            <Loader2 v-if="running" class="h-4 w-4 animate-spin" />
            <Play v-else class="h-4 w-4" />
            {{ form.dryRun ? '执行 dry-run' : isDiagnosticProjection ? '执行诊断扫描' : '执行有限修复' }}
          </button>
          <button type="button" class="secondary-button" :disabled="running" @click="prepareNewBatch">
            <Plus class="h-4 w-4" />新批次
          </button>
        </div>
      </form>

      <div v-if="errorText" class="state state-error" role="alert">
        <AlertTriangle class="h-5 w-5" />
        <span>{{ errorText }}</span>
        <small>当前幂等键已保留，可修正网络或权限问题后重试。</small>
      </div>

      <section v-if="result" class="result-panel" aria-live="polite">
        <div class="result-heading">
          <div>
            <span :class="['status-pill', resultClass(result.status)]">{{ result.status }}</span>
            <span v-if="result.replayed" class="status-pill status-warn">幂等回放</span>
            <h3>{{ result.dryRun ? 'Dry-run 批次结果' : isDiagnosticProjection ? '诊断扫描结果' : '修复批次结果' }}</h3>
          </div>
          <small>{{ formatTime(result.completedAt) }}</small>
        </div>
        <dl class="result-grid">
          <div><dt>处理数量</dt><dd>{{ result.processedCount }}</dd></div>
          <div><dt>问题数量</dt><dd>{{ result.issueCount }}</dd></div>
          <div><dt>变更数量</dt><dd>{{ result.changedCount }}</dd></div>
          <div v-if="result.appliedCount != null"><dt>已应用</dt><dd>{{ result.appliedCount }}</dd></div>
          <div v-if="result.rejectedCount != null"><dt>已拒绝</dt><dd>{{ result.rejectedCount }}</dd></div>
          <div v-if="result.slaMinutes"><dt>SLA</dt><dd>{{ result.slaMinutes }} 分钟</dd></div>
          <div><dt>覆盖完成</dt><dd>{{ result.coverageComplete ? '是' : '否' }}</dd></div>
          <div><dt>委托批次</dt><dd>{{ result.delegatedRunId || '--' }}</dd></div>
          <div><dt>操作人</dt><dd>{{ result.operatorUid }}</dd></div>
        </dl>
        <div class="audit-copy">
          <span>幂等键</span><code>{{ result.idempotencyKey }}</code>
          <span>请求指纹</span><code>{{ result.requestFingerprint }}</code>
          <span>理由</span><p>{{ result.reason }}</p>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  CircleOff,
  Loader2,
  MousePointerClick,
  Play,
  Plus,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
} from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import {
  projectionHealthApi,
  type ProjectionHealth,
  type ProjectionReconcileResult,
} from '@/api/projectionHealth'

const props = defineProps<{
  projection: ProjectionHealth | null
  canOperate: boolean
  permissionLoading: boolean
  permissionError: string
}>()

const emit = defineEmits<{
  reconciled: [result: ProjectionReconcileResult]
}>()

const form = reactive({
  dryRun: true,
  limit: 50,
  reason: '',
})
const idempotencyKey = ref('')
const idempotencyInputSignature = ref('')
const result = ref<ProjectionReconcileResult | null>(null)
const running = ref(false)
const errorText = ref('')
let requestGeneration = 0
const isDiagnosticProjection = computed(() => (
  props.projection?.repairMode === 'DIAGNOSTIC_SCAN_AND_DIFFERENCE_RECORDING'
))

const randomPart = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const createIdempotencyKey = () =>
  `projection:${props.projection?.projectionType || 'unknown'}:${randomPart()}`.slice(0, 96)

const inputSignature = () => JSON.stringify([
  props.projection?.projectionType || '',
  form.dryRun,
  form.limit,
  form.reason.trim(),
])

const prepareNewBatch = () => {
  requestGeneration += 1
  running.value = false
  idempotencyKey.value = createIdempotencyKey()
  idempotencyInputSignature.value = inputSignature()
  result.value = null
  errorText.value = ''
}

const canSubmit = computed(() => Boolean(
  props.canOperate
  && props.projection?.available
  && props.projection?.reconciliationSupported
  && form.limit >= 1
  && form.limit <= 100
  && form.reason.trim().length >= 2
  && idempotencyKey.value.trim().length > 0
  && !running.value,
))

const run = async () => {
  if (!canSubmit.value || !props.projection) return
  const generation = ++requestGeneration
  const projectionType = props.projection.projectionType
  running.value = true
  errorText.value = ''
  try {
    const response = await projectionHealthApi.reconcile(projectionType, {
      dryRun: form.dryRun,
      limit: form.limit,
      reason: form.reason.trim(),
      idempotencyKey: idempotencyKey.value.trim(),
    })
    if (generation !== requestGeneration || props.projection?.projectionType !== projectionType) return
    if (response.data) {
      result.value = response.data
      emit('reconciled', response.data)
    }
  } catch (error) {
    if (generation !== requestGeneration || props.projection?.projectionType !== projectionType) return
    errorText.value = getErrorMessage(error, '投影对账批次执行失败')
  } finally {
    if (generation === requestGeneration && props.projection?.projectionType === projectionType) {
      running.value = false
    }
  }
}

const resultClass = (value: string) => {
  if (['SUCCESS', 'COMPLETED', 'DRY_RUN', 'DRY_RUN_COMPLETED'].includes(value)) return 'status-ok'
  if (['FAILED', 'ERROR'].includes(value)) return 'status-danger'
  return 'status-warn'
}

const formatTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}

watch(
  () => props.projection?.projectionType,
  () => {
    form.dryRun = true
    form.limit = 50
    form.reason = ''
    prepareNewBatch()
  },
  { immediate: true },
)

watch(
  [() => form.dryRun, () => form.limit, () => form.reason, () => props.projection?.projectionType],
  () => {
    const nextSignature = inputSignature()
    if (!idempotencyInputSignature.value) {
      idempotencyInputSignature.value = nextSignature
      return
    }
    if (nextSignature !== idempotencyInputSignature.value) {
      idempotencyInputSignature.value = nextSignature
      idempotencyKey.value = createIdempotencyKey()
      result.value = null
      errorText.value = ''
    }
  },
)
</script>

<style scoped>
.reconcile-panel { display: grid; gap: 1rem; border: 1px solid rgb(226 232 240); border-radius: .625rem; background: white; padding: 1rem; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .8rem; }
.panel-heading h2 { display: flex; align-items: center; gap: .4rem; margin: .2rem 0 0; color: rgb(15 23 42); font-size: 1rem; font-weight: 900; }
.panel-heading span:not(.meta-chip) { display: block; margin-top: .3rem; color: rgb(100 116 139); font-size: .73rem; line-height: 1.5; }
.eyebrow { margin: 0; color: rgb(8 145 178); font-size: .66rem; font-weight: 900; letter-spacing: .05em; }
.meta-chip, .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: .22rem .5rem; font-size: .64rem; font-weight: 900; }
.meta-chip { background: rgb(241 245 249); color: rgb(71 85 105); }
.status-ok { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-warn { background: rgb(254 243 199); color: rgb(146 64 14); }
.status-danger { background: rgb(254 226 226); color: rgb(185 28 28); }
.state { display: flex; min-height: 6rem; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem; border: 1px dashed rgb(203 213 225); border-radius: .5rem; padding: 1rem; color: rgb(100 116 139); font-size: .75rem; text-align: center; }
.state small { flex-basis: 100%; font-size: .67rem; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.reconcile-form { display: grid; grid-template-columns: minmax(10rem, .8fr) minmax(8rem, .5fr) minmax(0, 1.7fr); gap: .75rem; align-items: end; }
.reconcile-form label { display: grid; min-width: 0; gap: .28rem; }
.reconcile-form label > span { color: rgb(71 85 105); font-size: .68rem; font-weight: 800; }
.toggle-row { display: flex !important; min-height: 70px; grid-row: span 2; grid-template-columns: auto 1fr !important; align-items: center; gap: .55rem !important; border: 1px solid rgb(203 213 225); border-radius: .5rem; padding: .65rem; }
.toggle-row input { height: 1rem; width: 1rem; }
.toggle-row span { display: grid; gap: .15rem; }
.toggle-row strong { color: rgb(30 41 59); font-size: .75rem; }
.toggle-row small { color: rgb(100 116 139); font-size: .65rem; font-weight: 500; line-height: 1.4; }
.reason-field { grid-column: 3; grid-row: span 2; }
.key-field { grid-column: 1 / span 2; }
.field-control { width: 100%; min-height: 36px; border: 1px solid rgb(203 213 225); border-radius: .45rem; background: white; padding: .45rem .6rem; color: rgb(15 23 42); font-size: .72rem; resize: vertical; }
.code-field { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: .66rem; }
.form-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .5rem; }
.primary-button, .secondary-button { display: inline-flex; min-height: 36px; align-items: center; justify-content: center; gap: .35rem; border-radius: .45rem; padding: .4rem .7rem; font-size: .7rem; font-weight: 900; }
.primary-button { border: 1px solid rgb(8 145 178); background: rgb(8 145 178); color: white; }
.secondary-button { border: 1px solid rgb(203 213 225); background: white; color: rgb(51 65 85); }
.result-panel { display: grid; gap: .8rem; border-top: 1px solid rgb(226 232 240); padding-top: 1rem; }
.result-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .7rem; }
.result-heading > div { display: flex; flex-wrap: wrap; align-items: center; gap: .35rem; }
.result-heading h3 { flex-basis: 100%; margin: .25rem 0 0; color: rgb(30 41 59); font-size: .85rem; font-weight: 900; }
.result-heading small { color: rgb(100 116 139); font-size: .66rem; }
.result-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }
.result-grid div { min-width: 0; border-radius: .5rem; background: rgb(248 250 252); padding: .6rem; }
.result-grid dt, .result-grid dd { overflow-wrap: anywhere; }
.result-grid dt { color: rgb(100 116 139); font-size: .65rem; }
.result-grid dd { margin: .2rem 0 0; color: rgb(30 41 59); font-size: .78rem; font-weight: 900; }
.audit-copy { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: .35rem .6rem; align-items: start; font-size: .67rem; }
.audit-copy span { color: rgb(100 116 139); font-weight: 800; }
.audit-copy code, .audit-copy p { margin: 0; color: rgb(51 65 85); overflow-wrap: anywhere; white-space: pre-wrap; }
button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 880px) { .reconcile-form { grid-template-columns: 1fr 1fr; } .toggle-row { grid-row: auto; } .reason-field, .key-field { grid-column: 1 / -1; grid-row: auto; } .form-actions { grid-column: 1 / -1; justify-content: flex-start; } }
@media (max-width: 580px) { .reconcile-form, .result-grid { grid-template-columns: 1fr; } .toggle-row, .reason-field, .key-field, .form-actions { grid-column: 1; } .audit-copy { grid-template-columns: 1fr; } }
.dark .reconcile-panel, .dark .field-control, .dark .toggle-row, .dark .secondary-button { border-color: rgb(51 65 85); background: rgb(15 23 42); color: rgb(203 213 225); }
.dark .panel-heading h2, .dark .toggle-row strong, .dark .result-heading h3, .dark .result-grid dd { color: rgb(248 250 252); }
.dark .panel-heading span:not(.meta-chip), .dark .reconcile-form label > span, .dark .toggle-row small, .dark .state, .dark .result-heading small, .dark .result-grid dt, .dark .audit-copy span { color: rgb(148 163 184); }
.dark .meta-chip { background: rgb(30 41 59); color: rgb(203 213 225); }
.dark .result-panel { border-color: rgb(51 65 85); }
.dark .result-grid div { background: rgb(2 6 23 / .6); }
.dark .audit-copy code, .dark .audit-copy p { color: rgb(203 213 225); }
</style>
