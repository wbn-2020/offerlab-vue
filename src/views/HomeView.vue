<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Left Sidebar (240px) -->
        <aside class="hidden lg:block lg:col-span-1">
          <div class="sticky top-24 space-y-6">
            <!-- User Card -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <template v-if="authStore.isLoggedIn && authStore.user">
                <div class="flex flex-col items-center text-center">
                  <div class="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold mb-3">
                    {{ authStore.user.nickname[0] }}
                  </div>
                  <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ authStore.user.nickname }}</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ authStore.user.signature || '这个人很懒，什么都没留下' }}</p>
                  <div class="flex gap-4 mt-4 text-center w-full">
                    <div class="flex-1">
                      <div class="text-lg font-bold text-primary-600">0</div>
                      <div class="text-xs text-slate-500">帖子</div>
                    </div>
                    <div class="flex-1">
                      <div class="text-lg font-bold text-primary-600">0</div>
                      <div class="text-xs text-slate-500">粉丝</div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="text-center">
                  <p class="text-sm text-slate-600 dark:text-slate-400 mb-4">登录后可以分享面试经验</p>
                  <RouterLink
                    to="/login"
                    class="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                  >
                    登录
                  </RouterLink>
                </div>
              </template>
            </div>

            <!-- Tags Cloud -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-4">热门标签</h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="tag in popularTags"
                  :key="tag"
                  class="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 transition-colors"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>
        </aside>

        <!-- Center Feed (720px) -->
        <div class="lg:col-span-2">
          <!-- Feed Tabs -->
          <div class="mb-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div class="flex gap-4 border-b border-slate-200 dark:border-slate-800">
              <button
                v-for="tab in feedTabs"
                :key="tab"
                @click="activeFeed = tab"
                :disabled="tab === 'following' && !authStore.isLoggedIn"
                :class="[
                  'px-4 py-2 font-medium text-sm transition-colors border-b-2 disabled:opacity-50 disabled:cursor-not-allowed',
                  activeFeed === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
                ]"
              >
                {{ feedLabels[tab] }}
              </button>
            </div>
          </div>

          <!-- Posts List -->
          <div class="space-y-4">
            <template v-if="isLoading">
              <LoadingSkeleton />
            </template>
            <template v-else-if="posts.length > 0">
              <PostCard v-for="post in posts" :key="post.postId" :post="post" @like="handleLike" @favorite="handleFavorite" />
            </template>
            <template v-else>
              <EmptyState
                :title="activeFeed === 'following' ? '还没有关注任何人' : '暂时没有内容'"
                :description="activeFeed === 'following' ? '去发现页看看有趣的面经吧' : '去发现页看看有趣的面经吧'"
                actionText="去发现"
                actionHref="/explore"
              />
            </template>
          </div>

          <!-- Load More -->
          <div v-if="hasNextPage && !isFetching" class="mt-6 text-center">
            <button
              @click="() => fetchNextPage()"
              class="px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              加载更多
            </button>
          </div>

          <div v-if="isFetching" class="mt-6">
            <LoadingSkeleton />
          </div>
        </div>

        <!-- Right Sidebar (280px) -->
        <aside class="hidden lg:block lg:col-span-1">
          <div class="sticky top-24 space-y-6">
            <!-- Trending Tags -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-4">热门标签</h3>
              <div class="space-y-3">
                <button
                  v-for="(tag, idx) in trendingTags"
                  :key="idx"
                  class="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div class="font-medium text-sm text-slate-900 dark:text-slate-100">{{ tag.name }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">{{ tag.count }} 篇</div>
                </button>
              </div>
            </div>

            <!-- Recommended Users -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-4">推荐用户</h3>
              <div class="space-y-3">
                <div v-for="user in recommendedUsers" :key="user.uid" class="flex items-center justify-between">
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {{ user.nickname[0] }}
                    </div>
                    <div class="min-w-0">
                      <div class="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{{ user.nickname }}</div>
                      <div class="text-xs text-slate-500 dark:text-slate-400">{{ user.signature || '暂无签名' }}</div>
                    </div>
                  </div>
                  <button class="text-xs px-2 py-1 border border-primary-600 text-primary-600 rounded hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors flex-shrink-0">
                    关注
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useInfiniteFeed } from '@/composables/useInfiniteFeed'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { toast } from 'vue-sonner'

const authStore = useAuthStore()

const activeFeed = ref<'following' | 'recommend' | 'latest' | 'hot'>('latest')
const feedTabs = ['following', 'recommend', 'latest', 'hot'] as const
const feedLabels = {
  following: '关注',
  recommend: '推荐',
  latest: '最新',
  hot: '热门',
}

const popularTags = ['Java', 'Python', '字节跳动', '阿里巴巴', '腾讯', '面经', '已offer', '后端']

const trendingTags = [
  { name: 'Java', count: 1234 },
  { name: 'Python', count: 987 },
  { name: '字节跳动', count: 856 },
  { name: '阿里巴巴', count: 743 },
  { name: '腾讯', count: 621 },
]

const recommendedUsers = [
  { uid: 1, nickname: '张三', signature: '字节跳动后端工程师' },
  { uid: 2, nickname: '李四', signature: '阿里巴巴前端工程师' },
  { uid: 3, nickname: '王五', signature: '腾讯产品经理' },
]

const { posts, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteFeed(activeFeed.value)

// Watch for feed type changes
watch(activeFeed, (newFeed) => {
  // Reset and fetch new feed
  // This would require resetting the query in useInfiniteFeed
})

const handleLike = (postId: number) => {
  toast.success('已点赞')
}

const handleFavorite = (postId: number) => {
  toast.success('已收藏')
}
</script>
