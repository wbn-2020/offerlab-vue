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
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="truncate text-2xl font-bold text-slate-950 dark:text-slate-50">
                {{ displayNickname }}
              </h1>
              <span v-if="user?.isBigV" class="rounded bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                认证用户
              </span>
            </div>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ displaySignature }}
            </p>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="metric-card">
                <FileText class="h-4 w-4 text-primary-600" />
                <span>发帖</span>
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
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">社区成长</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ contribution.level }} · {{ contribution.badge }}，{{ contributionSourceText }}。
            </p>
            <p v-if="profileDemoNotice" class="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
              {{ profileDemoNotice }}
            </p>
          </div>
          <div class="score-card">
            <strong>{{ contribution.score }}</strong>
            <span>贡献值</span>
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

      <section class="mt-6">
        <div class="tab-bar max-w-full overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['tab-button shrink-0 whitespace-nowrap', activeTab === tab.value ? 'tab-active' : '']"
            @click="activeTab = tab.value"
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
              empty-description="发布第一篇技术文章、项目复盘或踩坑记录，让主页真正活起来。"
              empty-action-text="去发布"
              empty-action-href="/editor"
              @load-more="loadPosts(true)"
              @like="handleLike"
              @favorite="handleFavorite"
              @follow-change="handlePostAuthorFollowChange"
            />
          </section>

          <section v-else-if="activeTab === 'favorites'" class="space-y-4">
            <PostList
              :state="favorites"
              empty-title="还没有收藏内容"
              empty-description="收藏高质量帖子后，可以在这里快速回看。"
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
            />
          </section>

          <section v-else-if="activeTab === 'topics'">
            <TopicList
              :state="topics"
              empty-title="还没有关注专题"
              empty-description="在专题详情页关注技术方向，后续可以从这里快速回访。"
              @load-more="loadFollowingTopics(true)"
            />
          </section>

          <section v-else>
            <UserList
              :state="followers"
              empty-title="还没有粉丝"
              empty-description="持续发布有价值的技术内容，会更容易被同路人关注。"
              @load-more="loadFollowers(true)"
            />
          </section>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Bookmark, FileText, Hash, Heart, Settings, UserRoundCheck, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import UserCard from '@/components/user/UserCard.vue'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { userApi } from '@/api/user'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, CommunityTopic, PaginatedResponse, Post, User } from '@/api/types'
import { buildContributionSummary, buildTypeDistribution, type ContributionSummary } from '@/utils/communityMetrics'
import { filterPublicContent, safePublicVisibleText, sanitizePublicVisibleText } from '@/utils/textQuality'
import { demoProfileContribution } from '@/data/demoSeeds'

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
const user = ref(authStore.user)
const activeTab = ref<TabValue>('posts')
const posts = createState<Post>()
const favorites = createState<Post>()
const likedPosts = createState<Post>()
const following = createState<User>()
const topics = createState<CommunityTopic>()
const followers = createState<User>()
const backendContribution = ref<ContributionSummary | null>(null)

const tabs = [
  { value: 'posts', label: '我的发帖', icon: FileText },
  { value: 'favorites', label: '我的收藏', icon: Bookmark },
  { value: 'liked', label: '我的点赞', icon: Heart },
  { value: 'following', label: '我的关注', icon: Users },
  { value: 'topics', label: '关注专题', icon: Hash },
  { value: 'followers', label: '我的粉丝', icon: UserRoundCheck },
] satisfies Array<{ value: TabValue; label: string; icon: any }>

const displayNickname = computed(() => safePublicVisibleText(user.value?.nickname, '我的主页'))
const displaySignature = computed(() => sanitizePublicVisibleText(
  user.value?.signature,
  '完善个人资料后，其他技术同路人可以更快了解你的方向和经验。',
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
      ? '当前为本地成长档案样例'
    : '接口暂不可用，当前为本地估算'
))
const profileDemoNotice = computed(() => contribution.value.source === 'local_demo_seed'
  ? '发布第一篇技术经验帖或面试复盘后，这里会切换成你的真实成长档案。'
  : ''
)
const typeDistribution = computed(() => buildTypeDistribution(posts.items))

const loadContribution = async () => {
  try {
    const res = await userApi.getMyContribution()
    backendContribution.value = res.data
  } catch {
    backendContribution.value = null
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
      return page ? { ...page, items: filterPublicContent(page.items) } : page
    },
    '发帖列表加载失败',
  )
}

const loadFavorites = (append = false) => loadPage(
  favorites,
  append,
  async (cursor) => {
    const page = (await postApi.getMyFavorites(cursor, 10)).data
    return page ? { ...page, items: filterPublicContent(page.items) } : page
  },
  '收藏列表加载失败',
)

const loadLikedPosts = (append = false) => loadPage(
  likedPosts,
  append,
  async (cursor) => {
    const page = (await postApi.getMyLikedPosts(cursor, 10)).data
    return page ? { ...page, items: filterPublicContent(page.items) } : page
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
  emits: ['load-more'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? h('div', { class: 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' }, props.state.items.map((item) =>
              h(UserCard, { key: item.uid, user: item }),
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
                    h('p', { class: 'mt-1 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400' }, topic.description || '持续沉淀这个方向的技术内容。'),
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
  await Promise.all([
    loadContribution(),
    loadPosts(),
    loadFavorites(),
    loadLikedPosts(),
    loadFollowing(),
    loadFollowingTopics(),
    loadFollowers(),
  ])
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

.dark .community-growth-panel,
.dark .score-card,
.dark .growth-stat {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
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
</style>
