<template>
  <div class="space-y-5">
    <section v-if="featuredComments.length" class="discussion-signal-panel" aria-label="评论互动信号">
      <div class="discussion-signal-head">
        <span>讨论现场</span>
        <p>基于已有点赞数、回复数和作者回应突出展示，暂不提供质量标记或固定展示保存操作。</p>
      </div>
      <div class="discussion-signal-list">
        <article
          v-for="item in featuredComments"
          :key="`featured-${item.comment.commentId}`"
          class="discussion-signal-item"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="signal-badge">{{ item.badge }}</span>
            <strong>{{ item.comment.author.nickname || '未知用户' }}</strong>
          </div>
          <p>{{ item.comment.content }}</p>
          <div class="signal-metrics">
            <span>{{ item.comment.likeCount }} 赞</span>
            <span>回复 {{ branchReplyCount(item.comment) }}</span>
          </div>
        </article>
      </div>
    </section>

    <template v-if="comments.length">
      <article
        v-for="comment in comments"
        :key="comment.commentId"
        :class="['comment-branch', isAuthorComment(comment) ? 'comment-branch-author' : '', isHotComment(comment) ? 'comment-branch-hot' : '']"
      >
        <div class="flex gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xs font-bold text-white">
            <img v-if="comment.author.avatar" :src="comment.author.avatar" :alt="comment.author.nickname" class="h-full w-full object-cover" />
            <span v-else>{{ initial(comment.author.nickname) }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink :to="`/u/${comment.author.uid}`" class="text-sm font-semibold text-slate-900 hover:text-primary-600 dark:text-slate-100">
                {{ comment.author.nickname || '未知用户' }}
              </RouterLink>
              <span v-if="isAuthorComment(comment)" class="comment-signal-pill comment-signal-author">作者回应</span>
              <span v-if="isHotComment(comment)" class="comment-signal-pill comment-signal-hot">热门评论</span>
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(comment.createdAt) }}</span>
            </div>

            <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{{ comment.content }}</p>

            <div class="mt-2 flex flex-wrap items-center gap-4">
              <button type="button" class="comment-action" @click="startReply(comment)">
                <MessageCircle class="h-3.5 w-3.5" />
                {{ replyActionLabel }}
              </button>
              <span v-if="branchReplyCount(comment)" class="comment-action-static">
                <MessageCircle class="h-3.5 w-3.5" />
                回复 {{ branchReplyCount(comment) }}
              </span>
              <button
                type="button"
                class="comment-action hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="isCommentLikePending(comment.commentId) ? '评论点赞处理中' : comment.myLiked ? '取消点赞评论' : '点赞评论'"
                :aria-busy="isCommentLikePending(comment.commentId)"
                :disabled="isCommentLikePending(comment.commentId)"
                @click="toggleCommentLike(comment)"
              >
                <ThumbsUp class="h-3.5 w-3.5" :class="comment.myLiked ? 'fill-current text-rose-600' : ''" />
                {{ comment.likeCount }}
              </button>
              <button
                v-if="comment.canDelete"
                type="button"
                class="comment-action hover:text-rose-600"
                aria-label="删除评论"
                @click="$emit('delete-comment', comment.commentId)"
              >
                <Trash2 class="h-3.5 w-3.5" />
                删除
              </button>
              <button
                v-if="canReportComments"
                type="button"
                class="comment-action hover:text-amber-600"
                aria-label="举报评论"
                @click="$emit('report-comment', comment.commentId)"
              >
                <Flag class="h-3.5 w-3.5" />
                举报
              </button>
            </div>

            <ReplyComposer
              v-if="replyingTo?.commentId === comment.commentId"
              class="mt-3"
              :placeholder="replyPlaceholderFor(comment)"
              :submit-label="replySubmitLabel"
              @cancel="cancelReply"
              @submit="(content) => submitReply(comment, content)"
            />

            <div v-if="comment.replies?.length" class="mt-4 space-y-3">
              <div
                v-for="reply in comment.replies"
                :key="reply.commentId"
                class="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70"
              >
                <div class="flex items-start gap-3">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-xs font-bold text-white dark:bg-slate-600">
                    <img v-if="reply.author.avatar" :src="reply.author.avatar" :alt="reply.author.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ initial(reply.author.nickname) }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <RouterLink :to="`/u/${reply.author.uid}`" class="text-xs font-semibold text-slate-900 hover:text-primary-600 dark:text-slate-100">
                        {{ reply.author.nickname || '未知用户' }}
                      </RouterLink>
                      <span v-if="isAuthorComment(reply)" class="comment-signal-pill comment-signal-author">作者回应</span>
                      <span v-if="reply.replyToUser" class="text-xs text-slate-500 dark:text-slate-400">
                        回复 {{ reply.replyToUser.nickname || '用户' }}
                      </span>
                      <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(reply.createdAt) }}</span>
                    </div>
                    <p class="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-700 dark:text-slate-300">{{ reply.content }}</p>

                    <div class="mt-2 flex flex-wrap items-center gap-4">
                      <button type="button" class="comment-action" @click="startReply(reply)">
                        <MessageCircle class="h-3.5 w-3.5" />
                        {{ replyActionLabel }}
                      </button>
                      <button
                        type="button"
                        class="comment-action hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                        :aria-label="isCommentLikePending(reply.commentId) ? '评论点赞处理中' : reply.myLiked ? '取消点赞评论' : '点赞评论'"
                        :aria-busy="isCommentLikePending(reply.commentId)"
                        :disabled="isCommentLikePending(reply.commentId)"
                        @click="toggleCommentLike(reply)"
                      >
                        <ThumbsUp class="h-3.5 w-3.5" :class="reply.myLiked ? 'fill-current text-rose-600' : ''" />
                        {{ reply.likeCount }}
                      </button>
                      <button
                        v-if="reply.canDelete"
                        type="button"
                        class="comment-action hover:text-rose-600"
                        aria-label="删除评论"
                        @click="$emit('delete-comment', reply.commentId)"
                      >
                        <Trash2 class="h-3.5 w-3.5" />
                        删除
                      </button>
                      <button
                        v-if="canReportComments"
                        type="button"
                        class="comment-action hover:text-amber-600"
                        aria-label="举报评论"
                        @click="$emit('report-comment', reply.commentId)"
                      >
                        <Flag class="h-3.5 w-3.5" />
                        举报
                      </button>
                    </div>

                    <ReplyComposer
                      v-if="replyingTo?.commentId === reply.commentId"
                      class="mt-3"
                      :placeholder="replyPlaceholderFor(reply)"
                      :submit-label="replySubmitLabel"
                      @cancel="cancelReply"
                      @submit="(content) => submitReply(reply, content)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </template>

    <div v-else class="rounded-lg border border-dashed border-slate-300 py-10 text-center dark:border-slate-700">
      <p class="text-sm text-slate-500 dark:text-slate-400">{{ emptyText }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Flag, MessageCircle, ThumbsUp, Trash2 } from 'lucide-vue-next'
import type { Comment } from '@/api/types'
import { formatTime } from '@/lib/format'

const props = withDefaults(defineProps<{
  postId: Comment['postId']
  comments: Comment[]
  canLikeComments?: boolean
  canReportComments?: boolean
  canReplyComments?: boolean
  postAuthorUid?: string | number
  emptyText?: string
  replyActionLabel?: string
  replyPlaceholder?: string
  replySubmitLabel?: string
}>(), {
  canLikeComments: false,
  canReportComments: false,
  canReplyComments: false,
  emptyText: '还没有评论，来抢沙发吧',
  replyActionLabel: '回复',
  replyPlaceholder: '写下回复...',
  replySubmitLabel: '回复',
})

const emit = defineEmits<{
  'require-login': []
  'like-comment': [commentId: Comment['commentId']]
  'unlike-comment': [commentId: Comment['commentId']]
  'comment-like-settled': [commentId: Comment['commentId']]
  'reply-comment': [payload: { parentId: Comment['commentId']; replyToUid: Comment['author']['uid']; content: string }]
  'delete-comment': [commentId: Comment['commentId']]
  'report-comment': [commentId: Comment['commentId']]
}>()

const replyingTo = ref<Comment | null>(null)
const pendingCommentLikes = ref(new Set<string>())

const initial = (name?: string) => name?.charAt(0) || '?'
const userKey = (value?: string | number) => String(value ?? '')
const canMatchAuthorUid = computed(() => {
  const key = userKey(props.postAuthorUid)
  return key !== '' && key !== '0'
})
const branchReplyCount = (comment: Comment) => comment.replies?.length ?? 0
const isAuthorComment = (comment: Comment) => canMatchAuthorUid.value && userKey(comment.author.uid) === userKey(props.postAuthorUid)
const isHotComment = (comment: Comment) => comment.likeCount > 0 || branchReplyCount(comment) > 0
const commentSignalScore = (comment: Comment) => (comment.likeCount * 2) + branchReplyCount(comment) + (isAuthorComment(comment) ? 3 : 0)
const commentsWithReplies = computed(() => props.comments.flatMap((comment) => [
  comment,
  ...(comment.replies || []),
]))
const featuredComments = computed(() => commentsWithReplies.value
  .filter((comment) => isAuthorComment(comment) || isHotComment(comment))
  .sort((a, b) => commentSignalScore(b) - commentSignalScore(a))
  .slice(0, 2)
  .map((comment) => ({
    comment,
    badge: isAuthorComment(comment) ? '作者回应' : '热门评论',
  })))
const replyPlaceholderFor = (comment: Comment) => (
  props.replyPlaceholder === '写下回复...'
    ? `回复 ${comment.author.nickname || '这条评论'}`
    : `${props.replyPlaceholder} · ${comment.author.nickname || '这条评论'}`
)
const commentLikeKey = (commentId: Comment['commentId']) => String(commentId)
const isCommentLikePending = (commentId: Comment['commentId']) => pendingCommentLikes.value.has(commentLikeKey(commentId))
const startCommentLike = (commentId: Comment['commentId']) => {
  const key = commentLikeKey(commentId)
  if (pendingCommentLikes.value.has(key)) return false
  pendingCommentLikes.value = new Set([...pendingCommentLikes.value, key])
  return true
}
const finishCommentLike = (commentId: Comment['commentId']) => {
  const key = commentLikeKey(commentId)
  const next = new Set(pendingCommentLikes.value)
  next.delete(key)
  pendingCommentLikes.value = next
}

const startReply = (comment: Comment) => {
  if (!props.canReplyComments) {
    emit('require-login')
    return
  }
  replyingTo.value = comment
}

const cancelReply = () => {
  replyingTo.value = null
}

const toggleCommentLike = (comment: Comment) => {
  if (!props.canLikeComments) {
    emit('require-login')
    return
  }
  if (!startCommentLike(comment.commentId)) return
  if (comment.myLiked) {
    emit('unlike-comment', comment.commentId)
    return
  }
  emit('like-comment', comment.commentId)
}

const markCommentLikeSettled = (commentId: Comment['commentId']) => {
  finishCommentLike(commentId)
}

defineExpose({ markCommentLikeSettled })

const submitReply = (comment: Comment, content: string) => {
  emit('reply-comment', {
    parentId: comment.commentId,
    replyToUid: comment.author.uid,
    content,
  })
  replyingTo.value = null
}

const ReplyComposer = defineComponent({
  name: 'ReplyComposer',
  props: {
    placeholder: {
      type: String,
      default: '写下回复...',
    },
    submitLabel: {
      type: String,
      default: '回复',
    },
  },
  emits: ['submit', 'cancel'],
  setup(componentProps, { emit }) {
    const text = ref('')
    const submit = () => {
      const content = text.value.trim()
      if (!content) return
      emit('submit', content)
      text.value = ''
    }
    return () => h('div', { class: 'rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900' }, [
      h('textarea', {
        value: text.value,
        rows: 2,
        maxlength: 2000,
        placeholder: componentProps.placeholder,
        class: 'w-full resize-none rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
        onInput: (event: Event) => {
          text.value = (event.target as HTMLTextAreaElement).value
        },
      }),
      h('div', { class: 'mt-2 flex justify-end gap-2' }, [
        h('button', {
          type: 'button',
          class: 'rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
          onClick: () => emit('cancel'),
        }, '取消'),
        h('button', {
          type: 'button',
          disabled: !text.value.trim(),
          class: 'rounded-md bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50',
          onClick: submit,
        }, componentProps.submitLabel),
      ]),
    ])
  },
})

void props.postId
</script>

<style scoped>
.comment-action {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgb(100 116 139);
  transition: color 0.15s ease;
}

.comment-branch {
  border-left: 2px solid rgb(226 232 240);
  padding-left: 1rem;
}

.comment-branch-author {
  border-left-color: rgb(59 130 246);
}

.comment-branch-hot {
  border-left-color: rgb(251 146 60);
}

.comment-action-static {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.comment-signal-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 0.68rem;
  font-weight: 900;
}

.comment-signal-author {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.comment-signal-hot {
  background: rgb(255 237 213);
  color: rgb(194 65 12);
}

.discussion-signal-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.discussion-signal-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.discussion-signal-head span {
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.discussion-signal-head p {
  max-width: 30rem;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgb(100 116 139);
}

.discussion-signal-list {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.75rem;
}

.discussion-signal-item {
  border-radius: 0.625rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.85rem;
}

.discussion-signal-item strong {
  font-size: 0.8125rem;
  color: rgb(15 23 42);
}

.discussion-signal-item p {
  margin-top: 0.45rem;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: rgb(51 65 85);
}

.signal-badge {
  border-radius: 999px;
  background: rgb(238 242 255);
  padding: 0.18rem 0.5rem;
  font-size: 0.68rem;
  font-weight: 900;
  color: rgb(67 56 202);
}

.signal-metrics {
  margin-top: 0.55rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 0.72rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.comment-action:hover {
  color: rgb(79 70 229);
}

.dark .comment-action {
  color: rgb(148 163 184);
}

.dark .comment-branch {
  border-left-color: rgb(30 41 59);
}

.dark .comment-branch-author {
  border-left-color: rgb(96 165 250);
}

.dark .comment-branch-hot {
  border-left-color: rgb(251 146 60);
}

.dark .comment-action-static {
  color: rgb(148 163 184);
}

.dark .comment-signal-author {
  background: rgb(30 64 175 / 0.45);
  color: rgb(191 219 254);
}

.dark .comment-signal-hot {
  background: rgb(124 45 18 / 0.55);
  color: rgb(254 215 170);
}

.dark .discussion-signal-panel,
.dark .discussion-signal-item {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

.dark .discussion-signal-head span,
.dark .discussion-signal-item strong {
  color: rgb(248 250 252);
}

.dark .discussion-signal-head p,
.dark .discussion-signal-item p,
.dark .signal-metrics {
  color: rgb(203 213 225);
}

.dark .signal-badge {
  background: rgb(49 46 129 / 0.45);
  color: rgb(199 210 254);
}
</style>
