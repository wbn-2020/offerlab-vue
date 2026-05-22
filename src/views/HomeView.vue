<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-6">
            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <template v-if="authStore.isLoggedIn && authStore.user">
                <div class="flex flex-col items-center text-center">
                  <div class="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-2xl font-bold text-white">
                    <img v-if="authStore.user.avatar" :src="authStore.user.avatar" :alt="authStore.user.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ authStore.user.nickname.charAt(0) || '?' }}</span>
                  </div>
                  <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ authStore.user.nickname }}</h3>
                  <p class="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                    {{ authStore.user.signature || '完善个人资料，让更多同路人找到你' }}
                  </p>
                  <div class="mt-4 grid w-full grid-cols-2 gap-3 text-center">
                    <div class="rounded-lg bg-slate-50 py-3 dark:bg-slate-950">
                      <div class="text-lg font-bold text-primary-600">{{ authStore.user.postCount ?? 0 }}</div>
                      <div class="text-xs text-slate-500">帖子</div>
                    </div>
                    <div class="rounded-lg bg-slate-50 py-3 dark:bg-slate-950">
                      <div class="text-lg font-bold text-primary-600">{{ authStore.user.followerCount ?? 0 }}</div>
                      <div class="text-xs text-slate-500">粉丝</div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="text-center">
                  <h3 class="font-semibold text-slate-900 dark:text-slate-100">开始记录求职过程</h3>
                  <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">登录后可以发布面经、收藏帖子并关注作者。</p>
                  <RouterLink to="/login" class="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700">
                    登录
                  </RouterLink>
                </div>
              </template>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">热门标签</h3>
              <div class="flex flex-wrap gap-2">
                <RouterLink
                  v-for="tag in topTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-primary-950"
                >
                  {{ tag.name }}
                </RouterLink>
              </div>
            </section>
          </div>
        </aside>

        <section class="lg:col-span-2">
          <div class="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div class="flex flex-wrap gap-3 border-b border-slate-200 dark:border-slate-800">
              <button
                v-for="tab in feedTabs"
                :key="tab"
                type="button"
                :disabled="tab === 'following' && !authStore.isLoggedIn"
                :class="[
                  'border-b-2 px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                  activeFeed === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                ]"
                @click="activeFeed = tab"
              >
                {{ feedLabels[tab] }}
              </button>
            </div>
            <p class="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
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
            <button type="button" class="rounded-lg border border-primary-600 px-6 py-2 font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:hover:bg-slate-800" @click="() => fetchNextPage()">
              加载更多
            </button>
          </div>

          <div v-if="isFetching" class="mt-6">
            <LoadingSkeleton />
          </div>
        </section>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-6">
            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">标签热度</h3>
              <div class="space-y-2">
                <RouterLink
                  v-for="tag in trendingTags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="block rounded-lg px-3 py-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ tag.name }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }} 篇内容</div>
                </RouterLink>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">推荐用户</h3>
              <div class="space-y-3">
                <div
                  v-for="user in recommendedUsers"
                  :key="user.uid"
                  class="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <RouterLink :to="`/u/${user.uid}`" class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xs font-bold text-white">
                      <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
                      <span v-else>{{ user.nickname.charAt(0) || '?' }}</span>
                    </div>
                    <div class="min-w-0">
                      <div class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ user.nickname }}</div>
                      <div class="truncate text-xs text-slate-500 dark:text-slate-400">{{ user.signature || '公开用户资料' }}</div>
                    </div>
                  </RouterLink>
                  <button
                    type="button"
                    class="shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60"
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
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import { useInfiniteFeed, type FeedType } from '@/composables/useInfiniteFeed'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { userApi } from '@/api/user'
import { feedApi } from '@/api/feed'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import type { Post, Tag, User } from '@/api/types'

const authStore = useAuthStore()

const activeFeed = ref<FeedType>('latest')
const feedTabs: FeedType[] = ['following', 'recommend', 'latest', 'hot']
const feedLabels: Record<FeedType, string> = {
  following: '关注',
  recommend: '推荐',
  latest: '最新',
  hot: '热门',
}
const feedDescriptions: Record<FeedType, string> = {
  following: '只看你关注作者的最新动态，适合持续追踪熟悉的求职路径。',
  recommend: '结合近期内容、互动热度和标签完整度重排，优先展示更值得看的帖子。',
  latest: '按发布时间倒序展示公开内容，适合快速浏览新发布的面经和问答。',
  hot: '按浏览、点赞、收藏、评论和发布时间计算热度，适合查看正在升温的内容。',
}

const tags = ref<Tag[]>([])
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

const handleLike = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  const liked = Boolean(post.myInteraction?.liked)
  try {
    if (liked) {
      await interactionApi.unlike(postId)
    } else {
      await interactionApi.like(postId)
    }
    post.myInteraction = { ...(post.myInteraction ?? { favorited: false }), liked: !liked }
    post.counter.like = Math.max(0, post.counter.like + (liked ? -1 : 1))
  } catch (error: any) {
    toast.error(error?.message || '点赞操作失败')
  }
}

const handleFavorite = async (postId: Post['postId']) => {
  const post = findPost(postId)
  if (!post) return
  const favorited = Boolean(post.myInteraction?.favorited)
  try {
    if (favorited) {
      await interactionApi.unfavorite(postId)
    } else {
      await interactionApi.favorite(postId)
    }
    post.myInteraction = { ...(post.myInteraction ?? { liked: false }), favorited: !favorited }
    post.counter.favorite = Math.max(0, post.counter.favorite + (favorited ? -1 : 1))
  } catch (error: any) {
    toast.error(error?.message || '收藏操作失败')
  }
}

const handleRecommendFeedback = async (postId: Post['postId'], reason: string) => {
  if (!authStore.isLoggedIn) {
    toast.error('登录后才能调整推荐')
    return
  }
  try {
    await feedApi.recordFeedback(postId, reason)
    locallyHiddenPostIds.value = new Set(locallyHiddenPostIds.value).add(String(postId))
    toast.success('已减少类似推荐')
  } catch (error: any) {
    toast.error(error?.message || '推荐反馈提交失败')
  }
}

const toggleFollowUser = async (user: User) => {
  if (!authStore.isLoggedIn) {
    toast.error('登录后才能关注用户')
    return
  }
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
    toast.error(error?.message || '关注操作失败')
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
