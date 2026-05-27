import client, { Result } from './client'
import { adaptPage, adaptPost, adaptId, adaptTime, adaptTag } from './adapters'
import type { ApiId, PaginatedResponse, Post, Tag } from './types'

export interface Question {
  id: ApiId
  canonicalId?: ApiId
  questionText: string
  answerHint?: string
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
  sourcePostCount?: number
  createdAt: number
  updatedAt: number
}

export interface QuestionDetail {
  question: Question
  sourcePosts: Post[]
  relatedQuestions: Question[]
}

export interface PostQuestionBlock {
  taskStatus: 'none' | 'pending' | 'running' | 'succeeded' | 'failed' | string
  questions: Question[]
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
  topTags: NameCount[]
  hotPositions: NameCount[]
  trend30Days: NameCount[]
  trend90Days: NameCount[]
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
  targets: PrepTarget[]
  favoriteQuestions: Question[]
  reviewQuestions: Question[]
  recommendedQuestions: Question[]
}

export interface PrepTarget {
  id: ApiId
  uid: ApiId
  targetType: 'company' | 'position' | 'tag' | string
  targetValue: string
  createTime?: string
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
    answerHint: raw?.answerHint,
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
  return {
    question: adaptQuestion(raw?.question),
    sourcePosts: Array.isArray(raw?.sourcePosts) ? raw.sourcePosts.map(adaptPost) : [],
    relatedQuestions: Array.isArray(raw?.relatedQuestions) ? raw.relatedQuestions.map(adaptQuestion) : [],
  }
}

function adaptPostQuestionBlock(raw: any): PostQuestionBlock {
  return {
    taskStatus: raw?.taskStatus ?? 'none',
    questions: Array.isArray(raw?.questions) ? raw.questions.map(adaptQuestion) : [],
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
    topTags: Array.isArray(raw?.topTags) ? raw.topTags.map(adaptNameCount) : [],
    hotPositions: Array.isArray(raw?.hotPositions) ? raw.hotPositions.map(adaptNameCount) : [],
    trend30Days: Array.isArray(raw?.trend30Days) ? raw.trend30Days.map(adaptNameCount) : [],
    trend90Days: Array.isArray(raw?.trend90Days) ? raw.trend90Days.map(adaptNameCount) : [],
    myProgress: progress ? {
      favoriteCount: Number(progress.favoriteCount ?? 0),
      learningCount: Number(progress.learningCount ?? 0),
      masteredCount: Number(progress.masteredCount ?? 0),
      reviewCount: Number(progress.reviewCount ?? 0),
    } : undefined,
  }
}

function adaptUserPrepOverview(raw: any): UserPrepOverview {
  return {
    favoriteCount: Number(raw?.favoriteCount ?? 0),
    todoCount: Number(raw?.todoCount ?? 0),
    learningCount: Number(raw?.learningCount ?? 0),
    masteredCount: Number(raw?.masteredCount ?? 0),
    reviewCount: Number(raw?.reviewCount ?? 0),
    targets: Array.isArray(raw?.targets) ? raw.targets.map(adaptPrepTarget) : [],
    favoriteQuestions: Array.isArray(raw?.favoriteQuestions) ? raw.favoriteQuestions.map(adaptQuestion) : [],
    reviewQuestions: Array.isArray(raw?.reviewQuestions) ? raw.reviewQuestions.map(adaptQuestion) : [],
    recommendedQuestions: Array.isArray(raw?.recommendedQuestions) ? raw.recommendedQuestions.map(adaptQuestion) : [],
  }
}

function adaptPrepTarget(raw: any): PrepTarget {
  return {
    id: adaptId(raw?.id),
    uid: adaptId(raw?.uid),
    targetType: raw?.targetType ?? 'company',
    targetValue: raw?.targetValue ?? '',
    createTime: raw?.createTime,
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

  addPrepTarget: async (data: { targetType: string; targetValue: string }): Promise<Result<PrepTarget>> => {
    const res = await client.post('/api/v1/me/prep/targets', data) as Result<any>
    return { ...res, data: res.data ? adaptPrepTarget(res.data) : null }
  },

  deletePrepTarget: (id: ApiId): Promise<Result<{ id: ApiId; deleted: boolean }>> =>
    client.delete(`/api/v1/me/prep/targets/${id}`),
}
