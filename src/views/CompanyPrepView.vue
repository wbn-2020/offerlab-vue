<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <LoadingSkeleton v-if="isLoading" />
      <EmptyState v-else-if="!prep" title="暂无公司准备包" description="该公司还没有足够的公开面经和题目。" actionText="返回题库" actionHref="/questions" />
      <template v-else>
        <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-bold text-slate-950 dark:text-slate-50">{{ prep.company }} 准备包</h1>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">聚合近期面经、高频题目、热门岗位和技术标签。</p>
              <div v-if="prep.aliases.length" class="mt-3 flex flex-wrap gap-2">
                <span v-for="alias in prep.aliases" :key="alias" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ alias }}</span>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="prep-export-button"
                :disabled="isAddingTarget || isCompanyTargetAdded"
                @click="addCompanyTarget"
              >
                {{ isCompanyTargetAdded ? '已加入目标' : isAddingTarget ? '加入中...' : '加入我的目标' }}
              </button>
              <button type="button" class="prep-export-button" @click="copyCompanyPrepPack">
                <Copy class="h-4 w-4" aria-hidden="true" />
                复制准备包
              </button>
              <button type="button" class="prep-export-button" @click="downloadCompanyPrepPack">
                <Download class="h-4 w-4" aria-hidden="true" />
                下载准备包
              </button>
              <RouterLink :to="`/questions?company=${encodeURIComponent(prep.company)}`" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
                查看全部题目
              </RouterLink>
            </div>
          </div>
        </section>

        <section class="mb-6 grid gap-4 md:grid-cols-4">
          <div class="metric-card"><span>高频题</span><strong>{{ prep.topQuestions.length }}</strong></div>
          <div class="metric-card"><span>最近面经</span><strong>{{ prep.recentPosts.length }}</strong></div>
          <div class="metric-card"><span>热门岗位</span><strong>{{ prep.hotPositions.length }}</strong></div>
          <div class="metric-card"><span>相关岗位数</span><strong>{{ prep.relatedPositionCount }}</strong></div>
        </section>

        <section class="data-confidence-panel mb-6">
          <div>
            <h2>数据可信度</h2>
            <p>{{ confidenceHint }}</p>
          </div>
          <div class="confidence-metrics">
            <span>题目样本 <strong>{{ prep.questionSampleCount }}</strong></span>
            <span>面经样本 <strong>{{ prep.postSampleCount }}</strong></span>
            <span>结果样本 <strong>{{ prep.resultSampleCount }}</strong></span>
            <span>近 30 天结果 <strong>{{ prep.recentResultSampleCount }}</strong></span>
            <span>更新 <strong>{{ dataUpdatedText }}</strong></span>
          </div>
        </section>

        <section v-if="prep.checklist.length" class="section-panel mb-6">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="section-title mb-1">公司准备清单</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">把公司题库、面经阅读和个人掌握情况合成一张面试前检查表。</p>
            </div>
            <div class="score-ring">{{ prep.prepScore }}%</div>
          </div>
          <div class="checklist-grid">
            <RouterLink
              v-for="item in prep.checklist"
              :key="item.key"
              :to="safeActionHref(item.actionHref)"
              class="check-item"
              :class="{ done: item.done }"
            >
              <div class="check-icon">{{ item.done ? '✓' : item.current }}</div>
              <div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
                <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div class="h-full rounded-full bg-primary-600" :style="{ width: `${checkPercent(item.current, item.target)}%` }" />
                </div>
              </div>
            </RouterLink>
          </div>
          <div v-if="prep.nextActions.length" class="next-actions">
            <div class="text-xs font-semibold uppercase text-slate-400">Next</div>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="action in prep.nextActions" :key="action" class="next-action-chip">{{ action }}</span>
            </div>
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="space-y-4 lg:col-span-2">
            <div class="section-panel">
              <h2 class="section-title">高频面试题</h2>
              <div class="grid gap-4">
                <QuestionCard v-for="question in prep.topQuestions" :key="question.id" :question="question" />
                <EmptyState v-if="prep.topQuestions.length === 0" title="暂无题目" description="等待更多面经沉淀。" />
              </div>
            </div>

            <div v-if="authStore.isLoggedIn" class="section-panel">
              <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 class="section-title !mb-1">优先刷这些</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400">结合你的掌握状态，从该公司高频题里排除已掌握内容。</p>
                </div>
                <span class="trend-badge">个人化</span>
              </div>
              <div class="grid gap-4">
                <QuestionCard v-for="question in prep.recommendedQuestions" :key="question.id" :question="question" />
                <EmptyState v-if="prep.recommendedQuestions.length === 0" title="暂无待推荐题" description="该公司高频题已基本完成，继续补充新面经或复盘笔记。" />
              </div>
            </div>

            <div class="section-panel">
              <h2 class="section-title">最近面经</h2>
              <div class="space-y-3">
                <RouterLink v-for="post in prep.recentPosts" :key="post.postId" :to="`/post/${post.postId}`" class="block rounded-lg border border-slate-100 bg-slate-50 p-4 hover:bg-primary-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-primary-950/30">
                  <h3 class="font-semibold text-slate-950 dark:text-slate-50">{{ post.title }}</h3>
                  <p class="mt-1 line-clamp-2 text-sm text-slate-500">{{ post.summary || post.content }}</p>
                </RouterLink>
                <EmptyState v-if="prep.recentPosts.length === 0" title="暂无面经" description="还没有公开面经。" />
              </div>
            </div>
          </section>

          <aside class="space-y-6">
            <div class="section-panel">
              <h2 class="section-title">高频技术标签</h2>
              <RankList :items="prep.topTags" />
            </div>
            <div class="section-panel">
              <h2 class="section-title">热门岗位</h2>
              <RankList :items="prep.hotPositions" />
            </div>
            <div class="section-panel">
              <h2 class="section-title">30 天热度</h2>
              <RankList :items="prep.trend30Days" />
            </div>
            <div class="section-panel">
              <h2 class="section-title">90 天热度</h2>
              <RankList :items="prep.trend90Days" />
            </div>
            <div class="section-panel">
              <div class="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 class="section-title !mb-1">面试结果趋势</h2>
                  <p class="text-xs leading-5 text-slate-500 dark:text-slate-400">来自公开面经的结果分布，辅助判断近期反馈。</p>
                </div>
                <span class="trend-badge">30 天</span>
              </div>
              <ResultTrendList title="近 30 天" :items="prep.recentResultDistribution" />
              <ResultTrendList class="mt-4" title="全部样本" :items="prep.interviewResultDistribution" />
            </div>
            <div v-if="prep.myProgress" class="section-panel">
              <h2 class="section-title">我的准备进度</h2>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="progress-cell">收藏 {{ prep.myProgress.favoriteCount }}</div>
                <div class="progress-cell">学习中 {{ prep.myProgress.learningCount }}</div>
                <div class="progress-cell">已掌握 {{ prep.myProgress.masteredCount }}</div>
                <div class="progress-cell">待复习 {{ prep.myProgress.reviewCount }}</div>
              </div>
            </div>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { Copy, Download } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi, type NameCount } from '@/api/question'
import { buildCompanyPrepPackMarkdown, downloadMarkdownFile } from '@/utils/prepPackExport'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/format'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const company = computed(() => route.params.company as string)
const isAddingTarget = ref(false)

const { data, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['company-prep', company.value]),
  queryFn: () => questionApi.companyPrep(company.value),
  enabled: computed(() => Boolean(company.value)),
})

const prep = computed(() => data.value?.data || null)
const defaultCompanyQuestionHref = computed(() => `/questions?company=${encodeURIComponent(prep.value?.company || company.value)}`)
const isCompanyTargetAdded = computed(() => prep.value?.checklist.some((item) => item.key === 'target' && item.done) ?? false)
const totalSampleCount = computed(() => {
  if (!prep.value) return 0
  return prep.value.questionSampleCount + prep.value.postSampleCount
})
const confidenceHint = computed(() => {
  if (!prep.value) return ''
  if (totalSampleCount.value >= 30 && prep.value.resultSampleCount >= 10) return '样本较充分，趋势和高频题可以作为主要准备参考。'
  if (totalSampleCount.value >= 10) return '样本正在积累，建议结合近期面经和个人目标交叉判断。'
  return '样本偏少，优先把它当作起步清单，不要把低频误判成不考。'
})
const dataUpdatedText = computed(() => prep.value?.dataUpdatedAt ? formatDate(prep.value.dataUpdatedAt, 'YYYY-MM-DD HH:mm') : '暂无记录')

const addCompanyTarget = async () => {
  if (!prep.value || isCompanyTargetAdded.value || isAddingTarget.value) return
  if (!authStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  isAddingTarget.value = true
  try {
    await questionApi.addPrepTarget({ targetType: 'company', targetValue: prep.value.company })
    toast.success('已加入我的准备目标')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '加入准备目标失败'))
  } finally {
    isAddingTarget.value = false
  }
}

const copyCompanyPrepPack = async () => {
  if (!prep.value) return
  try {
    await navigator.clipboard.writeText(buildCompanyPrepPackMarkdown(prep.value))
    toast.success('公司准备包已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制公司准备包失败'))
  }
}

const downloadCompanyPrepPack = () => {
  if (!prep.value) return
  try {
    downloadMarkdownFile(buildCompanyPrepPackMarkdown(prep.value), `offerlab-${prep.value.company}-准备包-${exportDateText()}.md`)
    toast.success('公司准备包已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载公司准备包失败'))
  }
}

const exportDateText = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const checkPercent = (current: number, target: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / target) * 100)))
}

const safeActionHref = (href?: string) => {
  const fallback = defaultCompanyQuestionHref.value
  if (!href || !href.startsWith('/')) return fallback
  if (href.startsWith('//')) return fallback
  const allowedPrefixes = ['/questions', '/search', '/me/prep', '/login', '/companies/']
  return allowedPrefixes.some((prefix) => href.startsWith(prefix)) ? href : fallback
}

const RankList = defineComponent({
  props: {
    items: { type: Array as () => NameCount[], required: true },
  },
  setup(props) {
    return () => props.items.length
      ? h('div', { class: 'space-y-3' }, props.items.map((item, index) =>
          h('div', { class: 'flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950' }, [
            h('span', { class: 'font-semibold text-slate-700 dark:text-slate-200' }, `${index + 1}. ${item.name}`),
            h('span', { class: 'text-slate-500' }, item.count),
          ]),
        ))
      : h(EmptyState, { title: '暂无数据', description: '数据沉淀中。' })
  },
})

const ResultTrendList = defineComponent({
  props: {
    title: { type: String, required: true },
    items: { type: Array as () => NameCount[], required: true },
  },
  setup(props) {
    const total = computed(() => props.items.reduce((sum, item) => sum + item.count, 0))
    const percent = (count: number) => {
      if (!total.value) return 0
      return Math.max(0, Math.min(100, Math.round((count / total.value) * 100)))
    }
    return () => h('div', { class: 'result-trend-block' }, [
      h('div', { class: 'result-trend-heading' }, [
        h('span', props.title),
        h('strong', `${total.value} 条`),
      ]),
      props.items.length
        ? h('div', { class: 'space-y-3' }, props.items.map((item) => h('div', { class: 'result-row' }, [
            h('div', { class: 'result-row-meta' }, [
              h('span', item.name),
              h('strong', `${percent(item.count)}%`),
            ]),
            h('div', { class: 'result-bar-track' }, [
              h('div', { class: 'result-bar-fill', style: { width: `${percent(item.count)}%` } }),
            ]),
          ])))
        : h('div', { class: 'result-empty' }, '暂无结果样本'),
    ])
  },
})
</script>

<style scoped>
.metric-card,
.section-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}
.metric-card span {
  display: block;
  font-size: 0.875rem;
  color: rgb(100 116 139);
}
.metric-card strong {
  margin-top: 0.4rem;
  display: block;
  font-size: 1.8rem;
  color: rgb(15 23 42);
}
.data-confidence-panel {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(186 230 253);
  background: rgb(240 249 255);
  padding: 1rem 1.25rem;
}
.data-confidence-panel h2 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(12 74 110);
}
.data-confidence-panel p {
  margin-top: 0.25rem;
  font-size: 0.84rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}
.confidence-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.confidence-metrics span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid rgb(186 230 253);
  background: white;
  padding: 0.25rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: rgb(71 85 105);
}
.confidence-metrics strong {
  color: rgb(3 105 161);
}
.section-title {
  margin-bottom: 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: rgb(15 23 42);
}
.progress-cell {
  border-radius: 0.75rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
  font-weight: 700;
  color: rgb(71 85 105);
}
.score-ring {
  display: inline-flex;
  min-width: 56px;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(239 246 255);
  font-size: 1rem;
  font-weight: 900;
  color: rgb(29 78 216);
}
.prep-export-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(29 78 216);
}
.checklist-grid {
  display: grid;
  gap: 0.85rem;
}
.next-actions {
  margin-top: 1rem;
  border-top: 1px solid rgb(226 232 240);
  padding-top: 1rem;
}
.next-action-chip {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.3rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: rgb(29 78 216);
}
.trend-badge {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.2rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
  color: rgb(71 85 105);
  white-space: nowrap;
}
.result-trend-block {
  border-radius: 0.75rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}
.result-trend-heading,
.result-row-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.result-trend-heading {
  margin-bottom: 0.75rem;
  font-size: 0.78rem;
  font-weight: 900;
  color: rgb(71 85 105);
}
.result-trend-heading strong {
  color: rgb(15 23 42);
}
.result-row-meta {
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
}
.result-row-meta span {
  font-weight: 800;
  color: rgb(51 65 85);
}
.result-row-meta strong {
  font-weight: 900;
  color: rgb(37 99 235);
}
.result-bar-track {
  height: 0.45rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(226 232 240);
}
.result-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: rgb(37 99 235);
}
.result-empty {
  border-radius: 0.6rem;
  border: 1px dashed rgb(203 213 225);
  padding: 0.75rem;
  text-align: center;
  font-size: 0.8rem;
  color: rgb(100 116 139);
}
.check-item {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.9rem;
}
.check-item.done {
  border-color: rgb(187 247 208);
  background: rgb(240 253 244);
}
.check-icon {
  display: inline-flex;
  width: 36px;
  height: 36px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: white;
  font-size: 0.85rem;
  font-weight: 900;
  color: rgb(37 99 235);
}
.check-item h3 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}
.check-item p {
  margin-top: 0.25rem;
  font-size: 0.8rem;
  color: rgb(100 116 139);
}
@media (min-width: 768px) {
  .checklist-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1024px) {
  .data-confidence-panel {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
  .confidence-metrics {
    justify-content: flex-end;
  }
}
:global(.dark) .metric-card,
:global(.dark) .section-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}
:global(.dark) .data-confidence-panel {
  border-color: rgb(14 116 144);
  background: rgb(8 47 73);
}
:global(.dark) .data-confidence-panel h2 {
  color: rgb(186 230 253);
}
:global(.dark) .data-confidence-panel p {
  color: rgb(203 213 225);
}
:global(.dark) .confidence-metrics span {
  border-color: rgb(14 116 144);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}
:global(.dark) .confidence-metrics strong {
  color: rgb(125 211 252);
}
:global(.dark) .metric-card strong,
:global(.dark) .section-title {
  color: rgb(248 250 252);
}
:global(.dark) .progress-cell {
  background: rgb(2 6 23);
  color: rgb(203 213 225);
}
:global(.dark) .score-ring {
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}
:global(.dark) .prep-export-button {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}
:global(.dark) .next-actions {
  border-top-color: rgb(30 41 59);
}
:global(.dark) .next-action-chip {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}
:global(.dark) .trend-badge {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
  color: rgb(203 213 225);
}
:global(.dark) .result-trend-block {
  background: rgb(2 6 23);
}
:global(.dark) .result-trend-heading,
:global(.dark) .result-row-meta span {
  color: rgb(203 213 225);
}
:global(.dark) .result-trend-heading strong {
  color: rgb(248 250 252);
}
:global(.dark) .result-row-meta strong {
  color: rgb(147 197 253);
}
:global(.dark) .result-bar-track {
  background: rgb(30 41 59);
}
:global(.dark) .result-bar-fill {
  background: rgb(96 165 250);
}
:global(.dark) .result-empty {
  border-color: rgb(51 65 85);
  color: rgb(148 163 184);
}
:global(.dark) .check-item {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}
:global(.dark) .check-item.done {
  border-color: rgb(22 101 52);
  background: rgb(5 46 22);
}
:global(.dark) .check-icon {
  background: rgb(15 23 42);
}
:global(.dark) .check-item h3 {
  color: rgb(248 250 252);
}
</style>
