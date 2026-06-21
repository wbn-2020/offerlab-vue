<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Community Insights</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">综合社区趋势</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            按综合社区或具体领域查看公开帖子、标签和热门内容变化，发现不同领域趋势。
          </p>
        </div>
        <div class="flex flex-col gap-3 md:items-end">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="period in periods"
              :key="period.value"
              type="button"
              @click="setRange(period.value)"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                activeRange === period.value
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              ]"
            >
              {{ period.label }}
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="setDomain(undefined)"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                activeDomain == null
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              ]"
            >
              综合
            </button>
            <button
              v-for="domain in DOMAIN_OPTIONS"
              :key="domain.value"
              type="button"
              @click="setDomain(domain.value)"
              :class="[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                activeDomain === domain.value
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              ]"
            >
              {{ domain.icon }} {{ domain.label }}
            </button>
          </div>
        </div>
      </section>

      <section v-if="errorText" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
        {{ errorText }}
      </section>

      <section class="grid gap-4 md:grid-cols-4">
        <article class="metric-card">
          <span>公开帖子</span>
          <strong>{{ dashboard?.totalPosts ?? '--' }}</strong>
        </article>
        <article class="metric-card">
          <span>热门方向</span>
          <strong>{{ dashboard?.topCompanies.length ?? '--' }}</strong>
        </article>
        <article class="metric-card">
          <span>高频标签</span>
          <strong>{{ dashboard?.topTags.length ?? '--' }}</strong>
        </article>
        <article class="metric-card">
          <span>精选内容</span>
          <strong>{{ dashboard?.featuredPosts ?? '--' }}</strong>
        </article>
        <article class="metric-card">
          <span>活跃作者</span>
          <strong>{{ dashboard?.activeAuthors ?? '--' }}</strong>
        </article>
      </section>

      <section v-if="isLoading" class="panel py-16 text-center text-sm text-slate-500 dark:text-slate-400">
        正在加载趋势数据...
      </section>

      <template v-else>
        <section class="domain-comparison-board panel">
          <div class="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p class="text-sm font-semibold text-primary-600 dark:text-primary-400">Operations Board</p>
              <h2 class="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">领域横向对比</h2>
              <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                将各领域放在同一视图里比较内容占比、发布量和当前热点，便于运营快速识别需要加热或补给的领域。
              </p>
            </div>
            <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              {{ activeRangeLabel }} · {{ activeDomain == null ? '综合视图' : `${getDomainLabel(activeDomain)}视图` }}
            </span>
          </div>
          <div v-if="domainComparisonRows.length === 0" class="empty-state">暂无领域对比数据</div>
          <div v-else class="domain-comparison-grid">
            <button
              v-for="row in domainComparisonRows"
              :key="row.value"
              type="button"
              class="domain-comparison-row"
              :class="{ 'domain-comparison-row--active': row.isActive }"
              @click="setDomain(row.value)"
            >
              <div class="flex min-w-0 items-start justify-between gap-3">
                <div class="flex min-w-0 items-start gap-3">
                  <span class="domain-icon">{{ row.icon }}</span>
                  <div class="min-w-0 text-left">
                    <h3 class="truncate text-base font-bold text-slate-950 dark:text-slate-50">{{ row.label }}</h3>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ row.description }}</p>
                  </div>
                </div>
                <span class="status-pill" :class="`status-pill--${row.statusTone}`">{{ row.statusLabel }}</span>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-3">
                <div class="comparison-stat">
                  <span>发布量</span>
                  <strong>{{ row.count }}</strong>
                </div>
                <div class="comparison-stat">
                  <span>占比</span>
                  <strong>{{ row.shareLabel }}</strong>
                </div>
              </div>

              <div class="mt-4">
                <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div class="h-full rounded-full bg-primary-600" :style="{ width: row.barWidth }" />
                </div>
                <p class="mt-3 truncate text-left text-xs font-semibold text-slate-600 dark:text-slate-300">
                  热点：{{ row.topContent }}
                </p>
              </div>
            </button>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-2">
          <RankPanel title="热门方向 Top 10" unit="篇" :items="dashboard?.topCompanies || []" color="primary" />
          <RankPanel title="高频标签 Top 10" unit="次" :items="dashboard?.topTags || []" color="blue" />
        </section>

        <section class="grid gap-6 lg:grid-cols-2">
          <RankPanel title="领域分布" unit="篇" :items="dashboard?.domainDistribution || []" color="blue" show-percentage />
          <RankPanel :title="domainHotContentTitle" unit="互动" :items="dashboard?.domainHotContent || []" color="primary" />
        </section>

        <section class="grid gap-6 lg:grid-cols-2">
          <RankPanel title="内容类型分布" unit="篇" :items="dashboard?.contentTypeDistribution || []" color="green" show-percentage />
          <RankPanel title="精选内容互动 Top 8" unit="互动" :items="dashboard?.featuredContent || []" color="amber" />
        </section>

        <section class="panel">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">发布趋势</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">按自然日统计公开帖子发布量。</p>
            </div>
          </div>
          <div v-if="publishTrend.length === 0" class="empty-state">暂无发布数据</div>
          <div v-else class="flex h-64 items-end gap-2">
            <div v-for="point in publishTrend" :key="point.label" class="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div
                class="w-full rounded-t bg-primary-600 transition-all hover:bg-primary-700"
                :style="{ height: barHeight(point.count) }"
                :title="`${point.label}: ${point.count}`"
              />
              <span class="w-full truncate text-center text-[11px] text-slate-500 dark:text-slate-400">
                {{ shortDate(point.label) }}
              </span>
            </div>
          </div>
        </section>

        <section class="grid gap-6 lg:grid-cols-2">
          <RankPanel title="场景分布" unit="篇" :items="dashboard?.positionDistribution || []" color="green" show-percentage />
          <RankPanel title="历史内容反馈分布" unit="篇" :items="dashboard?.resultDistribution || []" color="amber" />
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { getErrorMessage } from '@/api/client'
import { dashboardApi, type RankedMetric, type TrendDashboard, type TrendRange } from '@/api/dashboard'
import AppHeader from '@/components/layout/AppHeader.vue'
import { DOMAIN_OPTIONS, getDomainLabel } from '@/utils/domains'

const periods: Array<{ value: TrendRange; label: string }> = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
]

const activeRange = ref<TrendRange>('30d')
const activeDomain = ref<number | undefined>(undefined)
const dashboard = ref<TrendDashboard | null>(null)
const comparisonDashboard = ref<TrendDashboard | null>(null)
const isLoading = ref(false)
const errorText = ref('')

interface DomainComparisonRow {
  value: number
  label: string
  icon: string
  description: string
  count: number
  shareLabel: string
  barWidth: string
  topContent: string
  statusLabel: string
  statusTone: 'hot' | 'steady' | 'watch'
  isActive: boolean
}

const publishTrend = computed(() => dashboard.value?.publishTrend || [])
const maxTrendCount = computed(() => Math.max(1, ...publishTrend.value.map((item) => item.count)))
const domainHotContentTitle = computed(() => activeDomain.value ? `${getDomainLabel(activeDomain.value)}热门内容` : '综合热门内容')
const activeRangeLabel = computed(() => periods.find((period) => period.value === activeRange.value)?.label || '近 30 天')
const domainDistribution = computed(() => comparisonDashboard.value?.domainDistribution || [])
const domainHotContent = computed(() => comparisonDashboard.value?.domainHotContent || [])
const maxDomainCount = computed(() => Math.max(1, ...domainDistribution.value.map((item) => item.count)))
const domainComparisonRows = computed<DomainComparisonRow[]>(() => {
  const backendRows = comparisonDashboard.value?.domainComparison || []
  if (backendRows.length > 0) {
    const maxPostCount = Math.max(1, ...backendRows.map((item) => Number(item.postCount || 0)))
    return backendRows.map((item) => {
      const domain = DOMAIN_OPTIONS.find((option) => option.value === Number(item.domain))
      const count = Number(item.postCount || 0)
      const share = Number(item.share || 0)
      const featuredRate = Number(item.featuredRate || 0)
      const statusTone: DomainComparisonRow['statusTone'] = share >= 35 ? 'hot' : share >= 12 ? 'steady' : 'watch'
      const topContent = item.hotContent?.[0]?.name || item.topTags?.[0]?.name || '暂无热点'
      return {
        value: Number(item.domain),
        label: domain?.label || item.name || getDomainLabel(item.domain),
        icon: domain?.icon || '',
        description: domain?.description || '',
        count,
        shareLabel: `${share}%`,
        barWidth: `${Math.max(count > 0 ? 6 : 0, Math.round((count / maxPostCount) * 100))}%`,
        topContent: `${topContent} · 精选率 ${featuredRate}% · 活跃作者 ${Number(item.activeAuthors || 0)}`,
        statusLabel: statusTone === 'hot' ? '重点运营' : statusTone === 'steady' ? '稳定增长' : '待补给',
        statusTone,
        isActive: activeDomain.value === Number(item.domain),
      }
    })
  }
  const total = domainDistribution.value.reduce((sum, item) => sum + Number(item.count || 0), 0)
  const hotFallback = domainHotContent.value[0]?.name || comparisonDashboard.value?.topCompanies[0]?.name || '暂无热点'

  return DOMAIN_OPTIONS.map((domain, index) => {
    const metric = domainDistribution.value.find((item) => item.name === domain.label)
    const count = Number(metric?.count || 0)
    const percentage = metric?.percentage ?? (total > 0 ? Math.round((count / total) * 1000) / 10 : 0)
    const statusTone: DomainComparisonRow['statusTone'] = percentage >= 35 ? 'hot' : percentage >= 12 ? 'steady' : 'watch'
    const topContent = domainHotContent.value[index]?.name || hotFallback

    return {
      value: domain.value,
      label: domain.label,
      icon: domain.icon,
      description: domain.description,
      count,
      shareLabel: `${percentage}%`,
      barWidth: `${Math.max(count > 0 ? 6 : 0, Math.round((count / maxDomainCount.value) * 100))}%`,
      topContent,
      statusLabel: statusTone === 'hot' ? '重点运营' : statusTone === 'steady' ? '稳定增长' : '待补给',
      statusTone,
      isActive: activeDomain.value === domain.value,
    }
  })
})

const loadDashboard = async () => {
  isLoading.value = true
  errorText.value = ''
  try {
    const [selectedRes, comparisonRes] = await Promise.all([
      dashboardApi.getTrendDashboard(activeRange.value, activeDomain.value),
      dashboardApi.getTrendDashboard(activeRange.value),
    ])
    dashboard.value = selectedRes.data
    comparisonDashboard.value = comparisonRes.data
  } catch (error: any) {
    errorText.value = getErrorMessage(error, '趋势数据暂不可用')
    dashboard.value = null
    comparisonDashboard.value = null
  } finally {
    isLoading.value = false
  }
}

const setRange = (range: TrendRange) => {
  activeRange.value = range
}

const setDomain = (domain?: number) => {
  activeDomain.value = domain
}

const barHeight = (count: number) => {
  if (count <= 0) return '6px'
  return `${Math.max(8, Math.round((count / maxTrendCount.value) * 100))}%`
}

const shortDate = (date: string) => date.slice(5)

const RankPanel = defineComponent({
  name: 'RankPanel',
  props: {
    title: { type: String, required: true },
    unit: { type: String, required: true },
    items: { type: Array as () => RankedMetric[], required: true },
    color: { type: String, default: 'primary' },
    showPercentage: { type: Boolean, default: false },
  },
  setup(props) {
    const maxCount = computed(() => Math.max(1, ...props.items.map((item) => item.count)))
    const barClass = computed(() => {
      if (props.color === 'blue') return 'bg-blue-600'
      if (props.color === 'green') return 'bg-emerald-600'
      if (props.color === 'amber') return 'bg-amber-500'
      return 'bg-primary-600'
    })
    return () => h('article', { class: 'panel' }, [
      h('h2', { class: 'mb-4 text-lg font-semibold text-slate-950 dark:text-slate-50' }, props.title),
      props.items.length === 0
        ? h('div', { class: 'empty-state' }, '暂无数据')
        : h('div', { class: 'space-y-3' }, props.items.map((item, index) =>
          h('div', { class: 'flex items-center gap-3', key: `${item.name}-${index}` }, [
            h('div', { class: 'w-6 text-sm font-semibold text-slate-500 dark:text-slate-400' }, String(index + 1)),
            h('div', { class: 'min-w-0 flex-1' }, [
              h('div', { class: 'mb-1 flex items-center justify-between gap-3' }, [
                h('span', { class: 'truncate text-sm font-medium text-slate-900 dark:text-slate-100' }, item.name || '--'),
                h('span', { class: 'text-xs text-slate-500 dark:text-slate-400' },
                  props.showPercentage && item.percentage != null
                    ? `${item.count} ${props.unit} / ${item.percentage}%`
                    : `${item.count} ${props.unit}`),
              ]),
              h('div', { class: 'h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800' }, [
                h('div', {
                  class: `h-full rounded-full ${barClass.value}`,
                  style: { width: `${Math.max(4, Math.round((item.count / maxCount.value) * 100))}%` },
                }),
              ]),
            ]),
          ]),
        )),
    ])
  },
})

onMounted(loadDashboard)
watch([activeRange, activeDomain], loadDashboard)
</script>

<style scoped>
.metric-card,
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
}

.metric-card span {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.metric-card strong {
  margin-top: 0.5rem;
  display: block;
  font-size: 1.75rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.empty-state {
  border-radius: 0.5rem;
  border: 1px dashed rgb(203 213 225);
  padding: 2.5rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  color: rgb(100 116 139);
}

.domain-comparison-board {
  overflow: hidden;
}

.domain-comparison-grid {
  display: grid;
  gap: 0.875rem;
}

.domain-comparison-row {
  display: block;
  width: 100%;
  min-width: 0;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252 / 0.72);
  padding: 1rem;
  text-align: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.domain-comparison-row:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255 / 0.52);
  transform: translateY(-1px);
}

.domain-comparison-row--active {
  border-color: rgb(79 70 229);
  background: rgb(238 242 255 / 0.78);
  box-shadow: 0 12px 30px rgb(79 70 229 / 0.12);
}

.domain-icon {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: white;
  font-size: 1.2rem;
  box-shadow: inset 0 0 0 1px rgb(226 232 240);
}

.status-pill {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 0.22rem 0.55rem;
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1.2;
}

.status-pill--hot {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-pill--steady {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.status-pill--watch {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.comparison-stat {
  min-width: 0;
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.65rem;
}

.comparison-stat span {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.comparison-stat strong {
  margin-top: 0.25rem;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.05rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

@media (min-width: 640px) {
  .domain-comparison-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .domain-comparison-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.dark .metric-card,
.dark .panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .metric-card span {
  color: rgb(148 163 184);
}

.dark .metric-card strong {
  color: rgb(248 250 252);
}

.dark .empty-state {
  border-color: rgb(51 65 85);
  color: rgb(148 163 184);
}

.dark .domain-comparison-row {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(2 6 23 / 0.32);
}

.dark .domain-comparison-row:hover {
  border-color: rgb(99 102 241 / 0.72);
  background: rgb(30 41 59 / 0.58);
}

.dark .domain-comparison-row--active {
  border-color: rgb(129 140 248);
  background: rgb(49 46 129 / 0.35);
  box-shadow: 0 12px 30px rgb(15 23 42 / 0.28);
}

.dark .domain-icon,
.dark .comparison-stat {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(15 23 42 / 0.78);
  box-shadow: none;
}

.dark .status-pill--hot {
  background: rgb(120 53 15 / 0.42);
  color: rgb(253 230 138);
}

.dark .status-pill--steady {
  background: rgb(20 83 45 / 0.42);
  color: rgb(187 247 208);
}

.dark .status-pill--watch {
  background: rgb(51 65 85 / 0.72);
  color: rgb(203 213 225);
}

.dark .comparison-stat span {
  color: rgb(148 163 184);
}

.dark .comparison-stat strong {
  color: rgb(248 250 252);
}
</style>
