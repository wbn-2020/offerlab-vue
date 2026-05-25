<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-950 dark:text-slate-50">面试题库</h1>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">从真实面经中沉淀的结构化题目，按公司、岗位和技术标签快速筛选。</p>
          </div>
          <RouterLink to="/search" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
            搜索面经
          </RouterLink>
        </div>

        <form class="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-6" @submit.prevent="applyFilters">
          <input v-model.trim="filters.keyword" class="filter-input lg:col-span-2" placeholder="关键词 / 题目正文" />
          <input v-model.trim="filters.company" class="filter-input" placeholder="公司" />
          <input v-model.trim="filters.position" class="filter-input" placeholder="岗位" />
          <select v-model="filters.difficulty" class="filter-input">
            <option value="">全部难度</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">困难</option>
          </select>
          <select v-model="filters.sort" class="filter-input">
            <option value="latest">最新</option>
            <option value="appear">出现次数</option>
            <option value="hot">热度</option>
            <option value="relevance">相关度</option>
          </select>
          <div class="flex gap-2 md:col-span-2 lg:col-span-6">
            <button type="submit" class="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700">筛选</button>
            <button type="button" class="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="resetFilters">
              清空
            </button>
          </div>
        </form>
      </section>

      <LoadingSkeleton v-if="isLoading" />
      <EmptyState v-else-if="questions.length === 0" title="暂无题目" description="换个关键词或公司试试。" />
      <section v-else class="grid gap-4 lg:grid-cols-2">
        <QuestionCard v-for="question in questions" :key="question.id" :question="question" />
      </section>

      <div v-if="hasMore" class="mt-8 text-center">
        <button class="rounded-lg border border-primary-600 px-5 py-2 text-sm font-semibold text-primary-600 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800" :disabled="isLoadingMore" @click="loadMore">
          {{ isLoadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi, type Question } from '@/api/question'

const route = useRoute()
const router = useRouter()

const filters = reactive({
  keyword: '',
  company: '',
  position: '',
  difficulty: '',
  sort: 'latest',
})
const questions = ref<Question[]>([])
const page = ref(1)
const hasMore = ref(false)
const isLoading = ref(false)
const isLoadingMore = ref(false)

const syncFromRoute = () => {
  filters.keyword = String(route.query.keyword ?? route.query.q ?? '')
  filters.company = String(route.query.company ?? '')
  filters.position = String(route.query.position ?? '')
  filters.difficulty = String(route.query.difficulty ?? '')
  filters.sort = String(route.query.sort ?? 'latest')
  page.value = Number(route.query.page ?? 1) || 1
}

const fetchQuestions = async (append = false) => {
  append ? (isLoadingMore.value = true) : (isLoading.value = true)
  try {
    const res = await questionApi.list({
      keyword: filters.keyword || undefined,
      company: filters.company || undefined,
      position: filters.position || undefined,
      difficulty: filters.difficulty || undefined,
      sort: filters.sort,
      page: page.value,
      pageSize: 20,
    })
    const items = res.data?.items || []
    questions.value = append ? [...questions.value, ...items] : items
    hasMore.value = Boolean(res.data?.hasMore)
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
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
      ...(filters.sort && filters.sort !== 'latest' ? { sort: filters.sort } : {}),
    },
  })
  await fetchQuestions()
}

const resetFilters = async () => {
  filters.keyword = ''
  filters.company = ''
  filters.position = ''
  filters.difficulty = ''
  filters.sort = 'latest'
  page.value = 1
  await router.replace('/questions')
  await fetchQuestions()
}

const loadMore = async () => {
  page.value += 1
  await fetchQuestions(true)
}

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
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.75rem 0.9rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
}

.filter-input:focus {
  border-color: rgb(59 130 246);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 0.16);
}

:global(.dark) .filter-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(241 245 249);
}
</style>
