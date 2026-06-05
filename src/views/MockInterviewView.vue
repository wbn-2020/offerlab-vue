<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-950">
    <AppHeader />
    <main class="mx-auto max-w-7xl px-4 py-8">
      <section class="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-xs font-black uppercase tracking-wide text-primary-600 dark:text-primary-300">Mock Interview</p>
            <h1 class="mt-2 text-3xl font-black text-slate-950 dark:text-slate-50">模拟面试</h1>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              从题库抽取一组题，按真实面试节奏作答、计时、自评分，并沉淀一份复盘记录。
            </p>
          </div>
          <RouterLink to="/me/prep" class="secondary-action">回到准备台</RouterLink>
        </div>
      </section>

      <div class="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside class="space-y-4">
          <MockInterviewStatsPanel
            :stats="statsForPanel"
            :is-loading="isStatsLoading"
            :error-message="statsError"
            :is-marking-weak-answers="isMarkingWeakQuestions"
            @retry="loadStats"
            @mark-weak-answers-review="markStatsWeakAnswersForReview"
          />
          <MockInterviewStartForm
            v-model="startForm"
            :is-starting="isStarting"
            :service-unavailable="isMockInterviewUnavailable"
            :unavailable-message="statsError"
            @submit="startInterview"
          />
          <MockInterviewRecentList :sessions="recentSessions" @refresh="loadRecent" @select="selectSession" />
        </aside>

        <section class="min-w-0">
          <MockInterviewWorkspace
            :session="currentSession"
            :draft-answers="draftAnswers"
            :elapsed-text="elapsedText"
            :answered-count="answeredCount"
            :total-score="totalScore"
            :review-suggestions="reviewSuggestions"
            :weak-question-count="weakReviewQuestionIds.length"
            :answer-card-count="answerCardCandidateAnswers.length"
            :is-submitting="isSubmitting"
            :ai-review-enabled="aiReviewEnabled"
            :is-marking-weak-questions="isMarkingWeakQuestions"
            :is-saving-answer-cards="isSavingAnswerCards"
            :is-retrying-ai-review="isRetryingAiReview"
            @copy-report="copyInterviewReport"
            @download-report="downloadInterviewReport"
            @toggle-ai-review="aiReviewEnabled = $event"
            @mark-weak-questions-review="markWeakQuestionsForReview"
            @save-answer-cards="saveMockAnswersAsAnswerCards"
            @retry-ai-review="retryAiReview"
            @submit="submitInterview"
          />
        </section>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import AppHeader from '@/components/layout/AppHeader.vue'
import MockInterviewRecentList from '@/components/mock-interview/MockInterviewRecentList.vue'
import MockInterviewStartForm from '@/components/mock-interview/MockInterviewStartForm.vue'
import MockInterviewStatsPanel from '@/components/mock-interview/MockInterviewStatsPanel.vue'
import MockInterviewWorkspace from '@/components/mock-interview/MockInterviewWorkspace.vue'
import { getErrorMessage } from '@/api/client'
import { questionApi, type MockInterviewAnswer, type MockInterviewSession, type MockInterviewStats, type Question, type QuestionNotePayload } from '@/api/question'
import { useAuthStore } from '@/stores/auth'
import { buildMockInterviewReportMarkdown, downloadMarkdownFile } from '@/utils/prepPackExport'
import { buildMockInterviewReviewSuggestions, formatDuration, isWeakMockInterviewAnswer } from '@/utils/mockInterviewFormat'
import { safeStorage } from '@/utils/safeStorage'

type DraftAnswer = { answerText: string; selfReview: string; score: number }
type StoredInterviewDraft = { elapsedSeconds?: number; answers?: Record<string, DraftAnswer> }

const authStore = useAuthStore()
const route = useRoute()
const startForm = reactive({
  company: '',
  position: '',
  difficulty: '',
  focusTag: '',
  questionCount: 5,
})
const currentSession = ref<MockInterviewSession | null>(null)
const recentSessions = ref<MockInterviewSession[]>([])
const stats = ref<MockInterviewStats | null>(null)
const draftAnswers = reactive<Record<string, DraftAnswer>>({})
const startedAt = ref(Date.now())
const elapsedSeconds = ref(0)
const isStarting = ref(false)
const isSubmitting = ref(false)
const aiReviewEnabled = ref(true)
const isStatsLoading = ref(false)
const isMarkingWeakQuestions = ref(false)
const isSavingAnswerCards = ref(false)
const isRetryingAiReview = ref(false)
const reviewMarkedQuestionIds = ref<Set<string | number>>(new Set())
const answerCardSavedQuestionIds = ref<Set<string | number>>(new Set())
const statsError = ref('')
let timer: ReturnType<typeof setInterval> | null = null
let selectRequestId = 0
let draftSaveInFlight = false
let pendingServerDraft = false
let lastServerDraftPayload = ''
let aiReviewPollTimer: ReturnType<typeof setTimeout> | null = null

const draftStorageOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const answeredCount = computed(() => Object.values(draftAnswers).filter((item) => item.answerText.trim()).length)
const totalScore = computed(() => Object.values(draftAnswers).reduce((sum, item) => sum + (item.answerText.trim() ? Number(item.score || 0) : 0), 0))
const elapsedText = computed(() => formatDuration(currentSession.value?.status === 'completed' ? currentSession.value.durationSeconds : elapsedSeconds.value))
const reviewSuggestions = computed(() => {
  const session = currentReportSession()
  return session ? buildMockInterviewReviewSuggestions(session) : []
})
const statsForPanel = computed<MockInterviewStats | null>(() => {
  if (!stats.value) return null
  return {
    ...stats.value,
    weakAnswers: stats.value.weakAnswers.filter((answer) => !reviewMarkedQuestionIds.value.has(answer.questionId)),
  }
})
const isMockInterviewUnavailable = computed(() => Boolean(statsError.value && !isStatsLoading.value))
const hasPendingAiReview = computed(() => currentSession.value?.answers.some((answer) => answer.aiReviewStatus === 'PENDING') || false)

const statsWeakReviewQuestionIds = computed(() => {
  if (!statsForPanel.value) return []
  return [...new Set(statsForPanel.value.weakAnswers.map((answer) => answer.questionId))]
})

const weakReviewQuestionIds = computed(() => {
  const session = currentReportSession()
  if (!session) return []
  return session.answers
    .filter(isWeakMockInterviewAnswer)
    .map((answer) => answer.questionId)
    .filter((questionId) => !reviewMarkedQuestionIds.value.has(questionId))
})

const answerCardCandidateAnswers = computed<MockInterviewAnswer[]>(() => {
  const session = currentReportSession()
  if (!session || session.status !== 'completed') return []
  return session.answers
    .filter((answer) => answer.answerText.trim())
    .filter((answer) => !answerCardSavedQuestionIds.value.has(answer.questionId))
})

const hydrateDrafts = (session: MockInterviewSession) => {
  Object.keys(draftAnswers).forEach((key) => delete draftAnswers[key])
  session.answers.forEach((answer) => {
    draftAnswers[String(answer.questionId)] = {
      answerText: answer.answerText || '',
      selfReview: answer.selfReview || '',
      score: Number(answer.score || 0),
    }
  })
  const stored = session.status === 'started' ? readStoredDraft(session.id) : null
  if (stored?.answers) {
    Object.entries(stored.answers).forEach(([questionId, draft]) => {
      if (!draftAnswers[questionId]) return
      draftAnswers[questionId] = {
        answerText: typeof draft.answerText === 'string' ? draft.answerText : draftAnswers[questionId].answerText,
        selfReview: typeof draft.selfReview === 'string' ? draft.selfReview : draftAnswers[questionId].selfReview,
        score: Number.isFinite(Number(draft.score)) ? Number(draft.score) : draftAnswers[questionId].score,
      }
    })
  }
  const restoredElapsed = session.status === 'started' ? Math.max(session.durationSeconds || 0, Number(stored?.elapsedSeconds || 0)) : session.durationSeconds || 0
  startedAt.value = Date.now() - restoredElapsed * 1000
  elapsedSeconds.value = restoredElapsed
}

const selectSession = async (session: MockInterviewSession) => {
  const requestId = ++selectRequestId
  try {
    const res = await questionApi.mockInterviewDetail(session.id)
    if (requestId !== selectRequestId) return
    const detail = res.data || session
    currentSession.value = detail
    reviewMarkedQuestionIds.value = new Set()
    answerCardSavedQuestionIds.value = new Set()
    lastServerDraftPayload = ''
    hydrateDrafts(detail)
    scheduleAiReviewRefresh()
  } catch {
    if (requestId !== selectRequestId) return
    currentSession.value = session
    reviewMarkedQuestionIds.value = new Set()
    answerCardSavedQuestionIds.value = new Set()
    lastServerDraftPayload = ''
    hydrateDrafts(session)
    scheduleAiReviewRefresh()
  }
}

const startInterview = async () => {
  if (isMockInterviewUnavailable.value) {
    toast.error(statsError.value || '模拟面试服务暂时不可用，请稍后重试')
    return
  }
  isStarting.value = true
  try {
    const res = await questionApi.startMockInterview({
      company: startForm.company || undefined,
      position: startForm.position || undefined,
      difficulty: startForm.difficulty || undefined,
      focusTag: startForm.focusTag || undefined,
      questionCount: startForm.questionCount,
    })
    if (res.data) {
      clearStoredDraft(res.data.id)
      currentSession.value = res.data
      reviewMarkedQuestionIds.value = new Set()
      answerCardSavedQuestionIds.value = new Set()
      lastServerDraftPayload = ''
      hydrateDrafts(res.data)
      stopAiReviewRefresh()
      toast.success('模拟面试已开始')
      await loadRecent()
      await loadStats()
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '开始模拟面试失败'))
  } finally {
    isStarting.value = false
  }
}

const buildDraftPayload = (session = currentSession.value) => ({
  durationSeconds: elapsedSeconds.value,
  answers: session?.answers.map((answer) => ({
    questionId: answer.questionId,
    answerText: draftAnswers[String(answer.questionId)]?.answerText || '',
    selfReview: draftAnswers[String(answer.questionId)]?.selfReview || '',
    score: draftAnswers[String(answer.questionId)]?.score || 0,
  })) || [],
})

const submitInterview = async () => {
  if (!currentSession.value) return
  const sessionId = currentSession.value.id
  const payload = {
    ...buildDraftPayload(currentSession.value),
    aiReviewEnabled: aiReviewEnabled.value,
  }
  isSubmitting.value = true
  try {
    const res = await questionApi.submitMockInterview(sessionId, payload)
    if (res.data) {
      clearStoredDraft(sessionId)
      lastServerDraftPayload = ''
      currentSession.value = res.data
      reviewMarkedQuestionIds.value = new Set()
      answerCardSavedQuestionIds.value = new Set()
      hydrateDrafts(res.data)
      scheduleAiReviewRefresh()
      toast.success('复盘已保存')
      await loadRecent()
      await loadStats()
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '提交模拟面试失败'))
  } finally {
    isSubmitting.value = false
  }
}

const refreshCurrentSession = async () => {
  if (!currentSession.value) return
  const sessionId = currentSession.value.id
  try {
    const res = await questionApi.mockInterviewDetail(sessionId)
    if (res.data && currentSession.value?.id === sessionId) {
      currentSession.value = res.data
      hydrateDrafts(res.data)
    }
  } finally {
    scheduleAiReviewRefresh()
  }
}

const scheduleAiReviewRefresh = () => {
  stopAiReviewRefresh()
  if (!hasPendingAiReview.value) return
  aiReviewPollTimer = setTimeout(refreshCurrentSession, 3000)
}

const stopAiReviewRefresh = () => {
  if (!aiReviewPollTimer) return
  clearTimeout(aiReviewPollTimer)
  aiReviewPollTimer = null
}

const retryAiReview = async () => {
  if (!currentSession.value || isRetryingAiReview.value) return
  isRetryingAiReview.value = true
  try {
    const res = await questionApi.retryMockInterviewAiReview(currentSession.value.id)
    if (res.data) {
      currentSession.value = res.data
      hydrateDrafts(res.data)
      scheduleAiReviewRefresh()
      toast.success('AI 评价重试已提交')
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, 'AI 评价重试失败'))
  } finally {
    isRetryingAiReview.value = false
  }
}

const currentReportSession = (): MockInterviewSession | null => {
  if (!currentSession.value) return null
  return {
    ...currentSession.value,
    answeredCount: answeredCount.value,
    totalScore: totalScore.value,
    durationSeconds: currentSession.value.status === 'completed' ? currentSession.value.durationSeconds : elapsedSeconds.value,
    answers: currentSession.value.answers.map((answer) => ({
      ...answer,
      answerText: draftAnswers[String(answer.questionId)]?.answerText || '',
      selfReview: draftAnswers[String(answer.questionId)]?.selfReview || '',
      score: draftAnswers[String(answer.questionId)]?.score || 0,
    })),
  }
}

const copyInterviewReport = async () => {
  const session = currentReportSession()
  if (!session) return
  try {
    await navigator.clipboard.writeText(buildMockInterviewReportMarkdown(session))
    toast.success('模拟面试复盘报告已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制模拟面试复盘报告失败'))
  }
}

const downloadInterviewReport = () => {
  const session = currentReportSession()
  if (!session) return
  try {
    downloadMarkdownFile(buildMockInterviewReportMarkdown(session), `offerlab-模拟面试复盘-${exportDateText()}.md`)
    toast.success('模拟面试复盘报告已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载模拟面试复盘报告失败'))
  }
}

const exportDateText = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const mergeAnswerCardText = (existing: string | undefined, incoming: string | undefined, title: string, maxLength: number) => {
  const current = (existing || '').trim()
  const next = (incoming || '').trim()
  if (!next) return current
  if (current.includes(next)) return current
  const section = current ? `${title}\n${next}` : next
  const merged = current ? `${current}\n\n${section}` : section
  return merged.length > maxLength ? merged.slice(0, maxLength) : merged
}

const buildAnswerCardPayload = (question: Question, answer: MockInterviewAnswer): QuestionNotePayload => {
  const sectionDate = new Date().toLocaleDateString('zh-CN')
  return {
    note: mergeAnswerCardText(question.note, answer.selfReview, `模拟面试复盘 ${sectionDate}`, 4000),
    mistakeReason: question.mistakeReason || '',
    answerDraft: mergeAnswerCardText(question.answerDraft, answer.answerText, `模拟面试回答 ${sectionDate}`, 4000),
    starStory: question.starStory || '',
  }
}

const saveMockAnswerAsQuestionCard = async (answer: MockInterviewAnswer) => {
  const detail = await questionApi.detail(answer.questionId)
  const question = detail.data?.question
  if (!question) throw new Error('题目详情不可用')
  await questionApi.updateNote(answer.questionId, buildAnswerCardPayload(question, answer))
}

const saveMockAnswersAsAnswerCards = async () => {
  const answers = answerCardCandidateAnswers.value
  if (!answers.length || isSavingAnswerCards.value) return
  isSavingAnswerCards.value = true
  try {
    const results = await Promise.allSettled(answers.map(saveMockAnswerAsQuestionCard))
    const succeededAnswers = answers.filter((_, index) => results[index]?.status === 'fulfilled')
    if (succeededAnswers.length) {
      answerCardSavedQuestionIds.value = new Set([...answerCardSavedQuestionIds.value, ...succeededAnswers.map((answer) => answer.questionId)])
    }
    if (succeededAnswers.length === answers.length) {
      toast.success(`${answers.length} 张回答卡已沉淀到题库`)
    } else if (succeededAnswers.length) {
      toast.warning(`${succeededAnswers.length} 张回答卡已沉淀，剩余回答可稍后重试`)
    } else {
      toast.error('沉淀回答卡失败')
    }
  } finally {
    isSavingAnswerCards.value = false
  }
}

const markQuestionIdsForReview = async (ids: Array<string | number>) => {
  if (!ids.length || isMarkingWeakQuestions.value) return
  isMarkingWeakQuestions.value = true
  try {
    const results = await Promise.allSettled(ids.map((id) => questionApi.updateProgress(id, 'review')))
    const succeededIds = ids.filter((_, index) => results[index]?.status === 'fulfilled')
    if (succeededIds.length) {
      reviewMarkedQuestionIds.value = new Set([...reviewMarkedQuestionIds.value, ...succeededIds])
    }
    if (succeededIds.length === ids.length) {
      toast.success(`${ids.length} 道低分题已加入待复习`)
    } else if (succeededIds.length) {
      toast.warning(`${succeededIds.length} 道题已加入待复习，剩余题目可稍后重试`)
    } else {
      toast.error('加入待复习失败')
    }
  } finally {
    isMarkingWeakQuestions.value = false
  }
}

const markWeakQuestionsForReview = async () => {
  await markQuestionIdsForReview([...new Set(weakReviewQuestionIds.value)])
}

const markStatsWeakAnswersForReview = async () => {
  await markQuestionIdsForReview(statsWeakReviewQuestionIds.value)
}

const loadRecent = async () => {
  try {
    const res = await questionApi.recentMockInterviews(5)
    recentSessions.value = res.data || []
  } catch {
    recentSessions.value = []
  }
}

const loadStats = async () => {
  isStatsLoading.value = true
  statsError.value = ''
  try {
    const res = await questionApi.mockInterviewStats()
    stats.value = res.data || null
  } catch (error: any) {
    stats.value = null
    statsError.value = getErrorMessage(error, '模拟面试统计加载失败')
  } finally {
    isStatsLoading.value = false
  }
}

const draftStorageKey = (sessionId: string | number) => `mock-interview-draft:${draftStorageOwner.value}:${sessionId}`

const isStoredDraft = (value: any): value is StoredInterviewDraft => {
  return value && typeof value === 'object' && (!value.answers || typeof value.answers === 'object')
}

const readStoredDraft = (sessionId: string | number): StoredInterviewDraft | null => {
  try {
    const parsed = JSON.parse(safeStorage.get(draftStorageKey(sessionId)) || 'null')
    return isStoredDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

const saveCurrentDraft = () => {
  if (!currentSession.value || currentSession.value.status !== 'started') return
  safeStorage.set(draftStorageKey(currentSession.value.id), JSON.stringify({
    elapsedSeconds: elapsedSeconds.value,
    answers: draftAnswers,
  }))
}

const saveCurrentDraftToServer = async () => {
  if (!currentSession.value || currentSession.value.status !== 'started') return
  if (draftSaveInFlight) {
    pendingServerDraft = true
    return
  }
  const sessionId = currentSession.value.id
  const payload = buildDraftPayload(currentSession.value)
  const payloadKey = JSON.stringify(payload)
  if (payloadKey === lastServerDraftPayload) return
  draftSaveInFlight = true
  pendingServerDraft = false
  try {
    const res = await questionApi.saveMockInterviewDraft(sessionId, payload)
    lastServerDraftPayload = payloadKey
    if (res.data && currentSession.value?.id === sessionId && currentSession.value.status === 'started') {
      currentSession.value = { ...res.data, answers: currentSession.value.answers }
    }
  } catch {
    // Local storage remains the immediate fallback when network or auth refresh fails.
  } finally {
    draftSaveInFlight = false
    if (pendingServerDraft && currentSession.value?.id === sessionId) {
      pendingServerDraft = false
      saveCurrentDraftToServer()
    }
  }
}

const clearStoredDraft = (sessionId: string | number) => {
  safeStorage.remove(draftStorageKey(sessionId))
}

const syncStartFormFromRoute = () => {
  if (typeof route.query.company === 'string') startForm.company = route.query.company
  if (typeof route.query.position === 'string') startForm.position = route.query.position
  if (typeof route.query.difficulty === 'string') startForm.difficulty = route.query.difficulty
  if (typeof route.query.focusTag === 'string') startForm.focusTag = route.query.focusTag
  if (typeof route.query.questionCount === 'string') {
    const count = Number(route.query.questionCount)
    if (Number.isFinite(count)) startForm.questionCount = Math.max(3, Math.min(10, Math.round(count)))
  }
}

onMounted(() => {
  syncStartFormFromRoute()
  loadRecent()
  loadStats()
  timer = setInterval(() => {
    if (currentSession.value?.status === 'started') {
      elapsedSeconds.value = Math.floor((Date.now() - startedAt.value) / 1000)
    }
  }, 1000)
})

watch(draftAnswers, saveCurrentDraft, { deep: true })

watch(elapsedSeconds, (value) => {
  if (value % 15 === 0) {
    saveCurrentDraft()
    saveCurrentDraftToServer()
  }
})

onBeforeUnmount(() => {
  saveCurrentDraft()
  saveCurrentDraftToServer()
  stopAiReviewRefresh()
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.secondary-action {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.55rem 0.9rem;
  font-size: 0.875rem;
  font-weight: 800;
  color: rgb(51 65 85);
}

:global(.dark) .secondary-action {
  border-color: rgb(30 41 59);
  background: rgb(15 23 42);
}
</style>
