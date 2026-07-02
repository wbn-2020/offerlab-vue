<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <section class="topic-header">
        <div class="topic-mark">{{ topicInitial }}</div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-primary-600 dark:text-primary-400">社区话题</p>
            <span v-if="topic?.featured" class="status-pill status-featured">精选话题</span>
            <span v-if="topic?.virtualTopic" class="status-pill status-muted">自动聚合</span>
            <span v-if="topic?.topicType" class="status-pill status-muted">{{ topicTypeText }}</span>
          </div>
          <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">{{ topic?.name || fallbackName }}</h1>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {{ topic?.description || '围绕真实经验、问题求助、攻略清单、资源推荐和观点讨论沉淀形成的话题集合。' }}
          </p>
          <div v-if="topicTags.length" class="mt-4 flex flex-wrap gap-2">
            <RouterLink
              v-for="tag in topicTags"
              :key="tag.id"
              :to="`/tag/${tag.slug || tag.id}`"
              class="tag-chip"
            >
              {{ tag.name }}
            </RouterLink>
          </div>
        </div>
        <div class="topic-count">
          <strong>{{ displayCount }}</strong>
          <span>篇内容</span>
        </div>
        <div v-if="canFollowTopic" class="topic-actions">
          <div class="topic-count topic-follow-count">
            <strong>{{ topic?.followerCount || 0 }}</strong>
            <span>关注</span>
          </div>
          <button
            type="button"
            :class="['primary-button', topic?.followed ? 'topic-followed-button' : '']"
            :disabled="isFollowBusy || !topic"
            @click="toggleTopicFollow"
          >
            {{ topic?.followed ? '已关注' : '关注话题' }}
          </button>
        </div>
      </section>

      <section v-if="topicReady" class="filter-panel">
        <div>
          <h2>话题内容</h2>
          <p>{{ typeSummary }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" :class="['filter-chip', !activeType ? 'filter-chip-active' : '']" @click="setType(undefined)">全部</button>
          <button type="button" :class="['filter-chip', activeType === POST_TYPE.QUESTION ? 'filter-chip-active' : '']" @click="setType(POST_TYPE.QUESTION)">只看问题求助</button>
          <button
            v-for="type in contentTypeChannels"
            :key="type.value"
            type="button"
            :class="['filter-chip', activeType === type.value ? 'filter-chip-active' : '']"
            @click="setType(type.value)"
          >
            {{ type.shortLabel }}
          </button>
          <button type="button" :class="['filter-chip', featuredOnly ? 'filter-chip-active' : '']" @click="toggleFeatured">
            只看精选
          </button>
        </div>
      </section>

      <section class="mt-6 space-y-4">
        <div v-if="topicLoadFailed" class="empty-panel topic-error-panel">
          <h2>话题暂时无法打开</h2>
          <p>{{ topicErrorMessage }}</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
            <RouterLink :to="{ path: '/search', query: { q: fallbackName } }" class="secondary-button">搜索相似内容</RouterLink>
          </div>
        </div>

        <div v-else-if="isLoading && posts.length === 0" class="loading-panel">
          正在加载话题内容...
        </div>

        <div v-else-if="postErrorMessage && posts.length === 0" class="notice-error">
          {{ postErrorMessage }}
        </div>

        <template v-else-if="posts.length">
          <div v-if="postErrorMessage" class="notice-error">{{ postErrorMessage }}</div>
          <PostCard
            v-for="post in posts"
            :key="post.postId"
            :post="post"
            :like-pending="isActionPending('like', post.postId)"
            :favorite-pending="isActionPending('favorite', post.postId)"
            @like="handleLike"
            @favorite="handleFavorite"
            @follow-change="handlePostAuthorFollowChange"
          />
        </template>

        <div v-else class="empty-panel">
          <h2>这个话题还没有内容</h2>
          <p>可以先去发现页看看相近内容，搜索相关关键词，或发布一篇经验、问题、攻略、资源或复盘。</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2">
            <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
            <RouterLink :to="{ path: '/search', query: { q: fallbackName } }" class="secondary-button">搜索相似内容</RouterLink>
            <RouterLink to="/editor" class="secondary-button">发布内容</RouterLink>
          </div>
        </div>

        <div v-if="hasMore" class="text-center">
          <button type="button" class="secondary-button" :disabled="isLoading" @click="loadPosts(true)">
            {{ isLoading ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import { postApi } from '@/api/post'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, CommunityTopic, Post } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES, POST_TYPE } from '@/utils/contentTypes'
import { postTypeSummary } from '@/utils/communityMetrics'
import { useAuthStore } from '@/stores/auth'
import { filterPublicContent } from '@/utils/textQuality'
import { filterVisiblePosts } from '@/utils/recommendationGovernance'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const topic = ref<CommunityTopic | null>(null)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoading = ref(false)
const isFollowBusy = ref(false)
const topicErrorMessage = ref('')
const postErrorMessage = ref('')
const activeType = ref<number | undefined>()
const featuredOnly = ref(false)

const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const fallbackName = computed(() => String(route.params.slug || '专题'))
const topicInitial = computed(() => (topic.value?.name || fallbackName.value).charAt(0).toUpperCase())
const topicTags = computed(() => topic.value?.tags || [])
const displayCount = computed(() => topic.value?.postCount || posts.value.length)
const typeSummary = computed(() => postTypeSummary(posts.value))
const topicLoadFailed = computed(() => Boolean(topicErrorMessage.value && !topic.value))
const topicReady = computed(() => Boolean(topic.value && !topicLoadFailed.value))
const canFollowTopic = computed(() => Boolean(topic.value?.id && !topic.value?.virtualTopic))
const topicTypeText = computed(() => {
  const type = topic.value?.topicType
  if (type === 'tech_stack') return '知识技能'
  if (type === 'scenario') return '场景话题'
  if (type === 'resource') return '资源清单'
  if (type === 'project') return '实践复盘'
  return '综合话题'
})

const findPost = (postId: ApiId) => posts.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const loadTopic = async () => {
  const slug = String(route.params.slug || '')
  if (!slug) return
  topic.value = null
  posts.value = []
  cursor.value = undefined
  hasMore.value = false
  topicErrorMessage.value = ''
  postErrorMessage.value = ''
  isLoading.value = true
  try {
    const res = await postApi.getTopic(slug)
    topic.value = res.data
    if (!topic.value?.virtualTopic) {
      await loadTopicFollowStatus(slug)
    }
    await loadPosts(false)
  } catch (error: any) {
    topicErrorMessage.value = getErrorMessage(error, '话题内容加载失败')
  } finally {
    isLoading.value = false
  }
}

const loadTopicFollowStatus = async (slug: string) => {
  if (!authStore.isLoggedIn || topic.value?.virtualTopic) return
  try {
    const res = await postApi.getTopicFollowStatus(slug)
    if (res.data) topic.value = { ...topic.value, ...res.data }
  } catch {
    // Follow status is an authenticated enhancement; public topic browsing should not fail.
  }
}

const loadPosts = async (append = false) => {
  const slug = String(route.params.slug || '')
  if (!slug || !topic.value || topicLoadFailed.value || (append && !hasMore.value) || (isLoading.value && append)) return
  isLoading.value = true
  postErrorMessage.value = ''
  try {
    const res = await postApi.getTopicPosts(slug, append ? cursor.value : undefined, 10, {
      type: activeType.value,
      featured: featuredOnly.value ? true : undefined,
    })
    const page = res.data
    const cleanItems = filterVisiblePosts(filterPublicContent(page?.items || []))
    posts.value = append ? [...posts.value, ...cleanItems] : cleanItems
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
  } catch (error: any) {
    postErrorMessage.value = getErrorMessage(error, '话题内容加载失败')
  } finally {
    isLoading.value = false
  }
}

const setType = async (type?: number) => {
  activeType.value = type
  cursor.value = undefined
  hasMore.value = false
  await loadPosts(false)
}

const toggleFeatured = async () => {
  featuredOnly.value = !featuredOnly.value
  cursor.value = undefined
  hasMore.value = false
  await loadPosts(false)
}

const handleLike = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  await toggleLike(post)
}

const handleFavorite = async (postId: ApiId) => {
  const post = findPost(postId)
  if (!post) return
  await toggleFavorite(post)
}

const handlePostAuthorFollowChange = (authorUid: ApiId, following: boolean) => {
  posts.value.forEach((post) => {
    if (String(post.author.uid) === String(authorUid)) {
      post.author.isFollowing = following
    }
  })
}

const toggleTopicFollow = async () => {
  const slug = topic.value?.slug || String(route.params.slug || '')
  if (!slug || isFollowBusy.value || !canFollowTopic.value) return
  if (!authStore.isLoggedIn) {
    toast.info('登录后可以关注话题')
    await router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  isFollowBusy.value = true
  const wasFollowed = Boolean(topic.value?.followed)
  try {
    const res = wasFollowed ? await postApi.unfollowTopic(slug) : await postApi.followTopic(slug)
    if (res.data) {
      topic.value = { ...topic.value, ...res.data }
    } else if (topic.value) {
      topic.value.followed = !wasFollowed
      topic.value.followerCount = Math.max(0, (topic.value.followerCount || 0) + (wasFollowed ? -1 : 1))
    }
    toast.success(wasFollowed ? '已取消关注话题' : '已关注话题')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '话题关注操作失败'))
  } finally {
    isFollowBusy.value = false
  }
}

watch(() => route.params.slug, loadTopic)
onMounted(loadTopic)
</script>

<style scoped>
.topic-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.topic-mark {
  display: flex;
  height: 4rem;
  width: 4rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgb(37 99 235);
  font-size: 1.75rem;
  font-weight: 900;
  color: white;
}

.topic-count {
  display: inline-flex;
  min-width: 7rem;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.topic-count strong {
  font-size: 1.5rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.topic-count span {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(100 116 139);
}

.topic-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.topic-follow-count {
  min-width: 7rem;
}

.topic-followed-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(71 85 105);
}

.tag-chip,
.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.tag-chip {
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

.status-featured {
  background: rgb(254 243 199);
  color: rgb(146 64 14);
}

.status-muted {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.filter-panel {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1rem;
}

.filter-panel h2 {
  font-size: 0.95rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.filter-panel p {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: rgb(100 116 139);
}

.filter-chip {
  border-radius: 999px;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.35rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(71 85 105);
}

.filter-chip-active,
.filter-chip:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
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

.empty-panel h2 {
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

@media (min-width: 768px) {
  .topic-header {
    flex-direction: row;
    align-items: center;
  }

  .filter-panel {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.dark .topic-header,
.dark .topic-count,
.dark .filter-panel,
.dark .secondary-button,
.dark .empty-panel,
.dark .loading-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .topic-count strong,
.dark .filter-panel h2,
.dark .empty-panel h2 {
  color: rgb(248 250 252);
}

.dark .filter-panel p {
  color: rgb(148 163 184);
}

.dark .filter-chip,
.dark .tag-chip {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .filter-chip-active,
.dark .filter-chip:hover {
  border-color: rgb(67 56 202);
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}
</style>
