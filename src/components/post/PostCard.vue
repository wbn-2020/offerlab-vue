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
          v-if="!isOwnPost"
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
            class="absolute right-0 z-20 mt-2 w-44 rounded-lg border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900"
            @click.prevent
          >
            <button
              v-for="reason in feedbackReasons"
              :key="reason.value"
              type="button"
              class="feedback-menu-item"
              @click.stop.prevent="handleNotInterested(reason.value)"
            >
              <EyeOff class="h-4 w-4" />
              <span>{{ reason.label }}</span>
            </button>
          </div>
        </div>
      </div>
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

      <div v-if="props.showRecommendFeedback && displayRecommendationReasons.length" class="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/70 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/40">
        <div class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
          <Lightbulb class="h-3.5 w-3.5" />
          为什么推荐
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

      <div v-if="post.extension" class="mb-3 flex flex-wrap gap-2">
        <span v-if="post.extension.difficulty" class="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {{ post.extension.difficulty }}
        </span>
        <span v-if="post.extension.scenario" class="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
          {{ post.extension.scenario }}
        </span>
        <span v-for="stack in visibleTechStacks" :key="stack" class="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">
          {{ stack }}
        </span>
        <span v-if="isLegacyInterview && post.extension.company" class="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {{ post.extension.company }}
        </span>
        <span v-if="isLegacyInterview && post.extension.position" class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
          {{ post.extension.position }}
        </span>
        <span v-if="isLegacyInterview && post.extension.interviewResult" class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="getResultClass(post.extension.interviewResult)">
          {{ getResultText(post.extension.interviewResult) }}
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
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Eye, EyeOff, Heart, Lightbulb, MessageCircle, MoreHorizontal, Star } from 'lucide-vue-next'
import type { Post } from '@/api/types'
import { formatTime, formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth'
import { userApi } from '@/api/user'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { useLoginRedirect } from '@/composables/useLoginRedirect'
import { getContentTypeShortLabel, isLegacyInterviewType } from '@/utils/contentTypes'
import { getDomainIcon, getDomainLabel } from '@/utils/domains'

const props = defineProps<{
  post: Post
  showRecommendFeedback?: boolean
  likePending?: boolean
  favoritePending?: boolean
  detailQuery?: Record<string, string | number | boolean | undefined>
}>()

const emit = defineEmits<{
  like: [postId: Post['postId']]
  favorite: [postId: Post['postId']]
  notInterested: [postId: Post['postId'], reason: string]
  'follow-change': [authorUid: Post['author']['uid'], following: boolean]
}>()

const authStore = useAuthStore()
const { requireLogin } = useLoginRedirect()
const isFollowing = ref(false)
const showFeedbackMenu = ref(false)
const feedbackReasons = [
  { value: 'irrelevant', label: '内容不相关' },
  { value: 'seen', label: '已经看过' },
  { value: 'low_quality', label: '质量不高' },
]

const authorInitial = computed(() => props.post.author.nickname?.charAt(0) || '?')
const isOwnPost = computed(() => String(authStore.user?.uid ?? '') === String(props.post.author.uid))
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
const detailTo = computed(() => ({
  path: `/post/${props.post.postId}`,
  query: normalizedDetailQuery.value,
}))
const contentTypeLabel = computed(() => getContentTypeShortLabel(props.post.postType))
const isLegacyInterview = computed(() => isLegacyInterviewType(props.post.postType))
const visibleTechStacks = computed(() => Array.isArray(props.post.extension?.techStacks)
  ? props.post.extension.techStacks.map(String).filter(Boolean).slice(0, 3)
  : [])
const visibleTags = computed(() => props.post.tags.slice(0, 4))
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

const normalizeRecommendationReason = (reason: string) => {
  const text = reason.trim()
  if (!text) return ''
  if (/目标公司|公司偏好|匹配.*公司|相似公司|目标岗位|岗位偏好|匹配.*岗位/.test(text)) {
    return '贴近你的技术方向'
  }
  if (/面试|求职|Offer|offer/.test(text)) {
    return '来自可复用工程经验'
  }
  if (/AI|智能/.test(text)) {
    return '基于规则和内容信号推荐'
  }
  return text
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

const handleNotInterested = (reason: string) => {
  if (!requireLogin()) return
  showFeedbackMenu.value = false
  emit('notInterested', props.post.postId, reason)
}

const handleFollow = async () => {
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

.dark .card-action:hover {
  background: rgb(30 41 59);
}

.dark :deep(.search-highlight) {
  background: rgb(133 77 14);
  color: rgb(254 243 199);
}
</style>
