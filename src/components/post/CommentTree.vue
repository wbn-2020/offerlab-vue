<template>
  <div class="space-y-5">
    <section v-if="featuredComments.length" class="discussion-signal-panel" aria-label="评论互动信号">
      <div class="discussion-signal-head">
        <span>讨论现场</span>
        <p>来自后端评论质量字段，优先展示热门评论、作者回应和质量参考评论。</p>
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
            <span v-if="qualityComment(item.comment).helpfulCount">质量参考 {{ qualityComment(item.comment).helpfulCount }}</span>
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
        :class="commentBranchClasses(comment)"
      >
        <div v-if="isCollapsed(comment)" class="folded-comment-summary">
          <span class="comment-signal-pill comment-signal-folded">已折叠</span>
          <span>{{ foldedReasonText(comment) }}</span>
          <button type="button" class="comment-action" @click="expandFoldedComment(comment.commentId)">
            <Eye class="h-3.5 w-3.5" />
            展开查看
          </button>
        </div>
        <div class="flex gap-3">
          <template v-if="!isCollapsed(comment)">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-600 text-xs font-bold text-white">
            <img v-if="comment.author.avatar" :src="comment.author.avatar" :alt="comment.author.nickname" class="h-full w-full object-cover" />
            <span v-else>{{ initial(comment.author.nickname) }}</span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink :to="`/u/${comment.author.uid}`" class="text-sm font-semibold text-slate-900 hover:text-primary-600 dark:text-slate-100">
                {{ comment.author.nickname || '未知用户' }}
              </RouterLink>
              <span
                v-for="badge in qualityBadgesFor(comment)"
                :key="badge.key"
                :class="['comment-signal-pill', badge.className]"
              >
                {{ badge.label }}
              </span>
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
                v-if="canMarkHelpfulComments"
                type="button"
                class="comment-action hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="helpfulActionText(comment)"
                :aria-busy="isQualityActionBusy(comment.commentId)"
                :disabled="isQualityActionBusy(comment.commentId)"
                @click="toggleHelpful(comment)"
              >
                <BadgeCheck class="h-3.5 w-3.5" :class="qualityComment(comment).myHelpful ? 'fill-current text-emerald-600' : ''" />
                {{ helpfulActionText(comment) }}
              </button>
              <button
                v-if="canManageQualitySignals"
                type="button"
                class="comment-action hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="pinActionText(comment)"
                :aria-busy="isQualityActionBusy(comment.commentId)"
                :disabled="isQualityActionBusy(comment.commentId)"
                @click="togglePinned(comment)"
              >
                <Pin class="h-3.5 w-3.5" />
                {{ pinActionText(comment) }}
              </button>
              <button
                v-if="canManageQualitySignals"
                type="button"
                class="comment-action hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                :aria-label="featureActionText(comment)"
                :aria-busy="isQualityActionBusy(comment.commentId)"
                :disabled="isQualityActionBusy(comment.commentId)"
                @click="toggleFeatured(comment)"
              >
                <Star class="h-3.5 w-3.5" />
                {{ featureActionText(comment) }}
              </button>
              <button
                v-if="canModerateComments"
                type="button"
                class="comment-action hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-100"
                :aria-label="foldActionText(comment)"
                :aria-busy="isQualityActionBusy(comment.commentId)"
                :disabled="isQualityActionBusy(comment.commentId)"
                @click="toggleFolded(comment)"
              >
                <EyeOff v-if="!qualityComment(comment).folded" class="h-3.5 w-3.5" />
                <Eye v-else class="h-3.5 w-3.5" />
                {{ foldActionText(comment) }}
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
                <div v-if="isCollapsed(reply)" class="folded-comment-summary folded-comment-summary-reply">
                  <span class="comment-signal-pill comment-signal-folded">已折叠</span>
                  <span>{{ foldedReasonText(reply) }}</span>
                  <button type="button" class="comment-action" @click="expandFoldedComment(reply.commentId)">
                    <Eye class="h-3.5 w-3.5" />
                    展开查看
                  </button>
                </div>
                <div class="flex items-start gap-3">
                  <template v-if="!isCollapsed(reply)">
                  <div class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-xs font-bold text-white dark:bg-slate-600">
                    <img v-if="reply.author.avatar" :src="reply.author.avatar" :alt="reply.author.nickname" class="h-full w-full object-cover" />
                    <span v-else>{{ initial(reply.author.nickname) }}</span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <RouterLink :to="`/u/${reply.author.uid}`" class="text-xs font-semibold text-slate-900 hover:text-primary-600 dark:text-slate-100">
                        {{ reply.author.nickname || '未知用户' }}
                      </RouterLink>
                      <span
                        v-for="badge in qualityBadgesFor(reply)"
                        :key="badge.key"
                        :class="['comment-signal-pill', badge.className]"
                      >
                        {{ badge.label }}
                      </span>
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
                        v-if="canMarkHelpfulComments"
                        type="button"
                        class="comment-action hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                        :aria-label="helpfulActionText(reply)"
                        :aria-busy="isQualityActionBusy(reply.commentId)"
                        :disabled="isQualityActionBusy(reply.commentId)"
                        @click="toggleHelpful(reply)"
                      >
                        <BadgeCheck class="h-3.5 w-3.5" :class="qualityComment(reply).myHelpful ? 'fill-current text-emerald-600' : ''" />
                        {{ helpfulActionText(reply) }}
                      </button>
                      <button
                        v-if="canManageQualitySignals"
                        type="button"
                        class="comment-action hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                        :aria-label="pinActionText(reply)"
                        :aria-busy="isQualityActionBusy(reply.commentId)"
                        :disabled="isQualityActionBusy(reply.commentId)"
                        @click="togglePinned(reply)"
                      >
                        <Pin class="h-3.5 w-3.5" />
                        {{ pinActionText(reply) }}
                      </button>
                      <button
                        v-if="canManageQualitySignals"
                        type="button"
                        class="comment-action hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                        :aria-label="featureActionText(reply)"
                        :aria-busy="isQualityActionBusy(reply.commentId)"
                        :disabled="isQualityActionBusy(reply.commentId)"
                        @click="toggleFeatured(reply)"
                      >
                        <Star class="h-3.5 w-3.5" />
                        {{ featureActionText(reply) }}
                      </button>
                      <button
                        v-if="canModerateComments"
                        type="button"
                        class="comment-action hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-slate-100"
                        :aria-label="foldActionText(reply)"
                        :aria-busy="isQualityActionBusy(reply.commentId)"
                        :disabled="isQualityActionBusy(reply.commentId)"
                        @click="toggleFolded(reply)"
                      >
                        <EyeOff v-if="!qualityComment(reply).folded" class="h-3.5 w-3.5" />
                        <Eye v-else class="h-3.5 w-3.5" />
                        {{ foldActionText(reply) }}
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
                  </template>
                </div>
              </div>
            </div>
            <button
              v-if="comment.hasMoreReplies"
              type="button"
              class="comment-action mt-3 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isReplyPageLoading(comment.commentId)"
              @click="$emit('load-more-replies', comment.commentId)"
            >
              <MessageCircle class="h-3.5 w-3.5" />
              {{ isReplyPageLoading(comment.commentId) ? '加载中...' : '加载更多回复' }}
            </button>
          </div>
          </template>
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
import { BadgeCheck, Eye, EyeOff, Flag, MessageCircle, Pin, Star, ThumbsUp, Trash2 } from 'lucide-vue-next'
import type { Comment } from '@/api/types'
import { formatTime } from '@/lib/format'

type CommentQualityAction = 'helpful' | 'unhelpful' | 'pin' | 'unpin' | 'feature' | 'unfeature' | 'fold' | 'unfold'
type QualityComment = Comment & {
  authorReply?: boolean
  authorPinned?: boolean
  featured?: boolean
  helpfulCount?: number
  myHelpful?: boolean
  hotScore?: number
  folded?: boolean
  foldReason?: string
  qualityBadges?: string[]
}
type QualityBadge = {
  key: string
  label: string
  className: string
}

const props = withDefaults(defineProps<{
  postId: Comment['postId']
  comments: Comment[]
  canLikeComments?: boolean
  canReportComments?: boolean
  canReplyComments?: boolean
  canMarkHelpfulComments?: boolean
  canManageQualitySignals?: boolean
  canModerateComments?: boolean
  postAuthorUid?: string | number
  loadingReplyRootIds?: Array<string | number>
  emptyText?: string
  replyActionLabel?: string
  replyPlaceholder?: string
  replySubmitLabel?: string
}>(), {
  canLikeComments: false,
  canReportComments: false,
  canReplyComments: false,
  canMarkHelpfulComments: false,
  canManageQualitySignals: false,
  canModerateComments: false,
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
  'helpful-comment': [commentId: Comment['commentId']]
  'unhelpful-comment': [commentId: Comment['commentId']]
  'pin-comment': [commentId: Comment['commentId']]
  'unpin-comment': [commentId: Comment['commentId']]
  'feature-comment': [commentId: Comment['commentId']]
  'unfeature-comment': [commentId: Comment['commentId']]
  'fold-comment': [commentId: Comment['commentId']]
  'unfold-comment': [commentId: Comment['commentId']]
  'reply-comment': [payload: { parentId: Comment['commentId']; replyToUid: Comment['author']['uid']; content: string }]
  'load-more-replies': [rootId: Comment['commentId']]
  'delete-comment': [commentId: Comment['commentId']]
  'report-comment': [commentId: Comment['commentId']]
}>()

const replyingTo = ref<Comment | null>(null)
const pendingCommentLikes = ref(new Set<string>())
const pendingQualityActions = ref(new Set<string>())
const expandedFoldedComments = ref(new Set<string>())

const initial = (name?: string) => name?.charAt(0) || '?'
const qualityComment = (comment: Comment) => comment as QualityComment
const branchReplyCount = (comment: Comment) => Math.max(Number(comment.replyCount ?? 0), comment.replies?.length ?? 0)
const canMatchAuthorUid = (comment: Comment) => {
  const postAuthorUid = String(props.postAuthorUid ?? '').trim()
  const commentAuthorUid = String(comment.author?.uid ?? '').trim()
  return Boolean(postAuthorUid)
    && postAuthorUid !== '0'
    && Boolean(commentAuthorUid)
    && commentAuthorUid !== '0'
    && postAuthorUid === commentAuthorUid
}
const commentsWithReplies = computed(() => props.comments.flatMap((comment) => [
  comment,
  ...(comment.replies || []),
]))
const helpfulCount = (comment: Comment) => Number(qualityComment(comment).helpfulCount ?? 0)
const isAuthorReply = (comment: Comment) => Boolean(qualityComment(comment).authorReply) && canMatchAuthorUid(comment)
const isPinned = (comment: Comment) => Boolean(qualityComment(comment).authorPinned)
const isFeatured = (comment: Comment) => Boolean(qualityComment(comment).featured)
const isFolded = (comment: Comment) => Boolean(qualityComment(comment).folded)
const isHotComment = (comment: Comment) => Number(qualityComment(comment).hotScore ?? 0) > 0
const qualityScore = (comment: Comment) => {
  const quality = qualityComment(comment)
  return Number(quality.hotScore ?? 0)
    + (isPinned(comment) ? 1000 : 0)
    + (isFeatured(comment) ? 500 : 0)
    + (isAuthorReply(comment) ? 200 : 0)
    + helpfulCount(comment) * 20
}
const featuredComments = computed(() => commentsWithReplies.value
  .filter((comment) => !isFolded(comment) && (isHotComment(comment) || isPinned(comment) || isFeatured(comment) || isAuthorReply(comment) || helpfulCount(comment) > 0))
  .sort((a, b) => qualityScore(b) - qualityScore(a))
  .slice(0, 3)
  .map((comment) => ({
    comment,
    badge: primaryQualityBadge(comment),
  })))
const primaryQualityBadge = (comment: Comment) => {
  if (isHotComment(comment)) return '热门评论'
  if (isPinned(comment)) return '作者置顶'
  if (isFeatured(comment)) return '精选回复'
  if (isAuthorReply(comment)) return '作者回应'
  if (helpfulCount(comment) > 0) return '质量参考'
  return '质量回应'
}
const qualityBadgesFor = (comment: Comment): QualityBadge[] => {
  const badges: QualityBadge[] = []
  if (isHotComment(comment)) badges.push({ key: 'hot', label: '热门评论', className: 'comment-signal-hot' })
  if (isAuthorReply(comment)) badges.push({ key: 'authorReply', label: '作者回应', className: 'comment-signal-author' })
  if (isPinned(comment)) badges.push({ key: 'authorPinned', label: '作者置顶', className: 'comment-signal-pinned' })
  if (isFeatured(comment)) badges.push({ key: 'featured', label: '精选回复', className: 'comment-signal-featured' })
  if (helpfulCount(comment) > 0) badges.push({ key: 'helpful', label: `质量参考 ${helpfulCount(comment)}`, className: 'comment-signal-helpful' })
  if (isFolded(comment)) badges.push({ key: 'folded', label: '已折叠', className: 'comment-signal-folded' })
  return badges
}
const foldedKey = (commentId: Comment['commentId']) => String(commentId)
const isCollapsed = (comment: Comment) => isFolded(comment) && !expandedFoldedComments.value.has(foldedKey(comment.commentId))
const expandFoldedComment = (commentId: Comment['commentId']) => {
  expandedFoldedComments.value = new Set([...expandedFoldedComments.value, foldedKey(commentId)])
}
const foldedReasonText = (comment: Comment) => qualityComment(comment).foldReason || '该评论已被折叠'
const commentBranchClasses = (comment: Comment) => [
  'comment-branch',
  isPinned(comment) ? 'comment-branch-pinned' : '',
  isFeatured(comment) ? 'comment-branch-featured' : '',
  isAuthorReply(comment) ? 'comment-branch-author' : '',
  isFolded(comment) ? 'comment-branch-folded' : '',
]
const helpfulAction = (comment: Comment): CommentQualityAction => qualityComment(comment).myHelpful ? 'unhelpful' : 'helpful'
const pinAction = (comment: Comment): CommentQualityAction => qualityComment(comment).authorPinned ? 'unpin' : 'pin'
const featureAction = (comment: Comment): CommentQualityAction => qualityComment(comment).featured ? 'unfeature' : 'feature'
const foldAction = (comment: Comment): CommentQualityAction => qualityComment(comment).folded ? 'unfold' : 'fold'
const helpfulActionText = (comment: Comment) => {
  const count = helpfulCount(comment)
  if (qualityComment(comment).myHelpful) return count > 0 ? `取消质量参考 ${count}` : '取消质量参考'
  return count > 0 ? `质量参考 ${count}` : '质量参考'
}
const pinActionText = (comment: Comment) => qualityComment(comment).authorPinned ? '取消置顶' : '置顶'
const featureActionText = (comment: Comment) => qualityComment(comment).featured ? '取消精选' : '设为精选'
const foldActionText = (comment: Comment) => qualityComment(comment).folded ? '取消折叠' : '折叠'
const replyPlaceholderFor = (comment: Comment) => (
  props.replyPlaceholder === '写下回复...'
    ? `回复 ${comment.author.nickname || '这条评论'}`
    : `${props.replyPlaceholder} · ${comment.author.nickname || '这条评论'}`
)
const commentLikeKey = (commentId: Comment['commentId']) => String(commentId)
const isCommentLikePending = (commentId: Comment['commentId']) => pendingCommentLikes.value.has(commentLikeKey(commentId))
const isReplyPageLoading = (commentId: Comment['commentId']) => (
  (props.loadingReplyRootIds || []).map(String).includes(String(commentId))
)
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
const qualityActionKey = (commentId: Comment['commentId'], action: CommentQualityAction) => `${action}:${String(commentId)}`
const isQualityActionBusy = (commentId: Comment['commentId']) => {
  const suffix = `:${String(commentId)}`
  return [...pendingQualityActions.value].some((key) => key.endsWith(suffix))
}
const startQualityAction = (comment: Comment, action: CommentQualityAction) => {
  if (isQualityActionBusy(comment.commentId)) return false
  pendingQualityActions.value = new Set([...pendingQualityActions.value, qualityActionKey(comment.commentId, action)])
  return true
}
const finishQualityAction = (commentId: Comment['commentId'], action: CommentQualityAction) => {
  const next = new Set(pendingQualityActions.value)
  next.delete(qualityActionKey(commentId, action))
  pendingQualityActions.value = next
}
const toggleHelpful = (comment: Comment) => {
  if (!props.canMarkHelpfulComments) {
    emit('require-login')
    return
  }
  const action = helpfulAction(comment)
  if (!startQualityAction(comment, action)) return
  if (action === 'helpful') {
    emit('helpful-comment', comment.commentId)
    return
  }
  emit('unhelpful-comment', comment.commentId)
}
const togglePinned = (comment: Comment) => {
  const action = pinAction(comment)
  if (!startQualityAction(comment, action)) return
  if (action === 'pin') {
    emit('pin-comment', comment.commentId)
    return
  }
  emit('unpin-comment', comment.commentId)
}
const toggleFeatured = (comment: Comment) => {
  const action = featureAction(comment)
  if (!startQualityAction(comment, action)) return
  if (action === 'feature') {
    emit('feature-comment', comment.commentId)
    return
  }
  emit('unfeature-comment', comment.commentId)
}
const toggleFolded = (comment: Comment) => {
  const action = foldAction(comment)
  if (!startQualityAction(comment, action)) return
  if (action === 'fold') {
    emit('fold-comment', comment.commentId)
    return
  }
  emit('unfold-comment', comment.commentId)
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

const markCommentQualitySettled = (commentId: Comment['commentId'], action: CommentQualityAction) => {
  finishQualityAction(commentId, action)
}

// Public like-pending contract: defineExpose({ markCommentLikeSettled })
defineExpose({ markCommentLikeSettled, markCommentQualitySettled })

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

.comment-branch-pinned {
  border-left-color: rgb(14 165 233);
}

.comment-branch-featured {
  border-left-color: rgb(139 92 246);
}

.comment-branch-folded {
  border-left-color: rgb(148 163 184);
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

.comment-signal-pinned {
  background: rgb(224 242 254);
  color: rgb(3 105 161);
}

.comment-signal-featured {
  background: rgb(237 233 254);
  color: rgb(109 40 217);
}

.comment-signal-helpful {
  background: rgb(220 252 231);
  color: rgb(21 128 61);
}

.comment-signal-folded {
  background: rgb(226 232 240);
  color: rgb(71 85 105);
}

.folded-comment-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.625rem;
  background: rgb(248 250 252);
  padding: 0.75rem 0.85rem;
  font-size: 0.8125rem;
  color: rgb(100 116 139);
}

.folded-comment-summary-reply {
  background: rgb(241 245 249);
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

.dark .comment-branch-pinned {
  border-left-color: rgb(56 189 248);
}

.dark .comment-branch-featured {
  border-left-color: rgb(167 139 250);
}

.dark .comment-branch-folded {
  border-left-color: rgb(100 116 139);
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

.dark .comment-signal-pinned {
  background: rgb(12 74 110 / 0.55);
  color: rgb(186 230 253);
}

.dark .comment-signal-featured {
  background: rgb(76 29 149 / 0.55);
  color: rgb(221 214 254);
}

.dark .comment-signal-helpful {
  background: rgb(20 83 45 / 0.55);
  color: rgb(187 247 208);
}

.dark .comment-signal-folded {
  background: rgb(51 65 85);
  color: rgb(203 213 225);
}

.dark .folded-comment-summary {
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .folded-comment-summary-reply {
  background: rgb(30 41 59);
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
