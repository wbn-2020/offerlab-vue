<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <section class="tag-header">
        <div class="tag-icon">{{ tagName.charAt(0).toUpperCase() }}</div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-primary-600 dark:text-primary-400">Tag</p>
          <h1 class="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-slate-50">{{ tagName }}</h1>
          <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            汇总这个标签下的面经、讨论和求职复盘。
          </p>
        </div>
        <div class="tag-count">
          <strong>{{ displayCount }}</strong>
          <span>篇内容</span>
        </div>
      </section>

      <section class="mt-6 space-y-4">
        <div v-if="errorMessage" class="notice-error">{{ errorMessage }}</div>

        <div v-if="isLoading && posts.length === 0" class="loading-panel">
          正在加载标签内容...
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
          />
        </template>

        <div v-else class="empty-panel">
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyDescription }}</p>
          <RouterLink to="/explore" class="primary-button mt-4">去发现内容</RouterLink>
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
import { RouterLink, useRoute } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PostCard from '@/components/post/PostCard.vue'
import { postApi } from '@/api/post'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, Post, Tag } from '@/api/types'

const route = useRoute()
const tagName = ref('标签')
const tagId = ref<ApiId | null>(null)
const declaredCount = ref(0)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const displayCount = computed(() => declaredCount.value || posts.value.length)
const emptyTitle = computed(() => tagId.value ? '这个标签下还没有内容' : '没有找到这个标签')
const emptyDescription = computed(() => tagId.value
  ? '等第一篇相关内容发布后，它会出现在这里。'
  : '标签可能已被重命名，或者当前标签列表暂未包含它。')

const findPost = (postId: ApiId) => posts.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const loadTag = async () => {
  const slug = String(route.params.slug || '')
  tagName.value = slug || '标签'
  tagId.value = null
  declaredCount.value = 0
  posts.value = []
  cursor.value = undefined
  hasMore.value = false
  errorMessage.value = ''
  isLoading.value = true
  try {
    const tagsRes = await postApi.getTags()
    const tags = tagsRes.data || []
    const currentTag = tags.find((tag: Tag) => tag.slug === slug || String(tag.id) === slug || tag.name === slug)
    if (!currentTag) return

    tagId.value = currentTag.id
    tagName.value = currentTag.name
    declaredCount.value = currentTag.count || 0
    await loadPosts(false)
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, '标签内容加载失败')
  } finally {
    isLoading.value = false
  }
}

const loadPosts = async (append = false) => {
  if (!tagId.value || (append && !hasMore.value) || (isLoading.value && append)) return
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await postApi.getTagPosts(tagId.value, append ? cursor.value : undefined, 10)
    const page = res.data
    posts.value = append ? [...posts.value, ...(page?.items || [])] : (page?.items || [])
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
    declaredCount.value = declaredCount.value || posts.value.length
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, '标签内容加载失败')
  } finally {
    isLoading.value = false
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

watch(() => route.params.slug, loadTag)
onMounted(loadTag)
</script>

<style scoped>
.tag-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.tag-icon {
  display: flex;
  height: 4rem;
  width: 4rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgb(37 99 235);
  font-size: 1.75rem;
  font-weight: 800;
  color: white;
}

.tag-count {
  display: inline-flex;
  min-width: 7rem;
  flex-direction: column;
  justify-content: center;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
}

.tag-count strong {
  font-size: 1.5rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.tag-count span {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(100 116 139);
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
  .tag-header {
    flex-direction: row;
    align-items: center;
  }
}

:global(.dark) .tag-header,
:global(.dark) .tag-count,
:global(.dark) .secondary-button,
:global(.dark) .empty-panel,
:global(.dark) .loading-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

:global(.dark) .tag-count strong,
:global(.dark) .empty-panel h2 {
  color: rgb(248 250 252);
}
</style>
