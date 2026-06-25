<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-sm font-medium text-primary-600 dark:text-primary-400">知识库运维</p>
          <h1 class="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-50">知识卡审核</h1>
          <p class="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            维护结构化知识卡的可见性、质量和核心字段，保存后会同步知识库索引。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-if="hasRows" type="button" class="secondary-button" :disabled="selectedIds.length === 0 || isBatching" @click="batchReview(1)">
            批量通过
          </button>
          <button v-if="hasRows" type="button" class="secondary-button danger-action" :disabled="selectedIds.length === 0 || isBatching" @click="batchReview(2)">
            批量隐藏
          </button>
          <button type="button" class="secondary-button" :disabled="isLoading" @click="loadQuestions">
            <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
            刷新
          </button>
        </div>
      </section>

      <section class="question-summary-grid mb-6 grid gap-4 md:grid-cols-4">
        <div class="metric-card"><span>全部</span><strong>{{ summary.total }}</strong></div>
        <div class="metric-card"><span>待审核</span><strong>{{ summary.pending }}</strong></div>
        <div class="metric-card"><span>已通过</span><strong>{{ summary.approved }}</strong></div>
        <div class="metric-card"><span>已隐藏</span><strong>{{ summary.hidden }}</strong></div>
      </section>

      <section class="mb-6 panel index-task-panel">
        <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-950 dark:text-slate-50">知识库索引任务</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">查看最近的搜索索引重建任务、失败原因，并对失败任务发起重试。</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="secondary-button compact" :disabled="isLoadingIndexTasks" @click="loadQuestionIndexTasks">
              <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoadingIndexTasks }" />
              刷新任务
            </button>
            <button type="button" class="primary-button compact" :disabled="isSubmittingIndexTask || Boolean(activeIndexTask)" @click="submitQuestionIndexTask">
              {{ isSubmittingIndexTask ? '提交中...' : activeIndexTask ? '任务运行中' : '重建索引' }}
            </button>
          </div>
        </div>

        <div v-if="isLoadingIndexTasks" class="mt-4 rounded-lg border border-slate-200 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          正在加载索引任务...
        </div>
        <EmptyState v-else-if="questionIndexTasks.length === 0" class="mt-4" title="暂无索引任务" description="点击重建索引后，这里会展示任务进度与失败原因。" />
        <div v-else class="index-task-list mt-4">
          <article v-for="task in questionIndexTasks" :key="task.taskId" class="index-task-row">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span :class="['status-pill', questionIndexTaskStatusClass(task.status)]">{{ questionIndexTaskStatusText(task.status) }}</span>
                <span class="meta-chip">已索引 {{ task.indexed || 0 }}</span>
                <span class="meta-chip">失败 {{ task.failed || 0 }}</span>
                <span class="meta-chip">总数 {{ task.total || 0 }}</span>
                <span v-if="task.indexName" class="meta-chip">索引 {{ task.indexName }}</span>
              </div>
              <p class="mt-2 truncate text-xs font-mono text-slate-500 dark:text-slate-400">任务 {{ shortId(task.taskId) }}</p>
              <p v-if="task.message" class="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/35 dark:text-rose-200">
                {{ task.message }}
              </p>
            </div>
            <button
              v-if="task.retryable || task.status === 'FAILED'"
              type="button"
              class="secondary-button compact"
              :disabled="retryingIndexTaskId === task.taskId || Boolean(activeIndexTask)"
              @click="retryQuestionIndexTask(task.taskId)"
            >
              {{ retryingIndexTaskId === task.taskId ? '重试中...' : '重试' }}
            </button>
          </article>
        </div>
      </section>

      <section class="question-status-tabs mb-4 flex flex-wrap gap-2">
        <button
          v-for="item in statusFilters"
          :key="item.label"
          type="button"
          :class="['filter-button', statusFilter === item.value ? 'filter-button-active' : '']"
          @click="setStatus(item.value)"
        >
          {{ item.label }}
        </button>
        <button
          v-if="questions.length > 0"
          type="button"
          class="filter-button"
          :disabled="isLoading || isBatching"
          @click="toggleCurrentPageSelection"
        >
          {{ allCurrentPageSelected ? '取消本页选择' : '选择本页' }}
        </button>
        <span v-if="selectedIds.length > 0" class="selection-hint">
          已选 {{ selectedIds.length }} 题
        </span>
      </section>

      <section class="mb-6 panel compact-filter-panel">
        <div class="filter-grid">
          <input v-model.trim="filters.keyword" class="field-input" placeholder="关键词 / 质量说明" @keyup.enter="applyFilters" />
          <input v-model.trim="filters.company" class="field-input" placeholder="公司" @keyup.enter="applyFilters" />
          <input v-model.trim="filters.position" class="field-input" placeholder="岗位" @keyup.enter="applyFilters" />
          <input v-model.trim="filters.sourcePostId" class="field-input" inputmode="numeric" placeholder="来源帖子编号" @keyup.enter="applyFilters" />
          <select v-model="filters.taskStatus" class="field-input">
            <option value="">全部任务</option>
            <option value="0">任务待处理</option>
            <option value="1">任务运行中</option>
            <option value="2">任务成功</option>
            <option value="3">任务失败</option>
          </select>
          <input v-model.number="filters.minQualityScore" class="field-input" type="number" min="0" max="100" placeholder="最低质量分" />
          <input v-model.number="filters.maxQualityScore" class="field-input" type="number" min="0" max="100" placeholder="最高质量分" />
          <div class="flex gap-2">
            <button type="button" class="primary-button" :disabled="isLoading" @click="applyFilters">筛选</button>
            <button type="button" class="secondary-button" :disabled="isLoading" @click="resetFilters">清空</button>
          </div>
        </div>
      </section>

      <section class="question-content-grid grid gap-6 lg:grid-cols-[1fr_420px]">
        <article class="panel">
          <div v-if="isLoading" class="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
            正在加载题目...
          </div>
          <EmptyState v-else-if="questions.length === 0" title="暂无题目" description="当前筛选条件下没有需要维护的题目；批量操作会在有可选题目时出现。" />
          <div v-else class="space-y-3">
            <div
              v-for="question in questions"
              :key="question.id"
              :class="['question-row', selectedQuestion?.id === question.id ? 'question-row-active' : '']"
              role="button"
              tabindex="0"
              :aria-current="selectedQuestion?.id === question.id ? 'true' : undefined"
              @click="selectQuestion(question)"
              @keydown.enter.prevent="selectQuestion(question)"
              @keydown.space.prevent="selectQuestion(question)"
            >
              <label class="row-check" @click.stop>
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(question.id)"
                  :disabled="isBatching"
                  @change="toggleSelection(question.id)"
                />
              </label>
              <div class="min-w-0 flex-1 text-left">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span :class="['status-pill', statusClass(question.status)]">{{ statusText(question.status) }}</span>
                  <span v-if="visibleQuestionCompany(question)" class="meta-chip">{{ visibleQuestionCompany(question) }}</span>
                  <span v-if="visibleQuestionPosition(question)" class="meta-chip">{{ visibleQuestionPosition(question) }}</span>
                  <span class="meta-chip">{{ difficultyText(question.difficulty) }}</span>
                </div>
                <h2 class="line-clamp-2 font-semibold text-slate-950 dark:text-slate-50">{{ visibleQuestionText(question) }}</h2>
                <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  来源帖子 {{ question.sourcePostId || '--' }} · 质量分 {{ question.qualityScore || 0 }} · 出现 {{ question.appearCount || 0 }} 次
                </p>
                <p v-if="visibleQuestionQualityReason(question)" class="mt-2 line-clamp-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  {{ visibleQuestionQualityReason(question) }}
                </p>
              </div>
            </div>
          </div>
          <div class="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 text-sm dark:border-slate-800">
            <span class="text-slate-500">第 {{ page }} 页 · 共 {{ total }} 条</span>
            <div class="flex gap-2">
              <button type="button" class="secondary-button compact" :disabled="page <= 1 || isLoading" @click="goPage(page - 1)">上一页</button>
              <button type="button" class="secondary-button compact" :disabled="!hasMore || isLoading" @click="goPage(page + 1)">下一页</button>
            </div>
          </div>
        </article>

        <aside class="panel h-fit question-detail-panel">
          <EmptyState v-if="!selectedQuestion" title="选择题目" description="从左侧列表选择一条题目后可编辑或审核。" />
          <form v-else class="space-y-4" @submit.prevent="saveQuestionWithConfirm">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-50">编辑题目</h2>
              <RouterLink v-if="selectedQuestion.sourcePostId" :to="`/post/${selectedQuestion.sourcePostId}`" class="text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400">
                查看来源
              </RouterLink>
            </div>
            <label class="field-label">题目正文<textarea v-model.trim="form.questionText" class="field-input min-h-[120px]" /></label>
            <label class="field-label">参考思路<textarea v-model.trim="form.answerHint" class="field-input min-h-[100px]" /></label>
            <label class="field-label">考察点<input v-model.trim="form.examPoint" class="field-input" /></label>
            <label class="field-label">参考答案<textarea v-model.trim="form.referenceAnswer" class="field-input min-h-[140px]" /></label>
            <label class="field-label">来源片段<textarea v-model.trim="form.sourceSnippet" class="field-input min-h-[100px]" /></label>
            <label class="field-label">质量说明<textarea v-model.trim="form.qualityReason" class="field-input min-h-[80px]" /></label>
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

            <section class="duplicate-panel">
              <div class="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 class="duplicate-title">重复题组治理</h3>
                  <p class="text-xs text-slate-500 dark:text-slate-400">同一规范化指纹题组，可调整主问题或隐藏重复来源。</p>
                </div>
                <button type="button" class="secondary-button compact" :disabled="isDuplicateLoading" @click="loadDuplicateGroup(selectedQuestion.id)">刷新</button>
              </div>
              <div v-if="isDuplicateLoading" class="py-5 text-center text-xs text-slate-500">正在加载同题组...</div>
              <EmptyState v-else-if="!duplicateGroup || duplicateGroup.questions.length <= 1" title="暂无重复题" description="当前题目暂未发现可治理的同题组。" />
              <div v-else class="space-y-2">
                <div class="duplicate-summary">
                  <span>同组 {{ duplicateGroup.questionCount }} 题</span>
                  <span>来源 {{ duplicateGroup.sourcePostCount }} 帖</span>
                  <span>主问题 {{ duplicateGroup.canonicalId || selectedQuestion.id }}</span>
                </div>
                <article v-for="item in duplicateGroup.questions" :key="item.id" class="duplicate-row">
                  <label class="row-check" @click.stop>
                    <input type="checkbox" :checked="duplicateSelection.includes(item.id)" :disabled="item.id === selectedQuestion.id || item.id === duplicateGroup.canonicalId || isDuplicateSaving" @change="toggleDuplicateSelection(item.id)" />
                  </label>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span :class="['status-pill', statusClass(item.status)]">{{ statusText(item.status) }}</span>
                      <span v-if="item.id === duplicateGroup.canonicalId || (!duplicateGroup.canonicalId && item.id === selectedQuestion.id)" class="meta-chip">主问题</span>
                      <span class="meta-chip">来源 {{ item.sourcePostId || '--' }}</span>
                    </div>
                    <p class="mt-2 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ visibleQuestionText(item) }}</p>
                  </div>
                  <button type="button" class="secondary-button compact" :disabled="item.status !== 1 || item.id === duplicateGroup.canonicalId || isDuplicateSaving" @click="setDuplicateCanonical(item.id)">设为主问题</button>
                </article>
                <button type="button" class="secondary-button danger-action" :disabled="duplicateSelection.length === 0 || isDuplicateSaving" @click="hideSelectedDuplicates">
                  隐藏选中重复题
                </button>
              </div>
              <div v-if="duplicateGroup?.semanticCandidates?.length" class="mt-4 space-y-2">
                <div class="duplicate-summary">
                  <span>疑似同题候选 {{ duplicateGroup.semanticCandidates.length }}</span>
                  <span>跨规范化指纹</span>
                </div>
                <article v-for="candidate in duplicateGroup.semanticCandidates" :key="candidate.question.id" class="duplicate-row semantic-candidate-row">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="status-pill status-warn">相似 {{ candidate.similarityScore }}%</span>
                      <span class="meta-chip">{{ candidate.reason || '语义相近' }}</span>
                      <span class="meta-chip">来源 {{ candidate.question.sourcePostId || '--' }}</span>
                    </div>
                    <p class="mt-2 line-clamp-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{{ visibleQuestionText(candidate.question) }}</p>
                  </div>
                  <button type="button" class="secondary-button compact" :disabled="isDuplicateSaving" @click="mergeDuplicateCandidate(candidate.question.id)">并入题组</button>
                </article>
              </div>
            </section>
          </form>
        </aside>
      </section>
    </main>
    <RiskConfirmDialog
      :state="riskConfirmState"
      @confirm="resolveRiskConfirm"
      @cancel="cancelRiskConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import RiskConfirmDialog from '@/components/admin/RiskConfirmDialog.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { getErrorMessage } from '@/api/client'
import { opsApi, type QuestionDuplicateGroup, type QuestionIndexTask } from '@/api/ops'
import { useRiskConfirm, type RiskConfirmRequest } from '@/composables/useRiskConfirm'
import type { Question } from '@/api/question'
import { isSyntheticVisibleText, sanitizeVisibleText } from '@/utils/textQuality'

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
const isBatching = ref(false)
const isDuplicateLoading = ref(false)
const isDuplicateSaving = ref(false)
const isLoadingIndexTasks = ref(false)
const isSubmittingIndexTask = ref(false)
const retryingIndexTaskId = ref('')
const selectedIds = ref<Array<Question['id']>>([])
const duplicateSelection = ref<Array<Question['id']>>([])
const duplicateGroup = ref<QuestionDuplicateGroup | null>(null)
const questionIndexTasks = ref<QuestionIndexTask[]>([])
const page = ref(1)
const pageSize = 20
const total = ref(0)
const hasMore = ref(false)
const summary = reactive({ total: 0, pending: 0, approved: 0, hidden: 0 })
const filters = reactive({
  keyword: '',
  company: '',
  position: '',
  sourcePostId: '',
  taskStatus: '',
  minQualityScore: undefined as number | undefined,
  maxQualityScore: undefined as number | undefined,
})
const form = reactive({ questionText: '', answerHint: '', examPoint: '', referenceAnswer: '', sourceSnippet: '', qualityReason: '', company: '', position: '', interviewRound: '', difficulty: 'medium', status: 1 })
const hasRows = computed(() => questions.value.length > 0)
const allCurrentPageSelected = computed(() => questions.value.length > 0 && questions.value.every((item) => selectedIds.value.includes(item.id)))
const activeIndexTask = computed(() => questionIndexTasks.value.find((task) => task.status === 'PENDING' || task.status === 'RUNNING'))
const normalizedMinQuality = computed(() => typeof filters.minQualityScore === 'number' && Number.isFinite(filters.minQualityScore)
  ? Math.max(0, Math.min(100, filters.minQualityScore))
  : undefined)
const normalizedMaxQuality = computed(() => typeof filters.maxQualityScore === 'number' && Number.isFinite(filters.maxQualityScore)
  ? Math.max(0, Math.min(100, filters.maxQualityScore))
  : undefined)
const questionQueryParams = computed(() => ({
  status: statusFilter.value,
  keyword: filters.keyword || undefined,
  company: filters.company || undefined,
  position: filters.position || undefined,
  sourcePostId: /^\d+$/.test(filters.sourcePostId) ? filters.sourcePostId : undefined,
  taskStatus: filters.taskStatus === '' ? undefined : Number(filters.taskStatus),
  minQualityScore: normalizedMinQuality.value,
  maxQualityScore: normalizedMaxQuality.value,
  page: page.value,
  pageSize,
}))
const { riskConfirmState, confirmRisk, resolveRiskConfirm, cancelRiskConfirm } = useRiskConfirm()
const riskObjects = (items: Array<Question['id'] | string>, limit = 8) => items.slice(0, limit).map((item) => String(item))
const riskContext = (...items: Array<string | false | undefined>) => items.filter(Boolean) as string[]
const requireRiskConfirm = (request: RiskConfirmRequest) => confirmRisk(request)
const visibleAdminText = (value: unknown, fallback = '') => {
  const text = sanitizeVisibleText(value, '')
  if (!text || isSyntheticVisibleText(text)) return fallback
  return text
}
const visibleQuestionText = (question: Question) => visibleAdminText(question.questionText, '内部样例题已隐藏')
const visibleQuestionCompany = (question: Question) => visibleAdminText(question.company)
const visibleQuestionPosition = (question: Question) => visibleAdminText(question.position)
const visibleQuestionQualityReason = (question: Question) => visibleAdminText(question.qualityReason)

const loadSummary = async () => {
  const res = await opsApi.questionSummary()
  Object.assign(summary, res.data || { total: 0, pending: 0, approved: 0, hidden: 0 })
}

const loadQuestions = async () => {
  isLoading.value = true
  try {
    const [pageRes] = await Promise.all([
      opsApi.pageQuestions(questionQueryParams.value),
      loadSummary(),
    ])
    questions.value = pageRes.data?.items || []
    total.value = pageRes.data?.total || 0
    hasMore.value = Boolean(pageRes.data?.hasMore)
    selectedIds.value = selectedIds.value.filter((id) => questions.value.some((item) => item.id === id))
    if (selectedQuestion.value) {
      const refreshed = questions.value.find((item) => item.id === selectedQuestion.value?.id)
      if (refreshed) selectQuestion(refreshed)
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '题目列表加载失败'))
    questions.value = []
  } finally {
    isLoading.value = false
  }
}

const loadQuestionIndexTasks = async () => {
  isLoadingIndexTasks.value = true
  try {
    const res = await opsApi.listQuestionIndexTasks(10)
    questionIndexTasks.value = res.data || []
  } catch (error: any) {
    questionIndexTasks.value = []
    toast.error(getErrorMessage(error, '索引任务加载失败'))
  } finally {
    isLoadingIndexTasks.value = false
  }
}

const submitQuestionIndexTask = async () => {
  if (activeIndexTask.value) return
  const note = await requireRiskConfirm({
    title: '提交知识库索引重建任务',
    level: 'critical',
    reversible: false,
    impactCount: total.value || '知识库索引',
    objects: riskObjects(['知识库索引']),
    context: riskContext(`当前筛选状态：${statusFilter.value === undefined ? '全部' : statusText(statusFilter.value)}`, `当前页：${questions.value.length} 题`, `总数：${total.value}`),
    confirmText: '确认提交索引任务',
  })
  if (note === null) return
  isSubmittingIndexTask.value = true
  try {
    const res = await opsApi.rebuildQuestionIndexTask(note)
    toast.success(res.data?.taskId ? '索引重建任务已提交' : '索引重建任务已提交')
    await loadQuestionIndexTasks()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '索引重建任务提交失败'))
  } finally {
    isSubmittingIndexTask.value = false
  }
}

const retryQuestionIndexTask = async (taskId: string) => {
  if (!taskId || activeIndexTask.value) return
  const task = questionIndexTasks.value.find((item) => item.taskId === taskId)
  const note = await requireRiskConfirm({
    title: '重试知识库索引任务',
    level: 'high',
    reversible: true,
    impactCount: task?.total || 1,
    objects: riskObjects([`任务 ${shortId(taskId)}`, task?.indexName ? `索引 ${task.indexName}` : '知识库索引']),
    context: riskContext(task ? `状态：${questionIndexTaskStatusText(task.status)}` : undefined, task?.message ? `错误：${task.message}` : undefined),
    confirmText: '确认重试索引任务',
  })
  if (note === null) return
  retryingIndexTaskId.value = taskId
  try {
    await opsApi.retryQuestionIndexTask(taskId, note)
    toast.success('索引任务已重新提交')
    await loadQuestionIndexTasks()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '索引任务重试失败'))
  } finally {
    retryingIndexTaskId.value = ''
  }
}

const setStatus = async (value?: number) => {
  statusFilter.value = value
  selectedQuestion.value = null
  selectedIds.value = []
  page.value = 1
  await loadQuestions()
}

const applyFilters = async () => {
  page.value = 1
  selectedQuestion.value = null
  selectedIds.value = []
  await loadQuestions()
}

const resetFilters = async () => {
  filters.keyword = ''
  filters.company = ''
  filters.position = ''
  filters.sourcePostId = ''
  filters.taskStatus = ''
  filters.minQualityScore = undefined
  filters.maxQualityScore = undefined
  await applyFilters()
}

const goPage = async (next: number) => {
  page.value = Math.max(1, next)
  selectedQuestion.value = null
  selectedIds.value = []
  await loadQuestions()
}

const selectQuestion = (question: Question) => {
  selectedQuestion.value = question
  duplicateGroup.value = null
  duplicateSelection.value = []
  form.questionText = question.questionText || ''
  form.answerHint = question.answerHint || ''
  form.examPoint = question.examPoint || ''
  form.referenceAnswer = question.referenceAnswer || ''
  form.sourceSnippet = question.sourceSnippet || ''
  form.qualityReason = question.qualityReason || ''
  form.company = question.company || ''
  form.position = question.position || ''
  form.interviewRound = question.interviewRound || ''
  form.difficulty = question.difficulty || 'medium'
  form.status = question.status ?? 1
  loadDuplicateGroup(question.id)
}

const loadDuplicateGroup = async (id: Question['id']) => {
  isDuplicateLoading.value = true
  try {
    const res = await opsApi.getQuestionDuplicateGroup(id)
    duplicateGroup.value = res.data || null
    duplicateSelection.value = []
  } catch (error: any) {
    duplicateGroup.value = null
    toast.error(getErrorMessage(error, '重复题组加载失败'))
  } finally {
    isDuplicateLoading.value = false
  }
}

const saveQuestion = async (remark: string) => {
  if (!selectedQuestion.value) return
  isSaving.value = true
  try {
    const payload = { ...form, remark }
    const res = await opsApi.updateQuestion(selectedQuestion.value.id, payload)
    toast.success('题目已保存')
    if (res.data) selectQuestion(res.data)
    await loadQuestions()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '题目保存失败'))
  } finally {
    isSaving.value = false
  }
}

const saveQuestionWithConfirm = async () => {
  if (!selectedQuestion.value) return
  const statusChanged = form.status !== selectedQuestion.value.status
  const note = await requireRiskConfirm({
    title: statusChanged ? '保存题目并变更状态' : '保存题目变更',
    level: 'high',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([selectedQuestion.value.id, form.questionText || selectedQuestion.value.questionText]),
    context: riskContext(
      `来源帖子：${selectedQuestion.value.sourcePostId || '--'}`,
      `当前状态：${statusText(selectedQuestion.value.status)}`,
      statusChanged ? `保存后状态：${statusText(form.status)}` : undefined,
    ),
    confirmText: '确认保存',
  })
  if (note === null) return
  await saveQuestion(note)
}

const quickReview = async (status: number) => {
  if (!selectedQuestion.value) return
  const note = await requireRiskConfirm({
    title: status === 2 ? '隐藏题目' : '通过题目审核',
    level: status === 2 ? 'high' : 'medium',
    reversible: true,
    impactCount: 1,
    objects: riskObjects([selectedQuestion.value.id, selectedQuestion.value.questionText]),
    context: riskContext(`来源帖子：${selectedQuestion.value.sourcePostId || '--'}`, `当前状态：${statusText(selectedQuestion.value.status)}`),
    confirmText: status === 2 ? '确认隐藏' : '确认通过',
  })
  if (note === null) return
  form.status = status
  await saveQuestion(note)
}

const toggleSelection = (id: Question['id']) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

const toggleCurrentPageSelection = () => {
  selectedIds.value = allCurrentPageSelected.value ? [] : questions.value.map((item) => item.id)
}

const batchReview = async (status: number) => {
  if (selectedIds.value.length === 0) return
  const ids = [...selectedIds.value]
  const note = await requireRiskConfirm({
    title: status === 2 ? '批量隐藏题目' : '批量通过题目',
    level: 'critical',
    reversible: true,
    impactCount: ids.length,
    objects: riskObjects(ids),
    context: riskContext(`筛选状态：${statusFilter.value === undefined ? '全部' : statusText(statusFilter.value)}`, `关键词：${filters.keyword || '无'}`, `公司：${filters.company || '全部'}`, `当前页：${page.value}`),
    confirmText: status === 2 ? '确认批量隐藏' : '确认批量通过',
  })
  if (note === null) return
  isBatching.value = true
  try {
    const res = await opsApi.batchReviewQuestions(ids, status, note)
    toast.success(`已处理 ${res.data?.reviewed || ids.length} 道题`)
    if (selectedQuestion.value && ids.includes(selectedQuestion.value.id)) {
      selectedQuestion.value = null
    }
    selectedIds.value = []
    await loadQuestions()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '批量审核失败'))
  } finally {
    isBatching.value = false
  }
}

const toggleDuplicateSelection = (id: Question['id']) => {
  duplicateSelection.value = duplicateSelection.value.includes(id)
    ? duplicateSelection.value.filter((item) => item !== id)
    : [...duplicateSelection.value, id]
}

const setDuplicateCanonical = async (canonicalQuestionId: Question['id']) => {
  if (!selectedQuestion.value) return
  const note = await requireRiskConfirm({
    title: '设置题组主问题',
    level: 'critical',
    reversible: true,
    impactCount: duplicateGroup.value?.questions.length || 1,
    objects: riskObjects([selectedQuestion.value.id, canonicalQuestionId]),
    context: riskContext(`题组：${duplicateGroup.value?.normalizedHash || selectedQuestion.value.id}`, `原主问题：${duplicateGroup.value?.canonicalId || selectedQuestion.value.id}`),
    confirmText: '确认设为主问题',
  })
  if (note === null) return
  isDuplicateSaving.value = true
  try {
    const res = await opsApi.setQuestionDuplicateCanonical(selectedQuestion.value.id, canonicalQuestionId, note)
    duplicateGroup.value = res.data || null
    duplicateSelection.value = []
    toast.success('主问题已更新')
    await loadQuestions()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '主问题更新失败'))
  } finally {
    isDuplicateSaving.value = false
  }
}

const hideSelectedDuplicates = async () => {
  if (!selectedQuestion.value || duplicateSelection.value.length === 0) return
  const ids = [...duplicateSelection.value]
  const note = await requireRiskConfirm({
    title: '隐藏选中重复题',
    level: 'critical',
    reversible: true,
    impactCount: ids.length,
    objects: riskObjects(ids),
    context: riskContext(`题组：${duplicateGroup.value?.normalizedHash || selectedQuestion.value.id}`, `主问题：${duplicateGroup.value?.canonicalId || selectedQuestion.value.id}`),
    confirmText: '确认隐藏重复题',
  })
  if (note === null) return
  isDuplicateSaving.value = true
  try {
    const res = await opsApi.hideQuestionDuplicates(selectedQuestion.value.id, ids, note)
    duplicateGroup.value = res.data || null
    duplicateSelection.value = []
    toast.success('重复题已隐藏')
    await loadQuestions()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '隐藏重复题失败'))
  } finally {
    isDuplicateSaving.value = false
  }
}

const mergeDuplicateCandidate = async (candidateQuestionId: Question['id']) => {
  if (!selectedQuestion.value) return
  const note = await requireRiskConfirm({
    title: '并入疑似同题',
    level: 'critical',
    reversible: true,
    impactCount: duplicateGroup.value?.questions.length ? duplicateGroup.value.questions.length + 1 : 2,
    objects: riskObjects([selectedQuestion.value.id, candidateQuestionId]),
    context: riskContext(`题组：${duplicateGroup.value?.normalizedHash || selectedQuestion.value.id}`, `当前主问题：${duplicateGroup.value?.canonicalId || selectedQuestion.value.id}`),
    confirmText: '确认并入题组',
  })
  if (note === null) return
  isDuplicateSaving.value = true
  try {
    const res = await opsApi.mergeQuestionDuplicateCandidate(selectedQuestion.value.id, candidateQuestionId, note)
    duplicateGroup.value = res.data || null
    duplicateSelection.value = []
    toast.success('疑似同题已并入题组')
    await loadQuestions()
  } catch (error: any) {
    toast.error(getErrorMessage(error, '并入疑似同题失败'))
  } finally {
    isDuplicateSaving.value = false
  }
}

const statusText = (status?: number) => status === 0 ? '待审核' : status === 2 ? '隐藏' : '通过'
const statusClass = (status?: number) => status === 1 ? 'status-ok' : status === 2 ? 'status-danger' : 'status-warn'
const difficultyText = (value?: string) => value === 'easy' ? '简单' : value === 'hard' ? '困难' : '中等'
const shortId = (value?: string | number | null) => {
  const text = String(value ?? '').trim()
  if (!text) return '--'
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text
}
const questionIndexTaskStatusText = (status?: string) => {
  const labels: Record<string, string> = {
    PENDING: '待执行',
    RUNNING: '运行中',
    SUCCEEDED: '成功',
    FAILED: '失败',
  }
  return labels[status || ''] || '未知状态'
}
const questionIndexTaskStatusClass = (status?: string) => status === 'SUCCEEDED'
  ? 'status-ok'
  : status === 'FAILED'
    ? 'status-danger'
    : 'status-warn'

onMounted(() => {
  loadQuestions()
  loadQuestionIndexTasks()
})
</script>

<style scoped>
.primary-button,.secondary-button,.filter-button{display:inline-flex;min-height:38px;align-items:center;justify-content:center;gap:.5rem;border-radius:.5rem;padding:.5rem .9rem;font-size:.875rem;font-weight:700}.primary-button{background:rgb(37 99 235);color:white}.secondary-button,.filter-button{border:1px solid rgb(226 232 240);background:white;color:rgb(51 65 85)}.compact{min-height:32px;padding:.35rem .7rem}.filter-button-active{border-color:rgb(79 70 229);background:rgb(238 242 255);color:rgb(67 56 202)}.danger-action{color:rgb(185 28 28)}.primary-button:disabled,.secondary-button:disabled,.filter-button:disabled{cursor:not-allowed;opacity:.6}.metric-card,.panel{border-radius:.75rem;border:1px solid rgb(226 232 240);background:white;padding:1.25rem}.compact-filter-panel{padding:1rem}.filter-grid{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));align-items:center}.metric-card span{display:block;font-size:.8125rem;font-weight:700;color:rgb(100 116 139)}.metric-card strong{margin-top:.45rem;display:block;font-size:1.6rem;font-weight:800;color:rgb(15 23 42)}.question-row{display:flex;width:100%;cursor:pointer;gap:.85rem;border-radius:.75rem;border:1px solid rgb(226 232 240);background:rgb(248 250 252);padding:1rem;transition:border-color .15s ease,background-color .15s ease}.question-row:hover,.question-row-active{border-color:rgb(129 140 248);background:rgb(238 242 255)}.row-check{display:flex;min-height:1.5rem;align-items:flex-start;padding-top:.15rem}.row-check input{height:1rem;width:1rem;accent-color:rgb(37 99 235)}.selection-hint{display:inline-flex;min-height:38px;align-items:center;border-radius:999px;background:rgb(239 246 255);padding:0 .85rem;font-size:.8125rem;font-weight:800;color:rgb(29 78 216)}.status-pill,.meta-chip{display:inline-flex;align-items:center;border-radius:999px;padding:.25rem .6rem;font-size:.75rem;font-weight:700}.meta-chip{background:white;color:rgb(71 85 105)}.status-ok{background:rgb(220 252 231);color:rgb(21 128 61)}.status-warn{background:rgb(254 243 199);color:rgb(180 83 9)}.status-danger{background:rgb(254 226 226);color:rgb(185 28 28)}.field-label{display:grid;gap:.4rem;font-size:.8125rem;font-weight:700;color:rgb(71 85 105)}.field-input{width:100%;border-radius:.5rem;border:1px solid rgb(226 232 240);background:white;padding:.65rem .75rem;font-size:.875rem;color:rgb(15 23 42);outline:none}.field-input:focus{border-color:rgb(79 70 229);box-shadow:0 0 0 3px rgb(199 210 254 / .7)}.duplicate-panel{margin-top:1.25rem;border-top:1px solid rgb(226 232 240);padding-top:1rem}.duplicate-title{font-size:.95rem;font-weight:800;color:rgb(15 23 42)}.duplicate-summary{display:flex;flex-wrap:wrap;gap:.5rem;color:rgb(100 116 139);font-size:.75rem;font-weight:800}.duplicate-summary span{border-radius:999px;background:rgb(241 245 249);padding:.25rem .6rem}.duplicate-row{display:flex;align-items:flex-start;gap:.65rem;border-radius:.65rem;border:1px solid rgb(226 232 240);background:rgb(248 250 252);padding:.75rem}.dark .metric-card,.dark .panel,.dark .secondary-button,.dark .filter-button,.dark .field-input{border-color:rgb(30 41 59);background:rgb(15 23 42);color:rgb(203 213 225)}.dark .metric-card strong,.dark .duplicate-title{color:rgb(248 250 252)}.dark .question-row,.dark .duplicate-row{border-color:rgb(30 41 59);background:rgb(2 6 23)}.dark .question-row:hover,.dark .question-row-active,.dark .filter-button-active{border-color:rgb(99 102 241);background:rgb(30 27 75)}.dark .meta-chip,.dark .duplicate-summary span{background:rgb(30 41 59);color:rgb(203 213 225)}.dark .selection-hint{background:rgb(30 58 138 / .35);color:rgb(147 197 253)}.dark .duplicate-panel{border-top-color:rgb(30 41 59)}
.index-task-list{display:grid;gap:.75rem}.index-task-row{display:flex;align-items:flex-start;gap:.75rem;border-radius:.75rem;border:1px solid rgb(226 232 240);background:rgb(248 250 252);padding:1rem}.dark .index-task-row{border-color:rgb(30 41 59);background:rgb(2 6 23)}
.question-detail-panel{min-height:0}

@media (min-width: 1024px) {
  .question-detail-panel {
    position: sticky;
    top: 5.5rem;
    max-height: calc(100vh - 7rem);
    overflow: auto;
  }
}

.question-row:focus-visible {
  border-color: rgb(79 70 229);
  box-shadow: 0 0 0 3px rgb(199 210 254 / 0.8);
  outline: none;
}

.dark .question-row:focus-visible {
  border-color: rgb(129 140 248);
  box-shadow: 0 0 0 3px rgb(67 56 202 / 0.55);
}

@media (max-width: 640px) {
  .primary-button,
  .secondary-button,
  .filter-button,
  .compact,
  .selection-hint {
    min-height: 44px;
  }

  .row-check {
    min-height: 44px;
    align-items: center;
  }

  .row-check input {
    height: 1.25rem;
    width: 1.25rem;
  }

  .question-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    margin-bottom: 1rem;
  }

  .question-summary-grid .metric-card {
    padding: 0.75rem;
  }

  .question-summary-grid .metric-card span {
    font-size: 0.75rem;
  }

  .question-summary-grid .metric-card strong {
    margin-top: 0.25rem;
    font-size: 1.25rem;
  }

  .index-task-panel {
    margin-bottom: 1rem;
  }

  .question-status-tabs {
    position: sticky;
    top: 64px;
    z-index: 15;
    margin-inline: -0.25rem;
    flex-wrap: nowrap;
    overflow-x: auto;
    border: 1px solid rgb(226 232 240);
    border-radius: 0.75rem;
    background: rgb(255 255 255 / 0.94);
    padding: 0.35rem;
    backdrop-filter: blur(12px);
  }

  .question-status-tabs .filter-button,
  .question-status-tabs .selection-hint {
    flex: 0 0 auto;
    min-height: 40px;
    white-space: nowrap;
  }

  .compact-filter-panel {
    padding: 0.85rem;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }

  .question-content-grid {
    gap: 1rem;
  }

  .question-row {
    gap: 0.65rem;
    padding: 0.85rem;
  }

  .question-detail-panel {
    margin-top: 0.25rem;
  }
}

.dark .question-status-tabs {
  border-color: rgb(30 41 59);
  background: rgb(2 6 23 / 0.94);
}
</style>
