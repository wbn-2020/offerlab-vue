<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">Question Ops</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">题目审核</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            维护结构化面试题的可见性、质量和核心字段，保存后会同步题库索引。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="secondary-button" :disabled="isLoading" @click="loadQuestions">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
            刷新
          </button>
        </div>
      </section>

      <section class="mb-6 grid gap-4 md:grid-cols-4">
        <div class="metric-card"><span>全部</span><strong>{{ summary.total }}</strong></div>
        <div class="metric-card"><span>待审核</span><strong>{{ summary.pending }}</strong></div>
        <div class="metric-card"><span>已通过</span><strong>{{ summary.approved }}</strong></div>
        <div class="metric-card"><span>已隐藏</span><strong>{{ summary.hidden }}</strong></div>
      </section>

      <section class="mb-4 flex flex-wrap gap-2">
        <button
          v-for="item in statusFilters"
          :key="item.label"
          type="button"
          :class="['filter-button', statusFilter === item.value ? 'filter-button-active' : '']"
          @click="setStatus(item.value)"
        >
          {{ item.label }}
        </button>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1fr_420px]">
        <article class="panel">
          <div v-if="isLoading" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载题目...
          </div>
          <EmptyState v-else-if="questions.length === 0" title="暂无题目" description="当前筛选条件下没有需要维护的题目。" />
          <div v-else class="space-y-3">
            <button
              v-for="question in questions"
              :key="question.id"
              type="button"
              :class="['question-row', selectedQuestion?.id === question.id ? 'question-row-active' : '']"
              @click="selectQuestion(question)"
            >
              <div class="min-w-0 flex-1 text-left">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span :class="['status-pill', statusClass(question.status)]">{{ statusText(question.status) }}</span>
                  <span v-if="question.company" class="meta-chip">{{ question.company }}</span>
                  <span v-if="question.position" class="meta-chip">{{ question.position }}</span>
                  <span class="meta-chip">{{ difficultyText(question.difficulty) }}</span>
                </div>
                <h2 class="line-clamp-2 font-semibold text-slate-950 dark:text-slate-50">{{ question.questionText }}</h2>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  来源帖子 {{ question.sourcePostId || '--' }} · 质量分 {{ question.qualityScore || 0 }} · 出现 {{ question.appearCount || 0 }} 次
                </p>
              </div>
            </button>
          </div>
          <div class="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <span class="text-slate-500">第 {{ page }} 页 · 共 {{ total }} 条</span>
            <div class="flex gap-2">
              <button type="button" class="secondary-button compact" :disabled="page <= 1 || isLoading" @click="goPage(page - 1)">上一页</button>
              <button type="button" class="secondary-button compact" :disabled="!hasMore || isLoading" @click="goPage(page + 1)">下一页</button>
            </div>
          </div>
        </article>

        <aside class="panel h-fit">
          <EmptyState v-if="!selectedQuestion" title="选择题目" description="从左侧列表选择一条题目后可编辑或审核。" />
          <form v-else class="space-y-4" @submit.prevent="saveQuestion">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">编辑题目</h2>
              <RouterLink v-if="selectedQuestion.sourcePostId" :to="`/post/${selectedQuestion.sourcePostId}`" class="text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400">
                查看来源
              </RouterLink>
            </div>
            <label class="field-label">题目正文<textarea v-model.trim="form.questionText" class="field-input min-h-[120px]" /></label>
            <label class="field-label">参考思路<textarea v-model.trim="form.answerHint" class="field-input min-h-[100px]" /></label>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="field-label">公司<input v-model.trim="form.company" class="field-input" /></label>
              <label class="field-label">岗位<input v-model.trim="form.position" class="field-input" /></label>
              <label class="field-label">轮次<input v-model.trim="form.interviewRound" class="field-input" /></label>
              <label class="field-label">难度<select v-model="form.difficulty" class="field-input"><option value="easy">简单</option><option value="medium">中等</option><option value="hard">困难</option></select></label>
            </div>
            <label class="field-label">状态<select v-model.number="form.status" class="field-input"><option :value="0">待审核</option><option :value="1">通过</option><option :value="2">隐藏</option></select></label>
            <div class="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
              <button type="submit" class="primary-button" :disabled="isSaving || form.questionText.length < 4">保存</button>
              <button type="button" class="secondary-button" :disabled="isSaving" @click="quickReview(1)">通过</button>
              <button type="button" class="secondary-button danger-action" :disabled="isSaving" @click="quickReview(2)">隐藏</button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { opsApi } from '@/api/ops'
import type { Question } from '@/api/question'

const statusFilters = [
  { label: '待审核', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已隐藏', value: 2 },
  { label: '全部', value: undefined },
]

const questions = ref<Question[]>([])
const selectedQuestion = ref<Question | null>(null)
const statusFilter = ref<number | undefined>(0)
const isLoading = ref(false)
const isSaving = ref(false)
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(false)
const summary = reactive({ total: 0, pending: 0, approved: 0, hidden: 0 })
const form = reactive({ questionText: '', answerHint: '', company: '', position: '', interviewRound: '', difficulty: 'medium', status: 1 })

const loadSummary = async () => {
  const res = await opsApi.questionSummary()
  Object.assign(summary, res.data || { total: 0, pending: 0, approved: 0, hidden: 0 })
}

const loadQuestions = async () => {
  isLoading.value = true
  try {
    const [pageRes] = await Promise.all([
      opsApi.pageQuestions({ status: statusFilter.value, page: page.value, pageSize }),
      loadSummary(),
    ])
    questions.value = pageRes.data?.items || []
    total.value = pageRes.data?.total || 0
    hasMore.value = Boolean(pageRes.data?.hasMore)
    if (selectedQuestion.value) {
      const refreshed = questions.value.find((item) => item.id === selectedQuestion.value?.id)
      if (refreshed) selectQuestion(refreshed)
    }
  } catch (error: any) {
    toast.error(error?.message || '题目列表加载失败')
    questions.value = []
  } finally {
    isLoading.value = false
  }
}

const setStatus = async (value?: number) => {
  statusFilter.value = value
  selectedQuestion.value = null
  page.value = 1
  await loadQuestions()
}

const goPage = async (next: number) => {
  page.value = Math.max(1, next)
  selectedQuestion.value = null
  await loadQuestions()
}

const selectQuestion = (question: Question) => {
  selectedQuestion.value = question
  form.questionText = question.questionText || ''
  form.answerHint = question.answerHint || ''
  form.company = question.company || ''
  form.position = question.position || ''
  form.interviewRound = question.interviewRound || ''
  form.difficulty = question.difficulty || 'medium'
  form.status = question.status ?? 1
}

const saveQuestion = async () => {
  if (!selectedQuestion.value) return
  isSaving.value = true
  try {
    const res = await opsApi.updateQuestion(selectedQuestion.value.id, { ...form })
    toast.success('题目已保存')
    if (res.data) selectQuestion(res.data)
    await loadQuestions()
  } catch (error: any) {
    toast.error(error?.message || '题目保存失败')
  } finally {
    isSaving.value = false
  }
}

const quickReview = async (status: number) => {
  form.status = status
  await saveQuestion()
}

const statusText = (status?: number) => status === 0 ? '待审核' : status === 2 ? '隐藏' : '通过'
const statusClass = (status?: number) => status === 1 ? 'status-ok' : status === 2 ? 'status-danger' : 'status-warn'
const difficultyText = (value?: string) => value === 'easy' ? '简单' : value === 'hard' ? '困难' : '中等'

onMounted(loadQuestions)
</script>

<style scoped>
.primary-button,.secondary-button,.filter-button{display:inline-flex;min-height:38px;align-items:center;justify-content:center;gap:.5rem;border-radius:.5rem;padding:.5rem .9rem;font-size:.875rem;font-weight:700}.primary-button{background:rgb(37 99 235);color:white}.secondary-button,.filter-button{border:1px solid rgb(226 232 240);background:white;color:rgb(51 65 85)}.compact{min-height:32px;padding:.35rem .7rem}.filter-button-active{border-color:rgb(79 70 229);background:rgb(238 242 255);color:rgb(67 56 202)}.danger-action{color:rgb(185 28 28)}.primary-button:disabled,.secondary-button:disabled{cursor:not-allowed;opacity:.6}.metric-card,.panel{border-radius:.75rem;border:1px solid rgb(226 232 240);background:white;padding:1.25rem}.metric-card span{display:block;font-size:.8125rem;font-weight:700;color:rgb(100 116 139)}.metric-card strong{margin-top:.45rem;display:block;font-size:1.6rem;font-weight:800;color:rgb(15 23 42)}.question-row{display:flex;width:100%;border-radius:.75rem;border:1px solid rgb(226 232 240);background:rgb(248 250 252);padding:1rem;transition:border-color .15s ease,background-color .15s ease}.question-row:hover,.question-row-active{border-color:rgb(129 140 248);background:rgb(238 242 255)}.status-pill,.meta-chip{display:inline-flex;align-items:center;border-radius:999px;padding:.25rem .6rem;font-size:.75rem;font-weight:700}.meta-chip{background:white;color:rgb(71 85 105)}.status-ok{background:rgb(220 252 231);color:rgb(21 128 61)}.status-warn{background:rgb(254 243 199);color:rgb(180 83 9)}.status-danger{background:rgb(254 226 226);color:rgb(185 28 28)}.field-label{display:grid;gap:.4rem;font-size:.8125rem;font-weight:700;color:rgb(71 85 105)}.field-input{width:100%;border-radius:.5rem;border:1px solid rgb(226 232 240);background:white;padding:.65rem .75rem;font-size:.875rem;color:rgb(15 23 42);outline:none}.field-input:focus{border-color:rgb(79 70 229);box-shadow:0 0 0 3px rgb(199 210 254 / .7)}:global(.dark) .metric-card,:global(.dark) .panel,:global(.dark) .secondary-button,:global(.dark) .filter-button,:global(.dark) .field-input{border-color:rgb(30 41 59);background:rgb(15 23 42);color:rgb(203 213 225)}:global(.dark) .metric-card strong{color:rgb(248 250 252)}:global(.dark) .question-row{border-color:rgb(30 41 59);background:rgb(2 6 23)}:global(.dark) .question-row:hover,:global(.dark) .question-row-active,:global(.dark) .filter-button-active{border-color:rgb(99 102 241);background:rgb(30 27 75)}:global(.dark) .meta-chip{background:rgb(30 41 59);color:rgb(203 213 225)}
</style>
