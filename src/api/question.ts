import client, { Result } from './client'
import { adaptPage, adaptPost, adaptId, adaptTime, adaptTag } from './adapters'
import type { ApiId, PaginatedResponse, Post, Tag } from './types'

export interface Question {
  id: ApiId
  canonicalId?: ApiId
  questionText: string
  highlightQuestionText?: string
  answerHint?: string
  highlightAnswerHint?: string
  examPoint?: string
  highlightExamPoint?: string
  referenceAnswer?: string
  sourceSnippet?: string
  qualityReason?: string
  company?: string
  position?: string
  interviewRound?: string
  difficulty?: 'easy' | 'medium' | 'hard' | string
  confidence?: number
  sourcePostId?: ApiId
  sourceAuthorUid?: ApiId
  status?: number
  appearCount: number
  qualityScore: number
  tags: Tag[]
  favorite: boolean
  progressStatus?: 'todo' | 'learning' | 'mastered' | 'review' | string
  note?: string
  mistakeReason?: 'concept' | 'project' | 'memory' | 'expression' | 'careless' | 'other' | string
  answerDraft?: string
  starStory?: string
  nextReviewAt?: number
  lastReviewedAt?: number
  reviewCount: number
  reviewIntervalDays: number
  sourcePostCount?: number
  createdAt: number
  updatedAt: number
}

export interface QuestionDetail {
  question: Question | null
  sourcePosts: Post[]
  relatedQuestions: Question[]
}

export interface QuestionNotePayload {
  note: string
  mistakeReason: string
  answerDraft: string
  starStory: string
}

export interface QuestionNoteResult extends QuestionNotePayload {
  questionId: ApiId
}

export interface PostQuestionBlock {
  taskStatus: 'none' | 'pending' | 'running' | 'succeeded' | 'failed' | string
  questions: Question[]
  extractedCount: number
  visibleCount: number
  pendingReviewCount: number
  reviewHint?: string
  errorVisible: boolean
  errorMessage?: string
  canRetry: boolean
}

export interface QuestionQuery {
  keyword?: string
  company?: string
  position?: string
  difficulty?: string
  round?: string
  mistakeReason?: string
  progressStatus?: string
  hasNote?: boolean
  hasAnswerDraft?: boolean
  hasStarStory?: boolean
  tagIds?: ApiId[]
  sort?: string
  page?: number
  pageSize?: number
}

export interface CompanyPrep {
  company: string
  aliases: string[]
  relatedPositionCount: number
  recentPosts: Post[]
  topQuestions: Question[]
  recommendedQuestions: Question[]
  topTags: NameCount[]
  hotPositions: NameCount[]
  trend30Days: NameCount[]
  trend90Days: NameCount[]
  interviewResultDistribution: NameCount[]
  recentResultDistribution: NameCount[]
  questionSampleCount: number
  postSampleCount: number
  resultSampleCount: number
  recentResultSampleCount: number
  dataUpdatedAt?: number
  prepScore: number
  checklist: PrepChecklistItem[]
  nextActions: string[]
  myProgress?: {
    favoriteCount: number
    learningCount: number
    masteredCount: number
    reviewCount: number
  }
}

export interface UserPrepOverview {
  favoriteCount: number
  todoCount: number
  learningCount: number
  masteredCount: number
  reviewCount: number
  noteCount: number
  answerDraftCount: number
  targets: PrepTarget[]
  favoriteQuestions: Question[]
  reviewQuestions: Question[]
  answerDraftQuestions: Question[]
  recommendedQuestions: Question[]
  targetSummaries: TargetPrepSummary[]
  mistakeReasonCounts: MistakeReasonCount[]
  focusTagCounts: NameCount[]
  reviewPlan?: ReviewPlan
}

export interface PrepTarget {
  id: ApiId
  uid: ApiId
  targetType: 'company' | 'position' | 'tag' | string
  targetValue: string
  interviewDate?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string
  note?: string
  createTime?: string
}

export interface TargetPrepSummary {
  target: PrepTarget
  questionCount: number
  favoriteCount: number
  learningCount: number
  masteredCount: number
  reviewCount: number
  recommendedQuestions: Question[]
}

export interface MistakeReasonCount {
  reason: string
  count: number
}

export interface PrepChecklistItem {
  key: string
  title: string
  description: string
  done: boolean
  current: number
  target: number
  actionHref: string
}

export interface ReviewPlan {
  todayCount: number
  weekTouchedCount: number
  todayQuestions: Question[]
  weekTouchedQuestions: Question[]
}

export interface UserWeeklyPrepReport {
  windowStart: number
  windowEnd: number
  touchedQuestionCount: number
  masteredQuestionCount: number
  reviewQuestionCount: number
  noteCount: number
  answerDraftCount: number
  mockSessionCount: number
  mockCompletedCount: number
  mockAnsweredQuestionCount: number
  mockAverageScorePercent: number
  mockBestScorePercent: number
  mistakeReasonCounts: MistakeReasonCount[]
  focusTagCounts: NameCount[]
  touchedQuestions: Question[]
  nextActions: string[]
}

export interface MockInterviewAnswer {
  id: ApiId
  sessionId: ApiId
  questionId: ApiId
  sequenceNo: number
  questionTextSnapshot?: string
  answerHintSnapshot?: string
  companySnapshot?: string
  positionSnapshot?: string
  roundSnapshot?: string
  difficultySnapshot?: string
  answerText: string
  selfReview: string
  score: number
  aiReviewed?: boolean
  aiReviewStatus?: 'NOT_REQUESTED' | 'PENDING' | 'SUCCEEDED' | 'FAILED' | string
  aiReviewError?: string
  aiScore?: number
  aiCompleteness?: string
  aiProjectExpression?: string
  aiFollowUpSuggestion?: string
  aiReviewProvider?: string
  createTime: number
  question?: Question
}

export interface MockInterviewSession {
  id: ApiId
  company?: string
  position?: string
  difficulty?: string
  focusTag?: string
  questionCount: number
  answeredCount: number
  totalScore: number
  durationSeconds: number
  status: 'started' | 'completed' | string
  createTime: number
  updateTime: number
  answers: MockInterviewAnswer[]
}

export interface MockInterviewInsight {
  name: string
  sessionCount: number
  averageScorePercent: number
  bestScorePercent: number
  averageDurationSeconds: number
}

export interface MockInterviewStats {
  sessionCount: number
  completedCount: number
  totalQuestionCount: number
  answeredQuestionCount: number
  averageScorePercent: number
  bestScorePercent: number
  averageDurationSeconds: number
  insightWindowSize: number
  lastSession?: MockInterviewSession
  recentSessions: MockInterviewSession[]
  weakAnswers: MockInterviewAnswer[]
  focusTagInsights: MockInterviewInsight[]
  companyInsights: MockInterviewInsight[]
  positionInsights: MockInterviewInsight[]
}

export interface NameCount {
  name: string
  count: number
}

export function adaptQuestion(raw: any): Question {
  return {
    id: adaptId(raw?.id ?? raw?.questionId),
    canonicalId: raw?.canonicalId ? adaptId(raw.canonicalId) : undefined,
    questionText: raw?.questionText ?? raw?.question_text ?? '',
    highlightQuestionText: raw?.highlightQuestionText || undefined,
    answerHint: raw?.answerHint,
    highlightAnswerHint: raw?.highlightAnswerHint || undefined,
    examPoint: raw?.examPoint || undefined,
    highlightExamPoint: raw?.highlightExamPoint || undefined,
    referenceAnswer: raw?.referenceAnswer || undefined,
    sourceSnippet: raw?.sourceSnippet || undefined,
    qualityReason: raw?.qualityReason || undefined,
    company: raw?.company || undefined,
    position: raw?.position || undefined,
    interviewRound: raw?.interviewRound ?? raw?.round,
    difficulty: raw?.difficulty,
    confidence: raw?.confidence === undefined ? undefined : Number(raw.confidence),
    sourcePostId: raw?.sourcePostId ? adaptId(raw.sourcePostId) : undefined,
    sourceAuthorUid: raw?.sourceAuthorUid ? adaptId(raw.sourceAuthorUid) : undefined,
    status: raw?.status,
    appearCount: Number(raw?.appearCount ?? 0),
    qualityScore: Number(raw?.qualityScore ?? 0),
    tags: Array.isArray(raw?.tags) ? raw.tags.map(adaptTag) : [],
    favorite: Boolean(raw?.favorite),
    progressStatus: raw?.progressStatus,
    note: raw?.note || undefined,
    mistakeReason: raw?.mistakeReason || undefined,
    answerDraft: raw?.answerDraft || undefined,
    starStory: raw?.starStory || undefined,
    nextReviewAt: raw?.nextReviewAt ? adaptTime(raw.nextReviewAt) : undefined,
    lastReviewedAt: raw?.lastReviewedAt ? adaptTime(raw.lastReviewedAt) : undefined,
    reviewCount: Number(raw?.reviewCount ?? 0),
    reviewIntervalDays: Number(raw?.reviewIntervalDays ?? 1),
    sourcePostCount: Number(raw?.sourcePostCount ?? raw?.appearCount ?? 0),
    createdAt: adaptTime(raw?.createdAt ?? raw?.createTime),
    updatedAt: adaptTime(raw?.updatedAt ?? raw?.updateTime),
  }
}

function adaptNameCount(raw: any): NameCount {
  return {
    name: String(raw?.name ?? ''),
    count: Number(raw?.count ?? 0),
  }
}

function adaptQuestionDetail(raw: any): QuestionDetail {
  const rawQuestion = raw?.question ?? (raw?.id || raw?.questionId || raw?.questionText ? raw : null)
  return {
    question: rawQuestion ? adaptQuestion(rawQuestion) : null,
    sourcePosts: Array.isArray(raw?.sourcePosts) ? raw.sourcePosts.map(adaptPost) : [],
    relatedQuestions: Array.isArray(raw?.relatedQuestions) ? raw.relatedQuestions.map(adaptQuestion) : [],
  }
}

function adaptPostQuestionBlock(raw: any): PostQuestionBlock {
  return {
    taskStatus: raw?.taskStatus ?? 'none',
    questions: Array.isArray(raw?.questions) ? raw.questions.map(adaptQuestion) : [],
    extractedCount: Number(raw?.extractedCount ?? raw?.questionCount ?? 0),
    visibleCount: Number(raw?.visibleCount ?? raw?.questions?.length ?? 0),
    pendingReviewCount: Number(raw?.pendingReviewCount ?? raw?.pendingCount ?? 0),
    reviewHint: raw?.reviewHint || undefined,
    errorVisible: Boolean(raw?.errorVisible),
    errorMessage: raw?.errorMessage,
    canRetry: Boolean(raw?.canRetry),
  }
}

function adaptCompanyPrep(raw: any): CompanyPrep {
  const progress = raw?.myProgress
  return {
    company: raw?.company ?? '',
    aliases: Array.isArray(raw?.aliases) ? raw.aliases.map(String) : [],
    relatedPositionCount: Number(raw?.relatedPositionCount ?? 0),
    recentPosts: Array.isArray(raw?.recentPosts) ? raw.recentPosts.map(adaptPost) : [],
    topQuestions: Array.isArray(raw?.topQuestions) ? raw.topQuestions.map(adaptQuestion) : [],
    recommendedQuestions: Array.isArray(raw?.recommendedQuestions) ? raw.recommendedQuestions.map(adaptQuestion) : [],
    topTags: Array.isArray(raw?.topTags) ? raw.topTags.map(adaptNameCount) : [],
    hotPositions: Array.isArray(raw?.hotPositions) ? raw.hotPositions.map(adaptNameCount) : [],
    trend30Days: Array.isArray(raw?.trend30Days) ? raw.trend30Days.map(adaptNameCount) : [],
    trend90Days: Array.isArray(raw?.trend90Days) ? raw.trend90Days.map(adaptNameCount) : [],
    interviewResultDistribution: Array.isArray(raw?.interviewResultDistribution) ? raw.interviewResultDistribution.map(adaptNameCount) : [],
    recentResultDistribution: Array.isArray(raw?.recentResultDistribution) ? raw.recentResultDistribution.map(adaptNameCount) : [],
    questionSampleCount: Number(raw?.questionSampleCount ?? raw?.topQuestions?.length ?? 0),
    postSampleCount: Number(raw?.postSampleCount ?? raw?.recentPosts?.length ?? 0),
    resultSampleCount: Number(raw?.resultSampleCount ?? 0),
    recentResultSampleCount: Number(raw?.recentResultSampleCount ?? 0),
    dataUpdatedAt: raw?.dataUpdatedAt ? adaptTime(raw.dataUpdatedAt) : undefined,
    prepScore: Number(raw?.prepScore ?? 0),
    checklist: Array.isArray(raw?.checklist) ? raw.checklist.map(adaptPrepChecklistItem) : [],
    nextActions: Array.isArray(raw?.nextActions) ? raw.nextActions.map(String) : [],
    myProgress: progress ? {
      favoriteCount: Number(progress.favoriteCount ?? 0),
      learningCount: Number(progress.learningCount ?? 0),
      masteredCount: Number(progress.masteredCount ?? 0),
      reviewCount: Number(progress.reviewCount ?? 0),
    } : undefined,
  }
}

function adaptPrepChecklistItem(raw: any): PrepChecklistItem {
  return {
    key: String(raw?.key ?? ''),
    title: String(raw?.title ?? ''),
    description: String(raw?.description ?? ''),
    done: Boolean(raw?.done),
    current: Number(raw?.current ?? 0),
    target: Number(raw?.target ?? 1),
    actionHref: String(raw?.actionHref ?? ''),
  }
}

function adaptUserPrepOverview(raw: any): UserPrepOverview {
  return {
    favoriteCount: Number(raw?.favoriteCount ?? 0),
    todoCount: Number(raw?.todoCount ?? 0),
    learningCount: Number(raw?.learningCount ?? 0),
    masteredCount: Number(raw?.masteredCount ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    noteCount: Number(raw?.noteCount ?? 0),
    answerDraftCount: Number(raw?.answerDraftCount ?? 0),
    targets: Array.isArray(raw?.targets) ? raw.targets.map(adaptPrepTarget) : [],
    favoriteQuestions: Array.isArray(raw?.favoriteQuestions) ? raw.favoriteQuestions.map(adaptQuestion) : [],
    reviewQuestions: Array.isArray(raw?.reviewQuestions) ? raw.reviewQuestions.map(adaptQuestion) : [],
    answerDraftQuestions: Array.isArray(raw?.answerDraftQuestions) ? raw.answerDraftQuestions.map(adaptQuestion) : [],
    recommendedQuestions: Array.isArray(raw?.recommendedQuestions) ? raw.recommendedQuestions.map(adaptQuestion) : [],
    targetSummaries: Array.isArray(raw?.targetSummaries) ? raw.targetSummaries.map(adaptTargetPrepSummary) : [],
    mistakeReasonCounts: Array.isArray(raw?.mistakeReasonCounts) ? raw.mistakeReasonCounts.map(adaptMistakeReasonCount) : [],
    focusTagCounts: Array.isArray(raw?.focusTagCounts) ? raw.focusTagCounts.map(adaptNameCount) : [],
    reviewPlan: raw?.reviewPlan ? adaptReviewPlan(raw.reviewPlan) : undefined,
  }
}

function adaptPrepTarget(raw: any): PrepTarget {
  return {
    id: adaptId(raw?.id),
    uid: adaptId(raw?.uid),
    targetType: raw?.targetType ?? 'company',
    targetValue: raw?.targetValue ?? '',
    interviewDate: raw?.interviewDate || undefined,
    priority: raw?.priority || undefined,
    note: raw?.note || undefined,
    createTime: raw?.createTime,
  }
}

function adaptTargetPrepSummary(raw: any): TargetPrepSummary {
  return {
    target: adaptPrepTarget(raw?.target),
    questionCount: Number(raw?.questionCount ?? 0),
    favoriteCount: Number(raw?.favoriteCount ?? 0),
    learningCount: Number(raw?.learningCount ?? 0),
    masteredCount: Number(raw?.masteredCount ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    recommendedQuestions: Array.isArray(raw?.recommendedQuestions) ? raw.recommendedQuestions.map(adaptQuestion) : [],
  }
}

function adaptMistakeReasonCount(raw: any): MistakeReasonCount {
  return {
    reason: String(raw?.reason ?? ''),
    count: Number(raw?.count ?? 0),
  }
}

function adaptReviewPlan(raw: any): ReviewPlan {
  return {
    todayCount: Number(raw?.todayCount ?? 0),
    weekTouchedCount: Number(raw?.weekTouchedCount ?? 0),
    todayQuestions: Array.isArray(raw?.todayQuestions) ? raw.todayQuestions.map(adaptQuestion) : [],
    weekTouchedQuestions: Array.isArray(raw?.weekTouchedQuestions) ? raw.weekTouchedQuestions.map(adaptQuestion) : [],
  }
}

function adaptUserWeeklyPrepReport(raw: any): UserWeeklyPrepReport {
  return {
    windowStart: adaptTime(raw?.windowStart),
    windowEnd: adaptTime(raw?.windowEnd),
    touchedQuestionCount: Number(raw?.touchedQuestionCount ?? 0),
    masteredQuestionCount: Number(raw?.masteredQuestionCount ?? 0),
    reviewQuestionCount: Number(raw?.reviewQuestionCount ?? 0),
    noteCount: Number(raw?.noteCount ?? 0),
    answerDraftCount: Number(raw?.answerDraftCount ?? 0),
    mockSessionCount: Number(raw?.mockSessionCount ?? 0),
    mockCompletedCount: Number(raw?.mockCompletedCount ?? 0),
    mockAnsweredQuestionCount: Number(raw?.mockAnsweredQuestionCount ?? 0),
    mockAverageScorePercent: Number(raw?.mockAverageScorePercent ?? 0),
    mockBestScorePercent: Number(raw?.mockBestScorePercent ?? 0),
    mistakeReasonCounts: Array.isArray(raw?.mistakeReasonCounts) ? raw.mistakeReasonCounts.map(adaptMistakeReasonCount) : [],
    focusTagCounts: Array.isArray(raw?.focusTagCounts) ? raw.focusTagCounts.map(adaptNameCount) : [],
    touchedQuestions: Array.isArray(raw?.touchedQuestions) ? raw.touchedQuestions.map(adaptQuestion) : [],
    nextActions: Array.isArray(raw?.nextActions) ? raw.nextActions.map(String).filter(Boolean) : [],
  }
}

function adaptMockInterviewAnswer(raw: any): MockInterviewAnswer {
  return {
    id: adaptId(raw?.id),
    sessionId: adaptId(raw?.sessionId),
    questionId: adaptId(raw?.questionId),
    sequenceNo: Number(raw?.sequenceNo ?? 0),
    questionTextSnapshot: raw?.questionTextSnapshot || undefined,
    answerHintSnapshot: raw?.answerHintSnapshot || undefined,
    companySnapshot: raw?.companySnapshot || undefined,
    positionSnapshot: raw?.positionSnapshot || undefined,
    roundSnapshot: raw?.roundSnapshot || undefined,
    difficultySnapshot: raw?.difficultySnapshot || undefined,
    answerText: raw?.answerText ?? '',
    selfReview: raw?.selfReview ?? '',
    score: Number(raw?.score ?? 0),
    aiReviewed: Boolean(raw?.aiReviewed),
    aiReviewStatus: raw?.aiReviewStatus || (raw?.aiReviewed ? 'SUCCEEDED' : 'NOT_REQUESTED'),
    aiReviewError: raw?.aiReviewError || undefined,
    aiScore: raw?.aiScore === undefined || raw?.aiScore === null ? undefined : Number(raw.aiScore),
    aiCompleteness: raw?.aiCompleteness || undefined,
    aiProjectExpression: raw?.aiProjectExpression || undefined,
    aiFollowUpSuggestion: raw?.aiFollowUpSuggestion || undefined,
    aiReviewProvider: raw?.aiReviewProvider || undefined,
    createTime: adaptTime(raw?.createTime),
    question: raw?.question ? adaptQuestion(raw.question) : undefined,
  }
}

function adaptMockInterviewSession(raw: any): MockInterviewSession {
  return {
    id: adaptId(raw?.id),
    company: raw?.company || undefined,
    position: raw?.position || undefined,
    difficulty: raw?.difficulty || undefined,
    focusTag: raw?.focusTag || undefined,
    questionCount: Number(raw?.questionCount ?? 0),
    answeredCount: Number(raw?.answeredCount ?? 0),
    totalScore: Number(raw?.totalScore ?? 0),
    durationSeconds: Number(raw?.durationSeconds ?? 0),
    status: raw?.status ?? 'started',
    createTime: adaptTime(raw?.createTime),
    updateTime: adaptTime(raw?.updateTime),
    answers: Array.isArray(raw?.answers) ? raw.answers.map(adaptMockInterviewAnswer) : [],
  }
}

function adaptMockInterviewInsight(raw: any): MockInterviewInsight {
  return {
    name: String(raw?.name ?? ''),
    sessionCount: Number(raw?.sessionCount ?? 0),
    averageScorePercent: Number(raw?.averageScorePercent ?? 0),
    bestScorePercent: Number(raw?.bestScorePercent ?? 0),
    averageDurationSeconds: Number(raw?.averageDurationSeconds ?? 0),
  }
}

function adaptMockInterviewStats(raw: any): MockInterviewStats {
  return {
    sessionCount: Number(raw?.sessionCount ?? 0),
    completedCount: Number(raw?.completedCount ?? 0),
    totalQuestionCount: Number(raw?.totalQuestionCount ?? 0),
    answeredQuestionCount: Number(raw?.answeredQuestionCount ?? 0),
    averageScorePercent: Number(raw?.averageScorePercent ?? 0),
    bestScorePercent: Number(raw?.bestScorePercent ?? 0),
    averageDurationSeconds: Number(raw?.averageDurationSeconds ?? 0),
    insightWindowSize: Number(raw?.insightWindowSize ?? 20),
    lastSession: raw?.lastSession ? adaptMockInterviewSession(raw.lastSession) : undefined,
    recentSessions: Array.isArray(raw?.recentSessions) ? raw.recentSessions.map(adaptMockInterviewSession) : [],
    weakAnswers: Array.isArray(raw?.weakAnswers) ? raw.weakAnswers.map(adaptMockInterviewAnswer) : [],
    focusTagInsights: Array.isArray(raw?.focusTagInsights) ? raw.focusTagInsights.map(adaptMockInterviewInsight) : [],
    companyInsights: Array.isArray(raw?.companyInsights) ? raw.companyInsights.map(adaptMockInterviewInsight) : [],
    positionInsights: Array.isArray(raw?.positionInsights) ? raw.positionInsights.map(adaptMockInterviewInsight) : [],
  }
}

export const questionApi = {
  list: async (params: QuestionQuery): Promise<Result<PaginatedResponse<Question>>> => {
    const res = await client.get('/api/v1/questions', { params }) as Result<any>
    return { ...res, data: res.data ? adaptPage(res.data, adaptQuestion) : null }
  },

  detail: async (id: ApiId): Promise<Result<QuestionDetail>> => {
    const res = await client.get(`/api/v1/questions/${id}`) as Result<any>
    return { ...res, data: res.data ? adaptQuestionDetail(res.data) : null }
  },

  favorite: (id: ApiId): Promise<Result<{ questionId: ApiId; favorite: boolean }>> =>
    client.post(`/api/v1/questions/${id}/favorite`),

  unfavorite: (id: ApiId): Promise<Result<{ questionId: ApiId; favorite: boolean }>> =>
    client.delete(`/api/v1/questions/${id}/favorite`),

  updateProgress: (id: ApiId, status: string): Promise<Result<{ questionId: ApiId; status: string }>> =>
    client.put(`/api/v1/questions/${id}/progress`, { status }),

  updateNote: (id: ApiId, data: QuestionNotePayload): Promise<Result<QuestionNoteResult>> =>
    client.put(`/api/v1/questions/${id}/note`, data),

  postBlock: async (postId: ApiId): Promise<Result<PostQuestionBlock>> => {
    const res = await client.get(`/api/v1/posts/${postId}/questions`) as Result<any>
    return { ...res, data: res.data ? adaptPostQuestionBlock(res.data) : null }
  },

  extractPostQuestions: (postId: ApiId): Promise<Result<{ taskId: ApiId }>> =>
    client.post(`/api/v1/admin/posts/${postId}/extract-questions`),

  suggestCompanies: (q: string, size = 10): Promise<Result<string[]>> =>
    client.get('/api/v1/companies/suggest', { params: { q, size } }),

  companyPrep: async (company: string): Promise<Result<CompanyPrep>> => {
    const res = await client.get(`/api/v1/companies/${encodeURIComponent(company)}/prep-pack`) as Result<any>
    return { ...res, data: res.data ? adaptCompanyPrep(res.data) : null }
  },

  myPrepOverview: async (): Promise<Result<UserPrepOverview>> => {
    const res = await client.get('/api/v1/me/prep/overview') as Result<any>
    return { ...res, data: res.data ? adaptUserPrepOverview(res.data) : null }
  },

  myWeeklyPrepReport: async (): Promise<Result<UserWeeklyPrepReport>> => {
    const res = await client.get('/api/v1/me/prep/weekly-report') as Result<any>
    return { ...res, data: res.data ? adaptUserWeeklyPrepReport(res.data) : null }
  },

  addPrepTarget: async (data: { targetType: string; targetValue: string; interviewDate?: string; priority?: string; note?: string }): Promise<Result<PrepTarget>> => {
    const res = await client.post('/api/v1/me/prep/targets', data) as Result<any>
    return { ...res, data: res.data ? adaptPrepTarget(res.data) : null }
  },

  deletePrepTarget: (id: ApiId): Promise<Result<{ id: ApiId; deleted: boolean }>> =>
    client.delete(`/api/v1/me/prep/targets/${id}`),

  startMockInterview: async (data: { company?: string; position?: string; difficulty?: string; focusTag?: string; questionCount?: number }): Promise<Result<MockInterviewSession>> => {
    const res = await client.post('/api/v1/mock-interviews', data) as Result<any>
    return { ...res, data: res.data ? adaptMockInterviewSession(res.data) : null }
  },

  saveMockInterviewDraft: async (id: ApiId, data: { durationSeconds: number; answers: Array<{ questionId: ApiId; answerText: string; selfReview?: string; score?: number }> }): Promise<Result<MockInterviewSession>> => {
    const res = await client.put(`/api/v1/mock-interviews/${id}/draft`, data) as Result<any>
    return { ...res, data: res.data ? adaptMockInterviewSession(res.data) : null }
  },

  submitMockInterview: async (id: ApiId, data: { durationSeconds: number; aiReviewEnabled?: boolean; answers: Array<{ questionId: ApiId; answerText: string; selfReview?: string; score?: number }> }): Promise<Result<MockInterviewSession>> => {
    const res = await client.post(`/api/v1/mock-interviews/${id}/submit`, data) as Result<any>
    return { ...res, data: res.data ? adaptMockInterviewSession(res.data) : null }
  },

  retryMockInterviewAiReview: async (id: ApiId): Promise<Result<MockInterviewSession>> => {
    const res = await client.post(`/api/v1/mock-interviews/${id}/ai-review/retry`) as Result<any>
    return { ...res, data: res.data ? adaptMockInterviewSession(res.data) : null }
  },

  recentMockInterviews: async (limit = 5): Promise<Result<MockInterviewSession[]>> => {
    const res = await client.get('/api/v1/mock-interviews', { params: { limit } }) as Result<any>
    return { ...res, data: Array.isArray(res.data) ? res.data.map(adaptMockInterviewSession) : [] }
  },

  mockInterviewDetail: async (id: ApiId): Promise<Result<MockInterviewSession>> => {
    const res = await client.get(`/api/v1/mock-interviews/${id}`) as Result<any>
    return { ...res, data: res.data ? adaptMockInterviewSession(res.data) : null }
  },

  mockInterviewStats: async (): Promise<Result<MockInterviewStats>> => {
    const res = await client.get('/api/v1/mock-interviews/stats') as Result<any>
    return { ...res, data: res.data ? adaptMockInterviewStats(res.data) : null }
  },
}
