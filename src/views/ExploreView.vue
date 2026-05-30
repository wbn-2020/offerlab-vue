<template>
  <div class="app-shell">
    <AppHeader />
    <main class="mx-auto max-w-6xl px-4 py-8">
      <div class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">发现</h1>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">从真实标签、公开用户和最新内容里找到值得关注的求职经验。</p>
        </div>
        <RouterLink to="/editor" class="primary-action">
          发布内容
        </RouterLink>
      </div>

      <section class="surface-card mb-8 p-5">
        <div class="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-end">
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">关键词</span>
            <input v-model="searchForm.q" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="面经、技术栈、公司或岗位" @keyup.enter="goSearch" />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">公司</span>
            <input v-model="searchForm.company" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="例如 字节跳动" @keyup.enter="goSearch" />
          </label>
          <label>
            <span class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">岗位</span>
            <input v-model="searchForm.position" class="filter-input dark:!border-slate-700 dark:!bg-slate-950/60 dark:!text-slate-200 dark:placeholder:!text-slate-500" placeholder="例如 Java 后端" @keyup.enter="goSearch" />
          </label>
          <button type="button" class="primary-action px-5 py-2.5" @click="goSearch">
            搜索内容
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-for="item in quickFilters"
            :key="item.value"
            type="button"
            class="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:bg-slate-800"
            @click="applyQuickFilter(item)"
          >
            {{ item.label }}
          </button>
        </div>
      </section>

      <section class="surface-card mb-8 p-6">
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
            class="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300 dark:hover:border-primary-700 dark:hover:bg-slate-800"
          >
            {{ tag.name }}
            <span class="ml-2 text-xs text-slate-500 dark:text-slate-400">{{ tag.count ?? 0 }}</span>
          </RouterLink>
        </div>
        <EmptyState v-else title="暂无标签" description="发布内容时添加标签后会显示在这里。" />
      </section>

      <section class="surface-card mb-8 p-6">
        <div class="mb-5 flex items-center justify-between gap-4">
          <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">推荐用户</h2>
          <RouterLink to="/search?mode=users" class="text-sm font-medium text-primary-600 hover:text-primary-700">查看更多</RouterLink>
        </div>
        <div v-if="recommendedUsers.length" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article
            v-for="user in recommendedUsers"
            :key="user.uid"
            class="rounded-xl border border-slate-200 bg-white/70 p-4 text-center transition-colors hover:border-primary-300 dark:border-slate-800 dark:bg-slate-950/25 dark:hover:border-primary-700"
          >
            <RouterLink :to="`/u/${user.uid}`" class="block">
              <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xl font-bold text-white">
                <img v-if="user.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
                <span v-else>{{ user.nickname.charAt(0) || '?' }}</span>
              </div>
              <h3 class="truncate font-bold text-slate-900 dark:text-slate-100">{{ user.nickname }}</h3>
              <p class="mt-1 line-clamp-2 min-h-8 text-xs text-slate-500 dark:text-slate-400">{{ user.signature || '公开用户资料' }}</p>
            </RouterLink>
            <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ user.postCount ?? 0 }} 帖子</span>
              <span>{{ user.followerCount ?? 0 }} 粉丝</span>
            </div>
            <button
              type="button"
              class="mt-4 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              :class="user.isFollowing ? 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800' : 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300'"
              :disabled="isSelf(user) || followingBusyIds.has(String(user.uid))"
              @click="toggleFollowUser(user)"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </button>
          </article>
        </div>
        <EmptyState v-else title="暂无推荐用户" description="公开用户资料会展示在这里。" />
      </section>

      <section class="surface-card p-6">
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
            class="block rounded-lg border border-slate-200 bg-white/65 p-4 transition-colors hover:border-primary-300 dark:border-slate-800 dark:bg-slate-950/25 dark:hover:border-primary-700"
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
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { postApi } from '@/api/post'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import type { Post, Tag, User } from '@/api/types'

const tags = ref<Tag[]>([])
const recommendedUsers = ref<User[]>([])
const latestPosts = ref<Post[]>([])
const isLoadingMeta = ref(true)
const isLoadingPosts = ref(true)
const followingBusyIds = ref(new Set<string>())
const router = useRouter()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()

const searchForm = reactive({
  q: '',
  company: '',
  position: '',
})

const sortedTags = computed(() => [...tags.value].sort((a, b) => (b.count ?? 0) - (a.count ?? 0)))
const quickFilters = computed(() => {
  const companies = new Set<string>()
  const positions = new Set<string>()
  latestPosts.value.forEach((post) => {
    if (post.extension?.company) companies.add(String(post.extension.company))
    if (post.extension?.position) positions.add(String(post.extension.position))
  })
  return [
    ...Array.from(companies).slice(0, 4).map((value) => ({ label: `公司：${value}`, value, type: 'company' as const })),
    ...Array.from(positions).slice(0, 4).map((value) => ({ label: `岗位：${value}`, value, type: 'position' as const })),
  ]
})

const goSearch = () => {
  router.push({
    path: '/search',
    query: {
      ...(searchForm.q.trim() ? { q: searchForm.q.trim() } : {}),
      ...(searchForm.company.trim() ? { company: searchForm.company.trim() } : {}),
      ...(searchForm.position.trim() ? { position: searchForm.position.trim() } : {}),
      sort: 'relevance',
    },
  })
}

const applyQuickFilter = (item: { value: string; type: 'company' | 'position' }) => {
  if (item.type === 'company') {
    searchForm.company = item.value
  } else {
    searchForm.position = item.value
  }
  goSearch()
}

const isSelf = (user: User) => Boolean(authStore.user && String(authStore.user.uid) === String(user.uid))

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

<style scoped>
.filter-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 0.75rem 0.9rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.filter-input:focus {
  border-color: rgb(129 140 248);
  background: white;
  box-shadow: 0 0 0 3px rgb(224 231 255 / 0.8);
}

:global(.dark) .filter-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.55);
  color: rgb(226 232 240);
}

:global(.dark) .filter-input::placeholder {
  color: rgb(100 116 139);
}

:global(.dark) .filter-input:focus {
  border-color: rgb(99 102 241 / 0.65);
  background: rgb(15 23 42 / 0.9);
  box-shadow: 0 0 0 3px rgb(67 56 202 / 0.28);
}
</style>
