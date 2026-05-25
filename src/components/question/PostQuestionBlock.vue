<template>
  <section class="question-block">
    <div class="mb-4 flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">本篇面经提到的题目</h2>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">系统会把面经里的问题整理成可复习的结构化题目。</p>
      </div>
      <button
        v-if="block?.canRetry"
        type="button"
        class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        :disabled="isRetrying"
        @click="retry"
      >
        {{ isRetrying ? '重提取中...' : '重新提取' }}
      </button>
    </div>

    <div v-if="isLoading" class="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      正在读取题目整理状态...
    </div>
    <div v-else-if="!block" class="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      暂未获取到题目整理结果。
    </div>
    <div v-else-if="block.taskStatus === 'pending' || block.taskStatus === 'running'" class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
      题目整理中，稍后刷新即可查看。
    </div>
    <div v-else-if="block.errorVisible && block.errorMessage" class="rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
      提取失败：{{ block.errorMessage }}
    </div>
    <div v-else-if="block.questions.length === 0" class="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
      暂未整理出明确题目。
    </div>
    <div v-else class="space-y-3">
      <RouterLink
        v-for="question in block.questions"
        :key="question.id"
        :to="`/questions/${question.id}`"
        class="block rounded-lg border border-slate-100 bg-slate-50 p-4 transition hover:border-primary-200 hover:bg-primary-50/40 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-primary-800 dark:hover:bg-primary-950/30"
      >
        <div class="line-clamp-2 font-semibold text-slate-950 dark:text-slate-50">{{ question.questionText }}</div>
        <div class="mt-2 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span v-if="question.company">{{ question.company }}</span>
          <span v-if="question.position">{{ question.position }}</span>
          <span v-if="question.difficulty">{{ question.difficulty }}</span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { questionApi, type PostQuestionBlock } from '@/api/question'
import type { ApiId } from '@/api/types'
import { toast } from 'vue-sonner'

const props = defineProps<{
  postId: ApiId
}>()

const block = ref<PostQuestionBlock | null>(null)
const isLoading = ref(false)
const isRetrying = ref(false)

const load = async () => {
  if (!props.postId) return
  isLoading.value = true
  try {
    const res = await questionApi.postBlock(props.postId)
    block.value = res.data
  } catch {
    block.value = null
  } finally {
    isLoading.value = false
  }
}

const retry = async () => {
  isRetrying.value = true
  try {
    await questionApi.extractPostQuestions(props.postId)
    toast.success('已提交重新提取任务')
    await load()
  } catch (error: any) {
    toast.error(error?.message || '重新提取失败')
  } finally {
    isRetrying.value = false
  }
}

watch(() => props.postId, load)
onMounted(load)
</script>

<style scoped>
.question-block {
  margin-bottom: 2rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(255 255 255);
  padding: 1.25rem;
}

:global(.dark) .question-block {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}
</style>
