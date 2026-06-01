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
          <div class="flex flex-wrap gap-2">
            <button
              v-if="overview"
              type="button"
              class="prep-export-button"
              @click="copyPrepPack"
            >
              <Copy class="h-4 w-4" aria-hidden="true" />
              复制备考包
            </button>
            <button
              v-if="overview"
              type="button"
              class="prep-export-button"
              @click="downloadPrepPack"
            >
              <Download class="h-4 w-4" aria-hidden="true" />
              下载备考包
            </button>
            <button
              v-if="weeklyReport"
              type="button"
              class="prep-export-button"
              @click="copyWeeklyReport"
            >
              <Copy class="h-4 w-4" aria-hidden="true" />
              复制周复盘
            </button>
            <button
              v-if="weeklyReport"
              type="button"
              class="prep-export-button"
              @click="downloadWeeklyReport"
            >
              <Download class="h-4 w-4" aria-hidden="true" />
              下载周复盘
            </button>
            <button
              v-if="starStoryQuestions.length"
              type="button"
              class="prep-export-button"
              @click="copyStarLibrary"
            >
              <Copy class="h-4 w-4" aria-hidden="true" />
              复制 STAR 素材库
            </button>
            <button
              v-if="starStoryQuestions.length"
              type="button"
              class="prep-export-button"
              @click="downloadStarLibrary"
            >
              <Download class="h-4 w-4" aria-hidden="true" />
              下载 STAR 素材库
            </button>
            <RouterLink to="/mock-interview" class="prep-export-button">
              模拟面试
            </RouterLink>
            <RouterLink to="/questions" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              继续刷题
            </RouterLink>
          </div>
        </div>
      </section>

      <LoadingSkeleton v-if="isLoading" />
      <EmptyState v-else-if="!overview" title="暂时无法加载准备台" description="稍后刷新页面重试；也可以先去题库收藏或标记几道题。" actionText="去题库看看" actionHref="/questions" />
      <template v-else>
        <section class="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <div class="metric-card"><span>收藏</span><strong>{{ overview.favoriteCount }}</strong></div>
          <div class="metric-card"><span>待学习</span><strong>{{ overview.todoCount }}</strong></div>
          <div class="metric-card"><span>学习中</span><strong>{{ overview.learningCount }}</strong></div>
          <div class="metric-card"><span>已掌握</span><strong>{{ overview.masteredCount }}</strong></div>
          <div class="metric-card"><span>待复习</span><strong>{{ overview.reviewCount }}</strong></div>
          <RouterLink to="/questions?hasNote=true&sort=latest" class="metric-card metric-link"><span>笔记题</span><strong>{{ overview.noteCount }}</strong></RouterLink>
          <div class="metric-card"><span>回答卡片</span><strong>{{ overview.answerDraftCount }}</strong></div>
        </section>

        <section v-if="overview.reviewPlan && overview.reviewPlan.todayCount > 0" class="mb-6 due-review-alert">
          <div>
            <p class="plan-kicker">Due Review</p>
            <h2 class="plan-title">到期复习提醒</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ overview.reviewPlan.todayCount }} 道题需要今天处理，优先清理能减少临面前堆积。
            </p>
          </div>
          <div class="due-review-list">
            <RouterLink
              v-for="question in overview.reviewPlan.todayQuestions.slice(0, 3)"
              :key="question.id"
              :to="'/questions/' + question.id"
              class="due-review-item"
            >
              <span>{{ question.questionText }}</span>
              <small>{{ question.company || '通用公司' }} &#183; {{ reviewScheduleText(question) }}</small>
            </RouterLink>
          </div>
          <RouterLink to="/questions?progressStatus=review&sort=latest" class="progress-pill">查看待复习题</RouterLink>
        </section>

        <section v-if="mockStats && mockStats.sessionCount > 0" class="mb-6 mock-stats-panel">
          <div>
            <p class="plan-kicker">Mock Interview</p>
            <h2 class="plan-title">模拟面试表现</h2>
          </div>
          <div class="mock-stats-grid">
            <div><span>完成场次</span><strong>{{ mockStats.completedCount }}</strong></div>
            <div><span>平均分</span><strong>{{ mockStats.averageScorePercent }}%</strong></div>
            <div><span>最佳分</span><strong>{{ mockStats.bestScorePercent }}%</strong></div>
            <div><span>已答题</span><strong>{{ mockStats.answeredQuestionCount }}/{{ mockStats.totalQuestionCount }}</strong></div>
          </div>
          <RouterLink to="/mock-interview" class="progress-pill">继续练习</RouterLink>
        </section>

        <section v-if="weeklyReport" class="mb-6 weekly-report-panel">
          <div>
            <p class="plan-kicker">Weekly Review</p>
            <h2 class="plan-title">本周备考复盘</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ formatWeeklyRange(weeklyReport.windowStart, weeklyReport.windowEnd) }}</p>
          </div>
          <div class="weekly-report-grid">
            <div><span>触达题目</span><strong>{{ weeklyReport.touchedQuestionCount }}</strong></div>
            <div><span>已掌握</span><strong>{{ weeklyReport.masteredQuestionCount }}</strong></div>
            <div><span>待复习</span><strong>{{ weeklyReport.reviewQuestionCount }}</strong></div>
            <div><span>回答卡片</span><strong>{{ weeklyReport.answerDraftCount }}</strong></div>
            <div><span>模拟面试</span><strong>{{ weeklyReport.mockCompletedCount }}/{{ weeklyReport.mockSessionCount }}</strong></div>
            <div><span>平均分</span><strong>{{ weeklyReport.mockAverageScorePercent }}%</strong></div>
          </div>
          <div v-if="weeklyReport.nextActions.length" class="weekly-actions">
            <span v-for="action in weeklyReport.nextActions.slice(0, 3)" :key="action">{{ action }}</span>
          </div>
        </section>

        <section v-if="overview.mistakeReasonCounts.length" class="mb-6 rounded-xl border border-rose-100 bg-rose-50/70 p-5 dark:border-rose-900 dark:bg-rose-950/20">
          <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-base font-extrabold text-slate-950 dark:text-slate-50">复盘短板</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">来自题目详情页的错因标记，帮助你面试前集中补弱项。</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <RouterLink v-for="item in overview.mistakeReasonCounts" :key="item.reason" :to="mistakeReasonLink(item.reason)" class="reason-chip">
                {{ mistakeReasonText(item.reason) }} · {{ item.count }}
              </RouterLink>
            </div>
          </div>
        </section>

        <section v-if="overview.focusTagCounts.length" class="mb-6 focus-tags-panel">
          <div>
            <p class="plan-kicker">Focus Tags</p>
            <h2 class="plan-title">薄弱标签聚焦</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">从待复习、错因和超时学习中的题目聚合，帮助面试前先补高频短板。</p>
          </div>
          <div class="focus-tags-list">
            <RouterLink
              v-for="item in overview.focusTagCounts"
              :key="item.name"
              :to="`/mock-interview?focusTag=${encodeURIComponent(item.name)}`"
              class="focus-tag-row"
            >
              <span>{{ item.name }}</span>
              <strong>{{ item.count }}</strong>
              <i :style="{ width: `${focusTagWidth(item.count)}%` }" />
            </RouterLink>
          </div>
        </section>

        <section v-if="overview.reviewPlan" class="mb-6 grid gap-4 lg:grid-cols-2">
          <article class="review-plan-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="plan-kicker">Today</p>
                <h2 class="plan-title">今日优先复习</h2>
              </div>
              <RouterLink to="/questions?sort=latest" class="plan-count">{{ overview.reviewPlan.todayCount }}</RouterLink>
            </div>
            <div v-if="overview.reviewPlan.todayQuestions.length" class="mt-4 grid gap-2">
              <div
                v-for="question in overview.reviewPlan.todayQuestions"
                :key="question.id"
                class="plan-question task-question"
              >
                <RouterLink :to="`/questions/${question.id}`" class="min-w-0">
                  <span class="line-clamp-1">{{ question.questionText }}</span>
                  <small>{{ question.company || '通用公司' }} · {{ reviewScheduleText(question) }}</small>
                </RouterLink>
                <div class="task-actions">
                  <button type="button" :disabled="reviewingQuestionId === question.id" @click="markReviewTask(question.id, 'mastered')">已掌握</button>
                  <button type="button" :disabled="reviewingQuestionId === question.id" @click="markReviewTask(question.id, 'review')">稍后复习</button>
                </div>
              </div>
            </div>
            <p v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">今天没有强提醒题目，可以从推荐题里挑一两道保持手感。</p>
          </article>

          <article class="review-plan-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="plan-kicker">7 Days</p>
                <h2 class="plan-title">近 7 天复习动态</h2>
              </div>
              <span class="plan-count">{{ overview.reviewPlan.weekTouchedCount }}</span>
            </div>
            <div v-if="overview.reviewPlan.weekTouchedQuestions.length" class="mt-4 grid gap-2">
              <RouterLink
                v-for="question in overview.reviewPlan.weekTouchedQuestions"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="plan-question"
              >
                <span class="line-clamp-1">{{ question.questionText }}</span>
                <small>{{ question.company || '通用公司' }} · {{ question.lastReviewedAt ? `已复习 ${formatScheduleTime(question.lastReviewedAt)}` : (question.mistakeReason ? mistakeReasonText(question.mistakeReason) : progressText(question.progressStatus)) }}</small>
              </RouterLink>
            </div>
            <p v-else class="mt-4 text-sm text-slate-500 dark:text-slate-400">最近 7 天还没有复习记录，可以先标记几道学习中或待复习题。</p>
          </article>
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
                  <input v-model="targetForm.interviewDate" class="target-input" type="date" />
                  <select v-model="targetForm.priority" class="target-input">
                    <option value="medium">普通</option>
                    <option value="high">高优先级</option>
                    <option value="urgent">临近面试</option>
                    <option value="low">低优先级</option>
                  </select>
                  <input v-model.trim="targetForm.note" class="target-input target-note-input" maxlength="300" placeholder="备注：如一面 / HR 面 / 重点系统设计" />
                  <button class="target-button" type="submit" :disabled="isSubmittingTarget || !targetForm.targetValue">
                    添加备考目标
                  </button>
                </form>
              </div>
              <div v-if="overview.targets.length" class="target-chip-grid">
                <button
                  v-for="target in overview.targets"
                  :key="target.id"
                  type="button"
                  class="target-chip"
                  :disabled="deletingTargetId === target.id"
                  @click="deleteTarget(target.id)"
                >
                  <span class="target-chip-main">
                    <strong>{{ targetTypeText(target.targetType) }} · {{ target.targetValue }}</strong>
                    <small>{{ targetScheduleText(target) }} · {{ targetPriorityText(target.priority) }}</small>
                    <small v-if="target.note" class="line-clamp-1">{{ target.note }}</small>
                  </span>
                  <span class="target-chip-remove" aria-hidden="true">×</span>
                </button>
              </div>
              <EmptyState v-else title="还没有准备目标" description="先添加目标公司、岗位或技术标签，推荐会更贴近你的面试方向。" />
            </section>

            <section v-if="overview.targetSummaries.length" class="section-panel">
              <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="section-title mb-1">目标准备进度</h2>
                  <p class="text-sm text-slate-500 dark:text-slate-400">按公司、岗位和标签聚合题库进展，方便面试前快速补齐短板。</p>
                </div>
                <RouterLink to="/questions" class="text-sm font-semibold text-primary-600 hover:text-primary-700">
                  查看题库
                </RouterLink>
              </div>
              <div class="grid gap-4">
                <article v-for="summary in overview.targetSummaries" :key="summary.target.id" class="target-summary">
                  <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {{ targetTypeText(summary.target.targetType) }}
                      </div>
                      <h3 class="mt-1 text-base font-bold text-slate-950 dark:text-slate-50">{{ summary.target.targetValue }}</h3>
                      <p class="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {{ targetScheduleText(summary.target) }} · {{ targetPriorityText(summary.target.priority) }}
                      </p>
                      <p v-if="summary.target.note" class="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{{ summary.target.note }}</p>
                    </div>
                    <RouterLink :to="targetSearchLink(summary)" class="progress-pill">
                      {{ summary.questionCount }} 题
                    </RouterLink>
                  </div>

                  <div class="mt-4">
                    <div class="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>掌握进度</span>
                      <strong class="text-slate-700 dark:text-slate-200">{{ targetProgressPercent(summary) }}%</strong>
                    </div>
                    <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        class="h-full rounded-full bg-primary-600 transition-all"
                        :style="{ width: `${targetProgressPercent(summary)}%` }"
                      />
                    </div>
                  </div>

                  <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><dt>收藏</dt><dd>{{ summary.favoriteCount }}</dd></div>
                    <div><dt>学习中</dt><dd>{{ summary.learningCount }}</dd></div>
                    <div><dt>已掌握</dt><dd>{{ summary.masteredCount }}</dd></div>
                    <div><dt>待复习</dt><dd>{{ summary.reviewCount }}</dd></div>
                  </dl>

                  <div v-if="summary.recommendedQuestions.length" class="mt-4 grid gap-2">
                    <RouterLink
                      v-for="question in summary.recommendedQuestions"
                      :key="question.id"
                      :to="`/questions/${question.id}`"
                      class="line-clamp-1 text-sm font-medium text-slate-700 hover:text-primary-600 dark:text-slate-200"
                    >
                      {{ question.questionText }}
                    </RouterLink>
                  </div>
                </article>
              </div>
            </section>

            <PrepPanel title="待复习题目" :empty="overview.reviewQuestions.length === 0" empty-title="暂无待复习题目" empty-description="在题目详情页把状态标为待复习后会出现在这里。">
              <QuestionCard v-for="question in overview.reviewQuestions" :key="question.id" :question="question" />
            </PrepPanel>

            <PrepPanel title="最近整理的回答卡片" action-href="/questions?hasAnswerDraft=true&sort=latest" action-text="查看全部" :empty="overview.answerDraftQuestions.length === 0" empty-title="暂无回答卡片" empty-description="在题目详情页整理回答草稿或 STAR 项目映射后会出现在这里。">
              <RouterLink
                v-for="question in overview.answerDraftQuestions"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="answer-card-link"
              >
                <div class="line-clamp-1 text-sm font-extrabold text-slate-950 dark:text-slate-50">{{ question.questionText }}</div>
                <p class="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {{ question.answerDraft || question.starStory || '继续完善这张回答卡片' }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2 text-xs font-bold text-primary-600 dark:text-primary-300">
                  <span v-if="question.company">{{ question.company }}</span>
                  <span v-if="question.position">{{ question.position }}</span>
                  <span v-if="question.starStory">STAR</span>
                </div>
              </RouterLink>
            </PrepPanel>

            <PrepPanel title="为你推荐" :empty="overview.recommendedQuestions.length === 0" empty-title="暂无推荐题目" empty-description="发布更多面经或完成题目提取后会生成推荐。">
              <QuestionCard v-for="question in overview.recommendedQuestions" :key="question.id" :question="question" />
            </PrepPanel>
          </section>

          <aside>
            <PrepPanel title="STAR 素材库" action-href="/questions?hasStarStory=true&sort=latest" action-text="查看全部" :empty="starStoryQuestions.length === 0" empty-title="暂无 STAR 素材" empty-description="在题目详情页补充 STAR 项目映射后，会在这里形成项目故事索引。">
              <RouterLink v-for="question in starStoryQuestions" :key="question.id" :to="`/questions/${question.id}`" class="star-story-link"><span class="line-clamp-1 text-sm font-extrabold text-slate-950 dark:text-slate-50">{{ question.questionText }}</span><small>{{ question.company || '通用公司' }} · {{ question.position || '通用岗位' }}</small></RouterLink>
            </PrepPanel>

            <PrepPanel class="mt-6" title="最近收藏" :empty="overview.favoriteQuestions.length === 0" empty-title="还没有收藏题目" empty-description="收藏题目后可以在这里快速回看。">
              <RouterLink
                v-for="question in overview.favoriteQuestions"
                :key="question.id"
                :to="`/questions/${question.id}`"
                class="block rounded-lg border border-slate-100 bg-slate-50 p-4 hover:border-primary-200 hover:bg-primary-50/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-primary-950/30"
              >
                <div class="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ question.questionText }}</div>
                <div class="mt-2 text-xs text-slate-500">{{ question.company || '未知公司' }} · {{ question.position || '通用岗位' }}</div>
              </RouterLink>
            </PrepPanel>
          </aside>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useQuery } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { Copy, Download } from 'lucide-vue-next'
import { getErrorMessage } from '@/api/client'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import PrepPanel from '@/components/common/PrepPanel.vue'
import QuestionCard from '@/components/question/QuestionCard.vue'
import { questionApi } from '@/api/question'
import type { ApiId } from '@/api/types'
import type { PrepTarget, Question, TargetPrepSummary } from '@/api/question'
import { useAuthStore } from '@/stores/auth'
import { buildStarStoryLibraryMarkdown, buildUserPrepPackMarkdown, buildWeeklyPrepReportMarkdown, downloadMarkdownFile, mistakeReasonText, progressText, targetTypeText } from '@/utils/prepPackExport'

const authStore = useAuthStore()
const prepOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const targetForm = reactive({ targetType: 'company', targetValue: '', interviewDate: '', priority: 'medium', note: '' })
const isSubmittingTarget = ref(false)
const deletingTargetId = ref<ApiId | null>(null)
const reviewingQuestionId = ref<ApiId | null>(null)

const { data, isLoading, refetch } = useQuery({
  queryKey: computed(() => ['me-prep-overview', prepOwner.value]),
  queryFn: () => questionApi.myPrepOverview(),
})

const { data: mockStatsData } = useQuery({
  queryKey: computed(() => ['mock-interview-stats', prepOwner.value]),
  queryFn: () => questionApi.mockInterviewStats(),
})

const { data: weeklyReportData } = useQuery({
  queryKey: computed(() => ['me-prep-weekly-report', prepOwner.value]),
  queryFn: () => questionApi.myWeeklyPrepReport(),
})

const overview = computed(() => data.value?.data || null)
const mockStats = computed(() => mockStatsData.value?.data || null)
const weeklyReport = computed(() => weeklyReportData.value?.data || null)
const starStoryQuestions = computed(() => (overview.value?.answerDraftQuestions || []).filter((question) => Boolean(question.starStory)))
const maxFocusTagCount = computed(() => Math.max(1, ...(overview.value?.focusTagCounts || []).map((item) => item.count)))

const addTarget = async () => {
  if (!targetForm.targetValue) return
  isSubmittingTarget.value = true
  try {
    await questionApi.addPrepTarget({
      targetType: targetForm.targetType,
      targetValue: targetForm.targetValue,
      interviewDate: targetForm.interviewDate || undefined,
      priority: targetForm.priority || undefined,
      note: targetForm.note || undefined,
    })
    targetForm.targetValue = ''
    targetForm.interviewDate = ''
    targetForm.priority = 'medium'
    targetForm.note = ''
    toast.success('准备目标已添加')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '添加准备目标失败'))
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
    toast.error(getErrorMessage(error, '移除准备目标失败'))
  } finally {
    deletingTargetId.value = null
  }
}

const markReviewTask = async (questionId: ApiId, status: 'mastered' | 'review') => {
  reviewingQuestionId.value = questionId
  try {
    await questionApi.updateProgress(questionId, status)
    toast.success(status === 'mastered' ? '已标记为掌握' : '已放回复习队列')
    await refetch()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '更新复习任务失败'))
  } finally {
    reviewingQuestionId.value = null
  }
}

const copyPrepPack = async () => {
  if (!overview.value) return
  try {
    await navigator.clipboard.writeText(buildUserPrepPackMarkdown(overview.value))
    toast.success('备考包已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制备考包失败'))
  }
}

const downloadPrepPack = () => {
  if (!overview.value) return
  try {
    downloadMarkdownFile(buildUserPrepPackMarkdown(overview.value), `offerlab-备考包-${exportDateText()}.md`)
    toast.success('备考包已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载备考包失败'))
  }
}

const copyStarLibrary = async () => {
  if (!starStoryQuestions.value.length) return
  try {
    await navigator.clipboard.writeText(buildStarStoryLibraryMarkdown(starStoryQuestions.value))
    toast.success('STAR 素材库已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制 STAR 素材库失败'))
  }
}

const downloadStarLibrary = () => {
  if (!starStoryQuestions.value.length) return
  try {
    downloadMarkdownFile(buildStarStoryLibraryMarkdown(starStoryQuestions.value), `offerlab-star-素材库-${exportDateText()}.md`)
    toast.success('STAR 素材库已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载 STAR 素材库失败'))
  }
}

const copyWeeklyReport = async () => {
  if (!weeklyReport.value) return
  try {
    await navigator.clipboard.writeText(buildWeeklyPrepReportMarkdown(weeklyReport.value))
    toast.success('本周备考复盘已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制周复盘失败'))
  }
}

const downloadWeeklyReport = () => {
  if (!weeklyReport.value) return
  try {
    downloadMarkdownFile(buildWeeklyPrepReportMarkdown(weeklyReport.value), `offerlab-周复盘-${exportDateText()}.md`)
    toast.success('本周备考复盘已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载周复盘失败'))
  }
}

const targetProgressPercent = (summary: TargetPrepSummary) => {
  if (!summary.questionCount) return 0
  return Math.min(100, Math.round((summary.masteredCount / summary.questionCount) * 100))
}

const targetSearchLink = (summary: TargetPrepSummary) => {
  const value = encodeURIComponent(summary.target.targetValue)
  if (summary.target.targetType === 'company') return `/questions?company=${value}`
  if (summary.target.targetType === 'position') return `/questions?position=${value}`
  return `/questions?keyword=${value}`
}

const focusTagWidth = (count: number) => Math.max(10, Math.round((count / maxFocusTagCount.value) * 100))

const mistakeReasonLink = (reason: string) => `/questions?mistakeReason=${encodeURIComponent(reason)}&sort=latest`

const targetPriorityText = (priority?: string) => {
  const map: Record<string, string> = {
    urgent: '临近面试',
    high: '高优先级',
    medium: '普通优先级',
    low: '低优先级',
  }
  return map[priority || 'medium'] || '普通优先级'
}

const targetScheduleText = (target: PrepTarget) => {
  if (!target.interviewDate) return '未设置面试日期'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const interviewDate = new Date(`${target.interviewDate}T00:00:00`)
  const diffDays = Math.round((interviewDate.getTime() - today.getTime()) / 86400000)
  if (diffDays > 0) return `还有 ${diffDays} 天`
  if (diffDays === 0) return '今天面试'
  return `已过 ${Math.abs(diffDays)} 天`
}

const formatScheduleTime = (value?: number) => {
  if (!value) return '暂无计划'
  const date = new Date(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const formatWeeklyRange = (start: number, end: number) => `${formatScheduleTime(start)} - ${formatScheduleTime(end)}`

const exportDateText = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const reviewScheduleText = (question: Question) => {
  const parts = [progressText(question.progressStatus)]
  if (question.nextReviewAt) parts.push(`下次 ${formatScheduleTime(question.nextReviewAt)}`)
  if (question.reviewCount > 0) parts.push(`已复习 ${question.reviewCount} 次`)
  return parts.join(' · ')
}

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

.metric-link {
  text-decoration: none;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.metric-link:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
}

.section-title {
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

.target-note-input {
  min-width: 0;
}

.prep-export-button {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(29 78 216);
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

.target-chip-grid {
  display: grid;
  gap: 0.6rem;
}

.target-chip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.4rem;
  border: 1px solid rgb(199 210 254);
  background: rgb(238 242 255);
  padding: 0.65rem 0.75rem;
  color: rgb(67 56 202);
  text-align: left;
}

.target-chip-main {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.target-chip-main strong,
.target-chip-main small {
  min-width: 0;
}

.target-chip-main small {
  color: rgb(99 102 241);
  font-size: 0.75rem;
  font-weight: 700;
}

.target-chip-remove {
  font-size: 1rem;
  line-height: 1;
}

.target-summary {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 1rem;
}

.progress-pill {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.reason-chip {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgb(254 205 211);
  background: white;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  color: rgb(190 18 60);
}

.review-plan-card {
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.mock-stats-panel,
.weekly-report-panel {
  display: grid;
  gap: 1rem;
  align-items: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: linear-gradient(135deg, rgb(239 246 255), white);
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.due-review-alert {
  display: grid;
  gap: 1rem;
  align-items: center;
  border-radius: 0.75rem;
  border: 1px solid rgb(254 202 202);
  background: linear-gradient(135deg, rgb(255 241 242), white);
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.due-review-list {
  display: grid;
  gap: 0.65rem;
}

.due-review-item {
  display: grid;
  gap: 0.2rem;
  border-radius: 0.65rem;
  border: 1px solid rgb(254 226 226);
  background: white;
  padding: 0.7rem 0.85rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.due-review-item:hover {
  border-color: rgb(248 113 113);
  background: rgb(255 241 242);
}

.due-review-item span {
  font-size: 0.9rem;
  font-weight: 900;
  color: rgb(127 29 29);
}

.due-review-item small {
  font-size: 0.75rem;
  color: rgb(153 27 27);
}

.weekly-report-panel {
  border-color: rgb(196 181 253);
  background: linear-gradient(135deg, rgb(245 243 255), white);
}

.focus-tags-panel {
  display: grid;
  gap: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(187 247 208);
  background: linear-gradient(135deg, rgb(240 253 244), white);
  padding: 1.25rem;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.focus-tags-list {
  display: grid;
  gap: 0.65rem;
}

.focus-tag-row {
  position: relative;
  display: grid;
  min-height: 38px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  overflow: hidden;
  border-radius: 0.65rem;
  border: 1px solid rgb(187 247 208);
  background: white;
  padding: 0 0.85rem;
}

.focus-tag-row span,
.focus-tag-row strong {
  position: relative;
  z-index: 1;
  font-size: 0.85rem;
}

.focus-tag-row span {
  font-weight: 900;
  color: rgb(20 83 45);
}

.focus-tag-row strong {
  color: rgb(21 128 61);
}

.focus-tag-row i {
  position: absolute;
  inset: 0 auto 0 0;
  background: rgb(187 247 208);
  opacity: 0.55;
}

.mock-stats-grid,
.weekly-report-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.mock-stats-grid span,
.weekly-report-grid span {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(100 116 139);
}

.mock-stats-grid strong,
.weekly-report-grid strong {
  margin-top: 0.2rem;
  display: block;
  font-size: 1.1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.weekly-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.weekly-actions span {
  border-radius: 999px;
  border: 1px solid rgb(221 214 254);
  background: white;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
  color: rgb(109 40 217);
}

.plan-kicker {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(37 99 235);
}

.plan-title {
  margin-top: 0.2rem;
  font-size: 1.1rem;
  font-weight: 900;
  color: rgb(15 23 42);
}

.plan-count {
  display: inline-flex;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(239 246 255);
  padding: 0 0.75rem;
  font-size: 1rem;
  font-weight: 900;
  color: rgb(29 78 216);
}

.plan-question {
  display: grid;
  gap: 0.25rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.75rem 0.9rem;
}

.plan-question span {
  font-size: 0.9rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

.plan-question small {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.task-question {
  grid-template-columns: minmax(0, 1fr);
}

.task-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.task-actions button {
  min-height: 30px;
  border-radius: 999px;
  border: 1px solid rgb(191 219 254);
  background: white;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: rgb(29 78 216);
}

.task-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.answer-card-link {
  display: block;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.9rem 1rem;
}

.star-story-link {
  display: block;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: rgb(248 250 252);
  padding: 0.875rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.star-story-link small {
  margin-top: 0.45rem;
  display: block;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.star-story-link:hover {
  border-color: rgb(191 219 254);
  background: rgb(239 246 255);
}

.target-summary dt {
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.target-summary dd {
  margin-top: 0.15rem;
  font-size: 1rem;
  font-weight: 800;
  color: rgb(15 23 42);
}

@media (min-width: 768px) {
  .target-form {
    grid-template-columns: 96px minmax(200px, 1fr) 150px 132px minmax(220px, 1fr) auto;
  }

  .target-chip-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mock-stats-panel,
  .due-review-alert,
  .weekly-report-panel {
    grid-template-columns: 1fr minmax(340px, 1.4fr) auto;
  }

  .mock-stats-grid,
  .weekly-report-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .weekly-report-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .focus-tags-panel {
    grid-template-columns: minmax(220px, 0.75fr) minmax(320px, 1.25fr);
    align-items: center;
  }

  .task-question {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }
}

:global(.dark) .metric-card,
:global(.dark) .section-panel,
:global(.dark) .review-plan-card,
:global(.dark) .target-input {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}

:global(.dark) .mock-stats-panel {
  border-color: rgb(30 64 175);
  background: linear-gradient(135deg, rgb(23 37 84), rgb(15 23 42));
}

:global(.dark) .due-review-alert {
  border-color: rgb(127 29 29);
  background: linear-gradient(135deg, rgb(69 10 10), rgb(15 23 42));
}

:global(.dark) .due-review-item {
  border-color: rgb(127 29 29);
  background: rgb(2 6 23);
}

:global(.dark) .due-review-item:hover {
  border-color: rgb(248 113 113);
  background: rgb(69 10 10);
}

:global(.dark) .due-review-item span {
  color: rgb(254 226 226);
}

:global(.dark) .due-review-item small {
  color: rgb(252 165 165);
}

:global(.dark) .weekly-report-panel {
  border-color: rgb(91 33 182);
  background: linear-gradient(135deg, rgb(46 16 101), rgb(15 23 42));
}

:global(.dark) .weekly-actions span {
  border-color: rgb(91 33 182);
  background: rgb(46 16 101);
  color: rgb(221 214 254);
}

:global(.dark) .focus-tags-panel {
  border-color: rgb(22 101 52);
  background: linear-gradient(135deg, rgb(20 83 45), rgb(15 23 42));
}

:global(.dark) .focus-tag-row {
  border-color: rgb(22 101 52);
  background: rgb(2 6 23);
}

:global(.dark) .focus-tag-row span,
:global(.dark) .focus-tag-row strong {
  color: rgb(187 247 208);
}

:global(.dark) .focus-tag-row i {
  background: rgb(22 101 52);
}

:global(.dark) .metric-card strong,
:global(.dark) .section-title,
:global(.dark) .plan-title,
:global(.dark) .target-input {
  color: rgb(248 250 252);
}

:global(.dark) .target-chip {
  border-color: rgb(67 56 202);
  background: rgb(30 27 75);
  color: rgb(199 210 254);
}

:global(.dark) .target-chip-main small {
  color: rgb(165 180 252);
}

:global(.dark) .prep-export-button {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

:global(.dark) .target-summary {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .progress-pill {
  border-color: rgb(30 64 175);
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

:global(.dark) .reason-chip {
  border-color: rgb(136 19 55);
  background: rgb(76 5 25);
  color: rgb(254 205 211);
}

:global(.dark) .plan-count {
  background: rgb(23 37 84);
  color: rgb(191 219 254);
}

:global(.dark) .plan-question {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .task-actions button {
  border-color: rgb(30 64 175);
  background: rgb(15 23 42);
  color: rgb(191 219 254);
}

:global(.dark) .answer-card-link {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .star-story-link {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23);
}

:global(.dark) .star-story-link small {
  color: rgb(148 163 184);
}

:global(.dark) .plan-question span {
  color: rgb(248 250 252);
}

:global(.dark) .target-summary dd {
  color: rgb(248 250 252);
}

:global(.dark) .mock-stats-grid strong,
:global(.dark) .weekly-report-grid strong {
  color: rgb(248 250 252);
}
</style>
