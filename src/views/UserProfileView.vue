<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="px-4 py-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <section v-if="isLoading" class="profile-panel py-20 text-center text-sm text-slate-500 dark:text-slate-400">
        正在加载用户主页...
      </section>

      <section v-else-if="loadError" class="profile-panel py-16 text-center">
        <h1 class="text-xl font-semibold text-slate-950 dark:text-slate-50">主页暂不可用</h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ loadError }}</p>
      </section>

      <template v-else-if="user">
        <section class="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div class="h-28 bg-gradient-to-r from-primary-600 via-sky-600 to-emerald-500" />
          <div class="-mt-10 flex flex-col gap-5 px-6 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
              <div class="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-2xl font-bold text-white dark:border-slate-900">
                {{ avatarText }}
              </div>
              <div class="pt-1">
                <h1 class="text-2xl font-bold text-slate-950 dark:text-slate-50">
                  {{ user.profileVisible === false ? '受限主页' : user.nickname }}
                </h1>
                <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  {{ profileDescription }}
                </p>
              </div>
            </div>
            <button
              v-if="user.profileVisible !== false"
              type="button"
              class="follow-button"
              @click="toggleFollow"
            >
              {{ user.isFollowing ? '已关注' : '关注' }}
            </button>
          </div>
        </section>

        <section v-if="user.profileVisible === false" class="profile-panel py-14 text-center">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">该用户限制了主页访问</h2>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">资料、帖子和关注方向会按隐私设置隐藏。</p>
        </section>

        <template v-else>
          <section class="grid gap-4 sm:grid-cols-3">
            <article class="stat-card">
              <strong>{{ user.postCount || posts.length }}</strong>
              <span>发帖</span>
            </article>
            <article class="stat-card">
              <strong>{{ user.followingCount || 0 }}</strong>
              <span>关注</span>
            </article>
            <article class="stat-card">
              <strong>{{ user.followerCount || 0 }}</strong>
              <span>粉丝</span>
            </article>
          </section>

          <section class="profile-panel">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">社区贡献</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ contribution.level }} · {{ contribution.badge }}，{{ contributionSourceText }}。
                </p>
              </div>
              <div class="score-card">
                <strong>{{ contribution.score }}</strong>
                <span>贡献值</span>
              </div>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-4">
              <article class="mini-stat"><strong>{{ contribution.featuredCount }}</strong><span>被精选</span></article>
              <article class="mini-stat"><strong>{{ contribution.likeCount }}</strong><span>获赞</span></article>
              <article class="mini-stat"><strong>{{ contribution.favoriteCount }}</strong><span>收藏</span></article>
              <article class="mini-stat"><strong>{{ contribution.commentCount }}</strong><span>评论</span></article>
            </div>
            <div v-if="typeDistribution.length" class="mt-5">
              <div class="mb-2 text-sm font-bold text-slate-700 dark:text-slate-200">内容类型分布</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="item in typeDistribution" :key="item.name" class="tag-pill">
                  {{ item.name }} {{ item.count }}
                </span>
              </div>
            </div>
          </section>

          <section v-if="user.intentVisible === false" class="profile-panel text-sm text-slate-500 dark:text-slate-400">
            该用户的关注方向当前不可见。
          </section>
          <section v-else-if="userIntent" class="profile-panel">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">关注方向</h2>
            <div class="mt-4 flex flex-wrap gap-2 text-sm">
              <span v-for="company in userIntent.targetCompanies || []" :key="company" class="tag-pill">领域：{{ company }}</span>
              <span v-for="position in userIntent.targetPositions || []" :key="position" class="tag-pill">方向：{{ position }}</span>
              <span v-if="userIntent.targetCity" class="tag-pill">城市：{{ userIntent.targetCity }}</span>
              <span v-if="userIntent.yearsOfExp" class="tag-pill">经验：{{ userIntent.yearsOfExp }} 年</span>
            </div>
          </section>

          <section class="profile-panel">
            <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">公开帖子</h2>
            </div>
            <div v-if="posts.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              该用户还没有公开帖子。
            </div>
            <div v-else class="space-y-4 pt-5">
              <article v-for="post in posts" :key="post.postId" class="post-row">
                <div class="min-w-0">
                  <h3 class="line-clamp-2 text-base font-semibold text-slate-950 dark:text-slate-50">{{ post.title }}</h3>
                  <p class="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
                    {{ post.summary || post.content.slice(0, 100) }}
                  </p>
                </div>
                <router-link :to="`/post/${post.postId}`" class="open-link">查看</router-link>
              </article>
            </div>
          </section>
        </template>
      </template>
    </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { userApi } from '@/api/user'
import { postApi } from '@/api/post'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import type { Post, User, UserIntent } from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'

const route = useRoute()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const user = ref<User | null>(null)
const userIntent = ref<UserIntent | null>(null)
const posts = ref<Post[]>([])
const backendContribution = ref<ContributionSummary | null>(null)
const isLoading = ref(false)
const loadError = ref('')

const avatarText = computed(() => user.value?.nickname?.charAt(0) || '?')
const profileDescription = computed(() => {
  if (!user.value || user.value.profileVisible === false) return '访问范围由该用户的隐私设置决定。'
  return user.value.signature || '这个用户还没有填写简介。'
})
const contribution = computed(() => backendContribution.value || { ...buildContributionSummary(posts.value), source: 'frontend_estimate', estimated: true })
const contributionSourceText = computed(() => {
  if (contribution.value.source === 'backend_aggregate') return '由后端按公开内容、精选和互动数据汇总'
  if (contribution.value.source === 'profile_restricted') return '该用户限制了主页访问，贡献数据已隐藏'
  return '接口暂不可用，当前为本地估算'
})
const typeDistribution = computed(() => buildTypeDistribution(posts.value))

const loadProfile = async () => {
  const uid = route.params.uid as string
  if (!uid) return
  isLoading.value = true
  loadError.value = ''
  try {
    const profile = await userApi.getProfile(uid)
    user.value = profile.data
    if (!profile.data || profile.data.profileVisible === false) {
      posts.value = []
      userIntent.value = null
      backendContribution.value = null
      return
    }
    const [intent, authoredPosts, contributionRes] = await Promise.allSettled([
      userApi.getIntent(uid),
      postApi.list({ authorId: uid }),
      userApi.getContribution(uid),
    ])
    userIntent.value = intent.status === 'fulfilled' ? intent.value.data : null
    posts.value = authoredPosts.status === 'fulfilled' ? authoredPosts.value.data?.items || [] : []
    backendContribution.value = contributionRes.status === 'fulfilled' ? contributionRes.value.data : null
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '用户资料加载失败')
  } finally {
    isLoading.value = false
  }
}

const toggleFollow = async () => {
  if (!user.value) return
  if (!requireLogin()) return
  try {
    if (user.value.isFollowing) {
      await userApi.unfollow(user.value.uid)
    } else {
      await userApi.follow(user.value.uid)
    }
    user.value.isFollowing = !user.value.isFollowing
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  }
}

onMounted(loadProfile)
</script>

<style scoped>
.profile-panel,
.stat-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: white;
  padding: 1.5rem;
}

.stat-card strong {
  display: block;
  color: rgb(15 23 42);
  font-size: 1.75rem;
  font-weight: 800;
}

.stat-card span {
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.follow-button,
.open-link {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(79 70 229);
  padding: 0.625rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.tag-pill {
  border-radius: 0.375rem;
  background: rgb(241 245 249);
  padding: 0.35rem 0.6rem;
  color: rgb(51 65 85);
}

.score-card,
.mini-stat {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.score-card {
  min-width: 8rem;
  text-align: center;
}

.score-card strong,
.mini-stat strong {
  display: block;
  font-weight: 900;
  color: rgb(79 70 229);
}

.score-card strong {
  font-size: 1.75rem;
}

.mini-stat strong {
  font-size: 1.35rem;
}

.score-card span,
.mini-stat span {
  margin-top: 0.2rem;
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.post-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding-bottom: 1rem;
}

.dark .profile-panel,
.dark .stat-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .stat-card strong {
  color: rgb(241 245 249);
}

.dark .tag-pill {
  background: rgb(30 41 59);
  color: rgb(226 232 240);
}

.dark .score-card,
.dark .mini-stat {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .post-row {
  border-bottom-color: rgb(30 41 59);
}

@media (max-width: 640px) {
  .post-row {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
