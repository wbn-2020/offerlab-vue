<template>
  <div class="app-shell legacy-training-page">
    <AppHeader />
    <main class="community-page mock-page">
      <header class="surface-card mock-header">
        <div class="mock-header-copy">
          <span class="legacy-label">兼容学习工具</span>
          <h1>知识复盘归档</h1>
          <p>
            从个人知识库抽取一组知识卡，完成作答、自评与报告归档。记录仅用于私人回看，不扩展为社区主路径。
          </p>
        </div>
        <div class="mock-header-actions">
          <RouterLink to="/questions" class="primary-action">返回知识库</RouterLink>
          <RouterLink to="/me/prep" class="secondary-action">学习空间</RouterLink>
        </div>
        <dl class="mock-guide" aria-label="知识复盘流程">
          <div><dt>1</dt><dd>设置主题与题数</dd></div>
          <div><dt>2</dt><dd>作答并保存草稿</dd></div>
          <div><dt>3</dt><dd>提交后归档报告</dd></div>
        </dl>
      </header>

      <div class="mock-layout">
        <aside class="mock-sidebar">
          <MockInterviewStartForm
            :model-value="startForm"
            :is-starting="isStarting"
            :service-unavailable="isMockInterviewUnavailable"
            :unavailable-message="statsError"
            @submit="startInterview"
          />
          <MockInterviewStatsPanel
            :stats="statsForPanel"
            :is-loading="isStatsLoading"
            :error-message="statsError"
            :is-marking-weak-answers="isMarkingWeakQuestions"
            @retry="loadStats"
            @mark-weak-answers-review="markStatsWeakAnswersForReview"
          />
          <MockInterviewRecentList :sessions="recentSessions" @refresh="loadRecent" @select="selectSession" />
        </aside>

        <section class="mock-workspace">
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
            @update-draft="updateDraftAnswer"
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
import { filterPublicContent } from '@/utils/textQuality'

type DraftAnswer = { answerText: string; selfReview: string; score: number }
type StoredInterviewDraft = { elapsedSeconds?: number; answers?: Record<string, DraftAnswer> }
const MOCK_INTERVIEW_DRAFT_TTL = 7 * 24 * 60 * 60 * 1000

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

const updateDraftAnswer = (
  questionId: string,
  field: keyof DraftAnswer,
  value: string | number,
) => {
  const draft = draftAnswers[questionId]
  if (!draft) return
  if (field === 'score') {
    draft.score = Number(value)
    return
  }
  draft[field] = String(value)
}
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
let draftStorageWarningShown = false
let disposed = false

const draftStorageOwner = computed(() => String(authStore.user?.uid ?? 'guest'))
const draftStorageOptions = (owner = draftStorageOwner.value) => ({
  owner,
  namespace: 'mock-interview-draft',
  ttlMs: MOCK_INTERVIEW_DRAFT_TTL,
  maxEntryBytes: 500_000,
})
const answeredCount = computed(() => Object.values(draftAnswers).filter((item) => item.answerText.trim()).length)
const totalScore = computed(() => Object.values(draftAnswers).reduce((sum, item) => sum + (item.answerText.trim() ? Number(item.score || 0) : 0), 0))
const elapsedText = computed(() => formatDuration(currentSession.value?.status === 'completed' ? currentSession.value.durationSeconds : elapsedSeconds.value))
const reviewSuggestions = computed(() => {
  const session = currentReportSession()
  return session ? buildMockInterviewReviewSuggestions(session) : []
})
const visibleMockSessions = (sessions?: MockInterviewSession[] | null) => filterPublicContent(sessions || [])
const visibleMockAnswers = (answers?: MockInterviewAnswer[] | null) => filterPublicContent(answers || [])
const visibleMockStats = (value: MockInterviewStats | null): MockInterviewStats | null => {
  if (!value) return null
  return {
    ...value,
    lastSession: value.lastSession && filterPublicContent([value.lastSession]).length ? value.lastSession : undefined,
    recentSessions: visibleMockSessions(value.recentSessions),
    weakAnswers: visibleMockAnswers(value.weakAnswers),
    focusTagInsights: value.focusTagInsights.filter((item) => filterPublicContent([item]).length > 0),
    companyInsights: value.companyInsights.filter((item) => filterPublicContent([item]).length > 0),
    positionInsights: value.positionInsights.filter((item) => filterPublicContent([item]).length > 0),
  }
}
const statsForPanel = computed<MockInterviewStats | null>(() => {
  const cleanStats = visibleMockStats(stats.value)
  if (!cleanStats) return null
  return {
    ...cleanStats,
    weakAnswers: cleanStats.weakAnswers.filter((answer) => !reviewMarkedQuestionIds.value.has(answer.questionId)),
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
    toast.error(statsError.value || '知识复盘服务暂时不可用，请稍后重试')
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
      toast.success('知识复盘已开始')
      await loadRecent()
      await loadStats()
    }
  } catch (error: any) {
    toast.error(getErrorMessage(error, '开始知识复盘失败'))
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
    toast.error(getErrorMessage(error, '提交知识复盘失败'))
  } finally {
    isSubmitting.value = false
  }
}

const refreshCurrentSession = async () => {
  if (disposed || !currentSession.value) return
  const sessionId = currentSession.value.id
  try {
    const res = await questionApi.mockInterviewDetail(sessionId)
    if (!disposed && res.data && currentSession.value?.id === sessionId) {
      currentSession.value = res.data
      hydrateDrafts(res.data)
    }
  } finally {
    if (!disposed && currentSession.value?.id === sessionId) scheduleAiReviewRefresh()
  }
}

const scheduleAiReviewRefresh = () => {
  stopAiReviewRefresh()
  if (disposed || !hasPendingAiReview.value) return
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
    toast.success('知识复盘报告已复制')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '复制知识复盘报告失败'))
  }
}

const downloadInterviewReport = () => {
  const session = currentReportSession()
  if (!session) return
  try {
    downloadMarkdownFile(buildMockInterviewReportMarkdown(session), `offerlab-知识复盘-${exportDateText()}.md`)
    toast.success('知识复盘报告已下载')
  } catch (error: any) {
    toast.error(getErrorMessage(error, '下载知识复盘报告失败'))
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
    note: mergeAnswerCardText(question.note, answer.selfReview, `知识复盘记录 ${sectionDate}`, 4000),
    mistakeReason: question.mistakeReason || '',
    answerDraft: mergeAnswerCardText(question.answerDraft, answer.answerText, `知识复盘回答 ${sectionDate}`, 4000),
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
      toast.success(`${answers.length} 张回答卡已沉淀到知识库`)
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
    recentSessions.value = visibleMockSessions(res.data)
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
    statsError.value = getErrorMessage(error, '知识复盘统计加载失败')
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
    const parsed = JSON.parse(safeStorage.getDraft(draftStorageKey(sessionId), draftStorageOptions()) || 'null')
    return isStoredDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

const saveCurrentDraft = () => {
  if (
    !currentSession.value
    || currentSession.value.status !== 'started'
    || draftStorageOwner.value === 'guest'
  ) return
  const result = safeStorage.setDraft(draftStorageKey(currentSession.value.id), JSON.stringify({
    elapsedSeconds: elapsedSeconds.value,
    answers: draftAnswers,
  }), draftStorageOptions())
  if (!result.ok && !draftStorageWarningShown) {
    draftStorageWarningShown = true
    toast.warning('本地复盘草稿空间不足或不可用，请保持网络连接以同步草稿。')
  } else if (result.ok) {
    draftStorageWarningShown = false
  }
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
  disposed = false
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

watch(draftStorageOwner, (nextOwner, prevOwner) => {
  if (prevOwner && prevOwner !== 'guest' && prevOwner !== nextOwner) {
    safeStorage.clearSensitive(prevOwner)
  }
  draftStorageWarningShown = false
})

watch(elapsedSeconds, (value) => {
  if (value % 15 === 0) {
    saveCurrentDraft()
    saveCurrentDraftToServer()
  }
})

onBeforeUnmount(() => {
  disposed = true
  selectRequestId += 1
  saveCurrentDraft()
  saveCurrentDraftToServer()
  stopAiReviewRefresh()
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.legacy-training-page {
  background: var(--surface-2);
}

.mock-page {
  padding-top: 1.25rem;
  padding-bottom: 5rem;
}

.mock-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1.25rem 2rem;
  padding: 1.5rem;
}

.mock-header-copy {
  min-width: 0;
}

.legacy-label {
  display: inline-flex;
  min-height: 1.625rem;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  background: var(--surface-2);
  padding: 0.2rem 0.625rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.mock-header h1 {
  margin-top: 0.75rem;
  color: var(--text-strong);
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.25;
  text-wrap: balance;
}

.mock-header-copy p {
  max-width: 68ch;
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  text-wrap: pretty;
}

.mock-header-actions {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: 0.5rem;
}

.mock-header-actions :is(a, button) {
  min-height: 2.5rem;
  white-space: nowrap;
}

.mock-guide {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--border-subtle);
}

.mock-guide div {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.875rem 0.75rem 0;
}

.mock-guide div + div {
  border-left: 1px solid var(--border-subtle);
}

.mock-guide dt {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  background: var(--primary-50);
  color: var(--primary-700);
  font-size: 0.75rem;
  font-weight: 800;
}

.mock-guide dd {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 650;
}

.mock-layout {
  display: grid;
  grid-template-columns: 19rem minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  margin-top: 1rem;
}

.mock-sidebar {
  position: sticky;
  top: calc(var(--community-header-height) + 1rem);
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.mock-workspace {
  min-width: 0;
}

:deep(.panel) {
  border-radius: var(--radius-surface);
  border-color: var(--border-subtle);
  background: var(--surface);
  padding: 1.125rem;
  box-shadow: none;
}

:deep(.panel-title) {
  color: var(--text-strong);
  font-size: 0.9375rem;
  font-weight: 800;
}

:deep(.panel-note),
:deep(.state-box),
:deep(.field-label),
:deep(.field-input),
:deep(.answer-input) {
  font-size: 0.8125rem;
}

:deep(.field-label) {
  color: var(--text-muted);
  letter-spacing: 0;
  text-transform: none;
}

:deep(.field-input),
:deep(.answer-input) {
  border-radius: var(--radius-control);
  border-color: var(--border-subtle);
  background: var(--surface-2);
  color: var(--text-primary);
}

:deep(.field-input:focus),
:deep(.answer-input:focus) {
  border-color: #7cc3a5;
  box-shadow: 0 0 0 3px rgb(169 216 195 / 0.42);
}

:deep(.primary-action),
:deep(.secondary-action),
:deep(.mini-button),
:deep(.retry-button) {
  min-height: 2.375rem;
  border-radius: var(--radius-control);
  font-size: 0.8125rem;
}

:deep(.secondary-action),
:deep(.mini-button) {
  border-color: var(--border-subtle);
  background: var(--surface);
  color: var(--text-primary);
}

:deep(.secondary-action:hover),
:deep(.mini-button:hover) {
  border-color: #a9d8c3;
  background: var(--primary-50);
  color: var(--primary-700);
}

:deep(.timer-card) {
  min-width: 6rem;
  border-radius: var(--radius-control);
  border: 1px solid #a9d8c3;
  background: var(--primary-50);
  padding: 0.625rem 0.75rem;
}

:deep(.timer-card span) {
  color: var(--primary-700);
  font-size: 0.6875rem;
}

:deep(.timer-card strong) {
  color: var(--primary-700);
  font-size: 1.125rem;
}

:deep(.question-index) {
  border-radius: var(--radius-pill);
  background: var(--primary-50);
  color: var(--primary-700);
}

:deep(.review-box),
:deep(.ai-toggle-row),
:deep(.ai-review-box),
:deep(.weak-review-box),
:deep(.learning-loop-box) {
  border-radius: var(--radius-control);
}

:deep(.review-box) {
  border-color: var(--border-subtle);
  background: var(--surface-2);
}

:deep(.ai-toggle-row) {
  border-color: #a9d8c3;
  background: var(--primary-50);
  color: var(--primary-700);
}

:deep(.ai-toggle-row small) {
  color: var(--text-muted);
}

:deep(.review-list li) {
  border-color: var(--border-subtle);
  background: var(--surface);
}

:deep(.weak-review-box) {
  border-color: #fed7aa;
  background: #fff7ed;
}

:deep(.learning-loop-box) {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

:deep(.recent-item) {
  border-radius: var(--radius-control);
  border-color: var(--border-subtle);
  background: var(--surface-2);
}

:deep(.recent-item:hover) {
  border-color: #a9d8c3;
  background: var(--primary-50);
}

@media (max-width: 1023px) {
  .mock-header {
    grid-template-columns: 1fr;
  }

  .mock-header-actions {
    justify-content: flex-start;
  }

  .mock-layout {
    grid-template-columns: 1fr;
  }

  .mock-sidebar {
    position: static;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: start;
  }
}

@media (max-width: 640px) {
  .mock-page {
    padding-top: 0.75rem;
    padding-bottom: 2rem;
  }

  .mock-header {
    gap: 1rem;
    padding: 1rem;
  }

  .mock-header h1 {
    font-size: 1.375rem;
  }

  .mock-header-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mock-header-actions a {
    width: 100%;
    min-width: 0;
    padding-right: 0.625rem;
    padding-left: 0.625rem;
    white-space: nowrap;
  }

  .mock-guide {
    grid-template-columns: 1fr;
  }

  .mock-guide div {
    padding: 0.625rem 0 0;
  }

  .mock-guide div + div {
    border-top: 1px solid var(--border-subtle);
    border-left: 0;
    margin-top: 0.625rem;
    padding-top: 0.625rem;
  }

  .mock-sidebar {
    grid-template-columns: 1fr;
  }

  :deep(.panel) {
    padding: 1rem;
  }

  :deep(.panel > .flex) {
    align-items: flex-start;
  }

  :deep(.timer-card) {
    width: 100%;
  }

  :deep(.ai-review-grid) {
    grid-template-columns: 1fr;
  }

  :deep(.learning-loop-actions) {
    display: grid;
    grid-template-columns: 1fr;
  }

  :deep(.learning-loop-actions > *) {
    width: 100%;
  }
}

.dark .mock-guide dt {
  background: #071f18;
  color: #a9d8c3;
}

.dark :deep(.panel) {
  border-color: var(--border-subtle);
  background: var(--surface);
}

.dark :deep(.field-input),
.dark :deep(.answer-input),
.dark :deep(.recent-item) {
  border-color: #334155;
  background: var(--surface-1);
  color: var(--text-primary);
}

.dark :deep(.secondary-action),
.dark :deep(.mini-button) {
  border-color: #334155;
  background: var(--surface-2);
  color: var(--text-primary);
}

.dark :deep(.secondary-action:hover),
.dark :deep(.mini-button:hover),
.dark :deep(.recent-item:hover) {
  border-color: #0e4a37;
  background: #071f18;
  color: #a9d8c3;
}

.dark :deep(.review-box),
.dark :deep(.review-list li) {
  border-color: var(--border-subtle);
  background: var(--surface-1);
}

.dark :deep(.weak-review-box) {
  border-color: #7c2d12;
  background: #431407;
}

.dark :deep(.learning-loop-box) {
  border-color: #166534;
  background: #052e16;
}
</style>
