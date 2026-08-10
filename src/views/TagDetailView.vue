<template>
  <div class="app-shell aggregation-page">
    <AppHeader />

    <main class="community-page aggregation-main">
      <section class="identity-banner" aria-labelledby="tag-detail-title">
        <div class="identity-mark" aria-hidden="true">
          <Hash class="h-5 w-5" />
        </div>
        <div class="identity-copy">
          <p class="identity-kicker">标签索引</p>
          <h1 id="tag-detail-title">{{ tagName }}</h1>
          <p class="identity-summary">
            汇总这个标签下的经验分享、问题求助、攻略清单、资源推荐、复盘记录和观点讨论。
          </p>
          <div class="identity-meta" aria-label="标签内容摘要">
            <span><FileText class="h-4 w-4" />{{ displayCount }} 篇公开内容</span>
            <span>按发布时间持续更新</span>
          </div>
        </div>
      </section>

      <div class="aggregation-layout">
        <div class="content-column">
          <section class="content-toolbar" aria-labelledby="tag-content-title">
            <div class="content-heading">
              <h2 id="tag-content-title">标签内容</h2>
              <p>{{ typeSummary }}</p>
            </div>
            <div class="filter-scroll-shell">
              <span class="filter-scroll-hint" aria-hidden="true">左右滑动</span>
              <div class="filter-scroll" role="group" aria-label="标签内容筛选">
                <button
                  type="button"
                  :class="['filter-chip', !activeType ? 'filter-chip-active' : '']"
                  :aria-pressed="!activeType"
                  @click="setType(undefined)"
                >
                  全部
                </button>
                <button
                  type="button"
                  :class="['filter-chip', activeType === POST_TYPE.QUESTION ? 'filter-chip-active' : '']"
                  :aria-pressed="activeType === POST_TYPE.QUESTION"
                  @click="setType(POST_TYPE.QUESTION)"
                >
                  问题求助
                </button>
                <button
                  v-for="type in contentTypeChannels"
                  :key="type.value"
                  type="button"
                  :class="['filter-chip', activeType === type.value ? 'filter-chip-active' : '']"
                  :aria-pressed="activeType === type.value"
                  @click="setType(type.value)"
                >
                  {{ type.shortLabel }}
                </button>
                <button
                  type="button"
                  :class="['filter-chip', featuredOnly ? 'filter-chip-active' : '']"
                  :aria-pressed="featuredOnly"
                  @click="toggleFeatured"
                >
                  精选
                </button>
              </div>
            </div>
          </section>

          <section class="feed-section" aria-live="polite">
            <div v-if="errorMessage" class="notice-error">{{ errorMessage }}</div>

            <div v-if="isLoading && posts.length === 0" class="loading-panel" role="status">
              <span class="sr-only">正在加载标签内容...</span>
              <div v-for="index in 3" :key="index" class="loading-row" aria-hidden="true">
                <span class="loading-avatar" />
                <span class="loading-lines"><i /><i /><i /></span>
              </div>
            </div>

            <div v-else-if="posts.length" class="post-list">
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
            </div>

            <div v-else class="empty-panel">
              <div class="empty-icon" aria-hidden="true"><Hash class="h-5 w-5" /></div>
              <h2>{{ emptyTitle }}</h2>
              <p>{{ emptyDescription }}</p>
              <div class="empty-actions">
                <RouterLink to="/explore" class="primary-button">发现内容</RouterLink>
                <RouterLink :to="{ path: '/search', query: { mode: 'tags', q: tagName } }" class="secondary-button">搜索相关标签</RouterLink>
                <RouterLink to="/editor" class="secondary-button">发布内容</RouterLink>
              </div>
            </div>

            <div v-if="hasMore" class="load-more-row">
              <button type="button" class="secondary-button" :disabled="isLoading" @click="loadPosts(true)">
                {{ isLoading ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </section>
        </div>

        <aside class="support-rail" aria-label="标签辅助操作">
          <div class="support-rail-inner">
            <section class="side-panel side-panel-primary">
              <div class="side-panel-heading">
                <div>
                  <span>当前标签</span>
                  <h2>{{ tagName }}</h2>
                </div>
                <strong>{{ displayCount }}</strong>
              </div>
              <p>这里仅展示公开且仍可见的内容，筛选不会改变标签本身。</p>
              <PublicShareButton
                class="rail-share-button"
                :title="tagId ? tagName : '标签暂未找到'"
                :text="tagSeoDescription"
                :canonical="`/tag/${tagSlug}`"
                label="分享标签"
                :disabled="!tagId"
                disabled-reason="这个标签当前不可公开分享"
              />
            </section>

            <nav class="side-panel side-links" aria-label="继续浏览">
              <h2>继续浏览</h2>
              <RouterLink to="/explore">
                <Compass class="h-4 w-4" />
                <span><strong>发现更多内容</strong><small>浏览频道与活跃话题</small></span>
              </RouterLink>
              <RouterLink :to="{ path: '/search', query: { mode: 'tags', q: tagName } }">
                <Search class="h-4 w-4" />
                <span><strong>搜索相关标签</strong><small>换个关键词继续查找</small></span>
              </RouterLink>
              <RouterLink to="/editor">
                <PenLine class="h-4 w-4" />
                <span><strong>发布内容</strong><small>分享经验、问题或清单</small></span>
              </RouterLink>
            </nav>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import { Compass, FileText, Hash, PenLine, Search } from 'lucide-vue-next'
import { postApi } from '@/api/post'
import { usePostInteraction } from '@/composables/usePostInteraction'
import type { ApiId, Post, Tag } from '@/api/types'
import { COMMUNITY_CONTENT_TYPES, POST_TYPE } from '@/utils/contentTypes'
import { postTypeSummary } from '@/utils/communityMetrics'
import { filterPublicContent } from '@/utils/textQuality'
import { filterVisiblePosts } from '@/utils/recommendationGovernance'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

const route = useRoute()
const tagName = ref('标签')
const tagId = ref<ApiId | null>(null)
const declaredCount = ref(0)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const activeType = ref<number | undefined>()
const featuredOnly = ref(false)
let tagLoadGeneration = 0
let postRequestGeneration = 0

const tagSlug = computed(() => String(route.params.slug || ''))
const displayCount = computed(() => declaredCount.value || posts.value.length)
const contentTypeChannels = COMMUNITY_CONTENT_TYPES
const typeSummary = computed(() => postTypeSummary(posts.value))
const emptyTitle = computed(() => tagId.value ? '这个标签下还没有内容' : '没有找到这个标签')
const emptyDescription = computed(() => tagId.value
  ? '去发现相关内容，或发布第一篇经验、问题、攻略或资源。'
  : '可以换个关键词搜索，或去发现页看看相近内容。')
const tagSeoDescription = computed(() => summarizeSeoText(
  tagId.value ? `汇总「${tagName.value}」标签下的公开内容。` : '',
  tagId.value ? '标签公开索引，只展示公开且通过治理过滤的内容。' : '标签暂时无法打开。',
))

const findPost = (postId: ApiId) => posts.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const isCurrentTagLoad = (targetGeneration: number, slug: string) => (
  targetGeneration === tagLoadGeneration && tagSlug.value === slug
)

const loadTag = async () => {
  const slug = String(route.params.slug || '')
  const targetGeneration = ++tagLoadGeneration
  postRequestGeneration += 1
  tagName.value = slug || '标签'
  tagId.value = null
  declaredCount.value = 0
  posts.value = []
  cursor.value = undefined
  hasMore.value = false
  errorMessage.value = ''
  isLoading.value = true
  let isPostLoadStarted = false
  try {
    const tagsRes = await postApi.getTags()
    if (!isCurrentTagLoad(targetGeneration, slug)) return
    const tags = tagsRes.data || []
    const currentTag = tags.find((tag: Tag) => tag.slug === slug || String(tag.id) === slug || tag.name === slug)
    if (!currentTag) return

    tagId.value = currentTag.id
    tagName.value = currentTag.name
    declaredCount.value = currentTag.count || 0
    isPostLoadStarted = true
    await loadPosts(false, targetGeneration)
  } catch (error: unknown) {
    if (isCurrentTagLoad(targetGeneration, slug)) {
      errorMessage.value = getErrorMessage(error, '标签内容加载失败')
    }
  } finally {
    if (isCurrentTagLoad(targetGeneration, slug) && !isPostLoadStarted) {
      isLoading.value = false
    }
  }
}

const loadPosts = async (append = false, targetTagGeneration = tagLoadGeneration) => {
  const slugSnapshot = tagSlug.value
  const tagIdSnapshot = tagId.value
  if (tagIdSnapshot == null || (append && !hasMore.value) || (isLoading.value && append)) return
  const typeSnapshot = activeType.value
  const featuredSnapshot = featuredOnly.value
  const cursorSnapshot = append ? cursor.value : undefined
  const targetPostGeneration = append ? postRequestGeneration : ++postRequestGeneration
  const isCurrentPostLoad = () => (
    isCurrentTagLoad(targetTagGeneration, slugSnapshot)
    && targetPostGeneration === postRequestGeneration
    && String(tagId.value ?? '') === String(tagIdSnapshot)
    && activeType.value === typeSnapshot
    && featuredOnly.value === featuredSnapshot
  )
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await postApi.getTagPosts(tagIdSnapshot, cursorSnapshot, 10, {
      type: typeSnapshot,
      featured: featuredSnapshot ? true : undefined,
    })
    if (!isCurrentPostLoad()) return
    const page = res.data
    const cleanItems = filterVisiblePosts(filterPublicContent(page?.items || []))
    posts.value = append ? [...posts.value, ...cleanItems] : cleanItems
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
    declaredCount.value = declaredCount.value || posts.value.length
  } catch (error: unknown) {
    if (isCurrentPostLoad()) {
      errorMessage.value = getErrorMessage(error, '标签内容加载失败')
    }
  } finally {
    if (isCurrentPostLoad()) {
      isLoading.value = false
    }
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

watch(() => route.params.slug, loadTag, { immediate: true })
watch([tagName, tagId, tagSlug, errorMessage], () => {
  applyPageSeo({
    title: tagId.value ? tagName.value : (errorMessage.value ? '标签暂时无法打开' : '标签'),
    description: tagSeoDescription.value,
    canonical: `/tag/${tagSlug.value}`,
  })
}, { immediate: true })
onUnmounted(() => {
  tagLoadGeneration += 1
  postRequestGeneration += 1
})
</script>

<style scoped>
.aggregation-page {
  min-height: 100vh;
  background: var(--surface-2);
}

.aggregation-main {
  padding-top: 1.5rem;
  padding-bottom: 4rem;
}

.identity-banner {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0.25rem 0 1.35rem;
}

.identity-mark {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-surface);
  background: var(--primary-50);
  color: var(--primary-700);
}

.identity-copy {
  min-width: 0;
  flex: 1;
}

.identity-kicker {
  margin: 0 0 0.2rem;
  color: var(--primary-600);
  font-size: 0.75rem;
  font-weight: 800;
}

.identity-copy h1 {
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--text-strong);
  font-size: 1.5rem;
  font-weight: 850;
  line-height: 1.35;
  text-wrap: balance;
}

.identity-summary {
  max-width: 46rem;
  margin: 0.45rem 0 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.7;
  text-wrap: pretty;
}

.identity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem 1rem;
  margin-top: 0.65rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.identity-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.aggregation-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 272px;
  grid-template-areas: "content rail";
  align-items: start;
  gap: 1.5rem;
  margin-top: 1.25rem;
}

.content-column {
  grid-area: content;
  min-width: 0;
}

.support-rail {
  grid-area: rail;
  min-width: 0;
}

.support-rail-inner {
  display: grid;
  gap: 0.9rem;
}

.content-toolbar {
  display: grid;
  gap: 0.8rem;
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 0.1rem 0.9rem;
}

.content-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.content-heading h2,
.side-panel h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 0.9375rem;
  font-weight: 850;
}

.content-heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  text-align: right;
}

.filter-scroll {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
  padding: 0.1rem 0 0.15rem;
  scrollbar-width: none;
}

.filter-scroll::-webkit-scrollbar {
  display: none;
}

.filter-scroll-shell {
  position: relative;
  min-width: 0;
}

.filter-scroll-hint {
  display: none;
}

.filter-chip {
  min-height: 2rem;
  flex: 0 0 auto;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  padding: 0.35rem 0.65rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.filter-chip-active,
.filter-chip:hover {
  background: var(--primary-50);
  color: var(--primary-700);
}

.feed-section {
  margin-top: 1rem;
}

.post-list {
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.post-list :deep(.post-card) {
  border-bottom-color: var(--border-subtle);
}

.side-panel {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  padding: 0.95rem;
  box-shadow: var(--shadow-soft);
}

.side-panel-primary {
  display: grid;
  gap: 0.8rem;
}

.side-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.side-panel-heading span {
  display: block;
  margin-bottom: 0.2rem;
  color: var(--text-muted);
  font-size: 0.6875rem;
  font-weight: 700;
}

.side-panel-heading h2 {
  overflow-wrap: anywhere;
}

.side-panel-heading > strong {
  color: var(--primary-600);
  font-size: 1.35rem;
  font-weight: 850;
  line-height: 1;
}

.side-panel-primary > p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.rail-share-button {
  width: 100%;
}

.side-links {
  display: grid;
  gap: 0.25rem;
}

.side-links h2 {
  margin-bottom: 0.35rem;
}

.side-links a {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  border-radius: 6px;
  padding: 0.55rem 0.45rem;
  color: var(--text-primary);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.side-links a:hover {
  background: var(--surface-3);
  color: var(--primary-700);
}

.side-links a > svg {
  flex: 0 0 auto;
  color: var(--text-muted);
}

.side-links a > span {
  display: grid;
  min-width: 0;
  gap: 0.1rem;
}

.side-links strong {
  font-size: 0.8125rem;
  font-weight: 750;
}

.side-links small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.6875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 2.375rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control);
  padding: 0.5rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 700;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.primary-button {
  background: var(--primary-600);
  color: white;
}

.primary-button:hover {
  background: var(--primary-700);
}

.secondary-button {
  border: 1px solid var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

.secondary-button:hover:not(:disabled) {
  border-color: #bfdbfe;
  background: var(--primary-50);
  color: var(--primary-700);
}

.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.empty-panel,
.loading-panel,
.notice-error {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-soft);
}

.empty-panel {
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.empty-icon {
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.8rem;
  border-radius: var(--radius-surface);
  background: var(--surface-3);
  color: var(--text-muted);
}

.empty-panel h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-strong);
}

.empty-panel p {
  max-width: 40rem;
  margin-top: 0.5rem;
  margin-right: auto;
  margin-left: auto;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
}

.loading-panel {
  display: grid;
  gap: 0;
  overflow: hidden;
}

.loading-row {
  display: flex;
  gap: 0.75rem;
  padding: 1.15rem 1rem;
  border-bottom: 1px solid var(--border-subtle);
}

.loading-row:last-child {
  border-bottom: 0;
}

.loading-avatar,
.loading-lines i {
  display: block;
  background: var(--surface-3);
  animation: loading-pulse 1.6s ease-in-out infinite;
}

.loading-avatar {
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  border-radius: 50%;
}

.loading-lines {
  display: grid;
  flex: 1;
  gap: 0.45rem;
}

.loading-lines i {
  height: 0.55rem;
  border-radius: 3px;
}

.loading-lines i:nth-child(1) {
  width: 34%;
}

.loading-lines i:nth-child(2) {
  width: 78%;
}

.loading-lines i:nth-child(3) {
  width: 58%;
}

.notice-error {
  margin-bottom: 1rem;
  border-color: #fecaca;
  background: #fef2f2;
  padding: 0.9rem 1rem;
  color: #b91c1c;
  font-size: 0.8125rem;
  line-height: 1.6;
}

.load-more-row {
  margin-top: 1rem;
  text-align: center;
}

@keyframes loading-pulse {
  0%,
  100% {
    opacity: 0.55;
  }

  50% {
    opacity: 1;
  }
}

.dark .aggregation-page {
  background: #0f1115;
}

.dark .identity-mark,
.dark .filter-chip-active,
.dark .filter-chip:hover,
.dark .secondary-button:hover:not(:disabled) {
  background: rgb(30 58 138 / 0.35);
  color: rgb(147 197 253);
}

.dark .post-list,
.dark .side-panel,
.dark .empty-panel,
.dark .loading-panel,
.dark .secondary-button {
  border-color: rgb(39 39 42);
  background: rgb(24 26 32);
}

.dark .side-links a:hover,
.dark .empty-icon,
.dark .loading-avatar,
.dark .loading-lines i {
  background: rgb(39 39 42);
}

.dark .notice-error {
  border-color: rgb(127 29 29);
  background: rgb(69 10 10 / 0.45);
  color: rgb(254 202 202);
}

@media (min-width: 1024px) {
  .support-rail-inner {
    position: sticky;
    top: calc(var(--community-header-height) + 1.25rem);
  }
}

@media (max-width: 1023px) {
  .aggregation-layout {
    display: flex;
    flex-direction: column;
  }

  .content-column,
  .support-rail {
    width: 100%;
  }

  .support-rail-inner {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .aggregation-main {
    padding-top: 0.75rem;
    padding-bottom: 2rem;
  }

  .identity-banner {
    gap: 0.75rem;
    padding-bottom: 1rem;
  }

  .identity-mark {
    width: 2.35rem;
    height: 2.35rem;
  }

  .identity-copy h1 {
    font-size: 1.25rem;
  }

  .identity-summary {
    font-size: 0.8125rem;
  }

  .identity-meta span:last-child {
    display: none;
  }

  .aggregation-layout {
    gap: 1.25rem;
    margin-top: 0.9rem;
  }

  .content-heading {
    display: block;
  }

  .content-heading p {
    margin-top: 0.25rem;
    text-align: left;
  }

  .filter-scroll {
    margin-right: -1rem;
    padding-right: 1rem;
  }

  .filter-scroll-shell::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 2.75rem;
    pointer-events: none;
    background: linear-gradient(90deg, transparent, var(--surface) 75%);
    content: '';
  }

  .filter-scroll-hint {
    display: block;
    position: absolute;
    z-index: 1;
    top: -1.35rem;
    right: 0;
    color: var(--text-muted);
    font-size: 0.6875rem;
    font-weight: 700;
  }

  .post-list {
    margin-right: -1rem;
    margin-left: -1rem;
    border-right: 0;
    border-left: 0;
    border-radius: 0;
  }

  .support-rail-inner {
    grid-template-columns: minmax(0, 1fr);
  }

  .empty-panel {
    padding: 2rem 1rem;
  }

  .empty-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .empty-actions > * {
    width: 100%;
  }
}
</style>
