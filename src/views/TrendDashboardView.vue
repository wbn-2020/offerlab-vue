<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Community Insights</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">趋势看板</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
            基于真实公开帖子、标签和社区扩展字段生成统计，用来观察技术方向和内容场景变化。
          </p>
        </div>
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
          <span>热门技术方向</span>
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
        <section class="grid gap-6 lg:grid-cols-2">
          <RankPanel title="热门技术方向 Top 10" unit="篇" :items="dashboard?.topCompanies || []" color="primary" />
          <RankPanel title="高频标签 Top 10" unit="次" :items="dashboard?.topTags || []" color="blue" />
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

const periods: Array<{ value: TrendRange; label: string }> = [
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
  { value: '90d', label: '近 90 天' },
]

const activeRange = ref<TrendRange>('30d')
const dashboard = ref<TrendDashboard | null>(null)
const isLoading = ref(false)
const errorText = ref('')

const publishTrend = computed(() => dashboard.value?.publishTrend || [])
const maxTrendCount = computed(() => Math.max(1, ...publishTrend.value.map((item) => item.count)))

const loadDashboard = async () => {
  isLoading.value = true
  errorText.value = ''
  try {
    const res = await dashboardApi.getTrendDashboard(activeRange.value)
    dashboard.value = res.data
  } catch (error: any) {
    errorText.value = getErrorMessage(error, '趋势数据暂不可用')
    dashboard.value = null
  } finally {
    isLoading.value = false
  }
}

const setRange = (range: TrendRange) => {
  activeRange.value = range
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
watch(activeRange, loadDashboard)
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
</style>
