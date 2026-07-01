<template>
  <div class="app-shell">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="surface-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="stage4-kicker">认证作者体系</span>
            <h1 class="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">
              认证作者申请
            </h1>
            <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              认证用于标识持续贡献和领域经验，提交后进入人工审核；认证不代表平台对每条内容背书。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <RouterLink to="/me" class="secondary-action">
              我的作者主页
            </RouterLink>
            <RouterLink to="/knowledge/explore" class="secondary-action">
              知识关系
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="mt-6">
        <EmptyState
          v-if="!authStore.isLoggedIn"
          title="登录后提交认证作者申请"
          description="认证申请会读取你的公开内容，并保留可审核的资格解释与证据摘要。"
          action-text="去登录"
          :action-href="loginHref"
        />

        <div v-else class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article class="surface-card p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black text-slate-950 dark:text-white">资格检查</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  认证门槛默认看同领域至少 3 篇公开内容，并且 90 天内至少有 1 篇更新。
                </p>
              </div>
              <button type="button" class="secondary-action" :disabled="loadingEligibility" @click="loadEligibility">
                {{ loadingEligibility ? '加载中...' : '刷新资格' }}
              </button>
            </div>

            <label class="mt-5 block">
              <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">申请领域</span>
              <select v-model.number="selectedDomain" class="filter-input">
                <option v-for="domain in localDomainConfigs" :key="domain.domain" :value="domain.domain">
                  {{ domain.icon }} {{ domain.domainName }}
                </option>
              </select>
            </label>

            <LoadingSkeleton v-if="loadingEligibility" class="mt-5" />

            <div v-else-if="eligibility" class="mt-5 space-y-4">
              <div class="eligibility-card">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <strong class="text-base text-slate-950 dark:text-white">{{ eligibility.domainName }}</strong>
                    <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {{ safeCertificationExplanation(eligibility) }}
                    </p>
                  </div>
                  <span :class="['eligibility-badge', eligibility.eligible ? 'eligibility-badge-pass' : 'eligibility-badge-hold']">
                    {{ eligibility.eligible ? '可申请' : '继续积累' }}
                  </span>
                </div>

                <div class="mt-4 space-y-2">
                  <div v-for="check in eligibility.checks" :key="check.code" class="check-row">
                    <div class="min-w-0 flex-1">
                      <strong class="text-sm text-slate-900 dark:text-slate-100">{{ safeCertificationCheck(check).label }}</strong>
                      <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ safeCertificationCheck(check).detail }}</p>
                    </div>
                    <span :class="['check-pill', check.passed ? 'check-pill-pass' : 'check-pill-hold']">
                      {{ check.passed ? '通过' : '未达标' }}
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="safeCertificationRiskWarning(eligibility.riskWarning)" class="risk-banner">
                <strong>风险提示</strong>
                <p>{{ safeCertificationRiskWarning(eligibility.riskWarning) }}</p>
              </div>
            </div>

            <div v-else-if="eligibilityError" class="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {{ eligibilityError }}
            </div>
          </article>

          <article class="surface-card p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-black text-slate-950 dark:text-white">提交申请</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  保存证据摘要、证据链接和资格快照，后续由人工审核，不会自动生效。
                </p>
              </div>
            </div>

            <form class="mt-5 space-y-4" @submit.prevent="submitApplication">
              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">证据摘要</span>
                <textarea
                  v-model.trim="form.evidenceSummary"
                  rows="5"
                  maxlength="500"
                  class="filter-input min-h-36"
                  placeholder="说明你在该领域的公开内容、实践经历和希望审核者重点查看的证据。"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">证据链接</span>
                <textarea
                  v-model.trim="form.evidenceLinksText"
                  rows="4"
                  class="filter-input min-h-28"
                  placeholder="每行一个链接，最多 8 条。可以填社区帖子链接或外部作品链接。"
                />
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  当前将提交 {{ evidenceLinks.length }} 条链接。
                </p>
              </label>

              <label
                v-if="eligibility?.riskAcknowledgementRequired"
                class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <input v-model="form.riskAcknowledged" type="checkbox" class="mt-1 h-4 w-4 rounded border-amber-300" />
                <span>
                  我已知晓该领域内容仅作为社区交流，不构成投资、理财或其他专业建议。
                </span>
              </label>

              <div v-if="submitError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {{ submitError }}
              </div>

              <div class="flex flex-wrap gap-3">
                <button
                  type="submit"
                  class="primary-action"
                  :disabled="!canSubmit || submitting"
                >
                  {{ submitting ? '提交中...' : '提交申请' }}
                </button>
                <button type="button" class="secondary-action" @click="resetForm">
                  重置表单
                </button>
              </div>
            </form>
          </article>
        </div>
      </section>

      <section v-if="authStore.isLoggedIn" class="surface-card mt-6 p-6">
        <div class="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-black text-slate-950 dark:text-white">我的申请记录</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              记录当前用户在该领域的申请、审核和撤销状态。
            </p>
          </div>
          <button type="button" class="secondary-action" :disabled="loadingApplications" @click="loadApplications">
            {{ loadingApplications ? '加载中...' : '刷新记录' }}
          </button>
        </div>

        <LoadingSkeleton v-if="loadingApplications" />

        <div v-else-if="applicationsError" class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ applicationsError }}
        </div>

        <EmptyState
          v-else-if="!applications.length"
          title="还没有申请记录"
          description="先通过资格检查，再提交第一条认证申请。"
        />

        <div v-else class="space-y-3">
          <article v-for="item in applications" :key="item.id" class="application-card">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="text-base text-slate-950 dark:text-white">{{ item.domainName }}</strong>
                  <span :class="['status-pill', certificationStatusTone(item.status)]">{{ certificationStatusText(item.status) }}</span>
                </div>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ item.evidenceSummary }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span class="meta-pill">提交 {{ formatTime(item.createTime) }}</span>
                  <span class="meta-pill">{{ item.eligibilityPassed ? '资格通过' : '资格待补充' }}</span>
                  <span class="meta-pill">人工审核</span>
                </div>
              </div>

              <button
                v-if="canRevoke(item)"
                type="button"
                class="secondary-action shrink-0"
                :disabled="revokingId === String(item.id)"
                @click="revokeApplication(item.id)"
              >
                {{ revokingId === String(item.id) ? '撤销中...' : '撤销申请' }}
              </button>
            </div>

            <div class="mt-4 grid gap-3 md:grid-cols-1">
              <div class="detail-card">
                <strong>资格解释</strong>
                <p>{{ safeCertificationSummary(item) }}</p>
              </div>
            </div>

            <div v-if="item.evidenceLinks.length" class="mt-4 flex flex-wrap gap-2">
              <a
                v-for="link in item.evidenceLinks"
                :key="link"
                :href="link"
                target="_blank"
                rel="noreferrer"
                class="link-chip"
              >
                {{ link }}
              </a>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
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
    .slice(0, 8)
))

const canSubmit = computed(() => {
  if (!authStore.isLoggedIn || !eligibility.value?.eligible) return false
  if (!form.evidenceSummary.trim()) return false
  if (eligibility.value.riskAcknowledgementRequired && !form.riskAcknowledged) return false
  return true
})

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
  if (!authStore.isLoggedIn) {
    eligibility.value = null
    eligibilityError.value = ''
    return
  }
  loadingEligibility.value = true
  eligibilityError.value = ''
  try {
    const res = await expertCertificationApi.getEligibility(selectedDomain.value)
    eligibility.value = res.data
  } catch (err) {
    eligibility.value = null
    eligibilityError.value = getErrorMessage(err, '加载资格检查失败')
  } finally {
    loadingEligibility.value = false
  }
}

const loadApplications = async () => {
  if (!authStore.isLoggedIn) {
    applications.value = []
    applicationsError.value = ''
    return
  }
  loadingApplications.value = true
  applicationsError.value = ''
  try {
    const res = await expertCertificationApi.listMine(selectedDomain.value)
    applications.value = res.data || []
  } catch (err) {
    applications.value = []
    applicationsError.value = getErrorMessage(err, '加载申请记录失败')
  } finally {
    loadingApplications.value = false
  }
}

const refreshStageFourCertification = async () => {
  await Promise.all([loadEligibility(), loadApplications()])
}

const submitApplication = async () => {
  if (!canSubmit.value) return
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
  } catch (err) {
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

watch(selectedDomain, async () => {
  resetForm()
  await refreshStageFourCertification()
})

watch(() => authStore.isLoggedIn, async () => {
  await refreshStageFourCertification()
})

onMounted(async () => {
  await refreshStageFourCertification()
})
</script>

<style scoped>
.stage4-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(3 105 161);
}

.eligibility-card,
.application-card,
.detail-card {
  border: 1px solid rgb(226 232 240);
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
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.9rem;
  background: rgb(248 250 252);
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
  color: rgb(15 23 42);
}

.detail-card p {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  line-height: 1.55;
  color: rgb(100 116 139);
}

.meta-pill {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.link-chip {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.dark .stage4-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .eligibility-card,
.dark .application-card,
.dark .detail-card {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.88);
}

.dark .check-row {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
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
  color: rgb(241 245 249);
}

.dark .detail-card p {
  color: rgb(148 163 184);
}

.dark .status-revoke,
.dark .meta-pill {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .link-chip {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}
</style>
