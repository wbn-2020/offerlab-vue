<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <LoadingSkeleton v-if="isLoading" />
      <EmptyState v-else-if="!prep" title="暂无公司准备包" description="该公司还没有足够的公开面经和题目。" actionText="返回题库" actionHref="/questions" />
      <template v-else>
        <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 class="text-3xl font-bold text-slate-950 dark:text-slate-50">{{ prep.company }} 准备包</h1>
              <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">聚合近期面经、高频题目、热门岗位和技术标签。</p>
              <div v-if="prep.aliases.length" class="mt-3 flex flex-wrap gap-2">
                <span v-for="alias in prep.aliases" :key="alias" class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ alias }}</span>
              </div>
            </div>
            <RouterLink :to="`/questions?company=${encodeURIComponent(prep.company)}`" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              查看全部题目
            </RouterLink>
          </div>
        </section>

        <section class="mb-6 grid gap-4 md:grid-cols-4">
          <div class="metric-card"><span>高频题</span><strong>{{ prep.topQuestions.length }}</strong></div>
          <div class="metric-card"><span>最近面经</span><strong>{{ prep.recentPosts.length }}</strong></div>
          <div class="metric-card"><span>热门岗位</span><strong>{{ prep.hotPositions.length }}</strong></div>
          <div class="metric-card"><span>相关岗位数</span><strong>{{ prep.relatedPositionCount }}</strong></div>
        </section>

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="space-y-4 lg:col-span-2">
            <div class="section-panel">
              <h2 class="section-title">高频面试题</h2>
              <div class="grid gap-4">
                <QuestionCard v-for="question in prep.topQuestions" :key="question.id" :question="question" />
                <EmptyState v-if="prep.topQuestions.length === 0" title="暂无题目" description="等待更多面经沉淀。" />
              </div>
            </div>

            <div class="section-panel">
              <h2 class="section-title">最近面经</h2>
              <div class="space-y-3">
                <RouterLink v-for="post in prep.recentPosts" :key="post.postId" :to="`/post/${post.postId}`" class="block rounded-lg border border-slate-100 bg-slate-50 p-4 hover:bg-primary-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-primary-950/30">
                  <h3 class="font-semibold text-slate-950 dark:text-slate-50">{{ post.title }}</h3>
                  <p class="mt-1 line-clamp-2 text-sm text-slate-500">{{ post.summary || post.content }}</p>
                </RouterLink>
                <EmptyState v-if="prep.recentPosts.length === 0" title="暂无面经" description="还没有公开面经。" />
              </div>
            </div>
          </section>

          <aside class="space-y-6">
            <div class="section-panel">
              <h2 class="section-title">高频技术标签</h2>
              <RankList :items="prep.topTags" />
            </div>
            <div class="section-panel">
              <h2 class="section-title">热门岗位</h2>
              <RankList :items="prep.hotPositions" />
            </div>
            <div class="section-panel">
              <h2 class="section-title">30 天热度</h2>
              <RankList :items="prep.trend30Days" />
            </div>
            <div class="section-panel">
              <h2 class="section-title">90 天热度</h2>
              <RankList :items="prep.trend90Days" />
            </div>
            <div v-if="prep.myProgress" class="section-panel">
              <h2 class="section-title">我的准备进度</h2>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="progress-cell">收藏 {{ prep.myProgress.favoriteCount }}</div>
                <div class="progress-cell">学习中 {{ prep.myProgress.learningCount }}</div>
                <div class="progress-cell">已掌握 {{ prep.myProgress.masteredCount }}</div>
                <div class="progress-cell">待复习 {{ prep.myProgress.reviewCount }}</div>
              </div>
            </div>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import AppHeader from '@/components/layout/AppHeader.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi, type NameCount } from '@/api/question'

const route = useRoute()
const company = computed(() => route.params.company as string)

const { data, isLoading } = useQuery({
  queryKey: computed(() => ['company-prep', company.value]),
  queryFn: () => questionApi.companyPrep(company.value),
  enabled: computed(() => Boolean(company.value)),
})

const prep = computed(() => data.value?.data || null)

const RankList = defineComponent({
  props: {
    items: { type: Array as () => NameCount[], required: true },
  },
  setup(props) {
    return () => props.items.length
      ? h('div', { class: 'space-y-3' }, props.items.map((item, index) =>
          h('div', { class: 'flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-950' }, [
            h('span', { class: 'font-semibold text-slate-700 dark:text-slate-200' }, `${index + 1}. ${item.name}`),
            h('span', { class: 'text-slate-500' }, item.count),
          ]),
        ))
      : h(EmptyState, { title: '暂无数据', description: '数据沉淀中。' })
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
  margin-top: 0.4rem;
  display: block;
  font-size: 1.8rem;
  color: rgb(15 23 42);
}
.section-title {
  margin-bottom: 1rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: rgb(15 23 42);
}
.progress-cell {
  border-radius: 0.75rem;
  background: rgb(248 250 252);
  padding: 0.85rem;
  font-weight: 700;
  color: rgb(71 85 105);
}
:global(.dark) .metric-card,
:global(.dark) .section-panel {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}
:global(.dark) .metric-card strong,
:global(.dark) .section-title {
  color: rgb(248 250 252);
}
:global(.dark) .progress-cell {
  background: rgb(2 6 23);
  color: rgb(203 213 225);
}
</style>
