<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="search-shell">
        <div class="flex flex-col gap-3 lg:flex-row">
          <div class="relative flex-1">
            <Search class="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              v-model.trim="filters.q"
              type="search"
              list="search-suggestions"
              class="search-input pl-10"
              placeholder="搜索面经、技术博客、公司、岗位或作者"
              @input="loadSuggestions"
              @keyup.enter="runSearch(false)"
            />
            <datalist id="search-suggestions">
              <option v-for="item in suggestions" :key="item" :value="item" />
            </datalist>
          </div>

          <button type="button" class="primary-button" :disabled="isLoading" @click="runSearch(false)">
            <Search class="h-4 w-4" />
            搜索
          </button>
        </div>

        <div class="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="segmented">
            <button type="button" :class="['segment-button', searchMode === 'posts' ? 'segment-active' : '']" @click="setMode('posts')">
              <FileText class="h-4 w-4" />
              内容
            </button>
            <button type="button" :class="['segment-button', searchMode === 'users' ? 'segment-active' : '']" @click="setMode('users')">
              <Users class="h-4 w-4" />
              用户
            </button>
          </div>

          <div v-if="searchMode === 'posts'" class="flex flex-wrap gap-2">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              :class="['chip-button', filters.sort === option.value ? 'chip-active' : '']"
              @click="setSort(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </section>

      <div class="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside class="space-y-4">
          <section class="side-panel">
            <h2 class="side-title">筛选</h2>
            <div class="space-y-3">
              <label class="field-label">
                公司
                <input v-model.trim="filters.company" class="field-input" placeholder="例如 ByteDance" @keyup.enter="runSearch(false)" />
              </label>
              <label class="field-label">
                岗位
                <input v-model.trim="filters.position" class="field-input" placeholder="例如 Java 后端" @keyup.enter="runSearch(false)" />
              </label>
              <label class="field-label">
                内容类型
                <select v-model.number="filters.type" class="field-input">
                  <option :value="undefined">全部类型</option>
                  <option :value="1">面经</option>
                  <option :value="2">技术博客</option>
                  <option :value="3">题解</option>
                  <option :value="4">求职问答</option>
                </select>
              </label>
            </div>
            <div class="mt-4 grid grid-cols-2 gap-2">
              <button type="button" class="secondary-button" @click="resetFilters">清空</button>
              <button type="button" class="secondary-button" @click="runSearch(false)">应用</button>
            </div>
          </section>

          <section class="side-panel">
            <h2 class="side-title">热门搜索</h2>
            <div class="flex flex-wrap gap-2">
              <button v-for="word in hotWords" :key="word" type="button" class="tag-button" @click="useHotWord(word)">
                {{ word }}
              </button>
            </div>
          </section>

          <section class="side-panel">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="side-title">搜索服务</h2>
                <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ searchStatusText }}</p>
              </div>
              <span :class="['status-pill', searchStatus?.available ? 'status-ok' : 'status-warn']">
                {{ searchStatus?.available ? 'ES' : '降级' }}
              </span>
            </div>
            <button v-if="canRebuildIndex" type="button" class="secondary-button mt-3 w-full" :disabled="isRebuilding" @click="rebuildIndex">
              {{ isRebuilding ? '已提交重建...' : '重建帖子索引' }}
            </button>
          </section>
        </aside>

        <section class="min-w-0 space-y-4">
          <div v-if="errorMessage" class="notice-error">
            <span>{{ errorMessage }}</span>
            <button type="button" class="text-sm font-bold" @click="runSearch(false)">重试</button>
          </div>

          <div v-if="!isLoading && resultCount > 0" class="result-summary">
            <span>{{ searchMode === 'posts' ? `找到 ${resultCount} 条内容` : `找到 ${resultCount} 位用户` }}</span>
            <span v-if="searchMode === 'posts'">排序: {{ activeSortLabel }}</span>
          </div>

          <div v-if="isLoading && resultCount === 0" class="loading-panel">正在搜索...</div>

          <template v-else-if="searchMode === 'users' && userResults.length">
            <RouterLink v-for="item in userResults" :key="item.uid" :to="`/u/${item.uid}`" class="user-row">
              <div class="avatar">
                <img v-if="item.avatar" :src="item.avatar" :alt="item.nickname" class="h-full w-full object-cover" />
                <span v-else>{{ item.nickname.charAt(0) || '?' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-semibold text-slate-950 dark:text-slate-50">{{ item.nickname }}</h3>
                <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ item.signature || '公开用户资料' }}</p>
              </div>
              <span class="view-link">查看主页</span>
            </RouterLink>
          </template>

          <template v-else-if="searchMode === 'posts' && searchResults.length">
            <PostCard v-for="post in searchResults" :key="post.postId" :post="post" @like="handleLike" @favorite="handleFavorite" />
          </template>

          <div v-else-if="!isLoading" class="empty-panel">
            <h2>{{ emptyTitle }}</h2>
            <p>{{ emptyText }}</p>
            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" class="primary-button" @click="resetFilters">清空筛选</button>
              <button v-if="searchMode === 'posts'" type="button" class="secondary-button" @click="searchHotContent">热门内容</button>
              <RouterLink to="/explore" class="secondary-button">去发现页</RouterLink>
            </div>
          </div>

          <div v-if="hasMore && searchMode === 'posts'" class="text-center">
            <button type="button" class="secondary-button" :disabled="isLoading" @click="runSearch(true)">
              {{ isLoading ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { FileText, Search, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import { interactionApi } from '@/api/interaction'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import { searchApi, type SearchStatus } from '@/api/search'
import { userApi } from '@/api/user'
import type { ApiId, Post, User } from '@/api/types'
import { hasAdminPermission } from '@/utils/adminPermissions'

type SortValue = 'relevance' | 'latest' | 'hot'
type SearchMode = 'posts' | 'users'

const route = useRoute()
const router = useRouter()
const filters = reactive<{ q: string; company: string; position: string; type?: number; sort: SortValue }>({
  q: '',
  company: '',
  position: '',
  type: undefined,
  sort: 'relevance',
})

const sortOptions: Array<{ value: SortValue; label: string }> = [
  { value: 'relevance', label: '相关度' },
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '热门' },
]

const searchMode = ref<SearchMode>('posts')
const searchResults = ref<Post[]>([])
const userResults = ref<User[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const hotWords = ref<string[]>([])
const suggestions = ref<string[]>([])
const searchStatus = ref<SearchStatus | null>(null)
const adminPermissions = ref<MyAdminPermissions | null>(null)
const isLoading = ref(false)
const isRebuilding = ref(false)
const errorMessage = ref('')

const canRebuildIndex = computed(() => hasAdminPermission(adminPermissions.value, ['ops', 'admin']))
const resultCount = computed(() => searchMode.value === 'users' ? userResults.value.length : searchResults.value.length)
const activeSortLabel = computed(() => sortOptions.find((item) => item.value === filters.sort)?.label || '相关度')
const hasQuery = computed(() => Boolean(filters.q || filters.company || filters.position || filters.type))
const emptyTitle = computed(() => {
  if (searchMode.value === 'users') return filters.q ? '没有找到这个用户' : '先输入用户昵称'
  return hasQuery.value ? '没有匹配的内容' : '开始探索内容'
})
const emptyText = computed(() => {
  if (searchMode.value === 'users') return '可以搜索作者昵称，找到公开资料和 TA 的内容。'
  return hasQuery.value ? '当前关键词或筛选条件较窄，可以清空筛选或换一个热门关键词。' : '输入关键词，或直接查看热门内容。'
})
const searchStatusText = computed(() => {
  if (!searchStatus.value) return '正在检测搜索状态'
  if (!searchStatus.value.enabled) return 'ES 未启用，当前使用数据库搜索'
  if (!searchStatus.value.available) return 'ES 不可用，当前使用数据库降级搜索'
  if (!searchStatus.value.indexExists) return `索引 ${searchStatus.value.indexName} 尚未创建`
  return `索引 ${searchStatus.value.indexName} 已就绪`
})

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
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.company ? { company: filters.company } : {}),
      ...(filters.position ? { position: filters.position } : {}),
      ...(filters.type ? { type: String(filters.type) } : {}),
      ...(searchMode.value === 'posts' ? { sort: filters.sort } : {}),
      ...(searchMode.value === 'users' ? { mode: 'users' } : {}),
    },
  })
}

const runSearch = async (append = false) => {
  if (isLoading.value || (append && !hasMore.value)) return
  pushQuery()
  isLoading.value = true
  errorMessage.value = ''
  try {
    if (searchMode.value === 'users') {
      cursor.value = undefined
      hasMore.value = false
      searchResults.value = []
      if (!filters.q) {
        userResults.value = []
        return
      }
      const res = await userApi.searchUsers(filters.q, 20)
      userResults.value = res.data || []
      return
    }

    const res = await searchApi.searchPosts({
      q: filters.q || undefined,
      company: filters.company || undefined,
      position: filters.position || undefined,
      type: filters.type,
      sort: filters.sort,
      cursor: append ? cursor.value : undefined,
      size: 20,
    })
    const page = res.data
    searchResults.value = append ? [...searchResults.value, ...(page?.items || [])] : (page?.items || [])
    userResults.value = []
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, '搜索接口暂不可用')
    if (!append) {
      searchResults.value = []
      userResults.value = []
      cursor.value = undefined
      hasMore.value = false
    }
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
  searchMode.value = 'posts'
  suggestions.value = []
  searchResults.value = []
  userResults.value = []
  cursor.value = undefined
  hasMore.value = false
  errorMessage.value = ''
  await router.replace({ path: '/search' })
}

const setMode = async (mode: SearchMode) => {
  searchMode.value = mode
  searchResults.value = []
  userResults.value = []
  cursor.value = undefined
  hasMore.value = false
  await runSearch(false)
}

const setSort = async (sort: SortValue) => {
  filters.sort = sort
  await runSearch(false)
}

const useHotWord = async (word: string) => {
  searchMode.value = 'posts'
  filters.q = word
  await runSearch(false)
}

const searchHotContent = async () => {
  searchMode.value = 'posts'
  filters.q = ''
  filters.company = ''
  filters.position = ''
  filters.type = undefined
  filters.sort = 'hot'
  await runSearch(false)
}

const loadSuggestions = async () => {
  if (searchMode.value !== 'posts' || filters.q.length < 2) {
    suggestions.value = []
    return
  }
  try {
    const res = await searchApi.suggest(filters.q)
    suggestions.value = Array.isArray(res.data) ? res.data : []
  } catch {
    suggestions.value = []
  }
}

const loadSearchStatus = async () => {
  try {
    const res = await searchApi.status()
    searchStatus.value = res.data
  } catch {
    searchStatus.value = null
  }
}

const loadAdminPermissions = async () => {
  try {
    const res = await opsApi.myPermissions()
    adminPermissions.value = res.data || null
  } catch {
    adminPermissions.value = null
  }
}

const rebuildIndex = async () => {
  if (!canRebuildIndex.value) {
    toast.error('当前账号没有权限执行该操作')
    return
  }
  isRebuilding.value = true
  try {
    const res = await searchApi.rebuildIndex()
    toast.success(res.data?.taskId ? `索引重建任务已提交: ${res.data.taskId}` : '索引重建任务已提交')
    await loadSearchStatus()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '索引重建提交失败'))
  } finally {
    isRebuilding.value = false
  }
}

const findPost = (postId: ApiId) => searchResults.value.find((item) => String(item.postId) === String(postId))

const handleLike = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  const liked = Boolean(post.myInteraction?.liked)
  try {
    liked ? await interactionApi.unlike(postId) : await interactionApi.like(postId)
    post.myInteraction = { ...(post.myInteraction ?? { favorited: false }), liked: !liked }
    post.counter.like = Math.max(0, post.counter.like + (liked ? -1 : 1))
  } catch (error: any) {
    toast.error(getErrorMessage(error, '点赞操作失败'))
  }
}

const handleFavorite = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  const favorited = Boolean(post.myInteraction?.favorited)
  try {
    favorited ? await interactionApi.unfavorite(postId) : await interactionApi.favorite(postId)
    post.myInteraction = { ...(post.myInteraction ?? { liked: false }), favorited: !favorited }
    post.counter.favorite = Math.max(0, post.counter.favorite + (favorited ? -1 : 1))
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏操作失败'))
  }
}

onMounted(async () => {
  syncFromRoute()
  await Promise.all([
    loadSearchStatus(),
    loadAdminPermissions(),
    searchApi.hotSearches().then((res) => { hotWords.value = res.data || [] }).catch(() => { hotWords.value = [] }),
  ])
  if (hasQuery.value || searchMode.value === 'users') {
    await runSearch(false)
  }
})
</script>

<style scoped>
.search-shell,
.side-panel,
.result-summary,
.loading-panel,
.empty-panel,
.user-row {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
}

.search-shell,
.side-panel,
.loading-panel,
.empty-panel,
.user-row {
  padding: 1.25rem;
}

.search-input,
.field-input {
  width: 100%;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.65rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
}

.search-input:focus,
.field-input:focus {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.7);
}

.primary-button,
.secondary-button,
.segment-button,
.chip-button,
.tag-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button,
.chip-button,
.tag-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.segmented {
  display: inline-flex;
  width: fit-content;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  padding: 0.2rem;
  background: rgb(248 250 252);
}

.segment-button {
  min-height: 2rem;
  color: rgb(71 85 105);
}

.segment-active,
.chip-active {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.chip-active {
  border-color: rgb(129 140 248);
}

.side-title,
.field-label {
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.field-label {
  display: grid;
  gap: 0.45rem;
}

.result-summary {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: rgb(71 85 105);
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.status-warn {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}

.notice-error {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(254 202 202);
  border-radius: 0.75rem;
  background: rgb(254 242 242);
  padding: 1rem;
  color: rgb(185 28 28);
}

.loading-panel,
.empty-panel {
  text-align: center;
  color: rgb(100 116 139);
}

.empty-panel h2 {
  font-size: 1rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.empty-panel p {
  margin-top: 0.5rem;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.user-row:hover {
  border-color: rgb(147 197 253);
  transform: translateY(-1px);
}

.avatar {
  display: flex;
  height: 3rem;
  width: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(37 99 235);
  font-weight: 800;
  color: white;
}

.view-link {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

:global(.dark) .search-shell,
:global(.dark) .side-panel,
:global(.dark) .result-summary,
:global(.dark) .loading-panel,
:global(.dark) .empty-panel,
:global(.dark) .user-row,
:global(.dark) .secondary-button,
:global(.dark) .chip-button,
:global(.dark) .tag-button,
:global(.dark) .search-input,
:global(.dark) .field-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .segmented {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .side-title,
:global(.dark) .field-label,
:global(.dark) .empty-panel h2 {
  color: rgb(248 250 252);
}
</style>
