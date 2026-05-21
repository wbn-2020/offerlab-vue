<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="max-w-7xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Content (720px) -->
        <div class="lg:col-span-2">
          <template v-if="isLoading">
            <LoadingSkeleton />
          </template>
          <template v-else-if="post">
            <!-- Author Card -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold">
                    {{ post.author.nickname[0] }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname }}</h3>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(post.createdAt) }}</p>
                  </div>
                </div>
                <button
                  v-if="!isOwnPost"
                  class="px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
                >
                  {{ post.author.isFollowing ? '已关注' : '关注' }}
                </button>
              </div>
            </div>

            <!-- Post Content -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 mb-6">
              <!-- Title -->
              <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">{{ post.title }}</h1>

              <!-- Meta Info -->
              <div v-if="post.extension" class="flex flex-wrap gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div v-if="post.extension.company" class="flex items-center gap-2">
                  <span class="text-sm text-slate-600 dark:text-slate-400">公司：</span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">{{ post.extension.company }}</span>
                </div>
                <div v-if="post.extension.position" class="flex items-center gap-2">
                  <span class="text-sm text-slate-600 dark:text-slate-400">岗位：</span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">{{ post.extension.position }}</span>
                </div>
                <div v-if="post.extension.yearsOfExp" class="flex items-center gap-2">
                  <span class="text-sm text-slate-600 dark:text-slate-400">年限：</span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">{{ post.extension.yearsOfExp }} 年</span>
                </div>
                <div v-if="post.extension.interviewResult" class="flex items-center gap-2">
                  <span class="text-sm text-slate-600 dark:text-slate-400">结果：</span>
                  <span :class="getResultClass(post.extension.interviewResult)" class="px-2 py-1 rounded text-xs font-medium">
                    {{ getResultText(post.extension.interviewResult) }}
                  </span>
                </div>
              </div>

              <!-- Markdown Content -->
              <div class="prose dark:prose-invert max-w-none mb-8">
                <MarkdownRenderer :content="post.content" />
              </div>

              <!-- Tags -->
              <div v-if="post.tags.length > 0" class="flex flex-wrap gap-2 mb-8 pb-8 border-b border-slate-200 dark:border-slate-800">
                <span
                  v-for="tag in post.tags"
                  :key="tag.id"
                  class="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm hover:bg-primary-100 dark:hover:bg-primary-900 hover:text-primary-600 transition-colors cursor-pointer"
                >
                  {{ tag.name }}
                </span>
              </div>

              <!-- Interaction Bar -->
              <InteractionBar :post="post" @like="handleLike" @favorite="handleFavorite" />
            </div>

            <!-- Comments Section -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
              <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">评论 ({{ post.counter.comment }})</h2>

              <!-- Comment Input -->
              <div v-if="authStore.isLoggedIn" class="mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <textarea
                  v-model="commentText"
                  placeholder="分享你的想法..."
                  class="w-full px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-slate-100 resize-none"
                  rows="3"
                />
                <div class="flex justify-end gap-2 mt-3">
                  <button
                    @click="commentText = ''"
                    class="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    @click="handleSubmitComment"
                    :disabled="!commentText.trim() || isSubmittingComment"
                    class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isSubmittingComment ? '发送中...' : '发送' }}
                  </button>
                </div>
              </div>

              <!-- Comments List -->
              <CommentTree
                :post-id="postId"
                :comments="comments"
                :can-like-comments="authStore.isLoggedIn"
                @like-comment="handleLikeComment"
              />
            </div>
          </template>
          <template v-else>
            <EmptyState title="帖子不存在" description="该帖子可能已被删除或不存在" actionText="返回首页" actionHref="/" />
          </template>
        </div>

        <!-- Right Sidebar (280px) -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-6">
            <!-- Author Info Card -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-4">作者信息</h3>
              <div class="flex flex-col items-center text-center">
                <div class="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold mb-3">
                  {{ post?.author.nickname[0] }}
                </div>
                <h4 class="font-semibold text-slate-900 dark:text-slate-100">{{ post?.author.nickname }}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ post?.author.signature || '这个人很懒' }}</p>
                <button class="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                  关注
                </button>
              </div>
            </div>

            <!-- AI Interview Button -->
            <button class="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all font-semibold shadow-lg hover:shadow-xl">
              🤖 用 AI 模拟此面试
            </button>

            <!-- Related Posts -->
            <div class="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <h3 class="font-bold text-slate-900 dark:text-slate-100 mb-4">相关帖子</h3>
              <div class="space-y-3">
                <button v-for="i in 3" :key="i" class="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <div class="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">相关帖子 {{ i }}</div>
                  <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ Math.random() * 1000 | 0 }} 次浏览</div>
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { postApi } from '@/api/post'
import { interactionApi } from '@/api/interaction'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/layout/AppHeader.vue'
import MarkdownRenderer from '@/components/post/MarkdownRenderer.vue'
import InteractionBar from '@/components/post/InteractionBar.vue'
import CommentTree from '@/components/post/CommentTree.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { formatTime } from '@/lib/format'
import { toast } from 'vue-sonner'
import type { Post, Comment } from '@/api/types'

const route = useRoute()
const authStore = useAuthStore()

const postId = computed(() => route.params.id as string)
const commentText = ref('')
const isSubmittingComment = ref(false)
const comments = ref<Comment[]>([])

// Fetch post detail
const { data: postData, isLoading } = useQuery({
  queryKey: ['post', postId],
  queryFn: () => postApi.getDetail(postId.value),
  enabled: computed(() => Boolean(postId.value)),
})

const post = computed(() => postData.value?.data)

const isOwnPost = computed(() => authStore.user?.uid === post.value?.author.uid)

const getResultClass = (result: number) => {
  const classes: Record<number, string> = {
    1: 'bg-success/10 text-success',
    2: 'bg-warning/10 text-warning',
    3: 'bg-danger/10 text-danger',
  }
  return classes[result] || 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
}

const getResultText = (result: number) => {
  const texts: Record<number, string> = {
    1: '已 offer',
    2: '待结果',
    3: '已挂',
  }
  return texts[result] || '未知'
}

const handleLike = async () => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  toast.success('操作已提交')
}

const handleFavorite = async () => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  toast.success('操作已提交')
}

const handleLikeComment = async (commentId: Comment['commentId']) => {
  if (!authStore.isLoggedIn) {
    toast.error('请先登录')
    return
  }
  try {
    await interactionApi.likeComment(commentId)
    toast.success('评论已点赞')
    await loadComments()
  } catch (error: any) {
    toast.error(error?.message || '评论点赞失败')
  }
}

const handleSubmitComment = async () => {
  if (!commentText.value.trim()) return

  isSubmittingComment.value = true
  try {
    await interactionApi.comment(postId.value, commentText.value)
    commentText.value = ''
    toast.success('评论成功')
    // Reload comments
    await loadComments()
  } catch (error: any) {
    toast.error(error?.message || '评论失败')
  } finally {
    isSubmittingComment.value = false
  }
}

const loadComments = async () => {
  try {
    const result = await interactionApi.getComments(postId.value)
    comments.value = result.data?.items || []
  } catch (error) {
    console.error('Failed to load comments:', error)
  }
}

onMounted(() => {
  loadComments()
})
</script>
