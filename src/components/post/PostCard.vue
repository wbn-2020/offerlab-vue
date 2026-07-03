<template>
  <article
    class="group rounded-xl border border-slate-200/80 bg-white/92 p-5 shadow-[var(--shadow-soft)] backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[var(--shadow-card)] dark:border-slate-800/80 dark:bg-slate-900/85 dark:hover:border-primary-800"
  >
    <div class="mb-4 flex items-center justify-between gap-4">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary-600 to-sky-500 text-sm font-black text-white shadow-sm shadow-primary-600/20">
          <img v-if="post.author.avatar" :src="post.author.avatar" :alt="post.author.nickname" class="h-full w-full object-cover" />
          <span v-else>{{ authorInitial }}</span>
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate font-semibold text-slate-900 dark:text-slate-100">{{ post.author.nickname || '未知用户' }}</span>
            <span v-if="post.author.isBigV" class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">大V</span>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{{ formatTime(post.createdAt) }}</span>
            <span class="content-type-pill">{{ contentTypeLabel }}</span>
            <span v-if="post.domain" class="domain-badge inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">
              {{ getDomainIcon(post.domain) }} {{ getDomainLabel(post.domain) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <button
          v-if="canFollowAuthor"
          type="button"
          class="rounded-full border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-primary-800 dark:bg-primary-950 dark:text-primary-300 dark:hover:bg-primary-900/50"
          :disabled="isFollowing"
          @click.prevent="handleFollow"
        >
          {{ post.author.isFollowing ? '已关注' : '关注' }}
        </button>

        <div v-if="props.showRecommendFeedback" class="relative" data-feedback-menu>
          <button
            type="button"
            class="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            aria-label="推荐反馈"
            title="推荐反馈"
            @click.prevent="showFeedbackMenu = !showFeedbackMenu"
          >
            <MoreHorizontal class="h-4 w-4" />
          </button>
          <div
            v-if="showFeedbackMenu"
            class="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            @click.prevent
          >
            <button
              v-for="item in feedbackActions"
              :key="item.action"
              type="button"
              class="feedback-menu-item"
              @click.stop.prevent="handleNotInterested(item)"
            >
              <EyeOff class="h-4 w-4" />
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
    >
      <h3
        class="mb-2 line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-100"
        v-html="displayTitle"
      />

      <p
        class="mb-4 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400"
        v-html="displaySummary"
      />

      <div v-if="showReasonPanel && displayRecommendationReasons.length" class="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/40">
          <div class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Lightbulb class="h-3.5 w-3.5" />
          {{ reasonPanelTitle }}
          </div>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="reason in displayRecommendationReasons"
            :key="reason"
            class="rounded-full bg-white px-2 py-1 text-xs text-indigo-700 dark:bg-slate-900 dark:text-indigo-200"
          >
            {{ reason }}
          </span>
        </div>
      </div>

      <div v-if="recommendationFeedbackSubmittedLabel" class="feedback-submitted-note mb-4">
        {{ recommendationFeedbackSubmittedLabel }}
      </div>

      <div v-if="hotReasonLabel || riskWarning" class="mb-4 space-y-2">
        <div v-if="hotReasonLabel" class="post-signal-note post-signal-note--hot">
          <TrendingUp class="h-3.5 w-3.5" />
          <span>{{ hotReasonLabel }}</span>
        </div>
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
        <img :src="displayCardImageUrl" :alt="domainCardSurface.imageAlt || post.title" @error="handleCardImageError" />
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

      <div v-if="visibleTags.length" class="mb-4 flex flex-wrap gap-2">
        <span v-for="tag in visibleTags" :key="tag.id" class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {{ tag.name }}
        </span>
      </div>
    </RouterLink>

    <div class="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <span class="card-action" title="浏览量">
          <Eye class="h-4 w-4" />
          <span class="action-label">浏览</span>
          {{ formatNumber(post.counter.view) }}
        </span>
        <button
          type="button"
          class="card-action hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-55"
          :aria-label="likePending ? '点赞处理中' : '点赞帖子'"
          :title="likePending ? '点赞处理中' : '点赞帖子'"
          :aria-busy="likePending"
          :disabled="likePending"
          @click.prevent="handleLike"
        >
          <Heart class="h-4 w-4" :class="post.myInteraction?.liked ? 'fill-current text-rose-600' : ''" />
          <span class="action-label">点赞</span>
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
          :aria-label="favoritePending ? '收藏处理中' : '收藏帖子'"
          :title="favoritePending ? '收藏处理中' : '收藏帖子'"
          :aria-busy="favoritePending"
          :disabled="favoritePending"
          @click.prevent="handleFavorite"
        >
          <Star class="h-4 w-4" :class="post.myInteraction?.favorited ? 'fill-current text-amber-500' : ''" />
          <span class="action-label">收藏</span>
          {{ formatNumber(post.counter.favorite) }}
        </button>
        <PostSaveOrganizer
          :post-id="post.postId"
          :favorited="Boolean(post.myInteraction?.favorited)"
          :open-after-save="Boolean(post.myInteraction?.favorited)"
          @organize="handleOrganizeSavedPost"
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
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { Eye, EyeOff, Flag, Heart, Lightbulb, MessageCircle, MoreHorizontal, ShieldAlert, Star, TrendingUp } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatTime, formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api/user'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { getContentTypeShortLabel, isLegacyInterviewType } from '@/utils/contentTypes'
import { buildDomainCardSurface } from '@/utils/domainPostSurfaces'
import { getDomainIcon, getDomainLabel } from '@/utils/domains'
import { findHighRiskContentWarning, normalizeRecommendationReason } from '@/utils/recommendationGovernance'
import { getPostUnavailableState, normalizeRiskNoticeForUsers } from '@/utils/governanceDisplay'
import type { FeedFeedbackAction } from '@/api/feed'
import PostSaveOrganizer from '@/components/post/PostSaveOrganizer.vue'

const props = defineProps<{
  post: Post
  showRecommendFeedback?: boolean
  showReasonPanel?: boolean
  likePending?: boolean
  favoritePending?: boolean
  detailQuery?: Record<string, string | number | boolean | undefined>
}>()

const emit = defineEmits<{
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
  notInterested: [postId: Post['postId'], action: FeedFeedbackAction, reason: string]
  'follow-change': [authorUid: Post['author']['uid'], following: boolean]
}>()

const authStore = useAuthStore()
const router = useRouter()
const { requireLogin } = useLoginRedirect()
const isFollowing = ref(false)
const failedImageUrl = ref('')
const showFeedbackMenu = ref(false)
const recommendationFeedbackSubmittedLabel = ref('')
const feedbackActions: Array<{
  action: FeedFeedbackAction
  label: string
  reason: string
  description: string
}> = [
  {
    action: 'not_interested',
    label: '不感兴趣',
    reason: 'not_relevant',
    description: '记录这次反馈，并隐藏当前内容。',
  },
  {
    action: 'less_like_this',
    label: '少看此类',
    reason: 'less_like_this',
    description: '记录偏好线索，暂不表示已改变后续推荐。',
  },
  {
    action: 'hide_author',
    label: '少看作者',
    reason: 'less_from_author',
    description: '记录作者相关反馈，不等同于举报或拉黑。',
  },
  {
    action: 'more_like_this',
    label: '更多类似',
    reason: 'more_like_this',
    description: '记录这次反馈，不会立即改变当前列表。',
  },
]

const authorInitial = computed(() => props.post.author.nickname?.charAt(0) || '?')
const authorUid = computed(() => String(props.post.author.uid ?? ''))
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(props.post.author.uid))
const isAnonymousMaskedAuthor = computed(() => Boolean(props.post.anonymous)
  && (authorUid.value === '' || authorUid.value === '0' || props.post.author.profileVisible === false))
const canFollowAuthor = computed(() => !isOwnPost.value
  && !isAnonymousMaskedAuthor.value
  && props.post.author.profileVisible !== false
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
const reasonPanelTitle = computed(() => isSearchContext.value ? '命中说明' : '为什么推荐')
const showReasonPanel = computed(() => props.showReasonPanel || props.showRecommendFeedback)
const detailTo = computed(() => ({
  path: `/post/${props.post.postId}`,
  query: normalizedDetailQuery.value,
}))
const reportTo = computed(() => ({
  path: `/post/${props.post.postId}`,
  query: { ...normalizedDetailQuery.value, report: 'post' },
}))
const contentTypeLabel = computed(() => getContentTypeShortLabel(props.post.postType))
const isLegacyInterview = computed(() => isLegacyInterviewType(props.post.postType))
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
const riskWarning = computed(() => normalizeRiskNoticeForUsers(findHighRiskContentWarning([
  props.post.title,
  props.post.summary,
  props.post.content,
  props.post.tags.map((tag) => tag.name).join(' '),
].filter(Boolean).join(' '))))
const cardUnavailableState = computed(() => getPostUnavailableState(props.post))
const hotReasonLabel = computed(() => {
  const reasons = props.post.recommendationReasons || []
  const normalizedReason = reasons.map(normalizeRecommendationReason).find(Boolean)
  const commentCount = Number(props.post.counter?.comment || 0)
  const favoriteCount = Number(props.post.counter?.favorite || 0)
  const likeCount = Number(props.post.counter?.like || 0)
  if (commentCount > 0) return `热榜理由：近期有 ${formatNumber(commentCount)} 条讨论`
  if (favoriteCount > 0) return `热榜理由：同频道有 ${formatNumber(favoriteCount)} 次收藏`
  if (likeCount > 0) return `上升理由：社区成员有 ${formatNumber(likeCount)} 次认可`
  return normalizedReason ? `${isSearchContext.value ? '命中说明' : '推荐理由'}：${normalizedReason}` : ''
})
const displayRecommendationReasons = computed(() => {
  const reasons = props.post.recommendationReasons || []
  return reasons
    .map(normalizeRecommendationReason)
    .filter(Boolean)
    .slice(0, 3)
})

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

const handleOrganizeSavedPost = () => {
  if (!requireLogin()) return
  toast.success('已记录到本机整理入口；独立清单后端未接入时不会跨设备同步。')
}

const handleReport = () => {
  if (!requireLogin()) return
  router.push(reportTo.value)
}

const handleCardImageError = () => {
  failedImageUrl.value = domainCardSurface.value.imageUrl || ''
}

const handleNotInterested = (item: typeof feedbackActions[number]) => {
  if (!requireLogin()) return
  showFeedbackMenu.value = false
  recommendationFeedbackSubmittedLabel.value = `已记录：${item.label}`
  emit('notInterested', props.post.postId, item.action, item.reason)
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
  } catch (error: any) {
    toast.error(getErrorMessage(error, '关注操作失败'))
  } finally {
    isFollowing.value = false
  }
}
</script>

<style scoped>
.feedback-menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  color: rgb(71 85 105);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.feedback-menu-item:hover {
  background: rgb(248 250 252);
  color: rgb(15 23 42);
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
  color: rgb(100 116 139);
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
  background: rgb(239 246 255);
  padding: 0.1rem 0.45rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.domain-card-media {
  overflow: hidden;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
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
  background: rgb(236 254 255);
  color: rgb(14 116 144);
}

.domain-card-chip--career {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
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
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem 0.85rem;
  color: rgb(71 85 105);
  font-size: 0.82rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.governance-card-unavailable strong {
  color: rgb(15 23 42);
  font-size: 0.86rem;
}

.post-signal-note--hot {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255 / 0.72);
  color: rgb(67 56 202);
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
  background: rgb(248 250 252);
}

.post-detail-link {
  display: block;
  border-radius: 0.75rem;
  outline: none;
}

.post-detail-link:focus-visible {
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.85);
}

:deep(.search-highlight) {
  border-radius: 0.25rem;
  background: rgb(254 240 138);
  padding: 0 0.15rem;
  color: rgb(113 63 18);
}

.dark .feedback-menu-item {
  color: rgb(203 213 225);
}

.dark .feedback-menu-item:hover {
  background: rgb(30 41 59);
  color: rgb(248 250 252);
}

.dark .feedback-menu-item small {
  color: rgb(148 163 184);
}

.dark .feedback-submitted-note {
  border-color: rgb(21 128 61 / 0.58);
  background: rgb(20 83 45 / 0.22);
  color: rgb(134 239 172);
}

.dark .card-action:hover {
  background: rgb(30 41 59);
}

.dark .domain-card-media {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
}

.dark .domain-card-chip--tech {
  background: rgb(22 78 99 / 0.45);
  color: rgb(103 232 249);
}

.dark .domain-card-chip--career {
  background: rgb(49 46 129 / 0.5);
  color: rgb(199 210 254);
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
  border-color: rgb(67 56 202 / 0.64);
  background: rgb(49 46 129 / 0.42);
  color: rgb(199 210 254);
}

.dark .post-signal-note--risk {
  border-color: rgb(154 52 18 / 0.82);
  background: rgb(67 20 7 / 0.45);
  color: rgb(253 186 116);
}

.dark .governance-card-unavailable {
  border-color: rgb(51 65 85);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

.dark .governance-card-unavailable strong {
  color: rgb(248 250 252);
}

.dark :deep(.search-highlight) {
  background: rgb(133 77 14);
  color: rgb(254 243 199);
}
</style>
