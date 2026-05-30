<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <section class="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch">
        <div class="surface-card overflow-hidden p-6 sm:p-7">
          <div class="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div class="max-w-2xl">
              <div class="mb-3 flex flex-wrap gap-2">
                <span class="muted-pill">真实面经</span>
                <span class="muted-pill">岗位准备</span>
                <span class="muted-pill">求职复盘</span>
              </div>
              <h1 class="text-2xl font-black tracking-normal text-slate-950 dark:text-white sm:text-3xl">
                找到下一轮面试的真实答案
              </h1>
              <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                浏览来自同路人的面试经历、公司准备包和高频题目，把分散的信息沉淀成可执行的求职路线。
              </p>
            </div>
            <div class="flex flex-wrap gap-3">
              <RouterLink to="/editor" class="primary-action">
                <PenLine class="h-4 w-4" />
                发布面经
              </RouterLink>
              <RouterLink to="/explore" class="secondary-action">
                <Compass class="h-4 w-4" />
                去发现
              </RouterLink>
            </div>
          </div>

          <div class="mt-6 grid gap-3 sm:grid-cols-3">
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">今日可读内容</span>
              <strong>{{ visiblePosts.length }}</strong>
            </div>
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">热门标签</span>
              <strong>{{ topTags.length }}</strong>
            </div>
            <div class="metric-tile border-slate-200/80 bg-slate-50/90 dark:border-slate-700/80 dark:bg-slate-950/60">
              <span class="metric-label">推荐同路人</span>
              <strong>{{ recommendedUsers.length }}</strong>
            </div>
          </div>
        </div>

        <section class="surface-card p-5">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-black text-slate-950 dark:text-white">快速搜索</h2>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">按公司、岗位或技术栈定位内容</p>
            </div>
            <Search class="h-5 w-5 text-primary-500" />
          </div>
          <form class="mt-4 space-y-3" @submit.prevent="submitHeroSearch">
            <div class="relative">
              <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                v-model="heroKeyword"
                class="quick-input border-slate-200 bg-slate-50 text-slate-950 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100 pl-9"
                placeholder="例如 Java 后端、字节、算法"
              />
            </div>
            <button type="submit" class="primary-action w-full">
              搜索内容
            </button>
          </form>
        </section>
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
                      {{ authStore.user.signature || '完善个人资料，让更多同路人找到你' }}
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
                  <h3 class="font-black text-slate-950 dark:text-white">开始记录求职过程</h3>
                  <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">登录后可以发布面经、收藏帖子并关注作者。</p>
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
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
            </p>
          </div>

          <div class="space-y-4">
            <LoadingSkeleton v-if="isLoading" />
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
              />
            </template>
            <EmptyState
              v-else
              :title="activeFeed === 'following' ? '还没有关注动态' : '暂时没有内容'"
              :description="activeFeed === 'following' ? '去发现页看看可以关注的作者。' : '发布第一篇面经或切换其他信息流。'"
              actionText="去发现"
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
                      <div class="truncate text-xs text-slate-500 dark:text-slate-400">{{ user.signature || '公开用户资料' }}</div>
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
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Compass, PenLine, Search, Tag, TrendingUp, Users } from 'lucide-vue-next'
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
import type { Post, Tag as PostTag, User } from '@/api/types'

const authStore = useAuthStore()
const router = useRouter()
const { requireLogin } = useLoginRedirect()

const activeFeed = ref<FeedType>('latest')
const heroKeyword = ref('')
const feedTabs: FeedType[] = ['following', 'recommend', 'latest', 'hot']
const feedLabels: Record<FeedType, string> = {
  following: '关注',
  recommend: '推荐',
  latest: '最新',
  hot: '热门',
}
const feedShortDescriptions: Record<FeedType, string> = {
  following: '熟人动态',
  recommend: '高相关内容',
  latest: '新发布',
  hot: '正在升温',
}
const feedDescriptions: Record<FeedType, string> = {
  following: '只看你关注作者的最新动态，适合持续追踪熟悉的求职路径。',
  recommend: '结合近期内容、互动热度和标签完整度重排，优先展示更值得看的帖子。',
  latest: '按发布时间倒序展示公开内容，适合快速浏览新发布的面经和问答。',
  hot: '按浏览、点赞、收藏、评论和发布时间计算热度，适合查看正在升温的内容。',
}

const tags = ref<PostTag[]>([])
const recommendedUsers = ref<User[]>([])
const followingBusyIds = ref(new Set<string>())
const locallyHiddenPostIds = ref(new Set<string>())
const { posts, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteFeed(activeFeed)

const sortedTags = computed(() => [...tags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const topTags = computed(() => sortedTags.value.slice(0, 10))
const trendingTags = computed(() => sortedTags.value.slice(0, 6))
const visiblePosts = computed(() => activeFeed.value === 'recommend'
  ? posts.value.filter((post) => !locallyHiddenPostIds.value.has(String(post.postId)))
  : posts.value)

const findPost = (postId: Post['postId']) => posts.value.find((item) => String(item.postId) === String(postId))
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
  const [tagRes, userRes] = await Promise.allSettled([
    postApi.getTags(),
    userApi.searchUsers('', 6),
  ])
  if (tagRes.status === 'fulfilled') {
    tags.value = tagRes.value.data || []
  }
  if (userRes.status === 'fulfilled') {
    recommendedUsers.value = userRes.value.data || []
  }
})
</script>

<style scoped>
.metric-tile {
  border-radius: 0.75rem;
  border: 1px solid;
  padding: 1rem;
}

.metric-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.metric-tile strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.65rem;
  line-height: 1;
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

:global(.dark) .profile-stat {
  border-color: rgb(51 65 85 / 0.8);
  background: rgb(15 23 42 / 0.75);
}

:global(.dark) .metric-label,
:global(.dark) .profile-stat small {
  color: rgb(148 163 184);
}

:global(.dark) .metric-tile strong {
  color: rgb(248 250 252);
}

:global(.dark) .quick-input:focus {
  border-color: rgb(67 56 202);
  background: rgb(15 23 42);
  box-shadow: 0 0 0 3px rgb(49 46 129 / 0.55);
}

:global(.dark) .profile-stat:hover {
  border-color: rgb(67 56 202);
  background: rgb(30 41 59);
}
</style>
