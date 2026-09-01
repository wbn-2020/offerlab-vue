<template>
  <section class="eligibility-panel" aria-label="角色资格证据">
    <div class="panel-heading">
      <div>
        <h3><ShieldCheck class="h-5 w-5" />资格与证据</h3>
        <p>以下状态由服务端按当前角色、领域和账号事实计算。</p>
      </div>
      <button v-if="refreshable" type="button" class="icon-button" title="刷新角色证据" :disabled="loading" @click="$emit('retry')">
        <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div v-if="loading" class="state state-loading" aria-live="polite">
      <Loader2 class="h-5 w-5 animate-spin" />正在读取资格证据
    </div>
    <div v-else-if="error" class="state state-error" role="alert">
      <AlertTriangle class="h-5 w-5" />
      <span>{{ error }}</span>
      <button type="button" class="secondary-button compact" @click="$emit('retry')">重试</button>
    </div>
    <div v-else-if="!evidence" class="state">
      <Info class="h-5 w-5" />选择一个角色查看资格证据。
    </div>
    <div v-else class="panel-body">
      <div class="status-line">
        <span :class="['status-pill', evidence.eligible ? 'status-ok' : 'status-warn']">
          {{ evidence.eligible ? '满足资格条件' : '存在资格缺口' }}
        </span>
        <span v-if="evidence.applicationStatus" class="meta-chip">
          申请 {{ statusLabel(evidence.applicationStatus) }}
        </span>
        <span v-if="evidence.grantStatus" class="meta-chip">
          授权 {{ statusLabel(evidence.grantStatus) }}
        </span>
      </div>

      <div class="evidence-grid">
        <div v-for="item in evidence.evidence" :key="item.evidenceCode" class="evidence-row">
          <span :class="['evidence-mark', item.passed ? 'evidence-passed' : 'evidence-failed']">
            <Check v-if="item.passed" class="h-3.5 w-3.5" />
            <X v-else class="h-3.5 w-3.5" />
          </span>
          <div class="min-w-0">
            <strong>{{ item.label }}</strong>
            <small>当前 {{ item.currentValue }} · 要求 {{ item.requiredValue }}</small>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <div><span>人工审核</span><strong>{{ evidence.manualApprovalRequired ? '需要' : '不需要' }}</strong></div>
        <div><span>风险冻结</span><strong>{{ evidence.riskFrozen ? '存在' : '无' }}</strong></div>
        <div><span>授权到期</span><strong>{{ formatTime(evidence.expiresAt) }}</strong></div>
      </div>

      <div v-if="evidence.failedChecks.length" class="notice notice-warn">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span>未通过项：{{ evidence.failedChecks.map(failedCheckLabel).join('、') }}</span>
      </div>

      <div class="action-summary">
        <span :class="['status-pill', evidence.canApply ? 'status-ok' : 'status-muted']">
          {{ evidence.canApply ? '服务端允许申请' : '当前不可申请' }}
        </span>
        <span :class="['status-pill', evidence.canUseMaintenanceWorkspace ? 'status-ok' : 'status-muted']">
          {{ evidence.canUseMaintenanceWorkspace ? '可打开维护候选' : '未开放维护候选' }}
        </span>
        <span v-for="action in evidence.availableActions" :key="action" class="meta-chip">{{ action }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { AlertTriangle, Check, Info, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-vue-next'
import type { CommunityRoleEvidence } from '@/api/communityRoles'

withDefaults(defineProps<{
  evidence: CommunityRoleEvidence | null
  loading: boolean
  error: string
  refreshable?: boolean
}>(), {
  refreshable: true,
})

defineEmits<{
  retry: []
}>()

const statusLabel = (value: string) => ({
  SUBMITTED: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  ACTIVE: '生效',
  SUSPENDED: '暂停',
  REVOKED: '撤销',
  EXPIRED: '到期',
}[value] || value)

const failedCheckLabel = (value: string) => ({
  ACCOUNT_AGE: '账号时长',
  DOMAIN_REPUTATION: '领域声望',
  ACTIVITY: '近期可信贡献',
  VIOLATIONS: '有效违规',
  CURATION_ACCURACY: '策展准确率',
  RISK_FREEZE: '风险冻结',
}[value] || value)

const formatTime = (value?: string | null) => {
  if (!value) return '无'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<style scoped>
.eligibility-panel { min-width: 0; border: 1px solid var(--border-subtle); border-radius: .625rem; background: white; padding: 1rem; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: .75rem; }
.panel-heading h3 { display: flex; align-items: center; gap: .4rem; margin: 0; color: var(--text-strong); font-size: .95rem; font-weight: 900; }
.panel-heading p { margin: .3rem 0 0; color: var(--text-muted); font-size: .73rem; line-height: 1.5; }
.icon-button { display: inline-flex; height: 2.25rem; width: 2.25rem; flex: none; align-items: center; justify-content: center; border: 1px solid var(--border-subtle); border-radius: .45rem; background: white; color: var(--text-primary); }
.panel-body { display: grid; gap: .85rem; margin-top: 1rem; }
.status-line, .action-summary { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; }
.status-pill, .meta-chip { display: inline-flex; align-items: center; border-radius: 999px; padding: .22rem .5rem; font-size: .66rem; font-weight: 900; }
.status-ok { background: rgb(220 252 231); color: rgb(21 128 61); }
.status-warn { background: rgb(254 243 199); color: rgb(146 64 14); }
.status-muted, .meta-chip { background: var(--surface-soft); color: var(--text-primary); }
.evidence-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .5rem; }
.evidence-row { display: flex; min-width: 0; align-items: flex-start; gap: .5rem; border: 1px solid var(--border-subtle); border-radius: .5rem; padding: .6rem; }
.evidence-mark { display: inline-flex; height: 1.35rem; width: 1.35rem; flex: none; align-items: center; justify-content: center; border-radius: 999px; }
.evidence-passed { background: rgb(220 252 231); color: rgb(21 128 61); }
.evidence-failed { background: rgb(254 226 226); color: rgb(185 28 28); }
.evidence-row strong, .evidence-row small { display: block; overflow-wrap: anywhere; }
.evidence-row strong { color: var(--text-strong); font-size: .75rem; font-weight: 900; }
.evidence-row small { margin-top: .2rem; color: var(--text-muted); font-size: .68rem; line-height: 1.45; }
.detail-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .5rem; }
.detail-grid div { min-width: 0; border-radius: .5rem; background: var(--surface-soft); padding: .6rem; }
.detail-grid span, .detail-grid strong { display: block; overflow-wrap: anywhere; }
.detail-grid span { color: var(--text-muted); font-size: .68rem; }
.detail-grid strong { margin-top: .2rem; color: var(--text-strong); font-size: .78rem; }
.notice { display: flex; align-items: flex-start; gap: .45rem; border-radius: .5rem; padding: .6rem .7rem; font-size: .72rem; line-height: 1.5; }
.notice-warn { background: rgb(255 251 235); color: rgb(146 64 14); }
.state { display: flex; min-height: 7rem; align-items: center; justify-content: center; gap: .5rem; border: 1px dashed var(--border-subtle); border-radius: .5rem; margin-top: 1rem; padding: 1rem; color: var(--text-muted); font-size: .76rem; text-align: center; }
.state-error { border-style: solid; border-color: rgb(254 202 202); color: rgb(185 28 28); }
.secondary-button { display: inline-flex; min-height: 32px; align-items: center; justify-content: center; border: 1px solid var(--border-subtle); border-radius: .45rem; background: white; padding: .35rem .6rem; color: var(--text-primary); font-size: .7rem; font-weight: 900; }
button:disabled { cursor: not-allowed; opacity: .5; }
@media (max-width: 680px) { .evidence-grid, .detail-grid { grid-template-columns: 1fr; } }
.dark .eligibility-panel, .dark .icon-button, .dark .secondary-button { border-color: var(--border-subtle); background: var(--surface-1); color: var(--text-muted); }
.dark .panel-heading h3, .dark .evidence-row strong, .dark .detail-grid strong { color: var(--text-strong); }
.dark .panel-heading p, .dark .evidence-row small, .dark .detail-grid span, .dark .state { color: var(--text-muted); }
.dark .evidence-row { border-color: var(--border-subtle); }
.dark .detail-grid div { background: color-mix(in srgb, var(--surface-1) 60%, transparent); }
.dark .status-muted, .dark .meta-chip { background: var(--surface-1); color: var(--text-muted); }
</style>
