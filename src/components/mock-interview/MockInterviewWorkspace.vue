<template>
  <div v-if="!session" class="panel flex min-h-[420px] flex-col items-center justify-center text-center">
    <h2 class="text-xl font-black text-slate-950 dark:text-slate-50">选择条件后开始练习</h2>
    <p class="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
      建议面试前按目标公司或岗位抽 5 题，回答后给每题打 0-5 分，最后看总分和复盘。
    </p>
  </div>

  <div v-else class="space-y-4">
    <section class="panel">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-black text-slate-950 dark:text-slate-50">{{ sessionTitle(session) }}</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {{ session.status === 'completed' ? '已完成复盘' : '进行中' }} · {{ session.answers.length }} 题
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="secondary-action" @click="$emit('copy-report')">
            <Copy class="h-4 w-4" aria-hidden="true" />
            复制复盘报告
          </button>
          <button type="button" class="secondary-action" @click="$emit('download-report')">
            <Download class="h-4 w-4" aria-hidden="true" />
            下载复盘报告
          </button>
          <button
            v-if="session.status === 'completed' && answerCardCount > 0"
            type="button"
            class="secondary-action"
            :disabled="isSavingAnswerCards"
            @click="$emit('save-answer-cards')"
          >
            {{ isSavingAnswerCards ? '沉淀中...' : `沉淀 ${answerCardCount} 张回答卡` }}
          </button>
          <button
            v-if="session.status === 'completed' && aiReviewFailedCount > 0"
            type="button"
            class="secondary-action"
            :disabled="isRetryingAiReview"
            @click="$emit('retry-ai-review')"
          >
            {{ isRetryingAiReview ? '重试中...' : `重试 AI 评价 ${aiReviewFailedCount}` }}
          </button>
          <div class="timer-card">
            <span>用时</span>
            <strong>{{ elapsedText }}</strong>
          </div>
        </div>
      </div>
    </section>

    <article
      v-for="answer in session.answers"
      :key="answer.questionId"
      class="panel"
    >
      <div class="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
        <span class="question-index">Q{{ answer.sequenceNo }}</span>
        <span v-if="answerMetaParts(answer)[0]">{{ answerMetaParts(answer)[0] }}</span>
        <span v-if="answerMetaParts(answer)[1]">{{ answerMetaParts(answer)[1] }}</span>
        <span v-if="answerMetaParts(answer)[3]">{{ difficultyText(answerMetaParts(answer)[3]) }}</span>
      </div>
      <h3 class="text-lg font-black leading-7 text-slate-950 dark:text-slate-50">{{ answerQuestionText(answer) }}</h3>
      <p v-if="answerHintText(answer)" class="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        {{ answerHintText(answer) }}
      </p>

      <div class="mt-4 grid gap-3 lg:grid-cols-[1fr_160px]">
        <label class="field-label">
          我的回答
          <textarea
            v-model="draftAnswers[String(answer.questionId)].answerText"
            class="answer-input"
            rows="5"
            maxlength="4000"
            :disabled="session.status === 'completed'"
            placeholder="先按面试口吻完整回答，再补充项目场景和权衡。"
          />
        </label>
        <label class="field-label">
          自评分
          <select v-model.number="draftAnswers[String(answer.questionId)].score" class="field-input" :disabled="session.status === 'completed'">
            <option :value="0">0 分</option>
            <option :value="1">1 分</option>
            <option :value="2">2 分</option>
            <option :value="3">3 分</option>
            <option :value="4">4 分</option>
            <option :value="5">5 分</option>
          </select>
        </label>
      </div>
      <label class="field-label mt-3">
        复盘备注
        <input
          v-model="draftAnswers[String(answer.questionId)].selfReview"
          class="field-input"
          maxlength="1000"
          :disabled="session.status === 'completed'"
          placeholder="例如：定义清楚了，但项目例子不够具体。"
        />
      </label>

      <div v-if="answer.aiReviewStatus === 'PENDING'" class="ai-review-box ai-review-pending">
        <div class="ai-review-head">
          <span>AI 评价生成中</span>
          <strong>Pending</strong>
        </div>
        <p class="ai-review-message">复盘任务已进入队列，页面会自动刷新结果。</p>
      </div>
      <div v-else-if="answer.aiReviewStatus === 'FAILED'" class="ai-review-box ai-review-failed">
        <div class="ai-review-head">
          <span>AI 评价失败</span>
          <strong>Failed</strong>
        </div>
        <p class="ai-review-message">{{ answer.aiReviewError || 'AI 评价暂时不可用，可以稍后重试。' }}</p>
      </div>
      <div v-else-if="answer.aiReviewed || answer.aiReviewStatus === 'SUCCEEDED'" class="ai-review-box">
        <div class="ai-review-head">
          <span>AI 评价</span>
          <strong>{{ answer.aiScore ?? 0 }} / 5</strong>
        </div>
        <div class="ai-review-grid">
          <div>
            <span>完整度</span>
            <p>{{ answer.aiCompleteness || '暂无评价' }}</p>
          </div>
          <div>
            <span>项目表达</span>
            <p>{{ answer.aiProjectExpression || '暂无评价' }}</p>
          </div>
          <div>
            <span>追问建议</span>
            <p>{{ answer.aiFollowUpSuggestion || '暂无建议' }}</p>
          </div>
        </div>
      </div>
    </article>

    <section class="panel space-y-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-black text-slate-950 dark:text-slate-50">本场结果</h2>
          <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
            已答 {{ answeredCount }} / {{ session.questionCount }} 题，当前 {{ totalScore }} 分
          </p>
        </div>
        <button
          type="button"
          class="primary-action"
          :disabled="isSubmitting || session.status === 'completed'"
          @click="$emit('submit')"
        >
          {{ session.status === 'completed' ? '已提交' : isSubmitting ? '提交中...' : '提交复盘' }}
        </button>
      </div>
      <label v-if="session.status !== 'completed'" class="ai-toggle-row">
        <input
          type="checkbox"
          :checked="aiReviewEnabled"
          @change="$emit('toggle-ai-review', ($event.target as HTMLInputElement).checked)"
        />
        <span>提交后生成 AI 评价</span>
        <small>未配置 AI 时会使用规则评价，仍可关闭。</small>
      </label>
      <div class="review-box">
        <div class="review-head">
          <span>复盘建议</span>
          <strong>{{ reviewSuggestions.length }}</strong>
        </div>
        <ul class="review-list">
          <li v-for="item in reviewSuggestions" :key="item.title">
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
            <small>{{ item.action }}</small>
          </li>
        </ul>
      </div>
      <div v-if="weakQuestionCount > 0" class="weak-review-box">
        <div>
          <strong>{{ weakQuestionCount }} 道低分题建议加入待复习</strong>
          <p>把本场 0-2 分题同步到题库复习清单，后续可以在“只看待复习”里集中补齐。</p>
        </div>
        <button
          type="button"
          class="secondary-action"
          :disabled="isMarkingWeakQuestions"
          @click="$emit('mark-weak-questions-review')"
        >
          {{ isMarkingWeakQuestions ? '加入中...' : '加入待复习' }}
        </button>
      </div>
      <div v-if="session.status === 'completed'" class="learning-loop-box">
        <div>
          <strong>下一步</strong>
          <p>把本场复盘回流到准备台，再集中处理待复习题或继续专项模拟。</p>
        </div>
        <div class="learning-loop-actions">
          <RouterLink to="/me/prep" class="secondary-action">查看准备台</RouterLink>
          <RouterLink to="/questions?progressStatus=review&sort=latest" class="secondary-action">查看待复习题库</RouterLink>
          <RouterLink :to="nextMockInterviewLink" class="primary-action">继续专项练习</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Copy, Download } from 'lucide-vue-next'
import type { MockInterviewSession } from '@/api/question'
import { answerHintText, answerMetaParts, answerQuestionText, difficultyText, sessionTitle, type MockInterviewReviewSuggestion } from '@/utils/mockInterviewFormat'

type DraftAnswer = { answerText: string; selfReview: string; score: number }

const props = defineProps<{
  session: MockInterviewSession | null
  draftAnswers: Record<string, DraftAnswer>
  elapsedText: string
  answeredCount: number
  totalScore: number
  reviewSuggestions: MockInterviewReviewSuggestion[]
  weakQuestionCount: number
  answerCardCount: number
  isSubmitting: boolean
  aiReviewEnabled: boolean
  isMarkingWeakQuestions: boolean
  isSavingAnswerCards: boolean
  isRetryingAiReview: boolean
}>()

defineEmits<{
  'copy-report': []
  'download-report': []
  'toggle-ai-review': [enabled: boolean]
  'mark-weak-questions-review': []
  'save-answer-cards': []
  'retry-ai-review': []
  submit: []
}>()

const aiReviewFailedCount = computed(() => props.session?.answers.filter((answer) => answer.aiReviewStatus === 'FAILED').length || 0)
const nextMockInterviewLink = computed(() => ({
  path: '/mock-interview',
  query: {
    company: props.session?.company || undefined,
    position: props.session?.position || undefined,
    focusTag: props.session?.focusTag || undefined,
    questionCount: props.session?.questionCount || 5,
  },
}))
</script>

<style scoped>
.panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgb(71 85 105);
}

.field-input,
.answer-input {
  margin-top: 0.45rem;
  width: 100%;
  border-radius: 0.65rem;
  border: 1px solid rgb(203 213 225);
  background: rgb(248 250 252);
  padding: 0.75rem 0.85rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
  outline: none;
}

.answer-input {
  resize: vertical;
  line-height: 1.7;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.65rem;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 800;
}

.primary-action {
  background: rgb(37 99 235);
  color: white;
}

.secondary-action {
  border: 1px solid rgb(226 232 240);
  background: white;
  color: rgb(51 65 85);
}

.timer-card {
  min-width: 108px;
  border-radius: 0.75rem;
  background: rgb(239 246 255);
  padding: 0.8rem 1rem;
  text-align: center;
}

.timer-card span {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(37 99 235);
}

.timer-card strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.35rem;
  font-weight: 900;
  color: rgb(30 64 175);
}

.question-index {
  border-radius: 999px;
  background: rgb(219 234 254);
  padding: 0.25rem 0.55rem;
  color: rgb(30 64 175);
}

.review-box {
  border-radius: 0.75rem;
  border: 1px solid rgb(219 234 254);
  background: rgb(248 250 252);
  padding: 1rem;
}

.ai-toggle-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.55rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.85rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(30 64 175);
}

.ai-toggle-row input {
  height: 1rem;
  width: 1rem;
  accent-color: rgb(37 99 235);
}

.ai-toggle-row small {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(37 99 235);
}

.ai-review-box {
  margin-top: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 1rem;
}

.ai-review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.875rem;
  font-weight: 900;
  color: rgb(30 64 175);
}

.ai-review-head strong {
  border-radius: 999px;
  background: white;
  padding: 0.15rem 0.6rem;
}

.ai-review-pending {
  border-color: rgb(253 224 71);
  background: rgb(254 252 232);
}

.ai-review-failed {
  border-color: rgb(254 205 211);
  background: rgb(255 241 242);
}

.ai-review-message {
  margin-top: 0.65rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.ai-review-grid {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.75rem;
}

.ai-review-grid div {
  border-radius: 0.65rem;
  background: white;
  padding: 0.8rem;
}

.ai-review-grid span {
  display: block;
  font-size: 0.75rem;
  font-weight: 900;
  color: rgb(37 99 235);
}

.ai-review-grid p {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(51 65 85);
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 900;
  color: rgb(30 64 175);
}

.review-head strong {
  border-radius: 999px;
  background: rgb(219 234 254);
  padding: 0.1rem 0.5rem;
}

.review-list {
  margin-top: 0.75rem;
  display: grid;
  gap: 0.75rem;
}

.review-list li {
  list-style: none;
  border-radius: 0.65rem;
  background: white;
  padding: 0.8rem;
}

.review-list strong {
  display: block;
  font-size: 0.9rem;
  color: rgb(15 23 42);
}

.review-list p {
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: rgb(71 85 105);
}

.review-list small {
  margin-top: 0.35rem;
  display: block;
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgb(37 99 235);
}

.weak-review-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(254 205 211);
  background: rgb(255 241 242);
  padding: 1rem;
}

.weak-review-box strong {
  display: block;
  font-size: 0.9rem;
  color: rgb(159 18 57);
}

.weak-review-box p {
  margin-top: 0.25rem;
  max-width: 34rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgb(136 19 55);
}

.learning-loop-box {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 1rem;
}

.learning-loop-box strong {
  display: block;
  font-size: 0.9rem;
  color: rgb(30 64 175);
}

.learning-loop-box p {
  margin-top: 0.25rem;
  max-width: 34rem;
  font-size: 0.8rem;
  line-height: 1.6;
  color: rgb(30 64 175);
}

.learning-loop-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

:global(.dark) .panel,
:global(.dark) .secondary-action {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .field-input,
:global(.dark) .answer-input {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23);
  color: rgb(248 250 252);
}

:global(.dark) .review-box {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .ai-toggle-row,
:global(.dark) .ai-review-box {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

:global(.dark) .ai-toggle-row small,
:global(.dark) .ai-review-grid span {
  color: rgb(147 197 253);
}

:global(.dark) .ai-review-head {
  color: rgb(191 219 254);
}

:global(.dark) .ai-review-head strong,
:global(.dark) .ai-review-grid div {
  background: rgb(2 6 23);
}

:global(.dark) .ai-review-grid p {
  color: rgb(203 213 225);
}

:global(.dark) .ai-review-message {
  color: rgb(203 213 225);
}

:global(.dark) .review-list li {
  background: rgb(15 23 42);
}

:global(.dark) .review-list strong {
  color: rgb(248 250 252);
}

:global(.dark) .review-list p {
  color: rgb(203 213 225);
}

:global(.dark) .weak-review-box {
  border-color: rgb(136 19 55);
  background: rgb(76 5 25);
}

:global(.dark) .learning-loop-box {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
}

:global(.dark) .weak-review-box strong {
  color: rgb(255 228 230);
}

:global(.dark) .weak-review-box p {
  color: rgb(253 164 175);
}

:global(.dark) .learning-loop-box strong,
:global(.dark) .learning-loop-box p {
  color: rgb(191 219 254);
}
</style>
