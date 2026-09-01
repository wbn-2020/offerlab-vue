<template>
  <div class="app-shell growth-report-page">
    <AppHeader />

    <main class="community-page growth-report-main">
      <header class="report-page-heading">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="report-kicker">创作复盘</span>
            <h1>
              周报 / 月报
            </h1>
            <p class="report-page-description">
              把最近一个周期的内容贡献、领域变化和下一步建议整理成可回顾的成长复盘。
            </p>
          </div>
          <div class="report-heading-actions">
            <div class="period-segment" aria-label="成长报告周期">
              <button
                v-for="option in periodOptions"
                :key="option.value"
                type="button"
                :class="['period-chip', period === option.value ? 'period-chip-active' : '']"
                :aria-pressed="period === option.value"
                @click="period = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <RouterLink to="/growth/profile" class="secondary-action">
              <Activity class="h-4 w-4" />
              成长档案
            </RouterLink>
            <RouterLink to="/certification/apply" class="secondary-action">
              <BadgeCheck class="h-4 w-4" />
              认证作者
            </RouterLink>
          </div>
        </div>
      </header>

      <section class="report-content">
        <EmptyState
          v-if="!authStore.isLoggedIn"
          title="登录后查看个人成长报告"
          description="成长报告会读取你的个人发布和互动轨迹，不会替代公开榜单。"
          action-text="去登录"
          :action-href="loginRedirectHref"
        />

        <LoadingSkeleton v-else-if="loading" />

        <div v-else-if="error" class="surface-panel report-error-state">
          <AlertTriangle class="h-5 w-5" />
          <div>
            <h2 class="text-lg font-black text-slate-950 dark:text-white">成长报告暂时不可用</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              当前无法确认本周期记录，请稍后重试。页面不会把读取失败解释成零成长。
            </p>
            <button type="button" class="primary-action mt-4" @click="loadReport">
              <RefreshCw class="h-4 w-4" />
              重新加载
            </button>
          </div>
        </div>

        <EmptyState
          v-else-if="!hasReliableReport"
          title="还没有可生成的成长报告"
          description="先发布内容、整理系列或参与真实互动。形成可靠记录后，这里才会展示周期变化。"
          action-text="去发布"
          action-href="/editor"
        />

        <div v-else-if="report" class="space-y-6">
          <section v-if="reportStats.length" class="surface-panel report-stat-strip">
            <article v-for="item in reportStats" :key="item.label" class="stat-card">
              <span class="stat-label">{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <p>{{ item.description }}</p>
            </article>
          </section>

          <section class="report-detail-grid">
            <article class="surface-panel report-panel">
              <div class="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-black text-slate-950 dark:text-white">领域变化</h2>
                  <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    对比上一个同长度周期，查看哪些领域正在升温或回落。
                  </p>
                </div>
              </div>
              <div v-if="report.domainChanges.length" class="space-y-3">
                <div
                  v-for="change in report.domainChanges"
                  :key="change.domain"
                  class="change-row"
                >
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <strong class="truncate text-sm text-slate-900 dark:text-slate-100">{{ domainChangeLabel(change) }}</strong>
                      <span :class="['trend-pill', trendClass(change.trend)]">{{ trendLabel(change.trend) }}</span>
                    </div>
                    <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ change.reason }}</p>
                  </div>
                  <div class="shrink-0 text-right text-xs text-slate-500 dark:text-slate-400">
                    <div>本期 {{ change.currentPostCount }}</div>
                    <div>上期 {{ change.previousPostCount }}</div>
                  </div>
                </div>
              </div>
              <p
                v-else
                class="report-inline-empty"
              >
                当前周期还没有形成明显的领域变化，继续稳定输出后会更容易看出趋势。
              </p>
            </article>

            <article class="surface-panel report-panel">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">下期建议</h2>
              <div v-if="report.nextActions.length" class="mt-4 flex flex-wrap gap-2">
                <span v-for="item in report.nextActions" :key="item" class="next-action-chip">
                  {{ item }}
                </span>
              </div>
              <p
                v-else
                class="report-inline-empty mt-4"
              >
                暂时没有生成下一步建议，可以继续先积累公开内容和系列样本。
              </p>
            </article>
          </section>

          <section class="surface-panel report-panel">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-black text-slate-950 dark:text-white">本期亮点内容</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  结合互动反馈和精选标记，优先展示本周期更值得复盘的内容。
                </p>
              </div>
              <RouterLink to="/series/workbench" class="report-inline-link">
                <Library class="h-4 w-4" />
                去合集工作台
              </RouterLink>
            </div>
            <div v-if="report.highlightPosts.length" class="grid gap-3 lg:grid-cols-3">
              <RouterLink
                v-for="post in report.highlightPosts"
                :key="post.postId"
                :to="`/post/${post.postId}`"
                class="highlight-card"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="highlight-domain">{{ highlightDomainLabel(post) }}</span>
                  <span v-if="post.featured" class="highlight-flag">精选</span>
                </div>
                <h3 class="mt-3 text-base font-black text-slate-950 dark:text-white">{{ post.title }}</h3>
                <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {{ post.interactionCount }} 次互动反馈
                </p>
              </RouterLink>
            </div>
            <EmptyState
              v-else
              title="本期还没有亮点内容"
              description="继续发布高质量内容或补齐系列后，亮点区会逐步出现代表性样本。"
              action-text="去发布"
              action-href="/editor"
            />
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Activity, AlertTriangle, BadgeCheck, Library, RefreshCw } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage } from '@/api/client'
import { growthApi } from '@/api/growth'
import { useAuthStore } from '@/stores/auth'
import type { GrowthReport } from '@/api/types'
import { getDomainLabelSafe, isKnownDomain } from '@/utils/domains'
import { isTrustedGrowthResult } from '@/utils/growthPath'

const authStore = useAuthStore()
const route = useRoute()

const periodOptions = [
  { value: 'weekly', label: '周报' },
  { value: 'monthly', label: '月报' },
] as const

const period = ref<'weekly' | 'monthly'>('weekly')
const loading = ref(false)
const error = ref('')
const report = ref<GrowthReport | null>(null)
const reportPayloadTrusted = ref(false)
let reportRequestId = 0
const loginRedirectHref = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
const highlightDomainLabel = (post: GrowthReport['highlightPosts'][number]) => (
  isKnownDomain(post.domain)
    ? post.domainName || getDomainLabelSafe(post.domain)
    : getDomainLabelSafe(post.domain)
)
const domainChangeLabel = (change: GrowthReport['domainChanges'][number]) => (
  isKnownDomain(change.domain)
    ? change.domainName || getDomainLabelSafe(change.domain)
    : getDomainLabelSafe(change.domain)
)
const reportStats = computed(() => {
  const current = report.value
  if (!current) return []
  return [
    { label: '发布内容', value: current.publishedPostCount, description: `${current.days} 天内新增公开内容` },
    { label: '互动反馈', value: current.interactionCount, description: '点赞、评论、收藏等公开反馈' },
    { label: '优质内容', value: current.featuredPostCount, description: '被标记精选或重点推荐的内容' },
    { label: '系列沉淀', value: current.seriesContributionCount, description: '本周期被纳入系列的内容' },
  ].filter((item) => Number(item.value) > 0)
})
const hasReliableReport = computed(() => {
  const current = report.value
  if (!current || !reportPayloadTrusted.value || current.degraded || current.degradationReasons.length > 0) return false
  return reportStats.value.length > 0
    || current.domainChanges.length > 0
    || current.nextActions.length > 0
    || current.highlightPosts.length > 0
})

const trendLabel = (trend?: string) => {
  switch ((trend || '').toLowerCase()) {
    case 'up':
      return '上升'
    case 'down':
      return '回落'
    default:
      return '持平'
  }
}

const trendClass = (trend?: string) => {
  switch ((trend || '').toLowerCase()) {
    case 'up':
      return 'trend-up'
    case 'down':
      return 'trend-down'
    default:
      return 'trend-flat'
  }
}

const loadReport = async () => {
  const requestId = ++reportRequestId
  if (!authStore.isLoggedIn) {
    report.value = null
    reportPayloadTrusted.value = false
    error.value = ''
    loading.value = false
    return
  }
  const requestedPeriod = period.value
  loading.value = true
  error.value = ''
  try {
    const res = await growthApi.getReport(requestedPeriod)
    if (requestId !== reportRequestId) return
    report.value = res.data
    reportPayloadTrusted.value = isTrustedGrowthResult(res)
  } catch (err) {
    if (requestId !== reportRequestId) return
    report.value = null
    reportPayloadTrusted.value = false
    error.value = getErrorMessage(err, '加载成长报告失败')
  } finally {
    if (requestId === reportRequestId) loading.value = false
  }
}

watch([period, () => authStore.isLoggedIn], loadReport, { immediate: true })
</script>

<style scoped>
.growth-report-page {
  background: var(--surface-2);
}

.growth-report-main {
  padding-top: 1.5rem;
  padding-bottom: 6rem;
}

.report-page-heading {
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.35rem 0 1.5rem;
}

.report-page-heading h1 {
  margin-top: 0.3rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 900;
  letter-spacing: 0;
}

.report-page-description {
  max-width: 68ch;
  margin-top: 0.55rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.75;
}

.report-heading-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.period-segment {
  display: inline-flex;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
  padding: 0.2rem;
}

.report-content {
  margin-top: 1.25rem;
}

.report-error-state {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--danger);
}

.report-stat-strip {
  display: grid;
  overflow: hidden;
}

.report-detail-grid {
  display: grid;
  gap: 1rem;
}

.report-panel {
  padding: 1rem;
}

.report-inline-empty {
  margin-bottom: 0;
  background: var(--surface-2);
  padding: 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.report-inline-link {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.4rem;
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 800;
}

.report-kicker {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--primary-600);
}

.period-chip,
.next-action-chip,
.trend-pill,
.highlight-domain,
.highlight-flag,
.stat-label {
  border-radius: 999px;
  font-weight: 800;
}

.period-chip {
  min-height: 34px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  padding: 0.4rem 0.8rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.period-chip-active {
  background: var(--primary-50);
  color: var(--primary-700);
}

.fallback-banner,
.change-row,
.highlight-card {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
}

.fallback-banner {
  border-color: rgb(254 215 170);
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

.stat-card strong {
  display: block;
  margin-top: 0.45rem;
  font-size: 1.65rem;
  font-weight: 900;
  color: var(--text-strong);
}

.stat-card p {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.stat-card {
  min-width: 0;
  border-top: 1px solid var(--border-subtle);
  padding: 1rem;
}

.stat-card:first-child {
  border-top: 0;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.change-row,
.highlight-card {
  padding: 1rem;
}

.next-action-chip {
  border: 1px solid #a9d8c3;
  background: var(--primary-50);
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: var(--primary-700);
}

.trend-pill,
.highlight-domain,
.highlight-flag {
  padding: 0.25rem 0.55rem;
  font-size: 0.7rem;
}

.trend-up {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.trend-down {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.trend-flat {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.highlight-domain {
  background: var(--surface-soft);
  color: var(--text-primary);
}

.highlight-flag {
  background: rgb(254 240 138);
  color: rgb(133 77 14);
}

.highlight-card {
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.highlight-card:hover {
  border-color: rgb(169 216 195);
  background: var(--primary-50);
}

.dark .period-chip {
  background: transparent;
  color: var(--text-muted);
}

.dark .period-chip-active {
  background: var(--surface-3);
  color: #a9d8c3;
}

.dark .fallback-banner,
.dark .change-row,
.dark .highlight-card {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--surface-1) 88%, transparent);
}

.dark .fallback-banner {
  border-color: rgb(154 52 18);
  background: rgb(67 20 7 / 0.45);
}

.dark .fallback-banner strong,
.dark .fallback-banner p {
  color: rgb(253 186 116);
}

.dark .stat-card strong {
  color: var(--text-strong);
}

.dark .stat-card p {
  color: var(--text-muted);
}

.dark .stat-label,
.dark .trend-flat,
.dark .highlight-domain {
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .next-action-chip {
  background: var(--surface-1);
  color: rgb(169 216 195);
}

.dark .highlight-flag {
  background: rgb(120 53 15);
  color: rgb(253 224 71);
}

@media (min-width: 640px) {
  .report-stat-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stat-card:nth-child(2) {
    border-top: 0;
  }

  .stat-card:nth-child(even) {
    border-left: 1px solid var(--border-subtle);
  }
}

@media (min-width: 1024px) {
  .report-stat-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .stat-card {
    border-top: 0;
    border-left: 1px solid var(--border-subtle);
  }

  .stat-card:first-child {
    border-left: 0;
  }

  .report-detail-grid {
    grid-template-columns: minmax(0, 1.05fr) minmax(18rem, 0.95fr);
  }
}

@media (max-width: 640px) {
  .growth-report-main {
    padding-top: 1rem;
  }

  .report-page-heading h1 {
    font-size: 1.5rem;
  }

  .report-heading-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  .period-segment {
    grid-column: 1 / -1;
  }

  .period-chip {
    flex: 1;
  }

  .report-panel {
    padding: 0.9rem;
  }
}
</style>
