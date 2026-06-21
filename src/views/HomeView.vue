<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <section class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div class="surface-card overflow-hidden p-6 sm:p-7">
          <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div class="max-w-2xl">
              <div class="mb-3 flex flex-wrap gap-2">
                <span class="muted-pill">兴趣主题</span>
                <span class="muted-pill">内容标签</span>
                <span class="muted-pill">推荐理由</span>
              </div>
              <h1 class="text-2xl font-black tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                找到更适合你的社区内容
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                浏览开发者分享的社区经验、兴趣话题、问答讨论和工具推荐，把零散内容沉淀成可复用的知识流。
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <RouterLink to="/editor" class="primary-action">
                <PenLine class="h-4 w-4" />
                发布经验
              </RouterLink>
              <RouterLink to="/explore" class="secondary-action">
                <Compass class="h-4 w-4" />
                去发现
              </RouterLink>
            </div>
          </div>

          <div class="home-metric-grid mt-6 grid gap-3 sm:grid-cols-3">
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">今日可读内容</span>
              <strong class="metric-value">{{ readableContentCount }}</strong>
            </div>
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">热门标签</span>
              <strong class="metric-value">{{ topTags.length }}</strong>
            </div>
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">推荐同路人</span>
              <strong class="metric-value">{{ recommendedUsers.length }}</strong>
            </div>
          </div>
        </div>

        <section class="surface-card p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-black text-slate-950 dark:text-white">快速搜索</h2>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">按兴趣、频道和内容形式快速定位</p>
            </div>
            <Search class="h-5 w-5 text-primary-500" />
          </div>
          <form class="mt-4 space-y-3" @submit.prevent="submitHeroSearch">
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                v-model="heroKeyword"
                class="quick-input border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 pl-9"
                placeholder="例如 Redis、架构复盘、部署踩坑"
              />
            </div>
            <button type="submit" class="primary-action w-full">
              搜索内容
            </button>
          </form>
        </section>
      </section>

      <!-- 领域筛选 -->
      <section class="mb-6 flex flex-wrap gap-2">
        <router-link
          to="/"
          class="domain-chip inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:hover:bg-primary-950"
          :class="activeDomain === undefined ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/50 dark:border-primary-700' : 'bg-white dark:bg-slate-900'"
        >
          <span>综合</span>
        </router-link>
        <router-link
          v-for="d in DOMAIN_OPTIONS"
          :key="d.value"
          :to="d.value === activeDomain ? '/' : { path: '/', query: { domain: d.value } }"
          class="domain-chip inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:hover:bg-primary-950"
          :class="d.value === activeDomain ? 'bg-primary-100 border-primary-300 text-primary-700 dark:bg-primary-900/50 dark:border-primary-700' : 'bg-white dark:bg-slate-900'"
        >
          <span>{{ d.icon }}</span>
          <span>{{ d.label }}</span>
        </router-link>
      </section>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-5">
            <section class="surface-card p-5">
              <template v-if="authStore.isLoggedIn && authStore.user">
                <div class="flex items-start gap-3">
                  <div class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 to-sky-500 text-xl font-black text-white shadow-sm shadow-primary-600/20">
                    <img v-if="authStore.user.avatar" :src="authStore.user.avatar" :alt="authStore.user.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ authStore.user.nickname.charAt(0) || '?' }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-black text-slate-950 dark:text-white">{{ authStore.user.nickname }}</h3>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {{ currentUserSignature }}
                    </p>
                  </div>
                </div>
                <div class="mt-5 grid grid-cols-2 gap-3 text-center">
                  <RouterLink to="/me" class="profile-stat">
                    <span>{{ authStore.user.postCount ?? 0 }}</span>
                    <small>帖子</small>
                  </RouterLink>
                  <RouterLink to="/me" class="profile-stat">
                    <span>{{ authStore.user.followerCount ?? 0 }}</span>
                    <small>粉丝</small>
                  </RouterLink>
                </div>
              </template>
              <template v-else>
                <div>
                  <h3 class="font-black text-slate-950 dark:text-white">开始沉淀技术经验</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">登录后可以发布项目复盘、收藏内容并关注作者。</p>
                  <RouterLink to="/login" class="primary-action mt-4 w-full">
                    登录
                  </RouterLink>
                </div>
              </template>
            </section>

            <section class="surface-panel p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">热门标签</h3>
                <Tag class="h-4 w-4 text-slate-400" />
              </div>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  v-for="tag in topTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-primary-800 dark:hover:bg-primary-950/60"
                >
                  {{ tag.name }}
                </RouterLink>
              </div>
            </section>
          </div>
        </aside>

        <section class="min-w-0">
          <div class="surface-card mb-5 p-2">
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                v-for="tab in feedTabs"
                :key="tab"
                type="button"
                :disabled="tab === 'following' && !authStore.isLoggedIn"
                :class="[
                  'rounded-lg px-3 py-3 text-left text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50',
                  activeFeed === tab
                    ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
                ]"
                @click="activeFeed = tab"
              >
                <span class="block">{{ feedLabels[tab] }}</span>
                <span class="mt-1 block text-xs font-medium opacity-75">{{ feedShortDescriptions[tab] }}</span>
              </button>
            </div>
            <p class="px-3 pb-2 pt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ feedDescriptions[activeFeed] }}
              <span v-if="activeFeed === 'recommend'" class="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                推荐理由会结合兴趣标签、内容形式和社区热度一起计算。
              </span>
            </p>
            <div class="border-t border-slate-100 px-3 py-3 dark:border-slate-800">
              <div class="mb-2 flex items-center gap-2 text-xs font-black text-slate-500 dark:text-slate-400">
                <Sparkles class="h-3.5 w-3.5" />
                内容频道
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  :class="['channel-chip', !activeContentType ? 'channel-chip-active' : '']"
                  @click="activeContentType = undefined"
                >
                  全部
                </button>
                <button
                  v-for="type in contentTypeChannels"
                  :key="type.value"
                  type="button"
                  :class="['channel-chip', activeContentType === type.value ? 'channel-chip-active' : '']"
                  @click="toggleContentType(type.value)"
                >
                  {{ type.shortLabel }}
                </button>
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <LoadingSkeleton v-if="isLoading" />
            <div v-else-if="isError" class="surface-card feed-error-card p-6">
              <div>
                <h3 class="text-lg font-black text-slate-950 dark:text-slate-100">信息流加载失败</h3>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{{ feedErrorText }}</p>
                <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-500">
                  当前频道：{{ feedLabels[activeFeed] }}。可以换到热门、精选或问答继续浏览。
                </p>
              </div>
              <div class="feed-error-actions">
                <button type="button" class="secondary-action px-5" @click="() => refetch()">重试</button>
                <button type="button" class="secondary-action px-5" @click="switchFeedAfterError('hot')">热门</button>
                <button type="button" class="secondary-action px-5" @click="switchFeedAfterError('featured')">精选</button>
                <RouterLink to="/explore" class="secondary-action px-5">发现</RouterLink>
                <RouterLink :to="{ path: '/questions', query: homeFallbackQuestionQuery }" class="secondary-action px-5">问答</RouterLink>
              </div>
            </div>
            <template v-else-if="visiblePosts.length">
              <PostCard
                v-for="post in visiblePosts"
                :key="post.postId"
                :post="post"
                :show-recommend-feedback="activeFeed === 'recommend'"
                :like-pending="isActionPending('like', post.postId)"
                :favorite-pending="isActionPending('favorite', post.postId)"
                @like="handleLike"
                @favorite="handleFavorite"
                @not-interested="handleRecommendFeedback"
                @follow-change="handlePostAuthorFollowChange"
              />
            </template>
            <EmptyState
              v-else
              :title="emptyFeedTitle"
              :description="emptyFeedDescription"
              :actionText="emptyFeedActionText"
              actionHref="/explore"
            />
          </div>

          <div v-if="hasNextPage && !isFetching" class="mt-6 text-center">
            <button type="button" class="secondary-action px-6" @click="() => fetchNextPage()">
              加载更多
            </button>
          </div>

          <div v-if="isFetching" class="mt-6">
            <LoadingSkeleton />
          </div>
        </section>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-5">
            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">精选内容</h3>
                <Sparkles class="h-4 w-4 text-amber-500" />
              </div>
              <div v-if="featuredPreview.length" class="space-y-3">
                <RouterLink
                  v-for="post in featuredPreview"
                  :key="post.postId"
                  :to="`/post/${post.postId}`"
                  class="block rounded-lg border border-amber-100 bg-amber-50/60 p-3 transition-colors hover:border-amber-200 hover:bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 dark:hover:bg-amber-950/35"
                >
                  <span class="text-[11px] font-black text-amber-700 dark:text-amber-300">精选</span>
                  <h4 class="mt-1 line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">{{ post.title }}</h4>
                </RouterLink>
              </div>
              <p v-else class="text-sm leading-6 text-slate-500 dark:text-slate-400">
                切到精选信息流可查看运营标记的高质量内容。
              </p>
            </section>

            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">技术专题</h3>
                <Compass class="h-4 w-4 text-primary-500" />
              </div>
              <div class="space-y-2">
                <RouterLink
                  v-for="topic in topicItems"
                  :key="topic.name"
                  :to="topic.href"
                  class="group flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ topic.name }}</span>
                  <span class="ml-3 shrink-0 text-xs text-slate-500 dark:text-slate-400">{{ topic.count }}</span>
                </RouterLink>
              </div>
            </section>

            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">标签热度</h3>
                <TrendingUp class="h-4 w-4 text-teal-500" />
              </div>
              <div class="space-y-2">
                <RouterLink
                  v-for="(tag, index) in trendingTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-700 dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-primary-950 dark:group-hover:text-primary-300">
                    {{ index + 1 }}
                  </span>
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ tag.name }}</span>
                    <span class="block text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }} 篇内容</span>
                  </span>
                </RouterLink>
              </div>
            </section>

            <section class="surface-card p-5">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="font-black text-slate-950 dark:text-white">推荐用户</h3>
                <Users class="h-4 w-4 text-amber-500" />
              </div>
              <div class="space-y-3">
                <div
                  v-for="user in recommendedUsers"
                  :key="user.uid"
                  class="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RouterLink :to="`/u/${user.uid}`" class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-sky-500 to-teal-500 text-xs font-black text-white">
                      <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
                      <span v-else>{{ user.nickname.charAt(0) || '?' }}</span>
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ user.nickname }}</div>
                      <div class="truncate text-xs text-slate-500 dark:text-slate-400">{{ userDisplaySignature(user) }}</div>
                    </div>
                  </RouterLink>
                  <button
                    type="button"
                    class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60"
                    :class="user.isFollowing ? 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800' : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300'"
                    :disabled="isSelf(user) || followingBusyIds.has(String(user.uid))"
                    @click="toggleFollowUser(user)"
                  >
                    {{ user.isFollowing ? '已关注' : '关注' }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Compass, PenLine, Search, Sparkles, Tag, TrendingUp, Users } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import { useInfiniteFeed, type FeedType } from '@/composables/useInfiniteFeed'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { userApi } from '@/api/user'
import { feedApi } from '@/api/feed'
import { usePostInteraction } from '@/composables/usePostInteraction'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { CommunityTopic, Post, Tag as PostTag, User } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES } from '@/utils/contentTypes'
import { DOMAIN_OPTIONS } from '@/utils/domains'
import { buildTopicItems, isFeaturedPost } from '@/utils/communityMetrics'
import { filterPublicContent, isSyntheticVisibleText } from '@/utils/textQuality'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { requireLogin } = useLoginRedirect()

const activeFeed = ref<FeedType>('recommend')
const heroKeyword = ref('')
const activeContentType = ref<number | undefined>()
const legalDomainValues = new Set<number>(DOMAIN_OPTIONS.map((d) => d.value))
const activeDomain = computed(() => {
  const q = Number(route.query.domain)
  return legalDomainValues.has(q) ? q : undefined
})
const feedTabs: FeedType[] = ['following', 'recommend', 'latest', 'hot', 'featured']
const feedLabels: Record<FeedType, string> = {
  following: '关注',
  recommend: '推荐',
  latest: '最新',
  hot: '热门',
  featured: '精选',
}
const feedShortDescriptions: Record<FeedType, string> = {
  following: '熟人动态',
  recommend: '高相关内容',
  latest: '新发布',
  hot: '正在升温',
  featured: '人工挑选',
}
const feedDescriptions: Record<FeedType, string> = {
  following: '只看你关注作者的最新动态，适合持续追踪熟悉的社区内容。',
  recommend: '结合你的兴趣主题、内容标签、阅读偏好和互动热度重排，优先展示更贴近你关注点的社区推荐。',
  latest: '按发布时间倒序展示公开内容，适合快速浏览新发布的文章、复盘和问答。',
  hot: '按浏览、点赞、收藏、评论和发布时间计算热度，适合查看正在升温的社区内容。',
  featured: '展示管理员或运营标记的高质量内容，适合作为首页精选和专题沉淀入口。',
}

const tags = ref<PostTag[]>([])
const topics = ref<CommunityTopic[]>([])
const recommendedUsers = ref<User[]>([])
const sampledFeedContentCount = ref(0)
const followingBusyIds = ref(new Set<string>())
const locallyHiddenPostIds = ref(new Set<string>())
const { posts, error: feedError, fetchNextPage, hasNextPage, isError, isFetching, isLoading, refetch } = useInfiniteFeed(activeFeed, activeDomain)

const sortedTags = computed(() => [...tags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const topTags = computed(() => sortedTags.value.slice(0, 10))
const trendingTags = computed(() => sortedTags.value.slice(0, 6))
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const topicItems = computed(() => {
  const remoteTopics = topics.value.slice(0, 6).map((topic) => ({
    name: topic.name,
    count: Number(topic.postCount || 0),
    href: `/topics/${topic.slug}`,
  }))
  if (remoteTopics.length) return remoteTopics
  return buildTopicItems(visiblePosts.value, tags.value, 6).map((topic) => ({
    ...topic,
    href: { path: '/search', query: { company: topic.name, sort: 'hot' } },
  }))
})
const cleanPosts = computed(() => filterPublicContent(posts.value))
const featuredPreview = computed(() => cleanPosts.value.filter(isFeaturedPost).slice(0, 3))
const visiblePosts = computed(() => {
  const base = activeFeed.value === 'recommend'
    ? cleanPosts.value.filter((post) => !locallyHiddenPostIds.value.has(String(post.postId)))
    : cleanPosts.value
  return activeContentType.value
    ? base.filter((post) => Number(post.postType) === Number(activeContentType.value))
    : base
})
const readableContentCount = computed(() => Math.max(visiblePosts.value.length, sampledFeedContentCount.value))
const currentUserSignature = computed(() => {
  const signature = authStore.user?.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '完善个人资料，让更多开发者了解你的专长'
})
const feedErrorText = computed(() => getErrorMessage(feedError.value, '当前信息流暂时不可用，请稍后重试。'))
const homeFallbackQuestionQuery = computed(() => {
  const keyword = heroKeyword.value.trim() || topTags.value[0]?.name || ''
  return keyword ? { q: keyword } : {}
})
const emptyFeedTitle = computed(() => {
  if (activeFeed.value === 'following') return '还没有关注动态'
  if (activeFeed.value === 'latest' && sampledFeedContentCount.value > 0) return '最新暂时没有新内容'
  return '暂时没有内容'
})
const emptyFeedDescription = computed(() => {
  if (activeFeed.value === 'following') return '去发现页看看可以关注的作者。'
  if (activeFeed.value === 'latest' && sampledFeedContentCount.value > 0) return '推荐和热门里还有可读内容，可以切换其他信息流继续浏览。'
  return '发布第一篇技术文章、项目复盘或踩坑记录，也可以切换其他信息流。'
})
const emptyFeedActionText = computed(() => activeFeed.value === 'following' ? '去发现' : undefined)

const findPost = (postId: Post['postId']) => posts.value.find((item) => String(item.postId) === String(postId))
const userDisplaySignature = (user: User) => {
  const signature = user.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '技术经验主页'
}
const isSelf = (user: User) => Boolean(authStore.user && String(authStore.user.uid) === String(user.uid))
const updatePost = (postId: Post['postId'], updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const submitHeroSearch = () => {
  const q = heroKeyword.value.trim()
  router.push({ path: '/search', query: q ? { q } : {} })
}

const toggleContentType = (type: number) => {
  activeContentType.value = activeContentType.value === type ? undefined : type
}

const switchFeedAfterError = (feed: FeedType) => {
  activeFeed.value = feed
  activeContentType.value = undefined
  setTimeout(() => {
    refetch()
  }, 0)
}

const handleLike = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  await toggleLike(post)
}

const handleFavorite = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  await toggleFavorite(post)
}

const handlePostAuthorFollowChange = (authorUid: User['uid'], following: boolean) => {
  posts.value.forEach((post) => {
    if (String(post.author.uid) === String(authorUid)) {
      post.author.isFollowing = following
    }
  })
  recommendedUsers.value.forEach((user) => {
    if (String(user.uid) === String(authorUid)) {
      user.isFollowing = following
    }
  })
}

const handleRecommendFeedback = async (postId: Post['postId'], reason: string) => {
  if (!requireLogin()) return
  try {
    await feedApi.recordFeedback(postId, reason)
    locallyHiddenPostIds.value = new Set(locallyHiddenPostIds.value).add(String(postId))
    toast.success('已减少类似推荐')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '推荐反馈提交失败'))
  }
}

const toggleFollowUser = async (user: User) => {
  if (!requireLogin()) return
  if (isSelf(user)) return
  const uid = String(user.uid)
  followingBusyIds.value = new Set(followingBusyIds.value).add(uid)
  const wasFollowing = Boolean(user.isFollowing)
  try {
    if (wasFollowing) {
      await userApi.unfollow(user.uid)
    } else {
      await userApi.follow(user.uid)
    }
    user.isFollowing = !wasFollowing
    user.followerCount = Math.max(0, (user.followerCount ?? 0) + (wasFollowing ? -1 : 1))
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    const next = new Set(followingBusyIds.value)
    next.delete(uid)
    followingBusyIds.value = next
  }
}

onMounted(async () => {
  if (route.query.feed === 'featured') {
    activeFeed.value = 'featured'
  }
  const [tagRes, topicRes, userRes, latestRes, hotRes, recommendRes] = await Promise.allSettled([
    postApi.getTags(),
    postApi.listTopics({ featured: true, limit: 6 }),
    userApi.searchUsers('', 6),
    feedApi.getLatest(undefined, 6, activeDomain.value),
    feedApi.getHot(undefined, 6, activeDomain.value),
    feedApi.getRecommend(undefined, 6, activeDomain.value),
  ])
  if (tagRes.status === 'fulfilled') {
    tags.value = filterPublicContent(tagRes.value.data || [])
  }
  if (topicRes.status === 'fulfilled') {
    topics.value = filterPublicContent(topicRes.value.data || [])
  }
  if (userRes.status === 'fulfilled') {
    recommendedUsers.value = filterPublicContent(userRes.value.data || [])
  }
  const feedCounts = [latestRes, hotRes, recommendRes]
    .filter((res): res is PromiseFulfilledResult<Awaited<ReturnType<typeof feedApi.getLatest>>> => res.status === 'fulfilled')
    .map((res) => filterPublicContent(res.value.data?.items || []).length)
  sampledFeedContentCount.value = Math.max(0, ...feedCounts)
})
</script>

<style scoped>
.metric-tile {
  position: relative;
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid;
  padding: 1rem;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.72);
}

.metric-tile::before {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  content: '';
  background: linear-gradient(90deg, rgb(79 70 229), rgb(20 184 166));
  opacity: 0.76;
}

.metric-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.metric-value {
  display: block;
  margin-top: 0.35rem;
  min-height: 2.125rem;
  font-size: 1.65rem;
  line-height: 1.15;
  color: rgb(15 23 42);
}

.quick-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid;
  padding: 0.75rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.quick-input:focus {
  border-color: rgb(165 180 252);
  background: white;
  box-shadow: 0 0 0 3px rgb(224 231 255);
}

.profile-stat {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240 / 0.8);
  background: rgb(248 250 252);
  padding: 0.85rem 0.5rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.profile-stat:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
}

.profile-stat span,
.profile-stat small {
  display: block;
}

.profile-stat span {
  font-weight: 900;
  color: rgb(79 70 229);
}

.profile-stat small {
  margin-top: 0.1rem;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.channel-chip {
  display: inline-flex;
  min-height: 2.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255 / 0.85);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

@media (max-width: 640px) {
  .home-metric-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .metric-tile {
    min-height: 3.75rem;
    padding: 0.55rem 0.45rem;
    text-align: center;
  }

  .metric-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.68rem;
  }

  .metric-value {
    margin-top: 0.25rem;
    min-height: 1.5rem;
    font-size: 1.15rem;
  }
}

@media (max-width: 420px) {
  .metric-tile {
    padding: 0.5rem 0.35rem;
  }

  .metric-value {
    min-height: 1.4rem;
    font-size: 1.05rem;
  }

  .channel-chip {
    min-height: 44px;
    padding: 0.45rem 0.8rem;
  }
}

.channel-chip:hover,
.channel-chip-active {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.feed-error-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
}

.feed-error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.feed-error-actions > * {
  min-height: 2.5rem;
}

.dark .profile-stat {
  border-color: rgb(51 65 85 / 0.8);
  background: rgb(15 23 42 / 0.75);
}

.dark .channel-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42 / 0.75);
  color: rgb(203 213 225);
}

.dark .channel-chip:hover,
.dark .channel-chip-active {
  border-color: rgb(67 56 202);
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}

.dark .metric-label,
.dark .profile-stat small {
  color: rgb(148 163 184);
}

.dark .metric-tile {
  border-color: rgba(99, 102, 241, 0.28);
  background: rgba(15, 23, 42, 0.86);
  box-shadow:
    inset 0 1px 0 rgb(148 163 184 / 0.12),
    0 12px 30px rgb(2 6 23 / 0.22);
}

.dark .metric-value {
  color: #f8fafc;
  text-shadow: 0 1px 8px rgb(99 102 241 / 0.18);
}

.dark .quick-input:focus {
  border-color: rgb(67 56 202);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 3px rgb(49 46 129 / 0.55);
}

.dark .profile-stat:hover {
  border-color: rgb(67 56 202);
  background: rgb(30 41 59);
}
</style>
