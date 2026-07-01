<template>
  <div class="space-y-5">
    <template v-if="comments.length">
      <article
        v-for="comment in comments"
        :key="comment.commentId"
        class="border-l-2 border-slate-200 pl-4 dark:border-slate-800"
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
              <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatTime(comment.createdAt) }}</span>
            </div>

            <p class="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{{ comment.content }}</p>

            <div class="mt-2 flex flex-wrap items-center gap-4">
              <button type="button" class="comment-action" @click="startReply(comment)">
                <MessageCircle class="h-3.5 w-3.5" />
                {{ replyActionLabel }}
              </button>
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
import { defineComponent, h, ref } from 'vue'
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

.comment-action:hover {
  color: rgb(79 70 229);
}

.dark .comment-action {
  color: rgb(148 163 184);
}
</style>
