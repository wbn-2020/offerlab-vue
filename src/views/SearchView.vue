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
              @input="handleSearchInput"
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
          <button type="button" class="secondary-button" :disabled="!hasQuery" @click="saveCurrentSearch">
            <Bookmark class="h-4 w-4" />
            保存搜索
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
                <input v-model.trim="filters.company" class="field-input" placeholder="例如 ByteDance" @input="scheduleDebouncedSearch" @keyup.enter="runSearch(false)" />
              </label>
              <label class="field-label">
                岗位
                <input v-model.trim="filters.position" class="field-input" placeholder="例如 Java 后端" @input="scheduleDebouncedSearch" @keyup.enter="runSearch(false)" />
              </label>
              <label class="field-label">
                内容类型
                <select v-model.number="filters.type" class="field-input" @change="scheduleDebouncedSearch">
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

          <section v-if="savedSearches.length || recentSearches.length" class="side-panel space-y-4">
            <div v-if="savedSearches.length" class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="side-title">保存的搜索</h2>
                <div class="flex items-center gap-2">
                  <span class="mini-count">{{ savedSearches.length }}/8</span>
                  <button type="button" class="mini-icon-button" title="清空保存搜索" @click="clearSavedSearches">
                    <Eraser class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div v-for="item in savedSearches" :key="item.id" class="saved-search-row">
                <div v-if="editingSavedSearchId === item.id" class="saved-search-edit">
                  <input
                    v-model.trim="editingSavedSearchLabel"
                    class="saved-search-input"
                    maxlength="40"
                    placeholder="搜索名称"
                    @keyup.enter="confirmRenameSavedSearch(item)"
                    @keyup.esc="cancelRenameSavedSearch"
                  />
                  <div class="saved-search-actions">
                    <button type="button" class="mini-icon-button" title="保存名称" @click="confirmRenameSavedSearch(item)">
                      <Check class="h-3.5 w-3.5" />
                    </button>
                    <button type="button" class="mini-icon-button" title="取消重命名" @click="cancelRenameSavedSearch">
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <template v-else>
                  <button type="button" class="saved-search saved-search-main" @click="applySearchSnapshot(item)">
                    <span class="truncate font-bold">{{ item.label }}</span>
                    <span class="saved-search-meta">{{ searchSnapshotMeta(item) }}</span>
                  </button>
                  <div class="saved-search-actions">
                    <button type="button" class="mini-icon-button" title="重命名保存搜索" @click="startRenameSavedSearch(item)">
                      <Pencil class="h-3.5 w-3.5" />
                    </button>
                    <button type="button" class="mini-icon-button" title="删除保存搜索" @click="deleteSavedSearch(item.id)">
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="recentSearches.length" class="space-y-2">
              <div class="flex items-center justify-between gap-2">
                <h2 class="side-title">最近搜索</h2>
                <div class="flex items-center gap-2">
                  <span class="mini-count">{{ recentSearches.length }}/8</span>
                  <button type="button" class="mini-icon-button" title="清空最近搜索" @click="clearRecentSearches">
                    <Eraser class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div v-for="item in recentSearches" :key="item.id" class="saved-search-row">
                <button type="button" class="saved-search saved-search-main" @click="applySearchSnapshot(item)">
                  <span class="truncate font-bold">{{ item.label }}</span>
                  <span class="saved-search-meta">{{ searchSnapshotMeta(item) }}</span>
                </button>
                <div class="saved-search-actions">
                  <button type="button" class="mini-icon-button" title="删除最近搜索" @click="deleteRecentSearch(item.id)">
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section v-if="searchUndoAction" class="undo-panel" role="status" aria-live="polite">
            <span>{{ searchUndoAction.message }}</span>
            <div class="undo-actions">
              <button type="button" @click="restoreSearchUndo">撤销</button>
              <button type="button" @click="dismissSearchUndo">关闭</button>
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

          <div
            v-if="searchMode === 'posts' && searchResultMeta && !isLoading"
            :class="['search-source-notice', searchResultMeta.degraded ? 'source-degraded' : 'source-normal']"
          >
            <strong>{{ searchSourceTitle }}</strong>
            <span>{{ searchSourceDescription }}</span>
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
            <PostCard
              v-for="post in searchResults"
              :key="post.postId"
              :post="post"
              :like-pending="isActionPending('like', post.postId)"
              :favorite-pending="isActionPending('favorite', post.postId)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </template>

          <div v-else-if="!isLoading" class="empty-panel">
            <h2>{{ emptyTitle }}</h2>
            <p>{{ emptyText }}</p>
            <div v-if="searchMode === 'posts' && hasQuery" class="no-result-recommendations">
              <div v-if="relaxActions.length" class="recommend-group">
                <span>放宽筛选</span>
                <button v-for="item in relaxActions" :key="item.key" type="button" class="recommend-chip" @click="item.action">
                  {{ item.label }}
                </button>
              </div>
              <div v-if="noResultWords.length" class="recommend-group">
                <span>换个关键词</span>
                <button v-for="word in noResultWords" :key="word" type="button" class="recommend-chip" @click="useHotWord(word)">
                  {{ word }}
                </button>
              </div>
              <div v-if="filters.company" class="recommend-group">
                <span>继续准备</span>
                <RouterLink :to="`/companies/${encodeURIComponent(filters.company)}/prep`" class="recommend-chip" @click="trackCompanyPrepClick">
                  查看 {{ filters.company }} 准备包
                </RouterLink>
              </div>
            </div>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Bookmark, Check, Eraser, FileText, Pencil, Search, Trash2, Users, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import { searchApi, type SearchStatus } from '@/api/search'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, Post, User } from '@/api/types'
import { safeStorage } from '@/utils/safeStorage'

type SortValue = 'relevance' | 'latest' | 'hot'
type SearchMode = 'posts' | 'users'
type SearchSnapshot = {
  id: string
  label: string
  mode: SearchMode
  q: string
  company: string
  position: string
  type?: number
  sort: SortValue
  updatedAt: number
}

type SearchUndoAction = {
  id: number
  message: string
  restore: () => void
}

type SearchResultMeta = {
  source?: string
  degraded?: boolean
  fallbackReason?: string
  scanLimit?: number
}

const RECENT_SEARCH_KEY = 'recent-searches'
const SAVED_SEARCH_KEY = 'saved-searches'
const MAX_RECENT_SEARCHES = 8
const MAX_SAVED_SEARCHES = 8
const SEARCH_DEBOUNCE_MS = 450

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
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
const recentSearches = ref<SearchSnapshot[]>([])
const savedSearches = ref<SearchSnapshot[]>([])
const searchUndoAction = ref<SearchUndoAction | null>(null)
const editingSavedSearchId = ref('')
const editingSavedSearchLabel = ref('')
const searchStatus = ref<SearchStatus | null>(null)
const searchResultMeta = ref<SearchResultMeta | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
let suggestionTimer: ReturnType<typeof setTimeout> | null = null
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let searchUndoTimer: ReturnType<typeof setTimeout> | null = null
let suggestionRequestId = 0
let searchRequestId = 0
let isPushingQuery = false

const storageOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const storageKey = (name: string) => `offerlab:${storageOwner.value}:${name}`
const resultCount = computed(() => searchMode.value === 'users' ? userResults.value.length : searchResults.value.length)
const activeSortLabel = computed(() => sortOptions.find((item) => item.value === filters.sort)?.label || '相关度')
const hasQuery = computed(() => {
  if (searchMode.value === 'users') return Boolean(filters.q)
  return Boolean(filters.q || filters.company || filters.position || filters.type)
})
const emptyTitle = computed(() => {
  if (searchMode.value === 'users') return filters.q ? '没有找到这个用户' : '先输入用户昵称'
  return hasQuery.value ? '没有匹配的内容' : '开始探索内容'
})
const emptyText = computed(() => {
  if (searchMode.value === 'users') return '可以搜索作者昵称，找到公开资料和 TA 的内容。'
  return hasQuery.value ? '当前关键词或筛选条件较窄，可以清空筛选或换一个热门关键词。' : '输入关键词，或直接查看热门内容。'
})
const noResultWords = computed(() => {
  const words = hotWords.value.filter((word) => word && word !== filters.q).slice(0, 6)
  return words.length ? words : ['Java 后端', 'Redis', 'MySQL', 'Spring Boot']
})
const relaxActions = computed(() => {
  const actions: Array<{ key: string; label: string; action: () => void }> = []
  if (filters.type) actions.push({ key: 'type', label: '不限内容类型', action: clearTypeFilter })
  if (filters.position) actions.push({ key: 'position', label: '不限岗位', action: clearPositionFilter })
  if (filters.company) actions.push({ key: 'company', label: '不限公司', action: clearCompanyFilter })
  if (filters.q) actions.push({ key: 'keyword', label: '只看热门内容', action: searchHotContent })
  return actions
})
const searchStatusText = computed(() => {
  if (!searchStatus.value) return '正在检测搜索状态'
  if (!searchStatus.value.enabled) return 'ES 未启用，当前使用数据库搜索，结果可能不完整，排序能力受限'
  if (!searchStatus.value.available) return 'ES 不可用，当前使用数据库降级搜索，结果可能不完整，排序能力受限'
  if (!searchStatus.value.indexExists) return `索引 ${searchStatus.value.indexName} 尚未创建`
  return `索引 ${searchStatus.value.indexName} 已就绪`
})
const searchSourceTitle = computed(() => {
  const meta = searchResultMeta.value
  if (!meta) return ''
  if (meta.source === 'elasticsearch' && !meta.degraded) return '本次结果来自 Elasticsearch'
  if (meta.source === 'mysql' && meta.degraded) return '本次为数据库降级搜索'
  if (meta.source === 'mysql') return '本次结果来自数据库搜索'
  return `本次搜索来源：${meta.source || '未知'}`
})
const searchSourceDescription = computed(() => {
  const meta = searchResultMeta.value
  if (!meta) return ''
  const scan = meta.scanLimit ? `扫描上限 ${meta.scanLimit} 条。` : ''
  if (!meta.degraded) return `索引可用，按当前筛选和排序返回。${scan}`
  return `${fallbackReasonText(meta.fallbackReason)}，召回完整性和排序可能受限。${scan}`
})

const fallbackReasonText = (reason?: string) => {
  const labels: Record<string, string> = {
    elasticsearch_empty: 'ES 当前没有召回可见结果，已切换到数据库结果',
    elasticsearch_visibility_filtered: 'ES 结果经过可见性过滤后不足，已切换到数据库结果',
    elasticsearch_unavailable: 'ES 当前不可用',
    hot_sort_mysql: '热门排序使用数据库热度计算',
  }
  return labels[reason || ''] || '搜索服务处于降级模式'
}

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
  isPushingQuery = true
  return router.replace({
    path: '/search',
    query: {
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.company ? { company: filters.company } : {}),
      ...(filters.position ? { position: filters.position } : {}),
      ...(filters.type ? { type: String(filters.type) } : {}),
      ...(searchMode.value === 'posts' ? { sort: filters.sort } : {}),
      ...(searchMode.value === 'users' ? { mode: 'users' } : {}),
    },
  }).finally(() => {
    isPushingQuery = false
  })
}

const snapshotLabel = (snapshot: Pick<SearchSnapshot, 'q' | 'company' | 'position' | 'type' | 'mode'>) => {
  if (snapshot.mode === 'users') return snapshot.q || '用户搜索'
  return [snapshot.q, snapshot.company, snapshot.position, snapshot.type ? postTypeText(snapshot.type) : '']
    .filter(Boolean)
    .join(' / ') || '全部内容'
}

const currentSnapshot = (): SearchSnapshot => {
  const mode = searchMode.value
  const company = mode === 'posts' ? filters.company : ''
  const position = mode === 'posts' ? filters.position : ''
  const type = mode === 'posts' ? filters.type : undefined
  const sort = mode === 'posts' ? filters.sort : 'relevance'
  const snapshot = {
    mode,
    q: filters.q,
    company,
    position,
    type,
  }
  return {
    id: [mode, filters.q, company, position, type ?? 'all', sort].join('|'),
    label: snapshotLabel(snapshot),
    mode,
    q: filters.q,
    company,
    position,
    type,
    sort,
    updatedAt: Date.now(),
  }
}

const isSearchSnapshot = (value: unknown): value is SearchSnapshot => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<SearchSnapshot>
  const modeOk = item.mode === 'posts' || item.mode === 'users'
  const sortOk = item.sort === 'relevance' || item.sort === 'latest' || item.sort === 'hot'
  return Boolean(typeof item.id === 'string' && typeof item.label === 'string' && modeOk && sortOk)
}

const readSnapshots = (key: string) => {
  try {
    const parsed = JSON.parse(safeStorage.get(storageKey(key)) || '[]')
    return Array.isArray(parsed) ? parsed.filter(isSearchSnapshot) : []
  } catch {
    return []
  }
}

const writeSnapshots = (key: string, snapshots: SearchSnapshot[]) => {
  safeStorage.set(storageKey(key), JSON.stringify(snapshots))
}

const clearSearchUndoTimer = () => {
  if (searchUndoTimer) {
    clearTimeout(searchUndoTimer)
    searchUndoTimer = null
  }
}

const scheduleSearchUndo = (message: string, restore: () => void) => {
  clearSearchUndoTimer()
  const action = { id: Date.now(), message, restore }
  searchUndoAction.value = action
  searchUndoTimer = setTimeout(() => {
    if (searchUndoAction.value?.id === action.id) searchUndoAction.value = null
  }, 8000)
}

const dismissSearchUndo = () => {
  clearSearchUndoTimer()
  searchUndoAction.value = null
}

const restoreSearchUndo = () => {
  const action = searchUndoAction.value
  if (!action) return
  action.restore()
  dismissSearchUndo()
  toast.success('已撤销删除')
}

const loadSearchSnapshots = () => {
  recentSearches.value = readSnapshots(RECENT_SEARCH_KEY).slice(0, MAX_RECENT_SEARCHES)
  savedSearches.value = readSnapshots(SAVED_SEARCH_KEY).slice(0, MAX_SAVED_SEARCHES)
}

const rememberRecentSearch = () => {
  if (!hasQuery.value) return
  const snapshot = currentSnapshot()
  const next = [snapshot, ...recentSearches.value.filter((item) => item.id !== snapshot.id)].slice(0, MAX_RECENT_SEARCHES)
  recentSearches.value = next
  writeSnapshots(RECENT_SEARCH_KEY, next)
}

const saveCurrentSearch = () => {
  if (!hasQuery.value) return
  const snapshot = currentSnapshot()
  const existing = savedSearches.value.find((item) => item.id === snapshot.id)
  const nextSnapshot = existing ? { ...snapshot, label: existing.label } : snapshot
  const next = [nextSnapshot, ...savedSearches.value.filter((item) => item.id !== snapshot.id)].slice(0, MAX_SAVED_SEARCHES)
  savedSearches.value = next
  writeSnapshots(SAVED_SEARCH_KEY, next)
  toast.success('已保存当前搜索')
}

const startRenameSavedSearch = (snapshot: SearchSnapshot) => {
  editingSavedSearchId.value = snapshot.id
  editingSavedSearchLabel.value = snapshot.label
}

const cancelRenameSavedSearch = () => {
  editingSavedSearchId.value = ''
  editingSavedSearchLabel.value = ''
}

const confirmRenameSavedSearch = (snapshot: SearchSnapshot) => {
  const label = editingSavedSearchLabel.value.trim()
  if (!label) {
    toast.error('搜索名称不能为空')
    return
  }
  const next = savedSearches.value.map((item) => item.id === snapshot.id ? { ...item, label, updatedAt: Date.now() } : item)
  savedSearches.value = next
  writeSnapshots(SAVED_SEARCH_KEY, next)
  cancelRenameSavedSearch()
  toast.success('保存搜索已重命名')
}

const deleteSavedSearch = (id: string) => {
  const previous = savedSearches.value
  const deleted = previous.find((item) => item.id === id)
  if (!deleted) return
  const next = savedSearches.value.filter((item) => item.id !== id)
  savedSearches.value = next
  writeSnapshots(SAVED_SEARCH_KEY, next)
  if (editingSavedSearchId.value === id) cancelRenameSavedSearch()
  scheduleSearchUndo(`已删除保存搜索「${deleted.label}」`, () => {
    savedSearches.value = previous
    writeSnapshots(SAVED_SEARCH_KEY, previous)
  })
  toast.success('保存搜索已删除')
}

const clearSavedSearches = () => {
  const previous = savedSearches.value
  if (!previous.length) return
  savedSearches.value = []
  writeSnapshots(SAVED_SEARCH_KEY, [])
  cancelRenameSavedSearch()
  scheduleSearchUndo(`已清空 ${previous.length} 条保存搜索`, () => {
    savedSearches.value = previous
    writeSnapshots(SAVED_SEARCH_KEY, previous)
  })
  toast.success('保存搜索已清空')
}

const deleteRecentSearch = (id: string) => {
  const previous = recentSearches.value
  const deleted = previous.find((item) => item.id === id)
  if (!deleted) return
  const next = recentSearches.value.filter((item) => item.id !== id)
  recentSearches.value = next
  writeSnapshots(RECENT_SEARCH_KEY, next)
  scheduleSearchUndo(`已删除最近搜索「${deleted.label}」`, () => {
    recentSearches.value = previous
    writeSnapshots(RECENT_SEARCH_KEY, previous)
  })
  toast.success('最近搜索已删除')
}

const clearRecentSearches = () => {
  const previous = recentSearches.value
  if (!previous.length) return
  recentSearches.value = []
  writeSnapshots(RECENT_SEARCH_KEY, [])
  scheduleSearchUndo(`已清空 ${previous.length} 条最近搜索`, () => {
    recentSearches.value = previous
    writeSnapshots(RECENT_SEARCH_KEY, previous)
  })
  toast.success('最近搜索已清空')
}

const applySearchSnapshot = async (snapshot: SearchSnapshot) => {
  searchMode.value = snapshot.mode
  filters.q = snapshot.q || ''
  filters.company = snapshot.company || ''
  filters.position = snapshot.position || ''
  filters.type = snapshot.type
  filters.sort = snapshot.sort
  await runSearch(false)
}

const postTypeText = (type?: number) => {
  switch (type) {
    case 1:
      return '面经'
    case 2:
      return '技术博客'
    case 3:
      return '题解'
    case 4:
      return '求职问答'
    default:
      return ''
  }
}

const searchSnapshotMeta = (snapshot: SearchSnapshot) => {
  const tags = [snapshot.mode === 'users' ? '用户' : '内容']
  if (snapshot.mode === 'posts' && snapshot.sort !== 'relevance') tags.push(activeSortText(snapshot.sort))
  return tags.filter(Boolean).join(' · ')
}

const activeSortText = (sort: SortValue) => sortOptions.find((item) => item.value === sort)?.label || '相关度'

const clearSearchDebounce = () => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
}

const scheduleDebouncedSearch = () => {
  clearSearchDebounce()
  if (!hasQuery.value && searchMode.value !== 'users') return
  searchDebounceTimer = setTimeout(() => {
    runSearch(false)
  }, SEARCH_DEBOUNCE_MS)
}

const handleSearchInput = () => {
  loadSuggestions()
  scheduleDebouncedSearch()
}

const clearCompanyFilter = () => {
  filters.company = ''
  runSearch(false)
}

const clearPositionFilter = () => {
  filters.position = ''
  runSearch(false)
}

const clearTypeFilter = () => {
  filters.type = undefined
  runSearch(false)
}

const runSearch = async (append = false, syncRoute = true) => {
  if (!append) clearSearchDebounce()
  if (append && (isLoading.value || !hasMore.value)) return
  if (!append && syncRoute) await pushQuery()
  const requestId = ++searchRequestId
  isLoading.value = true
  errorMessage.value = ''
  try {
    if (searchMode.value === 'users') {
      cursor.value = undefined
      hasMore.value = false
      searchResults.value = []
      searchResultMeta.value = null
      if (!filters.q) {
        userResults.value = []
        return
      }
      const res = await userApi.searchUsers(filters.q, 20)
      if (requestId !== searchRequestId) return
      userResults.value = res.data || []
      if (!append) rememberRecentSearch()
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
    if (requestId !== searchRequestId) return
    searchResults.value = append ? [...searchResults.value, ...(page?.items || [])] : (page?.items || [])
    userResults.value = []
    searchResultMeta.value = page ? {
      source: page.source,
      degraded: page.degraded,
      fallbackReason: page.fallbackReason,
      scanLimit: page.scanLimit,
    } : null
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
    if (!append) rememberRecentSearch()
  } catch (error: any) {
    if (requestId !== searchRequestId) return
    errorMessage.value = getErrorMessage(error, '搜索接口暂不可用')
    if (!append) {
      searchResults.value = []
      userResults.value = []
      searchResultMeta.value = null
      cursor.value = undefined
      hasMore.value = false
    }
  } finally {
    if (requestId === searchRequestId) {
      isLoading.value = false
    }
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
  searchResultMeta.value = null
  cursor.value = undefined
  hasMore.value = false
  errorMessage.value = ''
  await router.replace({ path: '/search' })
}

const resetResults = () => {
  suggestions.value = []
  searchResults.value = []
  userResults.value = []
  searchResultMeta.value = null
  cursor.value = undefined
  hasMore.value = false
  errorMessage.value = ''
}

const setMode = async (mode: SearchMode) => {
  searchMode.value = mode
  resetResults()
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

const trackCompanyPrepClick = () => {
  if (!filters.company) return
  searchApi.trackAnalytics({
    eventType: 'PREP_CLICK',
    keyword: filters.q || undefined,
    company: filters.company,
  }).catch(() => {})
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

const loadSuggestions = () => {
  if (suggestionTimer) {
    clearTimeout(suggestionTimer)
    suggestionTimer = null
  }
  if (searchMode.value !== 'posts' || filters.q.length < 2) {
    suggestions.value = []
    suggestionRequestId += 1
    return
  }
  const q = filters.q
  const requestId = ++suggestionRequestId
  suggestionTimer = setTimeout(async () => {
    try {
      const res = await searchApi.suggest(q)
      if (requestId === suggestionRequestId && q === filters.q) {
        suggestions.value = Array.isArray(res.data) ? res.data : []
      }
    } catch {
      if (requestId === suggestionRequestId) suggestions.value = []
    }
  }, 250)
}

const loadSearchStatus = async () => {
  try {
    const res = await searchApi.status()
    searchStatus.value = res.data
  } catch {
    searchStatus.value = null
  }
}

const findPost = (postId: ApiId) => searchResults.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const handleLike = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  await toggleLike(post)
}

const handleFavorite = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  await toggleFavorite(post)
}

const handlePostAuthorFollowChange = (authorUid: ApiId, following: boolean) => {
  searchResults.value.forEach((post) => {
    if (String(post.author.uid) === String(authorUid)) {
      post.author.isFollowing = following
    }
  })
  userResults.value.forEach((user) => {
    if (String(user.uid) === String(authorUid)) {
      user.isFollowing = following
    }
  })
}

onMounted(async () => {
  loadSearchSnapshots()
  syncFromRoute()
  await Promise.all([
    loadSearchStatus(),
    searchApi.hotSearches().then((res) => { hotWords.value = res.data || [] }).catch(() => { hotWords.value = [] }),
  ])
  if (hasQuery.value || searchMode.value === 'users') {
    await runSearch(false)
  }
})

watch(
  () => route.fullPath,
  async () => {
    if (isPushingQuery || route.path !== '/search') return
    syncFromRoute()
    resetResults()
    if (hasQuery.value || searchMode.value === 'users') {
      await runSearch(false, false)
    }
  },
)

watch(storageOwner, () => {
  loadSearchSnapshots()
})

onBeforeUnmount(() => {
  if (suggestionTimer) clearTimeout(suggestionTimer)
  clearSearchDebounce()
  clearSearchUndoTimer()
})
</script>

<style scoped>
.search-shell,
.side-panel,
.result-summary,
.search-source-notice,
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

.search-source-notice {
  display: grid;
  gap: 0.25rem;
  padding: 0.85rem 1rem;
  font-size: 0.82rem;
}

.search-source-notice strong {
  color: rgb(15 23 42);
}

.search-source-notice span {
  color: rgb(100 116 139);
}

.source-normal {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
}

.source-degraded {
  border-color: rgb(253 230 138);
  background: rgb(255 251 235);
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

.mini-count {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.15rem 0.45rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.saved-search {
  display: grid;
  width: 100%;
  gap: 0.25rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.65rem 0.75rem;
  text-align: left;
  color: rgb(15 23 42);
  transition: border-color 0.15s ease, background 0.15s ease;
}

.saved-search-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 0.5rem;
}

.saved-search-main {
  min-width: 0;
}

.saved-search-edit {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.5rem;
  grid-column: 1 / -1;
}

.saved-search-input {
  min-height: 2.5rem;
  min-width: 0;
  border-radius: 0.625rem;
  border: 1px solid rgb(147 197 253);
  background: white;
  padding: 0.55rem 0.7rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(15 23 42);
  outline: none;
}

.saved-search-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.4rem;
}

.mini-icon-button {
  display: inline-flex;
  min-height: 2.5rem;
  min-width: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.mini-icon-button:hover {
  border-color: rgb(147 197 253);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.undo-panel {
  display: grid;
  gap: 0.75rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 0.85rem 1rem;
  color: rgb(30 64 175);
  font-size: 0.875rem;
  font-weight: 800;
}

.undo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.undo-actions button {
  min-height: 2.25rem;
  border-radius: 0.5rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.8rem;
  font-weight: 900;
}

.undo-actions button:first-child {
  background: rgb(29 78 216);
  color: white;
}

.undo-actions button:last-child {
  background: white;
  color: rgb(30 64 175);
}

.saved-search:hover {
  border-color: rgb(147 197 253);
  background: rgb(239 246 255);
}

.saved-search-meta {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
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

.no-result-recommendations {
  margin-top: 1.25rem;
  display: grid;
  gap: 0.85rem;
}

.recommend-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.recommend-group > span {
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.recommend-chip {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.35rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

@media (max-width: 640px) {
  .primary-button,
  .secondary-button,
  .segment-button,
  .chip-button,
  .tag-button,
  .mini-icon-button,
  .recommend-chip,
  .undo-actions button {
    min-height: 44px;
  }

  .mini-icon-button {
    min-width: 44px;
  }
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
:global(.dark) .search-source-notice,
:global(.dark) .loading-panel,
:global(.dark) .empty-panel,
:global(.dark) .user-row,
:global(.dark) .secondary-button,
:global(.dark) .chip-button,
:global(.dark) .tag-button,
:global(.dark) .saved-search,
:global(.dark) .saved-search-input,
:global(.dark) .mini-icon-button,
:global(.dark) .search-input,
:global(.dark) .field-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .undo-panel {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

:global(.dark) .undo-actions button:last-child {
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

:global(.dark) .mini-count {
  background: rgb(30 41 59);
  color: rgb(148 163 184);
}

:global(.dark) .saved-search:hover {
  border-color: rgb(96 165 250);
  background: rgb(30 41 59);
}

:global(.dark) .segmented {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .side-title,
:global(.dark) .field-label,
:global(.dark) .empty-panel h2,
:global(.dark) .search-source-notice strong {
  color: rgb(248 250 252);
}

:global(.dark) .search-source-notice span {
  color: rgb(148 163 184);
}

:global(.dark) .source-normal {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
}

:global(.dark) .source-degraded {
  border-color: rgb(146 64 14);
  background: rgb(69 26 3 / 0.6);
}

:global(.dark) .recommend-chip {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}
</style>
