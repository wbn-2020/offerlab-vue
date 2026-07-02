<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="px-4 py-8">
    <div class="mx-auto max-w-6xl space-y-6">
      <section v-if="isLoading" class="profile-panel py-20 text-center text-sm text-slate-500 dark:text-slate-400">
        正在加载作者主页...
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
              <div class="min-w-0 pt-1">
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
              :disabled="isFollowBusy"
              @click="toggleFollow"
            >
              {{ isFollowBusy ? '处理中...' : user.isFollowing ? '已关注' : '关注' }}
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
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">作者数据</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ contribution.level }} · {{ contribution.badge }}，{{ contributionSourceText }}。
                </p>
              </div>
              <div class="score-card">
                <strong>{{ contribution.score }}</strong>
                <span>影响力</span>
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

          <section class="profile-panel">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">为什么值得关注</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  结合公开内容、互动反馈和公开合集，帮助读者快速判断这位作者的创作方向。
                </p>
              </div>
              <RouterLink v-if="publicCollections.length" :to="`/collections/${publicCollections[0].id}`" class="open-link">
                查看公开合集
              </RouterLink>
            </div>
            <div class="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div class="space-y-3">
                <div v-for="reason in followReasons" :key="reason" class="reason-row">
                  <span />
                  <p>{{ reason }}</p>
                </div>
              </div>
              <div v-if="creatorFocusLabels.length" class="focus-box">
                <strong>创作方向</strong>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span v-for="label in creatorFocusLabels" :key="label" class="tag-pill">{{ label }}</span>
                </div>
              </div>
            </div>
          </section>

          <section v-if="user.intentVisible === false" class="profile-panel text-sm text-slate-500 dark:text-slate-400">
            该用户的关注方向当前不可见。
          </section>
          <section v-else-if="userIntent" class="profile-panel">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">感兴趣的频道</h2>
            <div class="mt-4 flex flex-wrap gap-2 text-sm">
              <span v-for="company in userIntent.targetCompanies || []" :key="company" class="tag-pill">领域：{{ company }}</span>
              <span v-for="position in userIntent.targetPositions || []" :key="position" class="tag-pill">方向：{{ position }}</span>
              <span v-if="userIntent.targetCity" class="tag-pill">城市：{{ userIntent.targetCity }}</span>
              <span v-if="userIntent.yearsOfExp" class="tag-pill">经历：{{ userIntent.yearsOfExp }} 年</span>
            </div>
          </section>

          <section class="profile-panel">
            <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">代表内容</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                优先展示精选、高互动和近期活跃的公开内容，匿名内容不会进入作者主页。
              </p>
            </div>
            <div v-if="representativePosts.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              这位作者还没有可展示的代表内容。
            </div>
            <div v-else class="space-y-4 pt-5">
              <article v-for="post in representativePosts" :key="post.postId" class="post-row">
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

          <section class="profile-panel">
            <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">最新内容</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                按发布时间展示最近公开更新，方便继续追踪作者动态。
              </p>
            </div>
            <div v-if="latestPosts.length === 0" class="py-8 text-sm text-slate-500 dark:text-slate-400">
              暂无最新公开内容。
            </div>
            <div v-else class="latest-grid pt-5">
              <RouterLink v-for="post in latestPosts" :key="post.postId" :to="`/post/${post.postId}`" class="latest-card">
                <h3>{{ post.title }}</h3>
                <p>{{ post.summary || post.content.slice(0, 80) }}</p>
              </RouterLink>
            </div>
          </section>

          <section class="profile-panel">
            <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">公开合集</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                作者公开整理过的主题内容，会展示在这里作为可继续阅读的内容资产。
              </p>
            </div>
            <div v-if="isLoadingCollections" class="py-8 text-sm text-slate-500 dark:text-slate-400">
              正在加载公开合集...
            </div>
            <div v-else-if="collectionsError" class="py-8 text-sm text-rose-600 dark:text-rose-300">
              {{ collectionsError }}
            </div>
            <div v-else-if="publicCollections.length === 0" class="py-8 text-sm text-slate-500 dark:text-slate-400">
              这位作者还没有公开合集。
            </div>
            <div v-else class="collection-grid pt-5">
              <article v-for="collection in publicCollections" :key="collection.id" class="collection-card">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3>{{ collection.title }}</h3>
                    <span>{{ collection.progress.totalCount }} 篇内容</span>
                  </div>
                  <p>{{ collection.summary || '这个合集暂未填写简介。' }}</p>
                </div>
                <div class="collection-meta">
                  <span>{{ formatTime(collection.updatedAt) }}</span>
                  <RouterLink :to="`/collections/${collection.id}`">查看合集</RouterLink>
                </div>
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
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import type { Post, User, UserIntent } from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'
import {
  buildFollowReasons,
  creatorFocusLabels as buildCreatorFocusLabels,
  latestPublicPosts,
  pickRepresentativePosts,
  publicAuthorPosts,
  safeCreatorBio,
} from '@/utils/creatorSignals'

const route = useRoute()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const user = ref<User | null>(null)
const userIntent = ref<UserIntent | null>(null)
const posts = ref<Post[]>([])
const publicCollections = ref<ContentSeriesRecord[]>([])
const backendContribution = ref<ContributionSummary | null>(null)
const isLoading = ref(false)
const isLoadingCollections = ref(false)
const loadError = ref('')
const collectionsError = ref('')
const isFollowBusy = ref(false)

const avatarText = computed(() => user.value?.nickname?.charAt(0) || '?')
const profileDescription = computed(() => {
  if (!user.value || user.value.profileVisible === false) return '访问范围由该用户的隐私设置决定。'
  return safeCreatorBio(user.value.signature)
})
const visiblePosts = computed(() => publicAuthorPosts(posts.value))
const contribution = computed(() => backendContribution.value || { ...buildContributionSummary(visiblePosts.value), source: 'frontend_estimate', estimated: true })
const contributionSourceText = computed(() => {
  if (contribution.value.source === 'backend_aggregate') return '按公开内容和互动数据汇总'
  if (contribution.value.source === 'profile_restricted') return '该用户限制了主页访问，贡献数据已隐藏'
  return '接口暂不可用，当前为本地估算'
})
const typeDistribution = computed(() => buildTypeDistribution(visiblePosts.value))
const representativePosts = computed(() => pickRepresentativePosts(visiblePosts.value, 3))
const latestPosts = computed(() => latestPublicPosts(visiblePosts.value, 6))
const creatorFocusLabels = computed(() => buildCreatorFocusLabels(visiblePosts.value, 6))
const followReasons = computed(() => buildFollowReasons(user.value, visiblePosts.value, contribution.value, publicCollections.value))

const formatTime = (value: number) => {
  if (!value) return '刚刚更新'
  const diff = Date.now() - value
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前更新`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前更新`
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前更新`
}

const loadPublicCollections = async (uid: string) => {
  isLoadingCollections.value = true
  collectionsError.value = ''
  try {
    const res = await contentSeriesApi.listPublicByUser(uid, undefined, 6)
    publicCollections.value = res.data || []
  } catch (error: any) {
    publicCollections.value = []
    collectionsError.value = getErrorMessage(error, '公开合集加载失败')
  } finally {
    isLoadingCollections.value = false
  }
}

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
    posts.value = authoredPosts.status === 'fulfilled' ? publicAuthorPosts(authoredPosts.value.data?.items || []) : []
    backendContribution.value = contributionRes.status === 'fulfilled' ? contributionRes.value.data : null
    await loadPublicCollections(uid)
  } catch (error: any) {
    loadError.value = getErrorMessage(error, '用户资料加载失败')
  } finally {
    isLoading.value = false
  }
}

const toggleFollow = async () => {
  if (!user.value) return
  if (!requireLogin()) return
  if (isFollowBusy.value) return
  isFollowBusy.value = true
  const wasFollowing = Boolean(user.value.isFollowing)
  try {
    if (wasFollowing) {
      await userApi.unfollow(user.value.uid)
    } else {
      await userApi.follow(user.value.uid)
    }
    user.value = {
      ...user.value,
      isFollowing: !wasFollowing,
      followerCount: Math.max(0, Number(user.value.followerCount ?? 0) + (wasFollowing ? -1 : 1)),
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    isFollowBusy.value = false
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
  max-width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: rgb(79 70 229);
  padding: 0.625rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.follow-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
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

.reason-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.8rem;
}

.reason-row span {
  margin-top: 0.45rem;
  height: 0.5rem;
  width: 0.5rem;
  border-radius: 999px;
  background: rgb(79 70 229);
}

.reason-row p {
  color: rgb(51 65 85);
  font-size: 0.875rem;
  line-height: 1.65;
}

.focus-box {
  border: 1px solid rgb(199 210 254);
  border-radius: 0.625rem;
  background: rgb(238 242 255);
  padding: 1rem;
}

.focus-box strong {
  color: rgb(67 56 202);
  font-size: 0.875rem;
  font-weight: 900;
}

.latest-grid {
  display: grid;
  gap: 0.9rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.latest-card {
  display: block;
  min-height: 8rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.9rem;
}

.latest-card h3 {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.latest-card p {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 0.5rem;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: rgb(100 116 139);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.collection-grid {
  display: grid;
  gap: 0.9rem;
}

.collection-card {
  display: grid;
  gap: 0.9rem;
  border-bottom: 1px solid rgb(241 245 249);
  padding-bottom: 1rem;
}

.collection-card h3 {
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.collection-card p {
  margin-top: 0.4rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
  line-height: 1.6;
}

.collection-card span {
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0.25rem 0.6rem;
  color: rgb(29 78 216);
  font-size: 0.75rem;
  font-weight: 800;
}

.collection-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.collection-meta a {
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(79 70 229);
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

.dark .reason-row,
.dark .latest-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .reason-row p,
.dark .latest-card p {
  color: rgb(148 163 184);
}

.dark .focus-box {
  border-color: rgb(49 46 129);
  background: rgb(30 41 59);
}

.dark .focus-box strong {
  color: rgb(199 210 254);
}

.dark .latest-card h3 {
  color: rgb(248 250 252);
}

.dark .collection-card {
  border-bottom-color: rgb(30 41 59);
}

.dark .collection-card h3 {
  color: rgb(248 250 252);
}

.dark .collection-card p {
  color: rgb(148 163 184);
}

.dark .collection-card span {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

@media (max-width: 640px) {
  .follow-button {
    width: 100%;
  }

  .post-row {
    align-items: flex-start;
    flex-direction: column;
  }
}

</style>
