<template>
  <div class="app-shell">
    <AppHeader />
    <main class="community-page questions-page">
      <header class="questions-header">
        <div>
          <span class="page-context">公共知识问答</span>
          <h1>知识库</h1>
          <p>从公开经验与讨论中整理出的结构化问题。先搜索主题，再按来源方向、应用场景和难度收窄结果。</p>
        </div>
        <div class="header-actions">
          <RouterLink to="/search" class="secondary-action">
            <Search class="h-4 w-4" aria-hidden="true" />
            搜索全站内容
          </RouterLink>
          <RouterLink to="/editor" class="primary-action">
            <PenLine class="h-4 w-4" aria-hidden="true" />
            发布问题
          </RouterLink>
        </div>
      </header>

      <section class="question-discovery-panel" aria-labelledby="question-filter-title">
        <div class="filter-heading">
          <div>
            <h2 id="question-filter-title">发现知识卡</h2>
            <p>关键词支持题目正文与结构化内容；筛选条件会同步到地址栏，便于保存或分享当前视图。</p>
          </div>
          <span v-if="hasActiveFilters" class="active-filter-status">已应用筛选</span>
        </div>

        <div v-if="enableLegacyTrainingTools" class="quick-filter-row" aria-label="个人知识库快捷筛选">
          <button
            v-for="action in quickFilters"
            :key="action.key"
            type="button"
            :class="['quick-filter', action.active() ? 'quick-filter-active' : '']"
            @click="action.apply"
          >
            {{ action.label }}
          </button>
        </div>

        <form class="question-filter-form" @submit.prevent="applyFilters">
          <div class="question-filter-primary">
            <div class="search-field">
              <Search class="h-4 w-4" aria-hidden="true" />
                <input
                  v-model.trim="filters.keyword"
                  class="filter-input filter-input--search"
                  aria-label="知识库关键词或知识卡正文"
                  placeholder="搜索问题、考察点或参考思路"
                >
            </div>
            <button
              type="button"
              class="secondary-action mobile-filter-toggle"
              :aria-expanded="showMobileFilters"
              aria-controls="question-advanced-filters"
              @click="showMobileFilters = !showMobileFilters"
            >
              <SlidersHorizontal class="h-4 w-4" aria-hidden="true" />
              {{ showMobileFilters ? '收起条件' : '筛选条件' }}
            </button>
          </div>
          <div
            id="question-advanced-filters"
            :class="['question-filter-advanced', showMobileFilters ? 'question-filter-advanced-open' : '']"
          >
            <label class="filter-field">
              <span>来源方向</span>
              <input v-model.trim="filters.company" class="filter-input" aria-label="知识库技术栈筛选" placeholder="例如：前端、理财、学习方法">
            </label>
            <label class="filter-field">
              <span>应用场景</span>
              <input v-model.trim="filters.position" class="filter-input" aria-label="知识库场景筛选" placeholder="例如：项目排查、生活决策">
            </label>
            <label class="filter-field">
              <span>难度</span>
              <select v-model="filters.difficulty" class="filter-input" aria-label="知识库难度筛选">
                <option value="">全部难度</option>
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </label>
            <label v-if="enableLegacyTrainingTools" class="filter-field">
              <span>错因</span>
              <select v-model="filters.mistakeReason" class="filter-input" aria-label="知识库错因筛选">
                <option value="">全部错因</option>
                <option value="any">任意错因</option>
                <option value="concept">概念不熟</option>
                <option value="project">项目表达弱</option>
                <option value="memory">需要记忆</option>
                <option value="expression">表达不清</option>
                <option value="careless">粗心失误</option>
                <option value="other">其他错因</option>
              </select>
            </label>
            <label v-if="enableLegacyTrainingTools" class="filter-field">
              <span>学习状态</span>
              <select v-model="filters.progressStatus" class="filter-input" aria-label="知识库学习状态筛选">
                <option value="">全部状态</option>
                <option value="todo">待学习</option>
                <option value="learning">学习中</option>
                <option value="mastered">已掌握</option>
                <option value="review">待复习</option>
              </select>
            </label>
            <label class="filter-field">
              <span>排序方式</span>
              <select v-model="filters.sort" class="filter-input" aria-label="知识库排序方式">
                <option value="latest">最新发布</option>
                <option value="appear">出现次数</option>
                <option value="hot">讨论热度</option>
                <option value="relevance">搜索相关度</option>
              </select>
            </label>
          </div>
          <div class="question-filter-actions">
            <button type="submit" class="primary-action">
              <Search class="h-4 w-4" aria-hidden="true" />
              查看结果
            </button>
            <button type="button" class="secondary-action" :disabled="!hasActiveFilters" @click="resetFilters">
              <RotateCcw class="h-4 w-4" aria-hidden="true" />
              重置
            </button>
          </div>
        </form>
      </section>

      <section v-if="demoSeedNotice && !isLoading" class="demo-notice" role="status">
        {{ demoSeedNotice }}
      </section>

      <div class="questions-layout">
        <section class="questions-results" aria-labelledby="question-results-title">
          <div class="results-heading">
            <div>
              <h2 id="question-results-title">知识卡结果</h2>
              <p v-if="!isLoading && questions.length">{{ questions.length }} 条已加载结果，打开卡片查看完整思路与来源。</p>
              <p v-else>结果仅展示当前可见的公开知识卡。</p>
            </div>
            <span v-if="hasActiveFilters" class="results-mode">筛选视图</span>
            <span v-else class="results-mode">最新整理</span>
          </div>

          <LoadingSkeleton v-if="isLoading" />
          <section v-else-if="requiresLoginForPersonalFilters" class="state-panel">
            <LibraryBig class="state-icon" aria-hidden="true" />
            <h3>登录后查看个人知识库</h3>
            <p>当前筛选包含你的学习进度、错因、笔记或回答卡片。登录后才能读取这些个人学习数据。</p>
            <div class="state-actions">
              <RouterLink :to="loginRedirectTo" class="primary-action">去登录</RouterLink>
              <button type="button" class="secondary-action" @click="clearPersonalFilters">
                清除个人筛选
              </button>
            </div>
          </section>
          <section v-else-if="listError" class="state-panel state-panel--error">
            <h3>知识库加载失败</h3>
            <p>{{ listError }}</p>
            <button type="button" class="primary-action" @click="fetchQuestions(false)">重试</button>
          </section>
          <section v-else-if="questions.length === 0" class="state-panel question-empty-state">
            <LibraryBig class="state-icon" aria-hidden="true" />
            <h3>{{ hasActiveFilters ? '没有匹配的题目' : '当前还没有可见题目' }}</h3>
            <p>
              {{ hasActiveFilters
                ? '当前筛选条件没有命中题目，可以清空筛选或换一个来源方向、场景关键词。'
                : '知识卡来自公开内容中的问题与结构化整理；当前为空时，可以先发布经验、问题或资源，也可以去发现页浏览社区内容。' }}
            </p>
            <div class="state-actions">
              <button v-if="hasActiveFilters" type="button" class="primary-action" @click="resetFilters">清空筛选</button>
              <RouterLink v-else to="/editor" class="primary-action">发布内容</RouterLink>
              <RouterLink to="/explore" class="secondary-action">去发现</RouterLink>
              <RouterLink to="/me" class="secondary-action">查看个人主页</RouterLink>
            </div>
          </section>
          <section v-else class="question-list">
            <QuestionCard v-for="question in questions" :key="question.id" :question="question" />
          </section>

          <div v-if="hasMore" class="load-more">
            <p v-if="loadMoreError">{{ loadMoreError }}</p>
            <button class="secondary-action" :disabled="isLoadingMore" @click="loadMore">
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </section>

        <aside class="questions-guide" aria-label="知识库说明">
          <section>
            <h2>如何阅读知识卡</h2>
            <dl>
              <div>
                <dt>来源频次</dt>
                <dd>同一问题在多篇公开内容中出现时，会合并为同题组信号。</dd>
              </div>
              <div>
                <dt>质量分</dt>
                <dd>用于提示结构完整度，不代表标准答案或专业认证。</dd>
              </div>
              <div>
                <dt>参考内容</dt>
                <dd>阅读时应结合来源片段、适用边界与公开讨论继续判断。</dd>
              </div>
            </dl>
          </section>
          <section>
            <h2>继续探索</h2>
            <RouterLink to="/explore">浏览频道与话题</RouterLink>
            <RouterLink to="/search">搜索社区内容</RouterLink>
            <RouterLink to="/editor">发布经验或问题</RouterLink>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { LibraryBig, PenLine, RotateCcw, Search, SlidersHorizontal } from 'lucide-vue-next'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi, type Question } from '@/api/question'
import { getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { filterPublicContent } from '@/utils/textQuality'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const enableLegacyTrainingTools = false

const filters = reactive({
  keyword: '',
  company: '',
  position: '',
  difficulty: '',
  mistakeReason: '',
  progressStatus: '',
  hasNote: false,
  hasAnswerDraft: false,
  hasStarStory: false,
  sort: 'latest',
})
const questions = ref<Question[]>([])
const page = ref(1)
const hasMore = ref(false)
const isLoading = ref(false)
const isLoadingMore = ref(false)
const listError = ref('')
const loadMoreError = ref('')
const showMobileFilters = ref(false)
const listSource = ref('')
let listRequestId = 0

const hasPersonalFilter = computed(() => Boolean(
  filters.progressStatus || filters.mistakeReason || filters.hasNote || filters.hasAnswerDraft || filters.hasStarStory,
))
const requiresLoginForPersonalFilters = computed(() => hasPersonalFilter.value && !authStore.isLoggedIn)
const loginRedirectTo = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))
const hasActiveFilters = computed(() => Boolean(
  filters.keyword
    || filters.company
    || filters.position
    || filters.difficulty
    || filters.mistakeReason
    || filters.progressStatus
    || filters.hasNote
    || filters.hasAnswerDraft
    || filters.hasStarStory
    || (filters.sort && filters.sort !== 'latest'),
))
const demoSeedNotice = computed(() => listSource.value === 'local_demo_seed'
  ? '当前展示本地 demo 知识库：包含技术经验帖、面试复盘和结构化知识卡样例；连接真实服务后会自动切换到你的数据。'
  : ''
)

const syncFromRoute = () => {
  filters.keyword = String(route.query.keyword ?? route.query.q ?? '')
  filters.company = String(route.query.company ?? '')
  filters.position = String(route.query.position ?? '')
  filters.difficulty = String(route.query.difficulty ?? '')
  filters.mistakeReason = String(route.query.mistakeReason ?? '')
  filters.progressStatus = String(route.query.progressStatus ?? '')
  filters.hasNote = route.query.hasNote === 'true'
  filters.hasAnswerDraft = route.query.hasAnswerDraft === 'true'
  filters.hasStarStory = route.query.hasStarStory === 'true'
  filters.sort = String(route.query.sort ?? 'latest')
  page.value = Number(route.query.page ?? 1) || 1
}

const fetchQuestions = async (append = false, targetPage = page.value) => {
  if (append && (isLoading.value || isLoadingMore.value || !hasMore.value)) return
  if (!append && requiresLoginForPersonalFilters.value) {
    listRequestId += 1
    questions.value = []
    hasMore.value = false
    listError.value = ''
    loadMoreError.value = ''
    isLoading.value = false
    isLoadingMore.value = false
    return
  }
  const requestId = ++listRequestId
  if (append) {
    isLoadingMore.value = true
  } else {
    isLoading.value = true
  }
  if (append) {
    loadMoreError.value = ''
  } else {
    listError.value = ''
    loadMoreError.value = ''
  }
  try {
    const res = await questionApi.list({
      keyword: filters.keyword || undefined,
      company: filters.company || undefined,
      position: filters.position || undefined,
      difficulty: filters.difficulty || undefined,
      mistakeReason: filters.mistakeReason || undefined,
      progressStatus: filters.progressStatus || undefined,
      hasNote: filters.hasNote || undefined,
      hasAnswerDraft: filters.hasAnswerDraft || undefined,
      hasStarStory: filters.hasStarStory || undefined,
      sort: filters.sort,
      page: targetPage,
      pageSize: 20,
    })
    if (requestId !== listRequestId) return
    const items = filterPublicContent(res.data?.items || [])
    questions.value = append ? [...questions.value, ...items] : items
    hasMore.value = Boolean(res.data?.hasMore)
    if (!append) listSource.value = ''
    page.value = targetPage
  } catch (error: any) {
    if (requestId !== listRequestId) return
    const message = getErrorMessage(error, '知识库暂时无法加载，请稍后重试。')
    if (append) {
      loadMoreError.value = message
    } else {
      listError.value = message
      questions.value = []
      hasMore.value = false
      listSource.value = ''
    }
  } finally {
    if (requestId === listRequestId) {
      isLoading.value = false
      isLoadingMore.value = false
    }
  }
}

const applyFilters = async () => {
  page.value = 1
  await router.replace({
    path: '/questions',
    query: {
      ...(filters.keyword ? { keyword: filters.keyword } : {}),
      ...(filters.company ? { company: filters.company } : {}),
      ...(filters.position ? { position: filters.position } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(filters.mistakeReason ? { mistakeReason: filters.mistakeReason } : {}),
      ...(filters.progressStatus ? { progressStatus: filters.progressStatus } : {}),
      ...(filters.hasNote ? { hasNote: 'true' } : {}),
      ...(filters.hasAnswerDraft ? { hasAnswerDraft: 'true' } : {}),
      ...(filters.hasStarStory ? { hasStarStory: 'true' } : {}),
      ...(filters.sort && filters.sort !== 'latest' ? { sort: filters.sort } : {}),
    },
  })
}

const resetFilters = async () => {
  filters.keyword = ''
  filters.company = ''
  filters.position = ''
  filters.difficulty = ''
  filters.mistakeReason = ''
  filters.progressStatus = ''
  filters.hasNote = false
  filters.hasAnswerDraft = false
  filters.hasStarStory = false
  filters.sort = 'latest'
  page.value = 1
  await router.replace('/questions')
}

const clearPersonalFilters = async () => {
  filters.mistakeReason = ''
  filters.progressStatus = ''
  filters.hasNote = false
  filters.hasAnswerDraft = false
  filters.hasStarStory = false
  page.value = 1
  await applyFilters()
}

const loadMore = async () => {
  if (isLoading.value || isLoadingMore.value || !hasMore.value) return
  const nextPage = page.value + 1
  await fetchQuestions(true, nextPage)
}

const applyQuickFilter = async (patch: Partial<typeof filters>) => {
  Object.assign(filters, patch)
  await applyFilters()
}

const quickFilters: Array<{ key: string; label: string; active: () => boolean; apply: () => void | Promise<void> }> = [
  {
    key: 'review',
    label: '只看待复习',
    active: () => filters.progressStatus === 'review',
    apply: () => applyQuickFilter({ progressStatus: 'review' }),
  },
  {
    key: 'mistakes',
    label: '只看我的错因',
    active: () => Boolean(filters.mistakeReason),
    apply: () => applyQuickFilter({ mistakeReason: filters.mistakeReason || 'any' }),
  },
  {
    key: 'answer-cards',
    label: '回答卡',
    active: () => filters.hasAnswerDraft,
    apply: () => applyQuickFilter({ hasAnswerDraft: true }),
  },
  {
    key: 'notes',
    label: '笔记',
    active: () => filters.hasNote,
    apply: () => applyQuickFilter({ hasNote: true }),
  },
  {
    key: 'star-stories',
    label: 'STAR',
    active: () => filters.hasStarStory,
    apply: () => applyQuickFilter({ hasStarStory: true }),
  },
]

watch(() => route.query, () => {
  syncFromRoute()
  fetchQuestions()
})

onMounted(() => {
  syncFromRoute()
  fetchQuestions()
})
</script>

<style scoped>
.questions-page {
  padding-top: 2rem;
  padding-bottom: 4rem;
}

.questions-header {
  display: flex;
  gap: 2rem;
  align-items: end;
  justify-content: space-between;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.questions-header > div:first-child {
  min-width: 0;
}

.page-context {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.questions-header h1 {
  margin-top: 0.35rem;
  color: var(--text-strong);
  font-size: 2rem;
  font-weight: 760;
  line-height: 1.2;
}

.questions-header p {
  max-width: 46rem;
  margin-top: 0.7rem;
  color: var(--text-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.header-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 0.6rem;
}

.question-discovery-panel {
  margin-top: 1.5rem;
  padding: 1.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
}

.filter-heading,
.results-heading {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.filter-heading h2,
.results-heading h2,
.questions-guide h2 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 720;
}

.filter-heading p,
.results-heading p {
  max-width: 48rem;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.active-filter-status,
.results-mode {
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  padding: 0.3rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.active-filter-status {
  background: var(--primary-50);
  color: var(--primary-700);
}

.results-mode {
  background: var(--surface-3);
  color: var(--text-muted);
}

.question-filter-form {
  display: grid;
  gap: 0.9rem;
  margin-top: 1rem;
}

.question-filter-primary {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.65rem;
}

.search-field {
  position: relative;
  min-width: 0;
}

.search-field > svg {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 0.9rem;
  color: var(--text-muted);
  pointer-events: none;
  transform: translateY(-50%);
}

.question-filter-advanced {
  display: none;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.question-filter-advanced-open {
  display: grid;
}

.question-filter-actions {
  display: flex;
  gap: 0.6rem;
}

.filter-field {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.filter-field > span {
  color: var(--text-muted);
  font-size: 0.72rem;
  font-weight: 650;
}

.filter-input {
  width: 100%;
  min-height: 2.75rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-control);
  background: var(--surface-2);
  padding: 0.68rem 0.8rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input--search {
  padding-left: 2.4rem;
}

.filter-input::placeholder {
  color: #667085;
}

.filter-input:focus {
  border-color: var(--primary-500);
  background: var(--surface-1);
  box-shadow: 0 0 0 3px rgba(47, 111, 235, 0.14);
}

.mobile-filter-toggle {
  display: none;
}

.quick-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.9rem;
}

.quick-filter {
  min-height: 2.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface-1);
  padding: 0.4rem 0.7rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.quick-filter-active {
  border-color: var(--primary-500);
  background: var(--primary-50);
  color: var(--primary-700);
}

.demo-notice {
  margin-top: 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid #b9ddf4;
  border-radius: var(--radius-surface);
  background: #f0f9ff;
  color: #075985;
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.55;
}

.questions-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 17rem;
  gap: 1.25rem;
  align-items: start;
  margin-top: 1.5rem;
}

.questions-results {
  min-width: 0;
}

.question-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.question-list :deep(article) {
  border-radius: var(--radius-surface);
  box-shadow: none;
}

.question-list :deep(article:hover) {
  transform: none;
  box-shadow: none;
}

.state-panel {
  display: grid;
  gap: 0.7rem;
  justify-items: center;
  min-height: 20rem;
  margin-top: 1rem;
  padding: 3rem 1.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
  text-align: center;
}

.state-panel--error {
  min-height: 15rem;
}

.state-icon {
  width: 2rem;
  height: 2rem;
  color: var(--primary-600);
}

.state-panel h3 {
  color: var(--text-strong);
  font-size: 1rem;
  font-weight: 720;
}

.state-panel p {
  max-width: 34rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.65;
}

.state-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
  margin-top: 0.35rem;
}

.question-empty-state {
  min-height: 20rem;
}

.load-more {
  display: grid;
  gap: 0.6rem;
  justify-items: center;
  margin-top: 1.25rem;
}

.load-more p {
  color: #be123c;
  font-size: 0.8rem;
  font-weight: 650;
}

.questions-guide {
  display: grid;
  gap: 1rem;
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
}

.questions-guide section {
  padding: 1rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface-1);
}

.questions-guide dl {
  display: grid;
  gap: 0.85rem;
  margin-top: 0.85rem;
}

.questions-guide dl > div {
  display: grid;
  gap: 0.2rem;
}

.questions-guide dt {
  color: var(--text-primary);
  font-size: 0.78rem;
  font-weight: 700;
}

.questions-guide dd {
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.55;
}

.questions-guide a {
  display: block;
  margin-top: 0.65rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 650;
}

.questions-guide a:last-child {
  border-bottom: 0;
}

.questions-guide a:hover {
  color: var(--primary-700);
}

@media (min-width: 761px) {
  .question-filter-advanced {
    display: grid;
  }
}

@media (max-width: 900px) {
  .questions-header {
    align-items: flex-start;
  }

  .header-actions {
    flex-direction: column;
  }

  .questions-layout {
    grid-template-columns: 1fr;
  }

  .questions-guide {
    position: static;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .questions-page {
    padding-top: 1.25rem;
  }

  .questions-header {
    display: grid;
    gap: 1.1rem;
  }

  .questions-header h1 {
    font-size: 1.65rem;
  }

  .header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .question-filter-primary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .mobile-filter-toggle {
    display: inline-flex;
    padding-inline: 0.8rem;
  }

  .question-filter-advanced {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .questions-guide {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 440px) {
  .question-discovery-panel {
    padding: 1rem;
  }

  .filter-heading,
  .results-heading {
    display: grid;
  }

  .active-filter-status,
  .results-mode {
    justify-self: start;
  }

  .header-actions {
    grid-template-columns: 1fr;
  }

  .question-filter-primary {
    grid-template-columns: 1fr;
  }

  .mobile-filter-toggle {
    width: 100%;
  }

  .question-filter-advanced {
    grid-template-columns: 1fr;
  }

  .question-filter-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .state-actions {
    display: grid;
    width: 100%;
  }
}

:global(html.dark) .filter-input {
  background: rgba(2, 6, 23, 0.55);
}

:global(html.dark) .active-filter-status,
:global(html.dark) .quick-filter-active {
  background: rgba(21, 94, 239, 0.16);
  color: #bfdbfe;
}

:global(html.dark) .demo-notice {
  border-color: #075985;
  background: rgba(7, 89, 133, 0.24);
  color: #bae6fd;
}

:global(html.dark) .load-more p {
  color: #fda4af;
}
</style>
