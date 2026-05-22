<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-6xl px-4 py-8">
      <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">发现</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">从真实标签、公开用户和最新内容里找到值得关注的求职经验。</p>
        </div>
        <RouterLink to="/editor" class="inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
          发布内容
        </RouterLink>
      </div>

      <section class="mb-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">热门标签</h2>
          <span class="text-sm text-slate-500 dark:text-slate-400">{{ sortedTags.length }} 个标签</span>
        </div>
        <div v-if="isLoadingMeta" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="i in 10" :key="i" class="h-10 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div v-else-if="sortedTags.length" class="flex flex-wrap gap-3">
          <RouterLink
            v-for="tag in sortedTags.slice(0, 24)"
            :key="tag.id"
            :to="`/tag/${tag.slug || tag.id}`"
            class="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-primary-950"
          >
            {{ tag.name }}
            <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }}</span>
          </RouterLink>
        </div>
        <EmptyState v-else title="暂无标签" description="发布内容时添加标签后会显示在这里。" />
      </section>

      <section class="mb-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">推荐用户</h2>
          <RouterLink to="/search?mode=users" class="text-sm font-medium text-primary-600 hover:text-primary-700">查看更多</RouterLink>
        </div>
        <div v-if="recommendedUsers.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <RouterLink
            v-for="user in recommendedUsers"
            :key="user.uid"
            :to="`/u/${user.uid}`"
            class="rounded-xl border border-slate-200 p-4 text-center transition-colors hover:border-primary-300 dark:border-slate-800 dark:hover:border-primary-700"
          >
            <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xl font-bold text-white">
              <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
              <span v-else>{{ user.nickname.charAt(0) || '?' }}</span>
            </div>
            <h3 class="truncate font-bold text-slate-900 dark:text-slate-100">{{ user.nickname }}</h3>
            <p class="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500 dark:text-slate-400">{{ user.signature || '公开用户资料' }}</p>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ user.postCount ?? 0 }} 帖子</span>
              <span>{{ user.followerCount ?? 0 }} 粉丝</span>
            </div>
          </RouterLink>
        </div>
        <EmptyState v-else title="暂无推荐用户" description="公开用户资料会展示在这里。" />
      </section>

      <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">最新发布</h2>
          <RouterLink to="/" class="text-sm font-medium text-primary-600 hover:text-primary-700">进入信息流</RouterLink>
        </div>
        <LoadingSkeleton v-if="isLoadingPosts" />
        <div v-else-if="latestPosts.length" class="space-y-4">
          <RouterLink
            v-for="post in latestPosts"
            :key="post.postId"
            :to="`/post/${post.postId}`"
            class="block rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary-300 dark:border-slate-800 dark:hover:border-primary-700"
          >
            <div class="flex items-start gap-4">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-sm font-bold text-white">
                <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</span>
                  <span v-if="post.extension?.company" class="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {{ post.extension.company }}
                  </span>
                </div>
                <h3 class="mb-1 line-clamp-1 text-sm font-bold text-slate-900 dark:text-slate-100">{{ post.title }}</h3>
                <p class="line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-400">{{ post.summary || post.content.substring(0, 100) }}</p>
                <div class="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>浏览 {{ post.counter.view }}</span>
                  <span>点赞 {{ post.counter.like }}</span>
                  <span>评论 {{ post.counter.comment }}</span>
                </div>
              </div>
            </div>
          </RouterLink>
        </div>
        <EmptyState v-else title="暂无公开内容" description="发布公开帖子后会出现在这里。" actionText="去发布" actionHref="/editor" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { postApi } from '@/api/post'
import { userApi } from '@/api/user'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import type { Post, Tag, User } from '@/api/types'

const tags = ref<Tag[]>([])
const recommendedUsers = ref<User[]>([])
const latestPosts = ref<Post[]>([])
const isLoadingMeta = ref(true)
const isLoadingPosts = ref(true)

const sortedTags = computed(() => [...tags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))

onMounted(async () => {
  isLoadingMeta.value = true
  isLoadingPosts.value = true
  const [tagRes, userRes, postRes] = await Promise.allSettled([
    postApi.getTags(),
    userApi.searchUsers('', 8),
    postApi.list({ size: 8 }),
  ])
  if (tagRes.status === 'fulfilled') {
    tags.value = tagRes.value.data || []
  }
  if (userRes.status === 'fulfilled') {
    recommendedUsers.value = userRes.value.data || []
  }
  if (postRes.status === 'fulfilled') {
    latestPosts.value = postRes.value.data?.items || []
  }
  isLoadingMeta.value = false
  isLoadingPosts.value = false
})
</script>
