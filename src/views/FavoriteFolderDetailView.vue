<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />

    <main class="mx-auto max-w-5xl px-4 py-8">
      <section v-if="isLoadingFolder" class="state-panel">
        正在加载公开收藏夹...
      </section>

      <section v-else-if="folderError" class="state-panel state-panel-error">
        <h1>公开收藏夹暂不可见</h1>
        <p>{{ folderError }}</p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
          <RouterLink to="/explore" class="primary-button">去发现内容</RouterLink>
          <RouterLink to="/search" class="secondary-button">搜索内容</RouterLink>
        </div>
      </section>

      <template v-else-if="folder">
        <section class="favorite-folder-header">
          <div class="folder-mark" aria-hidden="true">{{ folderInitial }}</div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">公开收藏夹 / 阅读清单</p>
            <h1 class="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">{{ folder.name }}</h1>
            <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {{ folder.description || '这个公开收藏夹暂未填写描述。' }}
            </p>

            <div class="mt-4 flex flex-wrap gap-2">
              <span class="info-chip">{{ folder.postCount }} 条内容</span>
              <span class="info-chip">{{ visibilityLabel }}</span>
              <span class="info-chip">{{ formatTime(folder.updatedAt || folder.createdAt) }}</span>
              <RouterLink v-if="ownerProfilePath" :to="ownerProfilePath" class="info-chip info-chip-link">
                创建者：{{ ownerName }}
              </RouterLink>
              <span v-else-if="ownerName" class="info-chip">创建者：{{ ownerName }}</span>
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

        <section class="mt-6 space-y-4">
          <div class="section-title">
            <div>
              <h2>阅读清单内容</h2>
              <p>这里仅展示公开可见、未删除且通过治理过滤的帖子；私密收藏不会出现在公开页面。</p>
            </div>
          </div>

          <div v-if="postsError" class="notice-error">{{ postsError }}</div>

          <div v-if="isLoadingPosts && posts.length === 0" class="state-panel">
            正在加载阅读清单内容...
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
            <h2>这个阅读清单还没有公开内容</h2>
            <p>创建者收藏的内容可能仍是私密、已删除、审核中，或暂时没有可公开展示的帖子。</p>
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
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { BizException, getErrorMessage } from '@/api/client'
import { interactionApi } from '@/api/interaction'
import type { ApiId, FavoriteFolder, Post, User } from '@/api/types'
import AppHeader from '@/components/layout/AppHeader.vue'
import PublicShareButton from '@/components/common/PublicShareButton.vue'
import PostCard from '@/components/post/PostCard.vue'
import { usePostInteraction } from '@/composables/usePostInteraction'
import { filterVisiblePosts } from '@/utils/recommendationGovernance'
import { applyPageSeo, summarizeSeoText } from '@/utils/seo'

type FolderWithOwner = FavoriteFolder & {
  owner?: Partial<User> | null
  creator?: Partial<User> | null
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
const folderInitial = computed(() => folder.value?.name?.trim().charAt(0).toUpperCase() || '阅')
const visibilityLabel = computed(() => folder.value?.visibility === 'public' ? '公开可见' : '非公开')
const canShareFolder = computed(() => Boolean(folder.value && folder.value.visibility === 'public' && !folderError.value))
const ownerRecord = computed(() => folder.value?.creator || folder.value?.owner || null)
const ownerUid = computed(() => ownerRecord.value?.uid ?? folder.value?.creatorUid ?? folder.value?.ownerId)
const ownerName = computed(() => ownerRecord.value?.nickname || folder.value?.creatorName || folder.value?.ownerName || '')
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
.favorite-folder-header,
.section-title,
.state-panel {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  background: white;
  padding: 1.5rem;
}

.favorite-folder-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.folder-mark {
  display: flex;
  height: 3.5rem;
  width: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  background: rgb(5 150 105);
  color: white;
  font-size: 1.35rem;
  font-weight: 900;
}

.info-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgb(236 253 245);
  padding: 0.35rem 0.7rem;
  color: rgb(4 120 87);
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.1rem;
}

.info-chip-link:hover {
  background: rgb(209 250 229);
}

.section-title {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.header-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
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
  background: rgb(5 150 105);
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

.dark .favorite-folder-header,
.dark .section-title,
.dark .state-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .folder-mark {
  background: rgb(6 78 59);
}

.dark .info-chip {
  background: rgb(6 78 59 / 0.45);
  color: rgb(167 243 208);
}

.dark .info-chip-link:hover {
  background: rgb(6 95 70 / 0.62);
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
  .favorite-folder-header {
    flex-direction: column;
  }

  .primary-button,
  .secondary-button,
  .header-actions {
    width: 100%;
  }
}
</style>
