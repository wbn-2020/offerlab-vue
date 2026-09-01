<template>
  <article
    class="post-card group"
    role="link"
    tabindex="0"
    :aria-label="`查看帖子：${post.title}`"
    @click="handleCardClick"
    @keydown.enter.prevent="handleCardClick"
    @keydown.space.prevent="handleCardClick"
  >
    <div class="post-card__author-row">
      <div class="flex min-w-0 items-center gap-3">
        <UserAvatar
          class="post-author-avatar"
          :src="post.author.avatar"
          :name="post.author.nickname"
          alt=""
        />
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</span>
            <span v-if="post.author.isBigV" class="post-author-badge">大V</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{{ formatTime(post.createdAt) }}</span>
            <span class="content-type-pill">{{ contentTypeLabel }}</span>
            <span v-if="isKnownDomain(post.domain)" class="domain-badge inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
              {{ getDomainIcon(post.domain) }} {{ getDomainLabel(post.domain) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          v-if="canFollowAuthor"
          type="button"
          class="post-follow-button"
          :disabled="isFollowing"
          @click.prevent="handleFollow"
        >
          {{ post.author.isFollowing ? '已关注' : '关注' }}
        </button>

        <div v-if="props.showFeedControls || props.showRecommendFeedback" class="feedback-menu-wrapper relative" data-feedback-menu>
          <button
            type="button"
            class="post-feedback-trigger"
            aria-label="推荐反馈"
            title="推荐反馈"
            :aria-expanded="showFeedbackMenu"
            :aria-controls="feedbackMenuId"
            :aria-busy="feedFeedbackPending"
            :disabled="feedFeedbackPending"
            @click.prevent="showFeedbackMenu = !showFeedbackMenu"
            @keydown.esc.prevent="showFeedbackMenu = false"
          >
            <Loader2 v-if="feedFeedbackPending" class="h-4 w-4 animate-spin" />
            <MoreHorizontal v-else class="h-4 w-4" />
          </button>
          <div
            v-if="showFeedbackMenu"
            :id="feedbackMenuId"
            class="post-feedback-menu"
            aria-label="推荐反馈选项"
            @click.prevent
            @keydown.esc.stop.prevent="showFeedbackMenu = false"
          >
            <button
              v-for="item in visibleFeedbackActions"
              :key="item.action"
              type="button"
              class="feedback-menu-item"
              @click.stop.prevent="handleFeedbackAction(item)"
            >
              <RotateCcw v-if="item.action === 'RESTORE'" class="h-4 w-4" />
              <UserX v-else-if="item.action === 'BLOCK_AUTHOR'" class="h-4 w-4" />
              <EyeOff v-else class="h-4 w-4" />
              <span>
                <strong>{{ item.label }}</strong>
                <small>{{ item.description }}</small>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="cardUnavailableState" class="governance-card-unavailable" role="note">
      <strong>{{ cardUnavailableState.title }}</strong>
      <span>{{ cardUnavailableState.description }}</span>
    </div>

    <RouterLink
      :to="detailTo"
      class="post-detail-link"
      :aria-label="`查看帖子：${post.title}`"
      @click.stop
    >
      <h3
        class="mb-2 line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        v-html="displayTitle"
      />

      <p
        class="mb-4 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400"
        v-html="displaySummary"
      />

      <div
        v-if="trustSignalChips.length || (isSearchContext && rankingReasonLabels.length)"
        class="post-trust-panel"
      >
        <div class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <ShieldCheck class="h-3.5 w-3.5" />
          {{ isSearchContext && rankingReasonLabels.length ? '可信排序说明' : '公开可信信号' }}
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="signal in trustSignalChips"
            :key="signal"
            class="rounded-full bg-white px-2 py-1 text-xs text-emerald-700 dark:bg-slate-900 dark:text-emerald-200"
          >
            {{ signal }}
          </span>
          <span
            v-for="reason in rankingReasonLabels"
            :key="reason"
            class="rounded-full bg-white px-2 py-1 text-xs text-emerald-700 dark:bg-slate-900 dark:text-emerald-200"
          >
            {{ reason }}
          </span>
        </div>
      </div>

      <div v-if="recommendationFeedbackSubmittedLabel && !feedFeedbackPending && !feedFeedbackError" class="feedback-submitted-note mb-4">
        {{ recommendationFeedbackSubmittedLabel }}
      </div>
      <div v-if="feedFeedbackError" class="feedback-error-note mb-4" role="alert">
        {{ feedFeedbackError }}
      </div>

      <div v-if="riskWarning" class="mb-4">
        <div v-if="riskWarning" class="post-signal-note post-signal-note--risk">
          <ShieldAlert class="h-3.5 w-3.5" />
          <span>{{ riskWarning }}</span>
        </div>
      </div>

      <div
        v-if="displayCardImageUrl"
        class="domain-card-media mb-3"
        :class="`domain-card-media--${domainCardSurface.tone}`"
      >
        <img :src="displayCardImageUrl" :alt="domainCardSurface.imageAlt || post.title" referrerpolicy="no-referrer" @error="handleCardImageError">
      </div>

      <div v-if="domainCardSurface.chips.length" class="mb-3 flex flex-wrap gap-2">
        <span
          v-for="chip in domainCardSurface.chips"
          :key="`${chip.tone}-${chip.label}`"
          class="domain-card-chip"
          :class="`domain-card-chip--${chip.tone}`"
        >
          {{ chip.label }}
        </span>
      </div>

      <div v-if="isLegacyInterview && legacyInterviewChips.length" class="mb-3 flex flex-wrap gap-2">
        <span
          v-for="chip in legacyInterviewChips"
          :key="chip.label"
          class="domain-card-chip domain-card-chip--career"
        >
          {{ chip.label }}
        </span>
        <span
          v-if="legacyInterviewResultText"
          class="rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="getResultClass(post.extension?.interviewResult)"
        >
          {{ legacyInterviewResultText }}
        </span>
      </div>

      <div v-if="visibleTags.length" class="post-tag-list">
        <span v-for="tag in visibleTags" :key="tag.id" class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {{ tag.name }}
        </span>
      </div>
    </RouterLink>

    <section
      v-if="feedExplanationVisible"
      class="post-feed-explanation"
      :aria-label="reasonPanelTitle"
    >
      <button
        type="button"
        class="post-feed-explanation__trigger"
        :aria-expanded="showFeedExplanation"
        :aria-controls="feedExplanationId"
        @click="showFeedExplanation = !showFeedExplanation"
      >
        <span class="post-feed-explanation__heading">
          <Lightbulb class="h-3.5 w-3.5" />
          <span>{{ feedExplanationLabel }}</span>
        </span>
        <ChevronDown
          class="h-4 w-4 transition-transform"
          :class="{ 'rotate-180': showFeedExplanation }"
        />
      </button>
      <div
        v-if="showFeedExplanation"
        :id="feedExplanationId"
        class="post-feed-explanation__content"
      >
        <p v-for="detail in feedExplanationDetails" :key="`${detail.code}-${detail.text}`">
          {{ detail.text }}
        </p>
      </div>
    </section>

    <div class="post-card__footer">
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <span class="card-action" title="浏览量">
          <Eye class="h-4 w-4" />
          <span class="action-label">浏览</span>
          {{ formatNumber(post.counter.view) }}
        </span>
        <button
          type="button"
          class="card-action hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-55"
          :aria-label="likePending ? '点赞处理中' : post.myInteraction?.liked ? '取消点赞' : '点赞帖子'"
          :title="likePending ? '点赞处理中' : post.myInteraction?.liked ? '取消点赞' : '点赞帖子'"
          :aria-pressed="Boolean(post.myInteraction?.liked)"
          :aria-busy="likePending"
          :disabled="likePending"
          @click.prevent="handleLike"
        >
          <Heart class="h-4 w-4" :class="post.myInteraction?.liked ? 'fill-current text-rose-600' : ''" />
          <span class="action-label">{{ post.myInteraction?.liked ? '已点赞' : '点赞' }}</span>
          {{ formatNumber(post.counter.like) }}
        </button>
        <span class="card-action" title="评论数">
          <MessageCircle class="h-4 w-4" />
          <span class="action-label">评论</span>
          {{ formatNumber(post.counter.comment) }}
        </span>
        <button
          type="button"
          class="card-action hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-55"
          :aria-label="favoritePending ? '收藏处理中' : post.myInteraction?.favorited ? '取消收藏' : '收藏帖子'"
          :title="favoritePending ? '收藏处理中' : post.myInteraction?.favorited ? '取消收藏' : '收藏帖子'"
          :aria-pressed="Boolean(post.myInteraction?.favorited)"
          :aria-busy="favoritePending"
          :disabled="favoritePending"
          @click.prevent="handleFavorite"
        >
          <Star class="h-4 w-4" :class="post.myInteraction?.favorited ? 'fill-current text-amber-500' : ''" />
          <span class="action-label">{{ post.myInteraction?.favorited ? '已收藏' : '收藏' }}</span>
          {{ formatNumber(post.counter.favorite) }}
        </button>
        <PostSaveOrganizer
          :post-id="post.postId"
          :favorited="Boolean(post.myInteraction?.favorited)"
          :open-after-save="Boolean(post.myInteraction?.favorited)"
          trigger-label="移动分组"
          :disabled="favoritePending"
          @moved="handleSavedPostMoved"
        />
        <button
          v-if="!isOwnPost"
          type="button"
          class="card-action hover:text-slate-900 dark:hover:text-slate-100"
          aria-label="举报帖子"
          title="举报帖子"
          @click.prevent="handleReport"
        >
          <Flag class="h-4 w-4" />
          <span class="action-label">举报</span>
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showAuthorBlockDialog" class="feed-author-control-overlay">
        <section
          ref="authorBlockDialog"
          class="feed-author-control-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feed-author-control-title"
          aria-describedby="feed-author-control-description"
          tabindex="-1"
        >
          <div>
            <p class="feed-author-control-dialog__eyebrow">个人信息流控制</p>
            <h2 id="feed-author-control-title">屏蔽此作者？</h2>
            <p id="feed-author-control-description">
              这只会从你的信息流中隐藏该作者的公开内容，不会通知对方，也不会影响对方发布。你可随时在设置中取消。
            </p>
          </div>
          <div class="feed-author-control-dialog__actions">
            <button ref="authorBlockCancelButton" type="button" class="feed-author-control-dialog__cancel" @click="closeAuthorBlockDialog">
              取消
            </button>
            <button type="button" class="feed-author-control-dialog__confirm" @click="confirmAuthorBlock">
              确认屏蔽
            </button>
          </div>
        </section>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="showFeedbackReasonDialog" class="feed-author-control-overlay">
        <section
          ref="feedbackReasonDialog"
          class="feed-author-control-dialog feed-feedback-reason-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="feed-feedback-reason-title"
          aria-describedby="feed-feedback-reason-description"
          tabindex="-1"
        >
          <div>
            <p class="feed-author-control-dialog__eyebrow">信息流反馈</p>
            <h2 id="feed-feedback-reason-title">{{ pendingFeedbackLabel }}</h2>
            <p id="feed-feedback-reason-description">{{ pendingFeedbackDescription }}</p>
          </div>
          <div class="feed-feedback-reason-options" role="group" aria-label="选择反馈原因">
            <button
              v-for="option in feedbackReasonOptions"
              :key="option.code"
              type="button"
              :class="{ 'feed-feedback-reason-option--active': selectedFeedbackReasonCode === option.code }"
              :aria-pressed="selectedFeedbackReasonCode === option.code"
              @click="selectedFeedbackReasonCode = option.code"
            >
              <strong>{{ option.label }}</strong>
              <span>{{ option.description }}</span>
            </button>
          </div>
          <div class="feed-author-control-dialog__actions">
            <button ref="feedbackReasonCancelButton" type="button" class="feed-author-control-dialog__cancel" @click="closeFeedbackReasonDialog">
              取消
            </button>
            <button
              type="button"
              class="feed-author-control-dialog__confirm"
              :disabled="!selectedFeedbackReasonCode"
              @click="confirmFeedbackReason"
            >
              确认
            </button>
          </div>
        </section>
      </div>
    </Teleport>
  </article>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChevronDown, Eye, EyeOff, Flag, Heart, Lightbulb, Loader2, MessageCircle, MoreHorizontal, RotateCcw, ShieldAlert, ShieldCheck, Star, UserX } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatTime, formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api/user'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { getContentTypeShortLabel } from '@/utils/contentTypes'
import { buildDomainCardSurface } from '@/utils/domainPostSurfaces'
import { getDomainIcon, getDomainLabel, isKnownDomain } from '@/utils/domains'
import {
  findHighRiskContentWarning,
  neutralizeHighRiskRecommendationReason,
  normalizeRecommendationReason,
} from '@/utils/recommendationGovernance'
import { getPostUnavailableState, normalizeRiskNoticeForUsers } from '@/utils/governanceDisplay'
import type { FeedbackReasonCode, FeedControlAction, FeedPost } from '@/api/feed'
import PostSaveOrganizer from '@/components/post/PostSaveOrganizer.vue'
import UserAvatar from '@/components/user/UserAvatar.vue'
import { useAccessibleDialog } from '@/composables/useAccessibleDialog'

const props = defineProps<{
  post: Post | FeedPost
  showRecommendFeedback?: boolean
  showFeedControls?: boolean
  showReasonPanel?: boolean
  likePending?: boolean
  favoritePending?: boolean
  feedFeedbackAction?: FeedControlAction | null
  feedFeedbackPending?: boolean
  feedFeedbackError?: string
  detailQuery?: Record<string, string | number | boolean | undefined>
}>()

const emit = defineEmits<{
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
  feedFeedback: [postId: Post['postId'], action: FeedControlAction, reasonCode?: FeedbackReasonCode]
  blockAuthor: [authorUid: Post['author']['uid'], postId: Post['postId']]
  'follow-change': [authorUid: Post['author']['uid'], following: boolean]
}>()

const handleCardClick = (event?: MouseEvent | KeyboardEvent) => {
  if (typeof window === 'undefined') return
  const eventTarget = event?.target
  if (eventTarget instanceof Element && eventTarget.closest('a,button,input,textarea,select,[role="button"]')) return
  if (window.getSelection()?.toString()) return
  router.push(detailTo.value)
}

const authStore = useAuthStore()
const router = useRouter()
const { requireLogin } = useLoginRedirect()
const isFollowing = ref(false)
const failedImageUrl = ref('')
const showFeedbackMenu = ref(false)
const showFeedExplanation = ref(false)
const showAuthorBlockDialog = ref(false)
const showFeedbackReasonDialog = ref(false)
const authorBlockDialog = ref<HTMLElement | null>(null)
const authorBlockCancelButton = ref<HTMLButtonElement | null>(null)
const feedbackReasonDialog = ref<HTMLElement | null>(null)
const feedbackReasonCancelButton = ref<HTMLButtonElement | null>(null)
const pendingFeedbackAction = ref<FeedControlAction | null>(null)
const selectedFeedbackReasonCode = ref<FeedbackReasonCode | null>(null)
const recommendationFeedbackSubmittedLabel = ref('')
// 反馈请求失败时清掉“已记录”乐观提示，避免与错误信息并存或错误消失后再冒出来。
watch(() => props.feedFeedbackError, (message) => {
  if (message) recommendationFeedbackSubmittedLabel.value = ''
})
const feedbackActions: Array<{
  action: FeedControlAction | 'BLOCK_AUTHOR'
  label: string
  reason: string
  description: string
}> = [
  {
    action: 'HIDE',
    label: '暂时隐藏',
    reason: 'user_hide',
    description: '只对当前账号隐藏这条内容，可立即撤销。',
  },
  {
    action: 'LESS_LIKE_THIS',
    label: '减少同类',
    reason: 'user_less_like_this',
    description: '降低相似内容的出现频率，之后可以恢复默认。',
  },
  {
    action: 'RESTORE',
    label: '恢复默认',
    reason: 'user_restore',
    description: '撤销当前账号对这条内容的 Feed 控制。',
  },
]
const feedbackReasonOptions: Array<{
  code: FeedbackReasonCode
  label: string
  description: string
}> = [
  { code: 'NOT_RELEVANT', label: '与当前关注无关', description: '减少不相关内容。' },
  { code: 'TOO_FREQUENT', label: '出现太频繁', description: '降低同类内容频率。' },
  { code: 'ALREADY_KNOWN', label: '已经了解', description: '减少重复信息。' },
  { code: 'QUALITY_NOT_EXPECTED', label: '不符合预期', description: '记录这次内容反馈。' },
  { code: 'OTHER', label: '其他原因', description: '不需要补充说明。' },
]

const authorUid = computed(() => String(props.post.author.uid ?? ''))
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(props.post.author.uid))
const isAnonymousMaskedAuthor = computed(() => Boolean(props.post.anonymous)
  && (authorUid.value === '' || authorUid.value === '0' || props.post.author.profileVisible === false))
const canFollowAuthor = computed(() => !isOwnPost.value
  && !isAnonymousMaskedAuthor.value
  && props.post.author.profileVisible !== false
  && authorUid.value !== ''
  && authorUid.value !== '0')
const canBlockAuthor = computed(() => !isOwnPost.value
  && !Boolean(props.post.anonymous)
  && authorUid.value !== ''
  && authorUid.value !== '0')
const displayTitle = computed(() => renderSearchHighlight(props.post.highlightTitle, props.post.title))
const displaySummary = computed(() => renderSearchHighlight(
  props.post.highlightSummary,
  props.post.summary || props.post.extension?.summary || props.post.content.substring(0, 100),
))
const normalizedDetailQuery = computed(() => Object.fromEntries(
  Object.entries(props.detailQuery || {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => [key, typeof value === 'boolean' ? (value ? '1' : '0') : value]),
))
const isSearchContext = computed(() => normalizedDetailQuery.value.from === 'search')
const feedPost = computed(() => props.post as FeedPost)
const normalizeFeedReason = (reason?: string | null) => (
  neutralizeHighRiskRecommendationReason(normalizeRecommendationReason(reason), feedPost.value)
)
const feedSourceLabel = computed(() => normalizeFeedReason(feedPost.value.sourceLabel))
const feedExplanationDetails = computed(() => (feedPost.value.recommendationReasonDetails || [])
  .map((detail) => ({
    ...detail,
    text: normalizeFeedReason(detail?.text),
  }))
  .filter((detail) => Boolean(detail?.code && detail.text))
  .slice(0, 3))
const feedExplanationVisible = computed(() => feedExplanationDetails.value.length > 0)
const reasonPanelTitle = computed(() => (
  props.showReasonPanel && isSearchContext.value ? '命中说明' : '推荐说明'
))
const feedExplanationLabel = computed(() => feedSourceLabel.value || reasonPanelTitle.value)
const feedExplanationId = computed(() => `post-feed-explanation-${String(props.post.postId)}`)
const feedbackMenuId = computed(() => `post-feedback-menu-${String(props.post.postId)}`)
const pendingFeedbackLabel = computed(() => (
  pendingFeedbackAction.value === 'LESS_LIKE_THIS' ? '减少同类内容？' : '暂时隐藏这条内容？'
))
const pendingFeedbackDescription = computed(() => (
  pendingFeedbackAction.value === 'LESS_LIKE_THIS'
    ? '这会减少当前账号后续看到同类频道内容的频率，不影响任何其他用户。'
    : '这会从当前账号的信息流中隐藏这条内容，你可以在设置中恢复。'
))
const visibleFeedbackActions = computed(() => {
  const currentAction = props.feedFeedbackAction
  const postActions = currentAction && currentAction !== 'RESTORE'
    ? feedbackActions.filter((item) => item.action === 'RESTORE')
    : feedbackActions.filter((item) => item.action === 'HIDE' || item.action === 'LESS_LIKE_THIS')
  return canBlockAuthor.value
    ? [...postActions, {
      action: 'BLOCK_AUTHOR' as const,
      label: '屏蔽作者',
      reason: 'user_block_author',
      description: '仅从你的信息流中隐藏该作者，可在设置中恢复。',
    }]
    : postActions
})
const detailTo = computed(() => ({
  path: `/post/${props.post.postId}`,
  query: normalizedDetailQuery.value,
}))
const reportTo = computed(() => ({
  path: `/post/${props.post.postId}`,
  query: { ...normalizedDetailQuery.value, report: 'post' },
}))
const contentTypeLabel = computed(() => getContentTypeShortLabel(props.post.postType))
const isLegacyInterview = computed(() => false)
const domainCardSurface = computed(() => buildDomainCardSurface(props.post))
const displayCardImageUrl = computed(() => {
  const imageUrl = domainCardSurface.value.imageUrl || ''
  return imageUrl && failedImageUrl.value !== imageUrl ? imageUrl : ''
})
const legacyInterviewChips = computed(() => {
  if (!isLegacyInterview.value || !props.post.extension) return []
  const chips: Array<{ label: string }> = []
  const company = String(props.post.extension.company || '').trim()
  const position = String(props.post.extension.position || '').trim()
  const yearsOfExp = Number(props.post.extension.yearsOfExp || 0)
  if (company) chips.push({ label: company })
  if (position) chips.push({ label: position })
  if (yearsOfExp > 0) chips.push({ label: `${yearsOfExp} 年` })
  return chips
})
const legacyInterviewResultText = computed(() => {
  if (!isLegacyInterview.value) return ''
  const result = Number(props.post.extension?.interviewResult || 0)
  if (!result) return ''
  return getResultText(result)
})
const visibleTags = computed(() => props.post.tags.slice(0, 4))
const trustSignalChips = computed(() => {
  const signals = props.post.trustSignals
  if (!signals) return []
  const chips: string[] = []
  if (signals.profileAvailable) {
    chips.push(signals.completenessScore > 0 ? `经验背景完整度 ${signals.completenessScore}%` : '已补充经验背景')
  }
  if (signals.freshnessStatus === 'CURRENT') chips.push('作者确认当前有效')
  if (signals.freshnessStatus === 'UPDATED') chips.push('内容已更新')
  if (signals.sourceComplete) chips.push('已说明来源或披露')
  if (signals.resolved || signals.hasAcceptedAnswer) chips.push('讨论已有结果')
  if (signals.publicCorrectionCount > 0) chips.push('有公开纠错记录')
  return chips.slice(0, 4)
})
const rankingReasonLabels = computed(() => {
  const labels: Record<string, string> = {
    trust_profile_available: '已补充经验背景',
    experience_context_complete: '说明了适用条件',
    author_recently_confirmed: '作者近期确认',
    source_or_disclosure_provided: '已说明来源或披露',
    accepted_public_answer: '已有公开采纳回答',
    public_correction_history: '有公开纠错记录',
  }
  return (props.post.rankingReasons || [])
    .map((reason) => labels[reason] || '')
    .filter(Boolean)
    .slice(0, 3)
})
const riskWarning = computed(() => normalizeRiskNoticeForUsers(findHighRiskContentWarning([
  props.post.title,
  props.post.summary,
  props.post.content,
  props.post.tags.map((tag) => tag.name).join(' '),
].filter(Boolean).join(' '))))
const cardUnavailableState = computed(() => getPostUnavailableState(props.post))

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const renderSearchHighlight = (highlight: string | undefined, fallback: string) => {
  if (!highlight) return escapeHtml(fallback || '')
  const safe = escapeHtml(highlight)
  return safe
    .replace(/&lt;em&gt;/g, '<mark class="search-highlight">')
    .replace(/&lt;\/em&gt;/g, '</mark>')
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
    1: '已通过',
    2: '待反馈',
    3: '未通过',
  }
  return texts[result] || '未知'
}

const handleLike = () => {
  if (!requireLogin()) return
  emit('like', props.post.postId)
}

const handleFavorite = () => {
  if (!requireLogin()) return
  emit('favorite', props.post.postId)
}

const handleSavedPostMoved = (_postId: Post['postId'], _folderId: unknown, folderName: string) => {
  if (!requireLogin()) return
  toast.success(`已移动到${folderName}`)
}

const handleReport = () => {
  if (!requireLogin()) return
  router.push(reportTo.value)
}

const handleCardImageError = () => {
  failedImageUrl.value = domainCardSurface.value.imageUrl || ''
}

const closeAuthorBlockDialog = () => {
  showAuthorBlockDialog.value = false
}

const closeFeedbackReasonDialog = () => {
  showFeedbackReasonDialog.value = false
  pendingFeedbackAction.value = null
  selectedFeedbackReasonCode.value = null
}

const confirmFeedbackReason = () => {
  const action = pendingFeedbackAction.value
  const reasonCode = selectedFeedbackReasonCode.value
  if (!action || !reasonCode) return
  closeFeedbackReasonDialog()
  recommendationFeedbackSubmittedLabel.value = action === 'HIDE'
    ? '已隐藏这条内容，可在设置中恢复。'
    : '已记录反馈，后续会减少同类内容。'
  emit('feedFeedback', props.post.postId, action, reasonCode)
}

const confirmAuthorBlock = () => {
  if (!canBlockAuthor.value) {
    closeAuthorBlockDialog()
    return
  }
  closeAuthorBlockDialog()
  recommendationFeedbackSubmittedLabel.value = '已屏蔽该作者，之后可在设置中取消。'
  emit('blockAuthor', props.post.author.uid, props.post.postId)
}

const handleFeedbackAction = (item: typeof visibleFeedbackActions.value[number]) => {
  if (!requireLogin()) return
  showFeedbackMenu.value = false
  if (item.action === 'BLOCK_AUTHOR') {
    showAuthorBlockDialog.value = true
    return
  }
  if (item.action === 'HIDE' || item.action === 'LESS_LIKE_THIS') {
    pendingFeedbackAction.value = item.action
    selectedFeedbackReasonCode.value = null
    showFeedbackReasonDialog.value = true
    return
  }
  recommendationFeedbackSubmittedLabel.value = `已记录：${item.label}`
  emit('feedFeedback', props.post.postId, item.action)
}

const handleFollow = async () => {
  if (!canFollowAuthor.value) return
  if (!requireLogin()) return
  isFollowing.value = true
  const wasFollowing = Boolean(props.post.author.isFollowing)
  try {
    if (wasFollowing) {
      await userApi.unfollow(props.post.author.uid)
      emit('follow-change', props.post.author.uid, false)
      toast.success('已取消关注')
    } else {
      await userApi.follow(props.post.author.uid)
      emit('follow-change', props.post.author.uid, true)
      toast.success('已关注')
    }
  } catch (error: unknown) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    isFollowing.value = false
  }
}

// 点击卡片外部时关闭“减少推荐”菜单，与顶栏下拉菜单保持一致的交互。
const handleDocumentClick = (event: MouseEvent) => {
  if (!showFeedbackMenu.value) return
  const target = event.target as HTMLElement | null
  if (!target?.closest('.feedback-menu-wrapper')) showFeedbackMenu.value = false
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

useAccessibleDialog(() => showAuthorBlockDialog.value, {
  close: closeAuthorBlockDialog,
  initialFocus: authorBlockCancelButton,
  dialogRef: authorBlockDialog,
})

useAccessibleDialog(() => showFeedbackReasonDialog.value, {
  close: closeFeedbackReasonDialog,
  initialFocus: feedbackReasonCancelButton,
  dialogRef: feedbackReasonDialog,
})
</script>

<style scoped>
.feed-author-control-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(#0d1a15 / 0.56);
  padding: 1rem;
}

.feed-author-control-dialog {
  display: grid;
  width: min(100%, 30rem);
  gap: 1.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  background: white;
  padding: 1.25rem;
  color: var(--text-strong);
  box-shadow: 0 22px 55px rgba(20, 30, 25, 0.28);
}

.feed-author-control-dialog__eyebrow {
  color: rgb(26 127 90);
  font-size: 0.75rem;
  font-weight: 800;
}

.feed-author-control-dialog h2 {
  margin-top: 0.25rem;
  font-size: 1.125rem;
  font-weight: 800;
}

.feed-author-control-dialog p:not(.feed-author-control-dialog__eyebrow) {
  margin-top: 0.5rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  line-height: 1.6;
}

.feed-author-control-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.feed-author-control-dialog__cancel,
.feed-author-control-dialog__confirm {
  min-height: 40px;
  border-radius: 0.5rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.feed-author-control-dialog__cancel {
  border: 1px solid var(--border-subtle);
  background: white;
  color: var(--text-primary);
}

.feed-author-control-dialog__confirm {
  background: rgb(26 127 90);
  color: white;
}

.feedback-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  color: var(--text-primary);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.feedback-menu-item:hover {
  background: var(--surface-soft);
  color: var(--text-strong);
}

.feedback-menu-item strong,
.feedback-menu-item small {
  display: block;
}

.feedback-menu-item small {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.35;
  color: var(--text-muted);
}

.feedback-submitted-note {
  border-radius: 0.7rem;
  border: 1px solid rgb(187 247 208);
  background: rgb(240 253 244);
  padding: 0.55rem 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.5;
  color: rgb(21 128 61);
}

.feedback-error-note {
  border-radius: 0.7rem;
  border: 1px solid rgb(254 205 211);
  background: rgb(255 241 242);
  padding: 0.55rem 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.5;
  color: rgb(190 24 93);
}

.post-feed-explanation {
  margin-bottom: 1rem;
  border-left: 3px solid rgb(18 99 74);
  background: rgb(240 253 250);
  color: rgb(15 118 110);
}

.post-feed-explanation__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 2.75rem;
  gap: 0.75rem;
  padding: 0.65rem 0.75rem;
  text-align: left;
}

.post-feed-explanation__heading {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.post-feed-explanation__trigger:focus-visible {
  outline: 3px solid rgb(18 99 74 / 0.35);
  outline-offset: -3px;
}

.post-feed-explanation__content {
  display: grid;
  gap: 0.35rem;
  padding: 0 0.75rem 0.7rem;
}

.post-feed-explanation__content p {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.55;
}

.card-action {
  display: inline-flex;
  min-height: 2rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  white-space: nowrap;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.action-label {
  font-size: 0.75rem;
  font-weight: 700;
}

.content-type-pill {
  display: inline-flex;
  border-radius: 999px;
  background: var(--brand-soft);
  padding: 0.1rem 0.5rem;
  font-weight: 800;
  color: var(--brand-strong);
}

.domain-card-media {
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface-soft);
  aspect-ratio: 16 / 9;
}

.domain-card-media img {
  display: block;
  height: 100%;
  width: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.post-detail-link:hover .domain-card-media img {
  transform: scale(1.025);
}

.domain-card-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1rem;
}

.domain-card-chip--tech {
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.domain-card-chip--career {
  background: rgb(232 243 237);
  color: rgb(18 99 74);
}

.domain-card-chip--reading {
  background: rgb(240 253 244);
  color: rgb(21 128 61);
}

.domain-card-chip--lifestyle {
  background: rgb(253 242 248);
  color: rgb(190 24 93);
}

.domain-card-chip--investment {
  background: rgb(255 247 237);
  color: rgb(194 65 12);
}

.post-signal-note {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  border-radius: 0.7rem;
  border: 1px solid;
  padding: 0.55rem 0.7rem;
  font-size: 0.76rem;
  font-weight: 800;
  line-height: 1.5;
}

.post-signal-note svg {
  margin-top: 0.12rem;
  flex-shrink: 0;
}

.governance-card-unavailable {
  margin-bottom: 1rem;
  display: grid;
  gap: 0.2rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border-subtle);
  background: var(--surface-soft);
  padding: 0.75rem 0.85rem;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.governance-card-unavailable strong {
  color: var(--text-strong);
  font-size: 0.86rem;
}

.post-signal-note--hot {
  border-color: rgb(169 216 195);
  background: rgb(232 243 237 / 0.72);
  color: rgb(18 99 74);
}

.post-signal-note--risk {
  border-color: rgb(253 186 116);
  background: rgb(255 247 237);
  color: rgb(154 52 18);
}

@media (max-width: 420px) {
  article {
    padding: 1rem;
  }

  .card-action {
    gap: 0.25rem;
    min-height: 44px;
    padding: 0.25rem 0.45rem;
  }

  .action-label {
    display: none;
  }
}

.card-action:hover {
  background: var(--surface-soft);
}

.post-detail-link {
  display: block;
  border-radius: 0.75rem;
  outline: none;
}

.post-detail-link:focus-visible {
  box-shadow: 0 0 0 3px rgb(169 216 195 / 0.85);
}

:deep(.search-highlight) {
  border-radius: 0.25rem;
  background: rgb(254 240 138);
  padding: 0 0.15rem;
  color: rgb(113 63 18);
}

.dark .feedback-menu-item {
  color: var(--text-muted);
}

.dark .feed-author-control-dialog,
.dark .feed-author-control-dialog__cancel {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .feed-author-control-dialog {
  color: var(--text-strong);
}

.dark .feed-author-control-dialog p:not(.feed-author-control-dialog__eyebrow),
.dark .feed-author-control-dialog__cancel {
  color: var(--text-muted);
}

.dark .feedback-menu-item:hover {
  background: var(--surface-1);
  color: var(--text-strong);
}

.dark .feedback-menu-item small {
  color: var(--text-muted);
}

.dark .feedback-submitted-note {
  border-color: rgb(21 128 61 / 0.58);
  background: rgb(20 83 45 / 0.22);
  color: rgb(134 239 172);
}

.dark .feedback-error-note {
  border-color: rgb(159 18 57 / 0.72);
  background: rgb(76 5 25 / 0.4);
  color: rgb(253 164 175);
}

.dark .post-feed-explanation {
  border-left-color: rgb(45 212 191);
  background: rgb(19 78 74 / 0.3);
  color: rgb(153 246 228);
}

.dark .post-feed-explanation__trigger:focus-visible {
  outline-color: rgb(45 212 191 / 0.45);
}

.dark .card-action:hover {
  background: var(--surface-1);
}

.dark .domain-card-media {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .domain-card-chip--tech {
  background: rgb(10 52 39 / 0.45);
  color: rgb(124 195 165);
}

.dark .domain-card-chip--career {
  background: rgb(10 52 39 / 0.5);
  color: rgb(169 216 195);
}

.dark .domain-card-chip--reading {
  background: rgb(20 83 45 / 0.45);
  color: rgb(134 239 172);
}

.dark .domain-card-chip--lifestyle {
  background: rgb(131 24 67 / 0.45);
  color: rgb(249 168 212);
}

.dark .domain-card-chip--investment {
  background: rgb(124 45 18 / 0.45);
  color: rgb(253 186 116);
}

.dark .post-signal-note--hot {
  border-color: rgb(18 99 74 / 0.64);
  background: rgb(10 52 39 / 0.42);
  color: rgb(169 216 195);
}

.dark .post-signal-note--risk {
  border-color: rgb(154 52 18 / 0.82);
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}

.dark .governance-card-unavailable {
  border-color: var(--border-subtle);
  background: var(--surface-1);
  color: var(--text-muted);
}

.dark .governance-card-unavailable strong {
  color: var(--text-strong);
}

.dark :deep(.search-highlight) {
  background: rgb(133 77 14);
  color: rgb(254 243 199);
}

.post-card {
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
  transition: background-color 0.15s ease;
}

.post-card:first-child {
  padding-top: 0;
}

.post-card:hover {
  background: rgb(255 255 255 / 0.62);
}

.post-card__author-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.8rem;
}

.post-card__author-row > .flex > .flex:first-child {
  border-radius: 6px;
  box-shadow: none;
}

.post-detail-link {
  display: grid;
  gap: 0.45rem;
  border-radius: 0;
}

.post-detail-link:has(.domain-card-media) {
  grid-template-columns: minmax(0, 1fr) 9.5rem;
  column-gap: 1rem;
}

.post-detail-link:has(.domain-card-media) > :not(.domain-card-media) {
  grid-column: 1;
}

.post-detail-link:has(.domain-card-media) > .domain-card-media {
  grid-column: 2;
  grid-row: 1 / span 8;
  align-self: start;
}

.post-detail-link h3 {
  margin: 0 !important;
  color: var(--text-strong);
  font-size: 1rem;
  line-height: 1.5;
}

.post-detail-link p {
  margin: 0 !important;
  color: var(--text-primary);
  font-size: 0.8125rem;
  line-height: 1.7;
}

.post-reason-panel,
.post-trust-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.15rem 0;
  border: 0;
  background: transparent;
}

.post-reason-panel > div,
.post-trust-panel > div {
  display: contents;
}

.post-reason-panel :is(span, div > span),
.post-trust-panel :is(span, div > span) {
  display: inline-flex;
  width: auto;
  align-items: center;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.7rem;
}

.post-reason-panel > .mb-1,
.post-trust-panel > .mb-1 {
  width: 100%;
  margin: 0;
  color: rgb(26 127 90);
}

.post-trust-panel > .mb-1 {
  color: rgb(5 150 105);
}

.post-signal-note {
  border-radius: 5px;
  box-shadow: none;
}

.post-signal-note--hot {
  border-color: rgb(205 232 220);
  background: rgb(232 243 237 / 0.75);
  color: rgb(18 99 74);
}

.post-signal-note--risk {
  border-color: rgb(254 215 170);
  background: rgb(255 247 237);
  color: rgb(154 52 18);
}

.domain-card-media {
  width: 100%;
  margin: 0 !important;
  border-color: var(--border-subtle);
  border-radius: 6px;
  aspect-ratio: 1 / 0.78;
}

.domain-card-media img {
  transition: transform 0.2s ease;
}

.post-detail-link:hover .domain-card-media img {
  transform: scale(1.02);
}

.domain-card-chip {
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
}

.post-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.15rem;
}

.post-tag-list > span {
  padding: 0.15rem 0.45rem;
  border-color: var(--border-subtle);
  border-radius: 4px;
  background: rgb(249 250 251);
  color: var(--text-muted);
  font-size: 0.7rem;
}

.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.9rem;
  padding-top: 0.7rem;
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 0.8125rem;
}

.post-card__footer .card-action {
  min-height: 1.85rem;
  padding: 0.2rem 0.35rem;
  border-radius: 5px;
}

.post-card__footer .card-action:hover {
  background: var(--surface-soft);
}

.post-card__footer :deep(.post-save-organizer-trigger) {
  min-height: 1.85rem;
}

.dark .post-card {
  border-color: var(--border-subtle);
}

.dark .post-detail-link h3 {
  color: var(--text-strong);
}

.dark .post-detail-link p,
.dark .post-reason-panel :is(span, div > span),
.dark .post-trust-panel :is(span, div > span) {
  color: var(--text-muted);
}

.dark .domain-card-media,
.dark .post-tag-list > span {
  border-color: var(--border-subtle);
  background: var(--surface-2);
}

.dark .post-card__footer {
  border-color: var(--border-subtle);
  color: var(--text-muted);
}

.dark .post-card__footer .card-action:hover {
  background: var(--surface-3);
}

@media (max-width: 560px) {
  .post-card {
    padding: 1.05rem 1rem;
  }

  .post-card__author-row {
    gap: 0.65rem;
  }

  .post-detail-link:has(.domain-card-media) {
    grid-template-columns: minmax(0, 1fr) 5.75rem;
    column-gap: 0.75rem;
  }

  .post-card__footer .card-action {
    min-height: 2rem;
    padding: 0.2rem 0.3rem;
  }
}

.post-card {
  position: relative;
  overflow: hidden;
  padding: 1.3rem 1.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  transition:
    border-color 0.2s ease,
    box-shadow 0.24s ease,
    transform 0.24s ease;
}

/* 左侧品牌强调条：默认收起，悬停展开，克制但有回应 */
.post-card::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--primary-500), var(--primary-700));
  opacity: 0;
  transform: scaleY(0.35);
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.post-card:first-child {
  padding-top: 1.3rem;
}

.post-card:last-child {
  border-bottom: 1px solid var(--border-subtle);
}

.post-card:hover {
  border-color: color-mix(in srgb, var(--primary-600) 24%, var(--border-subtle));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.post-card:hover::before {
  opacity: 1;
  transform: scaleY(1);
}

@media (prefers-reduced-motion: reduce) {
  .post-card,
  .post-card::before {
    transition: none;
  }

  .post-card:hover {
    transform: none;
  }
}

.post-card__author-row {
  margin-bottom: 0.75rem;
}

.post-author-avatar {
  display: grid;
  width: 2.45rem;
  height: 2.45rem;
  flex: 0 0 auto;
  overflow: hidden;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
  color: white;
  font-size: 0.8125rem;
  font-weight: 850;
}

.post-author-badge {
  display: inline-flex;
  min-height: 1.15rem;
  align-items: center;
  padding: 0 0.35rem;
  border-radius: 4px;
  background: #fff4e5;
  color: #b54708;
  font-size: 0.625rem;
  font-weight: 800;
}

.post-follow-button {
  min-height: 1.9rem;
  padding: 0 0.55rem;
  border: 1px solid var(--primary-100);
  border-radius: 5px;
  background: var(--primary-50);
  color: var(--primary-600);
  font-size: 0.7rem;
  font-weight: 750;
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.post-follow-button:hover:not(:disabled) {
  border-color: rgb(124 195 165);
  background: var(--primary-100);
}

.post-follow-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.post-feedback-trigger {
  display: grid;
  width: 2.75rem;
  height: 2.75rem;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  transition: background-color 0.18s ease, color 0.18s ease;
}

.feed-feedback-reason-options {
  display: grid;
  gap: 0.5rem;
}

.feed-feedback-reason-options button {
  display: grid;
  gap: 0.15rem;
  min-height: 3.25rem;
  border: 1px solid var(--border-subtle);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  text-align: left;
}

.feed-feedback-reason-options button:hover,
.feed-feedback-reason-options .feed-feedback-reason-option--active {
  border-color: rgb(26 127 90);
  background: rgb(232 243 237);
}

.feed-feedback-reason-options strong {
  color: var(--text-strong);
  font-size: 0.8125rem;
  font-weight: 800;
}

.feed-feedback-reason-options span {
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1.4;
}

.feed-author-control-dialog__confirm:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.dark .feed-feedback-reason-options button {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark .feed-feedback-reason-options button:hover,
.dark .feed-feedback-reason-options .feed-feedback-reason-option--active {
  border-color: rgb(124 195 165);
  background: rgb(10 52 39 / 0.45);
}

.dark .feed-feedback-reason-options strong {
  color: var(--text-primary);
}

.dark .feed-feedback-reason-options span {
  color: var(--text-muted);
}

.post-feedback-trigger:hover {
  background: var(--surface-3);
  color: var(--text-primary);
}

.post-feedback-menu {
  position: absolute;
  right: 0;
  z-index: 20;
  width: 15.5rem;
  margin-top: 0.45rem;
  padding: 0.35rem 0;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-surface);
  background: var(--surface);
  box-shadow: 0 4px 8px rgb(16 24 40 / 0.08);
}

.content-type-pill,
.domain-badge {
  min-height: 1.2rem;
  border-radius: 4px;
  background: var(--primary-50);
  color: var(--primary-600);
  font-size: 0.6875rem;
}

.domain-badge {
  background: var(--surface-3);
  color: var(--text-muted);
}

.post-detail-link {
  gap: 0.4rem;
}

.post-detail-link h3 {
  color: var(--text-strong);
  font-size: 1.025rem;
  font-weight: 760;
  line-height: 1.5;
  text-wrap: pretty;
}

.post-detail-link p {
  max-width: 68ch;
  color: var(--text-muted);
  font-size: 0.8125rem;
  line-height: 1.72;
  text-wrap: pretty;
}

.post-detail-link:focus-visible {
  border-radius: 5px;
  box-shadow: 0 0 0 3px rgb(205 232 220 / 0.82);
}

.domain-card-media {
  border-color: var(--border-subtle);
  border-radius: 12px;
  background: var(--surface-3);
}

.post-tag-list > span {
  border: 0;
  border-radius: var(--radius-pill);
  background: var(--surface-3);
  color: var(--text-muted);
  transition:
    background-color 0.18s ease,
    color 0.18s ease;
}

.post-tag-list > span:hover {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.post-card__footer {
  margin-top: 0.9rem;
  padding-top: 0.7rem;
  border-top-color: var(--border-subtle);
  color: var(--text-muted);
}

.post-card__footer .card-action {
  min-height: 2rem;
  border-radius: var(--radius-pill);
}

.post-card__footer .card-action:hover {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.dark .post-card,
.dark .post-feedback-menu {
  border-color: var(--border-subtle);
  background: var(--surface);
}

.dark .post-card:hover {
  border-color: color-mix(in srgb, var(--primary-600) 34%, var(--border-subtle));
  background: var(--surface-raised, var(--surface));
}

.dark .post-author-badge {
  background: var(--accent-soft);
  color: var(--accent-500);
}

.dark .post-follow-button {
  border-color: color-mix(in srgb, var(--primary-600) 38%, transparent);
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.dark .post-feedback-trigger:hover,
.dark .post-card__footer .card-action:hover,
.dark .post-tag-list > span,
.dark .domain-badge {
  background: var(--surface-3);
}

.dark .post-feedback-menu,
.dark .domain-card-media {
  border-color: var(--border-subtle);
}

.dark .post-detail-link h3 {
  color: var(--text-strong);
}

.dark .post-detail-link p {
  color: var(--text-muted);
}

.dark .post-detail-link:focus-visible {
  box-shadow: 0 0 0 3px rgb(10 52 39 / 0.48);
}

.dark .post-card__footer {
  border-color: var(--border-subtle);
}

@media (max-width: 560px) {
  .post-card {
    padding: 1rem;
  }

  .post-card:first-child {
    padding-top: 1rem;
  }

  .post-author-avatar {
    width: 2.25rem;
    height: 2.25rem;
  }

  .post-card__author-row {
    align-items: flex-start;
  }

  .post-detail-link:has(.domain-card-media) {
    grid-template-columns: minmax(0, 1fr) 6rem;
  }

  .post-detail-link h3 {
    font-size: 0.95rem;
  }
}

/* ==========================================================================
   品牌对齐层（最后生效）：把历史遗留的靛蓝强调色收敛到「闻野」森绿 token
   ========================================================================== */
.feed-author-control-dialog__eyebrow {
  color: var(--brand-strong);
}

.feed-author-control-dialog__confirm {
  background: var(--primary-600);
}

.feed-author-control-dialog__confirm:hover {
  background: var(--primary-700);
}

.domain-card-chip--career,
.post-signal-note--hot,
.feed-feedback-reason-options .feed-feedback-reason-option--active {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.post-signal-note--hot,
.feed-feedback-reason-options button:hover,
.feed-feedback-reason-options .feed-feedback-reason-option--active {
  border-color: color-mix(in srgb, var(--primary-600) 30%, transparent);
}

.feed-feedback-reason-options button:hover {
  background: var(--brand-soft);
  color: var(--brand-strong);
}

.post-follow-button:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--primary-600) 40%, transparent);
  background: var(--primary-100);
  color: var(--primary-700);
}
</style>
