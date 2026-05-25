<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-slate-950 dark:text-slate-50">我的准备台</h1>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">维护目标公司和岗位，集中复习收藏题与待复习题。</p>
          </div>
          <RouterLink to="/questions" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            继续刷题
          </RouterLink>
        </div>
      </section>

      <LoadingSkeleton v-if="isLoading" />
      <EmptyState v-else-if="!overview" title="暂时无法加载准备台" description="稍后刷新页面重试。" />
      <template v-else>
        <section class="mb-6 grid gap-4 md:grid-cols-5">
          <div class="metric-card"><span>收藏</span><strong>{{ overview.favoriteCount }}</strong></div>
          <div class="metric-card"><span>待学习</span><strong>{{ overview.todoCount }}</strong></div>
          <div class="metric-card"><span>学习中</span><strong>{{ overview.learningCount }}</strong></div>
          <div class="metric-card"><span>已掌握</span><strong>{{ overview.masteredCount }}</strong></div>
          <div class="metric-card"><span>待复习</span><strong>{{ overview.reviewCount }}</strong></div>
        </section>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="space-y-6 lg:col-span-2">
            <section class="section-panel">
              <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 class="section-title mb-1">准备目标</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400">推荐题会优先匹配你的目标公司、岗位和技术标签。</p>
                </div>
                <form class="target-form" @submit.prevent="addTarget">
                  <select v-model="targetForm.targetType" class="target-input">
                    <option value="company">公司</option>
                    <option value="position">岗位</option>
                    <option value="tag">标签</option>
                  </select>
                  <input v-model.trim="targetForm.targetValue" class="target-input" placeholder="例如 字节跳动 / 后端开发 / Redis" />
                  <button class="target-button" type="submit" :disabled="isSubmittingTarget || !targetForm.targetValue">
                    添加
                  </button>
                </form>
              </div>
              <div v-if="overview.targets.length" class="flex flex-wrap gap-2">
                <button
                  v-for="target in overview.targets"
                  :key="target.id"
                  type="button"
                  class="target-chip"
                  :disabled="deletingTargetId === target.id"
                  @click="deleteTarget(target.id)"
                >
                  {{ targetTypeText(target.targetType) }} · {{ target.targetValue }}
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <EmptyState v-else title="还没有准备目标" description="先添加目标公司或岗位，推荐会更贴近你的面试方向。" />
            </section>

            <Panel title="待复习题目" :empty="overview.reviewQuestions.length === 0" empty-title="暂无待复习题目" empty-description="在题目详情页把状态标为待复习后会出现在这里。">
              <QuestionCard v-for="question in overview.reviewQuestions" :key="question.id" :question="question" />
            </Panel>

            <Panel title="为你推荐" :empty="overview.recommendedQuestions.length === 0" empty-title="暂无推荐题目" empty-description="发布更多面经或完成题目提取后会生成推荐。">
              <QuestionCard v-for="question in overview.recommendedQuestions" :key="question.id" :question="question" />
            </Panel>
          </section>

          <aside>
            <Panel title="最近收藏" :empty="overview.favoriteQuestions.length === 0" empty-title="还没有收藏题目" empty-description="收藏题目后可以在这里快速回看。">
              <RouterLink
                v-for="question in overview.favoriteQuestions"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="block rounded-lg border border-slate-100 bg-slate-50 p-4 hover:border-primary-200 hover:bg-primary-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-primary-950/30"
              >
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ question.questionText }}</div>
                <div class="mt-2 text-xs text-slate-500">{{ question.company || '未知公司' }} · {{ question.position || '通用岗位' }}</div>
              </RouterLink>
            </Panel>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi } from '@/api/question'
import type { ApiId } from '@/api/types'

const targetForm = reactive({ targetType: 'company', targetValue: '' })
const isSubmittingTarget = ref(false)
const deletingTargetId = ref<ApiId | null>(null)

const { data, isLoading, refetch } = useQuery({
  queryKey: ['me-prep-overview'],
  queryFn: () => questionApi.myPrepOverview(),
})

const overview = computed(() => data.value?.data || null)

const addTarget = async () => {
  if (!targetForm.targetValue) return
  isSubmittingTarget.value = true
  try {
    await questionApi.addPrepTarget({ ...targetForm })
    targetForm.targetValue = ''
    toast.success('准备目标已添加')
    await refetch()
  } catch (error: any) {
    toast.error(error?.message || '添加准备目标失败')
  } finally {
    isSubmittingTarget.value = false
  }
}

const deleteTarget = async (id: ApiId) => {
  deletingTargetId.value = id
  try {
    await questionApi.deletePrepTarget(id)
    toast.success('准备目标已移除')
    await refetch()
  } catch (error: any) {
    toast.error(error?.message || '移除准备目标失败')
  } finally {
    deletingTargetId.value = null
  }
}

const targetTypeText = (type: string) => {
  if (type === 'position') return '岗位'
  if (type === 'tag') return '标签'
  return '公司'
}

const Panel = defineComponent({
  props: {
    title: { type: String, required: true },
    empty: { type: Boolean, default: false },
    emptyTitle: { type: String, required: true },
    emptyDescription: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => h('section', { class: 'section-panel' }, [
      h('h2', { class: 'section-title' }, props.title),
      props.empty
        ? h(EmptyState, { title: props.emptyTitle, description: props.emptyDescription })
        : h('div', { class: 'grid gap-4' }, slots.default?.()),
    ])
  },
})
</script>

<style scoped>
.metric-card,
.section-panel {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.metric-card span {
  display: block;
  font-size: 0.875rem;
  color: rgb(100 116 139);
}

.metric-card strong {
  margin-top: 0.35rem;
  display: block;
  font-size: 1.75rem;
  color: rgb(15 23 42);
}

.section-title {
  margin-bottom: 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.target-form {
  display: grid;
  gap: 0.5rem;
}

.target-input {
  min-height: 38px;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: rgb(15 23 42);
}

.target-button,
.target-chip {
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.target-button {
  min-height: 38px;
  background: rgb(37 99 235);
  padding: 0.5rem 1rem;
  color: white;
}

.target-button:disabled,
.target-chip:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.target-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid rgb(199 210 254);
  background: rgb(238 242 255);
  padding: 0.45rem 0.75rem;
  color: rgb(67 56 202);
}

@media (min-width: 768px) {
  .target-form {
    grid-template-columns: 96px minmax(240px, 1fr) auto;
  }
}

:global(.dark) .metric-card,
:global(.dark) .section-panel,
:global(.dark) .target-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .metric-card strong,
:global(.dark) .section-title,
:global(.dark) .target-input {
  color: rgb(248 250 252);
}

:global(.dark) .target-chip {
  border-color: rgb(67 56 202);
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}
</style>
