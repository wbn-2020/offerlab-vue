<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <LoadingSkeleton v-if="isLoading" />
      <EmptyState v-else-if="!detail" title="题目不存在" description="这道题可能已隐藏或来源内容不可见。" actionText="返回题库" actionHref="/questions" />
      <div v-else class="grid gap-8 lg:grid-cols-3">
        <article class="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div class="mb-5 flex flex-wrap gap-2">
            <RouterLink v-if="question.company" :to="`/companies/${encodeURIComponent(question.company)}/prep`" class="pill company">{{ question.company }}</RouterLink>
            <span v-if="question.position" class="pill">{{ question.position }}</span>
            <span v-if="question.interviewRound" class="pill">{{ question.interviewRound }}</span>
            <span class="pill">{{ difficultyText(question.difficulty) }}</span>
          </div>
          <h1 class="text-3xl font-bold leading-tight text-slate-950 dark:text-slate-50">{{ question.questionText }}</h1>
          <section class="mt-8 rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <h2 class="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">参考思路</h2>
            <p class="mt-3 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {{ question.answerHint || '暂未生成参考思路。AI 内容仅作辅助，不作为官方标准答案。' }}
            </p>
          </section>

          <div class="mt-6 flex flex-wrap gap-2">
            <span v-for="tag in question.tags" :key="tag.id" class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ tag.name }}</span>
          </div>

          <div class="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
            <button class="primary-action" @click="toggleFavorite">{{ question.favorite ? '取消收藏' : '收藏题目' }}</button>
            <select v-model="selectedProgress" class="state-select" @change="updateProgress">
              <option value="">学习状态</option>
              <option value="todo">待学习</option>
              <option value="learning">学习中</option>
              <option value="mastered">已掌握</option>
              <option value="review">待复习</option>
            </select>
            <RouterLink
              v-if="detail.sourcePosts.length"
              :to="`/post/${detail.sourcePosts[0].postId}`"
              class="secondary-action inline-flex items-center justify-center"
            >
              查看来源面经
            </RouterLink>
            <button
              v-else
              class="secondary-action opacity-60"
              type="button"
              disabled
            >
              暂无可跳转面经
            </button>
          </div>
        </article>

        <aside class="space-y-6">
          <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="mb-4 font-bold text-slate-950 dark:text-slate-50">来源面经</h2>
            <div v-if="detail.sourcePosts.length" class="space-y-3">
              <RouterLink v-for="post in detail.sourcePosts" :key="post.postId" :to="`/post/${post.postId}`" class="block rounded-lg bg-slate-50 p-3 hover:bg-primary-50 dark:bg-slate-950 dark:hover:bg-primary-950/30">
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ post.title }}</div>
                <div class="mt-1 text-xs text-slate-500">{{ post.counter.view }} 浏览</div>
              </RouterLink>
            </div>
            <p v-else class="text-sm text-slate-500">暂无可见来源。</p>
          </section>

          <section class="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <h2 class="mb-4 font-bold text-slate-950 dark:text-slate-50">相似题目</h2>
            <div v-if="detail.relatedQuestions.length" class="space-y-3">
              <RouterLink v-for="item in detail.relatedQuestions" :key="item.id" :to="`/questions/${item.id}`" class="block rounded-lg bg-slate-50 p-3 text-sm font-semibold text-slate-800 hover:bg-primary-50 hover:text-primary-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-primary-950/30">
                {{ item.questionText }}
              </RouterLink>
            </div>
            <p v-else class="text-sm text-slate-500">暂无相似题。</p>
          </section>
        </aside>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { questionApi } from '@/api/question'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'vue-sonner'
import { getErrorMessage } from '@/api/client'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const questionId = computed(() => route.params.id as string)
const selectedProgress = ref('')

const { data, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['question', questionId.value]),
  queryFn: () => questionApi.detail(questionId.value),
  enabled: computed(() => Boolean(questionId.value)),
})

const detail = computed(() => data.value?.data || null)
const question = computed(() => detail.value!.question)

watch(detail, (value) => {
  selectedProgress.value = value?.question.progressStatus || ''
}, { immediate: true })

const ensureLogin = () => {
  if (authStore.isLoggedIn) return true
  router.push({ path: '/login', query: { redirect: route.fullPath } })
  return false
}

const toggleFavorite = async () => {
  if (!detail.value || !ensureLogin()) return
  try {
    if (question.value.favorite) {
      await questionApi.unfavorite(question.value.id)
    } else {
      await questionApi.favorite(question.value.id)
    }
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '收藏操作失败'))
  }
}

const updateProgress = async () => {
  if (!detail.value || !selectedProgress.value || !ensureLogin()) return
  try {
    await questionApi.updateProgress(question.value.id, selectedProgress.value)
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '学习状态更新失败'))
  }
}

const difficultyText = (value?: string) => ({ easy: '简单', medium: '中等', hard: '困难' }[value || ''] || '中等')
</script>

<style scoped>
.pill {
  border-radius: 999px;
  background: rgb(248 250 252);
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: rgb(71 85 105);
}
.company {
  background: rgb(238 242 255);
  color: rgb(67 56 202);
}
.primary-action {
  border-radius: 0.75rem;
  background: rgb(37 99 235);
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
}
.secondary-action,
.state-select {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.7rem 1rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgb(71 85 105);
}
:global(.dark) .pill,
:global(.dark) .secondary-action,
:global(.dark) .state-select {
  border-color: rgb(51 65 85);
  background: rgb(30 41 59);
  color: rgb(203 213 225);
}
</style>
