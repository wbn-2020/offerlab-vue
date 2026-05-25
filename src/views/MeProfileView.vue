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
                {{ user?.nickname || '我的主页' }}
              </h1>
              <span v-if="user?.isBigV" class="rounded bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                认证用户
              </span>
            </div>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ user?.signature || '完善个人资料后，其他求职者可以更快了解你的方向和经验。' }}
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

      <section class="mt-6">
        <div class="tab-bar">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            :class="['tab-button', activeTab === tab.value ? 'tab-active' : '']"
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
              empty-description="发布第一篇面经、复盘或求职问题，让主页真正活起来。"
              empty-action-text="去发布"
              empty-action-href="/editor"
              @load-more="loadPosts(true)"
              @like="handleLike"
              @favorite="handleFavorite"
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

          <section v-else>
            <UserList
              :state="followers"
              empty-title="还没有粉丝"
              empty-description="持续发布有价值的求职内容，会更容易被同路人关注。"
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
import { Bookmark, FileText, Heart, Settings, UserRoundCheck, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import UserCard from '@/components/user/UserCard.vue'
import { useAuthStore } from '@/stores/auth'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { userApi } from '@/api/user'
import type { ApiId, PaginatedResponse, Post, User } from '@/api/types'

type TabValue = 'posts' | 'favorites' | 'liked' | 'following' | 'followers'

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
const followers = createState<User>()

const tabs = [
  { value: 'posts', label: '我的发帖', icon: FileText },
  { value: 'favorites', label: '我的收藏', icon: Bookmark },
  { value: 'liked', label: '我的点赞', icon: Heart },
  { value: 'following', label: '我的关注', icon: Users },
  { value: 'followers', label: '我的粉丝', icon: UserRoundCheck },
] satisfies Array<{ value: TabValue; label: string; icon: any }>

const userInitial = computed(() => user.value?.nickname?.charAt(0) || '?')

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
    state.error = error?.message || fallbackMessage
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
    async (cursor) => (await postApi.list({ authorId: user.value!.uid, cursor, size: 10 })).data,
    '发帖列表加载失败',
  )
}

const loadFavorites = (append = false) => loadPage(
  favorites,
  append,
  async (cursor) => (await postApi.getMyFavorites(cursor, 10)).data,
  '收藏列表加载失败',
)

const loadLikedPosts = (append = false) => loadPage(
  likedPosts,
  append,
  async (cursor) => (await postApi.getMyLikedPosts(cursor, 10)).data,
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

const removeFromState = (state: ListState<Post>, postId: ApiId) => {
  state.items = state.items.filter((post) => String(post.postId) !== String(postId))
}

const handleLike = async (postId: ApiId) => {
  const post = allPostStates.flatMap((state) => state.items).find((item) => String(item.postId) === String(postId))
  if (!post) return
  const liked = Boolean(post.myInteraction?.liked)
  try {
    liked ? await interactionApi.unlike(postId) : await interactionApi.like(postId)
    updatePostEverywhere(postId, (item) => {
      item.myInteraction = { ...(item.myInteraction ?? { favorited: false }), liked: !liked }
      item.counter.like = Math.max(0, item.counter.like + (liked ? -1 : 1))
    })
    if (liked && activeTab.value === 'liked') {
      removeFromState(likedPosts, postId)
    }
  } catch (error: any) {
    toast.error(error?.message || '点赞操作失败')
  }
}

const handleFavorite = async (postId: ApiId) => {
  const post = allPostStates.flatMap((state) => state.items).find((item) => String(item.postId) === String(postId))
  if (!post) return
  const favorited = Boolean(post.myInteraction?.favorited)
  try {
    favorited ? await interactionApi.unfavorite(postId) : await interactionApi.favorite(postId)
    updatePostEverywhere(postId, (item) => {
      item.myInteraction = { ...(item.myInteraction ?? { liked: false }), favorited: !favorited }
      item.counter.favorite = Math.max(0, item.counter.favorite + (favorited ? -1 : 1))
    })
    if (favorited && activeTab.value === 'favorites') {
      removeFromState(favorites, postId)
    }
  } catch (error: any) {
    toast.error(error?.message || '收藏操作失败')
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
  emits: ['load-more', 'like', 'favorite'],
  setup(props, { emit }) {
    return () => h('div', { class: 'space-y-4' }, [
      props.state.error ? h('div', { class: 'notice-error' }, props.state.error) : null,
      props.state.loading && props.state.items.length === 0
        ? h('div', { class: 'loading-panel' }, '正在加载...')
        : props.state.items.length
          ? props.state.items.map((post) => h(PostCard, {
              key: post.postId,
              post,
              onLike: (id: ApiId) => emit('like', id),
              onFavorite: (id: ApiId) => emit('favorite', id),
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

onMounted(async () => {
  if (!user.value?.uid) return
  await Promise.all([
    loadPosts(),
    loadFavorites(),
    loadLikedPosts(),
    loadFollowing(),
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

:global(.dark) .profile-panel,
:global(.dark) .secondary-button,
:global(.dark) .empty-panel,
:global(.dark) .loading-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .metric-card {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .metric-card strong,
:global(.dark) .empty-panel h3 {
  color: rgb(248 250 252);
}

:global(.dark) .tab-bar {
  border-color: rgb(30 41 59);
}
</style>
