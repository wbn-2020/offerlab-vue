<template>
  <article class="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-primary-800">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <RouterLink v-if="question.company" :to="`/companies/${encodeURIComponent(question.company)}/prep`" class="meta-chip meta-company">
        {{ question.company }}
      </RouterLink>
      <span v-if="question.position" class="meta-chip">{{ question.position }}</span>
      <span v-if="question.interviewRound" class="meta-chip">{{ question.interviewRound }}</span>
      <span class="meta-chip">{{ difficultyText(question.difficulty) }}</span>
    </div>
    <RouterLink :to="`/questions/${question.id}`" class="block">
      <h3
        class="line-clamp-2 text-lg font-bold leading-snug text-slate-950 hover:text-primary-600 dark:text-slate-50"
        v-html="displayQuestionText"
      >
      </h3>
      <p
        v-if="question.answerHint || question.highlightAnswerHint"
        class="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400"
        v-html="displayAnswerHint"
      >
      </p>
      <p
        v-if="question.examPoint || question.highlightExamPoint"
        class="mt-3 line-clamp-1 text-xs font-bold text-primary-600 dark:text-primary-300"
        v-html="displayExamPoint"
      >
      </p>
    </RouterLink>
    <div class="mt-4 flex flex-wrap gap-2">
      <span v-for="tag in question.tags.slice(0, 5)" :key="tag.id" class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/45 dark:text-slate-300">
        {{ tag.name }}
      </span>
    </div>
    <div class="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <div class="flex min-w-0 flex-wrap gap-2">
        <span class="signal-chip signal-strong">{{ frequencyText }}</span>
        <span class="signal-chip">质量 {{ question.qualityScore || 0 }}</span>
        <span v-if="question.canonicalId && String(question.canonicalId) !== String(question.id)" class="signal-chip">同题组</span>
      </div>
      <span v-if="question.mistakeReason" class="shrink-0 text-rose-600">{{ mistakeReasonText(question.mistakeReason) }}</span>
      <span v-else-if="question.favorite" class="shrink-0 text-amber-600">已收藏</span>
      <span v-else-if="effectiveProgressStatus" class="shrink-0">{{ progressText(effectiveProgressStatus) }}</span>
      <button
        type="button"
        class="review-action shrink-0"
        :disabled="isAddingReview || isReviewQueued"
        @click.stop.prevent="addToReviewQueue"
      >
        {{ isReviewQueued ? '已在复习' : (isAddingReview ? '加入中...' : '加入复习') }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'
import { questionApi } from '@/api/question'
import type { Question } from '@/api/question'
import { useLoginRedirect } from '@/composables/useLoginRedirect'

const props = defineProps<{
  question: Question
}>()

const emit = defineEmits<{
  'review-added': [questionId: Question['id']]
}>()

const { requireLogin } = useLoginRedirect()
const isAddingReview = ref(false)
const localProgressStatus = ref<Question['progressStatus'] | undefined>()

watch(() => props.question.id, () => {
  localProgressStatus.value = undefined
})

const effectiveProgressStatus = computed(() => localProgressStatus.value || props.question.progressStatus)
const isReviewQueued = computed(() => effectiveProgressStatus.value === 'review')
const displayQuestionText = computed(() => renderSearchHighlight(props.question.highlightQuestionText, props.question.questionText))
const displayAnswerHint = computed(() => renderSearchHighlight(props.question.highlightAnswerHint, props.question.answerHint || ''))
const displayExamPoint = computed(() => `考察点：${renderSearchHighlight(props.question.highlightExamPoint, props.question.examPoint || '')}`)

const frequencyText = computed(() => {
  const count = Math.max(1, props.question.sourcePostCount || props.question.appearCount || 1)
  return count > 1 ? `高频 ${count} 篇` : '单篇来源'
})

const difficultyText = (value?: string) => {
  const map: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  }
  return map[value || ''] || '中等'
}

const progressText = (value?: string) => {
  const map: Record<string, string> = {
    todo: '待学习',
    learning: '学习中',
    mastered: '已掌握',
    review: '待复习',
  }
  return map[value || ''] || value || ''
}

const mistakeReasonText = (value?: string) => {
  const map: Record<string, string> = {
    concept: '概念不熟',
    project: '项目表达弱',
    memory: '需要记忆',
    expression: '表达不清',
    careless: '粗心失误',
    other: '其他错因',
  }
  return map[value || ''] || '已标错因'
}

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
    .replace(/&lt;em&gt;/g, '<mark class="question-search-highlight">')
    .replace(/&lt;\/em&gt;/g, '</mark>')
}

const addToReviewQueue = async () => {
  if (isReviewQueued.value || isAddingReview.value) return
  if (!requireLogin()) return
  isAddingReview.value = true
  try {
    await questionApi.updateProgress(props.question.id, 'review')
    localProgressStatus.value = 'review'
    emit('review-added', props.question.id)
    toast.success('已加入今日复习')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '加入复习失败'))
  } finally {
    isAddingReview.value = false
  }
}
</script>

<style scoped>
.meta-chip {
  border-radius: 999px;
  background: rgb(248 250 252);
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(71 85 105);
}

.meta-company {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}

:global(.dark) .meta-chip {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

:global(.dark) .meta-company {
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}

.signal-chip {
  border-radius: 999px;
  background: rgb(241 245 249);
  padding: 0.2rem 0.5rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.signal-strong {
  background: rgb(236 253 245);
  color: rgb(4 120 87);
}

.review-action {
  min-height: 1.75rem;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.2rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(29 78 216);
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.review-action:hover:not(:disabled) {
  border-color: rgb(96 165 250);
  background: rgb(219 234 254);
  color: rgb(30 64 175);
}

.review-action:disabled {
  cursor: default;
  opacity: 0.65;
}

:global(.dark) .signal-chip {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

:global(.dark) .signal-strong {
  background: rgb(6 78 59);
  color: rgb(167 243 208);
}

:global(.dark) .review-action {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

:deep(.question-search-highlight) {
  border-radius: 0.25rem;
  background: rgb(254 240 138);
  padding: 0 0.12rem;
  color: rgb(113 63 18);
}

:global(.dark) :deep(.question-search-highlight) {
  background: rgb(133 77 14);
  color: rgb(254 243 199);
}
</style>
