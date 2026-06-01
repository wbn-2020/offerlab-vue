<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2">
          <LoadingSkeleton v-if="isLoading" />

          <template v-else-if="post">
            <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div class="flex items-center justify-between gap-4">
                <RouterLink :to="`/u/${post.author.uid}`" class="flex min-w-0 items-center gap-3">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 font-bold text-white">
                    <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
                  </div>
                </RouterLink>
                <button
                  v-if="!isOwnPost"
                  type="button"
                  class="rounded-lg border border-primary-600 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                  :disabled="isFollowingAuthor"
                  @click="toggleFollowAuthor"
                >
                  {{ post.author.isFollowing ? '已关注' : '关注' }}
                </button>
              </div>
            </section>

            <article class="mb-6 rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <h1 class="mb-4 text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100">{{ post.title }}</h1>

              <div v-if="post.extension" class="mb-6 flex flex-wrap gap-3 border-b border-slate-200 pb-6 dark:border-slate-800">
                <span v-if="post.extension.company" class="meta-pill">公司：{{ post.extension.company }}</span>
                <span v-if="post.extension.position" class="meta-pill">岗位：{{ post.extension.position }}</span>
                <span v-if="post.extension.yearsOfExp" class="meta-pill">年限：{{ post.extension.yearsOfExp }} 年</span>
                <span v-if="post.extension.interviewResult" class="rounded px-2 py-1 text-xs font-medium" :class="getResultClass(post.extension.interviewResult)">
                  {{ getResultText(post.extension.interviewResult) }}
                </span>
              </div>

              <div class="prose mb-8 max-w-none dark:prose-invert">
                <MarkdownRenderer :content="post.content" />
              </div>

              <PostQuestionBlock v-if="post.postType === 1" :post-id="post.postId" />

              <div v-if="post.tags.length" class="mb-8 flex flex-wrap gap-2 border-b border-slate-200 pb-8 dark:border-slate-800">
                <RouterLink
                  v-for="tag in post.tags"
                  :key="tag.id"
                  :to="`/tag/${tag.slug || tag.id}`"
                  class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-primary-100 hover:text-primary-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-primary-950"
                >
                  {{ tag.name }}
                </RouterLink>
              </div>

              <InteractionBar
                :post="post"
                :like-pending="isTogglingLike"
                :favorite-pending="isTogglingFavorite"
                @like="handleLike"
                @favorite="handleFavorite"
              />

              <div v-if="authStore.isLoggedIn" class="mt-4 flex justify-end gap-3">
                <template v-if="isOwnPost">
                  <button
                    v-if="canViewVersionHistory"
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    :disabled="isLoadingVersions"
                    @click="openVersionHistory"
                  >
                    {{ isLoadingVersions ? '加载中...' : '版本历史' }}
                  </button>
                  <RouterLink
                    :to="`/editor/${post.postId}`"
                    class="rounded-lg border border-primary-600 px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 dark:hover:bg-slate-800"
                  >
                    编辑帖子
                  </RouterLink>
                  <button
                    type="button"
                    class="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950"
                    :disabled="isDeletingPost"
                    @click="handleDeletePost"
                  >
                    {{ isDeletingPost ? '删除中...' : '删除帖子' }}
                  </button>
                </template>
                <template v-else>
                  <button
                    v-if="canViewVersionHistory"
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    :disabled="isLoadingVersions"
                    @click="openVersionHistory"
                  >
                    {{ isLoadingVersions ? '加载中...' : '版本历史' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    :disabled="isReporting"
                    @click="openPostReportDialog"
                  >
                    举报帖子
                  </button>
                </template>
              </div>
            </article>

            <section class="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
              <h2 class="mb-6 text-xl font-bold text-slate-900 dark:text-slate-100">评论（{{ post.counter.comment }}）</h2>

              <div v-if="authStore.isLoggedIn" class="mb-6 border-b border-slate-200 pb-6 dark:border-slate-800">
                <textarea
                  v-model="commentText"
                  rows="3"
                  placeholder="分享你的想法..."
                  class="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                <div class="mt-3 flex justify-end gap-2">
                  <button type="button" class="rounded-lg px-4 py-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" @click="commentText = ''">
                    取消
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="!commentText.trim() || isSubmittingComment"
                    @click="handleSubmitComment"
                  >
                    {{ isSubmittingComment ? '发送中...' : '发送' }}
                  </button>
                </div>
              </div>

              <div v-if="isLoadingComments" class="rounded-lg border border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                正在加载评论...
              </div>
              <div v-else-if="commentsErrorMessage" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200">
                <p class="font-semibold">{{ commentsErrorMessage }}</p>
                <button type="button" class="mt-4 rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40" @click="loadComments(true)">
                  重试
                </button>
              </div>
              <CommentTree
                ref="commentTreeRef"
                v-else
                :post-id="postId"
                :comments="comments"
                :can-like-comments="authStore.isLoggedIn"
                :can-report-comments="true"
                :can-reply-comments="authStore.isLoggedIn"
                @require-login="requireLogin"
                @like-comment="handleLikeComment"
                @unlike-comment="handleUnlikeComment"
                @reply-comment="handleReplyComment"
                @delete-comment="handleDeleteComment"
                @report-comment="openCommentReportDialog"
              />
              <div v-if="hasMoreComments" class="mt-6 text-center">
                <button
                  type="button"
                  class="rounded-lg border border-primary-600 px-5 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
                  :disabled="isLoadingMoreComments"
                  @click="loadMoreComments"
                >
                  {{ isLoadingMoreComments ? '加载中...' : '加载更多评论' }}
                </button>
              </div>
            </section>
          </template>

          <EmptyState v-else :title="postUnavailableTitle" :description="postUnavailableDescription" actionText="返回首页" actionHref="/" />
        </div>

        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-6">
            <section v-if="post" class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">作者信息</h3>
              <RouterLink :to="`/u/${post.author.uid}`" class="flex flex-col items-center text-center">
                <div class="mb-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-2xl font-bold text-white">
                  <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
                  <span v-else>{{ post.author.nickname.charAt(0) || '?' }}</span>
                </div>
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</h4>
                <p class="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{{ post.author.signature || '暂无签名' }}</p>
              </RouterLink>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h3 class="mb-4 font-bold text-slate-900 dark:text-slate-100">相关帖子</h3>
              <div v-if="relatedPosts.length" class="space-y-3">
                <RouterLink
                  v-for="item in relatedPosts"
                  :key="item.postId"
                  :to="`/post/${item.postId}`"
                  class="block rounded-lg p-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div class="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ item.counter.view }} 浏览</div>
                </RouterLink>
              </div>
              <p v-else class="text-sm text-slate-500 dark:text-slate-400">暂无相关内容</p>
            </section>
          </div>
        </aside>
      </div>
    </main>

    <div v-if="isReportDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeReportDialog">
      <form class="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" @submit.prevent="submitReport">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">{{ reportTarget.type === 'comment' ? '举报评论' : '举报帖子' }}</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">说明问题后提交给管理员审核。</p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeReportDialog">
            关闭
          </button>
        </div>

        <label class="mt-5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          举报类型
          <select v-model="reportForm.reason" class="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
            <option value="SPAM">垃圾广告</option>
            <option value="ABUSE">攻击辱骂</option>
            <option value="PRIVACY">隐私泄露</option>
            <option value="OTHER">其他问题</option>
          </select>
        </label>

        <label class="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          补充说明
          <textarea
            v-model.trim="reportForm.detail"
            rows="4"
            maxlength="1000"
            placeholder="Describe the content that needs review"
            class="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </label>

        <div class="mt-5 flex justify-end gap-3">
          <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeReportDialog">
            取消
          </button>
          <button type="submit" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60" :disabled="isReporting">
            {{ isReporting ? '提交中...' : '提交举报' }}
          </button>
        </div>
      </form>
    </div>

    <div v-if="isVersionDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" @click.self="closeVersionHistory">
      <section class="version-dialog w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="version-history-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 id="version-history-title" class="text-lg font-bold text-slate-950 dark:text-slate-50">版本历史</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">展示最近编辑前的内容快照，便于作者回看和内容审计。</p>
          </div>
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" @click="closeVersionHistory">
            关闭
          </button>
        </div>

        <div class="mt-5 flex justify-end">
          <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" :disabled="isLoadingVersions" @click="loadVersionHistory">
            {{ isLoadingVersions ? '刷新中...' : '刷新' }}
          </button>
        </div>

        <div v-if="isLoadingVersions" class="mt-5 rounded-lg border border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          正在加载版本历史...
        </div>
        <div v-else-if="versionHistories.length === 0" class="mt-5 rounded-lg border border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          暂无历史版本
        </div>
        <div v-else class="version-list mt-5">
          <article v-for="item in versionHistories" :key="item.id" class="version-item">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{{ item.title }}</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {{ formatTime(item.createdAt) }} / v{{ item.baseVersion ?? 0 }} / {{ changeSummaryText(item.changeSummary) }}
                </div>
              </div>
              <div v-if="item.editorUid" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                UID {{ item.editorUid }}
              </div>
            </div>
            <p class="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{{ item.contentSummary || item.content }}</p>
            <div v-if="item.tags.length" class="mt-3 flex flex-wrap gap-2">
              <span v-for="tag in item.tags" :key="tag.id" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ tag.name }}</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { userApi } from '@/api/user'
import { opsApi, type MyAdminPermissions } from '@/api/ops'
import { useAuthStore } from '@/stores/auth'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import AppHeader from '@/components/layout/AppHeader.vue'
import MarkdownRenderer from '@/components/post/MarkdownRenderer.vue'
import InteractionBar from '@/components/post/InteractionBar.vue'
import CommentTree from '@/components/post/CommentTree.vue'
import PostQuestionBlock from '@/components/question/PostQuestionBlock.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatTime } from '@/lib/format'
import { toast } from 'vue-sonner'
import { BizException, getErrorMessage } from '@/api/client'
import type { Comment, Post, PostVersionHistory } from '@/api/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()

const adminPermissions = ref<MyAdminPermissions | null>(null)
const versionHistories = ref<PostVersionHistory[]>([])
const isVersionDialogOpen = ref(false)
const isLoadingVersions = ref(false)
const versionLoadAttempted = ref(false)
const postId = computed(() => route.params.id as string)
const commentText = ref('')
const isSubmittingComment = ref(false)
const isReporting = ref(false)
const isDeletingPost = ref(false)
const isTogglingLike = ref(false)
const isTogglingFavorite = ref(false)
const isReportDialogOpen = ref(false)
const isFollowingAuthor = ref(false)
const reportForm = ref({ reason: 'OTHER', detail: '' })
const reportTarget = ref<{ type: 'post' | 'comment'; id?: Comment['commentId'] }>({ type: 'post' })
const comments = ref<Comment[]>([])
const commentTreeRef = ref<{ markCommentLikeSettled: (commentId: Comment['commentId']) => void } | null>(null)
const relatedPosts = ref<Post[]>([])
const commentCursor = ref<string | undefined>()
const hasMoreComments = ref(false)
const isLoadingComments = ref(false)
const isLoadingMoreComments = ref(false)
const commentsErrorMessage = ref('')

const { data: postData, isLoading, error: postError } = useQuery({
  queryKey: computed(() => ['post', postId.value]),
  queryFn: () => postApi.getDetail(postId.value),
  enabled: computed(() => Boolean(postId.value)),
  retry: false,
})

const clonePost = (source?: Post | null): Post | null => {
  if (!source) return null
  return {
    ...source,
    author: { ...source.author },
    counter: { ...source.counter },
    extension: source.extension ? { ...source.extension } : undefined,
    myInteraction: source.myInteraction ? { ...source.myInteraction } : undefined,
    tags: [...source.tags],
  }
}

const post = ref<Post | null>(null)
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(post.value?.author.uid ?? ''))
const isContentModerator = computed(() => Boolean(adminPermissions.value?.contentModerator || adminPermissions.value?.admin))
const canViewVersionHistory = computed(() => Boolean(authStore.isLoggedIn && post.value && (isOwnPost.value || isContentModerator.value)))
const postErrorCode = computed(() => errorCodeOf(postError.value))
const postUnavailableTitle = computed(() => postErrorCode.value === 10403 || postErrorCode.value === 403 ? '无权访问' : '内容不可见')
const postUnavailableDescription = computed(() => postErrorCode.value === 10403 || postErrorCode.value === 403
  ? '当前账号没有权限查看这篇帖子，评论也不会被公开展示。'
  : '该帖子可能已被删除、下架，或当前不可公开访问。')

const errorCodeOf = (error: unknown) => {
  if (error instanceof BizException) return error.code
  const status = (error as any)?.response?.status
  return typeof status === 'number' ? status : undefined
}

const getResultClass = (result: number) => {
  const classes: Record<number, string> = {
    1: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    2: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    3: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }
  return classes[result] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
}

const getResultText = (result: number) => {
  const texts: Record<number, string> = {
    1: '已 offer',
    2: '待结果',
    3: '已挂',
  }
  return texts[result] || '未知结果'
}

const handleLike = async () => {
  if (!post.value || isTogglingLike.value) return
  isTogglingLike.value = true
  const liked = Boolean(post.value.myInteraction?.liked)
  try {
    if (liked) {
      await interactionApi.unlike(post.value.postId)
    } else {
      await interactionApi.like(post.value.postId)
    }
    post.value.myInteraction = { ...(post.value.myInteraction ?? { favorited: false }), liked: !liked }
    post.value.counter.like = Math.max(0, post.value.counter.like + (liked ? -1 : 1))
  } catch (error: any) {
    toast.error(getErrorMessage(error, '点赞操作失败'))
  } finally {
    isTogglingLike.value = false
  }
}

const handleFavorite = async () => {
  if (!post.value || isTogglingFavorite.value) return
  isTogglingFavorite.value = true
  const favorited = Boolean(post.value.myInteraction?.favorited)
  try {
    if (favorited) {
      await interactionApi.unfavorite(post.value.postId)
    } else {
      await interactionApi.favorite(post.value.postId)
    }
    post.value.myInteraction = { ...(post.value.myInteraction ?? { liked: false }), favorited: !favorited }
    post.value.counter.favorite = Math.max(0, post.value.counter.favorite + (favorited ? -1 : 1))
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏操作失败'))
  } finally {
    isTogglingFavorite.value = false
  }
}

const toggleFollowAuthor = async () => {
  if (!post.value) return
  if (!requireLogin()) return
  isFollowingAuthor.value = true
  try {
    if (post.value.author.isFollowing) {
      await userApi.unfollow(post.value.author.uid)
      post.value.author.isFollowing = false
      toast.success('已取消关注')
    } else {
      await userApi.follow(post.value.author.uid)
      post.value.author.isFollowing = true
      toast.success('已关注')
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    isFollowingAuthor.value = false
  }
}

const handleDeletePost = async () => {
  if (!post.value || !isOwnPost.value || isDeletingPost.value) return
  const confirmed = window.confirm('确定删除这篇帖子吗？删除后不可恢复。')
  if (!confirmed) return

  isDeletingPost.value = true
  try {
    await postApi.delete(post.value.postId)
    toast.success('帖子已删除')
    router.push('/')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '删除帖子失败'))
  } finally {
    isDeletingPost.value = false
  }
}

const findComment = (commentId: Comment['commentId']) => {
  for (const comment of comments.value) {
    if (String(comment.commentId) === String(commentId)) return comment
    const reply = comment.replies?.find((item) => String(item.commentId) === String(commentId))
    if (reply) return reply
  }
  return undefined
}

const countCommentBranch = (comment: Comment): number => 1 + (comment.replies?.length ?? 0)

const handleLikeComment = async (commentId: Comment['commentId']) => {
  if (!requireLogin()) {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
    return
  }
  const comment = findComment(commentId)
  try {
    await interactionApi.likeComment(commentId)
    if (comment) {
      comment.myLiked = true
      comment.likeCount += 1
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论点赞失败'))
    await loadComments(true)
  } finally {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
  }
}

const handleUnlikeComment = async (commentId: Comment['commentId']) => {
  if (!requireLogin()) {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
    return
  }
  const comment = findComment(commentId)
  try {
    await interactionApi.unlikeComment(commentId)
    if (comment) {
      comment.myLiked = false
      comment.likeCount = Math.max(0, comment.likeCount - 1)
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '取消点赞失败'))
    await loadComments(true)
  } finally {
    commentTreeRef.value?.markCommentLikeSettled(commentId)
  }
}

const handleSubmitComment = async () => {
  if (!post.value || !commentText.value.trim()) return
  if (!requireLogin()) return
  isSubmittingComment.value = true
  try {
    const res = await interactionApi.comment(postId.value, commentText.value)
    commentText.value = ''
    if (res.data?.reviewRequired) {
      toast.success('评论已提交审核')
    } else {
      post.value.counter.comment += 1
      toast.success('评论成功')
      await loadComments()
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '评论失败'))
  } finally {
    isSubmittingComment.value = false
  }
}

const handleReplyComment = async (payload: { parentId: Comment['commentId']; replyToUid: Comment['author']['uid']; content: string }) => {
  if (!post.value) return
  if (!requireLogin()) return
  try {
    const res = await interactionApi.comment(postId.value, payload.content, payload.parentId, payload.replyToUid)
    if (res.data?.reviewRequired) {
      toast.success('回复已提交审核')
    } else {
      post.value.counter.comment += 1
      toast.success('回复成功')
      await loadComments(true)
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '回复失败'))
  }
}

const handleDeleteComment = async (commentId: Comment['commentId']) => {
  if (!post.value) return
  const target = findComment(commentId)
  try {
    await interactionApi.deleteComment(commentId)
    const removed = target ? countCommentBranch(target) : 1
    post.value.counter.comment = Math.max(0, post.value.counter.comment - removed)
    toast.success('评论已删除')
    await loadComments(true)
  } catch (error: any) {
    toast.error(getErrorMessage(error, '删除评论失败'))
  }
}

const closeReportDialog = () => {
  if (isReporting.value) return
  isReportDialogOpen.value = false
  reportForm.value = { reason: 'OTHER', detail: '' }
  reportTarget.value = { type: 'post' }
}

const openPostReportDialog = () => {
  if (!requireLogin()) return
  reportTarget.value = { type: 'post' }
  isReportDialogOpen.value = true
}

const openCommentReportDialog = (commentId: Comment['commentId']) => {
  if (!requireLogin()) return
  reportTarget.value = { type: 'comment', id: commentId }
  isReportDialogOpen.value = true
}

const submitReport = async () => {
  isReporting.value = true
  try {
    const payload = {
      reason: reportForm.value.reason,
      detail: reportForm.value.detail || undefined,
    }
    if (reportTarget.value.type === 'comment' && reportTarget.value.id) {
      await interactionApi.reportComment(reportTarget.value.id, payload)
    } else {
      await postApi.report(postId.value, payload)
    }
    toast.success('举报已提交，等待管理员处理')
    isReportDialogOpen.value = false
    reportForm.value = { reason: 'OTHER', detail: '' }
    reportTarget.value = { type: 'post' }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '举报提交失败'))
  } finally {
    isReporting.value = false
  }
}

const loadComments = async (reset = true) => {
  if (reset) {
    isLoadingComments.value = true
    commentCursor.value = undefined
    commentsErrorMessage.value = ''
  } else {
    isLoadingMoreComments.value = true
  }
  try {
    const result = await interactionApi.getComments(postId.value, reset ? undefined : commentCursor.value)
    const page = result.data
    comments.value = reset ? page?.items || [] : [...comments.value, ...(page?.items || [])]
    commentCursor.value = page?.nextCursor
    hasMoreComments.value = Boolean(page?.hasMore)
    commentsErrorMessage.value = ''
  } catch (error) {
    const message = getErrorMessage(error, reset ? '评论加载失败' : '加载更多评论失败')
    if (reset) {
      comments.value = []
      hasMoreComments.value = false
      commentsErrorMessage.value = errorCodeOf(error) === 10403 || errorCodeOf(error) === 403
        ? '无权访问评论，内容不可见。'
        : message
    } else {
      toast.error(message)
    }
  } finally {
    isLoadingComments.value = false
    isLoadingMoreComments.value = false
  }
}

const loadMoreComments = () => loadComments(false)

const loadRelatedPosts = async () => {
  const current = post.value
  if (!current?.tags.length) {
    relatedPosts.value = []
    return
  }
  try {
    const result = await postApi.list({ tagId: current.tags[0].id, size: 5 })
    relatedPosts.value = (result.data?.items || [])
      .filter((item) => String(item.postId) !== String(current.postId))
      .slice(0, 4)
  } catch {
    relatedPosts.value = []
  }
}

const loadInteractionState = async () => {
  if (!post.value || !authStore.isLoggedIn) return
  try {
    const result = await interactionApi.getPostInteraction(post.value.postId)
    if (result.data) {
      post.value.myInteraction = {
        liked: Boolean(result.data.liked),
        favorited: Boolean(result.data.favorited),
      }
    }
  } catch {
    // 互动状态不影响详情正文展示。
  }
}

const loadAdminPermissions = async () => {
  if (!authStore.token) {
    adminPermissions.value = null
    return
  }
  try {
    const res = await opsApi.myPermissions({ skipAuthRedirect: true })
    adminPermissions.value = res.code === 0 ? res.data : null
  } catch {
    adminPermissions.value = null
  }
}

const loadVersionHistory = async () => {
  if (!post.value || !canViewVersionHistory.value) return
  isLoadingVersions.value = true
  try {
    const res = await postApi.listVersions(post.value.postId, 12)
    versionHistories.value = res.data || []
    versionLoadAttempted.value = true
  } catch (error: any) {
    toast.error(getErrorMessage(error, '版本历史加载失败'))
  } finally {
    isLoadingVersions.value = false
  }
}

const openVersionHistory = async () => {
  if (!canViewVersionHistory.value) return
  isVersionDialogOpen.value = true
  if (!versionLoadAttempted.value) {
    await loadVersionHistory()
  }
}

const closeVersionHistory = () => {
  if (isLoadingVersions.value) return
  isVersionDialogOpen.value = false
}

const changeSummaryText = (summary?: string) => {
  if (!summary) return '内容更新'
  const labels: Record<string, string> = {
    title: '标题',
    content: '正文',
    coverUrl: '封面',
    visibility: '可见性',
    extension: '扩展信息',
    tags: '标签',
  }
  const values = summary.split(',').map((item) => labels[item] || item).filter(Boolean)
  return values.length ? values.join(' / ') : '内容更新'
}

watch(() => postData.value?.data, (value) => {
  post.value = clonePost(value)
}, { immediate: true })

watch(post, () => {
  loadRelatedPosts()
  loadInteractionState()
})

watch(postId, () => {
  loadComments(true)
  versionHistories.value = []
  versionLoadAttempted.value = false
})

onMounted(() => {
  loadAdminPermissions()
  loadComments(true)
})

watch(() => authStore.token, () => {
  loadAdminPermissions()
})

watch(canViewVersionHistory, (allowed) => {
  if (!allowed) isVersionDialogOpen.value = false
})
</script>

<style scoped>
.meta-pill {
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  color: rgb(51 65 85);
}

:global(.dark) .meta-pill {
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.version-dialog {
  max-height: min(82vh, 760px);
  overflow: hidden;
}

.version-list {
  max-height: min(58vh, 520px);
  overflow-y: auto;
  padding-right: 0.25rem;
}

.version-item {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.75rem;
  padding: 1rem;
  background: rgb(248 250 252);
}

.version-item + .version-item {
  margin-top: 0.75rem;
}

:global(.dark) .version-item {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}
</style>
