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

              <InteractionBar :post="post" @like="handleLike" @favorite="handleFavorite" />

              <div v-if="authStore.isLoggedIn" class="mt-4 flex justify-end gap-3">
                <template v-if="isOwnPost">
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
                <button
                  v-else
                  type="button"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  :disabled="isReporting"
                  @click="isReportDialogOpen = true"
                >
                  举报帖子
                </button>
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
              <CommentTree
                v-else
                :post-id="postId"
                :comments="comments"
                :can-like-comments="authStore.isLoggedIn"
                :can-report-comments="authStore.isLoggedIn"
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

          <EmptyState v-else title="帖子不存在" description="该帖子可能已被删除、下架或不可公开访问。" actionText="返回首页" actionHref="/" />
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
            placeholder="请描述需要审核的内容"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/layout/AppHeader.vue'
import MarkdownRenderer from '@/components/post/MarkdownRenderer.vue'
import InteractionBar from '@/components/post/InteractionBar.vue'
import CommentTree from '@/components/post/CommentTree.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatTime } from '@/lib/format'
import { toast } from 'vue-sonner'
import type { Comment, Post } from '@/api/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const postId = computed(() => route.params.id as string)
const commentText = ref('')
const isSubmittingComment = ref(false)
const isReporting = ref(false)
const isDeletingPost = ref(false)
const isReportDialogOpen = ref(false)
const isFollowingAuthor = ref(false)
const reportForm = ref({ reason: 'OTHER', detail: '' })
const reportTarget = ref<{ type: 'post' | 'comment'; id?: Comment['commentId'] }>({ type: 'post' })
const comments = ref<Comment[]>([])
const relatedPosts = ref<Post[]>([])
const commentCursor = ref<string | undefined>()
const hasMoreComments = ref(false)
const isLoadingComments = ref(false)
const isLoadingMoreComments = ref(false)

const { data: postData, isLoading } = useQuery({
  queryKey: computed(() => ['post', postId.value]),
  queryFn: () => postApi.getDetail(postId.value),
  enabled: computed(() => Boolean(postId.value)),
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
  if (!post.value) return
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
    toast.error(error?.message || '点赞操作失败')
  }
}

const handleFavorite = async () => {
  if (!post.value) return
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
    toast.error(error?.message || '收藏操作失败')
  }
}

const toggleFollowAuthor = async () => {
  if (!post.value) return
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
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
    toast.error(error?.message || '关注操作失败')
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
    toast.error(error?.message || '删除帖子失败')
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
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
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
    toast.error(error?.message || '评论点赞失败')
    await loadComments(true)
  }
}

const handleUnlikeComment = async (commentId: Comment['commentId']) => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
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
    toast.error(error?.message || '取消点赞失败')
    await loadComments(true)
  }
}

const handleSubmitComment = async () => {
  if (!post.value || !commentText.value.trim()) return
  isSubmittingComment.value = true
  try {
    await interactionApi.comment(postId.value, commentText.value)
    commentText.value = ''
    post.value.counter.comment += 1
    toast.success('评论成功')
    await loadComments()
  } catch (error: any) {
    toast.error(error?.message || '评论失败')
  } finally {
    isSubmittingComment.value = false
  }
}

const handleReplyComment = async (payload: { parentId: Comment['commentId']; replyToUid: Comment['author']['uid']; content: string }) => {
  if (!post.value) return
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  try {
    await interactionApi.comment(postId.value, payload.content, payload.parentId, payload.replyToUid)
    post.value.counter.comment += 1
    toast.success('回复成功')
    await loadComments(true)
  } catch (error: any) {
    toast.error(error?.message || '回复失败')
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
    toast.error(error?.message || '删除评论失败')
  }
}

const closeReportDialog = () => {
  if (isReporting.value) return
  isReportDialogOpen.value = false
  reportForm.value = { reason: 'OTHER', detail: '' }
  reportTarget.value = { type: 'post' }
}

const openCommentReportDialog = (commentId: Comment['commentId']) => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
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
    toast.error(error?.message || '举报提交失败')
  } finally {
    isReporting.value = false
  }
}

const loadComments = async (reset = true) => {
  if (reset) {
    isLoadingComments.value = true
    commentCursor.value = undefined
  } else {
    isLoadingMoreComments.value = true
  }
  try {
    const result = await interactionApi.getComments(postId.value, reset ? undefined : commentCursor.value)
    const page = result.data
    comments.value = reset ? page?.items || [] : [...comments.value, ...(page?.items || [])]
    commentCursor.value = page?.nextCursor
    hasMoreComments.value = Boolean(page?.hasMore)
  } catch (error) {
    console.error('Failed to load comments:', error)
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

watch(() => postData.value?.data, (value) => {
  post.value = clonePost(value)
}, { immediate: true })

watch(post, () => {
  loadRelatedPosts()
  loadInteractionState()
})

watch(postId, () => {
  loadComments(true)
})

onMounted(() => {
  loadComments(true)
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
</style>
