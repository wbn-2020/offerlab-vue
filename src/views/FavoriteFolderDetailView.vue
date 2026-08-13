<template>
  <div class="community-shell">
    <AppHeader />

    <main class="community-page favorite-detail-page">
      <section v-if="isLoadingFolder" class="state-panel state-panel-loading" aria-live="polite">
        <div class="state-icon state-icon-loading" aria-hidden="true">
          <Loader2 class="h-5 w-5 animate-spin" />
        </div>
        <h1>正在打开公开收藏夹</h1>
        <p>正在确认阅读清单和公开内容。</p>
      </section>

      <section v-else-if="folderError" class="state-panel state-panel-error" role="alert">
        <div class="state-icon state-icon-error" aria-hidden="true">
          <AlertCircle class="h-5 w-5" />
        </div>
        <h1>公开收藏夹暂不可见</h1>
        <p>{{ folderError }}</p>
        <div class="state-actions">
          <button type="button" class="primary-button" @click="loadFolder">
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

      <template v-else-if="folder">
        <section class="identity-panel">
          <div class="folder-mark" aria-hidden="true">
            <Bookmark class="h-7 w-7" />
          </div>

          <div class="identity-copy">
            <div class="identity-labels">
              <span class="asset-label"><Bookmark class="h-3.5 w-3.5" />公开阅读清单</span>
              <span class="visibility-label"><Globe2 class="h-3.5 w-3.5" />{{ visibilityLabel }}</span>
            </div>
            <h1>{{ folder.name }}</h1>
            <p class="identity-description">
              {{ folder.description || '这个公开收藏夹暂未填写描述。' }}
            </p>

            <div class="identity-meta" aria-label="收藏夹信息">
              <span><Files class="h-4 w-4" />{{ folder.postCount }} 条内容</span>
              <span><Clock3 class="h-4 w-4" />{{ formatTime(folder.updatedAt || folder.createdAt) }}</span>
              <span><ListOrdered class="h-4 w-4" />按收藏顺序整理</span>
            </div>

            <RouterLink v-if="ownerProfilePath" :to="ownerProfilePath" class="owner-link">
              <span class="owner-avatar" aria-hidden="true">
                {{ ownerInitial }}
              </span>
              <span>
                <small>收藏夹所有者</small>
                <strong>{{ ownerName || '查看所有者主页' }}</strong>
              </span>
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </RouterLink>
            <div v-else class="owner-link owner-link-static">
              <span class="owner-avatar" aria-hidden="true"><User class="h-4 w-4" /></span>
              <span>
                <small>收藏夹所有者</small>
                <strong>{{ ownerName || '公开用户' }}</strong>
              </span>
            </div>
          </div>

          <div class="header-actions">
            <PublicShareButton
              :title="folder.name"
              :text="folderSeoDescription"
              :canonical="`/favorite-folders/${folderId}`"
              label="分享阅读清单"
              :disabled="!canShareFolder"
              disabled-reason="这个阅读清单当前不可公开分享"
            />
          </div>
        </section>

        <div class="favorite-layout">
          <section class="content-column" aria-labelledby="favorite-posts-title">
            <header class="content-heading">
              <div>
                <h2 id="favorite-posts-title">阅读清单内容</h2>
                <p>按所有者的收藏顺序展示公开可见、未删除且通过治理过滤的帖子。</p>
              </div>
              <span class="order-note"><ListOrdered class="h-4 w-4" />收藏顺序</span>
            </header>

            <div v-if="postsError" class="notice-error" role="alert">
              <AlertCircle class="h-4 w-4" />
              <span>{{ postsError }}</span>
              <button type="button" :disabled="isLoadingPosts" @click="loadPosts(false)">重试</button>
            </div>

            <div v-if="isLoadingPosts && posts.length === 0" class="post-skeletons" aria-live="polite">
              <span class="sr-only">正在加载阅读清单内容...</span>
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
              <div class="state-icon" aria-hidden="true"><Bookmark class="h-5 w-5" /></div>
              <h2>这个阅读清单还没有公开内容</h2>
              <p>所有者收藏的内容可能仍是私密、已删除、审核中，或暂时没有可公开展示的帖子。</p>
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

          <aside class="favorite-rail" aria-label="收藏夹说明">
            <section class="rail-panel">
              <div class="rail-panel-heading">
                <User class="h-5 w-5" aria-hidden="true" />
                <div>
                  <h2>由所有者持续整理</h2>
                  <p>这是个人公开收藏形成的阅读清单，不代表平台精选或内容排名。</p>
                </div>
              </div>
              <RouterLink v-if="ownerProfilePath" :to="ownerProfilePath" class="rail-link">
                查看所有者的公开主页
                <ChevronRight class="h-4 w-4" />
              </RouterLink>
            </section>

            <section class="rail-panel">
              <div class="rail-panel-heading">
                <ShieldCheck class="h-5 w-5" aria-hidden="true" />
                <div>
                  <h2>公开与权限边界</h2>
                  <p>只有公开收藏夹可以访问和分享；私密收藏、已删除内容及受限内容不会在这里展示。</p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertCircle,
  Bookmark,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Files,
  Globe2,
  ListOrdered,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-vue-next'
import { RouterLink, useRoute } from 'vue-router'
import { BizException, getErrorMessage } from '@/api/client'
import { interactionApi } from '@/api/interaction'
import type { ApiId, FavoriteFolder, Post, User as CommunityUser } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import { usePostInteraction } from '@/composables/usePostInteraction'
import { filterVisiblePosts } from '@/utils/recommendationGovernance'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

type FolderWithOwner = FavoriteFolder & {
  owner?: Partial<CommunityUser> | null
  creator?: Partial<CommunityUser> | null
  ownerName?: string
  creatorName?: string
  creatorUid?: ApiId
}

const route = useRoute()
const folder = ref<FolderWithOwner | null>(null)
const posts = ref<Post[]>([])
const cursor = ref<string | undefined>()
const hasMore = ref(false)
const isLoadingFolder = ref(false)
const isLoadingPosts = ref(false)
const folderError = ref('')
const postsError = ref('')

const folderId = computed(() => String(route.params.id || ''))
const visibilityLabel = computed(() => folder.value?.visibility === 'public' ? '公开可见' : '非公开')
const canShareFolder = computed(() => Boolean(folder.value && folder.value.visibility === 'public' && !folderError.value))
const ownerRecord = computed(() => folder.value?.creator || folder.value?.owner || null)
const ownerUid = computed(() => ownerRecord.value?.uid ?? folder.value?.creatorUid ?? folder.value?.ownerId)
const ownerName = computed(() => ownerRecord.value?.nickname || folder.value?.creatorName || folder.value?.ownerName || '')
const ownerInitial = computed(() => ownerName.value.trim().charAt(0).toUpperCase() || '主')
const ownerProfilePath = computed(() => ownerUid.value ? `/u/${ownerUid.value}` : '')
const folderSeoDescription = computed(() => summarizeSeoText(
  folder.value?.description,
  folder.value ? '创建者公开整理的阅读清单，只展示公开可见的帖子。' : '公开收藏夹暂不可见。',
))

const formatTime = (value: number) => {
  if (!value) return '刚刚更新'
  const diff = Date.now() - value
  if (diff < 60_000) return '刚刚更新'
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前更新`
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前更新`
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前更新`
}

const toFolderErrorMessage = (error: unknown) => {
  if (error instanceof BizException && [10401, 10403, 10404, 30202].includes(error.code)) {
    return '这个公开收藏夹可能是私密状态、已删除、不存在，或当前账号没有查看权限。'
  }
  return getErrorMessage(error, '公开收藏夹加载失败')
}

const findPost = (postId: ApiId) => posts.value.find((item) => String(item.postId) === String(postId))
const updatePost = (postId: ApiId, updater: (post: Post) => void) => {
  const post = findPost(postId)
  if (post) updater(post)
}
const { toggleLike, toggleFavorite, isActionPending } = usePostInteraction(updatePost)

const loadFolder = async () => {
  if (!folderId.value) return
  isLoadingFolder.value = true
  folderError.value = ''
  postsError.value = ''
  folder.value = null
  posts.value = []
  cursor.value = undefined
  hasMore.value = false

  try {
    const res = await interactionApi.getPublicFavoriteFolder(folderId.value)
    if (!res.data || res.data.visibility !== 'public') {
      folderError.value = '这个公开收藏夹可能是私密状态、已删除、不存在，或当前账号没有查看权限。'
      return
    }
    folder.value = res.data as FolderWithOwner
    await loadPosts(false)
  } catch (error: unknown) {
    folderError.value = toFolderErrorMessage(error)
  } finally {
    isLoadingFolder.value = false
  }
}

const loadPosts = async (append = false) => {
  if (!folderId.value || (append && !hasMore.value) || (isLoadingPosts.value && append)) return
  isLoadingPosts.value = true
  postsError.value = ''

  try {
    const res = await interactionApi.listPublicFavoriteFolderPosts(folderId.value, {
      cursor: append ? cursor.value : undefined,
      size: 10,
    })
    const page = res.data
    const cleanItems = filterVisiblePosts(page?.items || [])
    posts.value = append ? [...posts.value, ...cleanItems] : cleanItems
    cursor.value = page?.nextCursor
    hasMore.value = Boolean(page?.hasMore && page?.nextCursor)
  } catch (error: unknown) {
    if (!append) posts.value = []
    postsError.value = getErrorMessage(error, '阅读清单内容加载失败')
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

watch(folderId, loadFolder, { immediate: true })
watch([folder, folderId, folderError], () => {
  applyPageSeo({
    title: folder.value?.name || (folderError.value ? '公开收藏夹暂不可见' : '公开收藏夹'),
    description: folderSeoDescription.value,
    canonical: `/favorite-folders/${folderId.value}`,
  })
}, { immediate: true })
</script>

<style scoped>
.community-shell {
  min-height: 100vh;
  background: var(--surface-2);
}

.favorite-detail-page {
  padding-top: 1.5rem;
  padding-bottom: 3rem;
}

.identity-panel,
.state-panel,
.post-skeleton,
.rail-panel {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
}

.identity-panel {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr) auto;
  gap: 1.25rem;
  align-items: start;
  padding: 1.5rem;
}

.folder-mark {
  display: grid;
  width: 5.5rem;
  height: 5.5rem;
  place-items: center;
  border-radius: 8px;
  background: #065f46;
  color: white;
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
  color: #047857;
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

.owner-link {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.1rem;
  color: var(--text-strong);
}

.owner-link:not(.owner-link-static):hover strong {
  color: #047857;
}

.owner-avatar {
  display: grid;
  width: 2rem;
  height: 2rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: #d1fae5;
  color: #065f46;
  font-size: 0.75rem;
  font-weight: 850;
}

.owner-link span:not(.owner-avatar) {
  display: grid;
  min-width: 0;
}

.owner-link small {
  color: var(--text-muted);
  font-size: 0.6875rem;
}

.owner-link strong {
  font-size: 0.8125rem;
  transition: color 0.18s ease;
}

.header-actions {
  justify-content: flex-end;
}

.favorite-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16.5rem, 20rem);
  gap: 1.5rem;
  align-items: start;
  margin-top: 1.5rem;
}

.content-column,
.favorite-rail {
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
.rail-panel h2 {
  color: var(--text-strong);
  font-weight: 800;
}

.content-heading h2 {
  font-size: 1.0625rem;
}

.content-heading p,
.state-panel p,
.rail-panel p {
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
.favorite-rail {
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
  background: #047857;
  color: white;
}

.primary-button:hover {
  background: #065f46;
}

.secondary-button {
  border: 1px solid var(--border-default);
  background: var(--surface);
  color: var(--text-strong);
}

.secondary-button:hover {
  border-color: #6ee7b7;
  color: #047857;
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

.favorite-rail {
  position: sticky;
  top: calc(var(--community-header-height) + 1.25rem);
}

.rail-panel {
  padding: 1rem;
}

.rail-panel-heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.rail-panel-heading > svg {
  flex: 0 0 auto;
  color: #047857;
}

.rail-panel h2 {
  font-size: 0.875rem;
}

.rail-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.9rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border-subtle);
  color: #047857;
  font-size: 0.8125rem;
  font-weight: 750;
}

html.dark .owner-avatar {
  background: rgb(6 78 59 / 0.6);
  color: #a7f3d0;
}

html.dark .asset-label,
html.dark .rail-panel-heading > svg,
html.dark .rail-link {
  color: #6ee7b7;
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

@media (max-width: 900px) {
  .identity-panel {
    grid-template-columns: 5.5rem minmax(0, 1fr);
  }

  .header-actions {
    grid-column: 2;
    justify-content: flex-start;
  }

  .favorite-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .favorite-rail {
    position: static;
  }
}

@media (max-width: 640px) {
  .favorite-detail-page {
    padding-top: 1rem;
    padding-bottom: 1.5rem;
  }

  .identity-panel {
    grid-template-columns: 4.25rem minmax(0, 1fr);
    gap: 0.9rem;
    padding: 1rem;
  }

  .folder-mark {
    width: 4.25rem;
    height: 4.25rem;
  }

  .identity-copy h1 {
    font-size: 1.35rem;
  }

  .identity-meta {
    gap: 0.55rem 0.85rem;
  }

  .owner-link {
    align-items: flex-start;
  }

  .header-actions {
    grid-column: 1 / -1;
    width: 100%;
  }

  .header-actions :deep(.public-share-button) {
    width: 100%;
  }

  .favorite-layout {
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
  .owner-link strong {
    transition: none;
  }
}
</style>
