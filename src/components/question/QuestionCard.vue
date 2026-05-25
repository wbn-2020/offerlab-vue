<template>
  <article class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-800">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <RouterLink v-if="question.company" :to="`/companies/${encodeURIComponent(question.company)}/prep`" class="meta-chip meta-company">
        {{ question.company }}
      </RouterLink>
      <span v-if="question.position" class="meta-chip">{{ question.position }}</span>
      <span v-if="question.interviewRound" class="meta-chip">{{ question.interviewRound }}</span>
      <span class="meta-chip">{{ difficultyText(question.difficulty) }}</span>
    </div>
    <RouterLink :to="`/questions/${question.id}`" class="block">
      <h3 class="line-clamp-2 text-lg font-bold leading-snug text-slate-950 hover:text-primary-600 dark:text-slate-50">
        {{ question.questionText }}
      </h3>
      <p v-if="question.answerHint" class="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">
        {{ question.answerHint }}
      </p>
    </RouterLink>
    <div class="mt-4 flex flex-wrap gap-2">
      <span v-for="tag in question.tags.slice(0, 5)" :key="tag.id" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        {{ tag.name }}
      </span>
    </div>
    <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <span>出现 {{ question.appearCount }} 次 · 来源 {{ question.sourcePostCount || 1 }} 篇</span>
      <span v-if="question.favorite" class="text-amber-600">已收藏</span>
      <span v-else-if="question.progressStatus">{{ progressText(question.progressStatus) }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Question } from '@/api/question'

defineProps<{
  question: Question
}>()

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
</style>
