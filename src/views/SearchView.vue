<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div class="sticky top-0 z-30 border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div class="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row">
        <div class="relative flex-1">
          <input
            v-model="filters.q"
            type="search"
            list="search-suggestions"
            placeholder="搜索面经、技术博客、公司或岗位..."
            class="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @input="loadSuggestions"
            @keyup.enter="runSearch"
          />
          <datalist id="search-suggestions">
            <option v-for="item in suggestions" :key="item" :value="item" />
          </datalist>
        </div>
        <button
          type="button"
          @click="runSearch"
          :disabled="isLoading"
          class="rounded-lg bg-primary-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          搜索
        </button>
      </div>
      <div class="mx-auto mt-3 flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex gap-2">
          <button type="button" :class="['mode-button', searchMode === 'posts' ? 'mode-button-active' : '']" @click="setMode('posts')">
            内容
          </button>
          <button type="button" :class="['mode-button', searchMode === 'users' ? 'mode-button-active' : '']" @click="setMode('users')">
            用户
          </button>
        </div>
        <div v-if="searchMode === 'posts'" class="flex flex-wrap gap-2">
          <button
            v-for="option in sortOptions"
            :key="option.value"
            type="button"
            :class="['mode-button', filters.sort === option.value ? 'mode-button-active' : '']"
            @click="setSort(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="mx-auto grid max-w-6xl grid-cols-1 gap-6 p-6 lg:grid-cols-4">
      <aside class="lg:col-span-1">
        <div class="sticky top-24 space-y-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <label class="block">
            <span class="filter-label">公司</span>
            <input v-model="filters.company" class="filter-input" placeholder="输入公司名" @keyup.enter="runSearch" />
          </label>

          <label class="block">
            <span class="filter-label">岗位</span>
            <input v-model="filters.position" class="filter-input" placeholder="例如 Backend、Java 后端" @keyup.enter="runSearch" />
          </label>

          <label class="block">
            <span class="filter-label">内容类型</span>
            <select v-model.number="filters.type" class="filter-input">
              <option :value="undefined">全部类型</option>
              <option :value="1">面经</option>
              <option :value="2">技术博客</option>
              <option :value="3">题解</option>
              <option :value="4">求职问答</option>
            </select>
          </label>

          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="secondary-button" @click="resetFilters">清空</button>
            <button type="button" class="secondary-button" @click="runSearch">应用筛选</button>
          </div>

          <div>
            <h3 class="mb-3 text-sm font-medium text-slate-900 dark:text-slate-100">热门搜索</h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="word in hotWords"
                :key="word"
                type="button"
                @click="useHotWord(word)"
                class="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 transition-colors hover:text-primary-600 dark:bg-slate-800 dark:text-slate-300"
              >
                {{ word }}
              </button>
            </div>
          </div>

          <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div class="flex items-center justify-between gap-3">
              <div>
                <h3 class="text-sm font-medium text-slate-900 dark:text-slate-100">搜索服务</h3>
                <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ searchStatusText }}
                </p>
              </div>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  searchStatus?.available ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                ]"
              >
                {{ searchStatus?.available ? 'ES 在线' : 'Fallback' }}
              </span>
            </div>
            <button
              v-if="canRebuildIndex"
              type="button"
              class="mt-3 w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-700 transition-colors hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
              :disabled="isRebuilding"
              @click="rebuildIndex"
            >
              {{ isRebuilding ? '重建中...' : '重建搜索索引' }}
            </button>
          </div>
        </div>
      </aside>

      <main class="lg:col-span-3">
        <div v-if="!isLoading && resultCount > 0" class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span>{{ searchMode === 'posts' ? `找到 ${resultCount} 条内容` : `找到 ${resultCount} 位用户` }}</span>
          <span v-if="searchMode === 'posts'">排序：{{ activeSortLabel }}</span>
        </div>

        <div v-if="isLoading" class="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          正在搜索...
        </div>

        <div v-else-if="resultCount === 0" class="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <div class="mx-auto max-w-2xl">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              0
            </div>
            <h2 class="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">{{ emptyTitle }}</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{{ emptyText }}</p>

            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" class="primary-action" @click="resetFilters">清空筛选</button>
              <button v-if="searchMode === 'posts'" type="button" class="empty-action" @click="searchHotContent">看热门内容</button>
              <router-link to="/explore" class="empty-action">去发现页</router-link>
              <router-link to="/" class="empty-action">回到信息流</router-link>
            </div>

            <div v-if="searchMode === 'posts' && hotWords.length" class="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
              <h3 class="text-sm font-semibold text-slate-800 dark:text-slate-100">换个关键词试试</h3>
              <div class="mt-3 flex flex-wrap justify-center gap-2">
                <button
                  v-for="word in hotWords.slice(0, 8)"
                  :key="word"
                  type="button"
                  class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-primary-950"
                  @click="useHotWord(word)"
                >
                  {{ word }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="searchMode === 'users'" class="space-y-4">
          <router-link
            v-for="item in userResults"
            :key="item.uid"
            :to="`/u/${item.uid}`"
            class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <div class="flex min-w-0 items-center gap-4">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 font-semibold text-white">
                {{ item.nickname.charAt(0) || '?' }}
              </div>
              <div class="min-w-0">
                <h3 class="truncate font-semibold text-slate-950 dark:text-slate-50">{{ item.nickname }}</h3>
                <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ item.signature || '公开用户资料' }}</p>
              </div>
            </div>
            <span class="text-sm font-medium text-primary-600">查看主页</span>
          </router-link>
        </div>

        <div v-else class="space-y-4">
          <article
            v-for="post in searchResults"
            :key="post.postId"
            class="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div class="flex items-start gap-4">
              <div class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-600 font-semibold text-white">
                {{ post.author.nickname.charAt(0) || '?' }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname }}</span>
                  <span v-if="post.extension?.company" class="rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    {{ post.extension.company }}
                  </span>
                  <span v-if="post.extension?.position" class="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {{ post.extension.position }}
                  </span>
                </div>
                <h3 class="mb-2 line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                  {{ stripHighlight(post.title) }}
                </h3>
                <p class="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                  {{ stripHighlight(post.summary || post.content.substring(0, 100)) }}
                </p>
                <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <div class="flex gap-4">
                    <span>浏览 {{ post.counter.view }}</span>
                    <span>点赞 {{ post.counter.like }}</span>
                    <span>评论 {{ post.counter.comment }}</span>
                  </div>
                  <router-link :to="`/post/${post.postId}`" class="font-medium text-primary-600 hover:text-primary-700">
                    查看
                  </router-link>
                </div>
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchApi, type SearchStatus } from '@/api/search'
import { userApi } from '@/api/user'
import type { Post, User } from '@/api/types'

const route = useRoute()
const router = useRouter()

const filters = reactive<{
  q: string
  company: string
  position: string
  type?: number
  sort: 'relevance' | 'latest' | 'hot'
}>({
  q: '',
  company: '',
  position: '',
  type: undefined,
  sort: 'relevance',
})

const hotWords = ref<string[]>([])
const suggestions = ref<string[]>([])
const searchResults = ref<Post[]>([])
const userResults = ref<User[]>([])
const searchMode = ref<'posts' | 'users'>('posts')
const searchStatus = ref<SearchStatus | null>(null)
const isLoading = ref(false)
const isRebuilding = ref(false)
const emptyText = ref('输入关键词或筛选条件开始搜索')
const sortOptions: Array<{ value: 'relevance' | 'latest' | 'hot'; label: string }> = [
  { value: 'relevance', label: '相关度' },
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '热门' },
]
const canRebuildIndex = computed(() => Boolean(localStorage.getItem('token')))
const resultCount = computed(() => searchMode.value === 'users' ? userResults.value.length : searchResults.value.length)
const activeSortLabel = computed(() => sortOptions.find((item) => item.value === filters.sort)?.label ?? '相关度')
const hasActivePostFilters = computed(() => Boolean(filters.q.trim() || filters.company.trim() || filters.position.trim() || filters.type))
const emptyTitle = computed(() => {
  if (searchMode.value === 'users') {
    return filters.q.trim() ? '没有找到这个用户' : '先输入用户昵称'
  }
  return hasActivePostFilters.value ? '没有匹配的内容' : '开始探索内容'
})
const searchStatusText = computed(() => {
  if (!searchStatus.value) return '正在检测搜索状态'
  if (!searchStatus.value.enabled) return 'ES 未启用，当前使用数据库搜索'
  if (!searchStatus.value.available) return 'ES 不可用，当前使用数据库降级搜索'
  if (!searchStatus.value.indexExists) return `索引 ${searchStatus.value.indexName} 尚未创建`
  return `索引 ${searchStatus.value.indexName} 已就绪`
})

const stripHighlight = (value: string) => value.replace(/<\/?em>/g, '')

const syncFromRoute = () => {
  filters.q = typeof route.query.q === 'string' ? route.query.q : ''
  filters.company = typeof route.query.company === 'string' ? route.query.company : ''
  filters.position = typeof route.query.position === 'string' ? route.query.position : ''
  const type = Number(route.query.type)
  filters.type = Number.isFinite(type) && type > 0 ? type : undefined
  filters.sort = route.query.sort === 'latest' || route.query.sort === 'hot' ? route.query.sort : 'relevance'
  searchMode.value = route.query.mode === 'users' ? 'users' : 'posts'
}

const pushQuery = () => {
  router.replace({
    path: '/search',
    query: {
      ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
      ...(filters.company.trim() ? { company: filters.company.trim() } : {}),
      ...(filters.position.trim() ? { position: filters.position.trim() } : {}),
      ...(filters.type ? { type: String(filters.type) } : {}),
      ...(searchMode.value === 'posts' ? { sort: filters.sort } : {}),
      ...(searchMode.value === 'users' ? { mode: 'users' } : {}),
    },
  })
}

const runSearch = async () => {
  pushQuery()
  isLoading.value = true
  try {
    if (searchMode.value === 'users') {
      if (!filters.q.trim()) {
        userResults.value = []
        emptyText.value = '可以搜索作者昵称，找到公开资料和他的内容。'
        return
      }
      const res = await userApi.searchUsers(filters.q.trim(), 20)
      userResults.value = res.data || []
      searchResults.value = []
      emptyText.value = userResults.value.length === 0 ? '换一个昵称关键词，或去发现页看看推荐用户。' : ''
      return
    }
    const res = await searchApi.searchPosts({
      q: filters.q || undefined,
      company: filters.company || undefined,
      position: filters.position || undefined,
      type: filters.type,
      sort: filters.sort,
      size: 20,
    })
    searchResults.value = res.data?.items || []
    userResults.value = []
    emptyText.value = searchResults.value.length === 0
      ? '当前关键词或筛选条件太窄，可以清空筛选、换热门关键词，或者去发现页继续浏览。'
      : ''
  } catch (error) {
    console.error('Failed to search posts:', error)
    emptyText.value = '搜索接口暂不可用'
  } finally {
    isLoading.value = false
  }
}

const resetFilters = async () => {
  filters.q = ''
  filters.company = ''
  filters.position = ''
  filters.type = undefined
  filters.sort = 'relevance'
  searchResults.value = []
  userResults.value = []
  suggestions.value = []
  searchMode.value = 'posts'
  emptyText.value = '输入关键词或筛选条件开始搜索'
  await router.replace({ path: '/search' })
}

const searchHotContent = async () => {
  searchMode.value = 'posts'
  filters.q = ''
  filters.company = ''
  filters.position = ''
  filters.type = undefined
  filters.sort = 'hot'
  await runSearch()
}

const useHotWord = async (word: string) => {
  searchMode.value = 'posts'
  filters.q = word
  await runSearch()
}

const loadSuggestions = async () => {
  const q = filters.q.trim()
  if (searchMode.value !== 'posts' || q.length < 2) {
    suggestions.value = []
    return
  }
  try {
    const res = await searchApi.suggest(q)
    suggestions.value = Array.isArray(res.data) ? res.data : []
  } catch {
    suggestions.value = []
  }
}

const setMode = async (mode: 'posts' | 'users') => {
  searchMode.value = mode
  searchResults.value = []
  userResults.value = []
  emptyText.value = mode === 'users' ? '可以搜索作者昵称，找到公开资料和他的内容。' : '输入关键词或筛选条件开始搜索'
  await runSearch()
}

const setSort = async (sort: 'relevance' | 'latest' | 'hot') => {
  filters.sort = sort
  await runSearch()
}

const loadSearchStatus = async () => {
  try {
    const res = await searchApi.status()
    searchStatus.value = res.data
  } catch {
    searchStatus.value = null
  }
}

const rebuildIndex = async () => {
  isRebuilding.value = true
  try {
    await searchApi.rebuildIndex()
    await loadSearchStatus()
  } finally {
    isRebuilding.value = false
  }
}

onMounted(async () => {
  syncFromRoute()
  await loadSearchStatus()
  try {
    const hot = await searchApi.hotSearches()
    hotWords.value = hot.data || []
  } catch {
    hotWords.value = []
  }
  if (filters.q || filters.company || filters.position || filters.type || searchMode.value === 'users') {
    await runSearch()
  }
})
</script>

<style scoped>
.filter-label {
  margin-bottom: 0.5rem;
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(15 23 42);
}

.filter-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
}

.secondary-button {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(51 65 85);
  transition: background-color 0.15s ease;
}

.mode-button {
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.45rem 0.9rem;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  font-weight: 600;
}

.mode-button-active {
  border-color: rgb(79 70 229);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.secondary-button:hover {
  background: rgb(248 250 252);
}

.primary-action,
.empty-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-action {
  background: rgb(79 70 229);
  color: white;
}

.primary-action:hover {
  background: rgb(67 56 202);
}

.empty-action {
  border: 1px solid rgb(226 232 240);
  color: rgb(51 65 85);
}

.empty-action:hover {
  border-color: rgb(199 210 254);
  color: rgb(67 56 202);
}

:global(.dark) .filter-label {
  color: rgb(241 245 249);
}

:global(.dark) .filter-input {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(241 245 249);
}

:global(.dark) .secondary-button {
  border-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

:global(.dark) .mode-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .secondary-button:hover {
  background: rgb(30 41 59);
}

:global(.dark) .empty-action {
  border-color: rgb(51 65 85);
  color: rgb(203 213 225);
}

:global(.dark) .empty-action:hover {
  border-color: rgb(79 70 229);
  color: rgb(165 180 252);
}
</style>
