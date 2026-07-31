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
              <UserAvatar
                class="h-24 w-24 shrink-0 rounded-full border-4 border-white text-2xl font-bold dark:border-slate-900"
                :src="user.profileVisible === false ? '' : user.avatar"
                :name="user.profileVisible === false ? '受限主页' : user.nickname"
                alt=""
                :fallback="avatarText"
              />
              <div class="min-w-0 pt-1">
                <h1 class="text-2xl font-bold text-slate-950 dark:text-slate-50">
                  {{ user.profileVisible === false ? '受限主页' : user.nickname }}
                </h1>
                <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  {{ profileDescription }}
                </p>
              </div>
            </div>
            <div class="profile-actions">
              <PublicShareButton
                :title="user.profileVisible === false ? '主页暂不可用' : user.nickname"
                :text="profileSeoDescription"
                :canonical="`/u/${profileUid}`"
                label="分享主页"
                :disabled="user.profileVisible === false"
                disabled-reason="该作者主页当前不可公开分享"
              />
              <button
                v-if="user.profileVisible !== false && !isViewingSelf"
                type="button"
                class="follow-button"
                :disabled="isFollowBusy"
                @click="toggleFollow"
              >
                {{ isFollowBusy ? '处理中...' : user.isFollowing ? '已关注' : '关注' }}
              </button>
              <template v-if="showContactAuthorEntry">
                <button
                  v-if="canStartContactRequest"
                  type="button"
                  class="contact-author-button"
                  @click="openContactRequestDialog"
                >
                  联系作者
                </button>
                <span v-else class="contact-author-unavailable">作者暂未开放联系请求</span>
              </template>
            </div>
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
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">公开内容反馈</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ contributionSourceText }}。这些反馈只用于了解公开内容表现，不代表平台排名或等级。
                </p>
              </div>
              <div class="score-card public-feedback-card">
                <strong>{{ visiblePosts.length }}</strong>
                <span>公开内容</span>
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

          <section
            class="profile-panel"
            data-phase15-public-identity
            data-public-governance-filtered
            data-explainable-trust-signals
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">社区身份摘要</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ publicIdentitySummary.sourceNote }}
                </p>
              </div>
              <span class="identity-neutral-pill">公开来源解释</span>
            </div>
            <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article v-for="signal in publicIdentitySummary.signals" :key="signal.key" class="identity-signal-card">
                <span>{{ signal.label }}</span>
                <strong>{{ signal.value }}</strong>
                <p>{{ signal.description }}</p>
              </article>
            </div>
            <div v-if="publicIdentitySummary.focusLabels.length" class="mt-5 flex flex-wrap gap-2">
              <span v-for="label in publicIdentitySummary.focusLabels" :key="label" class="tag-pill">{{ label }}</span>
            </div>
            <div
              v-if="authStore.isLoggedIn && relationshipContext.visibleToViewer"
              class="relationship-context-box"
              data-relationship-context-private
            >
              <strong>仅你可见的关系上下文</strong>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <article v-for="item in relationshipContext.items" :key="item.key">
                  <span>{{ item.label }} · {{ item.value }}</span>
                  <p>{{ item.description }}</p>
                </article>
              </div>
            </div>
            <RouterLink :to="`/u/${profileUid}/contributions`" class="open-link mt-5 inline-flex">
              查看公开协作贡献
            </RouterLink>
          </section>

          <section class="profile-panel">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">为什么值得关注</h2>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  结合过滤后的代表内容、公开合集和内容类型，帮助读者理解这位作者常写什么。
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">代表作</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                优先展示精选、高互动和近期活跃的公开内容，匿名内容不会进入作者主页。
              </p>
            </div>
            <div v-if="representativePosts.length === 0" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              这位作者还没有可展示的代表作。
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
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">公开内容资产</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                作者公开整理过的公开合集会展示在这里作为可继续阅读的内容资产；仅展示公开且通过治理过滤的内容。
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
                <div class="collection-cover">
                  <img
                    v-if="showCollectionCover(collection)"
                    :src="collection.coverUrl"
                    :alt="collection.title"
                    @error="handleCollectionCoverError(collection.coverUrl)"
                  />
                  <span v-else>{{ collection.title.charAt(0).toUpperCase() }}</span>
                </div>
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
          <section class="profile-panel">
            <div class="border-b border-slate-200 pb-4 dark:border-slate-800">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">Public favorite folders</h2>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Only public folders are shown. Private folders and non-public posts stay hidden.
              </p>
            </div>
            <div v-if="isLoadingFavoriteFolders" class="py-8 text-sm text-slate-500 dark:text-slate-400">
              Loading public favorite folders...
            </div>
            <div v-else-if="favoriteFoldersError" class="py-8 text-sm text-rose-600 dark:text-rose-300">
              {{ favoriteFoldersError }}
            </div>
            <div v-else-if="publicFavoriteFolders.length === 0" class="py-8 text-sm text-slate-500 dark:text-slate-400">
              This author has not published favorite folders yet.
            </div>
            <div v-else class="collection-grid pt-5">
              <article v-for="folder in publicFavoriteFolders" :key="folder.id" class="collection-card">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h3>{{ folder.name }}</h3>
                    <span>{{ folder.postCount }} posts</span>
                  </div>
                  <p>{{ folder.description || 'A public favorite folder curated by this author.' }}</p>
                </div>
                <div class="collection-meta">
                  <span>{{ formatTime(folder.updatedAt) }}</span>
                  <RouterLink :to="`/favorite-folders/${folder.id}`">Open folder</RouterLink>
                </div>
              </article>
            </div>
          </section>
        </template>
      </template>
    </div>
    </main>
    <ContactRequestDialog
      v-if="user"
      v-model="isContactDialogOpen"
      :receiver-uid="user.uid"
      :receiver-name="user.nickname"
      source-type="profile"
      :source-id="profileUid"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { userApi } from '@/api/user'
import { postApi } from '@/api/post'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { interactionApi } from '@/api/interaction'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import ContactRequestDialog from '@/components/contact/ContactRequestDialog.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import type { FavoriteFolder, Post, User, UserIntent } from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'
import {
  buildFollowReasons,
  creatorFocusLabels as buildCreatorFocusLabels,
  latestPublicPosts,
  pickRepresentativePosts,
  publicAuthorPosts,
  safeCreatorBio,
} from '@/utils/creatorSignals'
import { filterVisibleCollections, filterVisiblePosts } from '@/utils/recommendationGovernance'
import { buildPublicIdentitySummary, buildRelationshipContext } from '@/utils/communityIdentity'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

const route = useRoute()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const user = ref<User | null>(null)
const userIntent = ref<UserIntent | null>(null)
const posts = ref<Post[]>([])
const publicCollections = ref<ContentSeriesRecord[]>([])
const publicFavoriteFolders = ref<FavoriteFolder[]>([])
const backendContribution = ref<ContributionSummary | null>(null)
const isLoading = ref(false)
const isLoadingCollections = ref(false)
const isLoadingFavoriteFolders = ref(false)
const loadError = ref('')
const collectionsError = ref('')
const favoriteFoldersError = ref('')
const failedCollectionCoverUrls = ref(new Set<string>())
const isFollowBusy = ref(false)
const isContactDialogOpen = ref(false)
let profileLoadGeneration = 0
let profileLoadController: AbortController | null = null

const profileUid = computed(() => String(route.params.uid || ''))
const avatarText = computed(() => user.value?.nickname?.charAt(0) || '?')
const profileDescription = computed(() => {
  if (!user.value || user.value.profileVisible === false) return '访问范围由该用户的隐私设置决定。'
  return safeCreatorBio(user.value.signature)
})
const profileSeoDescription = computed(() => summarizeSeoText(
  user.value?.profileVisible === false ? '' : user.value?.signature,
  user.value?.profileVisible === false
    ? '该作者主页当前不可公开浏览。'
    : '作者公开主页，展示公开内容、公开合集和社区内公开行为摘要。',
))
const visiblePosts = computed(() => publicAuthorPosts(filterVisiblePosts(posts.value)))
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
const publicIdentitySummary = computed(() => buildPublicIdentitySummary(user.value, visiblePosts.value, publicCollections.value, contribution.value))
const relationshipContext = computed(() => authStore.isLoggedIn
  ? buildRelationshipContext({
      viewerUid: authStore.user?.uid,
      author: user.value,
      isLoggedIn: authStore.isLoggedIn,
      isPublicVisitor: false,
    })
  : { visibleToViewer: false, items: [] })
const isViewingSelf = computed(() => String(authStore.user?.uid ?? '') === String(user.value?.uid ?? ''))
const isContactRequestOpen = computed(() => {
  if (!user.value || user.value.profileVisible === false) return false
  if (user.value.canStartContactRequest !== undefined) return user.value.canStartContactRequest === true
  if (user.value.acceptContactRequest === false) return false
  return String(user.value.contactRequestPolicy ?? '').toLowerCase() !== 'off'
})
const showContactAuthorEntry = computed(() => Boolean(user.value)
  && user.value?.profileVisible !== false
  && !isViewingSelf.value)
const canStartContactRequest = computed(() => showContactAuthorEntry.value && isContactRequestOpen.value)

const formatTime = (value: number) => {
  if (!value) return '刚刚更新'
  const diff = Date.now() - value
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前更新`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前更新`
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前更新`
}

const showCollectionCover = (collection: ContentSeriesRecord) => {
  const coverUrl = String(collection.coverUrl || '')
  return Boolean(coverUrl) && !failedCollectionCoverUrls.value.has(coverUrl)
}

const handleCollectionCoverError = (coverUrl?: string) => {
  const safeCoverUrl = String(coverUrl || '')
  if (!safeCoverUrl) return
  failedCollectionCoverUrls.value = new Set([...failedCollectionCoverUrls.value, safeCoverUrl])
}

const isActiveProfileLoad = (generation: number, uid: string, signal: AbortSignal) => (
  !signal.aborted
  && generation === profileLoadGeneration
  && uid === profileUid.value
)

const loadPublicCollections = async (uid: string, generation: number, signal: AbortSignal) => {
  isLoadingCollections.value = true
  collectionsError.value = ''
  try {
    const res = await contentSeriesApi.listPublicByUser(uid, undefined, 6)
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicCollections.value = filterVisibleCollections(res.data || [])
  } catch (error: any) {
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicCollections.value = []
    collectionsError.value = getErrorMessage(error, '公开合集加载失败')
  } finally {
    if (isActiveProfileLoad(generation, uid, signal)) {
      isLoadingCollections.value = false
    }
  }
}

const loadPublicFavoriteFolders = async (uid: string, generation: number, signal: AbortSignal) => {
  isLoadingFavoriteFolders.value = true
  favoriteFoldersError.value = ''
  try {
    const res = await interactionApi.listPublicFavoriteFoldersByUser(uid, 6)
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicFavoriteFolders.value = (res.data || []).filter((folder) => folder.visibility === 'public')
  } catch (error: any) {
    if (!isActiveProfileLoad(generation, uid, signal)) return
    publicFavoriteFolders.value = []
    favoriteFoldersError.value = getErrorMessage(error, '公开收藏夹加载失败')
  } finally {
    if (isActiveProfileLoad(generation, uid, signal)) {
      isLoadingFavoriteFolders.value = false
    }
  }
}

const loadProfile = async () => {
  const uid = profileUid.value
  if (!uid) return
  profileLoadController?.abort()
  const controller = new AbortController()
  profileLoadController = controller
  const generation = ++profileLoadGeneration
  isLoading.value = true
  loadError.value = ''
  user.value = null
  posts.value = []
  publicCollections.value = []
  publicFavoriteFolders.value = []
  userIntent.value = null
  backendContribution.value = null
  try {
    const profile = await userApi.getProfile(uid)
    if (!isActiveProfileLoad(generation, uid, controller.signal)) return
    user.value = profile.data
    if (!profile.data || profile.data.profileVisible === false) {
      posts.value = []
      userIntent.value = null
      backendContribution.value = null
      isLoadingCollections.value = false
      isLoadingFavoriteFolders.value = false
      return
    }
    const [intent, authoredPosts, contributionRes] = await Promise.allSettled([
      userApi.getIntent(uid),
      postApi.list({ authorId: uid }),
      userApi.getContribution(uid),
    ])
    if (!isActiveProfileLoad(generation, uid, controller.signal)) return
    userIntent.value = intent.status === 'fulfilled' ? intent.value.data : null
    posts.value = authoredPosts.status === 'fulfilled' ? filterVisiblePosts(authoredPosts.value.data?.items || []) : []
    backendContribution.value = contributionRes.status === 'fulfilled' ? contributionRes.value.data : null
    await Promise.all([
      loadPublicCollections(uid, generation, controller.signal),
      loadPublicFavoriteFolders(uid, generation, controller.signal),
    ])
  } catch (error: any) {
    if (!isActiveProfileLoad(generation, uid, controller.signal)) return
    loadError.value = getErrorMessage(error, '用户资料加载失败')
  } finally {
    if (isActiveProfileLoad(generation, uid, controller.signal)) {
      isLoading.value = false
    }
  }
}

const toggleFollow = async () => {
  if (!user.value) return
  if (!requireLogin()) return
  if (isFollowBusy.value) return
  isFollowBusy.value = true
  const targetUid = String(user.value.uid)
  const wasFollowing = Boolean(user.value.isFollowing)
  try {
    if (wasFollowing) {
      await userApi.unfollow(targetUid)
    } else {
      await userApi.follow(targetUid)
    }
    if (String(user.value?.uid ?? '') !== targetUid || profileUid.value !== targetUid) return
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

const openContactRequestDialog = () => {
  if (!canStartContactRequest.value) return
  if (!requireLogin()) return
  isContactDialogOpen.value = true
}

watch(profileUid, loadProfile, { immediate: true })
watch([user, loadError, profileUid], () => {
  applyPageSeo({
    title: user.value?.profileVisible === false
      ? '主页暂不可用'
      : user.value?.nickname || (loadError.value ? '作者主页暂不可用' : '作者主页'),
    description: profileSeoDescription.value,
    canonical: `/u/${profileUid.value}`,
  })
}, { immediate: true })

onBeforeUnmount(() => {
  profileLoadGeneration += 1
  profileLoadController?.abort()
  profileLoadController = null
})
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
.contact-author-button,
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

.contact-author-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
}

.contact-author-unavailable {
  display: inline-flex;
  min-height: 40px;
  max-width: 100%;
  align-items: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.625rem 1rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
  font-weight: 600;
}

.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
}

.follow-button:disabled,
.contact-author-button:disabled {
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

.public-feedback-card strong {
  color: rgb(37 99 235);
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

.identity-neutral-pill {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  border-radius: 999px;
  background: rgb(240 253 244);
  padding: 0.35rem 0.75rem;
  color: rgb(22 101 52);
  font-size: 0.75rem;
  font-weight: 700;
}

.identity-signal-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 1rem;
}

.identity-signal-card span,
.relationship-context-box span {
  color: rgb(71 85 105);
  font-size: 0.78rem;
  font-weight: 700;
}

.identity-signal-card strong {
  margin-top: 0.25rem;
  display: block;
  color: rgb(15 23 42);
  font-size: 1.35rem;
  font-weight: 800;
}

.identity-signal-card p,
.relationship-context-box p {
  margin-top: 0.5rem;
  color: rgb(100 116 139);
  font-size: 0.8rem;
  line-height: 1.6;
}

.relationship-context-box {
  margin-top: 1.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 1rem;
}

.relationship-context-box > strong {
  color: rgb(30 64 175);
  font-size: 0.875rem;
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
  grid-template-columns: 4.25rem minmax(0, 1fr);
  gap: 0.9rem;
  align-items: start;
  border-bottom: 1px solid rgb(241 245 249);
  padding-bottom: 1rem;
}

.collection-cover {
  display: flex;
  aspect-ratio: 1;
  width: 4.25rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.75rem;
  background: rgb(15 23 42);
  color: white;
  font-size: 1.2rem;
  font-weight: 900;
}

.collection-cover img {
  display: block;
  height: 100%;
  width: 100%;
  object-fit: cover;
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

.collection-card > div:not(.collection-cover) span {
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

.dark .contact-author-button,
.dark .contact-author-unavailable {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
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

.dark .collection-cover {
  background: rgb(30 41 59);
}

.dark .collection-card h3 {
  color: rgb(248 250 252);
}

.dark .collection-card p {
  color: rgb(148 163 184);
}

.dark .collection-card > div:not(.collection-cover) span {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

@media (max-width: 640px) {
  .collection-card {
    grid-template-columns: 1fr;
  }

  .follow-button,
  .contact-author-button,
  .contact-author-unavailable,
  .profile-actions {
    width: 100%;
  }

  .post-row {
    align-items: flex-start;
    flex-direction: column;
  }
}

</style>
