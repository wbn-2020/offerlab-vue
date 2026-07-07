<template>
  <div class="app-shell">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="surface-card p-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="max-w-3xl">
            <span class="report-kicker">成长复盘</span>
            <h1 class="mt-3 text-3xl font-black tracking-normal text-slate-950 dark:text-white">
              周报 / 月报
            </h1>
            <p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              把最近一个周期的内容贡献、领域变化和下一步建议整理成可回顾的成长复盘。
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in periodOptions"
              :key="option.value"
              type="button"
              :class="['period-chip', period === option.value ? 'period-chip-active' : '']"
              @click="period = option.value"
            >
              {{ option.label }}
            </button>
            <RouterLink to="/growth/profile" class="secondary-action">
              成长档案
            </RouterLink>
            <RouterLink to="/certification/apply" class="secondary-action">
              认证作者
            </RouterLink>
          </div>
        </div>
      </section>

      <section class="mt-6">
        <EmptyState
          v-if="!authStore.isLoggedIn"
          title="登录后查看个人成长报告"
          description="成长报告会读取你的个人发布和互动轨迹，不会替代公开榜单。"
          action-text="去登录"
          :action-href="loginRedirectHref"
        />

        <LoadingSkeleton v-else-if="loading" />

        <div v-else-if="error" class="surface-card p-6">
          <h2 class="text-lg font-black text-slate-950 dark:text-white">成长报告暂时不可用</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ error }}</p>
          <button type="button" class="primary-action mt-4" @click="loadReport">
            重新加载
          </button>
        </div>

        <EmptyState
          v-else-if="!report"
          title="还没有可生成的成长报告"
          description="先发几篇内容、整理系列或参与互动，周期报告就会逐步完整。"
          action-text="去发布"
          action-href="/editor"
        />

        <div v-else class="space-y-6">
          <div v-if="report.degraded" class="fallback-banner">
            <strong>{{ reportDemoNotice ? '当前展示本地样例报告' : '当前报告采用降级聚合' }}</strong>
            <p>
              {{ reportDemoNotice || report.degradationReasons.join(' / ') || '部分依赖未就绪，当前只展示规则汇总结果。' }}
            </p>
          </div>

          <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article class="surface-card stat-card p-5">
              <span class="stat-label">发布内容</span>
              <strong>{{ report.publishedPostCount }}</strong>
              <p>{{ report.days }} 天内新增公开内容</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">互动反馈</span>
              <strong>{{ report.interactionCount }}</strong>
              <p>点赞、评论、收藏等反馈总和</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">优质内容</span>
              <strong>{{ report.featuredPostCount }}</strong>
              <p>被标记精选或重点推荐的内容</p>
            </article>
            <article class="surface-card stat-card p-5">
              <span class="stat-label">系列沉淀</span>
              <strong>{{ report.seriesContributionCount }}</strong>
              <p>本周期被纳入系列的内容数量</p>
            </article>
          </section>

          <section class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <article class="surface-card p-6">
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
                      <strong class="truncate text-sm text-slate-900 dark:text-slate-100">{{ change.domainName }}</strong>
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
                class="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                当前周期还没有形成明显的领域变化，继续稳定输出后会更容易看出趋势。
              </p>
            </article>

            <article class="surface-card p-6">
              <h2 class="text-lg font-black text-slate-950 dark:text-white">下期建议</h2>
              <div v-if="report.nextActions.length" class="mt-4 flex flex-wrap gap-2">
                <span v-for="item in report.nextActions" :key="item" class="next-action-chip">
                  {{ item }}
                </span>
              </div>
              <p
                v-else
                class="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                暂时没有生成下一步建议，可以继续先积累公开内容和系列样本。
              </p>
            </article>
          </section>

          <section class="surface-card p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-black text-slate-950 dark:text-white">本期亮点内容</h2>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  结合互动反馈和精选标记，优先展示本周期更值得复盘的内容。
                </p>
              </div>
              <RouterLink to="/series/workbench" class="text-sm font-semibold text-primary-600 hover:text-primary-700">
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
                  <span class="highlight-domain">{{ post.domainName || getDomainLabel(post.domain) }}</span>
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
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { getErrorMessage } from '@/api/client'
import { growthApi } from '@/api/growth'
import { useAuthStore } from '@/stores/auth'
import type { GrowthReport } from '@/api/types'
import { getDomainLabel } from '@/utils/domains'

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
const loginRedirectHref = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
const reportDemoNotice = computed(() => report.value?.degradationReasons?.includes('local_demo_seed')
  ? '这些内容是本地样例，用来说明周期报告会如何汇总公开内容，不代表你的真实发布、互动或精选数据。'
  : ''
)

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
  if (!authStore.isLoggedIn) {
    report.value = null
    error.value = ''
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await growthApi.getReport(period.value)
    report.value = res.data
  } catch (err) {
    report.value = null
    error.value = getErrorMessage(err, '加载成长报告失败')
  } finally {
    loading.value = false
  }
}

watch(period, async () => {
  await loadReport()
})

watch(() => authStore.isLoggedIn, async () => {
  await loadReport()
})

onMounted(async () => {
  await loadReport()
})
</script>

<style scoped>
.report-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(224 242 254);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(3 105 161);
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
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.55rem 0.9rem;
  font-size: 0.8125rem;
  color: rgb(71 85 105);
}

.period-chip-active {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.fallback-banner,
.change-row,
.highlight-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.82);
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
  margin-top: 0.65rem;
  font-size: 1.9rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.stat-card p {
  margin-top: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(100 116 139);
}

.stat-label {
  display: inline-flex;
  background: rgb(241 245 249);
  padding: 0.3rem 0.65rem;
  font-size: 0.75rem;
  color: rgb(71 85 105);
}

.change-row,
.highlight-card {
  padding: 1rem;
}

.next-action-chip {
  background: rgb(239 246 255);
  padding: 0.55rem 0.85rem;
  font-size: 0.8125rem;
  color: rgb(29 78 216);
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
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.highlight-domain {
  background: rgb(241 245 249);
  color: rgb(51 65 85);
}

.highlight-flag {
  background: rgb(254 240 138);
  color: rgb(133 77 14);
}

.highlight-card {
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.highlight-card:hover {
  border-color: rgb(191 219 254);
  transform: translateY(-1px);
}

.dark .report-kicker {
  background: rgb(8 47 73);
  color: rgb(125 211 252);
}

.dark .period-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .period-chip-active {
  border-color: rgb(59 130 246);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .fallback-banner,
.dark .change-row,
.dark .highlight-card {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.88);
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
  color: rgb(241 245 249);
}

.dark .stat-card p {
  color: rgb(148 163 184);
}

.dark .stat-label,
.dark .trend-flat,
.dark .highlight-domain {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

.dark .next-action-chip {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .highlight-flag {
  background: rgb(120 53 15);
  color: rgb(253 224 71);
}
</style>
