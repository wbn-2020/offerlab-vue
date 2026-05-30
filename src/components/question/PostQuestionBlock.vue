<template>
  <section class="question-block">
    <div class="question-block-head">
      <div>
        <div class="title-row">
          <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">本篇面经提到的题目</h2>
          <span v-if="block" :class="['status-badge', statusMeta.className]">{{ statusMeta.label }}</span>
        </div>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {{ statusMeta.description }}
        </p>
      </div>
      <div class="action-row">
        <button
          type="button"
          class="secondary-action"
          :disabled="isLoading"
          @click="refresh"
        >
          {{ isLoading ? '刷新中...' : '刷新' }}
        </button>
        <button
          v-if="block?.canRetry"
          type="button"
          class="secondary-action"
          :disabled="isRetrying"
          @click="retry"
        >
          {{ isRetrying ? '重提取中...' : '重新提取' }}
        </button>
      </div>
    </div>

    <div v-if="isLoading && !block" class="state-panel state-neutral">
      正在读取题目整理状态...
    </div>
    <div v-else-if="!block" class="state-panel state-neutral">
      暂未获取到题目整理结果，可以稍后刷新页面。
    </div>
    <div v-else-if="isProcessing" class="state-panel state-info">
      <strong>题目整理中</strong>
      <span>系统正在从面经正文中提取问题，完成后会自动出现在题库和公司准备包。</span>
    </div>
    <div v-else-if="isFailed" class="state-panel state-danger">
      <strong>题目整理失败</strong>
      <span>{{ block.errorVisible && block.errorMessage ? block.errorMessage : '后台已经记录失败状态，管理员可以在后台或此处重新提取。' }}</span>
    </div>
    <div v-else-if="block.questions.length === 0" class="state-panel state-neutral">
      暂未整理出明确题目。可以补充更清晰的面试问题列表后再次保存面经。
    </div>
    <div v-else class="space-y-3">
      <div class="result-summary">
        <span>已整理 {{ block.questions.length }} 道题</span>
        <span>可进入题库、准备台和公司准备包复习</span>
      </div>
      <RouterLink
        v-for="question in block.questions"
        :key="question.id"
        :to="`/questions/${question.id}`"
        class="question-row"
      >
        <div class="line-clamp-2 font-semibold text-slate-950 dark:text-slate-50">{{ question.questionText }}</div>
        <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span v-if="question.company">{{ question.company }}</span>
          <span v-if="question.position">{{ question.position }}</span>
          <span v-if="question.difficulty">{{ difficultyText(question.difficulty) }}</span>
          <span v-if="question.qualityScore">质量 {{ question.qualityScore }}</span>
          <span v-if="question.appearCount > 1">出现 {{ question.appearCount }} 次</span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { questionApi, type PostQuestionBlock } from '@/api/question'
import type { ApiId } from '@/api/types'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'

const props = defineProps<{
  postId: ApiId
}>()

const block = ref<PostQuestionBlock | null>(null)
const isLoading = ref(false)
const isRetrying = ref(false)
let pollTimer: ReturnType<typeof setTimeout> | null = null

const normalizedStatus = computed(() => String(block.value?.taskStatus || 'none').toLowerCase())
const isProcessing = computed(() => normalizedStatus.value === 'pending' || normalizedStatus.value === 'running')
const isFailed = computed(() => normalizedStatus.value === 'failed')
const statusMeta = computed(() => {
  if (!block.value) {
    return { label: '未加载', className: 'status-neutral', description: '系统会把面经里的问题整理成结构化题目。' }
  }
  if (isProcessing.value) {
    return { label: '整理中', className: 'status-info', description: '题目正在自动提取，完成后会同步到题库和准备台。' }
  }
  if (isFailed.value) {
    return { label: '失败', className: 'status-danger', description: '本次自动提取没有成功，管理员可以重新提取。' }
  }
  if (block.value.questions.length > 0) {
    return { label: '已完成', className: 'status-ok', description: `已整理出 ${block.value.questions.length} 道可复习题目。` }
  }
  return { label: '暂无题目', className: 'status-neutral', description: '系统暂未识别出明确题目。' }
})

const clearPoll = () => {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

const schedulePoll = () => {
  clearPoll()
  if (!isProcessing.value) return
  pollTimer = setTimeout(() => {
    load({ silent: true })
  }, 3000)
}

const load = async (options: { silent?: boolean } = {}) => {
  if (!props.postId) return
  if (!options.silent) isLoading.value = true
  try {
    const res = await questionApi.postBlock(props.postId)
    block.value = res.data
    schedulePoll()
  } catch {
    block.value = null
    clearPoll()
  } finally {
    if (!options.silent) isLoading.value = false
  }
}

const refresh = () => load()

const retry = async () => {
  isRetrying.value = true
  try {
    await questionApi.extractPostQuestions(props.postId)
    toast.success('已提交重新提取任务')
    await load()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '重新提取失败'))
  } finally {
    isRetrying.value = false
  }
}

const difficultyText = (value?: string) => {
  if (value === 'easy') return '简单'
  if (value === 'hard') return '困难'
  return '中等'
}

watch(() => props.postId, () => load())
onMounted(() => load())
onBeforeUnmount(clearPoll)
</script>

<style scoped>
.question-block {
  margin-bottom: 2rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 1.25rem;
}

.question-block-head {
  margin-bottom: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.title-row,
.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.status-badge,
.secondary-action {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.status-neutral {
  background: rgb(241 245 249);
  color: rgb(71 85 105);
}

.status-info {
  background: rgb(219 234 254);
  color: rgb(29 78 216);
}

.status-ok {
  background: rgb(220 252 231);
  color: rgb(22 101 52);
}

.status-danger {
  background: rgb(254 226 226);
  color: rgb(190 18 60);
}

.secondary-action {
  border: 1px solid rgb(226 232 240);
  color: rgb(71 85 105);
}

.secondary-action:hover:not(:disabled) {
  background: rgb(248 250 252);
}

.secondary-action:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.state-panel {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  padding: 1rem;
  font-size: 0.875rem;
}

.state-info {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(29 78 216);
}

.state-danger {
  border-color: rgb(254 205 211);
  background: rgb(255 241 242);
  color: rgb(190 18 60);
}

.state-neutral {
  border-color: rgb(226 232 240);
  background: rgb(248 250 252);
  color: rgb(100 116 139);
}

.result-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  padding: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(71 85 105);
}

.question-row {
  display: block;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.question-row:hover {
  border-color: rgb(199 210 254);
  background: rgb(238 242 255 / 0.45);
}

:global(.dark) .question-block {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .secondary-action,
:global(.dark) .question-row {
  border-color: rgb(51 65 85);
}

:global(.dark) .secondary-action:hover:not(:disabled),
:global(.dark) .result-summary,
:global(.dark) .question-row,
:global(.dark) .state-neutral {
  background: rgb(15 23 42);
}

:global(.dark) .status-neutral {
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}

:global(.dark) .status-info,
:global(.dark) .state-info {
  background: rgb(30 58 138 / 0.45);
  color: rgb(191 219 254);
}

:global(.dark) .status-ok {
  background: rgb(20 83 45);
  color: rgb(187 247 208);
}

:global(.dark) .status-danger,
:global(.dark) .state-danger {
  background: rgb(127 29 29 / 0.45);
  color: rgb(254 202 202);
}
</style>
