<template>
  <div class="community-shell">
    <AppHeader />

    <main class="community-page collection-detail-page">
      <section v-if="isLoadingCollection" class="state-panel state-panel-loading" aria-live="polite">
        <div class="state-icon state-icon-loading" aria-hidden="true">
          <Loader2 class="h-5 w-5 animate-spin" />
        </div>
        <h1>正在打开公开合集</h1>
        <p>正在确认合集信息和公开内容。</p>
      </section>

      <section v-else-if="collectionError" class="state-panel state-panel-error" role="alert">
        <div class="state-icon state-icon-error" aria-hidden="true">
          <AlertCircle class="h-5 w-5" />
        </div>
        <h1>合集暂时无法打开</h1>
        <p>{{ collectionError }}</p>
        <div class="state-actions">
          <button type="button" class="primary-button" @click="loadCollection">
            <RefreshCw class="h-4 w-4" />
            重新加载
          </button>
          <RouterLink to="/explore" class="secondary-button">
            <Compass class="h-4 w-4" />
            去发现内容
          </RouterLink>
          <RouterLink to="/search" class="secondary-button">
            <Search class="h-4 w-4" />
            搜索内容
          </RouterLink>
        </div>
      </section>

      <template v-else-if="collection">
        <section class="identity-panel">
          <div class="collection-cover">
            <img
              v-if="showCollectionCover"
              :src="collection.coverUrl"
              :alt="collection.title"
              @error="handleCollectionCoverError"
            >
            <span v-else class="collection-mark" aria-hidden="true">
              {{ collection.title.charAt(0).toUpperCase() }}
            </span>
          </div>

          <div class="identity-copy">
            <div class="identity-labels">
              <span class="asset-label"><LibraryBig class="h-3.5 w-3.5" />公开内容资产</span>
              <span class="visibility-label"><Globe2 class="h-3.5 w-3.5" />公开合集</span>
            </div>
            <h1>{{ collection.title }}</h1>
            <p class="identity-description">
              {{ collection.summary || '这个合集暂未填写简介。' }}
            </p>

            <div class="identity-meta" aria-label="合集信息">
              <span><Files class="h-4 w-4" />{{ collection.progress.publishedCount }} 篇公开内容</span>
              <span><ListChecks class="h-4 w-4" />共收录 {{ collection.progress.totalCount }} 篇</span>
              <span><Clock3 class="h-4 w-4" />{{ formatTime(collection.updatedAt) }}</span>
            </div>

            <RouterLink
              v-if="collection.creatorUid"
              :to="`/u/${collection.creatorUid}`"
              class="creator-link"
            >
              <span class="creator-avatar" aria-hidden="true"><UserRound class="h-4 w-4" /></span>
              <span>
                <small>合集作者</small>
                <strong>查看作者主页</strong>
              </span>
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </RouterLink>
          </div>

          <div class="header-actions">
            <PublicShareButton
              :title="collection.title"
              :text="collectionSeoDescription"
              :canonical="`/collections/${collectionId}`"
              label="分享合集"
              :disabled="!canShareCollection"
              disabled-reason="这个合集当前不可公开分享"
            />
          </div>
        </section>

        <div class="collection-layout">
          <section class="content-column" aria-labelledby="collection-posts-title">
            <header class="content-heading">
              <div>
                <h2 id="collection-posts-title">合集内容</h2>
                <p>按作者编排顺序阅读，只展示公开且通过治理过滤的内容。</p>
              </div>
              <span class="order-note"><ListOrdered class="h-4 w-4" />作者编排</span>
            </header>

            <div v-if="postsError" class="notice-error" role="alert">
              <AlertCircle class="h-4 w-4" />
              <span>{{ postsError }}</span>
              <button type="button" :disabled="isLoadingPosts" @click="loadPosts(false)">重试</button>
            </div>

            <div v-if="isLoadingPosts && posts.length === 0" class="post-skeletons" aria-live="polite">
              <span class="sr-only">正在加载合集内容...</span>
              <div v-for="index in 2" :key="index" class="post-skeleton" aria-hidden="true">
                <div class="skeleton-line skeleton-meta" />
                <div class="skeleton-line skeleton-title" />
                <div class="skeleton-line" />
                <div class="skeleton-line skeleton-short" />
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

            <div v-else class="state-panel state-panel-compact">
              <div class="state-icon" aria-hidden="true"><Files class="h-5 w-5" /></div>
              <h2>这个合集还没有公开内容</h2>
              <p>作者加入的内容可能仍在草稿、私密或审核状态。</p>
              <RouterLink to="/explore" class="secondary-button">
                <Compass class="h-4 w-4" />
                浏览其他公开内容
              </RouterLink>
            </div>

            <div v-if="hasMore" class="pagination-row">
              <button type="button" class="secondary-button" :disabled="isLoadingPosts" @click="loadPosts(true)">
                <Loader2 v-if="isLoadingPosts" class="h-4 w-4 animate-spin" />
                <ChevronDown v-else class="h-4 w-4" />
                {{ isLoadingPosts ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </section>

          <aside class="collection-rail" aria-label="合集公共功能">
            <CommunitySpacePanel
              space-type="collection"
              :identifier="collectionId"
              :title="`${collection.title}公共空间`"
            />

            <UpdateDigestPanel
              source-type="COLLECTION"
              :source-id="collectionId"
              title="我关注的合集更新"
            />

            <section class="boundary-note">
              <ShieldCheck class="h-5 w-5" aria-hidden="true" />
              <div>
                <h2>公开展示边界</h2>
                <p>草稿、私密、已删除、审核中或受限内容不会出现在这个页面。</p>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Clock3,
  Compass,
  Files,
  Globe2,
  LibraryBig,
  ListChecks,
  ListOrdered,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { getErrorMessage } from '@/api/client'
import { contentSeriesApi, type ContentSeriesRecord } from '@/api/contentSeries'
import type { ApiId, Post } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import CommunitySpacePanel from '@/components/community/CommunitySpacePanel.vue'
import UpdateDigestPanel from '@/components/retention/UpdateDigestPanel.vue'
import { usePostInteraction } from '@/composables/usePostInteraction'
import { filterVisiblePosts, isPublicCollectionVisible } from '@/utils/recommendationGovernance'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

const route = useRoute()
const collection = ref<ContentSeriesRecord | null>(null)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoadingCollection = ref(false)
const isLoadingPosts = ref(false)
const collectionError = ref('')
const postsError = ref('')
const failedCollectionCoverUrl = ref('')

const collectionId = computed(() => String(route.params.id || ''))
const showCollectionCover = computed(() => Boolean(collection.value?.coverUrl)
  && failedCollectionCoverUrl.value !== collection.value?.coverUrl)
const collectionSeoDescription = computed(() => summarizeSeoText(
  collection.value?.summary,
  collection.value ? '作者整理的公开内容合集，只展示公开且通过治理过滤的内容。' : '公开合集暂时无法打开。',
))
const canShareCollection = computed(() => Boolean(collection.value && isPublicCollectionVisible(collection.value)))

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
    failedCollectionCoverUrl.value = ''
    await loadPosts(false)
  } catch (error: unknown) {
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
    const cleanItems = filterVisiblePosts(page?.items || [])
    posts.value = append ? [...posts.value, ...cleanItems] : cleanItems
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
  } catch (error: unknown) {
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

const handleCollectionCoverError = () => {
  failedCollectionCoverUrl.value = collection.value?.coverUrl || ''
}

watch(collectionId, loadCollection)
watch([collection, collectionId, collectionError], () => {
  applyPageSeo({
    title: collection.value?.title || (collectionError.value ? '合集暂时无法打开' : '公开合集'),
    description: collectionSeoDescription.value,
    canonical: `/collections/${collectionId.value}`,
  })
}, { immediate: true })
onMounted(loadCollection)
</script>

<style scoped>
.community-shell {
  min-height: 100vh;
  background: var(--surface-2);
}

.collection-detail-page {
  padding-top: 1.5rem;
  padding-bottom: 3rem;
}

.identity-panel,
.state-panel,
.post-skeleton,
.boundary-note {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.identity-panel {
  display: grid;
  grid-template-columns: 8rem minmax(0, 1fr) auto;
  gap: 1.5rem;
  align-items: start;
  padding: 1.5rem;
}

.collection-cover,
.collection-mark {
  display: grid;
  width: 8rem;
  height: 8rem;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #172554;
  color: white;
  font-size: 2rem;
  font-weight: 900;
}

.collection-cover img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity-copy {
  min-width: 0;
}

.identity-labels,
.identity-meta,
.header-actions,
.state-actions,
.pagination-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}

.asset-label,
.visibility-label,
.order-note {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 750;
}

.asset-label {
  color: var(--primary-600);
}

.visibility-label,
.order-note {
  color: var(--text-muted);
}

.identity-copy h1 {
  margin-top: 0.55rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 850;
  line-height: 1.25;
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.identity-description {
  max-width: 68ch;
  margin-top: 0.65rem;
  color: var(--text-muted);
  font-size: 0.9375rem;
  line-height: 1.75;
  overflow-wrap: anywhere;
  text-wrap: pretty;
}

.identity-meta {
  margin-top: 1rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.identity-meta span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.creator-link {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.1rem;
  color: var(--text-strong);
}

.creator-link:hover strong {
  color: var(--primary-600);
}

.creator-avatar {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
}

.creator-link span:not(.creator-avatar) {
  display: grid;
  min-width: 0;
}

.creator-link small {
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.creator-link strong {
  font-size: 0.8125rem;
  transition: color 0.18s ease;
}

.header-actions {
  justify-content: flex-end;
}

.collection-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(17rem, 21rem);
  gap: 1.5rem;
  align-items: start;
  margin-top: 1.5rem;
}

.content-column,
.collection-rail {
  min-width: 0;
}

.content-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid var(--border-subtle);
}

.content-heading h2,
.state-panel h1,
.state-panel h2,
.boundary-note h2 {
  color: var(--text-strong);
  font-weight: 800;
}

.content-heading h2 {
  font-size: 1.0625rem;
}

.content-heading p,
.state-panel p,
.boundary-note p {
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.order-note {
  flex: 0 0 auto;
  padding-top: 0.15rem;
}

.post-list,
.post-skeletons,
.collection-rail {
  display: grid;
  gap: 1rem;
}

.notice-error {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
  border: 1px solid #fecdd3;
  border-radius: var(--radius-surface);
  background: #fff1f2;
  padding: 0.8rem 0.9rem;
  color: #be123c;
  font-size: 0.8125rem;
}

.notice-error span {
  min-width: 0;
  flex: 1;
}

.notice-error button {
  flex: 0 0 auto;
  font-weight: 750;
}

.post-skeleton {
  padding: 1.25rem;
}

.skeleton-line {
  height: 0.75rem;
  margin-top: 0.75rem;
  border-radius: 4px;
  background: var(--surface-3);
}

.skeleton-line:first-child {
  margin-top: 0;
}

.skeleton-meta {
  width: 34%;
}

.skeleton-title {
  width: 78%;
  height: 1rem;
  margin-top: 1.1rem;
}

.skeleton-short {
  width: 58%;
}

.state-panel {
  display: grid;
  justify-items: center;
  max-width: 46rem;
  margin: 3rem auto;
  padding: 2rem;
  color: var(--text-muted);
  text-align: center;
}

.state-panel h1,
.state-panel h2 {
  margin-top: 0.8rem;
  font-size: 1.125rem;
}

.state-panel-compact {
  max-width: none;
  margin: 0;
}

.state-icon {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-muted);
}

.state-icon-loading {
  color: var(--primary-600);
}

.state-icon-error {
  background: #fff1f2;
  color: #be123c;
}

.state-actions,
.state-panel-compact .secondary-button {
  margin-top: 1rem;
  justify-content: center;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  min-height: 40px;
  max-width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: var(--radius-control);
  padding: 0.625rem 0.95rem;
  font-size: 0.8125rem;
  font-weight: 750;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.primary-button {
  background: var(--primary-600);
  color: white;
}

.primary-button:hover {
  background: var(--primary-700);
}

.secondary-button {
  border: 1px solid var(--border-default);
  background: var(--surface);
  color: var(--text-strong);
}

.secondary-button:hover {
  border-color: var(--primary-300);
  color: var(--primary-600);
}

.secondary-button:disabled,
.primary-button:disabled,
.notice-error button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.pagination-row {
  justify-content: center;
  margin-top: 1.25rem;
}

.collection-rail {
  position: sticky;
  top: calc(var(--community-header-height) + 1.25rem);
}

.boundary-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  color: var(--text-muted);
}

.boundary-note > svg {
  flex: 0 0 auto;
  color: #047857;
}

.boundary-note h2 {
  font-size: 0.875rem;
}

html.dark .notice-error {
  border-color: #881337;
  background: rgb(76 5 25 / 0.6);
  color: #fecdd3;
}

html.dark .state-icon-error {
  background: rgb(76 5 25 / 0.6);
  color: #fda4af;
}

html.dark .boundary-note > svg {
  color: #6ee7b7;
}

@media (max-width: 900px) {
  .identity-panel {
    grid-template-columns: 6.5rem minmax(0, 1fr);
  }

  .collection-cover,
  .collection-mark {
    width: 6.5rem;
    height: 6.5rem;
  }

  .header-actions {
    grid-column: 2;
    justify-content: flex-start;
  }

  .collection-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .collection-rail {
    position: static;
  }
}

@media (max-width: 640px) {
  .collection-detail-page {
    padding-top: 1rem;
    padding-bottom: 1.5rem;
  }

  .identity-panel {
    grid-template-columns: 4.5rem minmax(0, 1fr);
    gap: 0.9rem;
    padding: 1rem;
  }

  .collection-cover,
  .collection-mark {
    width: 4.5rem;
    height: 4.5rem;
    font-size: 1.4rem;
  }

  .identity-copy h1 {
    font-size: 1.35rem;
  }

  .identity-meta {
    gap: 0.55rem 0.85rem;
  }

  .creator-link {
    align-items: flex-start;
  }

  .header-actions {
    grid-column: 1 / -1;
    width: 100%;
  }

  .header-actions :deep(.public-share-button) {
    width: 100%;
  }

  .collection-layout {
    margin-top: 1.25rem;
  }

  .content-heading {
    display: grid;
    gap: 0.5rem;
  }

  .order-note {
    padding-top: 0;
  }

  .notice-error {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .notice-error button {
    margin-left: 1.5rem;
  }

  .state-panel {
    margin: 1.5rem auto;
    padding: 1.5rem 1rem;
  }

  .state-actions,
  .state-actions .primary-button,
  .state-actions .secondary-button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin {
    animation: none;
  }

  .primary-button,
  .secondary-button,
  .creator-link strong {
    transition: none;
  }
}
</style>
