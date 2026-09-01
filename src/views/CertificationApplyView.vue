<template>
  <div class="app-shell">
    <AppHeader />

    <main class="community-page certification-page">
      <header class="certification-intro">
        <nav class="certification-breadcrumb" aria-label="认证作者申请路径">
          <RouterLink to="/me">
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            返回我的主页
          </RouterLink>
          <span>认证作者申请</span>
        </nav>

        <div class="certification-intro__layout">
          <div class="certification-intro__copy">
            <p class="page-kicker">作者身份与领域贡献</p>
            <h1>认证作者申请</h1>
            <p>身份说明用于标识持续贡献和领域经验，提交后进入人工审核；不代表平台对每条内容背书。</p>
          </div>
          <RouterLink to="/knowledge/explore" class="secondary-action">
            <Network class="h-4 w-4" aria-hidden="true" />
            浏览知识关系
          </RouterLink>
        </div>
      </header>

      <EmptyState
        v-if="!authStore.isLoggedIn"
        title="登录后提交认证作者申请"
        description="身份申请会读取你的公开内容，并保留可审核的资格解释与证据摘要。"
        action-text="去登录"
        :action-href="loginHref"
      />

      <template v-else>
        <ol class="surface-panel workflow-steps" aria-label="认证作者申请流程">
          <li :class="{ 'workflow-step--complete': eligibility?.eligible }">
            <span class="workflow-step__index">
              <Check v-if="eligibility?.eligible" class="h-4 w-4" aria-hidden="true" />
              <span v-else>1</span>
            </span>
            <div>
              <strong>资格检查</strong>
              <small>{{ eligibility?.eligible ? '已达到当前领域申请条件' : '核对公开贡献和近期更新' }}</small>
            </div>
          </li>
          <li :class="{ 'workflow-step--active': eligibility?.eligible }">
            <span class="workflow-step__index">2</span>
            <div>
              <strong>填写证据</strong>
              <small>说明公开内容、经历和参考链接</small>
            </div>
          </li>
          <li>
            <span class="workflow-step__index">3</span>
            <div>
              <strong>人工审核</strong>
              <small>提交后可在申请记录中查看状态</small>
            </div>
          </li>
        </ol>

        <div class="certification-workspace">
          <section class="surface-panel certification-panel">
            <header class="panel-heading">
              <div>
                <span class="section-icon"><ShieldCheck class="h-4 w-4" aria-hidden="true" /></span>
                <div>
                  <h2>资格检查</h2>
                  <p>同领域至少 3 篇公开内容，并且 90 天内至少有 1 篇更新。</p>
                </div>
              </div>
              <button
                type="button"
                class="icon-action"
                :disabled="loadingEligibility"
                title="刷新资格"
                aria-label="刷新资格"
                @click="loadEligibility"
              >
                <RefreshCw :class="['h-4 w-4', { 'animate-spin': loadingEligibility }]" aria-hidden="true" />
              </button>
            </header>

            <div class="panel-body">
              <label class="field-group">
                <span>申请领域</span>
                <select v-model.number="selectedDomain" class="filter-input">
                  <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                    {{ domain.icon }} {{ domain.domainName }}
                  </option>
                </select>
              </label>

              <LoadingSkeleton v-if="loadingEligibility" />

              <div v-else-if="eligibility" class="eligibility-result">
                <div class="eligibility-result__summary">
                  <div>
                    <span>当前领域</span>
                    <strong>{{ eligibility.domainName }}</strong>
                    <p>{{ safeCertificationExplanation(eligibility) }}</p>
                  </div>
                  <span :class="['eligibility-badge', eligibility.eligible ? 'eligibility-badge-pass' : 'eligibility-badge-hold']">
                    <CheckCircle2 v-if="eligibility.eligible" class="h-3.5 w-3.5" aria-hidden="true" />
                    <Clock3 v-else class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ eligibility.eligible ? '可申请' : '继续积累' }}
                  </span>
                </div>

                <div class="check-list">
                  <div v-for="check in eligibility.checks" :key="check.code" class="check-row">
                    <span :class="['check-icon', check.passed ? 'check-icon--pass' : 'check-icon--hold']">
                      <Check v-if="check.passed" class="h-3.5 w-3.5" aria-hidden="true" />
                      <Minus v-else class="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{{ safeCertificationCheck(check).label }}</strong>
                      <p>{{ safeCertificationCheck(check).detail }}</p>
                    </div>
                    <span :class="['check-pill', check.passed ? 'check-pill-pass' : 'check-pill-hold']">
                      {{ check.passed ? '通过' : '未达标' }}
                    </span>
                  </div>
                </div>

                <div v-if="eligibilityGaps.length" class="eligibility-gap-banner" role="status">
                  <AlertCircle class="h-4 w-4" aria-hidden="true" />
                  <div>
                    <strong>当前还差</strong>
                    <ul>
                      <li v-for="gap in eligibilityGaps" :key="gap">{{ gap }}</li>
                    </ul>
                  </div>
                </div>

                <div v-if="safeCertificationRiskWarning(eligibility.riskWarning)" class="risk-banner">
                  <AlertTriangle class="h-4 w-4" aria-hidden="true" />
                  <div>
                    <strong>风险提示</strong>
                    <p>{{ safeCertificationRiskWarning(eligibility.riskWarning) }}</p>
                  </div>
                </div>
              </div>

              <div v-else-if="eligibilityError" class="feedback-banner feedback-banner--error" role="alert">
                <AlertCircle class="h-4 w-4" aria-hidden="true" />
                <span>{{ eligibilityError }}</span>
              </div>
            </div>
          </section>

          <section class="surface-panel certification-panel">
            <header class="panel-heading">
              <div>
                <span class="section-icon"><FileText class="h-4 w-4" aria-hidden="true" /></span>
                <div>
                  <h2>申请材料</h2>
                  <p>保存证据摘要、链接和资格快照，提交后不会自动生效。</p>
                </div>
              </div>
              <span class="form-readiness" :class="{ 'form-readiness--ready': canSubmit }">
                {{ canSubmit ? '可以提交' : '待补充' }}
              </span>
            </header>

            <form class="panel-body application-form" @submit.prevent="submitApplication">
              <label class="field-group">
                <span class="field-label">
                  <span>证据摘要</span>
                  <small>{{ form.evidenceSummary.length }}/500</small>
                </span>
                <textarea
                  v-model.trim="form.evidenceSummary"
                  rows="6"
                  maxlength="500"
                  class="filter-input evidence-summary-input"
                  placeholder="说明你在该领域的公开内容、实践经历和希望审核者重点查看的证据。"
                />
                <small class="field-hint">建议说明贡献范围、实践背景、内容更新频率和可核验结果。</small>
              </label>

              <label class="field-group">
                <span class="field-label">
                  <span>证据链接</span>
                  <small>{{ evidenceLinks.length }}/8</small>
                </span>
                <textarea
                  v-model.trim="form.evidenceLinksText"
                  rows="4"
                  class="filter-input evidence-links-input"
                  placeholder="每行一个链接，最多 8 条。可以填社区帖子链接或外部作品链接。"
                />
                <small v-if="hasInvalidEvidenceLinks" class="field-feedback field-feedback--error">
                  <AlertCircle class="h-3.5 w-3.5" aria-hidden="true" />
                  链接必须以 http:// 或 https:// 开头。
                </small>
                <small v-else class="field-hint">当前将提交 {{ evidenceLinks.length }} 条安全链接。</small>
              </label>

              <label v-if="eligibility?.riskAcknowledgementRequired" class="acknowledgement-row">
                <input v-model="form.riskAcknowledged" type="checkbox">
                <span>
                  <strong>确认风险边界</strong>
                  <small>我已知晓该领域内容仅作为社区交流，不构成投资、理财或其他专业建议。</small>
                </span>
              </label>

              <div v-if="submitError" class="feedback-banner feedback-banner--error" role="alert">
                <AlertCircle class="h-4 w-4" aria-hidden="true" />
                <span>{{ submitError }}</span>
              </div>

              <div v-if="submissionBlockedReason" id="certification-submit-reason" class="form-blocker" role="status">
                <AlertCircle class="h-4 w-4" aria-hidden="true" />
                <span>{{ submissionBlockedReason }}</span>
              </div>

              <div class="form-actions">
                <button
                  type="submit"
                  class="primary-action"
                  :disabled="!canSubmit || submitting"
                  :title="submissionBlockedReason || '提交认证申请'"
                  :aria-describedby="submissionBlockedReason ? 'certification-submit-reason' : undefined"
                >
                  <Send class="h-4 w-4" aria-hidden="true" />
                  {{ submitting ? '提交中...' : '提交申请' }}
                </button>
                <button type="button" class="secondary-action" @click="resetForm">
                  <RotateCcw class="h-4 w-4" aria-hidden="true" />
                  重置
                </button>
              </div>
            </form>
          </section>
        </div>

        <section class="surface-panel application-history">
          <header class="panel-heading">
            <div>
              <span class="section-icon"><History class="h-4 w-4" aria-hidden="true" /></span>
              <div>
                <h2>我的申请记录</h2>
                <p>查看当前领域的申请、审核与撤销状态。</p>
              </div>
            </div>
            <button
              type="button"
              class="icon-action"
              :disabled="loadingApplications"
              title="刷新申请记录"
              aria-label="刷新申请记录"
              @click="loadApplications"
            >
              <RefreshCw :class="['h-4 w-4', { 'animate-spin': loadingApplications }]" aria-hidden="true" />
            </button>
          </header>

          <div class="history-body">
            <LoadingSkeleton v-if="loadingApplications" />

            <div v-else-if="applicationsError" class="feedback-banner feedback-banner--error" role="alert">
              <AlertCircle class="h-4 w-4" aria-hidden="true" />
              <span>{{ applicationsError }}</span>
            </div>

            <EmptyState
              v-else-if="!applications.length"
              title="还没有申请记录"
              description="先通过资格检查，再提交第一条认证申请。"
            />

            <div v-else class="application-list">
              <article v-for="item in applications" :key="item.id" class="application-row">
                <div class="application-row__main">
                  <div class="application-row__heading">
                    <div>
                      <strong>{{ item.domainName }}</strong>
                      <span :class="['status-pill', certificationStatusTone(item.status)]">
                        {{ certificationStatusText(item.status) }}
                      </span>
                    </div>
                    <button
                      v-if="canRevoke(item)"
                      type="button"
                      class="revoke-action"
                      :disabled="revokingId === String(item.id)"
                      @click="revokeApplication(item.id)"
                    >
                      <Undo2 class="h-4 w-4" aria-hidden="true" />
                      {{ revokingId === String(item.id) ? '撤销中...' : '撤销申请' }}
                    </button>
                  </div>

                  <p class="application-summary">{{ item.evidenceSummary }}</p>

                  <div class="application-meta">
                    <span><Clock3 class="h-3.5 w-3.5" aria-hidden="true" />提交 {{ formatTime(item.createTime) }}</span>
                    <span><ShieldCheck class="h-3.5 w-3.5" aria-hidden="true" />{{ item.eligibilityPassed ? '资格通过' : '资格待补充' }}</span>
                    <span><UserCheck class="h-3.5 w-3.5" aria-hidden="true" />人工审核</span>
                  </div>

                  <div class="application-explanation">
                    <strong>资格解释</strong>
                    <p>{{ safeCertificationSummary(item) }}</p>
                  </div>

                  <div v-if="item.evidenceLinks.length" class="evidence-link-list">
                    <a
                      v-for="link in safeEvidenceLinks(item.evidenceLinks)"
                      :key="link"
                      :href="link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Link2 class="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{{ link }}</span>
                      <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  History,
  Link2,
  Minus,
  Network,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Undo2,
  UserCheck,
} from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage } from '@/api/client'
import { expertCertificationApi } from '@/api/expertCertification'
import { localDomainConfigs } from '@/api/domains'
import { useAuthStore } from '@/stores/auth'
import type { ApiId, ExpertCertificationApplication, ExpertCertificationEligibility } from '@/api/types'
import {
  certificationStatusText,
  certificationStatusTone,
  safeCertificationCheck,
  safeCertificationExplanation,
  safeCertificationRiskWarning,
  safeCertificationSubmitError,
  safeCertificationSummary,
} from '@/utils/certificationCopy'

const authStore = useAuthStore()
const route = useRoute()
const loginHref = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath || '/certification/apply')}`)

const selectedDomain = ref(localDomainConfigs[0]?.domain ?? 1)
const loadingEligibility = ref(false)
const loadingApplications = ref(false)
const submitting = ref(false)
const revokingId = ref('')
const eligibility = ref<ExpertCertificationEligibility | null>(null)
const applications = ref<ExpertCertificationApplication[]>([])
const eligibilityError = ref('')
const applicationsError = ref('')
const submitError = ref('')
let eligibilityRequestId = 0
let applicationsRequestId = 0

const form = reactive({
  evidenceSummary: '',
  evidenceLinksText: '',
  riskAcknowledged: false,
})

const evidenceLinks = computed(() => (
  form.evidenceLinksText
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(isSafeEvidenceLink)
    .slice(0, 8)
))

const hasInvalidEvidenceLinks = computed(() => (
  form.evidenceLinksText
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .some((item) => !isSafeEvidenceLink(item))
))

const canSubmit = computed(() => {
  if (!authStore.isLoggedIn || !eligibility.value?.eligible) return false
  if (!form.evidenceSummary.trim()) return false
  if (hasInvalidEvidenceLinks.value) return false
  if (eligibility.value.riskAcknowledgementRequired && !form.riskAcknowledged) return false
  return true
})

const certificationCheckGap = (check: ExpertCertificationEligibility['checks'][number]) => {
  const copy = safeCertificationCheck(check)
  if (check.code === 'published_posts') {
    const current = Math.max(0, Number(check.current) || 0)
    const required = Math.max(1, Number(check.required) || 3)
    const remaining = Math.max(0, required - current)
    return remaining ? `同领域公开内容还差 ${remaining} 篇（当前 ${current}/${required}）。` : ''
  }
  if (check.code === 'recent_activity') return '还需要在 90 天内完成至少一次公开更新。'
  return `${copy.label}尚未满足。`
}

const eligibilityGaps = computed(() => (eligibility.value?.checks || [])
  .filter((check) => !check.passed)
  .map(certificationCheckGap)
  .filter(Boolean))

const submissionBlockedReason = computed(() => {
  if (loadingEligibility.value) return '正在核对当前领域的申请资格。'
  if (eligibilityError.value) return '资格检查暂不可用，暂不能提交申请。'
  if (!eligibility.value) return '请先完成资格检查后再提交申请。'
  if (!eligibility.value.eligible) {
    return eligibilityGaps.value.length
      ? `尚未达到申请条件：${eligibilityGaps.value.join(' ')}`
      : '尚未达到当前领域的申请条件，暂不能提交申请。'
  }
  if (!form.evidenceSummary.trim()) return '请先填写证据摘要。'
  if (hasInvalidEvidenceLinks.value) return '请修正不符合要求的证据链接。'
  if (eligibility.value.riskAcknowledgementRequired && !form.riskAcknowledged) return '请先确认风险边界。'
  return ''
})

const isSafeEvidenceLink = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const safeEvidenceLinks = (links: string[]) => links.filter(isSafeEvidenceLink)

const formatTime = (value?: number) => {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

const canRevoke = (item: ExpertCertificationApplication) => {
  const status = Number(item.status)
  return status === 10 || status === 20
}

const resetForm = () => {
  form.evidenceSummary = ''
  form.evidenceLinksText = ''
  form.riskAcknowledged = false
  submitError.value = ''
}

const loadEligibility = async () => {
  const requestId = ++eligibilityRequestId
  if (!authStore.isLoggedIn) {
    eligibility.value = null
    eligibilityError.value = ''
    loadingEligibility.value = false
    return
  }
  const requestedDomain = selectedDomain.value
  loadingEligibility.value = true
  eligibilityError.value = ''
  try {
    const res = await expertCertificationApi.getEligibility(requestedDomain)
    if (requestId !== eligibilityRequestId) return
    eligibility.value = res.data
  } catch (err) {
    if (requestId !== eligibilityRequestId) return
    eligibility.value = null
    eligibilityError.value = getErrorMessage(err, '加载资格检查失败')
  } finally {
    if (requestId === eligibilityRequestId) loadingEligibility.value = false
  }
}

const loadApplications = async () => {
  const requestId = ++applicationsRequestId
  if (!authStore.isLoggedIn) {
    applications.value = []
    applicationsError.value = ''
    loadingApplications.value = false
    return
  }
  const requestedDomain = selectedDomain.value
  loadingApplications.value = true
  applicationsError.value = ''
  try {
    const res = await expertCertificationApi.listMine(requestedDomain)
    if (requestId !== applicationsRequestId) return
    applications.value = res.data || []
  } catch (err) {
    if (requestId !== applicationsRequestId) return
    applications.value = []
    applicationsError.value = getErrorMessage(err, '加载申请记录失败')
  } finally {
    if (requestId === applicationsRequestId) loadingApplications.value = false
  }
}

const refreshStageFourCertification = async () => {
  await Promise.all([loadEligibility(), loadApplications()])
}

const submitApplication = async () => {
  if (!canSubmit.value) return
  if (hasInvalidEvidenceLinks.value) {
    submitError.value = '证据链接必须以 http:// 或 https:// 开头。'
    return
  }
  submitting.value = true
  submitError.value = ''
  try {
    await expertCertificationApi.apply({
      domain: selectedDomain.value,
      evidenceSummary: form.evidenceSummary.trim(),
      evidenceLinks: evidenceLinks.value,
      riskAcknowledged: eligibility.value?.riskAcknowledgementRequired ? form.riskAcknowledged : undefined,
    })
    toast.success('认证申请已提交，等待人工审核')
    resetForm()
    await refreshStageFourCertification()
  } catch (_err) {
    submitError.value = safeCertificationSubmitError()
  } finally {
    submitting.value = false
  }
}

const revokeApplication = async (applicationId: ApiId) => {
  revokingId.value = String(applicationId)
  try {
    await expertCertificationApi.revoke(applicationId, '用户从认证作者申请页撤回。')
    toast.success('申请已撤销')
    await loadApplications()
  } catch (err) {
    toast.error(getErrorMessage(err, '撤销申请失败'))
  } finally {
    revokingId.value = ''
  }
}

watch(selectedDomain, () => {
  resetForm()
})

watch([selectedDomain, () => authStore.isLoggedIn], refreshStageFourCertification, { immediate: true })
</script>

<style scoped>
.stage4-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(205 232 220);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(18 99 74);
}

.eligibility-card,
.application-card,
.detail-card {
  border: 1px solid var(--border-subtle);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
}

.eligibility-card,
.application-card {
  padding: 1rem;
}

.eligibility-badge,
.check-pill,
.status-pill,
.meta-pill,
.link-chip {
  border-radius: 999px;
  font-weight: 800;
}

.eligibility-badge,
.status-pill,
.meta-pill,
.link-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
}

.eligibility-badge-pass,
.check-pill-pass,
.status-pass {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.eligibility-badge-hold,
.check-pill-hold,
.status-pending {
  background: rgb(254 249 195);
  color: rgb(161 98 7);
}

.status-reject {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.status-revoke {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.9rem;
  background: var(--surface-soft);
  padding: 0.85rem 0.95rem;
}

.check-pill {
  flex-shrink: 0;
  padding: 0.3rem 0.55rem;
  font-size: 0.72rem;
}

.risk-banner {
  border-radius: 1rem;
  border: 1px solid rgb(254 215 170);
  background: rgb(255 247 237);
  padding: 1rem;
}

.risk-banner strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(154 52 18);
}

.risk-banner p {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(154 52 18);
}

.detail-card {
  padding: 0.9rem;
}

.detail-card strong {
  display: block;
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--text-strong);
}

.detail-card p {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  line-height: 1.55;
  color: var(--text-muted);
}

.meta-pill {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.link-chip {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.dark .stage4-kicker {
  background: rgb(7 31 24);
  color: rgb(124 195 165);
}

.dark .eligibility-card,
.dark .application-card,
.dark .detail-card {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-1) 88%, transparent);
}

.dark .check-row {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .risk-banner {
  border-color: rgb(154 52 18);
  background: rgb(67 20 7 / 0.45);
}

.dark .risk-banner strong,
.dark .risk-banner p {
  color: rgb(253 186 116);
}

.dark .detail-card strong {
  color: var(--text-strong);
}

.dark .detail-card p {
  color: var(--text-muted);
}

.dark .status-revoke,
.dark .meta-pill {
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .link-chip {
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.certification-page {
  padding-top: 1.5rem;
  padding-bottom: 5rem;
}

.certification-intro {
  padding: 0.25rem 0 1.5rem;
}

.certification-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1.15rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
}

.certification-breadcrumb a {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--text-primary);
}

.certification-breadcrumb a:hover {
  color: var(--primary-600);
}

.certification-breadcrumb span::before {
  content: "/";
  margin-right: 0.65rem;
  color: #cbd5e1;
}

.certification-intro__layout {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
}

.certification-intro__copy {
  max-width: 44rem;
}

.page-kicker {
  margin: 0 0 0.5rem;
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 700;
}

.certification-intro h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.25;
  text-wrap: balance;
}

.certification-intro__copy > p:last-child {
  max-width: 70ch;
  margin: 0.7rem 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.75;
  text-wrap: pretty;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 1rem;
  overflow: hidden;
}

.workflow-steps li {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  padding: 0.9rem 1rem;
}

.workflow-steps li + li {
  border-left: 1px solid var(--border-subtle);
}

.workflow-step__index {
  display: inline-grid;
  width: 1.8rem;
  height: 1.8rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 800;
}

.workflow-steps strong,
.workflow-steps small {
  display: block;
}

.workflow-steps strong {
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 800;
}

.workflow-steps small {
  margin-top: 0.15rem;
  color: var(--text-muted);
  font-size: 0.68rem;
  line-height: 1.45;
}

.workflow-step--complete .workflow-step__index {
  background: #ecfdf3;
  color: #027a48;
}

.workflow-step--active {
  background: var(--primary-50);
}

.workflow-step--active .workflow-step__index {
  background: var(--primary-600);
  color: #fff;
}

.certification-workspace {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 1rem;
  align-items: start;
}

.certification-panel,
.application-history {
  overflow: hidden;
}

.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--border-subtle);
}

.panel-heading > div {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  min-width: 0;
}

.section-icon {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--primary-50);
  color: var(--primary-600);
}

.panel-heading h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.4;
}

.panel-heading p {
  max-width: 58ch;
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.icon-action {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  place-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  color: var(--text-muted);
  transition: 160ms ease;
}

.icon-action:hover:not(:disabled) {
  border-color: #a9d8c3;
  background: var(--primary-50);
  color: var(--primary-600);
}

.icon-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.panel-body {
  display: grid;
  gap: 1rem;
  padding: 1.1rem 1.2rem 1.2rem;
}

.field-group {
  display: grid;
  gap: 0.45rem;
}

.field-group > span,
.field-label {
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
}

.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.field-label small {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 600;
}

.filter-input {
  width: 100%;
  min-height: 2.55rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.65rem 0.75rem;
  color: var(--text-primary);
  font-size: 0.84rem;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  transition: 160ms ease;
}

.filter-input:focus {
  border-color: #7cc3a5;
  box-shadow: 0 0 0 3px rgba(26, 127, 90, 0.1);
}

.evidence-summary-input {
  min-height: 9.25rem;
}

.evidence-links-input {
  min-height: 7rem;
}

.field-hint,
.field-feedback {
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.5;
}

.field-feedback {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.field-feedback--error {
  color: #b42318;
}

.eligibility-result {
  display: grid;
  gap: 1rem;
  padding-top: 0.2rem;
}

.eligibility-gap-banner,
.form-blocker {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-control);
  background: #fff7ed;
  padding: 0.8rem;
  color: #9a3412;
  font-size: 0.76rem;
  line-height: 1.55;
}

.eligibility-gap-banner svg,
.form-blocker svg {
  flex: 0 0 auto;
  margin-top: 0.1rem;
}

.eligibility-gap-banner strong {
  display: block;
  font-weight: 800;
}

.eligibility-gap-banner ul {
  display: grid;
  gap: 0.2rem;
  margin: 0.25rem 0 0;
  padding-left: 1.1rem;
}

.form-blocker {
  margin-top: 0.25rem;
}

.eligibility-result__summary {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.eligibility-result__summary > div > span {
  display: block;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 650;
}

.eligibility-result__summary strong {
  display: block;
  margin-top: 0.15rem;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.eligibility-result__summary p {
  margin: 0.4rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.eligibility-badge {
  gap: 0.3rem;
  flex-shrink: 0;
}

.check-list {
  display: grid;
}

.check-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.8rem 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.check-row + .check-row {
  border-top: 1px solid var(--border-subtle);
}

.check-icon {
  display: inline-grid;
  width: 1.5rem;
  height: 1.5rem;
  place-items: center;
  border-radius: 50%;
}

.check-icon--pass {
  background: #ecfdf3;
  color: #027a48;
}

.check-icon--hold {
  background: #fffaeb;
  color: #b54708;
}

.check-row strong,
.check-row p {
  display: block;
}

.check-row strong {
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 750;
}

.check-row p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.45;
}

.risk-banner {
  display: flex;
  gap: 0.65rem;
  border-radius: var(--radius-surface);
}

.risk-banner > svg {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: #c2410c;
}

.form-readiness {
  flex-shrink: 0;
  padding: 0.3rem 0.55rem;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 750;
}

.form-readiness--ready {
  background: #ecfdf3;
  color: #027a48;
}

.acknowledgement-row {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-surface);
  background: #fff7ed;
}

.acknowledgement-row input {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin-top: 0.15rem;
  accent-color: var(--primary-600);
}

.acknowledgement-row strong,
.acknowledgement-row small {
  display: block;
}

.acknowledgement-row strong {
  color: #9a3412;
  font-size: 0.78rem;
  font-weight: 800;
}

.acknowledgement-row small {
  margin-top: 0.2rem;
  color: #9a3412;
  font-size: 0.72rem;
  line-height: 1.55;
}

.feedback-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  font-size: 0.76rem;
  line-height: 1.55;
}

.feedback-banner svg {
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.feedback-banner--error {
  border-color: #fecaca;
  background: #fef3f2;
  color: #b42318;
}

.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding-top: 0.2rem;
}

.application-history {
  margin-top: 1rem;
}

.history-body {
  padding: 0 1.2rem;
}

.history-body > :first-child {
  margin-top: 1.1rem;
}

.history-body > :last-child {
  margin-bottom: 1.2rem;
}

.application-list {
  display: grid;
}

.application-row {
  padding: 1.1rem 0;
}

.application-row + .application-row {
  border-top: 1px solid var(--border-subtle);
}

.application-row__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.application-row__heading > div {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
}

.application-row__heading strong {
  color: var(--text-strong);
  font-size: 0.9rem;
  font-weight: 800;
}

.status-pill {
  padding: 0.28rem 0.55rem;
  font-size: 0.66rem;
}

.revoke-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0.35rem 0.45rem;
  border-radius: var(--radius-control);
  color: #b42318;
  font-size: 0.72rem;
  font-weight: 700;
}

.revoke-action:hover:not(:disabled) {
  background: #fef3f2;
}

.revoke-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.application-summary {
  max-width: 75ch;
  margin: 0.55rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.65;
}

.application-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1rem;
  margin-top: 0.75rem;
}

.application-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.application-explanation {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--border-subtle);
}

.application-explanation strong {
  display: block;
  color: var(--text-primary);
  font-size: 0.73rem;
  font-weight: 800;
}

.application-explanation p {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.74rem;
  line-height: 1.6;
}

.evidence-link-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.8rem;
}

.evidence-link-list a {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: min(100%, 28rem);
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-control);
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 0.68rem;
  font-weight: 650;
}

.evidence-link-list a span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.evidence-link-list a svg {
  flex-shrink: 0;
}

:global(.dark .section-icon),
:global(.dark .workflow-step__index) {
  background: var(--surface-3);
}

:global(.dark .workflow-step--active) {
  background: rgba(14, 74, 55, 0.2);
}

:global(.dark .workflow-step--active .workflow-step__index) {
  background: var(--primary-600);
}

:global(.dark .workflow-step--complete .workflow-step__index),
:global(.dark .check-icon--pass),
:global(.dark .eligibility-badge-pass),
:global(.dark .check-pill-pass),
:global(.dark .form-readiness--ready) {
  background: rgba(6, 78, 59, 0.45);
  color: #6ee7b7;
}

:global(.dark .check-icon--hold),
:global(.dark .eligibility-badge-hold),
:global(.dark .check-pill-hold) {
  background: rgba(133, 77, 14, 0.35);
  color: #fde68a;
}

:global(.dark .risk-banner),
:global(.dark .acknowledgement-row) {
  border-color: #9a3412;
  background: rgba(124, 45, 18, 0.28);
}

:global(.dark .eligibility-gap-banner),
:global(.dark .form-blocker) {
  border-color: #9a3412;
  background: rgba(124, 45, 18, 0.28);
  color: #fdba74;
}

:global(.dark .feedback-banner--error) {
  border-color: #7f1d1d;
  background: rgba(127, 29, 29, 0.24);
  color: #fca5a5;
}

:global(.dark .evidence-link-list a) {
  background: rgba(14, 74, 55, 0.24);
  color: #a9d8c3;
}

@media (max-width: 900px) {
  .certification-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .certification-page {
    padding-top: 1rem;
  }

  .certification-intro__layout {
    align-items: stretch;
    flex-direction: column;
    gap: 1rem;
  }

  .certification-intro__layout > a {
    align-self: flex-start;
  }

  .workflow-steps {
    grid-template-columns: 1fr;
  }

  .workflow-steps li + li {
    border-top: 1px solid var(--border-subtle);
    border-left: 0;
  }
}

@media (max-width: 520px) {
  .certification-intro h1 {
    font-size: 1.45rem;
  }

  .panel-heading,
  .eligibility-result__summary,
  .application-row__heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .panel-heading .icon-action,
  .application-row__heading .revoke-action {
    align-self: flex-end;
  }

  .form-readiness {
    margin-left: 2.7rem;
  }

  .check-row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .check-pill {
    grid-column: 2;
    justify-self: start;
  }

  .form-actions > button {
    flex: 1 1 8rem;
  }
}
</style>
