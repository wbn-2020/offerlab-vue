<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="surface-card mb-6 p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-950 dark:text-slate-50">面试题库</h1>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">从真实面经中沉淀的结构化题目，按公司、岗位和技术标签快速筛选。</p>
          </div>
          <RouterLink to="/search" class="secondary-action">
            搜索面经
          </RouterLink>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
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

        <form class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-6" @submit.prevent="applyFilters">
          <input v-model.trim="filters.keyword" class="filter-input lg:col-span-2" aria-label="题库关键词或题目正文" placeholder="关键词 / 题目正文" />
          <input v-model.trim="filters.company" class="filter-input" aria-label="题库公司筛选" placeholder="公司" />
          <input v-model.trim="filters.position" class="filter-input" aria-label="题库岗位筛选" placeholder="岗位" />
          <select v-model="filters.difficulty" class="filter-input" aria-label="题库难度筛选">
            <option value="">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
          <select v-model="filters.mistakeReason" class="filter-input" aria-label="题库错因筛选">
            <option value="">全部错因</option>
            <option value="any">任意错因</option>
            <option value="concept">概念不熟</option>
            <option value="project">项目表达弱</option>
            <option value="memory">需要记忆</option>
            <option value="expression">表达不清</option>
            <option value="careless">粗心失误</option>
            <option value="other">其他错因</option>
          </select>
          <select v-model="filters.progressStatus" class="filter-input" aria-label="题库学习状态筛选">
            <option value="">全部状态</option>
            <option value="todo">待学习</option>
            <option value="learning">学习中</option>
            <option value="mastered">已掌握</option>
            <option value="review">待复习</option>
          </select>
          <select v-model="filters.sort" class="filter-input" aria-label="题库排序方式">
            <option value="latest">最新</option>
            <option value="appear">出现次数</option>
            <option value="hot">热度</option>
            <option value="relevance">相关度</option>
          </select>
          <div class="flex gap-2 md:col-span-2 lg:col-span-6">
            <button type="submit" class="primary-action px-5 py-2.5">筛选</button>
            <button type="button" class="secondary-action px-5 py-2.5" @click="resetFilters">
              清空
            </button>
          </div>
        </form>
      </section>

      <LoadingSkeleton v-if="isLoading" />
      <section v-else-if="requiresLoginForPersonalFilters" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">登录后查看个人题库</h3>
        <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          当前筛选包含你的学习进度、错因、笔记或回答卡片。登录后才能读取这些个人备考数据。
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <RouterLink :to="loginRedirectTo" class="primary-action px-5 py-2.5">去登录</RouterLink>
          <button type="button" class="secondary-action px-5 py-2.5" @click="clearPersonalFilters">
            清除个人筛选
          </button>
        </div>
      </section>
      <section v-else-if="listError" class="surface-card flex flex-col items-center justify-center px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">题库加载失败</h3>
        <p class="mb-6 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">{{ listError }}</p>
        <button type="button" class="primary-action px-5 py-2.5" @click="fetchQuestions(false)">重试</button>
      </section>
      <section v-else-if="questions.length === 0" class="surface-card question-empty-state px-6 py-12 text-center">
        <h3 class="mb-2 text-lg font-black text-slate-950 dark:text-slate-100">
          {{ hasActiveFilters ? '没有匹配的题目' : '当前还没有可见题目' }}
        </h3>
        <p class="mx-auto mb-6 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-400">
          {{ hasActiveFilters
            ? '当前筛选条件没有命中题目，可以清空筛选或换一个公司、岗位、技术关键词。'
            : '题库题目来自公开面经和提题任务；本地演示库为空时，可以先发布面经、去发现页浏览内容，或进入准备台添加目标。' }}
        </p>
        <div class="flex flex-wrap justify-center gap-3">
          <button v-if="hasActiveFilters" type="button" class="primary-action px-5 py-2.5" @click="resetFilters">清空筛选</button>
          <RouterLink v-else to="/editor" class="primary-action inline-flex items-center justify-center px-5 py-2.5">发布面经</RouterLink>
          <RouterLink to="/explore" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">去发现</RouterLink>
          <RouterLink to="/me/prep" class="secondary-action inline-flex items-center justify-center px-5 py-2.5">查看准备台</RouterLink>
        </div>
      </section>
      <section v-else class="grid gap-4 lg:grid-cols-2">
        <QuestionCard v-for="question in questions" :key="question.id" :question="question" />
      </section>

      <div v-if="hasMore" class="mt-8 text-center">
        <p v-if="loadMoreError" class="mb-3 text-sm font-semibold text-rose-600 dark:text-rose-400">{{ loadMoreError }}</p>
        <button class="secondary-action px-5 py-2 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isLoadingMore" @click="loadMore">
          {{ isLoadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi, type Question } from '@/api/question'
import { getErrorMessage } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

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
  append ? (isLoadingMore.value = true) : (isLoading.value = true)
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
    const items = res.data?.items || []
    questions.value = append ? [...questions.value, ...items] : items
    hasMore.value = Boolean(res.data?.hasMore)
    page.value = targetPage
  } catch (error: any) {
    if (requestId !== listRequestId) return
    const message = getErrorMessage(error, '题库暂时无法加载，请稍后重试。')
    if (append) {
      loadMoreError.value = message
    } else {
      listError.value = message
      questions.value = []
      hasMore.value = false
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

const quickFilters = [
  {
    key: 'review',
    label: '只看待复习',
    active: () => filters.progressStatus === 'review',
    apply: () => applyQuickFilter({ progressStatus: 'review', mistakeReason: '', hasNote: false, hasAnswerDraft: false, hasStarStory: false, sort: 'latest' }),
  },
  {
    key: 'learning',
    label: '学习中',
    active: () => filters.progressStatus === 'learning',
    apply: () => applyQuickFilter({ progressStatus: 'learning', mistakeReason: '', hasNote: false, hasAnswerDraft: false, hasStarStory: false, sort: 'latest' }),
  },
  {
    key: 'mistakes',
    label: '只看我的错因',
    active: () => Boolean(filters.mistakeReason),
    apply: () => applyQuickFilter({ progressStatus: '', mistakeReason: filters.mistakeReason || 'any', hasNote: false, hasAnswerDraft: false, hasStarStory: false, sort: 'latest' }),
  },
  {
    key: 'notes',
    label: '只看我的笔记',
    active: () => filters.hasNote,
    apply: () => applyQuickFilter({ progressStatus: '', mistakeReason: '', hasNote: true, hasAnswerDraft: false, hasStarStory: false, sort: 'latest' }),
  },
  {
    key: 'answer-cards',
    label: '只看回答卡片',
    active: () => filters.hasAnswerDraft,
    apply: () => applyQuickFilter({ progressStatus: '', mistakeReason: '', hasNote: false, hasAnswerDraft: true, hasStarStory: false, sort: 'latest' }),
  },
  {
    key: 'star-stories',
    label: '只看 STAR 素材',
    active: () => filters.hasStarStory,
    apply: () => applyQuickFilter({ progressStatus: '', mistakeReason: '', hasNote: false, hasAnswerDraft: false, hasStarStory: true, sort: 'latest' }),
  },
  {
    key: 'clear-personal',
    label: '清除个人筛选',
    active: () => Boolean(filters.progressStatus || filters.mistakeReason || filters.hasNote || filters.hasAnswerDraft || filters.hasStarStory),
    apply: () => applyQuickFilter({ progressStatus: '', mistakeReason: '', hasNote: false, hasAnswerDraft: false, hasStarStory: false, sort: 'latest' }),
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
.filter-input {
  border-radius: 0.75rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 0.75rem 0.9rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input:focus {
  border-color: rgb(129 140 248);
  background: white;
  box-shadow: 0 0 0 3px rgb(224 231 255 / 0.8);
}

.quick-filter {
  min-height: 2rem;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: rgb(71 85 105);
}

@media (max-width: 640px) {
  .quick-filter {
    min-height: 44px;
  }
}

.quick-filter-active {
  border-color: rgb(129 140 248);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.question-empty-state {
  min-height: 18rem;
}

:global(.dark) .filter-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(241 245 249);
}

:global(.dark) .quick-filter {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .quick-filter-active {
  border-color: rgb(67 56 202);
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}
</style>
