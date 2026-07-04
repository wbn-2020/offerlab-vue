<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-6xl px-4 py-8">
      <section class="profile-panel">
        <div class="flex flex-col gap-6 md:flex-row md:items-start">
          <div class="avatar">
            <img v-if="user?.avatar" :src="user.avatar" :alt="user.nickname" class="h-full w-full object-cover" />
            <span v-else>{{ userInitial }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <p class="mb-2 text-xs font-black text-primary-600 dark:text-primary-300">我的作者主页</p>
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="truncate text-2xl font-bold text-slate-950 dark:text-slate-50">
                {{ displayNickname }}
              </h1>
              <span v-if="user?.isBigV" class="rounded bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                公开作者
              </span>
            </div>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ displaySignature }}
            </p>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="metric-card">
                <FileText class="h-4 w-4 text-primary-600" />
                <span>内容</span>
                <strong>{{ user?.postCount ?? posts.items.length }}</strong>
              </div>
              <div class="metric-card">
                <Users class="h-4 w-4 text-primary-600" />
                <span>关注</span>
                <strong>{{ user?.followingCount ?? following.items.length }}</strong>
              </div>
              <div class="metric-card">
                <UserRoundCheck class="h-4 w-4 text-primary-600" />
                <span>粉丝</span>
                <strong>{{ user?.followerCount ?? followers.items.length }}</strong>
              </div>
            </div>
          </div>

          <RouterLink to="/me/settings" class="secondary-button shrink-0">
            <Settings class="h-4 w-4" />
            编辑资料
          </RouterLink>
        </div>
      </section>

      <section class="community-growth-panel">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">我的作者主页</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ contributionSourceText }}。这里展示的是公开内容的可解释反馈，不使用分数或等级表达。
            </p>
            <p v-if="profileDemoNotice" class="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
              {{ profileDemoNotice }}
            </p>
          </div>
          <div class="score-card">
            <strong>7 / 30</strong>
            <span>近期反馈窗口</span>
          </div>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-5">
          <div class="growth-stat"><strong>{{ contribution.postCount }}</strong><span>发布</span></div>
          <div class="growth-stat"><strong>{{ contribution.featuredCount }}</strong><span>精选</span></div>
          <div class="growth-stat"><strong>{{ contribution.likeCount }}</strong><span>获赞</span></div>
          <div class="growth-stat"><strong>{{ contribution.favoriteCount }}</strong><span>收藏</span></div>
          <div class="growth-stat"><strong>{{ contribution.commentCount }}</strong><span>评论</span></div>
        </div>
        <div v-if="typeDistribution.length" class="mt-5 flex flex-wrap gap-2">
          <span v-for="item in typeDistribution" :key="item.name" class="type-chip">{{ item.name }} {{ item.count }}</span>
        </div>
      </section>

      <section class="creator-feedback-panel mt-6">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="text-xs font-black text-primary-600 dark:text-primary-300">创作者轻反馈 · 创作者工作台</p>
            <h2>近期反馈、继续回应和下一篇方向</h2>
            <span>只聚合公开内容信号；近 7 天/30 天在缺少独立事件流时按近期公开内容估算。</span>
            <span>只展示公开内容互动，不承诺曝光效果，读者仍应结合内容自行判断。</span>
          </div>
          <RouterLink to="/me/notifications" class="secondary-button">查看通知中心</RouterLink>
        </div>
        <div class="feedback-window-grid">
          <article v-for="item in feedbackWindows" :key="item.label" class="feedback-window-card">
            <div>
              <strong>{{ item.label }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <div class="feedback-window-metrics">
              <span>{{ item.posts }} 篇内容</span>
              <span>{{ item.comments }} 条评论</span>
              <span>{{ item.favorites }} 次收藏</span>
              <span>{{ item.likes }} 次点赞</span>
            </div>
          </article>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-4">
          <RouterLink to="/me?tab=posts" class="feedback-stat">
            <MessageCircle class="h-4 w-4 text-primary-600" />
            <strong>{{ contribution.commentCount }}</strong>
            <span>评论反馈</span>
            <small>回到内容讨论</small>
          </RouterLink>
          <RouterLink to="/me?tab=favorites" class="feedback-stat">
            <Bookmark class="h-4 w-4 text-primary-600" />
            <strong>{{ contribution.favoriteCount }}</strong>
            <span>收藏反馈</span>
            <small>查看被保存的内容</small>
          </RouterLink>
          <RouterLink to="/me?tab=followers" class="feedback-stat">
            <UserRoundCheck class="h-4 w-4 text-primary-600" />
            <strong>{{ user?.followerCount ?? followers.items.length }}</strong>
            <span>新增关注者</span>
            <small>回访作者主页</small>
          </RouterLink>
          <RouterLink :to="topFeedbackPost ? `/post/${topFeedbackPost.postId}` : '/me?tab=posts'" class="feedback-stat">
            <Heart class="h-4 w-4 text-primary-600" />
            <strong>{{ topFeedbackScore }}</strong>
            <span>近期表现较好内容</span>
            <small>{{ topFeedbackPost ? '打开内容继续回应' : '发布后会出现' }}</small>
          </RouterLink>
        </div>
        <div class="creator-workbench-grid">
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>表现较好内容</strong>
              <RouterLink to="/me?tab=posts">管理内容</RouterLink>
            </div>
            <div v-if="topFeedbackPosts.length" class="creator-link-list">
              <RouterLink v-for="post in topFeedbackPosts" :key="post.postId" :to="`/post/${post.postId}`">
                <span>{{ post.title }}</span>
                <small>{{ feedbackReason(post) }}</small>
              </RouterLink>
            </div>
            <p v-else class="creator-empty-copy">发布公开内容后，这里会按评论、收藏和点赞展示可继续经营的内容。</p>
          </article>
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>继续回应入口</strong>
              <RouterLink to="/me?tab=posts">查看全部</RouterLink>
            </div>
            <div v-if="replyOpportunityPosts.length" class="creator-link-list">
              <RouterLink v-for="post in replyOpportunityPosts" :key="post.postId" :to="`/post/${post.postId}`">
                <span>{{ post.title }}</span>
                <small>{{ post.counter.comment }} 条评论，适合回到公共讨论补充说明</small>
              </RouterLink>
            </div>
            <p v-else class="creator-empty-copy">暂时没有需要集中回应的讨论；可以先整理代表作或公开合集。</p>
          </article>
          <article class="creator-workbench-card">
            <div class="creator-workbench-head">
              <strong>选题灵感</strong>
              <RouterLink to="/editor">空白发布</RouterLink>
            </div>
            <div class="creator-link-list">
              <RouterLink v-for="idea in topicIdeas" :key="idea.title" :to="{ path: '/editor', query: idea.query }">
                <span>{{ idea.title }}</span>
                <small>{{ idea.reason }}</small>
              </RouterLink>
            </div>
          </article>
        </div>
      </section>

      <RevisitSummaryPanel class="mt-6" />

      <section class="creator-center-grid mt-6">
        <article class="creator-action-panel">
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-black text-primary-600 dark:text-primary-300">下一步行动</p>
              <h2>创作者中心</h2>
            </div>
            <RouterLink to="/series/workbench" class="secondary-button">整理合集</RouterLink>
          </div>
          <div class="creator-action-list">
            <RouterLink v-for="item in creatorActions" :key="item.href" :to="item.href" class="creator-action-card">
              <strong>{{ item.title }}</strong>
              <span>{{ item.description }}</span>
            </RouterLink>
          </div>
        </article>

        <article class="creator-cert-panel">
          <p class="text-xs font-black text-primary-600 dark:text-primary-300">作者主页经营</p>
          <h2>社区身份、代表作和公开合集</h2>
          <p>
            P0 先用公开内容和公开合集经营主页；正式手动代表作设置需要后续 adapter 校验作者、内容状态和可见性。
          </p>
          <span class="creator-cert-meta">当前公开合集 {{ publicCollectionCount }} 个</span>
          <div class="creator-cert-actions">
            <RouterLink to="/me?tab=posts" class="primary-button">选择代表内容</RouterLink>
            <RouterLink to="/certification/apply" class="secondary-button">社区身份申请</RouterLink>
            <RouterLink to="/me/settings" class="secondary-button">完善作者资料</RouterLink>
          </div>
        </article>
      </section>

      <section class="profile-panel mt-6">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p class="text-xs font-black text-primary-600 dark:text-primary-300">内容资产</p>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">稍后读、未整理收藏和内容合集</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              私密合集只在本人主页可见；公开合集仍需要通过治理过滤后才会进入访客主页。
            </p>
          </div>
          <RouterLink to="/series/workbench" class="secondary-button">整理合集</RouterLink>
        </div>
        <div class="asset-grid">
          <RouterLink to="/me?tab=favorites" class="asset-card">
            <Bookmark class="h-4 w-4 text-primary-600" />
            <strong>稍后读</strong>
            <span>默认保存入口</span>
            <small>{{ favorites.items.length }} 条</small>
          </RouterLink>
          <RouterLink to="/me?tab=favorites" class="asset-card">
            <BookmarkCheck class="h-4 w-4 text-primary-600" />
            <strong>未整理收藏</strong>
            <span>先回看，再整理到合集</span>
            <small>{{ unorganizedFavoriteCount }} 条</small>
          </RouterLink>
          <RouterLink to="/series/workbench" class="asset-card">
            <Lock class="h-4 w-4 text-primary-600" />
            <strong>私密合集</strong>
            <span>只对本人可见</span>
            <small>{{ privateCollectionCount }} 个</small>
          </RouterLink>
          <RouterLink to="/series/workbench" class="asset-card">
            <Globe2 class="h-4 w-4 text-primary-600" />
            <strong>公开合集</strong>
            <span>通过治理后展示</span>
            <small>{{ publicCollectionCount }} 个</small>
          </RouterLink>
        </div>
      </section>

      <section class="profile-panel mt-6">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">代表内容</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              优先选择精选、高互动和最近更新的公开内容展示在作者主页。
            </p>
          </div>
          <RouterLink to="/editor" class="secondary-button">继续发布</RouterLink>
        </div>
        <div v-if="representativePosts.length" class="representative-grid">
          <RouterLink v-for="post in representativePosts" :key="post.postId" :to="`/post/${post.postId}`" class="representative-card">
            <strong>{{ post.title }}</strong>
            <span>{{ post.summary || post.content.slice(0, 84) }}</span>
          </RouterLink>
        </div>
        <div v-else class="empty-inline">
          发布第一篇公开内容后，这里会形成你的作者主页代表内容。
        </div>
      </section>

      <section class="mt-6">
        <div class="tab-bar max-w-full overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['tab-button shrink-0 whitespace-nowrap', activeTab === tab.value ? 'tab-active' : '']"
            @click="setActiveTab(tab.value)"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <div class="mt-5">
          <section v-if="activeTab === 'posts'" class="space-y-4">
            <PostList
              :state="posts"
              empty-title="还没有发布内容"
              empty-description="发布第一篇经验、问题、攻略或资源，让主页先有一个代表内容。"
              empty-action-text="去发布"
              empty-action-href="/editor"
              @load-more="loadPosts(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else-if="activeTab === 'favorites'" class="space-y-4">
            <div class="favorite-revisit-panel">
              <div>
                <p class="text-xs font-black text-primary-600 dark:text-primary-300">收藏回看</p>
                <h2>全部收藏</h2>
                <span>默认收藏夹会收纳你在社区里保存过的经验、问题、攻略和资源，后续可继续整理到内容合集。</span>
              </div>
              <div class="favorite-revisit-actions">
                <RouterLink to="/explore">去发现</RouterLink>
                <RouterLink to="/search">搜索内容</RouterLink>
                <RouterLink to="/series/workbench">整理合集</RouterLink>
              </div>
            </div>
            <PostList
              :state="favorites"
              empty-title="还没有收藏内容"
              empty-description="看到有用内容时点收藏，之后可以在这里集中回看，也可以整理到内容合集。"
              @load-more="loadFavorites(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else-if="activeTab === 'liked'" class="space-y-4">
            <PostList
              :state="likedPosts"
              empty-title="还没有点赞内容"
              empty-description="点赞过的帖子会汇总到这里，方便回访和继续互动。"
              @load-more="loadLikedPosts(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else-if="activeTab === 'following'">
            <UserList
              :state="following"
              empty-title="还没有关注用户"
              empty-description="在发现页或帖子作者卡片里关注感兴趣的人。"
              @load-more="loadFollowing(true)"
              @follow-change="handleFollowingUserChange"
            />
          </section>

          <section v-else-if="activeTab === 'topics'">
            <TopicList
              :state="topics"
              empty-title="还没有关注专题"
              empty-description="在话题详情页关注感兴趣的话题，后续可以从这里快速回访。"
              @load-more="loadFollowingTopics(true)"
            />
          </section>

          <section v-else>
            <UserList
              :state="followers"
              empty-title="还没有粉丝"
              empty-description="持续发布有用内容，会更容易被同路人关注。"
              @load-more="loadFollowers(true)"
              @follow-change="handleFollowerUserChange"
            />
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Bookmark, BookmarkCheck, FileText, Globe2, Hash, Heart, Lock, MessageCircle, Settings, UserRoundCheck, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import RevisitSummaryPanel from '@/components/retention/RevisitSummaryPanel.vue'
import UserCard from '@/components/user/UserCard.vue'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { userApi } from '@/api/user'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, CommunityTopic, PaginatedResponse, Post, User } from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'
import { filterPublicContent, safePublicVisibleText, sanitizePublicVisibleText } from '@/utils/textQuality'
import { pickRepresentativePosts, publicAuthorPosts } from '@/utils/creatorSignals'
import { filterVisibleCollections, filterVisiblePosts } from '@/utils/recommendationGovernance'
import { demoProfileContribution } from '@/data/demoSeeds'
import { getContentTypeShortLabel } from '@/utils/contentTypes'

type TabValue = 'posts' | 'favorites' | 'liked' | 'following' | 'topics' | 'followers'

interface ListState<T> {
  items: T[]
  cursor?: string
  hasMore: boolean
  loading: boolean
  error: string
}

const createState = <T,>(): ListState<T> => reactive({
  items: [],
  cursor: undefined,
  hasMore: false,
  loading: false,
  error: '',
})

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const user = ref(authStore.user)
const activeTab = ref<TabValue>('posts')
const posts = createState<Post>()
const favorites = createState<Post>()
const likedPosts = createState<Post>()
const following = createState<User>()
const topics = createState<CommunityTopic>()
const followers = createState<User>()
const backendContribution = ref<ContributionSummary | null>(null)
const ownerCollections = ref<ContentSeriesRecord[]>([])
const myCollections = ref<ContentSeriesRecord[]>([])

const tabs = [
  { value: 'posts', label: '我的内容', icon: FileText },
  { value: 'favorites', label: '我的收藏', icon: Bookmark },
  { value: 'liked', label: '我的点赞', icon: Heart },
  { value: 'following', label: '我的关注', icon: Users },
  { value: 'topics', label: '关注话题', icon: Hash },
  { value: 'followers', label: '我的粉丝', icon: UserRoundCheck },
] satisfies Array<{ value: TabValue; label: string; icon: any }>
const tabValues = new Set<TabValue>(tabs.map((tab) => tab.value))

const setActiveTab = (value: TabValue) => {
  activeTab.value = value
  if (route.query.tab !== value) {
    router.replace({ path: route.path, query: { ...route.query, tab: value } })
  }
}

const displayNickname = computed(() => safePublicVisibleText(user.value?.nickname, '我的主页'))
const displaySignature = computed(() => sanitizePublicVisibleText(
  user.value?.signature,
  '完善简介后，其他人可以更快了解你关注的频道、经验和内容方向。',
))
const userInitial = computed(() => displayNickname.value.charAt(0) || '?')
const localContribution = computed(() => {
  const summary = buildContributionSummary(posts.items)
  return summary.score > 0 ? { ...summary, source: 'frontend_estimate', estimated: true } : demoProfileContribution
})
const contribution = computed(() => backendContribution.value || localContribution.value)
const contributionSourceText = computed(() => (
  contribution.value.source === 'backend_aggregate'
    ? '由后端按公开内容、精选和互动数据汇总'
    : contribution.value.source === 'local_demo_seed'
      ? '当前为本地作者数据样例'
    : '接口暂不可用，当前为本地估算'
))
const profileDemoNotice = computed(() => contribution.value.source === 'local_demo_seed'
  ? '发布第一篇经验、问题或资源后，这里会展示你的真实作者数据。'
  : ''
)
const typeDistribution = computed(() => buildTypeDistribution(posts.items))
const publicCollectionCount = computed(() => filterVisibleCollections(myCollections.value).length)
const privateCollectionCount = computed(() => ownerCollections.value.filter((item) => item.visibility === 'private').length)
const unorganizedFavoriteCount = computed(() => favorites.items.length)
const authorPublicPosts = computed(() => publicAuthorPosts(filterVisiblePosts(posts.items)))
const representativePosts = computed(() => pickRepresentativePosts(authorPublicPosts.value, 3))
const postFeedbackScore = (post: Post) => (
  Number(post.counter?.comment || 0) * 3
  + Number(post.counter?.favorite || 0) * 2
  + Number(post.counter?.like || 0)
  + Number(post.counter?.view || 0) * 0.02
)
const timestampOfPost = (post: Post) => Number(post.updatedAt || post.createdAt || 0)
const postsWithinDays = (days: number) => {
  const since = Date.now() - days * 24 * 60 * 60 * 1000
  return authorPublicPosts.value.filter((post) => timestampOfPost(post) >= since)
}
const summarizeWindow = (days: number) => {
  const windowPosts = postsWithinDays(days)
  return {
    label: `近 ${days} 天`,
    description: windowPosts.length ? '按近期发布或更新的公开内容估算' : '暂无近期公开内容',
    posts: windowPosts.length,
    comments: windowPosts.reduce((sum, post) => sum + Number(post.counter?.comment || 0), 0),
    favorites: windowPosts.reduce((sum, post) => sum + Number(post.counter?.favorite || 0), 0),
    likes: windowPosts.reduce((sum, post) => sum + Number(post.counter?.like || 0), 0),
  }
}
const feedbackWindows = computed(() => [summarizeWindow(7), summarizeWindow(30)])
const topFeedbackPosts = computed(() => [...authorPublicPosts.value]
  .sort((a, b) => postFeedbackScore(b) - postFeedbackScore(a) || timestampOfPost(b) - timestampOfPost(a))
  .slice(0, 3))
const topFeedbackPost = computed(() => topFeedbackPosts.value[0])
const topFeedbackScore = computed(() => {
  const post = topFeedbackPost.value
  if (!post) return 0
  return Number(post.counter?.comment || 0) + Number(post.counter?.favorite || 0) + Number(post.counter?.like || 0)
})
const replyOpportunityPosts = computed(() => authorPublicPosts.value
  .filter((post) => Number(post.counter?.comment || 0) > 0)
  .sort((a, b) => Number(b.counter?.comment || 0) - Number(a.counter?.comment || 0) || timestampOfPost(b) - timestampOfPost(a))
  .slice(0, 3))
const feedbackReason = (post: Post) => {
  const comments = Number(post.counter?.comment || 0)
  const favorites = Number(post.counter?.favorite || 0)
  if (comments > 0) return `${comments} 条评论，适合继续回应`
  if (favorites > 0) return `${favorites} 次收藏，适合扩写成清单或合集`
  return `${Number(post.counter?.like || 0)} 次点赞，可作为代表内容候选`
}
const firstTopicName = (post?: Post | null) => post?.tags?.[0]?.name || ''
const topicIdeas = computed(() => {
  const primaryPost = topFeedbackPost.value
  const primaryType = primaryPost ? getContentTypeShortLabel(primaryPost.postType) : '经验'
  const primaryTopic = firstTopicName(primaryPost) || typeDistribution.value[0]?.name || '社区经验'
  const firstCollection = myCollections.value.find((item) => item.visibility === 'public')
  return [
    {
      title: primaryPost ? `围绕「${primaryPost.title}」补一篇后续` : '写一篇近期观察或经验',
      reason: primaryPost ? feedbackReason(primaryPost) : '示例灵感：发布后会优先使用真实公开内容反馈',
      query: {
        source: 'own_post_feedback',
        title: primaryPost ? `${primaryPost.title}：后续补充` : '我的近期观察',
        postType: primaryPost ? String(primaryPost.postType) : undefined,
        topic: primaryTopic,
      },
    },
    {
      title: `整理一个${primaryType}方向的小合集`,
      reason: firstCollection ? `可继续补充公开合集「${firstCollection.title}」` : '合集能把长期内容组织到作者主页',
      query: {
        source: 'series_gap',
        title: `${primaryType}清单：${primaryTopic}`,
        postType: primaryPost ? String(primaryPost.postType) : undefined,
        topic: primaryTopic,
        seriesId: firstCollection ? String(firstCollection.id) : undefined,
      },
    },
    {
      title: `把「${primaryTopic}」写成可讨论的问题`,
      reason: '从公开话题或内容类型出发，不承诺推荐或曝光效果',
      query: {
        source: 'content_type_template',
        title: `关于${primaryTopic}，你们会怎么处理？`,
        topic: primaryTopic,
      },
    },
  ]
})
const buildCreatorActions = () => [
  {
    href: '/me?tab=posts',
    title: '代表作管理入口',
    description: representativePosts.value.length
      ? '当前先展示系统挑选的公开内容候选；手动保存需等待代表作 adapter。'
      : '发布公开内容后，可从这里挑选作者主页展示候选。',
  },
  {
    href: '/series/workbench',
    title: '整理公开合集',
    description: publicCollectionCount.value > 0
      ? `已有 ${publicCollectionCount.value} 个公开合集，可继续补目录和封面。`
      : '把长期内容整理成公开合集，供作者主页展示。',
  },
  {
    href: '/me/settings',
    title: '完善创作方向',
    description: '用简介和公开内容类型说明你常写的频道与主题。',
  },
]
const creatorActions = computed(buildCreatorActions)

const loadContribution = async () => {
  try {
    const res = await userApi.getMyContribution()
    backendContribution.value = res.data
  } catch {
    backendContribution.value = null
  }
}

const loadMyCollections = async () => {
  try {
    const res = await contentSeriesApi.listMine(user.value?.uid)
    ownerCollections.value = res.data || []
    myCollections.value = filterVisibleCollections(res.data || [])
  } catch {
    ownerCollections.value = []
    myCollections.value = []
  }
}

const applyPage = <T,>(state: ListState<T>, page: PaginatedResponse<T> | null | undefined, append: boolean) => {
  const items = page?.items || []
  state.items = append ? [...state.items, ...items] : items
  state.cursor = page?.nextCursor
  state.hasMore = Boolean(page?.hasMore && page?.nextCursor)
}

const loadPage = async <T,>(
  state: ListState<T>,
  append: boolean,
  loader: (cursor?: string) => Promise<PaginatedResponse<T> | null | undefined>,
  fallbackMessage: string,
) => {
  if (state.loading || (append && !state.hasMore)) return
  state.loading = true
  state.error = ''
  try {
    const page = await loader(append ? state.cursor : undefined)
    applyPage(state, page, append)
  } catch (error: any) {
    state.error = getErrorMessage(error, fallbackMessage)
    if (!append) {
      state.items = []
      state.cursor = undefined
      state.hasMore = false
    }
  } finally {
    state.loading = false
  }
}

const loadPosts = (append = false) => {
  if (!user.value?.uid) return Promise.resolve()
  return loadPage(
    posts,
    append,
    async (cursor) => {
      const page = (await postApi.list({ authorId: user.value!.uid, cursor, size: 10 })).data
      return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
    },
    '发帖列表加载失败',
  )
}

const loadFavorites = (append = false) => loadPage(
  favorites,
  append,
  async (cursor) => {
    const page = (await postApi.getMyFavorites(cursor, 10)).data
    return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
  },
  '收藏列表加载失败',
)

const loadLikedPosts = (append = false) => loadPage(
  likedPosts,
  append,
  async (cursor) => {
    const page = (await postApi.getMyLikedPosts(cursor, 10)).data
    return page ? { ...page, items: filterVisiblePosts(filterPublicContent(page.items)) } : page
  },
  '点赞列表加载失败',
)

const loadFollowing = (append = false) => {
  if (!user.value?.uid) return Promise.resolve()
  return loadPage(
    following,
    append,
    async (cursor) => (await userApi.getFollowing(user.value!.uid, cursor, 12)).data,
    '关注列表加载失败',
  )
}

const loadFollowingTopics = (append = false) => loadPage(
  topics,
  append,
  async (cursor) => (await postApi.listFollowingTopics(cursor, 12)).data,
  '关注专题加载失败',
)

const loadFollowers = (append = false) => {
  if (!user.value?.uid) return Promise.resolve()
  return loadPage(
    followers,
    append,
    async (cursor) => (await userApi.getFollowers(user.value!.uid, cursor, 12)).data,
    '粉丝列表加载失败',
  )
}

const allPostStates = [posts, favorites, likedPosts]

const updatePostEverywhere = (postId: ApiId, updater: (post: Post) => void) => {
  allPostStates.forEach((state) => {
    state.items.forEach((post) => {
      if (String(post.postId) === String(postId)) updater(post)
    })
  })
}

const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePostEverywhere)

const removeFromState = (state: ListState<Post>, postId: ApiId) => {
  state.items = state.items.filter((post) => String(post.postId) !== String(postId))
}

const handleLike = async (postId: ApiId) => {
  const post = allPostStates.flatMap((state) => state.items).find((item) => String(item.postId) === String(postId))
  if (!post) return
  const liked = Boolean(post.myInteraction?.liked)
  const succeeded = await toggleLike(post)
  if (succeeded && liked && activeTab.value === 'liked') {
    removeFromState(likedPosts, postId)
  }
}

const handleFavorite = async (postId: ApiId) => {
  const post = allPostStates.flatMap((state) => state.items).find((item) => String(item.postId) === String(postId))
  if (!post) return
  const favorited = Boolean(post.myInteraction?.favorited)
  const succeeded = await toggleFavorite(post)
  if (succeeded && favorited && activeTab.value === 'favorites') {
    removeFromState(favorites, postId)
  }
}

const handlePostAuthorFollowChange = (authorUid: ApiId, following: boolean) => {
  allPostStates.forEach((state) => {
    state.items.forEach((post) => {
      if (String(post.author.uid) === String(authorUid)) {
        post.author.isFollowing = following
      }
    })
  })
}

const syncUserFollowState = (authorUid: ApiId, followingValue: boolean, followerCount?: number) => {
  const syncUser = (item: User) => {
    if (String(item.uid) === String(authorUid)) {
      item.isFollowing = followingValue
      if (followerCount !== undefined) item.followerCount = followerCount
    }
  }
  following.items.forEach(syncUser)
  followers.items.forEach(syncUser)
  handlePostAuthorFollowChange(authorUid, followingValue)
}

const adjustMyRelationCount = (key: 'followingCount' | 'followerCount', delta: number) => {
  if (!user.value) return
  user.value = {
    ...user.value,
    [key]: Math.max(0, Number(user.value[key] ?? 0) + delta),
  }
  if (authStore.user && String(authStore.user.uid) === String(user.value.uid)) {
    authStore.setUser({ ...authStore.user, [key]: user.value[key] })
  }
}

const handleFollowingUserChange = (authorUid: ApiId, followingValue: boolean, followerCount: number) => {
  syncUserFollowState(authorUid, followingValue, followerCount)
  if (!followingValue) {
    following.items = following.items.filter((item) => String(item.uid) !== String(authorUid))
    adjustMyRelationCount('followingCount', -1)
  }
}

const handleFollowerUserChange = (authorUid: ApiId, followingValue: boolean, followerCount: number) => {
  syncUserFollowState(authorUid, followingValue, followerCount)
  if (followingValue && !following.items.some((item) => String(item.uid) === String(authorUid))) {
    const follower = followers.items.find((item) => String(item.uid) === String(authorUid))
    if (follower) following.items = [{ ...follower, isFollowing: true, followerCount }, ...following.items]
    adjustMyRelationCount('followingCount', 1)
  }
}

const EmptyPanel = defineComponent({
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    actionText: String,
    actionHref: String,
  },
  setup(props) {
    return () => h('div', { class: 'empty-panel' }, [
      h('h3', props.title),
      h('p', props.description),
      props.actionText && props.actionHref
        ? h(RouterLink, { to: props.actionHref, class: 'primary-button mt-4' }, () => props.actionText)
        : null,
    ])
  },
})

const PostList = defineComponent({
  props: {
    state: { type: Object as () => ListState<Post>, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
    emptyActionText: String,
    emptyActionHref: String,
  },
  emits: ['load-more', 'like', 'favorite', 'follow-change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? props.state.items.map((post) => h(PostCard, {
              key: post.postId,
              post,
              likePending: isActionPending('like', post.postId),
              favoritePending: isActionPending('favorite', post.postId),
              onLike: (id: ApiId) => emit('like', id),
              onFavorite: (id: ApiId) => emit('favorite', id),
              onFollowChange: (authorUid: ApiId, following: boolean) => emit('follow-change', authorUid, following),
            }))
          : h(EmptyPanel, {
              title: props.emptyTitle,
              description: props.emptyDescription,
              actionText: props.emptyActionText,
              actionHref: props.emptyActionHref,
            }),
      props.state.hasMore
        ? h('div', { class: 'text-center' }, [
            h('button', {
              type: 'button',
              class: 'secondary-button',
              disabled: props.state.loading,
              onClick: () => emit('load-more'),
            }, props.state.loading ? '加载中...' : '加载更多'),
          ])
        : null,
    ])
  },
})

const UserList = defineComponent({
  props: {
    state: { type: Object as () => ListState<User>, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  emits: ['load-more', 'follow-change'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? h('div', { class: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' }, props.state.items.map((item) =>
              h(UserCard, {
                key: item.uid,
                user: item,
                onFollowChange: (uid: ApiId, following: boolean, followerCount: number) => emit('follow-change', uid, following, followerCount),
              }),
            ))
          : h(EmptyPanel, { title: props.emptyTitle, description: props.emptyDescription }),
      props.state.hasMore
        ? h('div', { class: 'text-center' }, [
            h('button', {
              type: 'button',
              class: 'secondary-button',
              disabled: props.state.loading,
              onClick: () => emit('load-more'),
            }, props.state.loading ? '加载中...' : '加载更多'),
          ])
        : null,
    ])
  },
})

const TopicList = defineComponent({
  props: {
    state: { type: Object as () => ListState<CommunityTopic>, required: true },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  emits: ['load-more'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? h('div', { class: 'grid gap-4 md:grid-cols-2' }, props.state.items.map((topic) =>
              h(RouterLink, {
                key: topic.id,
                to: `/topics/${topic.slug}`,
                class: 'topic-card',
              }, () => [
                h('div', { class: 'flex items-start justify-between gap-3' }, [
                  h('div', { class: 'min-w-0' }, [
                    h('p', { class: 'truncate text-base font-bold text-slate-950 dark:text-slate-50' }, topic.name),
                    h('p', { class: 'mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400' }, topic.description || '持续关注这个话题下的经验和讨论。'),
                  ]),
                  topic.featured ? h('span', { class: 'topic-badge' }, '精选') : null,
                ]),
                h('div', { class: 'mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400' }, [
                  h('span', `${topic.postCount ?? 0} 篇内容`),
                  h('span', `${topic.followerCount ?? 0} 人关注`),
                ]),
              ]),
            ))
          : h(EmptyPanel, { title: props.emptyTitle, description: props.emptyDescription }),
      props.state.hasMore
        ? h('div', { class: 'text-center' }, [
            h('button', {
              type: 'button',
              class: 'secondary-button',
              disabled: props.state.loading,
              onClick: () => emit('load-more'),
            }, props.state.loading ? '加载中...' : '加载更多'),
          ])
        : null,
    ])
  },
})

onMounted(async () => {
  if (!user.value?.uid) return
  const queryTab = typeof route.query.tab === 'string' ? route.query.tab : ''
  if (tabValues.has(queryTab as TabValue)) {
    activeTab.value = queryTab as TabValue
  }
  await Promise.all([
    loadContribution(),
    loadPosts(),
    loadFavorites(),
    loadLikedPosts(),
    loadMyCollections(),
    loadFollowing(),
    loadFollowingTopics(),
    loadFollowers(),
  ])
})

watch(() => route.query.tab, (value) => {
  if (typeof value === 'string' && tabValues.has(value as TabValue)) {
    activeTab.value = value as TabValue
  }
})
</script>

<style scoped>
.profile-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.avatar {
  display: flex;
  height: 6rem;
  width: 6rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(37 99 235);
  font-size: 2rem;
  font-weight: 800;
  color: white;
}

.metric-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.5rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.metric-card span {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.metric-card strong {
  grid-column: 1 / -1;
  font-size: 1.5rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.community-growth-panel {
  margin-top: 1.5rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.creator-feedback-panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 1.5rem;
}

.creator-feedback-panel h2 {
  margin-top: 0.15rem;
  font-size: 1.05rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.creator-feedback-panel span {
  margin-top: 0.35rem;
  display: block;
  color: rgb(71 85 105);
  font-size: 0.875rem;
  line-height: 1.6;
}

.feedback-stat {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.5rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.625rem;
  background: white;
  padding: 0.85rem;
}

.feedback-stat strong {
  color: rgb(15 23 42);
  font-size: 1.25rem;
  font-weight: 900;
}

.feedback-stat span,
.feedback-stat small {
  grid-column: 1 / -1;
}

.feedback-stat span {
  margin-top: 0.2rem;
  color: rgb(51 65 85);
  font-size: 0.8125rem;
  font-weight: 900;
}

.feedback-stat small {
  color: rgb(100 116 139);
  font-size: 0.75rem;
  font-weight: 700;
}

.feedback-window-grid {
  margin-top: 1.1rem;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.feedback-window-card {
  display: grid;
  gap: 0.85rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.feedback-window-card strong {
  display: block;
  color: rgb(15 23 42);
  font-size: 1rem;
  font-weight: 900;
}

.feedback-window-metrics {
  display: grid;
  gap: 0.45rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.creator-workbench-grid {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.creator-workbench-card {
  display: flex;
  min-height: 12rem;
  flex-direction: column;
  gap: 0.85rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.creator-workbench-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.creator-workbench-head strong {
  color: rgb(15 23 42);
  font-size: 0.95rem;
  font-weight: 900;
}

.creator-workbench-head a {
  flex-shrink: 0;
  color: rgb(37 99 235);
  font-size: 0.78rem;
  font-weight: 900;
}

.creator-link-list {
  display: grid;
  gap: 0.65rem;
}

.creator-link-list a {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.7rem;
}

.creator-link-list span {
  margin: 0;
  display: block;
  color: rgb(15 23 42);
  font-size: 0.86rem;
  font-weight: 900;
  line-height: 1.45;
}

.creator-link-list small,
.creator-empty-copy {
  color: rgb(100 116 139);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.55;
}

.creator-empty-copy {
  margin: 0;
}

.creator-center-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.2fr) minmax(18rem, 0.8fr);
}

.asset-grid {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.asset-card {
  display: grid;
  gap: 0.35rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.9rem;
  color: rgb(71 85 105);
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.asset-card:hover {
  transform: translateY(-1px);
  border-color: rgb(147 197 253);
  background: rgb(239 246 255);
}

.asset-card strong {
  color: rgb(15 23 42);
  font-size: 0.95rem;
}

.asset-card span,
.asset-card small {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.45;
}

.asset-card small {
  color: rgb(37 99 235);
}

.creator-action-panel,
.creator-cert-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.25rem;
}

.creator-action-panel h2,
.creator-cert-panel h2 {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.creator-action-list {
  display: grid;
  gap: 0.75rem;
}

.creator-action-card,
.representative-card {
  display: grid;
  gap: 0.35rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.creator-action-card strong,
.representative-card strong {
  color: rgb(15 23 42);
  font-size: 0.92rem;
  font-weight: 900;
}

.creator-action-card span,
.representative-card span,
.creator-cert-panel p {
  color: rgb(71 85 105);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.creator-cert-meta {
  margin-top: 0.85rem;
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.3rem 0.65rem;
  color: rgb(67 56 202);
  font-size: 0.75rem;
  font-weight: 900;
}

.creator-cert-actions {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.representative-grid {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
}

.representative-card {
  min-height: 7rem;
}

.empty-inline {
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.75rem;
  padding: 1rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
  text-align: center;
}

.score-card,
.growth-stat {
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
.growth-stat strong {
  display: block;
  font-weight: 900;
  color: rgb(37 99 235);
}

.score-card strong {
  font-size: 1.75rem;
}

.growth-stat strong {
  font-size: 1.35rem;
}

.score-card span,
.growth-stat span {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.type-chip {
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.35rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(67 56 202);
}

.tab-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  border-bottom: 1px solid rgb(226 232 240);
}

.tab-button {
  display: inline-flex;
  min-height: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 2px solid transparent;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.tab-active {
  border-color: rgb(37 99 235);
  color: rgb(37 99 235);
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0.5rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.primary-button {
  background: rgb(37 99 235);
  color: white;
}

.secondary-button {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.topic-card {
  display: block;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.topic-card:hover {
  border-color: rgb(191 219 254);
  box-shadow: 0 12px 28px rgb(15 23 42 / 0.08);
  transform: translateY(-1px);
}

.topic-badge {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgb(254 243 199);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(146 64 14);
}

.favorite-revisit-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 1rem;
}

.favorite-revisit-panel h2 {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.favorite-revisit-panel span {
  margin-top: 0.35rem;
  display: block;
  max-width: 42rem;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.favorite-revisit-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;
}

.favorite-revisit-actions a {
  display: inline-flex;
  min-height: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: white;
  padding: 0.45rem 0.8rem;
  font-size: 0.8125rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.empty-panel,
.loading-panel,
.notice-error {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 2.25rem 1.25rem;
  text-align: center;
}

.empty-panel h3 {
  font-size: 1rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.empty-panel p,
.loading-panel {
  margin-top: 0.5rem;
  color: rgb(100 116 139);
}

.notice-error {
  border-color: rgb(254 202 202);
  background: rgb(254 242 242);
  color: rgb(185 28 28);
}

.dark .profile-panel,
.dark .topic-card,
.dark .secondary-button,
.dark .empty-panel,
.dark .loading-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .metric-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

.dark .asset-card {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(148 163 184);
}

.dark .asset-card:hover {
  border-color: rgb(30 64 175);
  background: rgb(30 41 59);
}

.dark .asset-card strong {
  color: rgb(248 250 252);
}

.dark .community-growth-panel,
.dark .score-card,
.dark .growth-stat {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .creator-feedback-panel {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .creator-feedback-panel h2,
.dark .feedback-stat strong {
  color: rgb(248 250 252);
}

.dark .creator-feedback-panel span,
.dark .feedback-stat small {
  color: rgb(203 213 225);
}

.dark .feedback-stat {
  border-color: rgb(30 64 175);
  background: rgb(2 6 23);
}

.dark .feedback-stat span {
  color: rgb(226 232 240);
}

.dark .feedback-window-card,
.dark .creator-workbench-card {
  border-color: rgb(30 64 175);
  background: rgb(2 6 23);
}

.dark .feedback-window-card strong,
.dark .creator-workbench-head strong,
.dark .creator-link-list span {
  color: rgb(248 250 252);
}

.dark .creator-link-list a {
  background: rgb(15 23 42);
}

.dark .creator-workbench-head a {
  color: rgb(147 197 253);
}

.dark .creator-link-list small,
.dark .creator-empty-copy {
  color: rgb(148 163 184);
}

.dark .creator-action-panel,
.dark .creator-cert-panel,
.dark .creator-action-card,
.dark .representative-card,
.dark .empty-inline {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .creator-action-card,
.dark .representative-card {
  background: rgb(2 6 23);
}

.dark .creator-action-panel h2,
.dark .creator-cert-panel h2,
.dark .creator-action-card strong,
.dark .representative-card strong {
  color: rgb(248 250 252);
}

.dark .creator-action-card span,
.dark .representative-card span,
.dark .creator-cert-panel p,
.dark .empty-inline {
  color: rgb(148 163 184);
}

.dark .creator-cert-meta {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
}

html.dark .community-growth-panel,
html.dark .score-card,
html.dark .growth-stat {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .type-chip {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
}

.dark .metric-card strong,
.dark .empty-panel h3 {
  color: rgb(248 250 252);
}

.dark .tab-bar {
  border-color: rgb(30 41 59);
}

.dark .favorite-revisit-panel {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

.dark .favorite-revisit-panel h2 {
  color: rgb(248 250 252);
}

.dark .favorite-revisit-panel span {
  color: rgb(203 213 225);
}

.dark .favorite-revisit-actions a {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

@media (max-width: 640px) {
  .feedback-window-grid,
  .creator-workbench-grid {
    grid-template-columns: 1fr;
  }

  .feedback-window-metrics {
    grid-template-columns: 1fr;
  }

  .creator-center-grid {
    grid-template-columns: 1fr;
  }

  .asset-grid {
    grid-template-columns: 1fr;
  }

  .creator-cert-actions,
  .creator-cert-actions a,
  .creator-action-panel .secondary-button {
    width: 100%;
  }

  .favorite-revisit-panel {
    flex-direction: column;
  }

  .favorite-revisit-actions,
  .favorite-revisit-actions a {
    width: 100%;
  }
}
</style>
