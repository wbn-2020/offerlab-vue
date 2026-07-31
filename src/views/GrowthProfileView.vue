<template>
  <div class="app-shell">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="surface-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="growth-kicker">成长品牌</span>
            <h1 class="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">
              成长档案
            </h1>
            <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              用可解释的活跃度、影响力、内容深度和持续性，整理你在不同领域的成长轨迹。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in dayOptions"
              :key="option"
              type="button"
              :class="['day-chip', days === option ? 'day-chip-active' : '']"
              @click="days = option"
            >
              {{ option }} 天
            </button>
            <RouterLink to="/growth/report" class="secondary-action">
              周报 / 月报
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
          title="登录后查看个人成长档案"
          description="成长档案会读取你自己的发布、互动和系列数据，不对外公开。"
          action-text="去登录"
          :action-href="loginRedirectHref"
        />

        <div v-else class="space-y-6">
          <LoadingSkeleton v-if="loading" />

          <div v-else-if="error" class="surface-card p-6">
            <h2 class="text-lg font-black text-slate-950 dark:text-white">成长档案暂时不可用</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ error }}</p>
            <button type="button" class="primary-action mt-4" @click="loadProfile">
              重新加载
            </button>
          </div>

          <EmptyState
            v-else-if="!profile || !profile.domains.length"
            title="还没有足够的成长数据"
            description="公开内容档案尚未形成；下方成长路径仍会独立展示可读取的共建、贡献、权益和角色记录。"
            action-text="去发布"
            action-href="/editor"
          />

          <section v-else class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <article class="surface-card p-6">
              <div class="grid gap-4 md:grid-cols-3">
                <div class="summary-card">
                  <span class="summary-label">最强领域</span>
                  <strong>{{ strongestDomain }}</strong>
                  <p>{{ primaryDomain?.postCount ?? 0 }} 篇公开内容</p>
                </div>
                <div class="summary-card">
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

            <article class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">雷达维度说明</h2>
              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div v-for="item in dimensionGlossary" :key="item.key" class="glossary-card">
                  <strong>{{ item.label }}</strong>
                  <p>{{ item.detail }}</p>
                </div>
              </div>
              <div v-if="profile.degraded" class="fallback-banner mt-4">
                <strong>{{ profileDemoNotice ? '当前展示本地样例档案' : '当前为降级视图' }}</strong>
                <p>
                  {{ profileDemoNotice || profile.degradationReasons.join(' / ') || '部分服务未就绪，当前只展示规则聚合结果。' }}
                </p>
              </div>
            </article>
          </section>

          <section id="growth-path" class="surface-card p-6">
            <div class="mb-4">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">成长路径</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                按社区六步成长路径，如实映射你已留下的公开记录。路径只反映记录本身，不排先后高低、不代表资质，也不与任何人对比。
              </p>
            </div>
            <p v-if="pathLoading" class="growth-path-loading">正在读取你的记录…</p>
            <ol v-else class="growth-path-list">
              <li v-for="(step, index) in growthPathSteps" :key="step.key" class="growth-path-step">
                <span :class="['growth-path-marker', `growth-path-marker--${step.state}`]">{{ index + 1 }}</span>
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

          <template v-if="profile && profile.domains.length">
            <section id="curation-feedback" class="surface-card p-6">
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
              <p v-else class="curation-empty">暂无公开内容入选反馈</p>
            </section>

            <section class="grid gap-4 lg:grid-cols-2">
              <article
                v-for="domain in profile.domains"
                :key="domain.domain"
                class="surface-card p-6"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div class="flex items-center gap-3">
                      <span v-if="isKnownDomain(domain.domain)" class="domain-icon">{{ getDomainIcon(domain.domain) }}</span>
                      <div>
                        <h2 class="text-lg font-black text-slate-950 dark:text-white">{{ profileDomainLabel(domain) }}</h2>
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                          综合得分 {{ totalScore(domain) }} / 400
                        </p>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span class="meta-pill">发布 {{ domain.postCount }}</span>
                      <span class="meta-pill">系列 {{ domain.seriesCount }}</span>
                      <span class="meta-pill">活跃日 {{ domain.activeDays }}</span>
                      <span class="meta-pill">互动 {{ domain.interactionCount }}</span>
                      <span class="meta-pill">浏览 {{ domain.viewCount }}</span>
                    </div>
                  </div>
                </div>

                <div class="mt-5 space-y-3">
                  <div v-for="dimension in domain.dimensions" :key="dimension.key">
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
                    class="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
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
const profileDemoNotice = computed(() => profile.value?.degradationReasons?.includes('local_demo_seed')
  ? '这些内容是本地样例，用来说明成长档案会如何组织公开内容，不代表你的真实成长画像。'
  : ''
)
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
.growth-path-loading {
  font-size: 0.85rem;
  color: rgb(100 116 139);
}

.growth-path-list {
  display: grid;
  gap: 1.1rem;
}

.growth-path-step {
  display: flex;
  gap: 0.85rem;
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
  color: rgb(15 23 42);
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
  color: rgb(100 116 139);
}

.growth-path-evidence {
  margin-top: 0.2rem;
  font-size: 0.82rem;
  line-height: 1.6;
  color: rgb(51 65 85);
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
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(3 105 161);
}

.day-chip {
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.55rem 0.9rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.day-chip-active {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.summary-card,
.glossary-card,
.post-row {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
}

.summary-card {
  min-height: 9rem;
  padding: 1rem;
}

.summary-label {
  display: inline-flex;
  margin-bottom: 0.75rem;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.25rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
}

.summary-card strong {
  display: block;
  font-size: 1.125rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.summary-card p,
.glossary-card p {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(100 116 139);
}

.glossary-card {
  padding: 1rem;
}

.glossary-card strong {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.fallback-banner {
  border-radius: 1rem;
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
  border-radius: 0.9rem;
  background: rgb(239 246 255);
  font-size: 1.2rem;
}

.meta-pill {
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.35rem 0.65rem;
}

.dimension-bar {
  height: 0.65rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.dimension-bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(14 165 233), rgb(37 99 235));
}

.post-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1rem;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.post-row:hover {
  border-color: rgb(191 219 254);
  transform: translateY(-1px);
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
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
  padding: 1rem;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.curation-card:hover {
  border-color: rgb(191 219 254);
  transform: translateY(-1px);
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
  border-radius: 1rem;
  border: 1px dashed rgb(203 213 225);
  padding: 1rem;
}

.dark .growth-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .day-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .day-chip-active {
  border-color: rgb(59 130 246);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .summary-card,
.dark .glossary-card,
.dark .post-row {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.88);
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
  background: rgb(30 41 59);
}

.dark .dimension-bar {
  background: rgb(30 41 59);
}

.dark .curation-state-pill {
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}

.dark .curation-card {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.88);
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
</style>
