<template>
  <div class="app-shell legacy-training-page">
    <AppHeader />
    <main class="community-page prep-page">
      <section v-if="isLoading" class="surface-card prep-state">
        <LoadingSkeleton />
      </section>
      <section v-else-if="!prep" class="surface-card prep-state">
        <EmptyState title="暂无主题包" description="该主题还没有足够的公开经验和知识卡。" actionText="返回知识库" actionHref="/questions" />
      </section>
      <template v-else>
        <section v-if="demoPrepNotice" class="prep-notice">
          {{ demoPrepNotice }}
        </section>

        <header class="surface-card prep-header">
          <div class="prep-header-main">
            <span class="legacy-label">兼容学习工具</span>
            <h1>{{ prep.company }} 主题学习包</h1>
            <p>从公开知识卡和真实经验中整理可执行的学习顺序，默认社区主路径仍是知识库与公开内容。</p>
            <div v-if="prep.aliases.length" class="alias-list" aria-label="主题别名">
              <span v-for="alias in prep.aliases" :key="alias">{{ alias }}</span>
            </div>
          </div>
          <div class="prep-header-actions">
            <RouterLink :to="`/questions?company=${encodeURIComponent(prep.company)}`" class="primary-action">
              查看全部知识卡
            </RouterLink>
            <button
              type="button"
              class="secondary-action"
              :disabled="isAddingTarget || isCompanyTargetAdded || isDemoPrep"
              @click="addCompanyTarget"
            >
              {{ isDemoPrep ? '样例不可加入' : isCompanyTargetAdded ? '已加入目标' : isAddingTarget ? '加入中...' : '加入我的目标' }}
            </button>
            <button type="button" class="secondary-action" @click="copyCompanyPrepPack">
              <Copy class="h-4 w-4" aria-hidden="true" />
              复制主题包
            </button>
            <button type="button" class="secondary-action" @click="downloadCompanyPrepPack">
              <Download class="h-4 w-4" aria-hidden="true" />
              下载主题包
            </button>
          </div>
          <dl class="prep-summary" aria-label="主题包内容概览">
            <div><dt>高频知识卡</dt><dd>{{ prep.topQuestions.length }}</dd></div>
            <div><dt>最近经验</dt><dd>{{ prep.recentPosts.length }}</dd></div>
            <div><dt>热门方向</dt><dd>{{ prep.hotPositions.length }}</dd></div>
            <div><dt>相关方向</dt><dd>{{ prep.relatedPositionCount }}</dd></div>
          </dl>
        </header>

        <div class="prep-layout">
          <section class="prep-main">
            <section v-if="prep.checklist.length" class="surface-card section-panel checklist-panel">
              <div class="section-heading">
                <div>
                  <h2>主题学习清单</h2>
                  <p>把知识卡、经验阅读和个人掌握情况合成一张学习检查表。</p>
                </div>
                <strong class="score-value">{{ prep.prepScore }}%</strong>
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
                  <div class="check-content">
                    <div class="check-title-row">
                      <h3>{{ item.title }}</h3>
                      <span>{{ item.current }}/{{ item.target }}</span>
                    </div>
                    <p>{{ item.description }}</p>
                    <div class="progress-track">
                      <div class="progress-fill" :style="{ width: `${checkPercent(item.current, item.target)}%` }" />
                    </div>
                  </div>
                </RouterLink>
              </div>
              <div v-if="prep.nextActions.length" class="next-actions">
                <strong>下一步建议</strong>
                <div>
                  <span v-for="action in prep.nextActions" :key="action" class="next-action-chip">{{ action }}</span>
                </div>
              </div>
            </section>

            <section class="surface-card section-panel">
              <div class="section-heading">
                <div>
                  <h2>高频知识卡</h2>
                  <p>先覆盖当前主题中反复出现、可复用的核心知识。</p>
                </div>
              </div>
              <div class="content-list">
                <QuestionCard v-for="question in prep.topQuestions" :key="question.id" :question="question" />
                <EmptyState v-if="prep.topQuestions.length === 0" title="暂无知识卡" description="等待更多经验沉淀。" />
              </div>
            </section>

            <section v-if="authStore.isLoggedIn" class="surface-card section-panel">
              <div class="section-heading">
                <div>
                  <h2>优先学习这些</h2>
                  <p>结合你的掌握状态，从该主题高频知识卡里排除已掌握内容。</p>
                </div>
                <span class="status-badge">个人化</span>
              </div>
              <div class="content-list">
                <QuestionCard v-for="question in prep.recommendedQuestions" :key="question.id" :question="question" />
                <EmptyState v-if="prep.recommendedQuestions.length === 0" title="暂无待推荐知识卡" description="该主题高频内容已基本完成，继续补充新经验或复盘笔记。" />
              </div>
            </section>

            <section class="surface-card section-panel">
              <div class="section-heading">
                <div>
                  <h2>最近经验</h2>
                  <p>用公开经验补充知识卡之外的背景、限制和真实取舍。</p>
                </div>
              </div>
              <div class="experience-list">
                <RouterLink v-for="post in prep.recentPosts" :key="post.postId" :to="`/post/${post.postId}`" class="experience-row">
                  <h3>{{ post.title }}</h3>
                  <p>{{ post.summary || post.content }}</p>
                </RouterLink>
                <EmptyState v-if="prep.recentPosts.length === 0" title="暂无经验" description="还没有公开经验。" />
              </div>
            </section>
          </section>

          <aside class="prep-aside">
            <section class="surface-card aside-panel confidence-panel">
              <div class="aside-heading">
                <h2>数据可信度</h2>
                <span>{{ dataUpdatedText }}</span>
              </div>
              <p>{{ confidenceHint }}</p>
              <dl class="confidence-metrics">
                <div><dt>知识卡样本</dt><dd>{{ prep.questionSampleCount }}</dd></div>
                <div><dt>经验样本</dt><dd>{{ prep.postSampleCount }}</dd></div>
                <div><dt>反馈样本</dt><dd>{{ prep.resultSampleCount }}</dd></div>
                <div><dt>近 30 天反馈</dt><dd>{{ prep.recentResultSampleCount }}</dd></div>
              </dl>
            </section>

            <section v-if="prep.myProgress" class="surface-card aside-panel">
              <div class="aside-heading"><h2>我的学习进度</h2></div>
              <dl class="personal-progress">
                <div><dt>收藏</dt><dd>{{ prep.myProgress.favoriteCount }}</dd></div>
                <div><dt>学习中</dt><dd>{{ prep.myProgress.learningCount }}</dd></div>
                <div><dt>已掌握</dt><dd>{{ prep.myProgress.masteredCount }}</dd></div>
                <div><dt>待复习</dt><dd>{{ prep.myProgress.reviewCount }}</dd></div>
              </dl>
            </section>

            <section class="surface-card aside-panel">
              <div class="aside-heading"><h2>高频技术标签</h2></div>
              <RankList :items="prep.topTags" />
            </section>
            <section class="surface-card aside-panel">
              <div class="aside-heading"><h2>热门方向</h2></div>
              <RankList :items="prep.hotPositions" />
            </section>
            <section class="surface-card aside-panel trend-panel">
              <div class="aside-heading">
                <h2>讨论热度</h2>
                <span>30 / 90 天</span>
              </div>
              <div class="trend-columns">
                <div>
                  <h3>近 30 天</h3>
                  <RankList :items="prep.trend30Days" />
                </div>
                <div>
                  <h3>近 90 天</h3>
                  <RankList :items="prep.trend90Days" />
                </div>
              </div>
            </section>
            <section class="surface-card aside-panel">
              <div class="aside-heading">
                <div>
                  <h2>反馈趋势</h2>
                  <p>来自公开经验的反馈分布。</p>
                </div>
                <span class="status-badge">30 天</span>
              </div>
              <ResultTrendList title="近 30 天" :items="prep.recentResultDistribution" />
              <ResultTrendList class="mt-4" title="全部样本" :items="prep.interviewResultDistribution" />
            </section>
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
  queryKey: computed(() => ['company-prep', authStore.user?.uid ?? 'anonymous', company.value]),
  queryFn: () => questionApi.companyPrep(company.value),
  enabled: computed(() => Boolean(company.value)),
})

const prep = computed(() => data.value?.data || null)
const isDemoPrep = computed(() => data.value?.message === 'local_demo_company_prep_sample' || data.value?.message === 'local_demo_seed')
const demoPrepNotice = computed(() => isDemoPrep.value
  ? `当前展示的是本地样例主题包，不代表「${company.value}」的真实面试或备考数据；连接真实服务后会自动替换。`
  : ''
)
const defaultCompanyQuestionHref = computed(() => `/questions?company=${encodeURIComponent(prep.value?.company || company.value)}`)
const isCompanyTargetAdded = computed(() => prep.value?.checklist.some((item) => item.key === 'target' && item.done) ?? false)
const totalSampleCount = computed(() => {
  if (!prep.value) return 0
  return prep.value.questionSampleCount + prep.value.postSampleCount
})
const confidenceHint = computed(() => {
  if (!prep.value) return ''
  if (totalSampleCount.value >= 30 && prep.value.resultSampleCount >= 10) return '样本较充分，趋势和高频知识卡可以作为主要学习参考。'
  if (totalSampleCount.value >= 10) return '样本正在积累，建议结合近期经验和个人目标交叉判断。'
  return '样本偏少，优先把它当作起步清单，不要把低频误判成不考。'
})
const dataUpdatedText = computed(() => prep.value?.dataUpdatedAt ? formatDate(prep.value.dataUpdatedAt, 'YYYY-MM-DD HH:mm') : '暂无记录')

const addCompanyTarget = async () => {
  if (!prep.value || isCompanyTargetAdded.value || isAddingTarget.value || isDemoPrep.value) return
  if (!authStore.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  isAddingTarget.value = true
  try {
    await questionApi.addPrepTarget({ targetType: 'company', targetValue: prep.value.company })
    toast.success('已加入我的学习目标')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '加入学习目标失败'))
  } finally {
    isAddingTarget.value = false
  }
}

const copyCompanyPrepPack = async () => {
  if (!prep.value) return
  try {
    await navigator.clipboard.writeText(buildCompanyPrepPackMarkdown(prep.value))
    toast.success('主题包已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制主题包失败'))
  }
}

const downloadCompanyPrepPack = () => {
  if (!prep.value) return
  try {
    downloadMarkdownFile(buildCompanyPrepPackMarkdown(prep.value), `offerlab-${prep.value.company}-主题包-${exportDateText()}.md`)
    toast.success('主题包已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载主题包失败'))
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
.legacy-training-page {
  background: var(--surface-2);
}

.prep-page {
  padding-top: 1.25rem;
  padding-bottom: 5rem;
}

.prep-state {
  min-height: 24rem;
  padding: 1.5rem;
}

.prep-notice {
  margin-bottom: 0.875rem;
  border: 1px solid #fed7aa;
  border-radius: var(--radius-surface);
  background: #fff7ed;
  padding: 0.75rem 1rem;
  color: #9a3412;
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.55;
}

.prep-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.25rem 2rem;
  padding: 1.5rem;
}

.prep-header-main {
  min-width: 0;
}

.legacy-label {
  display: inline-flex;
  min-height: 1.625rem;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  padding: 0.2rem 0.625rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.prep-header h1 {
  margin-top: 0.75rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.25;
  text-wrap: balance;
}

.prep-header-main > p {
  max-width: 68ch;
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.alias-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.875rem;
}

.alias-list span {
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  padding: 0.25rem 0.625rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.prep-header-actions {
  display: flex;
  max-width: 30rem;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: 0.5rem;
}

.prep-header-actions :is(a, button) {
  min-height: 2.5rem;
  white-space: nowrap;
}

.prep-header-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.prep-summary {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--border-subtle);
}

.prep-summary div {
  padding: 1rem 0.875rem 0;
}

.prep-summary div + div {
  border-left: 1px solid var(--border-subtle);
}

.prep-summary dt {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.prep-summary dd {
  margin-top: 0.25rem;
  color: var(--text-strong);
  font-size: 1.375rem;
  font-weight: 800;
}

.prep-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 19rem;
  gap: 1rem;
  align-items: start;
  margin-top: 1rem;
}

.prep-main,
.prep-aside {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.prep-aside {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
}

.section-panel,
.aside-panel {
  padding: 1.25rem;
}

.section-heading,
.aside-heading,
.check-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.section-heading {
  margin-bottom: 1rem;
}

.section-heading h2,
.aside-heading h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.4;
  text-wrap: balance;
}

.section-heading p,
.aside-heading p {
  max-width: 62ch;
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.score-value {
  flex: 0 0 auto;
  color: var(--primary-600);
  font-size: 1.25rem;
  font-weight: 800;
}

.content-list,
.experience-list,
.checklist-grid {
  display: grid;
  gap: 0.75rem;
}

.checklist-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.check-item {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-2);
  padding: 0.875rem;
  transition: border-color 160ms ease, background-color 160ms ease;
}

.check-item:hover {
  border-color: #a9d8c3;
  background: var(--primary-50);
}

.check-item.done {
  border-color: #a7f3d0;
  background: #ecfdf5;
}

.check-icon {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 1px solid #a9d8c3;
  border-radius: var(--radius-pill);
  background: var(--surface);
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.check-item.done .check-icon {
  border-color: #6ee7b7;
  color: #047857;
}

.check-title-row h3 {
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 800;
}

.check-title-row span {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.check-content > p {
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.progress-track {
  height: 0.375rem;
  overflow: hidden;
  margin-top: 0.625rem;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-600);
}

.next-actions {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  margin-top: 1rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
}

.next-actions > strong {
  padding-top: 0.3rem;
  color: var(--text-primary);
  font-size: 0.75rem;
}

.next-actions > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.next-action-chip,
.status-badge {
  display: inline-flex;
  min-height: 1.75rem;
  align-items: center;
  border: 1px solid #a9d8c3;
  border-radius: var(--radius-pill);
  background: var(--primary-50);
  padding: 0.2rem 0.625rem;
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.experience-row {
  display: block;
  border-top: 1px solid var(--border-subtle);
  padding: 0.875rem 0;
}

.experience-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.experience-row:last-child {
  padding-bottom: 0;
}

.experience-row h3 {
  color: var(--text-strong);
  font-size: 0.9375rem;
  font-weight: 750;
  line-height: 1.45;
}

.experience-row p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 0.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.experience-row:hover h3 {
  color: var(--primary-600);
}

.aside-heading {
  margin-bottom: 0.875rem;
}

.aside-heading > span {
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 650;
  white-space: nowrap;
}

.confidence-panel > p {
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.confidence-metrics,
.personal-progress {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.875rem;
}

.confidence-metrics div,
.personal-progress div {
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.625rem;
}

.confidence-metrics dt,
.personal-progress dt {
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 650;
}

.confidence-metrics dd,
.personal-progress dd {
  margin-top: 0.125rem;
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 800;
}

.trend-columns {
  display: grid;
  gap: 1rem;
}

.trend-columns > div + div {
  border-top: 1px solid var(--border-subtle);
  padding-top: 1rem;
}

.trend-columns h3 {
  margin-bottom: 0.625rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 750;
}

.result-trend-block {
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.75rem;
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
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 750;
}

.result-trend-heading strong {
  color: var(--text-strong);
}

.result-row-meta {
  margin-bottom: 0.3rem;
  font-size: 0.75rem;
}

.result-row-meta span {
  color: var(--text-primary);
  font-weight: 700;
}

.result-row-meta strong {
  color: var(--primary-600);
  font-weight: 800;
}

.result-bar-track {
  height: 0.375rem;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
}

.result-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary-600);
}

.result-empty {
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-control);
  padding: 0.75rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-align: center;
}

@media (max-width: 1023px) {
  .prep-header {
    grid-template-columns: 1fr;
  }

  .prep-header-actions {
    max-width: none;
    justify-content: flex-start;
  }

  .prep-layout {
    grid-template-columns: 1fr;
  }

  .prep-aside {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .prep-page {
    padding-top: 0.75rem;
    padding-bottom: 2rem;
  }

  .prep-header,
  .section-panel,
  .aside-panel {
    padding: 1rem;
  }

  .prep-header {
    gap: 1rem;
  }

  .prep-header h1 {
    font-size: 1.375rem;
  }

  .prep-header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .prep-header-actions :is(a, button) {
    width: 100%;
    min-width: 0;
    padding-right: 0.625rem;
    padding-left: 0.625rem;
    font-size: 0.75rem;
  }

  .prep-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .prep-summary div {
    padding: 0.75rem 0.5rem 0;
  }

  .prep-summary div:nth-child(3) {
    border-left: 0;
  }

  .prep-summary div:nth-child(n + 3) {
    margin-top: 0.75rem;
    border-top: 1px solid var(--border-subtle);
  }

  .prep-summary dd {
    font-size: 1.125rem;
  }

  .checklist-grid,
  .prep-aside {
    grid-template-columns: 1fr;
  }

  .section-heading {
    align-items: flex-start;
  }

  .next-actions {
    grid-template-columns: 1fr;
  }

  .check-item {
    grid-template-columns: 1.875rem minmax(0, 1fr);
    gap: 0.625rem;
    padding: 0.75rem;
  }

  .check-icon {
    width: 1.875rem;
    height: 1.875rem;
  }
}

.dark .prep-notice {
  border-color: #7c2d12;
  background: rgb(67 20 7 / 0.44);
  color: #fdba74;
}

.dark .check-item {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .check-item:hover {
  border-color: #12634a;
  background: #071f18;
}

.dark .check-item.done {
  border-color: #166534;
  background: #052e16;
}

.dark .check-icon {
  border-color: #0e4a37;
  background: var(--surface-2);
  color: #a9d8c3;
}

.dark .check-item.done .check-icon {
  border-color: #15803d;
  color: #bbf7d0;
}

.dark .next-action-chip,
.dark .status-badge {
  border-color: #0e4a37;
  background: #071f18;
  color: #a9d8c3;
}

.dark .result-trend-block,
.dark .confidence-metrics div,
.dark .personal-progress div {
  background: var(--surface-1);
}
</style>
