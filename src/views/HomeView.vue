<template>
  <div class="app-shell community-home">
    <AppHeader />
    <main class="community-home-main mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:py-7">
      <div class="community-feed-layout">
        <aside class="community-feed-layout__left hidden lg:block">
          <div class="sticky top-24 space-y-5">
            <nav class="home-channel-nav" aria-label="首页频道">
              <div class="home-rail-heading">
                <p class="home-rail-label">频道</p>
                <RouterLink to="/explore">全部</RouterLink>
              </div>
              <router-link
                :to="homeDomainLocation()"
                :replace="false"
                class="home-channel-link"
                :class="{ 'home-channel-link--active': activeDomain === undefined }"
              >
                <span class="home-channel-link__icon">全</span>
                综合
              </router-link>
              <router-link
                v-for="d in homeDomainOptions"
                :key="d.domain"
                :to="homeDomainLocation(d.domain === activeDomain ? undefined : Number(d.domain))"
                :replace="false"
                class="home-channel-link"
                :class="{ 'home-channel-link--active': d.domain === activeDomain }"
              >
                <span class="home-channel-link__icon">{{ d.icon }}</span>
                <span class="truncate">{{ d.domainName }}</span>
              </router-link>
              <RouterLink to="/explore" class="home-channel-link home-channel-link--discover">
                <Compass class="h-4 w-4" />
                逛逛发现
              </RouterLink>
              <RouterLink to="/editor" class="home-channel-publish">
                <PenLine class="h-4 w-4" />
                发布内容
              </RouterLink>
            </nav>

            <section class="home-profile-panel">
              <template v-if="authStore.isLoggedIn && authStore.user">
                <div class="flex items-start gap-3">
                  <UserAvatar
                    class="home-profile-avatar"
                    :src="authStore.user.avatar"
                    :name="authStore.user.nickname"
                    alt=""
                  />
                  <div class="min-w-0">
                    <h3 class="truncate font-black text-slate-950 dark:text-white">{{ authStore.user.nickname }}</h3>
                    <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {{ currentUserSignature }}
                    </p>
                  </div>
                </div>
                <div class="home-profile-stats">
                  <RouterLink to="/me" class="profile-stat">
                    <span>{{ authStore.user.postCount ?? 0 }}</span>
                    <small>帖子</small>
                  </RouterLink>
                  <RouterLink to="/me" class="profile-stat">
                    <span>{{ authStore.user.followerCount ?? 0 }}</span>
                    <small>粉丝</small>
                  </RouterLink>
                </div>
                <RouterLink to="/series/workbench" class="home-profile-collection-link">
                  <Library class="h-4 w-4" />
                  <span>内容合集</span>
                </RouterLink>
              </template>
              <template v-else>
                <div class="home-profile-empty">
                  <p class="home-rail-label">个人空间</p>
                  <h3>把每一次经历留在这里</h3>
                  <p>登录后发布、收藏和关注，都能在个人主页继续整理。</p>
                  <RouterLink to="/login" class="primary-action">
                    登录
                  </RouterLink>
                </div>
              </template>
            </section>

            <section
              v-for="section in taskSections"
              :key="section.taskType"
              class="home-task-panel"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="task-section-label">
                    {{ section.taskType === 'DAILY' ? '今日行动' : '新用户引导' }}
                  </p>
                  <h3 class="font-black text-slate-950 dark:text-white">{{ section.title }}</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ section.subtitle }}</p>
                </div>
                <span class="task-progress-pill">{{ taskProgressLabel(section) }}</span>
              </div>
              <div class="mt-4 space-y-3">
                <div
                  v-for="item in section.items"
                  :key="`${section.taskType}:${item.taskCode}`"
                  class="task-item"
                  :class="{ 'task-item-complete': item.completed }"
                >
                  <div class="min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="task-check">{{ item.completed ? '✓' : '·' }}</span>
                      <h4 class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</h4>
                    </div>
                    <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ item.description }}</p>
                  </div>
                  <button
                    type="button"
                    class="task-action-button"
                    :disabled="isTaskBusy(section.taskType, item.taskCode)"
                    @click="handleTaskAction(section, item)"
                  >
                    {{ item.completed ? '已完成' : (item.actionText || '去完成') }}
                  </button>
                </div>
              </div>
            </section>

            <section class="home-rail-section home-tag-panel">
              <div class="home-rail-section__title">
                <h3>热门标签</h3>
                <Tag class="h-4 w-4" />
              </div>
              <div class="home-tag-list">
                <RouterLink
                  v-for="tag in topTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="home-tag-link"
                >
                  {{ tag.name }}
                </RouterLink>
              </div>
            </section>
          </div>
        </aside>

        <section class="home-feed-column min-w-0">
          <section class="home-feed-intro">
            <div>
              <p class="home-rail-label">{{ activeDomainMeta?.domainName || '综合频道' }}</p>
              <h1>{{ activeDomainMeta?.domainName ? `${activeDomainMeta.domainName}的真实经验` : '发现真实经验，分享有用内容' }}</h1>
              <p>{{ activeDomainMeta?.description || '从社区正在讨论的话题、可复用的攻略和不同频道的日常见闻里，找到下一条值得读的内容。' }}</p>
            </div>
            <RouterLink to="/editor" class="home-feed-intro__publish">
              <PenLine class="h-4 w-4" />
              写一篇
            </RouterLink>
            <div class="home-mobile-channels" aria-label="移动频道导航">
              <router-link :to="homeDomainLocation()" :replace="false" :class="{ 'home-mobile-channels__item--active': activeDomain === undefined }">综合</router-link>
              <router-link
                v-for="d in homeDomainOptions"
                :key="`mobile-${d.domain}`"
                :to="homeDomainLocation(Number(d.domain))"
                :replace="false"
                :class="{ 'home-mobile-channels__item--active': d.domain === activeDomain }"
              >
                {{ d.icon }} {{ d.domainName }}
              </router-link>
            </div>
            <div class="home-reading-pulse" aria-label="社区动态入口">
              <button
                v-for="entry in hotRisingEntries"
                :key="entry.key"
                type="button"
                class="home-reading-pulse__item"
                :class="`home-reading-pulse__item--${entry.tone}`"
                @click="setHomeFeed(entry.feed)"
              >
                <component :is="entry.icon" class="h-3.5 w-3.5" />
                <span>{{ entry.badge }}</span>
                <strong>{{ entry.title }}</strong>
              </button>
            </div>
          </section>

          <section
            v-for="section in taskSections"
            :key="`mobile-${section.taskType}`"
            class="home-task-panel home-task-panel--mobile lg:hidden"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="task-section-label">
                  {{ section.taskType === 'DAILY' ? '今日行动' : '新用户引导' }}
                </p>
                <h3 class="font-black text-slate-950 dark:text-white">{{ section.title }}</h3>
                <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ section.subtitle }}</p>
              </div>
              <span class="task-progress-pill">{{ taskProgressLabel(section) }}</span>
            </div>
            <div class="mt-4 space-y-3">
              <div
                v-for="item in section.items"
                :key="`mobile-${section.taskType}:${item.taskCode}`"
                class="task-item"
                :class="{ 'task-item-complete': item.completed }"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="task-check">{{ item.completed ? '✓' : '·' }}</span>
                    <h4 class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</h4>
                  </div>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ item.description }}</p>
                </div>
                <button
                  type="button"
                  class="task-action-button"
                  :disabled="isTaskBusy(section.taskType, item.taskCode)"
                  @click="handleTaskAction(section, item)"
                >
                  {{ item.completed ? '已完成' : (item.actionText || '去完成') }}
                </button>
              </div>
            </div>
          </section>

          <OperationSlotCard class="home-operation-slot" slot-code="HOME_FEATURED" />

          <div class="home-feed-controls">
            <FeedTabs
              class="home-feed-tabs"
              :model-value="activeFeed"
              :tabs="homeFeedTabs"
              :loading="feedPreferenceStatus === 'loading'"
              :error="feedPreferenceStatus === 'error' ? feedPreferenceError : ''"
              @update:model-value="setHomeFeed"
              @retry="loadFeedPreferences"
            />
            <p class="home-feed-description">
              {{ feedDescriptions[activeFeed] }}
              <span v-if="activeFeed === 'recommend'" class="mt-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                推荐理由会结合兴趣设置、内容标签、近期热度和新内容信号生成。
              </span>
            </p>
            <div class="home-content-types">
              <div class="home-content-types__label">
                <Sparkles class="h-3.5 w-3.5" />
                内容频道
              </div>
              <div class="home-content-types__list">
                <button
                  type="button"
                  class="channel-chip"
                  @click="router.push({ path: '/search', query: { mode: 'posts', sort: 'hot' } })"
                >
                  全部
                </button>
                <RouterLink
                  v-for="type in contentTypeChannels"
                  :key="type.value"
                  :to="contentTypeHref(type.value)"
                  class="channel-chip"
                >
                  {{ type.shortLabel }}
                </RouterLink>
              </div>
            </div>
          </div>

          <section v-if="authStore.isLoggedIn" class="feed-control-manager" data-v30-feed-control-entry>
            <header>
              <div>
                <p class="home-rail-label">个人设置</p>
                <h2>信息流控制</h2>
                <span>隐藏内容、减少频道内容和屏蔽作者都在同一个设置页管理。</span>
              </div>
              <RouterLink :to="{ path: '/me/settings', query: { tab: 'feed-controls' } }" class="secondary-action">
                管理设置
              </RouterLink>
            </header>
          </section>

          <section v-if="activeDomain" class="channel-hot-board" data-v30-channel-hot-board>
            <header class="channel-hot-board__head">
              <div>
                <p class="home-rail-label">频道热榜</p>
                <h2>{{ activeDomainMeta?.domainName || '当前频道' }}</h2>
              </div>
              <span>公开内容</span>
            </header>
            <div v-if="isChannelHotBoardLoading" class="channel-hot-board__state" role="status">
              <Loader2 class="h-4 w-4 animate-spin" />
              正在整理频道热榜
            </div>
            <div v-else-if="channelHotBoardError" class="channel-hot-board__state channel-hot-board__state--error" role="alert">
              {{ channelHotBoardError }}
            </div>
            <div v-else-if="channelHotBoard?.items?.length" class="channel-hot-board__list">
              <RouterLink
                v-for="entry in channelHotBoard.items"
                :key="String(entry.item.postId)"
                :to="`/post/${entry.item.postId}`"
                class="channel-hot-board__item"
              >
                <strong>{{ entry.rank }}</strong>
                <span>
                  <b>{{ entry.item.title }}</b>
                  <small>{{ entry.reasonText }}</small>
                </span>
              </RouterLink>
            </div>
            <div v-else class="channel-hot-board__state">
              当前频道还没有可展示的热门内容。
            </div>
          </section>

          <div class="home-feed-list">
            <LoadingSkeleton v-if="isLoading" variant="feed" />
            <div v-else-if="isError && !visiblePosts.length" class="surface-card feed-error-card p-6">
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
                :show-feed-controls="true"
                :like-pending="isActionPending('like', post.postId)"
                :favorite-pending="isActionPending('favorite', post.postId)"
                :feed-feedback-action="feedPreferenceActionFor(post.postId)"
                :feed-feedback-pending="feedFeedbackPendingIds.has(String(post.postId))"
                :feed-feedback-error="feedFeedbackErrors[String(post.postId)]"
                @like="handleLike"
                @favorite="handleFavorite"
                @feed-feedback="handleFeedControl"
                @block-author="handleAuthorBlock"
                @follow-change="handlePostAuthorFollowChange"
              />
            </template>
            <EmptyState
              v-else
              :title="emptyFeedTitle"
              :description="emptyFeedDescription"
              :action-text="emptyFeedActionText"
              :action-href="emptyFeedActionHref"
            />
          </div>

          <div v-if="feedUndo" class="feed-undo-banner" role="status" aria-live="polite">
            <span>已暂时隐藏“{{ feedUndo.title }}”</span>
            <button
              type="button"
              :disabled="feedFeedbackPendingIds.has(feedUndo.postId)"
              @click="restoreFeedControl(feedUndo.postId)"
            >
              撤销
            </button>
          </div>

          <div v-if="isError && visiblePosts.length && !isFetching" class="feed-loadmore-error mt-6">
            <span>{{ feedErrorText }}</span>
            <button type="button" class="secondary-action px-5" @click="() => fetchNextPage()">重试加载更多</button>
          </div>

          <div v-else-if="hasNextPage && !isFetching" class="mt-6 text-center">
            <button type="button" class="secondary-action px-6" @click="() => fetchNextPage()">
              加载更多
            </button>
          </div>

          <div v-if="isFetching" class="mt-6">
            <LoadingSkeleton variant="feed" />
          </div>
        </section>

        <aside class="community-feed-layout__right hidden lg:block">
          <div class="home-right-rail sticky top-24">
            <section class="home-rail-section home-rail-section--featured">
              <div class="home-rail-section__title">
                <h3>精选内容</h3>
                <Sparkles class="h-4 w-4" />
              </div>
              <div v-if="featuredPreview.length" class="home-featured-list">
                <RouterLink
                  v-for="(post, index) in featuredPreview"
                  :key="post.postId"
                  :to="`/post/${post.postId}`"
                  class="home-featured-row"
                >
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>
                  <h4>{{ post.title }}</h4>
                </RouterLink>
              </div>
              <p v-else class="home-rail-section__empty">
                切到精选信息流可查看运营标记的高质量内容。
              </p>
            </section>

            <section class="home-rail-section">
              <div class="home-rail-section__title">
                <h3>热门话题</h3>
                <Compass class="h-4 w-4" />
              </div>
              <div class="home-topic-list">
                <RouterLink
                  v-for="topic in topicItems"
                  :key="topic.name"
                  :to="topic.href"
                  class="home-topic-row"
                >
                  <span>{{ topic.name }}</span>
                  <small>{{ topic.count }}</small>
                </RouterLink>
              </div>
            </section>

            <section class="home-rail-section">
              <div class="home-rail-section__title">
                <h3>标签热度</h3>
                <TrendingUp class="h-4 w-4" />
              </div>
              <div class="home-trending-list">
                <RouterLink
                  v-for="(tag, index) in trendingTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="home-trending-row"
                >
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>
                  <strong>{{ tag.name }}</strong>
                  <small>{{ tag.count ?? 0 }}</small>
                </RouterLink>
              </div>
            </section>

            <section class="home-rail-section">
              <div class="home-rail-section__title">
                <h3>推荐作者</h3>
                <Users class="h-4 w-4" />
              </div>
              <div class="home-author-list">
                <div
                  v-for="user in recommendedUsers"
                  :key="user.uid"
                  class="home-author-row"
                >
                  <RouterLink :to="`/u/${user.uid}`" class="flex min-w-0 flex-1 items-center gap-3">
                    <UserAvatar
                      class="home-author-avatar"
                      :src="user.avatar"
                      :name="user.nickname"
                      alt=""
                    />
                    <div class="min-w-0">
                      <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ user.nickname }}</div>
                      <div class="truncate text-xs text-slate-500 dark:text-slate-400">{{ userDisplaySignature(user) }}</div>
                    </div>
                  </RouterLink>
                  <button
                    type="button"
                    class="home-follow-button"
                    :class="{ 'home-follow-button--following': user.isFollowing }"
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
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { Compass, Library, Loader2, PenLine, Sparkles, Tag, TrendingUp, Users } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import { useInfiniteFeed, type FeedType } from '@/composables/useInfiniteFeed'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { taskApi, type UserTaskItem, type UserTaskOverview } from '@/api/tasks'
import { userApi } from '@/api/user'
import {
  feedApi,
  type ChannelHotBoard,
  type FeedbackReasonCode,
  type FeedControlAction,
  type FeedPreference,
} from '@/api/feed'
import { usePostInteraction } from '@/composables/usePostInteraction'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import OperationSlotCard from '@/components/operations/OperationSlotCard.vue'
import FeedTabs from '@/components/feed/FeedTabs.vue'
import { useDomainCatalog } from '@/composables/useDomainCatalog'
import type { CommunityTopic, Post, Tag as PostTag, User } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES } from '@/utils/contentTypes'
import { buildTopicItems, isFeaturedPost } from '@/utils/communityMetrics'
import { filterPublicContent, isSyntheticVisibleText } from '@/utils/textQuality'
import {
  findHighRiskContentWarning,
  filterVisiblePosts,
  normalizeRecommendationReason,
} from '@/utils/recommendationGovernance'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const queryClient = useQueryClient()
const { requireLogin } = useLoginRedirect()

const feedTabs: FeedType[] = ['following', 'recommend', 'latest', 'hot', 'featured']
const feedTypeSet = new Set(feedTabs)
const firstQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value
const parseFeedType = (value: unknown): FeedType => {
  const normalized = String(firstQueryValue(value) || '').toLowerCase() as FeedType
  if (!feedTypeSet.has(normalized)) return 'recommend'
  if (normalized === 'following' && !authStore.isLoggedIn) return 'recommend'
  return normalized
}
const activeFeed = ref<FeedType>(parseFeedType(route.query.feed))
const onboardingOverview = ref<UserTaskOverview | null>(null)
const dailyOverview = ref<UserTaskOverview | null>(null)
const { domains: homeDomainOptions, loadDomains: loadHomeDomains } = useDomainCatalog()
const hotPreviewPosts = ref<Post[]>([])
const latestPreviewPosts = ref<Post[]>([])
const recommendPreviewPosts = ref<Post[]>([])
const activeDomain = computed(() => {
  const q = Number(route.query.domain)
  return homeDomainOptions.value.some((item) => Number(item.domain) === q) ? q : undefined
})
interface HotRisingEntry {
  key: string
  title: string
  badge: string
  sampleTitle: string
  reason: string
  feed: FeedType
  icon: Component
  tone: 'hot' | 'rising' | 'featured'
}
const feedLabels: Record<FeedType, string> = {
  following: '关注',
  recommend: '推荐',
  latest: '最新',
  hot: '热门',
  featured: '精选',
}
const feedDescriptions: Record<FeedType, string> = {
  following: '只看你关注作者的最新动态，适合持续追踪熟悉的社区内容。',
  recommend: '结合公开的兴趣设置、内容标签和社区热度重排，优先展示更贴近你关注点的社区内容。',
  latest: '按发布时间倒序展示公开内容，适合快速浏览新发布的文章、复盘和问答。',
  hot: '按浏览、点赞、收藏、评论和发布时间计算热度，适合查看正在升温的社区内容。',
  featured: '展示管理员或运营标记的高质量内容，适合作为首页精选和专题沉淀入口。',
}

const tags = ref<PostTag[]>([])
const topics = ref<CommunityTopic[]>([])
const recommendedUsers = ref<User[]>([])
const sampledFeedContentCount = ref(0)
const followingBusyIds = ref(new Set<string>())
const taskBusyKeys = ref(new Set<string>())
const locallyHiddenPostIds = ref(new Set<string>())
const feedPreferences = ref<Record<string, FeedPreference>>({})
const feedFeedbackPendingIds = ref(new Set<string>())
const feedFeedbackErrors = ref<Record<string, string | undefined>>({})
const feedPreferenceStatus = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
const feedPreferenceError = ref('')
const feedUndo = ref<{ postId: string; title: string } | null>(null)
const channelHotBoard = ref<ChannelHotBoard | null>(null)
const isChannelHotBoardLoading = ref(false)
const channelHotBoardError = ref('')
const { posts, error: feedError, fetchNextPage, hasNextPage, isError, isFetching, isLoading, refetch } = useInfiniteFeed(activeFeed, activeDomain)
const homeFeedTabs = computed(() => feedTabs.map((value) => ({
  value,
  label: feedLabels[value],
  disabled: value === 'following' && !authStore.isLoggedIn,
  panelId: 'home-feed-panel',
})))

const sortedTags = computed(() => [...tags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const topTags = computed(() => sortedTags.value.slice(0, 10))
const trendingTags = computed(() => sortedTags.value.slice(0, 6))
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const activeDomainMeta = computed(() => (
  homeDomainOptions.value.find((item) => Number(item.domain) === Number(activeDomain.value))
  ?? null
))
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
const cleanPosts = computed(() => filterVisiblePosts(filterPublicContent(posts.value)))
const featuredPreview = computed(() => cleanPosts.value.filter(isFeaturedPost).slice(0, 3))
const visiblePosts = computed(() => {
  return cleanPosts.value.filter((post) => !locallyHiddenPostIds.value.has(String(post.postId)))
})
const explainHotReason = (post: Post | undefined, fallback: string) => {
  if (!post) return fallback
  const riskWarning = findHighRiskContentWarning([
    post.title,
    post.summary,
    post.content,
    post.tags.map((tag) => tag.name).join(' '),
  ].filter(Boolean).join(' '))
  if (riskWarning) return riskWarning
  const commentCount = Number(post.counter?.comment || 0)
  const favoriteCount = Number(post.counter?.favorite || 0)
  const likeCount = Number(post.counter?.like || 0)
  const reasons = post.recommendationReasons || []
  const normalizedReason = reasons.map(normalizeRecommendationReason).find(Boolean)
  if (normalizedReason) return normalizedReason
  if (commentCount > 0) return `近期有 ${commentCount} 条讨论`
  if (favoriteCount > 0) return `同频道有 ${favoriteCount} 次收藏`
  if (likeCount > 0) return `社区成员有 ${likeCount} 次认可`
  return fallback
}
const hotRisingEntries = computed<HotRisingEntry[]>(() => {
  const hot = hotPreviewPosts.value[0] || cleanPosts.value.find((post) => Number(post.counter?.comment || 0) > 0)
  const rising = latestPreviewPosts.value[0] || cleanPosts.value[0]
  const featured = (recommendPreviewPosts.value.find(isFeaturedPost) || featuredPreview.value[0] || recommendPreviewPosts.value[0])
  return [
    {
      key: 'hot',
      title: '热门讨论',
      badge: '正在升温',
      sampleTitle: hot?.title || '查看正在被讨论的公开内容',
      reason: explainHotReason(hot, '按浏览、评论、收藏和发布时间综合排序'),
      feed: 'hot',
      icon: TrendingUp,
      tone: 'hot',
    },
    {
      key: 'rising',
      title: '最新上升',
      badge: '新发布',
      sampleTitle: rising?.title || '先看最近发布且可参与的内容',
      reason: explainHotReason(rising, '新发布内容会优先显示可读的公开信号'),
      feed: 'latest',
      icon: Sparkles,
      tone: 'rising',
    },
    {
      key: 'featured',
      title: '频道精选',
      badge: '精选方向',
      sampleTitle: featured?.title || '从频道精选方向进入发现页',
      reason: explainHotReason(featured, '优先复用运营精选、频道和公开标签信号'),
      feed: 'featured',
      icon: Compass,
      tone: 'featured',
    },
  ]
})
const currentUserSignature = computed(() => {
  const signature = authStore.user?.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '完善个人资料，让更多社区成员了解你的关注方向'
})
const taskSections = computed(() => {
  if (!authStore.isLoggedIn) return []
  const sections: UserTaskOverview[] = []
  if (onboardingOverview.value && (onboardingOverview.value.active || (onboardingOverview.value.completedCount ?? 0) > 0)) {
    sections.push(onboardingOverview.value)
  }
  if (dailyOverview.value?.items?.length) {
    sections.push(dailyOverview.value)
  }
  return sections
})
const feedErrorText = computed(() => getErrorMessage(feedError.value, '当前信息流暂时不可用，请稍后重试。'))
const homeFallbackQuestionQuery = computed(() => {
  const keyword = topTags.value[0]?.name || ''
  return keyword ? { q: keyword } : {}
})
const emptyFeedTitle = computed(() => {
  if (activeFeed.value === 'following') return '还没有关注动态'
  if (activeFeed.value === 'latest' && sampledFeedContentCount.value > 0) return '最新暂时没有新内容'
  return '暂时没有内容'
})
const emptyFeedDescription = computed(() => {
  if (activeFeed.value === 'following') return '先从发现页关注几位分享真实经验、资源推荐和生活攻略的作者。'
  if (activeFeed.value === 'latest' && sampledFeedContentCount.value > 0) return '推荐和热门里还有可读内容，也可以去发现页看看频道广场和热门话题。'
  return '可以先看推荐内容、逛发现页，或把最近一次经历、问题、清单写成一篇内容。'
})
const emptyFeedActionText = computed(() => activeFeed.value === 'following' ? '去发现作者' : '去发现内容')
const emptyFeedActionHref = computed(() => '/explore')

const findPost = (postId: Post['postId']) => posts.value.find((item) => String(item.postId) === String(postId))
const userDisplaySignature = (user: User) => {
  const signature = user.signature?.trim()
  return signature && !isSyntheticVisibleText(signature)
    ? signature
    : '实践经验主页'
}
const isSelf = (user: User) => Boolean(authStore.user && String(authStore.user.uid) === String(user.uid))
const taskProgressLabel = (section: UserTaskOverview) => `${section.completedCount ?? 0}/${section.totalCount ?? section.items.length}`
const taskBusyKey = (taskType: string, taskCode: string) => `${taskType}:${taskCode}`
const isTaskBusy = (taskType: string, taskCode: string) => taskBusyKeys.value.has(taskBusyKey(taskType, taskCode))
const updatePost = (postId: Post['postId'], updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

// 客户端兜底引导：仅在后端引导接口不可用时使用。全部是导航型任务，不会误报“已完成”。
const fallbackOnboardingOverview = (): UserTaskOverview => ({
  taskType: 'ONBOARDING',
  title: '欢迎加入社区',
  subtitle: '先完成这几步，快速熟悉闻野。',
  active: true,
  completedCount: 0,
  totalCount: 3,
  items: [
    {
      taskCode: 'fallback-explore',
      title: '逛逛社区内容',
      description: '从发现页看看不同频道正在讨论的真实经验。',
      actionText: '去发现',
      actionRoute: '/explore',
      manualCompletable: false,
      completed: false,
    },
    {
      taskCode: 'fallback-profile',
      title: '完善个人资料',
      description: '填写昵称和简介，让更多成员了解你的关注方向。',
      actionText: '去完善',
      actionRoute: '/me/settings',
      manualCompletable: false,
      completed: false,
    },
    {
      taskCode: 'fallback-publish',
      title: '发布第一篇内容',
      description: '把最近一次经历、问题或清单写成一篇内容。',
      actionText: '去发布',
      actionRoute: '/editor',
      manualCompletable: false,
      completed: false,
    },
  ],
})

// 面板里是否还有未完成任务：全部完成后交互就不必再打任务接口。
// 这里不能只看手动任务——点赞/收藏正是用来自动完成非手动任务的，所以只按完成态判断。
const hasIncompleteTasks = computed(() => taskSections.value.some(
  (section) => section.items.some((item) => !item.completed),
))

// 交互（点赞/收藏/关注）触发的刷新：只有当仍有未完成任务、且已登录时才刷新，避免每次互动都打接口。
const refreshTaskPanelsIfNeeded = async () => {
  if (!authStore.isLoggedIn) return
  if (!hasIncompleteTasks.value) return
  await refreshTaskPanels()
}

const refreshTaskPanels = async () => {
  if (!authStore.isLoggedIn) {
    onboardingOverview.value = null
    dailyOverview.value = null
    return
  }
  const [onboardingRes, dailyRes] = await Promise.allSettled([
    taskApi.getOnboardingTasks(),
    taskApi.getDailyTasks(),
  ])
  if (onboardingRes.status === 'fulfilled') {
    onboardingOverview.value = onboardingRes.value.data
  } else if (!onboardingOverview.value) {
    // 后端引导接口不可用时给一份客户端兜底，保证新用户至少看到可操作的上手路径。
    onboardingOverview.value = fallbackOnboardingOverview()
  }
  if (dailyRes.status === 'fulfilled') {
    dailyOverview.value = dailyRes.value.data
  }
}

const handleTaskAction = async (section: UserTaskOverview, item: UserTaskItem) => {
  const nextRoute = item.actionRoute || (section.taskType === 'DAILY' ? '/' : '/explore')
  if (item.completed || !item.manualCompletable) {
    await router.push(nextRoute)
    return
  }
  const busyKey = taskBusyKey(section.taskType, item.taskCode)
  taskBusyKeys.value = new Set(taskBusyKeys.value).add(busyKey)
  try {
    if (section.taskType === 'DAILY') {
      await taskApi.completeDailyTask(item.taskCode)
    } else {
      await taskApi.completeOnboardingTask(item.taskCode)
    }
    await refreshTaskPanels()
    await router.push(nextRoute)
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, '行动状态更新失败'))
  } finally {
    const next = new Set(taskBusyKeys.value)
    next.delete(busyKey)
    taskBusyKeys.value = next
  }
}

const contentTypeHref = (type: number): RouteLocationRaw => ({
  path: '/search',
  query: {
    mode: 'posts',
    type: String(type),
    sort: 'hot',
    ...(activeDomain.value ? { domain: String(activeDomain.value) } : {}),
  },
})

const homeDomainLocation = (domain?: number): RouteLocationRaw => ({
  path: '/',
  query: {
    feed: activeFeed.value,
    ...(domain ? { domain: String(domain) } : {}),
  },
})

const setHomeFeed = (feed: FeedType) => {
  const nextFeed = feed === 'following' && !authStore.isLoggedIn ? 'recommend' : feed
  if (activeFeed.value === nextFeed && firstQueryValue(route.query.feed) === nextFeed) return
  void router.push({
    path: route.path,
    query: {
      ...route.query,
      feed: nextFeed,
    },
  })
}

let feedPreferenceRequestGeneration = 0
let feedControlRevision = 0
const currentFeedAccountKey = () => `${String(authStore.user?.uid ?? '')}:${String(authStore.token ?? '')}`
const resetFeedControlState = () => {
  feedControlRevision += 1
  feedPreferences.value = {}
  locallyHiddenPostIds.value = new Set()
  feedFeedbackPendingIds.value = new Set()
  feedFeedbackErrors.value = {}
  feedPreferenceError.value = ''
  feedUndo.value = null
}

const loadFeedPreferences = async () => {
  const accountKey = currentFeedAccountKey()
  const requestGeneration = ++feedPreferenceRequestGeneration
  const controlRevision = feedControlRevision
  if (!authStore.isLoggedIn || !authStore.user?.uid || !authStore.token) {
    feedPreferenceStatus.value = 'idle'
    return
  }
  feedPreferenceStatus.value = 'loading'
  try {
    const res = await feedApi.listFeedbackPreferences(undefined, 100)
    if (requestGeneration !== feedPreferenceRequestGeneration || accountKey !== currentFeedAccountKey()) return
    if (controlRevision !== feedControlRevision) {
      feedPreferenceStatus.value = 'ready'
      return
    }
    const preferences = (res.data?.items || [])
      .filter((item) => String(item.postId))
    feedPreferences.value = Object.fromEntries(preferences.map((item) => [String(item.postId), item]))
    locallyHiddenPostIds.value = new Set(preferences
      .filter((item) => item.action === 'HIDE')
      .map((item) => String(item.postId)))
    feedPreferenceStatus.value = 'ready'
  } catch (error: unknown) {
    if (requestGeneration !== feedPreferenceRequestGeneration || accountKey !== currentFeedAccountKey()) return
    feedPreferenceStatus.value = 'error'
    feedPreferenceError.value = getErrorMessage(error, '信息流设置同步失败，不影响继续浏览。')
  }
}

const feedPreferenceActionFor = (postId: Post['postId']) =>
  feedPreferences.value[String(postId)]?.action

const switchFeedAfterError = (feed: FeedType) => {
  setHomeFeed(feed)
  setTimeout(() => {
    refetch()
  }, 0)
}

const handleLike = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  await toggleLike(post)
  await refreshTaskPanelsIfNeeded()
}

const handleFavorite = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  await toggleFavorite(post)
  await refreshTaskPanelsIfNeeded()
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

const setFeedFeedbackPending = (postId: Post['postId'], pending: boolean) => {
  const id = String(postId)
  const next = new Set(feedFeedbackPendingIds.value)
  if (pending) next.add(id)
  else next.delete(id)
  feedFeedbackPendingIds.value = next
}

const setFeedFeedbackError = (postId: Post['postId'], message?: string) => {
  const id = String(postId)
  feedFeedbackErrors.value = { ...feedFeedbackErrors.value, [id]: message }
}

const feedControlErrorMessage = (error: unknown, action: FeedControlAction) => {
  const candidate = error as { code?: unknown; response?: { status?: unknown } } | null | undefined
  const code = Number(candidate?.code || 0)
  if (code === 20002) return '缓存服务暂时不可用，信息流设置尚未生效，请稍后重试。'
  if (code === 20001) return '设置未能持久化，刷新或换设备后可能无法保留，请稍后重试。'
  if (action === 'RESTORE') return getErrorMessage(error, '恢复失败，原有信息流设置仍然保留。')
  return getErrorMessage(error, '信息流控制提交失败，当前内容不会被误隐藏。')
}

const handleFeedControl = async (
  postId: Post['postId'],
  action: FeedControlAction,
  reasonCode?: FeedbackReasonCode,
) => {
  if (!requireLogin()) return false
  const id = String(postId)
  const accountKey = currentFeedAccountKey()
  const post = findPost(postId)
  setFeedFeedbackPending(postId, true)
  setFeedFeedbackError(postId)
  try {
    if (action === 'RESTORE') {
      await feedApi.restoreFeedback(postId)
    } else {
      await feedApi.recordFeedback(
        postId,
        action,
        reasonCode ? `v30:${reasonCode.toLowerCase()}` : (action === 'HIDE' ? 'user_hide' : 'user_less_like_this'),
        reasonCode,
      )
    }
    if (accountKey !== currentFeedAccountKey()) return
    feedControlRevision += 1
    if (action === 'RESTORE') {
      const next = { ...feedPreferences.value }
      delete next[id]
      feedPreferences.value = next
      const hidden = new Set(locallyHiddenPostIds.value)
      hidden.delete(id)
      locallyHiddenPostIds.value = hidden
      if (feedUndo.value?.postId === id) feedUndo.value = null
      toast.success('已恢复默认信息流设置')
      return true
    }
    const preference: FeedPreference = {
      postId,
      action,
      reason: reasonCode ? `v30:${reasonCode.toLowerCase()}` : (action === 'HIDE' ? 'user_hide' : 'user_less_like_this'),
      reasonCode,
    }
    feedPreferences.value = {
      ...feedPreferences.value,
      [id]: preference,
    }
    if (action === 'HIDE') {
      locallyHiddenPostIds.value = new Set(locallyHiddenPostIds.value).add(id)
      feedUndo.value = { postId: id, title: post?.title || '当前内容' }
      toast.success('当前内容已暂时隐藏，可撤销')
    } else {
      feedUndo.value = null
      toast.success('已减少同类内容，之后可以恢复默认')
    }
    return true
  } catch (error: unknown) {
    if (accountKey !== currentFeedAccountKey()) return
    const message = feedControlErrorMessage(error, action)
    setFeedFeedbackError(postId, message)
    toast.error(message)
    return false
  } finally {
    if (accountKey === currentFeedAccountKey()) setFeedFeedbackPending(postId, false)
  }
}

const handleAuthorBlock = async (authorUid: User['uid'], postId: Post['postId']) => {
  if (!requireLogin()) return
  const accountKey = currentFeedAccountKey()
  setFeedFeedbackPending(postId, true)
  setFeedFeedbackError(postId)
  try {
    await feedApi.blockAuthor(authorUid)
    if (accountKey !== currentFeedAccountKey()) return
    const authorId = String(authorUid)
    locallyHiddenPostIds.value = new Set([
      ...locallyHiddenPostIds.value,
      ...posts.value
        .filter((post) => String(post.author.uid) === authorId)
        .map((post) => String(post.postId)),
    ])
    feedUndo.value = null
    toast.success('已屏蔽该作者；此设置仅影响你的信息流。')
  } catch (error: unknown) {
    if (accountKey !== currentFeedAccountKey()) return
    const message = getErrorMessage(error, '屏蔽作者失败，当前内容不会被误隐藏。')
    setFeedFeedbackError(postId, message)
    toast.error(message)
  } finally {
    if (accountKey === currentFeedAccountKey()) setFeedFeedbackPending(postId, false)
  }
}

const restoreFeedControl = (postId: Post['postId']) => handleFeedControl(postId, 'RESTORE')

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
    await queryClient.invalidateQueries({ queryKey: ['feed', 'following'] })
    await refreshTaskPanelsIfNeeded()
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    const next = new Set(followingBusyIds.value)
    next.delete(uid)
    followingBusyIds.value = next
  }
}

let homePreviewRequestId = 0
const loadHomePreviewPosts = async () => {
  const requestId = ++homePreviewRequestId
  const domainSnapshot = activeDomain.value
  const [latestRes, hotRes, recommendRes] = await Promise.allSettled([
    feedApi.getLatest(undefined, 6, domainSnapshot),
    feedApi.getHot(undefined, 6, domainSnapshot),
    feedApi.getRecommend(undefined, 6, domainSnapshot),
  ])
  if (requestId !== homePreviewRequestId || activeDomain.value !== domainSnapshot) return
  latestPreviewPosts.value = latestRes.status === 'fulfilled'
    ? filterVisiblePosts(filterPublicContent(latestRes.value.data?.items || []), 3)
    : []
  hotPreviewPosts.value = hotRes.status === 'fulfilled'
    ? filterVisiblePosts(filterPublicContent(hotRes.value.data?.items || []), 3)
    : []
  recommendPreviewPosts.value = recommendRes.status === 'fulfilled'
    ? filterVisiblePosts(filterPublicContent(recommendRes.value.data?.items || []), 3)
    : []
  const feedCounts = [latestRes, hotRes, recommendRes]
    .filter((res): res is PromiseFulfilledResult<Awaited<ReturnType<typeof feedApi.getLatest>>> => res.status === 'fulfilled')
    .map((res) => filterVisiblePosts(filterPublicContent(res.value.data?.items || [])).length)
  sampledFeedContentCount.value = Math.max(0, ...feedCounts)
}

onMounted(async () => {
  const [tagRes, topicRes, userRes] = await Promise.allSettled([
    postApi.getTags(),
    postApi.listTopics({ featured: true, limit: 6 }),
    userApi.searchUsers('', 6),
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
  await loadHomeDomains()
  await refreshTaskPanels()
})

watch(
  [() => firstQueryValue(route.query.feed), () => authStore.isLoggedIn],
  ([routeFeed]) => {
    const nextFeed = parseFeedType(routeFeed)
    if (activeFeed.value !== nextFeed) activeFeed.value = nextFeed
    if (String(routeFeed || '').toLowerCase() !== nextFeed) {
      void router.replace({
        path: route.path,
        query: {
          ...route.query,
          feed: nextFeed,
        },
      })
    }
  },
  { immediate: true },
)

watch(
  [() => firstQueryValue(route.query.domain), () => homeDomainOptions.value.map((item) => String(item.domain)).join(',')],
  ([routeDomain]) => {
    if (!homeDomainOptions.value.length) return
    const rawDomain = String(routeDomain || '')
    if (!rawDomain) return
    const normalizedDomain = String(Number(rawDomain))
    const valid = homeDomainOptions.value.some((item) => String(item.domain) === normalizedDomain)
    if (valid && rawDomain === normalizedDomain) return
    void router.replace({
      path: route.path,
      query: {
        ...route.query,
        domain: valid ? normalizedDomain : undefined,
      },
    })
  },
  { immediate: true },
)

let channelHotBoardRequestId = 0
const loadChannelHotBoard = async () => {
  const domain = activeDomain.value
  const requestId = ++channelHotBoardRequestId
  if (!domain) {
    channelHotBoard.value = null
    channelHotBoardError.value = ''
    isChannelHotBoardLoading.value = false
    return
  }
  isChannelHotBoardLoading.value = true
  channelHotBoardError.value = ''
  try {
    const res = await feedApi.getChannelHotBoard(domain, 5)
    if (requestId !== channelHotBoardRequestId || activeDomain.value !== domain) return
    channelHotBoard.value = res.data
  } catch (error: unknown) {
    if (requestId !== channelHotBoardRequestId || activeDomain.value !== domain) return
    channelHotBoard.value = null
    channelHotBoardError.value = getErrorMessage(error, '频道热榜暂时无法读取。')
  } finally {
    if (requestId === channelHotBoardRequestId && activeDomain.value === domain) {
      isChannelHotBoardLoading.value = false
    }
  }
}

watch(activeDomain, () => {
  void loadHomePreviewPosts()
  void loadChannelHotBoard()
}, { immediate: true })

watch([() => authStore.isLoggedIn, () => authStore.user?.uid], async ([loggedIn, ownerUid]) => {
  if (!loggedIn || ownerUid == null) {
    onboardingOverview.value = null
    dailyOverview.value = null
    return
  }
  await refreshTaskPanels()
})

watch(
  [() => authStore.user?.uid, () => authStore.token],
  async () => {
    feedPreferenceRequestGeneration += 1
    resetFeedControlState()
    await queryClient.invalidateQueries({ queryKey: ['feed'] })
    void refetch()
    void loadFeedPreferences()
  },
  { immediate: true },
)
</script>

<style scoped>
.home-series-mini-bar {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgb(226 232 240);
}

.home-series-mini-bar > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(37 99 235), rgb(14 165 233));
}

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
  font-size: 1.35rem;
  line-height: 1.15;
  color: rgb(15 23 42);
}

.home-action-card {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(255 255 255 / 0.88);
  padding: 1rem;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.home-action-card:hover {
  transform: translateY(-1px);
  border-color: rgb(165 180 252);
  background: rgb(248 250 252);
  box-shadow: 0 12px 30px rgb(15 23 42 / 0.08);
}

.home-action-card-primary {
  border-color: rgb(129 140 248 / 0.75);
  background: linear-gradient(135deg, rgb(238 242 255), rgb(240 253 250));
}

.home-action-icon {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: rgb(224 231 255);
  color: rgb(67 56 202);
}

.hot-rising-card {
  display: flex;
  min-width: 0;
  min-height: 9.5rem;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.55rem;
  border-radius: 0.8rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(255 255 255 / 0.82);
  padding: 0.95rem;
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}

.hot-rising-card:hover {
  transform: translateY(-1px);
  border-color: rgb(165 180 252);
  background: rgb(248 250 252);
  box-shadow: 0 12px 28px rgb(15 23 42 / 0.08);
}

.hot-rising-card__topline {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: rgb(79 70 229);
}

.hot-rising-card__badge {
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.26rem 0.58rem;
  font-size: 0.7rem;
  font-weight: 900;
}

.hot-rising-card strong {
  font-size: 0.96rem;
  line-height: 1.3;
  color: rgb(15 23 42);
}

.hot-rising-card__sample,
.hot-rising-card__reason {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  line-height: 1.55;
}

.channel-hot-board {
  border: 1px solid rgb(226 232 240 / 0.92);
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.86);
  padding: 1rem;
}

.channel-hot-board__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.channel-hot-board__head h2 {
  margin-top: 0.2rem;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 850;
}

.channel-hot-board__head > span {
  border-radius: 999px;
  background: rgb(240 253 250);
  padding: 0.25rem 0.55rem;
  color: rgb(15 118 110);
  font-size: 0.7rem;
  font-weight: 800;
}

.channel-hot-board__list {
  margin-top: 0.75rem;
  border-top: 1px solid rgb(241 245 249);
}

.channel-hot-board__item {
  display: grid;
  grid-template-columns: 1.75rem minmax(0, 1fr);
  gap: 0.65rem;
  align-items: start;
  border-bottom: 1px solid rgb(241 245 249);
  padding: 0.72rem 0;
}

.channel-hot-board__item:last-child {
  border-bottom: 0;
}

.channel-hot-board__item > strong {
  color: rgb(13 148 136);
  font-size: 1rem;
  line-height: 1.35;
}

.channel-hot-board__item b,
.channel-hot-board__item small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-hot-board__item b {
  color: rgb(15 23 42);
  font-size: 0.84rem;
  font-weight: 800;
}

.channel-hot-board__item small {
  margin-top: 0.22rem;
  color: rgb(100 116 139);
  font-size: 0.72rem;
}

.channel-hot-board__state {
  display: flex;
  min-height: 4rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
}

.channel-hot-board__state--error {
  color: rgb(190 24 93);
}

.dark .channel-hot-board {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(15 23 42 / 0.78);
}

.dark .channel-hot-board__head h2,
.dark .channel-hot-board__item b {
  color: rgb(248 250 252);
}

.dark .channel-hot-board__head > span {
  background: rgb(19 78 74 / 0.45);
  color: rgb(153 246 228);
}

.dark .channel-hot-board__list,
.dark .channel-hot-board__item {
  border-color: rgb(30 41 59);
}

.dark .channel-hot-board__item > strong {
  color: rgb(94 234 212);
}

.dark .channel-hot-board__item small,
.dark .channel-hot-board__state {
  color: rgb(148 163 184);
}

.hot-rising-card__sample {
  -webkit-line-clamp: 2;
  font-size: 0.82rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

.hot-rising-card__reason {
  margin-top: auto;
  -webkit-line-clamp: 2;
  font-size: 0.76rem;
  color: rgb(100 116 139);
}

.hot-rising-card--hot .hot-rising-card__topline {
  color: rgb(220 38 38);
}

.hot-rising-card--hot .hot-rising-card__badge {
  background: rgb(254 226 226);
}

.hot-rising-card--rising .hot-rising-card__topline {
  color: rgb(13 148 136);
}

.hot-rising-card--rising .hot-rising-card__badge {
  background: rgb(204 251 241);
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

.task-progress-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(238 242 255);
  color: rgb(67 56 202);
  min-width: 3rem;
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.task-section-label {
  margin-bottom: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(14 116 144);
}

.task-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 0.95rem;
  border: 1px solid rgb(226 232 240 / 0.9);
  background: rgb(248 250 252 / 0.9);
  padding: 0.9rem;
}

.task-item-complete {
  border-color: rgb(187 247 208 / 0.95);
  background: rgb(240 253 244 / 0.95);
}

.task-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  color: rgb(79 70 229);
  font-weight: 900;
}

.task-action-button {
  flex-shrink: 0;
  border: 1px solid rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
  border-radius: 999px;
  min-height: 2.25rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.75rem;
  font-weight: 800;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.task-action-button:hover:not(:disabled) {
  border-color: rgb(165 180 252);
  background: rgb(224 231 255);
}

.task-action-button:disabled {
  opacity: 0.6;
  cursor: wait;
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

.feed-loadmore-error {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(253 230 138);
  background: rgb(255 251 235);
  padding: 0.85rem 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: rgb(146 64 14);
}

.dark .feed-loadmore-error {
  border-color: rgb(120 53 15);
  background: rgb(69 26 3 / 0.4);
  color: rgb(253 230 138);
}

.feed-undo-banner {
  position: sticky;
  bottom: 1rem;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  border: 1px solid rgb(165 180 252);
  border-radius: 6px;
  background: rgb(238 242 255);
  padding: 0.75rem 0.9rem;
  color: rgb(49 46 129);
  box-shadow: 0 12px 28px rgb(15 23 42 / 0.12);
  font-size: 0.82rem;
  font-weight: 800;
}

.feed-undo-banner span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-undo-banner button {
  min-height: 2.25rem;
  flex: 0 0 auto;
  border-radius: 5px;
  border: 1px solid rgb(129 140 248);
  padding: 0 0.75rem;
  color: rgb(67 56 202);
}

.feed-undo-banner button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.dark .feed-undo-banner {
  border-color: rgb(79 70 229);
  background: rgb(49 46 129 / 0.92);
  color: rgb(224 231 255);
  box-shadow: 0 12px 28px rgb(2 6 23 / 0.35);
}

.dark .feed-undo-banner button {
  border-color: rgb(129 140 248);
  color: rgb(224 231 255);
}

.dark .profile-stat {
  border-color: rgb(51 65 85 / 0.8);
  background: rgb(15 23 42 / 0.75);
}

.dark .task-progress-pill {
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}

.dark .task-section-label {
  color: rgb(103 232 249);
}

.dark .task-item {
  border-color: rgb(51 65 85 / 0.85);
  background: rgb(15 23 42 / 0.78);
}

.dark .task-item-complete {
  border-color: rgb(21 128 61 / 0.55);
  background: rgb(20 83 45 / 0.22);
}

.dark .task-check {
  color: rgb(199 210 254);
}

.dark .task-action-button {
  border-color: rgb(67 56 202 / 0.7);
  background: rgb(49 46 129 / 0.4);
  color: rgb(199 210 254);
}

.dark .task-action-button:hover:not(:disabled) {
  border-color: rgb(99 102 241);
  background: rgb(67 56 202 / 0.45);
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

.dark .home-action-card {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(15 23 42 / 0.78);
}

.dark .home-action-card:hover {
  border-color: rgb(99 102 241 / 0.68);
  background: rgb(30 41 59 / 0.9);
  box-shadow: 0 16px 36px rgb(2 6 23 / 0.28);
}

.dark .home-action-card-primary {
  border-color: rgb(99 102 241 / 0.7);
  background: linear-gradient(135deg, rgb(49 46 129 / 0.52), rgb(20 83 45 / 0.28));
}

.dark .home-action-icon {
  background: rgb(49 46 129 / 0.58);
  color: rgb(199 210 254);
}

.dark .hot-rising-card {
  border-color: rgb(51 65 85 / 0.86);
  background: rgb(15 23 42 / 0.78);
}

.dark .hot-rising-card:hover {
  border-color: rgb(99 102 241 / 0.68);
  background: rgb(30 41 59 / 0.9);
  box-shadow: 0 16px 36px rgb(2 6 23 / 0.28);
}

.dark .hot-rising-card strong {
  color: rgb(248 250 252);
}

.dark .hot-rising-card__sample {
  color: rgb(203 213 225);
}

.dark .hot-rising-card__reason {
  color: rgb(148 163 184);
}

.dark .hot-rising-card__badge {
  background: rgb(49 46 129 / 0.5);
}

.dark .hot-rising-card--hot .hot-rising-card__topline {
  color: rgb(252 165 165);
}

.dark .hot-rising-card--hot .hot-rising-card__badge {
  background: rgb(127 29 29 / 0.5);
}

.dark .hot-rising-card--rising .hot-rising-card__topline {
  color: rgb(94 234 212);
}

.dark .hot-rising-card--rising .hot-rising-card__badge {
  background: rgb(19 78 74 / 0.58);
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

.dark .home-series-mini-bar {
  background: rgb(30 41 59);
}

/* Community-first home layout. Existing data sources stay intact while the
   browsing surface becomes a stable three-column content stream. */
.community-home-main {
  min-height: calc(100vh - 64px);
}

.community-feed-layout {
  align-items: start;
}

.home-channel-nav {
  display: grid;
  gap: 0.25rem;
  padding: 0 0.15rem;
}

.home-rail-label {
  margin: 0 0 0.4rem;
  color: rgb(107 114 128);
  font-size: 0.7rem;
  font-weight: 800;
}

.home-channel-link,
.home-channel-publish {
  display: flex;
  min-height: 2.45rem;
  align-items: center;
  gap: 0.6rem;
  padding: 0 0.55rem;
  border-radius: 6px;
  color: rgb(75 85 99);
  font-size: 0.8125rem;
  font-weight: 700;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.home-channel-link:hover,
.home-channel-link--active {
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.home-channel-link__icon {
  display: grid;
  width: 1.55rem;
  height: 1.55rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 5px;
  background: rgb(243 244 246);
  color: rgb(75 85 99);
  font-size: 0.7rem;
  font-weight: 800;
}

.home-channel-link--active .home-channel-link__icon {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.home-channel-link--discover {
  margin-top: 0.45rem;
  border-top: 1px solid rgb(229 231 235);
  border-radius: 0;
  padding-top: 0.7rem;
}

.home-channel-publish {
  justify-content: center;
  margin-top: 0.5rem;
  background: rgb(37 99 235);
  color: white;
}

.home-channel-publish:hover {
  background: rgb(29 78 216);
  color: white;
}

.home-feed-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: start;
  padding: 0.2rem 0 1.25rem;
  border-bottom: 1px solid rgb(229 231 235);
}

.home-feed-intro h1 {
  margin: 0;
  color: rgb(23 23 23);
  font-size: 1.35rem;
  line-height: 1.35;
}

.home-feed-intro p:not(.home-rail-label) {
  max-width: 41rem;
  margin: 0.4rem 0 0;
  color: rgb(107 114 128);
  font-size: 0.8125rem;
  line-height: 1.7;
}

.home-feed-intro__publish {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.75rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 6px;
  background: rgb(239 246 255);
  color: rgb(29 78 216);
  font-size: 0.8125rem;
  font-weight: 800;
}

.home-feed-intro__publish:hover {
  background: rgb(219 234 254);
}

.home-mobile-channels {
  display: none;
}

.home-feed-controls {
  margin-bottom: 1.1rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid rgb(229 231 235);
}

.home-feed-controls > .grid {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.home-feed-controls > .grid::-webkit-scrollbar {
  display: none;
}

.home-feed-controls button {
  min-height: 2.1rem;
  flex: 0 0 auto;
  padding: 0 0.65rem;
  border-radius: 5px;
  background: transparent !important;
  color: rgb(107 114 128) !important;
  box-shadow: none !important;
  font-size: 0.8125rem;
}

.home-feed-controls button span:last-child {
  display: none;
}

.home-feed-controls button.bg-primary-600 {
  background: rgb(239 246 255) !important;
  color: rgb(29 78 216) !important;
}

.home-feed-controls > p {
  padding: 0.55rem 0 0 !important;
  color: rgb(107 114 128);
  font-size: 0.75rem;
}

.home-feed-controls > .border-t {
  display: none;
}

.community-feed-layout aside .surface-card,
.community-feed-layout aside .surface-panel {
  border-color: rgb(229 231 235);
  border-radius: 7px;
  box-shadow: none;
}

.community-feed-layout aside .surface-card > .mb-4 h3,
.community-feed-layout aside .surface-panel > .mb-4 h3 {
  font-size: 0.875rem;
}

.community-feed-layout aside .surface-card .rounded-xl {
  border-radius: 6px;
}

.community-feed-layout aside .surface-card .rounded-lg {
  border-radius: 6px;
}

.community-feed-layout .profile-stat {
  border-color: rgb(229 231 235);
  border-radius: 6px;
  background: rgb(249 250 251);
}

.community-feed-layout .profile-stat span {
  color: rgb(37 99 235);
}

.community-feed-layout .task-item {
  border-color: rgb(229 231 235);
  border-radius: 6px;
  background: rgb(249 250 251);
}

.community-feed-layout .task-progress-pill,
.community-feed-layout .task-action-button {
  border-radius: 5px;
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.community-feed-layout .task-action-button {
  border-color: rgb(191 219 254);
}

.community-feed-layout .topic-count {
  min-width: 2rem;
  border-radius: 5px;
  background: rgb(243 244 246);
  color: rgb(107 114 128);
  text-align: center;
}

.community-feed-layout .recommended-user-card {
  border-radius: 6px;
}

.dark .home-channel-link,
.dark .home-rail-label,
.dark .home-feed-intro p:not(.home-rail-label) {
  color: rgb(148 163 184);
}

.dark .home-channel-link:hover,
.dark .home-channel-link--active {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .home-channel-link__icon {
  background: rgb(39 39 42);
  color: rgb(203 213 225);
}

.dark .home-channel-link--active .home-channel-link__icon {
  background: rgb(30 58 138 / 0.45);
  color: rgb(147 197 253);
}

.dark .home-channel-link--discover,
.dark .home-feed-intro,
.dark .home-feed-controls {
  border-color: rgb(63 63 70);
}

.dark .home-feed-intro h1 {
  color: rgb(241 245 249);
}

.dark .home-feed-intro__publish,
.dark .home-feed-controls button.bg-primary-600 {
  border-color: rgb(30 58 138);
  background: rgb(30 58 138 / 0.35) !important;
  color: rgb(147 197 253) !important;
}

.dark .community-feed-layout aside .surface-card,
.dark .community-feed-layout aside .surface-panel,
.dark .community-feed-layout .profile-stat,
.dark .community-feed-layout .task-item {
  border-color: rgb(63 63 70);
  background: rgb(24 26 32);
}

@media (max-width: 1023px) {
  .community-home-main {
    max-width: 760px;
  }

  .home-feed-intro {
    padding-top: 0;
  }

  .home-mobile-channels {
    display: flex;
    grid-column: 1 / -1;
    gap: 0.35rem;
    overflow-x: auto;
    padding-top: 0.25rem;
    scrollbar-width: none;
  }

  .home-mobile-channels::-webkit-scrollbar {
    display: none;
  }

  .home-mobile-channels a {
    display: inline-flex;
    min-height: 2rem;
    flex: 0 0 auto;
    align-items: center;
    padding: 0 0.6rem;
    border-radius: 5px;
    background: rgb(243 244 246);
    color: rgb(75 85 99);
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .home-mobile-channels a.home-mobile-channels__item--active {
    background: rgb(239 246 255);
    color: rgb(29 78 216);
  }

  .dark .home-mobile-channels a {
    background: rgb(39 39 42);
    color: rgb(203 213 225);
  }

  .dark .home-mobile-channels a.home-mobile-channels__item--active {
    background: rgb(30 58 138 / 0.35);
    color: rgb(147 197 253);
  }
}

@media (max-width: 640px) {
  .community-home-main {
    padding-right: 1rem;
    padding-left: 1rem;
  }

  .home-feed-intro {
    gap: 0.75rem;
  }

  .home-feed-intro h1 {
    font-size: 1.15rem;
  }

  .home-feed-intro__publish {
    min-height: 2rem;
    padding: 0 0.55rem;
    font-size: 0.75rem;
  }
}

/* Editorial community stream: wide enough for reading, compact enough for repeat visits. */
.community-home-main {
  width: min(1320px, 100%);
  min-height: calc(100vh - 68px);
}

.community-feed-layout {
  display: grid;
  grid-template-columns: 196px minmax(0, 700px) 284px;
  gap: 2rem;
  align-items: start;
  justify-content: center;
}

.community-feed-layout__left,
.community-feed-layout__right,
.home-feed-column {
  min-width: 0;
}

.home-channel-nav {
  gap: 0.2rem;
  padding: 0;
}

.home-rail-heading,
.home-rail-section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.home-rail-heading {
  margin-bottom: 0.35rem;
  padding: 0 0.55rem;
}

.home-rail-heading > a {
  color: var(--primary-600);
  font-size: 0.6875rem;
  font-weight: 750;
}

.home-rail-label {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.home-channel-link,
.home-channel-publish {
  min-height: 2.5rem;
  border-radius: var(--radius-control);
  color: var(--text-primary);
  font-size: 0.8125rem;
  font-weight: 650;
}

.home-channel-link:hover,
.home-channel-link--active {
  background: var(--primary-50);
  color: var(--primary-600);
}

.home-channel-link__icon {
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 6px;
  background: var(--surface-3);
  color: var(--text-muted);
}

.home-channel-link--active .home-channel-link__icon {
  background: var(--primary-100);
  color: var(--primary-600);
}

.home-channel-link--discover {
  margin-top: 0.5rem;
  border-top: 1px solid var(--border-subtle);
  border-radius: 0;
  padding-top: 0.75rem;
}

.home-channel-publish {
  margin-top: 0.6rem;
  border: 1px solid var(--primary-600);
  background: var(--primary-600);
  color: white;
  font-weight: 750;
}

.home-channel-publish:hover {
  border-color: var(--primary-700);
  background: var(--primary-700);
  color: white;
  transform: translateY(-1px);
}

.home-profile-panel,
.home-task-panel {
  border-top: 1px solid var(--border-subtle);
  padding: 1rem 0 0;
}

.home-profile-avatar,
.home-author-avatar {
  display: grid;
  overflow: hidden;
  place-items: center;
  border-radius: 7px;
  background: var(--primary-600);
  color: white;
  font-weight: 850;
}

.home-profile-avatar {
  width: 2.8rem;
  height: 2.8rem;
  flex: 0 0 auto;
  font-size: 1rem;
}

.home-profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  margin-top: 1rem;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.home-profile-stats .profile-stat {
  padding: 0.7rem 0.35rem;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.home-profile-stats .profile-stat + .profile-stat {
  border-left: 1px solid var(--border-subtle);
}

.home-profile-stats .profile-stat:hover {
  background: var(--surface-2);
}

.home-profile-stats .profile-stat span {
  color: var(--text-strong);
  font-size: 0.95rem;
}

.home-profile-collection-link {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: var(--primary-600);
  font-size: 0.8125rem;
  font-weight: 750;
}

.home-profile-collection-link:hover {
  background: var(--surface-2);
}

.home-profile-empty h3 {
  margin: 0.45rem 0 0;
  color: var(--text-strong);
  font-size: 0.9rem;
  line-height: 1.45;
}

.home-profile-empty p:not(.home-rail-label) {
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.home-profile-empty .primary-action {
  width: 100%;
  margin-top: 0.9rem;
}

.home-task-panel {
  padding-bottom: 0.15rem;
}

.home-task-panel > .flex:first-child h3 {
  font-size: 0.875rem;
}

.home-task-panel .task-section-label {
  color: var(--text-muted);
  letter-spacing: 0;
  text-transform: none;
}

.home-task-panel .task-item {
  border-color: var(--border-subtle);
  border-radius: 7px;
  background: var(--surface);
}

.home-task-panel .task-progress-pill,
.home-task-panel .task-action-button {
  border-color: var(--primary-100);
  border-radius: 5px;
  background: var(--primary-50);
  color: var(--primary-600);
}

.home-rail-section {
  padding: 1rem 0;
  border-top: 1px solid var(--border-subtle);
}

.home-rail-section__title h3 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.875rem;
  font-weight: 800;
}

.home-rail-section__title svg {
  color: var(--text-muted);
}

.home-tag-panel {
  padding-bottom: 0;
}

.home-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.75rem;
}

.home-tag-link {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  padding: 0 0.5rem;
  border-radius: 5px;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.home-tag-link:hover {
  background: var(--primary-50);
  color: var(--primary-600);
}

.home-feed-intro {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.9rem 1rem;
  padding: 0.15rem 0 1.35rem;
  border-bottom-color: var(--border-subtle);
}

.home-feed-intro h1 {
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.35;
  text-wrap: balance;
}

.home-feed-intro p:not(.home-rail-label) {
  max-width: 39rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.7;
  text-wrap: pretty;
}

.home-feed-intro__publish {
  min-height: 2.35rem;
  border: 1px solid var(--primary-100);
  border-radius: var(--radius-control);
  background: var(--primary-50);
  color: var(--primary-600);
  font-weight: 750;
  transition: border-color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.home-feed-intro__publish:hover {
  border-color: rgb(147 197 253);
  background: var(--primary-100);
  transform: translateY(-1px);
}

.home-reading-pulse {
  display: flex;
  grid-column: 1 / -1;
  gap: 0.4rem;
  overflow-x: auto;
  padding-top: 0.1rem;
  scrollbar-width: none;
}

.home-reading-pulse::-webkit-scrollbar {
  display: none;
}

.home-reading-pulse__item {
  display: inline-flex;
  min-height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.55rem;
  border: 1px solid transparent;
  border-radius: 5px;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 700;
  transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.home-reading-pulse__item strong {
  color: var(--text-primary);
  font-weight: 750;
}

.home-reading-pulse__item:hover {
  background: var(--surface);
  border-color: var(--border-subtle);
  color: var(--primary-600);
  transform: translateY(-1px);
}

.home-reading-pulse__item--hot svg {
  color: #d92d20;
}

.home-reading-pulse__item--rising svg {
  color: #0f9f8c;
}

.home-reading-pulse__item--featured svg {
  color: #b54708;
}

.home-feed-controls {
  margin: 0;
  padding: 0.75rem 0 1rem;
  border-bottom-color: var(--border-subtle);
}

.home-operation-slot {
  margin: 1rem 0 0.25rem;
}

.home-feed-tabs {
  display: flex;
  gap: 0.15rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.home-feed-tabs::-webkit-scrollbar {
  display: none;
}

.home-feed-tabs button {
  position: relative;
  min-height: 2.35rem;
  flex: 0 0 auto;
  padding: 0 0.65rem !important;
  border-radius: 5px !important;
  background: transparent !important;
  color: var(--text-muted) !important;
  font-size: 0.8125rem !important;
  font-weight: 700 !important;
}

.home-feed-tabs button:hover:not(:disabled) {
  background: var(--surface-3) !important;
  color: var(--text-primary) !important;
}

.home-feed-tabs button.home-feed-tab--active {
  background: var(--primary-50) !important;
  color: var(--primary-600) !important;
}

.home-feed-description {
  padding: 0.65rem 0 0 !important;
  color: var(--text-muted) !important;
  font-size: 0.75rem !important;
  line-height: 1.65 !important;
}

.home-content-types {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-top: 0.7rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--surface-3);
}

.home-content-types__label {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 750;
}

.home-content-types__list {
  display: flex;
  min-width: 0;
  gap: 0.35rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.home-content-types__list::-webkit-scrollbar {
  display: none;
}

.home-content-types .channel-chip {
  min-height: 1.8rem;
  flex: 0 0 auto;
  padding: 0 0.5rem;
  border: 0;
  border-radius: 4px;
  background: var(--surface-3);
  color: var(--text-muted);
  font-size: 0.7rem;
}

.home-content-types .channel-chip:hover {
  background: var(--primary-50);
  color: var(--primary-600);
}

.home-feed-list {
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface);
}

.home-feed-list :deep(.post-card) {
  margin: 0;
}

.home-feed-list :deep(.post-card:first-child) {
  padding-top: 1.1rem;
}

.home-feed-list :deep(.surface-card) {
  border-right: 0;
  border-left: 0;
  border-radius: 0;
}

.home-right-rail {
  display: grid;
}

.home-right-rail .home-rail-section:first-child {
  padding-top: 0.1rem;
  border-top: 0;
}

.home-rail-section__empty {
  margin: 0.7rem 0 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.home-featured-list,
.home-topic-list,
.home-trending-list,
.home-author-list {
  margin-top: 0.65rem;
}

.home-featured-row,
.home-topic-row,
.home-trending-row,
.home-author-row {
  transition: background-color 0.18s ease, color 0.18s ease;
}

.home-featured-row {
  display: grid;
  grid-template-columns: 1.85rem minmax(0, 1fr);
  gap: 0.55rem;
  align-items: start;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--surface-3);
}

.home-featured-row:last-child,
.home-topic-row:last-child,
.home-trending-row:last-child {
  border-bottom: 0;
}

.home-featured-row > span {
  color: var(--primary-600);
  font-size: 0.7rem;
  font-weight: 850;
}

.home-featured-row h4 {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 720;
  line-height: 1.5;
}

.home-featured-row:hover h4,
.home-topic-row:hover > span,
.home-trending-row:hover strong {
  color: var(--primary-600);
}

.home-topic-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 2.3rem;
  border-bottom: 1px solid var(--surface-3);
  color: var(--text-primary);
}

.home-topic-row > span {
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-topic-row small {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.home-trending-row {
  display: grid;
  grid-template-columns: 1.85rem minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: center;
  min-height: 2.45rem;
  border-bottom: 1px solid var(--surface-3);
}

.home-trending-row > span {
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 800;
}

.home-trending-row strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-trending-row small {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.home-author-list {
  display: grid;
  gap: 0.15rem;
}

.home-author-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0;
}

.home-author-row:hover {
  background: var(--surface-2);
}

.home-author-avatar {
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  font-size: 0.75rem;
}

.home-author-row :deep(.truncate) {
  color: var(--text-primary);
  font-size: 0.75rem;
  font-weight: 720;
}

.home-author-row :deep(.text-xs) {
  font-size: 0.6875rem;
}

.home-follow-button {
  min-height: 1.8rem;
  flex: 0 0 auto;
  padding: 0 0.45rem;
  border: 1px solid var(--primary-100);
  border-radius: 5px;
  background: var(--primary-50);
  color: var(--primary-600);
  font-size: 0.7rem;
  font-weight: 750;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.home-follow-button:hover:not(:disabled) {
  border-color: rgb(147 197 253);
  background: var(--primary-100);
}

.home-follow-button--following {
  border-color: var(--border-subtle);
  background: var(--surface);
  color: var(--text-muted);
}

.home-follow-button--following:hover:not(:disabled) {
  border-color: var(--border-subtle);
  background: var(--surface-2);
}

.dark .home-channel-link,
.dark .home-rail-label,
.dark .home-feed-intro p:not(.home-rail-label),
.dark .home-profile-empty p:not(.home-rail-label),
.dark .home-rail-section__empty,
.dark .home-feed-description {
  color: rgb(148 163 184) !important;
}

.dark .home-channel-link:hover,
.dark .home-channel-link--active,
.dark .home-feed-tabs button.home-feed-tab--active,
.dark .home-feed-intro__publish,
.dark .home-reading-pulse__item:hover,
.dark .home-content-types .channel-chip:hover,
.dark .home-tag-link:hover {
  background: rgb(30 58 138 / 0.36) !important;
  color: rgb(147 197 253) !important;
}

.dark .home-channel-link__icon,
.dark .home-reading-pulse__item,
.dark .home-content-types .channel-chip,
.dark .home-tag-link {
  background: rgb(39 39 42);
  color: rgb(203 213 225);
}

.dark .home-channel-link--active .home-channel-link__icon {
  background: rgb(30 58 138 / 0.48);
  color: rgb(147 197 253);
}

.dark .home-channel-link--discover,
.dark .home-profile-panel,
.dark .home-task-panel,
.dark .home-rail-section,
.dark .home-profile-stats,
.dark .home-profile-stats .profile-stat + .profile-stat,
.dark .home-feed-intro,
.dark .home-feed-controls,
.dark .home-content-types,
.dark .home-feed-list,
.dark .home-featured-row,
.dark .home-topic-row,
.dark .home-trending-row {
  border-color: rgb(63 63 70);
}

.dark .home-profile-stats .profile-stat,
.dark .home-profile-stats .profile-stat:hover,
.dark .home-author-row:hover {
  background: transparent;
}

.dark .home-task-panel .task-item,
.dark .home-feed-list {
  background: rgb(24 26 32);
}

.dark .home-profile-stats .profile-stat span,
.dark .home-feed-intro h1,
.dark .home-profile-empty h3,
.dark .home-rail-section__title h3,
.dark .home-featured-row h4,
.dark .home-topic-row > span,
.dark .home-trending-row strong,
.dark .home-author-row :deep(.truncate),
.dark .home-reading-pulse__item strong {
  color: rgb(241 245 249);
}

.dark .home-follow-button--following {
  border-color: rgb(63 63 70);
  background: transparent;
  color: rgb(203 213 225);
}

@media (max-width: 1023px) {
  .community-feed-layout {
    display: block;
  }

  .home-feed-column {
    width: min(720px, 100%);
    margin: 0 auto;
  }

  .home-task-panel--mobile {
    margin-top: 1rem;
  }
}

@media (max-width: 640px) {
  .community-home-main {
    min-height: calc(100vh - 58px);
  }

  .home-feed-intro {
    gap: 0.65rem;
    padding-bottom: 1rem;
  }

  .home-feed-intro h1 {
    font-size: 1.25rem;
  }

  .home-reading-pulse {
    margin-right: -1rem;
    padding-right: 1rem;
  }

  .home-mobile-channels {
    margin-right: -1rem;
    padding-right: 1rem;
  }

  .home-content-types {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.45rem;
  }

  .home-content-types__list {
    width: calc(100% + 1rem);
    margin-right: -1rem;
    padding-right: 1rem;
  }

  .home-feed-list {
    margin-right: -1rem;
    margin-left: -1rem;
  }
}

.feed-control-manager {
  margin-bottom: 1rem;
  border-top: 1px solid var(--border-subtle);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0;
}

.feed-control-manager > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.feed-control-manager h2 {
  margin-top: 0.2rem;
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 850;
}

.feed-control-manager header span {
  display: block;
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.feed-control-manager__body {
  margin-top: 0.9rem;
}

.feed-control-manager__state {
  display: flex;
  min-height: 4.5rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border: 1px dashed var(--border-subtle);
  border-radius: 0.5rem;
  padding: 0.8rem;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.feed-control-manager__state--error,
.feed-control-manager__append-error {
  color: rgb(190 24 93);
}

.feed-control-manager__state button {
  text-decoration: underline;
}

.feed-control-manager__list {
  display: grid;
  gap: 0.55rem;
}

.feed-control-manager__list article {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
  border-top: 1px solid var(--border-subtle);
  padding-top: 0.7rem;
}

.feed-control-manager__list article:first-child {
  border-top: 0;
  padding-top: 0;
}

.feed-control-manager__list a,
.feed-control-manager__list span,
.feed-control-manager__list p {
  display: block;
}

.feed-control-manager__list a {
  color: var(--text-primary);
  font-size: 0.82rem;
  font-weight: 800;
}

.feed-control-manager__list span,
.feed-control-manager__list p {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.45;
}

.feed-control-manager__list button {
  display: inline-flex;
  min-height: 2.25rem;
  flex: none;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.4rem;
  padding: 0 0.65rem;
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 800;
}

.feed-control-manager__append-error {
  margin-top: 0.7rem;
  font-size: 0.75rem;
}

.feed-control-manager__more {
  margin-top: 0.75rem;
}

@media (max-width: 640px) {
  .feed-control-manager > header {
    flex-direction: column;
  }

  .feed-control-manager > header .secondary-action {
    width: 100%;
  }
}
</style>
