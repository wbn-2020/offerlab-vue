<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <section v-if="isLoadingCollection" class="state-panel">
        正在加载公开合集...
      </section>

      <section v-else-if="collectionError" class="state-panel state-panel-error">
        <h1>合集暂时无法打开</h1>
        <p>{{ collectionError }}</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
          <RouterLink to="/search" class="secondary-button">搜索内容</RouterLink>
        </div>
      </section>

      <template v-else-if="collection">
        <section class="collection-header">
          <div class="collection-mark">{{ collection.title.charAt(0).toUpperCase() }}</div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-primary-600 dark:text-primary-400">公开合集</p>
            <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">{{ collection.title }}</h1>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ collection.summary || '这个合集暂未填写简介。' }}
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <span class="info-chip">{{ collection.progress.totalCount }} 篇内容</span>
              <span class="info-chip">{{ collection.progress.publishedCount }} 篇已公开</span>
              <span class="info-chip">{{ formatTime(collection.updatedAt) }}</span>
            </div>
          </div>
          <RouterLink
            v-if="collection.creatorUid"
            :to="`/u/${collection.creatorUid}`"
            class="secondary-button"
          >
            返回作者主页
          </RouterLink>
        </section>

        <section class="mt-6 space-y-4">
          <div class="section-title">
            <div>
              <h2>合集内容</h2>
              <p>按作者整理的公开内容继续阅读。</p>
            </div>
          </div>

          <div v-if="postsError" class="notice-error">{{ postsError }}</div>

          <div v-if="isLoadingPosts && posts.length === 0" class="state-panel">
            正在加载合集内容...
          </div>

          <template v-else-if="posts.length">
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

          <div v-else class="state-panel">
            <h2>这个合集还没有公开内容</h2>
            <p>作者加入的内容可能仍在草稿、私密或审核状态。</p>
          </div>

          <div v-if="hasMore" class="text-center">
            <button type="button" class="secondary-button" :disabled="isLoadingPosts" @click="loadPosts(true)">
              {{ isLoadingPosts ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import type { ApiId, Post } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import { usePostInteraction } from '@/composables/usePostInteraction'

const route = useRoute()
const collection = ref<ContentSeriesRecord | null>(null)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoadingCollection = ref(false)
const isLoadingPosts = ref(false)
const collectionError = ref('')
const postsError = ref('')

const collectionId = computed(() => String(route.params.id || ''))

const formatTime = (value: number) => {
  if (!value) return '刚刚更新'
  const diff = Date.now() - value
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前更新`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前更新`
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前更新`
}

const findPost = (postId: ApiId) => posts.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const loadCollection = async () => {
  if (!collectionId.value) return
  isLoadingCollection.value = true
  collectionError.value = ''
  postsError.value = ''
  posts.value = []
  cursor.value = undefined
  hasMore.value = false
  try {
    const res = await contentSeriesApi.getPublicDetail(collectionId.value)
    collection.value = res.data
    await loadPosts(false)
  } catch (error: any) {
    collection.value = null
    collectionError.value = getErrorMessage(error, '公开合集加载失败')
  } finally {
    isLoadingCollection.value = false
  }
}

const loadPosts = async (append = false) => {
  if (!collectionId.value || (append && !hasMore.value) || (isLoadingPosts.value && append)) return
  isLoadingPosts.value = true
  postsError.value = ''
  try {
    const res = await contentSeriesApi.listPublicPosts(collectionId.value, append ? cursor.value : undefined, 10)
    const page = res.data
    posts.value = append ? [...posts.value, ...(page?.items || [])] : (page?.items || [])
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
  } catch (error: any) {
    if (!append) posts.value = []
    postsError.value = getErrorMessage(error, '合集内容加载失败')
  } finally {
    isLoadingPosts.value = false
  }
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

watch(collectionId, loadCollection)
onMounted(loadCollection)
</script>

<style scoped>
.collection-header,
.section-title,
.state-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.collection-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.collection-mark {
  display: flex;
  height: 3.5rem;
  width: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgb(15 23 42);
  color: white;
  font-size: 1.35rem;
  font-weight: 900;
}

.info-chip {
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0.35rem 0.7rem;
  color: rgb(29 78 216);
  font-size: 0.78rem;
  font-weight: 800;
}

.section-title {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.section-title h2,
.state-panel h1,
.state-panel h2 {
  color: rgb(15 23 42);
  font-weight: 900;
}

.section-title p,
.state-panel p {
  margin-top: 0.4rem;
  color: rgb(100 116 139);
  font-size: 0.875rem;
}

.state-panel {
  color: rgb(100 116 139);
  text-align: center;
}

.state-panel-error h1 {
  font-size: 1.25rem;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 40px;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.primary-button {
  background: rgb(79 70 229);
  color: white;
}

.secondary-button {
  border: 1px solid rgb(203 213 225);
  background: white;
  color: rgb(51 65 85);
}

.notice-error {
  border: 1px solid rgb(254 205 211);
  border-radius: 0.75rem;
  background: rgb(255 241 242);
  padding: 1rem;
  color: rgb(190 18 60);
  font-size: 0.875rem;
}

.dark .collection-header,
.dark .section-title,
.dark .state-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .collection-mark {
  background: rgb(30 41 59);
}

.dark .info-chip {
  background: rgb(30 41 59);
  color: rgb(191 219 254);
}

.dark .section-title h2,
.dark .state-panel h1,
.dark .state-panel h2 {
  color: rgb(248 250 252);
}

.dark .section-title p,
.dark .state-panel p,
.dark .state-panel {
  color: rgb(148 163 184);
}

.dark .secondary-button {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(226 232 240);
}

.dark .notice-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10);
  color: rgb(254 202 202);
}

@media (max-width: 640px) {
  .collection-header {
    flex-direction: column;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
</style>
