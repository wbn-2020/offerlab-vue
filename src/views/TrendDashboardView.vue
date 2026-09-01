<template>
  <div class="app-shell">
    <AppHeader />
    <main class="community-page trend-page">
      <header class="trend-header">
        <div class="trend-heading">
          <span class="trend-context">社区公开数据</span>
          <h1>趋势观察</h1>
          <p>比较内容供给、领域活跃度与发现行为，快速识别正在增长的方向和仍需补充的内容。</p>
        </div>

        <div class="trend-controls" aria-label="趋势范围筛选">
          <div class="control-group">
            <span class="control-label">时间范围</span>
            <div class="segmented-control">
              <button
                v-for="period in periods"
                :key="period.value"
                type="button"
                :class="{ active: activeRange === period.value }"
                :aria-pressed="activeRange === period.value"
                @click="setRange(period.value)"
              >
                {{ period.label }}
              </button>
            </div>
          </div>

          <div class="control-group">
            <span class="control-label">内容领域</span>
            <div class="domain-filter" role="group" aria-label="内容领域">
              <button
                type="button"
                :class="{ active: activeDomain == null }"
                :aria-pressed="activeDomain == null"
                @click="setDomain(undefined)"
              >
                综合
              </button>
              <button
                v-for="domain in DOMAIN_OPTIONS"
                :key="domain.value"
                type="button"
                :class="{ active: activeDomain === domain.value }"
                :aria-pressed="activeDomain === domain.value"
                @click="setDomain(domain.value)"
              >
                <span aria-hidden="true">{{ domain.icon }}</span>
                {{ domain.label }}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section v-if="errorText" class="status-notice status-notice--warning" role="alert">
        <strong>部分趋势数据暂不可用</strong>
        <span>{{ errorText }}</span>
        <button type="button" class="secondary-action" @click="loadDashboard">重新加载</button>
      </section>

      <section class="metric-strip" aria-label="趋势摘要">
        <article class="metric-card metric-card--primary">
          <span>公开帖子</span>
          <strong>{{ dashboard?.totalPosts ?? '--' }}</strong>
          <small>{{ activeRangeLabel }}内可见内容</small>
        </article>
        <article class="metric-card">
          <span>活跃作者</span>
          <strong>{{ dashboard?.activeAuthors ?? '--' }}</strong>
          <small>持续产生公开内容</small>
        </article>
        <article class="metric-card">
          <span>精选内容</span>
          <strong>{{ dashboard?.featuredPosts ?? '--' }}</strong>
          <small>通过精选进入发现链路</small>
        </article>
        <article class="metric-card">
          <span>热门方向</span>
          <strong>{{ dashboard?.topCompanies.length ?? '--' }}</strong>
          <small>进入当前榜单的方向</small>
        </article>
        <article class="metric-card">
          <span>高频标签</span>
          <strong>{{ dashboard?.topTags.length ?? '--' }}</strong>
          <small>形成稳定讨论的标签</small>
        </article>
      </section>

      <section v-if="isLoading" class="trend-loading" aria-live="polite">
        <div class="loading-line loading-line--wide" />
        <div class="loading-line" />
        <div class="loading-grid">
          <div v-for="item in 5" :key="item" class="loading-block" />
        </div>
        <span>正在整理趋势数据...</span>
      </section>

      <template v-else>
        <section class="panel domain-comparison-board">
          <div class="section-heading">
            <div>
              <h2>领域横向对比</h2>
              <p>统一比较发布量、内容占比和当前热点，辅助判断哪些领域需要继续加热或补充供给。</p>
            </div>
            <span class="view-status">
              {{ activeRangeLabel }} · {{ activeDomain == null ? '综合视图' : `${getDomainLabel(activeDomain)}视图` }}
            </span>
          </div>

          <div v-if="domainComparisonRows.length === 0" class="empty-state">
            <strong>暂无领域对比数据</strong>
            <span>切换时间范围后再试，或等待公开内容形成可比较样本。</span>
          </div>
          <div v-else class="domain-comparison-grid">
            <button
              v-for="row in domainComparisonRows"
              :key="row.value"
              type="button"
              class="domain-comparison-row"
              :class="{ 'domain-comparison-row--active': row.isActive }"
              :aria-pressed="row.isActive"
              @click="setDomain(row.value)"
            >
              <div class="domain-row-heading">
                <span class="domain-icon" aria-hidden="true">{{ row.icon }}</span>
                <div>
                  <h3>{{ row.label }}</h3>
                  <p>{{ row.description }}</p>
                </div>
                <span class="status-pill" :class="`status-pill--${row.statusTone}`">{{ row.statusLabel }}</span>
              </div>

              <div class="comparison-values">
                <span><small>发布量</small><strong>{{ row.count }}</strong></span>
                <span><small>占比</small><strong>{{ row.shareLabel }}</strong></span>
              </div>

              <div class="comparison-bar" aria-hidden="true">
                <span :style="{ width: row.barWidth }" />
              </div>
              <p class="domain-hotline">热点：{{ row.topContent }}</p>
            </button>
          </div>
        </section>

        <section class="analytics-layout">
          <div class="analytics-main">
            <section class="rank-grid">
              <RankPanel title="热门方向 Top 10" unit="篇" :items="dashboard?.topCompanies || []" color="primary" />
              <RankPanel title="高频标签 Top 10" unit="次" :items="dashboard?.topTags || []" color="blue" />
              <RankPanel title="领域分布" unit="篇" :items="dashboard?.domainDistribution || []" color="blue" show-percentage />
              <RankPanel :title="domainHotContentTitle" unit="互动" :items="dashboard?.domainHotContent || []" color="primary" />
              <RankPanel title="内容类型分布" unit="篇" :items="dashboard?.contentTypeDistribution || []" color="green" show-percentage />
              <RankPanel title="精选内容互动 Top 8" unit="互动" :items="dashboard?.featuredContent || []" color="amber" />
            </section>

            <section class="panel publish-panel">
              <div class="section-heading">
                <div>
                  <h2>发布趋势</h2>
                  <p>按自然日统计公开帖子发布量，观察内容供给节奏。</p>
                </div>
              </div>
              <div v-if="publishTrend.length === 0" class="empty-state">
                <strong>暂无发布数据</strong>
                <span>当前范围内还没有形成可展示的发布趋势。</span>
              </div>
              <div v-else class="trend-chart" aria-label="公开帖子发布趋势">
                <div v-for="point in publishTrend" :key="point.label" class="trend-point">
                  <span class="trend-value">{{ point.count }}</span>
                  <div
                    class="trend-bar"
                    :style="{ height: barHeight(point.count) }"
                    :title="`${point.label}: ${point.count}`"
                  />
                  <span class="trend-date">{{ shortDate(point.label) }}</span>
                </div>
              </div>
            </section>

            <section class="rank-grid">
              <RankPanel title="场景分布" unit="篇" :items="dashboard?.positionDistribution || []" color="green" show-percentage />
              <RankPanel title="历史内容反馈分布" unit="篇" :items="dashboard?.resultDistribution || []" color="amber" />
            </section>
          </div>

          <aside class="panel ops-summary-panel">
            <div class="section-heading section-heading--stacked">
              <div>
                <h2>发现链路摘要</h2>
                <p>查看热门搜索、无结果词和推荐动作点击，用于优化内容组织与搜索体验。</p>
              </div>
              <span class="view-status" :class="`view-status--${opsSummaryState}`">{{ opsSummaryStatusLabel }}</span>
            </div>

            <div
              v-if="opsSummaryMessage"
              :class="['ops-summary-notice', `ops-summary-notice--${opsSummaryState}`]"
              role="status"
            >
              {{ opsSummaryMessage }}
            </div>

            <div v-if="opsSummaryState === 'available' || opsSummaryState === 'degraded'" class="ops-summary-list">
              <section class="ops-summary-column">
                <h3>热门搜索</h3>
                <button
                  v-for="item in hotSearchRows"
                  :key="`hot:${item.name}`"
                  type="button"
                  class="ops-summary-row"
                  @click="openSearchTerm(item.name)"
                >
                  <span>{{ item.name }}</span>
                  <strong>{{ item.count }}</strong>
                </button>
                <div v-if="!hotSearchRows.length" class="ops-summary-empty">暂无可展示热词</div>
              </section>

              <section class="ops-summary-column">
                <h3>推荐动作点击</h3>
                <button
                  v-for="item in recommendClickRows"
                  :key="`recommend:${item.name}`"
                  type="button"
                  class="ops-summary-row"
                  @click="openSearchTerm(item.name)"
                >
                  <span>{{ item.name }}</span>
                  <strong>{{ item.count }}</strong>
                </button>
                <div v-if="!recommendClickRows.length" class="ops-summary-empty">暂无推荐动作点击数据</div>
              </section>

              <section class="ops-summary-column">
                <h3>无结果词</h3>
                <button
                  v-for="item in noResultRows"
                  :key="`empty:${item.name}`"
                  type="button"
                  class="ops-summary-row"
                  @click="openSearchTerm(item.name)"
                >
                  <span>{{ item.name }}</span>
                  <strong>{{ item.count }}</strong>
                </button>
                <div v-if="!noResultRows.length" class="ops-summary-empty">暂无无结果词</div>
              </section>
            </div>
          </aside>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BizException, getErrorMessage } from '@/api/client'
import { dashboardApi, type RankedMetric, type TrendDashboard, type TrendRange } from '@/api/dashboard'
import { opsApi, type SearchAnalytics } from '@/api/ops'
import AppHeader from '@/components/layout/AppHeader.vue'
import { DOMAIN_OPTIONS, getDomainLabel } from '@/utils/domains'
import { filterSearchSuggestionTerms } from '@/utils/recommendationGovernance'

const periods: Array<{ value: TrendRange; label: string }> = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
]

const activeRange = ref<TrendRange>('30d')
const activeDomain = ref<number | undefined>(undefined)
const dashboard = ref<TrendDashboard | null>(null)
const comparisonDashboard = ref<TrendDashboard | null>(null)
const searchAnalytics = ref<SearchAnalytics | null>(null)
const opsSummaryState = ref<'loading' | 'available' | 'degraded' | 'restricted' | 'unavailable'>('loading')
const opsSummaryMessage = ref('')
const isLoading = ref(false)
const errorText = ref('')
const router = useRouter()

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
const opsSummaryStatusLabel = computed(() => {
  if (opsSummaryState.value === 'loading') return '加载中'
  if (opsSummaryState.value === 'degraded') return '兼容降级'
  if (opsSummaryState.value === 'restricted') return '权限受限'
  if (opsSummaryState.value === 'unavailable') return '暂不可用'
  return '近 30 天'
})
const analyticsRows = (items: SearchAnalytics['hotKeywords'] | undefined) => {
  const source = items || []
  const visibleNames = filterSearchSuggestionTerms(source.map((item) => item.keyword || item.company || item.target || ''), 8)
  return visibleNames.map((name) => {
    const hit = source.find((item) => (item.keyword || item.company || item.target || '') === name)
    return { name, count: Number(hit?.count || hit?.noResultCount || 0) }
  })
}
const hotSearchRows = computed(() => analyticsRows(searchAnalytics.value?.hotKeywords))
const recommendClickRows = computed(() => analyticsRows(searchAnalytics.value?.recommendClicks))
const noResultRows = computed(() => analyticsRows(searchAnalytics.value?.noResultKeywords))
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
  opsSummaryState.value = 'loading'
  opsSummaryMessage.value = ''
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
  }

  try {
    const analyticsRes = await opsApi.searchAnalytics({ days: 30, limit: 8 })
    searchAnalytics.value = analyticsRes.data
    if (analyticsRes.data?.availability === 'degraded') {
      opsSummaryState.value = 'degraded'
      opsSummaryMessage.value = analyticsRes.data.degradedReason || '搜索运营统计处于兼容降级状态，当前空列表不代表真实的零数据。'
    } else {
      opsSummaryState.value = 'available'
    }
  } catch (analyticsError: unknown) {
    searchAnalytics.value = null
    if (isOpsAnalyticsRestricted(analyticsError)) {
      opsSummaryState.value = 'restricted'
      opsSummaryMessage.value = '搜索运营摘要需要运营权限，当前账号无法查看；此状态不代表没有运营数据。'
    } else {
      opsSummaryState.value = 'unavailable'
      opsSummaryMessage.value = getErrorMessage(analyticsError, '搜索运营摘要暂不可用，当前状态不代表没有运营数据。')
    }
  } finally {
    isLoading.value = false
  }
}

const isOpsAnalyticsRestricted = (error: unknown) => {
  if (error instanceof BizException) {
    return error.code === 10401 || error.code === 10403 || error.status === 401 || error.status === 403
  }
  const status = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: unknown } }).response?.status
    : undefined
  return status === 401 || status === 403
}

const setRange = (range: TrendRange) => {
  activeRange.value = range
}

const setDomain = (domain?: number) => {
  activeDomain.value = domain
}

const openSearchTerm = (keyword: string) => {
  router.push({ path: '/search', query: { q: keyword, sort: 'hot' } })
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
      if (props.color === 'blue') return 'bg-primary-600'
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
.trend-page {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.trend-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(32rem, 0.9fr);
  gap: 2rem;
  align-items: end;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.trend-heading {
  min-width: 0;
}

.trend-context,
.control-label {
  display: block;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.trend-heading h1 {
  margin-top: 0.35rem;
  color: var(--text-strong);
  font-size: 2rem;
  font-weight: 760;
  line-height: 1.2;
  text-wrap: balance;
}

.trend-heading p {
  max-width: 44rem;
  margin-top: 0.7rem;
  color: var(--text-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.trend-controls {
  display: grid;
  gap: 0.85rem;
  justify-items: end;
}

.control-group {
  display: grid;
  gap: 0.45rem;
  justify-items: end;
  min-width: 0;
}

.segmented-control,
.domain-filter {
  display: flex;
  max-width: 100%;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-1);
}

.segmented-control button,
.domain-filter button {
  min-height: 2.25rem;
  border-radius: 5px;
  padding: 0.4rem 0.75rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 650;
  white-space: nowrap;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.segmented-control button:hover,
.domain-filter button:hover {
  color: var(--text-strong);
  background: var(--surface-2);
}

.segmented-control button.active,
.domain-filter button.active {
  color: white;
  background: var(--primary-600);
}

.metric-strip {
  display: grid;
  grid-template-columns: 1.25fr repeat(4, minmax(0, 1fr));
  margin-top: 1.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  overflow: hidden;
}

.metric-card {
  min-width: 0;
  min-height: 8rem;
  padding: 1.05rem 1.15rem;
  border-right: 1px solid var(--border-subtle);
}

.metric-card:last-child {
  border-right: 0;
}

.metric-card span,
.metric-card small {
  display: block;
  color: var(--text-muted);
}

.metric-card span {
  font-size: 0.78rem;
  font-weight: 650;
}

.metric-card strong {
  display: block;
  margin-top: 0.35rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 760;
}

.metric-card small {
  margin-top: 0.35rem;
  font-size: 0.72rem;
  line-height: 1.45;
}

.metric-card--primary {
  background: var(--primary-50);
}

.metric-card--primary strong {
  color: var(--primary-700);
}

.status-notice {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  margin-top: 1.25rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  font-size: 0.8125rem;
}

.status-notice--warning {
  border-color: #f4d08b;
  background: #fffbeb;
  color: #92400e;
}

.trend-loading,
.panel {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
}

.trend-loading {
  display: grid;
  gap: 0.8rem;
  margin-top: 1.5rem;
  padding: 1.5rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.loading-line,
.loading-block {
  background: var(--surface-muted);
  animation: trend-pulse 1.4s ease-in-out infinite;
}

.loading-line {
  width: 36%;
  height: 0.75rem;
  border-radius: 4px;
}

.loading-line--wide {
  width: 58%;
  height: 1rem;
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}

.loading-block {
  height: 7rem;
  border-radius: var(--radius-surface);
}

.panel {
  min-width: 0;
  padding: 1.25rem;
}

.domain-comparison-board,
.analytics-layout {
  margin-top: 1.5rem;
}

.section-heading {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.1rem;
}

.section-heading--stacked {
  display: grid;
}

.section-heading h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 720;
}

.section-heading p {
  max-width: 52rem;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.view-status {
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0.35rem 0.65rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 700;
}

.view-status--degraded {
  background: #fffbeb;
  color: #92400e;
}

.view-status--restricted,
.view-status--unavailable {
  background: #fef2f2;
  color: #991b1b;
}

.domain-comparison-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.65rem;
}

.domain-comparison-row {
  width: 100%;
  min-width: 0;
  padding: 0.9rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-2);
  text-align: left;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.domain-comparison-row:hover {
  border-color: #b8c7e8;
  background: var(--surface-1);
}

.domain-comparison-row--active {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.domain-row-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.6rem;
  align-items: start;
}

.domain-row-heading > div {
  min-width: 0;
}

.domain-row-heading h3 {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain-row-heading p {
  display: -webkit-box;
  margin-top: 0.25rem;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.domain-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-subtle);
  border-radius: 7px;
  background: var(--surface-1);
  font-size: 1rem;
}

.status-pill {
  grid-column: 1 / -1;
  justify-self: start;
  border-radius: var(--radius-pill);
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 700;
}

.status-pill--hot {
  background: #fff4d6;
  color: #8a4b08;
}

.status-pill--steady {
  background: #dcfae6;
  color: #087443;
}

.status-pill--watch {
  background: var(--surface-3);
  color: var(--text-muted);
}

.comparison-values {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.85rem;
}

.comparison-values span {
  display: grid;
  gap: 0.1rem;
}

.comparison-values small {
  color: var(--text-muted);
  font-size: 0.68rem;
}

.comparison-values strong {
  color: var(--text-strong);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 760;
}

.comparison-bar {
  height: 0.35rem;
  margin-top: 0.75rem;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
}

.comparison-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--primary-600);
}

.domain-hotline {
  margin-top: 0.65rem;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.68rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analytics-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 19rem;
  gap: 1rem;
  align-items: start;
}

.analytics-main {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.rank-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.ops-summary-panel {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
}

.ops-summary-list {
  display: grid;
  gap: 1rem;
}

.ops-summary-column + .ops-summary-column {
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}

.ops-summary-column h3 {
  margin-bottom: 0.45rem;
  color: var(--text-strong);
  font-size: 0.8rem;
  font-weight: 700;
}

.ops-summary-row {
  display: flex;
  width: 100%;
  min-height: 2.25rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 5px;
  padding: 0.35rem 0.45rem;
  color: var(--text-primary);
  font-size: 0.78rem;
  text-align: left;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.ops-summary-row:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.ops-summary-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ops-summary-row strong {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.ops-summary-notice,
.ops-summary-empty {
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.ops-summary-notice {
  margin-bottom: 1rem;
  padding: 0.7rem 0.75rem;
}

.ops-summary-notice--degraded {
  background: #fffbeb;
  color: #92400e;
}

.ops-summary-notice--restricted,
.ops-summary-notice--unavailable {
  background: #fef2f2;
  color: #991b1b;
}

.ops-summary-empty {
  padding: 0.6rem;
}

.trend-chart {
  display: flex;
  height: 16rem;
  gap: 0.45rem;
  align-items: end;
  padding-top: 1.5rem;
  overflow-x: auto;
}

.trend-point {
  display: grid;
  grid-template-rows: 1.25rem minmax(0, 1fr) 1.25rem;
  flex: 1 0 2.25rem;
  height: 100%;
  gap: 0.35rem;
  align-items: end;
  justify-items: center;
}

.trend-value,
.trend-date {
  width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.65rem;
  font-variant-numeric: tabular-nums;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-bar {
  width: min(100%, 1.6rem);
  min-height: 0.4rem;
  border-radius: 4px 4px 2px 2px;
  background: var(--primary-600);
  transition: background-color 0.18s ease;
}

.trend-bar:hover {
  background: var(--primary-700);
}

.empty-state {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  padding: 2.25rem 1rem;
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-surface);
  color: var(--text-muted);
  text-align: center;
}

.empty-state strong {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.empty-state span {
  max-width: 34rem;
  font-size: 0.78rem;
  line-height: 1.55;
}

@keyframes trend-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 1100px) {
  .trend-header {
    grid-template-columns: 1fr;
  }

  .trend-controls,
  .control-group {
    justify-items: start;
    width: 100%;
  }

  .domain-filter {
    width: 100%;
    overflow-x: auto;
  }

  .domain-comparison-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .analytics-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .ops-summary-panel {
    position: static;
  }

  .ops-summary-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .ops-summary-column + .ops-summary-column {
    padding-top: 0;
    padding-left: 1rem;
    border-top: 0;
    border-left: 1px solid var(--border-subtle);
  }
}

@media (max-width: 760px) {
  .trend-page {
    padding-top: 1.25rem;
  }

  .trend-heading h1 {
    font-size: 1.65rem;
  }

  .metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .metric-card {
    min-height: 7.5rem;
    border-right: 1px solid var(--border-subtle);
    border-bottom: 1px solid var(--border-subtle);
  }

  .metric-card:nth-child(2n) {
    border-right: 0;
  }

  .metric-card:last-child {
    grid-column: 1 / -1;
    border-right: 0;
    border-bottom: 0;
  }

  .domain-comparison-grid,
  .rank-grid {
    grid-template-columns: 1fr;
  }

  .ops-summary-list {
    grid-template-columns: 1fr;
  }

  .ops-summary-column + .ops-summary-column {
    padding-top: 1rem;
    padding-left: 0;
    border-top: 1px solid var(--border-subtle);
    border-left: 0;
  }

  .loading-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 440px) {
  .trend-header {
    gap: 1.25rem;
  }

  .segmented-control,
  .domain-filter {
    width: 100%;
  }

  .segmented-control button {
    flex: 1 1 0;
    padding-inline: 0.45rem;
  }

  .panel {
    padding: 1rem;
  }

  .section-heading {
    display: grid;
  }

  .view-status {
    justify-self: start;
  }

  .status-notice {
    grid-template-columns: 1fr;
  }
}

:global(html.dark) .metric-card--primary,
:global(html.dark) .domain-comparison-row--active,
:global(html.dark) .ops-summary-row:hover {
  background: rgba(21, 94, 239, 0.14);
}

:global(html.dark) .segmented-control button.active,
:global(html.dark) .domain-filter button.active {
  color: white;
}

:global(html.dark) .status-notice--warning,
:global(html.dark) .view-status--degraded,
:global(html.dark) .ops-summary-notice--degraded {
  background: rgba(120, 53, 15, 0.3);
  color: #fde68a;
}

:global(html.dark) .view-status--restricted,
:global(html.dark) .view-status--unavailable,
:global(html.dark) .ops-summary-notice--restricted,
:global(html.dark) .ops-summary-notice--unavailable {
  background: rgba(127, 29, 29, 0.28);
  color: #fecaca;
}

:global(html.dark) .status-pill--hot {
  background: rgba(146, 64, 14, 0.34);
  color: #fde68a;
}

:global(html.dark) .status-pill--steady {
  background: rgba(6, 95, 70, 0.34);
  color: #a7f3d0;
}
</style>
