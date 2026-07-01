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
              placeholder="搜索内容、话题、作者、标签或有用经验"
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
              作者
            </button>
            <button type="button" :class="['segment-button', searchMode === 'topics' ? 'segment-active' : '']" @click="setMode('topics')">
              <Hash class="h-4 w-4" />
              话题
            </button>
            <button type="button" :class="['segment-button', searchMode === 'tags' ? 'segment-active' : '']" @click="setMode('tags')">
              <Hash class="h-4 w-4" />
              标签
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

      <div class="search-layout mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside class="search-aside space-y-4">
          <section class="side-panel">
            <h2 class="side-title">筛选</h2>
            <div class="space-y-3">
              <label class="field-label">
                标签 / 关键词
                <input v-model.trim="filters.company" class="field-input" placeholder="例如 AI 工具 / 租房 / 读书" @input="scheduleDebouncedSearch" @keyup.enter="runSearch(false)" />
              </label>
              <label class="field-label">
                频道 / 场景
                <input v-model.trim="filters.position" class="field-input" placeholder="例如 学习成长 / 生活方式" @input="scheduleDebouncedSearch" @keyup.enter="runSearch(false)" />
              </label>
              <label class="field-label">
                内容类型
                <select v-model.number="filters.type" class="field-input" @change="scheduleDebouncedSearch">
                  <option :value="undefined">全部类型</option>
                  <option v-for="item in searchContentTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
              <label class="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <input
                  v-model="includeTestData"
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  @change="scheduleDebouncedSearch"
                />
                <span>
                  包含测试数据
                  <span class="block text-slate-400 dark:text-slate-500">用于 CODEX-E2E / smoke 回归记录诊断</span>
                </span>
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
              <span :class="['status-pill', searchStatusPillClass]">
                {{ searchStatusBadge }}
              </span>
            </div>
          </section>
        </aside>

        <section class="search-results min-w-0 space-y-4">
          <div v-if="errorMessage" class="notice-error">
            <div>
              <strong>搜索接口暂时不可用</strong>
              <p>{{ errorMessage }}</p>
              <span class="notice-error-status">{{ searchErrorStatusText }}</span>
            </div>
            <div class="notice-error-actions">
              <button type="button" @click="runSearch(false)">重试</button>
              <button type="button" @click="searchHotContentFromError">热门内容</button>
              <button type="button" @click="switchToUserSearchFromError">搜作者</button>
              <RouterLink :to="communityQuestionQuery" @click="trackCommunityRecommendationClick('error:community-question')">社区问题求助</RouterLink>
              <RouterLink to="/explore" @click="trackCommunityRecommendationClick('error:explore')">发现</RouterLink>
            </div>
          </div>

          <div v-if="!isLoading && resultCount > 0" class="result-summary">
            <span>{{ resultSummaryText }}</span>
            <span v-if="searchMode === 'posts'">排序: {{ activeSortLabel }}</span>
          </div>

          <div
            v-if="searchMode === 'posts' && searchResultMeta && !isLoading"
            :class="['search-source-notice', searchResultMeta.degraded ? 'source-degraded' : 'source-normal']"
          >
            <strong>{{ searchSourceTitle }}</strong>
            <span>{{ searchSourceDescription }}</span>
            <span v-if="searchDiagnosticText" class="block text-xs">{{ searchDiagnosticText }}</span>
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
                <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ userSignatureText(item) }}</p>
                <p class="mt-1 truncate text-xs font-semibold text-primary-600 dark:text-primary-300">
                  {{ searchUserFollowReason(item) }}
                </p>
                <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>{{ item.postCount || 0 }} 篇内容</span>
                  <span>{{ item.followerCount || 0 }} 位关注者</span>
                </div>
              </div>
              <span class="view-link">查看主页</span>
            </RouterLink>
          </template>

          <template v-else-if="searchMode === 'topics' && topicResults.length">
            <RouterLink v-for="item in topicResults" :key="item.id || item.slug" :to="`/topics/${encodeURIComponent(item.slug || item.name)}`" class="user-row">
              <div class="avatar avatar-soft">
                <Hash class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-semibold text-slate-950 dark:text-slate-50">{{ item.name }}</h3>
                <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{{ item.description || '围绕同一主题聚合经验、问题、资源和讨论。' }}</p>
              </div>
              <span class="view-link">{{ item.postCount || 0 }} 篇</span>
            </RouterLink>
          </template>

          <template v-else-if="searchMode === 'tags' && tagResults.length">
            <RouterLink v-for="item in tagResults" :key="item.id || item.slug || item.name" :to="`/tag/${encodeURIComponent(item.slug || item.name)}`" class="user-row">
              <div class="avatar avatar-soft">
                <Hash class="h-5 w-5" />
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate font-semibold text-slate-950 dark:text-slate-50">{{ item.name }}</h3>
                <p class="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">标签索引会把相关内容、话题和作者线索收拢到一起。</p>
              </div>
              <span class="view-link">{{ item.count || 0 }} 篇</span>
            </RouterLink>
          </template>

          <template v-else-if="searchMode === 'posts' && searchResults.length">
            <PostCard
              v-for="post in searchResults"
              :key="post.postId"
              :post="post"
              :like-pending="isActionPending('like', post.postId)"
              :favorite-pending="isActionPending('favorite', post.postId)"
              :detail-query="postDetailQuery"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </template>

          <div v-else-if="!isLoading" class="empty-panel">
            <h2>{{ emptyTitle }}</h2>
            <p>{{ emptyText }}</p>
            <p v-if="searchDiagnosticText" class="mt-2 text-sm text-amber-700 dark:text-amber-300">{{ searchDiagnosticText }}</p>
            <div v-if="searchMode === 'posts' && hasQuery" class="no-result-recommendations">
              <div v-if="relaxActions.length" class="recommend-group">
                <span>放宽筛选</span>
                <button v-for="item in relaxActions" :key="item.key" type="button" class="recommend-chip" @click="runRecommendationAction(item)">
                  {{ item.label }}
                </button>
              </div>
              <div v-if="noResultWords.length" class="recommend-group">
                <span>换个关键词</span>
                <button v-for="word in noResultWords" :key="word" type="button" class="recommend-chip" @click="useRecommendedWord(word)">
                  {{ word }}
                </button>
              </div>
              <div v-if="filters.company" class="recommend-group">
                <span>继续发现</span>
                <RouterLink :to="`/tag/${encodeURIComponent(filters.company)}`" class="recommend-chip" @click="trackTagRecommendationClick">
                  查看 {{ filters.company }} 专题
                </RouterLink>
              </div>
            </div>
            <div class="no-result-recommendations">
              <div class="recommend-group">
                <span>社区问题</span>
                <RouterLink
                  :to="communityQuestionQuery"
                  class="recommend-chip"
                  @click="trackCommunityRecommendationClick('question-help')"
                >
                  社区问题求助
                </RouterLink>
              </div>
              <div class="recommend-group">
                <span>热门频道</span>
                <RouterLink
                  v-for="channel in recommendedChannels"
                  :key="channel.key"
                  :to="{ path: '/explore', query: { channel: channel.key } }"
                  class="recommend-chip"
                  @click="trackCommunityRecommendationClick(`channel:${channel.key}`)"
                >
                  {{ channel.name }}
                </RouterLink>
              </div>
              <div class="recommend-group">
                <span>热门话题</span>
                <RouterLink
                  v-for="topic in recommendedTopics"
                  :key="topic"
                  :to="`/topics/${encodeURIComponent(topic)}`"
                  class="recommend-chip"
                  @click="trackCommunityRecommendationClick(`topic:${topic}`)"
                >
                  {{ topic }}
                </RouterLink>
              </div>
              <div class="recommend-group">
                <span>热门标签</span>
                <RouterLink
                  v-for="tag in recommendedTags"
                  :key="tag"
                  :to="`/tag/${encodeURIComponent(tag)}`"
                  class="recommend-chip"
                  @click="trackCommunityRecommendationClick(`tag:${tag}`)"
                >
                  {{ tag }}
                </RouterLink>
              </div>
            </div>
            <div class="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" class="primary-button" @click="resetFilters">清空筛选</button>
              <button v-if="searchMode === 'posts'" type="button" class="secondary-button" @click="searchHotContentFromEmpty">热门内容</button>
              <RouterLink v-if="searchMode === 'topics' && filters.q" :to="`/topics/${encodeURIComponent(filters.q)}`" class="secondary-button">查看话题</RouterLink>
              <RouterLink v-if="searchMode === 'tags' && filters.q" :to="`/tag/${encodeURIComponent(filters.q)}`" class="secondary-button">查看标签</RouterLink>
              <RouterLink to="/explore" class="secondary-button" @click="trackCommunityRecommendationClick('explore')">去发现页</RouterLink>
            </div>
          </div>

          <div v-if="hasMore && searchMode === 'posts'" class="text-center">
            <button type="button" class="secondary-button" :disabled="isLoading" @click="runSearch(true)">
              {{ isLoading ? '加载中...' : `加载更多，已显示 ${resultCount} 条` }}
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
import { Bookmark, Check, Eraser, FileText, Hash, Pencil, Search, Trash2, Users, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import { postApi } from '@/api/post'
import { searchApi, type SearchStatus } from '@/api/search'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, CommunityTopic, Post, Tag, User } from '@/api/types'
import { safeStorage } from '@/utils/safeStorage'
import { COMMUNITY_CONTENT_TYPES, POST_TYPE, getContentTypeLabel } from '@/utils/contentTypes'
import { COMMUNITY_CHANNELS, isKnownDomain } from '@/utils/domains'
import { filterPublicContent, filterVisibleTexts, isLowQualityVisibleText, isSyntheticVisibleText, sanitizePublicVisibleText } from '@/utils/textQuality'
import { buildFollowReasons, isPublicAuthor } from '@/utils/creatorSignals'

type SortValue = 'relevance' | 'latest' | 'hot'
type SearchMode = 'posts' | 'users' | 'topics' | 'tags'
type SearchSnapshot = {
  id: string
  label: string
  mode: SearchMode
  q: string
  domain?: number
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
  diagnostics?: Record<string, unknown>
}

type RecommendationAction = {
  key: string
  label: string
  action: () => void | Promise<void>
}

const RECENT_SEARCH_KEY = 'recent-searches'
const SAVED_SEARCH_KEY = 'saved-searches'
const MAX_RECENT_SEARCHES = 8
const MAX_SAVED_SEARCHES = 8
const SEARCH_DEBOUNCE_MS = 450

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const filters = reactive<{ q: string; domain?: number; company: string; position: string; type?: number; sort: SortValue }>({
  q: '',
  domain: undefined,
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
const searchContentTypes = COMMUNITY_CONTENT_TYPES
const recommendedChannels = COMMUNITY_CHANNELS.slice(0, 4)
const recommendedTopics = Array.from(new Set(COMMUNITY_CHANNELS.flatMap((channel) => channel.topics || []))).slice(0, 6)
const recommendedTags = Array.from(new Set(COMMUNITY_CHANNELS.flatMap((channel) => channel.tags || []))).slice(0, 8)

const searchMode = ref<SearchMode>('posts')
const includeTestData = ref(false)
const searchResults = ref<Post[]>([])
const userResults = ref<User[]>([])
const topicResults = ref<CommunityTopic[]>([])
const tagResults = ref<Tag[]>([])
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
const isSearchStatusLoading = ref(false)
const searchStatusError = ref(false)
const errorMessage = ref('')
let suggestionTimer: ReturnType<typeof setTimeout> | null = null
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let searchUndoTimer: ReturnType<typeof setTimeout> | null = null
let suggestionRequestId = 0
let searchRequestId = 0
let isPushingQuery = false

const storageOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const storageKey = (name: string) => `offerlab:${storageOwner.value}:${name}`
const resultCount = computed(() => {
  if (searchMode.value === 'users') return userResults.value.length
  if (searchMode.value === 'topics') return topicResults.value.length
  if (searchMode.value === 'tags') return tagResults.value.length
  return searchResults.value.length
})
const activeSortLabel = computed(() => sortOptions.find((item) => item.value === filters.sort)?.label || '相关度')
const resultSummaryText = computed(() => {
  if (searchMode.value === 'users') return `找到 ${resultCount.value} 位作者`
  if (searchMode.value === 'topics') return filters.q ? `找到 ${resultCount.value} 个相关话题` : `共 ${resultCount.value} 个热门话题`
  if (searchMode.value === 'tags') return filters.q ? `找到 ${resultCount.value} 个相关标签` : `共 ${resultCount.value} 个热门标签`
  if (hasMore.value) return `已加载 ${resultCount.value} 条内容，继续加载可查看更多`
  return `共 ${resultCount.value} 条内容`
})
const hasQuery = computed(() => {
  if (searchMode.value === 'users') return Boolean(filters.q)
  if (searchMode.value === 'topics' || searchMode.value === 'tags') return Boolean(filters.q)
  return Boolean(filters.q || filters.company || filters.position || filters.type)
})
const shouldAutoRunSearch = computed(() => (
  hasQuery.value
  || searchMode.value === 'users'
  || searchMode.value === 'topics'
  || searchMode.value === 'tags'
))
const includesKeyword = (values: Array<string | undefined>, keyword: string) => {
  const q = keyword.trim().toLowerCase()
  if (!q) return true
  return values.some((value) => String(value || '').toLowerCase().includes(q))
}
const filterVisibleTopics = (items: CommunityTopic[], keyword: string) => (
  filterPublicContent(items)
    .filter((item) => includesKeyword([item.name, item.slug, item.description, item.topicType], keyword))
    .sort((a, b) => Number(b.postCount || 0) - Number(a.postCount || 0))
)
const filterVisibleTags = (items: Tag[], keyword: string) => (
  filterPublicContent(items)
    .filter((item) => includesKeyword([item.name, item.slug, item.category], keyword))
    .sort((a, b) => Number(b.count || 0) - Number(a.count || 0))
)
const searchDiagnosticText = computed(() => {
  const diagnostics = searchResultMeta.value?.diagnostics
  if (!diagnostics) return ''
  if (diagnostics.emptyReason === 'test_data_filtered_unless_includeTestData') {
    return '当前关键词像测试数据标记，公开搜索默认会隐藏 CODEX/E2E/smoke 数据。打开测试数据模式后可做回归验证。'
  }
  if (diagnostics.emptyReason === 'type_or_filter_no_match') {
    return '当前内容类型或筛选条件没有匹配结果，可以先放宽内容类型、标签或频道。'
  }
  const filtered = Number(diagnostics.syntheticFiltered || 0)
  if (filtered > 0 && !includeTestData.value) {
    return `已隐藏 ${filtered} 条测试数据结果，打开测试数据模式可检查自动化记录。`
  }
  if (searchResultMeta.value?.scanLimit) {
    return `本次搜索扫描上限 ${searchResultMeta.value.scanLimit} 条，结果受当前筛选条件影响。`
  }
  return ''
})
const postDetailQuery = computed<Record<string, string>>(() => {
  if (!searchResultMeta.value) return {}
  return {
    from: 'search',
    ...(searchResultMeta.value.source ? { source: searchResultMeta.value.source } : {}),
    ...(searchResultMeta.value.degraded ? { degraded: '1' } : {}),
    ...(searchResultMeta.value.fallbackReason ? { fallbackReason: searchResultMeta.value.fallbackReason } : {}),
    ...(searchResultMeta.value.scanLimit ? { scanLimit: String(searchResultMeta.value.scanLimit) } : {}),
    ...(includeTestData.value ? { includeTestData: '1' } : {}),
  }
})
const emptyTitle = computed(() => {
  if (searchMode.value === 'users') return filters.q ? '没有找到这个作者' : '先输入作者昵称'
  if (searchMode.value === 'topics') return filters.q ? '准备查看这个话题' : '先输入话题关键词'
  if (searchMode.value === 'tags') return filters.q ? '准备查看这个标签' : '先输入标签关键词'
  return hasQuery.value ? '没有匹配的内容' : '开始探索内容'
})
const emptyText = computed(() => {
  if (searchMode.value === 'users') return '可以搜索作者昵称，找到公开资料和 TA 的内容。'
  if (searchMode.value === 'topics') return '第一阶段先提供话题直达入口，完整话题聚合会在后续增强。'
  if (searchMode.value === 'tags') return '第一阶段先提供标签直达入口，完整标签聚合会在后续增强。'
  return hasQuery.value ? '当前关键词或筛选条件较窄，可以清空筛选或换一个热门关键词。' : '输入关键词，或直接查看热门内容。'
})
const noResultWords = computed(() => {
  const words = hotWords.value.filter((word) => word && word !== filters.q).slice(0, 6)
  return words.length ? words : ['AI 工具', '学习方法', '租房经验', '书单推荐', '求建议', '城市生活']
})
const relaxActions = computed(() => {
  const actions: RecommendationAction[] = []
  if (filters.type) actions.push({ key: 'type', label: '不限内容类型', action: clearTypeFilter })
  if (filters.position) actions.push({ key: 'position', label: '不限场景', action: clearPositionFilter })
  if (filters.company) actions.push({ key: 'company', label: '不限标签', action: clearCompanyFilter })
  if (!includeTestData.value && isSyntheticVisibleText(filters.q)) actions.push({ key: 'test-data', label: '包含测试数据', action: enableTestDataMode })
  if (filters.q) actions.push({ key: 'keyword', label: '只看热门内容', action: searchHotContent })
  return actions
})
const userFacingSearchStatusMessage = (message?: string | null) => {
  const value = message?.trim()
  if (!value) return ''
  if (/^[\x00-\x7F]+$/.test(value)) return ''
  if (/(Elasticsearch|MySQL|fallback|Public search|index is not ready)/i.test(value)) return ''
  return value
}
const searchStatusText = computed(() => {
  if (isSearchStatusLoading.value && !searchStatus.value) return '正在检测搜索状态'
  if (searchStatusError.value) return '搜索状态接口暂不可用，本页已保留热门内容、发现页、社区问题求助和搜作者入口'
  if (!searchStatus.value) return '搜索状态暂不可用，本页已保留社区兜底入口'
  if (searchStatus.value.publicSearchAvailable === false) return '公开搜索暂不可用，请稍后重试或使用发现页、社区问题求助和搜作者入口'
  if (searchStatus.value.publicSearchSource === 'mysql') {
    const mode = searchStatus.value.fallbackMode === 'compat' ? '兼容模式' : '完整标签治理模式'
    return `公开搜索当前由数据库兜底服务（${mode}），结果可能不完整，排序能力受限`
  }
  if (!searchStatus.value.enabled) return '搜索索引未启用，当前使用数据库搜索，结果可能不完整'
  if (!searchStatus.value.available) return '搜索索引暂不可用，当前使用数据库兜底搜索，结果可能不完整'
  if (!searchStatus.value.indexExists) return '搜索索引尚未创建，当前结果可能不完整'
  const backendMessage = userFacingSearchStatusMessage(searchStatus.value.message)
  if (backendMessage) return backendMessage
  return '搜索索引已就绪，新发布内容会优先进入实时搜索'
})
const searchErrorStatusText = computed(() => {
  if (!errorMessage.value) return searchStatusText.value
  if (isSearchStatusLoading.value && !searchStatus.value) return '本次搜索请求失败，正在刷新后端状态'
  if (searchStatusError.value || !searchStatus.value) return searchStatusText.value
  return `本次搜索请求失败；下方状态仅表示当前后端诊断：${searchStatusText.value}`
})
const searchStatusBadge = computed(() => {
  if (searchStatus.value?.publicSearchSource === 'elasticsearch') return '实时'
  if (searchStatus.value?.publicSearchSource === 'mysql') return '兜底'
  if (searchStatus.value?.publicSearchAvailable === false) return '不可用'
  return searchStatus.value?.available ? '实时' : '降级'
})
const searchStatusPillClass = computed(() => {
  if (searchStatus.value?.publicSearchSource === 'elasticsearch') return 'status-ok'
  if (searchStatus.value?.publicSearchAvailable === false) return 'status-danger'
  return 'status-warn'
})
const communityQuestionQuery = computed(() => {
  const keyword = filters.q || filters.company || filters.position
  return {
    path: '/search',
    query: {
      ...(keyword ? { q: keyword } : {}),
      mode: 'posts',
      type: String(POST_TYPE.QUESTION),
      sort: 'hot',
    },
  }
})
const searchSourceTitle = computed(() => {
  const meta = searchResultMeta.value
  if (!meta) return ''
  if (meta.source === 'elasticsearch' && !meta.degraded) return '本次结果来自实时搜索索引'
  if (meta.source === 'mysql' && meta.degraded && isVisibilitySupplementReason(meta.fallbackReason)) return '本次补充了数据库可见结果'
  if (meta.source === 'mysql' && meta.degraded) return '本次使用数据库兜底搜索'
  if (meta.source === 'mysql') return '本次结果来自数据库搜索'
  if (meta.source === 'client_fallback') return '本页客户端兜底建议'
  return `本次搜索来源：${meta.source || '未知'}`
})
const searchSourceDescription = computed(() => {
  const meta = searchResultMeta.value
  if (!meta) return ''
  const scan = meta.scanLimit ? `扫描上限 ${meta.scanLimit} 条。` : ''
  if (!meta.degraded) return `索引可用，按当前筛选和排序返回。${scan}`
  if (isVisibilitySupplementReason(meta.fallbackReason)) return `${fallbackReasonText(meta.fallbackReason)}，搜索服务仍可用。${scan}`
  return `${fallbackReasonText(meta.fallbackReason)}，结果可能不完整，排序能力受限。${scan}`
})

const isLowQualitySearchTerm = (value: string) => {
  return !value || isLowQualityVisibleText(value)
}

const filterVisibleSearchTerms = (values: unknown) => {
  return filterVisibleTexts(values, 12).filter((value) => !isSyntheticVisibleText(value))
}

const userSignatureText = (item: User) => {
  return sanitizePublicVisibleText(item.signature, '作者还没有填写简介')
}
const searchUserFollowReason = (item: User) => buildFollowReasons(item)[0]

const isVisibilitySupplementReason = (reason?: string) => {
  return reason === 'elasticsearch_empty' || reason === 'elasticsearch_visibility_filtered'
}

const fallbackReasonText = (reason?: string) => {
  const labels: Record<string, string> = {
    elasticsearch_empty: '索引没有召回可见结果，已补充数据库中的公开内容',
    elasticsearch_visibility_filtered: '索引结果经过可见性过滤后不足，已补充数据库中的公开内容',
    elasticsearch_unavailable: '搜索服务当前不可用，已使用数据库兜底',
    hot_sort_mysql: '热门排序使用数据库热度计算',
    search_api_error: '搜索请求失败，已保留本页兜底入口',
  }
  return labels[reason || ''] || '本次使用兜底搜索链路'
}

const analyticsKeyword = () => filters.q || filters.company || filters.position || (filters.type ? postTypeText(filters.type) : '') || 'empty-result'

const trackCommunityRecommendationClick = (target: string) => {
  searchApi.trackAnalytics({
    eventType: 'COMMUNITY_RECOMMEND_CLICK',
    keyword: analyticsKeyword(),
    target,
  }).catch(() => {})
}

const runRecommendationAction = (item: RecommendationAction) => {
  trackCommunityRecommendationClick(`relax:${item.key}`)
  void item.action()
}

const useRecommendedWord = async (word: string) => {
  trackCommunityRecommendationClick(`keyword:${word}`)
  await useHotWord(word)
}

const trackTagRecommendationClick = () => {
  trackCommunityRecommendationClick(`tag:${filters.company}`)
}

const searchHotContentFromEmpty = async () => {
  trackCommunityRecommendationClick('hot-content')
  await searchHotContent()
}

const searchHotContentFromError = async () => {
  trackCommunityRecommendationClick('error:hot-content')
  await searchHotContent()
}

const switchToUserSearchFromError = async () => {
  trackCommunityRecommendationClick('error:user-search')
  const keyword = filters.q || filters.company || filters.position
  searchMode.value = 'users'
  filters.q = keyword
  filters.domain = undefined
  filters.company = ''
  filters.position = ''
  filters.type = undefined
  filters.sort = 'relevance'
  resetResults()
  await runSearch(false)
}

const syncFromRoute = () => {
  filters.q = typeof route.query.q === 'string' ? route.query.q : ''
  const domain = Number(route.query.domain)
  const nextMode = route.query.mode === 'users' || route.query.mode === 'topics' || route.query.mode === 'tags'
    ? route.query.mode
    : 'posts'
  filters.domain = nextMode === 'posts' && isKnownDomain(domain) ? domain : undefined
  filters.company = typeof route.query.company === 'string' ? route.query.company : ''
  filters.position = typeof route.query.position === 'string' ? route.query.position : ''
  const type = Number(route.query.type)
  filters.type = Number.isFinite(type) && type > 0 ? type : undefined
  if (filters.domain) {
    filters.domain = undefined
  }
  filters.sort = route.query.sort === 'latest' || route.query.sort === 'hot' ? route.query.sort : 'relevance'
  searchMode.value = nextMode
  includeTestData.value = route.query.includeTestData === '1' || route.query.includeTestData === 'true'
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
      ...(searchMode.value !== 'posts' ? { mode: searchMode.value } : {}),
      ...(includeTestData.value ? { includeTestData: '1' } : {}),
    },
  }).finally(() => {
    isPushingQuery = false
  })
}

const snapshotLabel = (snapshot: Pick<SearchSnapshot, 'q' | 'domain' | 'company' | 'position' | 'type' | 'mode'>) => {
  if (snapshot.mode === 'users') return snapshot.q || '作者搜索'
  if (snapshot.mode === 'topics') return snapshot.q || '话题搜索'
  if (snapshot.mode === 'tags') return snapshot.q || '标签搜索'
  return [snapshot.q, snapshot.company, snapshot.position, snapshot.type ? postTypeText(snapshot.type) : '']
    .filter(Boolean)
    .join(' / ') || '全部内容'
}

const currentSnapshot = (): SearchSnapshot => {
  const mode = searchMode.value
  const domain = undefined
  const company = mode === 'posts' ? filters.company : ''
  const position = mode === 'posts' ? filters.position : ''
  const type = mode === 'posts' ? filters.type : undefined
  const sort = mode === 'posts' ? filters.sort : 'relevance'
  const snapshot = {
    mode,
    q: filters.q,
    domain,
    company,
    position,
    type,
  }
  return {
    id: [mode, filters.q, domain ?? 'all', company, position, type ?? 'all', sort].join('|'),
    label: snapshotLabel(snapshot),
    mode,
    q: filters.q,
    domain,
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
  const modeOk = item.mode === 'posts' || item.mode === 'users' || item.mode === 'topics' || item.mode === 'tags'
  const sortOk = item.sort === 'relevance' || item.sort === 'latest' || item.sort === 'hot'
  const domainOk = item.domain == null || isKnownDomain(item.domain)
  return Boolean(typeof item.id === 'string' && typeof item.label === 'string' && modeOk && sortOk && domainOk)
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
  filters.domain = undefined
  filters.company = snapshot.company || ''
  filters.position = snapshot.position || ''
  filters.type = snapshot.type
  filters.sort = snapshot.sort
  await runSearch(false)
}

const postTypeText = (type?: number) => type ? getContentTypeLabel(type) : ''

const searchSnapshotMeta = (snapshot: SearchSnapshot) => {
  const modeLabel = snapshot.mode === 'users'
    ? '作者'
    : snapshot.mode === 'topics'
      ? '话题'
      : snapshot.mode === 'tags'
        ? '标签'
        : '内容'
  const tags = [modeLabel]
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
  if (!shouldAutoRunSearch.value) return
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

const enableTestDataMode = () => {
  includeTestData.value = true
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
      topicResults.value = []
      tagResults.value = []
      searchResultMeta.value = null
      if (!filters.q) {
        userResults.value = []
        return
      }
      const res = await userApi.searchUsers(filters.q, 20)
      if (requestId !== searchRequestId) return
      userResults.value = filterPublicContent(res.data || []).filter(isPublicAuthor)
      if (!append) rememberRecentSearch()
      return
    }

    if (searchMode.value === 'topics') {
      cursor.value = undefined
      hasMore.value = false
      searchResults.value = []
      userResults.value = []
      tagResults.value = []
      searchResultMeta.value = null
      const res = await postApi.listTopics({ limit: 30 })
      if (requestId !== searchRequestId) return
      topicResults.value = filterVisibleTopics(res.data || [], filters.q).slice(0, 20)
      if (!append) rememberRecentSearch()
      return
    }

    if (searchMode.value === 'tags') {
      cursor.value = undefined
      hasMore.value = false
      searchResults.value = []
      userResults.value = []
      topicResults.value = []
      searchResultMeta.value = null
      const res = await postApi.getTags()
      if (requestId !== searchRequestId) return
      tagResults.value = filterVisibleTags(res.data || [], filters.q).slice(0, 30)
      if (!append) rememberRecentSearch()
      return
    }

    const params = {
      q: filters.q || undefined,
      company: filters.company || undefined,
      position: filters.position || undefined,
      type: filters.type,
      sort: filters.sort,
      cursor: append ? cursor.value : undefined,
      size: 20,
      includeTestData: includeTestData.value,
    } as Parameters<typeof searchApi.searchPosts>[0]
    const res = await searchApi.searchPosts(params)
    const page = res.data
    if (requestId !== searchRequestId) return
    const cleanItems = includeTestData.value ? (page?.items || []) : filterPublicContent(page?.items || [])
    searchResults.value = append ? [...searchResults.value, ...cleanItems] : cleanItems
    userResults.value = []
    topicResults.value = []
    tagResults.value = []
    searchResultMeta.value = page ? {
      source: page.source,
      degraded: page.degraded,
      fallbackReason: page.fallbackReason,
      scanLimit: page.scanLimit,
      diagnostics: page.diagnostics,
    } : null
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
    if (!append) rememberRecentSearch()
  } catch (error: any) {
    if (requestId !== searchRequestId) return
    errorMessage.value = `${getErrorMessage(error, '搜索接口暂不可用')}。已刷新搜索状态，并保留热门内容、发现页、社区问题求助和搜作者入口。`
    if (!append) {
      searchResults.value = []
      userResults.value = []
      topicResults.value = []
      tagResults.value = []
      searchResultMeta.value = {
        source: 'client_fallback',
        degraded: true,
        fallbackReason: 'search_api_error',
      }
      cursor.value = undefined
      hasMore.value = false
    }
    await loadSearchStatus()
  } finally {
    if (requestId === searchRequestId) {
      isLoading.value = false
    }
  }
}

const resetFilters = async () => {
  filters.q = ''
  filters.domain = undefined
  filters.company = ''
  filters.position = ''
  filters.type = undefined
  filters.sort = 'relevance'
  includeTestData.value = false
  searchMode.value = 'posts'
  suggestions.value = []
  searchResults.value = []
  userResults.value = []
  topicResults.value = []
  tagResults.value = []
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
  topicResults.value = []
  tagResults.value = []
  searchResultMeta.value = null
  cursor.value = undefined
  hasMore.value = false
  errorMessage.value = ''
}

const setMode = async (mode: SearchMode) => {
  searchMode.value = mode
  filters.domain = undefined
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
        suggestions.value = filterVisibleSearchTerms(res.data)
      }
    } catch {
      if (requestId === suggestionRequestId) suggestions.value = []
    }
  }, 250)
}

const loadSearchStatus = async () => {
  isSearchStatusLoading.value = true
  searchStatusError.value = false
  try {
    const res = await searchApi.status()
    searchStatus.value = res.data
  } catch {
    searchStatus.value = null
    searchStatusError.value = true
  } finally {
    isSearchStatusLoading.value = false
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
    searchApi.hotSearches().then((res) => { hotWords.value = filterVisibleSearchTerms(res.data) }).catch(() => { hotWords.value = [] }),
  ])
  if (shouldAutoRunSearch.value) {
    await runSearch(false)
  }
})

watch(
  () => route.fullPath,
  async () => {
    if (isPushingQuery || route.path !== '/search') return
    syncFromRoute()
    resetResults()
    if (shouldAutoRunSearch.value) {
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

.notice-error strong {
  display: block;
  font-size: 0.95rem;
  color: rgb(127 29 29);
}

.notice-error p {
  margin-top: 0.35rem;
  font-size: 0.875rem;
  line-height: 1.55;
}

.notice-error-status {
  margin-top: 0.5rem;
  display: inline-flex;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.78);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(153 27 27);
}

.notice-error-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.notice-error-actions button,
.notice-error-actions a {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(252 165 165);
  background: white;
  padding: 0.45rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(185 28 28);
}

.notice-error-actions button:hover,
.notice-error-actions a:hover {
  border-color: rgb(248 113 113);
  background: rgb(255 255 255 / 0.9);
  color: rgb(127 29 29);
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
  .search-layout {
    display: flex;
    flex-direction: column;
  }

  .search-results {
    order: 1;
  }

  .search-aside {
    order: 2;
  }

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

  .notice-error {
    flex-direction: column;
  }

  .notice-error-actions {
    justify-content: flex-start;
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

.avatar-soft {
  background: rgb(238 242 255);
  color: rgb(79 70 229);
}

.view-link {
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.dark .search-shell,
.dark .side-panel,
.dark .result-summary,
.dark .search-source-notice,
.dark .loading-panel,
.dark .empty-panel,
.dark .user-row,
.dark .secondary-button,
.dark .chip-button,
.dark .tag-button,
.dark .saved-search,
.dark .saved-search-input,
.dark .mini-icon-button,
.dark .search-input,
.dark .field-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .avatar-soft {
  background: rgb(30 41 59);
  color: rgb(199 210 254);
}

.dark .undo-panel {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .undo-actions button:last-child {
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

.dark .mini-count {
  background: rgb(30 41 59);
  color: rgb(148 163 184);
}

.dark .saved-search:hover {
  border-color: rgb(96 165 250);
  background: rgb(30 41 59);
}

.dark .segmented {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .side-title,
.dark .field-label,
.dark .empty-panel h2,
.dark .search-source-notice strong {
  color: rgb(248 250 252);
}

.dark .search-source-notice span {
  color: rgb(148 163 184);
}

.dark .source-normal {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
}

.dark .source-degraded {
  border-color: rgb(146 64 14);
  background: rgb(69 26 3 / 0.6);
}

.dark .recommend-chip {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

.dark .notice-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.55);
  color: rgb(252 165 165);
}

.dark .notice-error strong {
  color: rgb(254 202 202);
}

.dark .notice-error-status {
  background: rgb(127 29 29 / 0.55);
  color: rgb(254 202 202);
}

.dark .notice-error-actions button,
.dark .notice-error-actions a {
  border-color: rgb(153 27 27);
  background: rgb(15 23 42);
  color: rgb(254 202 202);
}
</style>
