<template>
  <div class="app-shell growth-profile-page">
    <AppHeader />

    <main class="community-page growth-profile-main">
      <header class="growth-page-heading">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="growth-kicker">创作成长</span>
            <h1>
              成长档案
            </h1>
            <p class="growth-page-description">
              用可解释的活跃度、影响力、内容深度和持续性，整理你在不同领域的成长轨迹。
            </p>
          </div>
          <div class="growth-heading-actions">
            <div class="day-segment" aria-label="成长统计周期">
              <button
                v-for="option in dayOptions"
                :key="option"
                type="button"
                :class="['day-chip', days === option ? 'day-chip-active' : '']"
                :aria-pressed="days === option"
                @click="days = option"
              >
                {{ option }} 天
              </button>
            </div>
            <RouterLink to="/growth/report" class="secondary-action">
              <FileBarChart class="h-4 w-4" />
              周报 / 月报
            </RouterLink>
            <RouterLink to="/knowledge/explore" class="secondary-action">
              <Network class="h-4 w-4" />
              知识关系
            </RouterLink>
          </div>
        </div>
      </header>

      <section class="growth-content">
        <EmptyState
          v-if="!authStore.isLoggedIn"
          title="登录后查看个人成长档案"
          description="成长档案会读取你自己的发布、互动和系列数据，不对外公开。"
          action-text="去登录"
          :action-href="loginRedirectHref"
        />

        <div v-else class="space-y-6">
          <LoadingSkeleton v-if="loading" />

          <div v-else-if="error" class="surface-panel growth-error-state">
            <AlertTriangle class="h-5 w-5" />
            <div>
              <h2 class="text-lg font-black text-slate-950 dark:text-white">成长档案暂时不可用</h2>
              <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                当前无法确认你的成长记录，请稍后重试。已有内容和个人数据不会因此改变。
              </p>
              <button type="button" class="primary-action mt-4" @click="loadProfile">
                <RefreshCw class="h-4 w-4" />
                重新加载
              </button>
            </div>
          </div>

          <EmptyState
            v-else-if="!hasReliableGrowthProfile"
            title="还没有足够的成长数据"
            description="先发布一篇公开内容，或参与一次真实讨论。记录足够后，这里才会生成成长档案，不会用全零指标代替你的真实进展。"
            action-text="去发布"
            action-href="/editor"
          />

          <section v-else-if="profile" class="growth-overview-layout">
            <article class="surface-panel growth-summary-panel">
              <div class="growth-summary-grid">
                <div class="summary-card">
                  <span class="summary-label">最强领域</span>
                  <strong>{{ strongestDomain }}</strong>
                  <p>{{ primaryDomain?.postCount }} 篇公开内容</p>
                </div>
                <div v-if="profile?.emergingDomain" class="summary-card">
                  <span class="summary-label">新兴方向</span>
                  <strong>{{ emergingDomain }}</strong>
                  <p>{{ profile.days }} 天内正在抬头的领域</p>
                </div>
                <div class="summary-card">
                  <span class="summary-label">下一步聚焦</span>
                  <strong>行动建议</strong>
                  <p>{{ profile.nextFocus || '继续把高质量内容沉淀成系列。' }}</p>
                </div>
              </div>
            </article>

            <article class="surface-panel growth-guide-panel">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">雷达维度说明</h2>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div v-for="item in dimensionGlossary" :key="item.key" class="glossary-card">
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.detail }}</p>
                </div>
              </div>
            </article>
          </section>

          <section v-if="pathLoading || hasGrowthPathEvidence" id="growth-path" class="surface-panel growth-path-panel">
            <div class="mb-4">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">成长路径</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                按社区六步成长路径，如实映射你已留下的公开记录。路径只反映记录本身，不排先后高低、不代表资质，也不与任何人对比。
              </p>
            </div>
            <p v-if="pathLoading" class="growth-path-loading">正在读取你的记录…</p>
            <ol v-else class="growth-path-list">
              <li v-for="step in visibleGrowthPathSteps" :key="step.key" class="growth-path-step">
                <span :class="['growth-path-marker', `growth-path-marker--${step.state}`]" aria-hidden="true">✓</span>
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="growth-path-title">{{ step.title }}</h3>
                    <span :class="['growth-path-state', `growth-path-state--${step.state}`]">
                      {{ growthPathStateLabel(step.state) }}
                    </span>
                  </div>
                  <p class="growth-path-hint">{{ step.hint }}</p>
                  <p v-for="line in step.evidence" :key="line" class="growth-path-evidence">{{ line }}</p>
                </div>
              </li>
            </ol>
          </section>

          <template v-if="hasReliableGrowthProfile">
            <section v-if="recentCurationFeedbackItems.length" id="curation-feedback" class="surface-panel curation-panel">
              <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 class="text-lg font-black text-slate-950 dark:text-white">最近入选反馈</h2>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    展示公开内容被社区收录后的可回访信息。
                  </p>
                </div>
                <span v-if="curationFeedbackSummary?.degraded" class="curation-state-pill">降级空态</span>
              </div>
              <div v-if="recentCurationFeedbackItems.length" class="grid gap-3 lg:grid-cols-3">
                <RouterLink
                  v-for="item in recentCurationFeedbackItems"
                  :key="item.eventId"
                  :to="item.href"
                  class="curation-card"
                >
                  <span class="curation-card-kicker">收录位置：{{ curationFeedbackLocation(item) }}</span>
                  <h3>{{ item.contentTitle }}</h3>
                  <p>收录理由：{{ item.reasonText }}</p>
                  <small>{{ curationFeedbackStatusLabel(item) }} · {{ formatTime(item.includedAt || item.triggeredAt) }}</small>
                </RouterLink>
              </div>
            </section>

            <section class="grid gap-4 domain-grid">
              <article
                v-for="domain in meaningfulDomains"
                :key="domain.domain"
                class="surface-panel domain-card"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div class="flex items-center gap-3">
                      <span v-if="isKnownDomain(domain.domain)" class="domain-icon">{{ getDomainIcon(domain.domain) }}</span>
                      <div>
                        <h2 class="text-lg font-black text-slate-950 dark:text-white">{{ profileDomainLabel(domain) }}</h2>
                        <p v-if="totalScore(domain) > 0" class="text-xs text-slate-500 dark:text-slate-400">
                          综合得分 {{ totalScore(domain) }} / 400
                        </p>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span v-if="domain.postCount > 0" class="meta-pill">发布 {{ domain.postCount }}</span>
                      <span v-if="domain.seriesCount > 0" class="meta-pill">系列 {{ domain.seriesCount }}</span>
                      <span v-if="domain.activeDays > 0" class="meta-pill">活跃日 {{ domain.activeDays }}</span>
                      <span v-if="domain.interactionCount > 0" class="meta-pill">互动 {{ domain.interactionCount }}</span>
                      <span v-if="domain.viewCount > 0" class="meta-pill">浏览 {{ domain.viewCount }}</span>
                    </div>
                  </div>
                </div>

                <div class="mt-5 space-y-3">
                  <div v-for="dimension in meaningfulDimensions(domain)" :key="dimension.key">
                    <div class="mb-1 flex items-center justify-between gap-3 text-sm">
                      <strong class="text-slate-900 dark:text-slate-100">{{ dimension.label }}</strong>
                      <span class="text-slate-500 dark:text-slate-400">{{ dimension.score }}</span>
                    </div>
                    <div class="dimension-bar">
                      <span :style="{ width: `${dimension.score}%` }" />
                    </div>
                    <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {{ dimension.explanation }}
                    </p>
                  </div>
                </div>

                <div class="mt-5">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <strong class="text-sm text-slate-900 dark:text-slate-100">代表内容</strong>
                    <span class="text-xs text-slate-500 dark:text-slate-400">最多展示 4 条</span>
                  </div>
                  <div v-if="domain.representativePosts.length" class="space-y-2">
                    <RouterLink
                      v-for="post in domain.representativePosts"
                      :key="post.postId"
                      :to="`/post/${post.postId}`"
                      class="post-row"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {{ post.title }}
                        </div>
                        <div class="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{{ post.heat }} 热度</span>
                          <span>{{ representativePostDomainLabel(post.domain, domain.domain) }}</span>
                          <span v-if="post.featured">精选</span>
                        </div>
                      </div>
                      <span class="post-row-link">查看</span>
                    </RouterLink>
                  </div>
                  <p
                    v-else
                    class="domain-empty-state"
                  >
                    这个领域还在积累样本，继续发布或整理系列后会形成更稳定的代表内容。
                  </p>
                </div>
              </article>
            </section>
          </template>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { AlertTriangle, FileBarChart, Network, RefreshCw } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage, type Result } from '@/api/client'
import { creatorFeedbackApi } from '@/api/creatorFeedback'
import { growthApi } from '@/api/growth'
import { incentiveApi, type IncentiveAccount } from '@/api/incentives'
import { collaborationApi } from '@/api/collaboration'
import {
  hasUntrustedGrowthMetadata,
  isTrustedGrowthResult,
  summarizeGrowthPath,
  toGrowthCount,
  type GrowthPathSnapshot,
  type GrowthPathState,
  type GrowthPayloadMetadata,
} from '@/utils/growthPath'
import { useAuthStore } from '@/stores/auth'
import type { CreatorCurationFeedback, CreatorCurationFeedbackSummary, GrowthProfile, GrowthProfileDomain } from '@/api/types'
import { formatTime } from '@/lib/format'
import { getDomainIcon, getDomainLabelSafe, isKnownDomain } from '@/utils/domains'

const authStore = useAuthStore()
const route = useRoute()

const dayOptions = [7, 30, 90]
const dimensionGlossary = [
  { key: 'activity', label: '活跃度', detail: '看近周期是否持续发帖和保持领域活跃。' },
  { key: 'influence', label: '影响力', detail: '看互动反馈和公开内容的传播表现。' },
  { key: 'depth', label: '内容深度', detail: '看系列沉淀、长文输出和主题完整性。' },
  { key: 'consistency', label: '持续性', detail: '看是否稳定更新，而不是只在单个时间点爆发。' },
] as const

const days = ref(30)
const loading = ref(false)
const error = ref('')
const profile = ref<GrowthProfile | null>(null)
const profilePathPayloadTrusted = ref(false)
const curationFeedbackSummary = ref<CreatorCurationFeedbackSummary | null>(null)

const loginRedirectHref = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
const primaryDomain = computed(() => profile.value?.domains?.[0] ?? null)
const strongestDomain = computed(() => profile.value?.strongestDomain
  || (primaryDomain.value ? profileDomainLabel(primaryDomain.value) : '--'))
const emergingDomain = computed(() => profile.value?.emergingDomain || '继续观察')
const profileDomainLabel = (domain: GrowthProfileDomain) => (
  isKnownDomain(domain.domain)
    ? domain.domainName || getDomainLabelSafe(domain.domain)
    : getDomainLabelSafe(domain.domain)
)
const representativePostDomainLabel = (
  postDomain?: number | null,
  fallbackDomain?: number | null,
) => getDomainLabelSafe(postDomain == null ? fallbackDomain : postDomain)
const recentCurationFeedbackItems = computed(() => (
  curationFeedbackSummary.value?.recentItems.filter((item): item is CreatorCurationFeedback & { href: string } => Boolean(item.href)) ?? []
))

const curationFeedbackStatusLabel = (item: CreatorCurationFeedback) => {
  if (item.status === 'archived') return '专题已归档'
  if (item.status === 'offline') return '专题已下线'
  if (item.status === 'degraded') return '降级可见'
  return '已收录'
}

const curationFeedbackLocation = (item: CreatorCurationFeedback) => {
  const topic = item.topicTitle || item.placementLabel || (item.topicSlug ? `专题 ${item.topicSlug}` : '公开专题')
  const section = item.sectionTitle || item.sectionKey
  return section ? `${topic} / ${section}` : topic
}

const totalScore = (domain: GrowthProfileDomain) => (
  domain.dimensions.reduce((sum, item) => sum + Number(item.score || 0), 0)
)
const meaningfulDimensions = (domain: GrowthProfileDomain) => (
  domain.dimensions.filter((dimension) => Number(dimension.score) > 0)
)
const domainHasEvidence = (domain: GrowthProfileDomain) => (
  [
    domain.postCount,
    domain.seriesCount,
    domain.activeDays,
    domain.interactionCount,
    domain.viewCount,
  ].some((value) => Number(value) > 0)
  || meaningfulDimensions(domain).length > 0
  || domain.representativePosts.length > 0
)
const meaningfulDomains = computed(() => profile.value?.domains.filter(domainHasEvidence) ?? [])
const hasReliableGrowthProfile = computed(() => (
  Boolean(profile.value)
  && profilePathPayloadTrusted.value
  && !profile.value?.degraded
  && !profile.value?.degradationReasons.length
  && meaningfulDomains.value.length > 0
))

// ---- 成长路径（六步，仅自见）----
// 每个来源独立降级：读不到就是 null，由 growthPath 纯函数映射成「暂无法读取」，
// 绝不把读取失败伪装成「还没有」。
type GrowthPathSources = Pick<GrowthPathSnapshot, 'coBuild' | 'records' | 'reputation' | 'perks' | 'roles'>
type CountPage = GrowthPayloadMetadata & { total?: unknown }
type SessionRequestOwner = {
  requestId: number
  uid: string
  sessionQueryScope: number
}

const pathSources = ref<GrowthPathSources | null>(null)
const pathLoading = ref(false)
let profileRequestId = 0
let growthPathRequestId = 0

const currentSessionOwner = (requestId: number): SessionRequestOwner | null => {
  const uid = String(authStore.user?.uid ?? '')
  if (!authStore.isLoggedIn || !uid) return null
  return {
    requestId,
    uid,
    sessionQueryScope: Number(authStore.sessionQueryScope),
  }
}

const sessionOwnerIsCurrent = (owner: SessionRequestOwner, activeRequestId: number) => (
  owner.requestId === activeRequestId
  && authStore.isLoggedIn
  && owner.uid === String(authStore.user?.uid ?? '')
  && owner.sessionQueryScope === Number(authStore.sessionQueryScope)
)

const trustedSettledData = <T>(
  result: PromiseSettledResult<Result<T>>,
): T | null => {
  if (result.status !== 'fulfilled') return null
  return isTrustedGrowthResult(result.value) ? result.value.data : null
}

const isUsableNestedGrowthObject = (payload: unknown): payload is Record<string, unknown> => {
  return payload != null
    && typeof payload === 'object'
    && !Array.isArray(payload)
    && !hasUntrustedGrowthMetadata(payload)
}

const trustedPageTotal = (page: CountPage | null | undefined): number | null => (
  isUsableNestedGrowthObject(page) ? toGrowthCount(page.total) : null
)

const reputationSlice = (
  accounts: IncentiveAccount[],
): GrowthPathSources['reputation'] => {
  const reputationDomains = new Set<string>()
  let pointBalance = 0
  for (const rawAccount of accounts as unknown[]) {
    if (!rawAccount || typeof rawAccount !== 'object') return null
    const account = rawAccount as Partial<IncentiveAccount>
    if (account.accountType === 'REPUTATION') {
      const totalBalance = toGrowthCount(account.totalBalance)
      if (totalBalance === null) return null
      if (totalBalance > 0) {
        const domainCode = String(account.domainCode ?? '').trim()
        if (!domainCode) return null
        reputationDomains.add(domainCode)
      }
      continue
    }
    if (account.accountType === 'POINT') {
      const availableBalance = toGrowthCount(account.availableBalance)
      if (availableBalance === null) return null
      pointBalance += availableBalance
      if (!Number.isSafeInteger(pointBalance)) return null
      continue
    }
    return null
  }
  return {
    trusted: true,
    reputationDomainCount: reputationDomains.size,
    pointBalance,
  }
}

const loadGrowthPathSources = async () => {
  const owner = currentSessionOwner(++growthPathRequestId)
  if (!owner) {
    pathSources.value = null
    pathLoading.value = false
    return
  }
  pathLoading.value = true
  pathSources.value = null
  try {
    const [claimed, created, ledger, accounts, entitlements, thanks, bounties, roles] = await Promise.allSettled([
      collaborationApi.needs.mine({ size: 1 }),
      collaborationApi.needs.createdMine({ size: 1 }),
      incentiveApi.getMyLedger({ size: 1 }),
      incentiveApi.getMySummary(),
      incentiveApi.getMyEntitlements({ size: 1 }),
      incentiveApi.getMyThanks({ size: 1 }),
      incentiveApi.getMyBounties({ size: 1 }),
      incentiveApi.getMyRoles({ size: 1 }),
    ])
    if (!sessionOwnerIsCurrent(owner, growthPathRequestId)) return

    const claimedData = trustedSettledData(claimed)
    const createdData = trustedSettledData(created)
    const ledgerData = trustedSettledData(ledger)
    const claimedCount = trustedPageTotal(claimedData)
    const createdCount = trustedPageTotal(createdData)
    const ledgerCount = trustedPageTotal(ledgerData)
    const accountsData = trustedSettledData(accounts)
    const entitlementsData = trustedSettledData(entitlements)
    const entitlementCount = trustedPageTotal(entitlementsData)
    const thanksData = trustedSettledData(thanks)
    const thanksReceivedCount = thanksData && isUsableNestedGrowthObject(thanksData.received)
      ? toGrowthCount(thanksData.receivedTotal)
      : null
    const bountiesData = trustedSettledData(bounties)
    const bountySubmissionCount = trustedPageTotal(bountiesData?.submissions)
    const rolesData = trustedSettledData(roles)
    const grantCount = trustedPageTotal(rolesData?.grants)
    const applicationCount = trustedPageTotal(rolesData?.applications)

    pathSources.value = {
      coBuild: claimedCount !== null && createdCount !== null
        ? {
            trusted: true,
            claimedCount,
            createdCount,
          }
        : null,
      records: ledgerCount === null ? null : { trusted: true, ledgerCount },
      reputation: Array.isArray(accountsData) ? reputationSlice(accountsData) : null,
      perks: entitlementCount !== null && thanksReceivedCount !== null && bountySubmissionCount !== null
        ? {
            trusted: true,
            entitlementCount,
            thanksReceivedCount,
            bountySubmissionCount,
          }
        : null,
      roles: grantCount !== null && applicationCount !== null
        ? {
            trusted: true,
            grantCount,
            applicationCount,
          }
        : null,
    }
  } finally {
    if (sessionOwnerIsCurrent(owner, growthPathRequestId)) {
      pathLoading.value = false
    }
  }
}

const trustedProfilePathSource = computed<GrowthPathSnapshot['posts']>(() => {
  const current = profile.value
  if (
    !current
    || !profilePathPayloadTrusted.value
    || current.degraded
    || current.degradationReasons.length > 0
  ) return null
  const counts = current.domains.map((domain) => toGrowthCount(domain.postCount))
  if (counts.some((count) => count === null)) return null
  return {
    trusted: true,
    windowPostCount: counts.reduce<number>((sum, count) => sum + (count ?? 0), 0),
  }
})

const growthPathSteps = computed(() => summarizeGrowthPath({
  windowDays: trustedProfilePathSource.value ? profile.value?.days || days.value : days.value,
  posts: trustedProfilePathSource.value,
  coBuild: pathSources.value?.coBuild ?? null,
  records: pathSources.value?.records ?? null,
  reputation: pathSources.value?.reputation ?? null,
  perks: pathSources.value?.perks ?? null,
  roles: pathSources.value?.roles ?? null,
}))
const visibleGrowthPathSteps = computed(() => growthPathSteps.value.filter((step) => step.state === 'active'))
const hasGrowthPathEvidence = computed(() => (
  hasReliableGrowthProfile.value && visibleGrowthPathSteps.value.length > 0
))

const growthPathStateLabel = (state: GrowthPathState) => {
  if (state === 'active') return '有记录'
  if (state === 'empty') return '还没有'
  return '暂无法读取'
}

const loadProfile = async () => {
  const owner = currentSessionOwner(++profileRequestId)
  if (!owner) {
    profile.value = null
    profilePathPayloadTrusted.value = false
    curationFeedbackSummary.value = null
    error.value = ''
    loading.value = false
    return
  }
  const requestedDays = days.value
  loading.value = true
  error.value = ''
  try {
    const [profileResult, curationResult] = await Promise.allSettled([
      growthApi.getProfile(requestedDays),
      creatorFeedbackApi.getCurationFeedbackSummary(),
    ])
    if (!sessionOwnerIsCurrent(owner, profileRequestId)) return
    if (profileResult.status === 'rejected') throw profileResult.reason
    profile.value = profileResult.value.data
    profilePathPayloadTrusted.value = isTrustedGrowthResult(profileResult.value)
    curationFeedbackSummary.value = curationResult.status === 'fulfilled' ? curationResult.value.data : null
  } catch (err) {
    if (!sessionOwnerIsCurrent(owner, profileRequestId)) return
    profile.value = null
    profilePathPayloadTrusted.value = false
    curationFeedbackSummary.value = null
    error.value = getErrorMessage(err, '加载成长档案失败')
  } finally {
    if (sessionOwnerIsCurrent(owner, profileRequestId)) {
      loading.value = false
    }
  }
}

const invalidateSessionLoads = () => {
  profileRequestId += 1
  growthPathRequestId += 1
  loading.value = false
  pathLoading.value = false
}

const reloadSessionData = () => {
  invalidateSessionLoads()
  profile.value = null
  profilePathPayloadTrusted.value = false
  curationFeedbackSummary.value = null
  pathSources.value = null
  error.value = ''
  if (!authStore.isLoggedIn) return
  void loadProfile()
  void loadGrowthPathSources()
}

watch(days, () => {
  void loadProfile()
})

watch(
  () => [
    authStore.isLoggedIn,
    String(authStore.user?.uid ?? ''),
    Number(authStore.sessionQueryScope),
  ] as const,
  reloadSessionData,
)

onMounted(reloadSessionData)
onBeforeUnmount(invalidateSessionLoads)
</script>

<style scoped>
.growth-profile-page {
  background: var(--surface-2);
}

.growth-profile-main {
  padding-top: 1.5rem;
  padding-bottom: 6rem;
}

.growth-page-heading {
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.35rem 0 1.5rem;
}

.growth-page-heading h1 {
  margin-top: 0.3rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: 0;
}

.growth-page-description {
  max-width: 68ch;
  margin-top: 0.55rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.75;
}

.growth-heading-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.day-segment {
  display: inline-flex;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.2rem;
}

.growth-content {
  margin-top: 1.25rem;
}

.growth-overview-layout {
  display: grid;
  gap: 1rem;
}

.growth-summary-panel,
.growth-guide-panel,
.growth-path-panel,
.curation-panel,
.domain-card {
  padding: 1rem;
}

.growth-summary-grid {
  display: grid;
}

.growth-error-state {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--danger);
}

.domain-grid {
  display: grid;
  gap: 1rem;
}

.growth-path-loading {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.growth-path-list {
  display: grid;
  gap: 0;
}

.growth-path-step {
  display: flex;
  gap: 0.85rem;
  border-top: 1px solid var(--border-subtle);
  padding: 0.9rem 0;
}

.growth-path-step:first-child {
  border-top: 0;
  padding-top: 0;
}

.growth-path-step:last-child {
  padding-bottom: 0;
}

.growth-path-marker {
  display: inline-flex;
  height: 1.9rem;
  width: 1.9rem;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 900;
}

.growth-path-marker--active {
  background: rgb(209 250 229);
  color: rgb(6 95 70);
}

.growth-path-marker--empty {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.growth-path-marker--unavailable {
  border: 1px dashed rgb(148 163 184);
  background: transparent;
  color: rgb(100 116 139);
}

.growth-path-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-strong);
}

.growth-path-state {
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
}

.growth-path-state--active {
  background: rgb(209 250 229);
  color: rgb(6 95 70);
}

.growth-path-state--empty {
  background: rgb(241 245 249);
  color: rgb(100 116 139);
}

.growth-path-state--unavailable {
  border: 1px dashed rgb(148 163 184);
  color: rgb(100 116 139);
}

.growth-path-hint {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.growth-path-evidence {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.dark .growth-path-loading,
.dark .growth-path-hint {
  color: rgb(148 163 184);
}

.dark .growth-path-title {
  color: rgb(241 245 249);
}

.dark .growth-path-evidence {
  color: rgb(203 213 225);
}

.dark .growth-path-marker--active,
.dark .growth-path-state--active {
  background: rgb(6 78 59 / 0.6);
  color: rgb(110 231 183);
}

.dark .growth-path-marker--empty,
.dark .growth-path-state--empty {
  background: rgb(30 41 59);
  color: rgb(148 163 184);
}

.dark .growth-path-marker--unavailable,
.dark .growth-path-state--unavailable {
  border-color: rgb(71 85 105);
  color: rgb(148 163 184);
}

.growth-kicker {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--primary-600);
}

.day-chip {
  min-height: 34px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  padding: 0.4rem 0.7rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.day-chip-active {
  background: var(--primary-50);
  color: var(--primary-700);
}

.summary-card,
.glossary-card,
.post-row {
  background: transparent;
}

.summary-card {
  min-height: 7.5rem;
  border-top: 1px solid var(--border-subtle);
  padding: 1rem;
}

.summary-card:first-child {
  border-top: 0;
}

.summary-label {
  display: block;
  margin-bottom: 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--text-muted);
}

.summary-card strong {
  display: block;
  font-size: 1.125rem;
  font-weight: 900;
  color: var(--text-strong);
}

.summary-card p,
.glossary-card p {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.glossary-card {
  border-top: 1px solid var(--border-subtle);
  padding: 0.8rem 0;
}

.glossary-card:nth-child(-n + 2) {
  border-top: 0;
}

.glossary-card strong {
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--text-strong);
}

.fallback-banner {
  border-radius: var(--radius-control);
  border: 1px solid rgb(254 215 170);
  background: rgb(255 247 237);
  padding: 1rem;
}

.fallback-banner strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(154 52 18);
}

.fallback-banner p {
  margin-top: 0.35rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(154 52 18);
}

.domain-icon {
  display: inline-flex;
  height: 2.75rem;
  width: 2.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  background: var(--primary-50);
  font-size: 1.2rem;
}

.meta-pill {
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.35rem 0.65rem;
}

.dimension-bar {
  height: 0.5rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.dimension-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--primary-600);
}

.post-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-top: 1px solid var(--border-subtle);
  padding: 0.9rem 1rem;
  transition: background-color 0.15s ease;
}

.post-row:first-child {
  border-top: 0;
}

.post-row:hover {
  background: var(--surface-2);
}

.post-row-link {
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.curation-state-pill,
.curation-card-kicker {
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 900;
}

.curation-state-pill {
  align-self: flex-start;
  background: rgb(255 247 237);
  padding: 0.3rem 0.65rem;
  color: rgb(154 52 18);
}

.curation-card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 1rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.curation-card:hover {
  border-color: rgb(191 219 254);
  background: var(--primary-50);
}

.curation-card-kicker {
  display: inline-flex;
  background: rgb(239 246 255);
  padding: 0.25rem 0.55rem;
  color: rgb(29 78 216);
}

.curation-card h3 {
  margin-top: 0.75rem;
  font-size: 0.98rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.curation-card p,
.curation-card small,
.curation-empty {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(100 116 139);
}

.curation-empty {
  border-radius: var(--radius-control);
  border: 1px dashed rgb(203 213 225);
  padding: 1rem;
}

.dark .day-chip {
  background: transparent;
  color: var(--text-muted);
}

.domain-empty-state {
  margin: 0;
  background: var(--surface-2);
  padding: 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.dark .day-chip-active {
  background: var(--surface-3);
  color: #bfdbfe;
}

.dark .summary-label,
.dark .meta-pill {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .summary-card strong,
.dark .glossary-card strong {
  color: rgb(241 245 249);
}

.dark .summary-card p,
.dark .glossary-card p {
  color: rgb(148 163 184);
}

.dark .fallback-banner {
  border-color: rgb(154 52 18);
  background: rgb(67 20 7 / 0.45);
}

.dark .fallback-banner strong,
.dark .fallback-banner p {
  color: rgb(253 186 116);
}

.dark .domain-icon {
  background: var(--surface-3);
}

.dark .dimension-bar {
  background: rgb(30 41 59);
}

.dark .curation-state-pill {
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}

.dark .curation-card {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .curation-card-kicker {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .curation-card h3 {
  color: rgb(241 245 249);
}

.dark .curation-card p,
.dark .curation-card small,
.dark .curation-empty {
  color: rgb(148 163 184);
}

.dark .curation-empty {
  border-color: rgb(51 65 85);
}

@media (min-width: 768px) {
  .growth-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .summary-card {
    border-top: 0;
    border-left: 1px solid var(--border-subtle);
  }

  .summary-card:first-child {
    border-left: 0;
  }
}

@media (min-width: 1024px) {
  .growth-overview-layout {
    grid-template-columns: minmax(0, 1.2fr) minmax(19rem, 0.8fr);
  }

  .domain-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .growth-profile-main {
    padding-top: 1rem;
  }

  .growth-page-heading h1 {
    font-size: 1.5rem;
  }

  .growth-heading-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .day-segment {
    grid-column: 1 / -1;
  }

  .day-chip {
    flex: 1;
  }

  .growth-summary-panel,
  .growth-guide-panel,
  .growth-path-panel,
  .curation-panel,
  .domain-card {
    padding: 0.9rem;
  }
}
</style>
